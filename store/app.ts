import { actionTree } from 'typed-vuex'
import { ChainId } from '@injectivelabs/ts-types'
import { DEFAULT_GAS_PRICE, SECONDS_IN_A_DAY } from '@injectivelabs/ui-common'
import { StatusType } from '@injectivelabs/utils'
import {
  CHAIN_ID,
  GEO_IP_RESTRICTIONS_ENABLED,
  VPN_PROXY_VALIDATION_PERIOD
} from '~/app/utils/constants'
import { Locale, english } from '~/locales'
import { AppState, GeoLocation } from '~/types'
import {
  fetchGeoLocation,
  validateGeoLocation,
  detectVPNOrProxyUsage,
  detectVPNOrProxyUsageNoThrow
} from '~/app/services/region'
import { app } from '~/app/singletons/App'
import { todayInSeconds } from '~/app/utils/time'
import { gasService } from '~/app/Services'
import { streamProvider } from '~/app/providers/StreamProvider'

export interface UserBasedState {
  vpnOrProxyUsageValidationTimestamp: number
  auctionsViewed: number[]
  geoLocation: GeoLocation
}

const initialState = {
  // App Settings
  locale: english,
  chainId: CHAIN_ID,
  gasPrice: DEFAULT_GAS_PRICE.toString(),

  // Loading States
  state: AppState.Idle,
  marketsLoadingState: StatusType.Idle,

  // User settings
  userState: {
    vpnOrProxyUsageValidationTimestamp: 0,
    auctionsViewed: [],
    geoLocation: {
      continent: '',
      country: ''
    }
  } as UserBasedState
}

export const state = () => ({
  locale: initialState.locale as Locale,
  chainId: initialState.chainId as ChainId,
  gasPrice: initialState.gasPrice as string,
  state: initialState.state as AppState,
  marketsLoadingState: initialState.marketsLoadingState as StatusType,
  userState: initialState.userState as UserBasedState
})

export type AppStoreState = ReturnType<typeof state>

export const mutations = {
  setAppState(state: AppStoreState, appState: AppState) {
    state.state = appState
  },

  setAppLocale(state: AppStoreState, locale: Locale) {
    state.locale = locale
  },

  setMarketsLoadingState(
    state: AppStoreState,
    marketsLoadingState: StatusType
  ) {
    state.marketsLoadingState = marketsLoadingState
  },

  setGasPrice(state: AppStoreState, gasPrice: string) {
    state.gasPrice = gasPrice
  },

  setUserState(state: AppStoreState, userState: UserBasedState) {
    state.userState = userState
  },

  setAuctionsViewed(state: AppStoreState, auctionRound: number) {
    state.userState = {
      ...state.userState,
      auctionsViewed: [...state.userState.auctionsViewed, auctionRound]
    }
  }
}

export const actions = actionTree(
  { state },
  {
    async init({ state }) {
      await this.app.$accessor.app.fetchGeoLocation()
      await this.app.$accessor.app.detectVPNOrProxyUsage()

      app.setGeoLocation(state.userState.geoLocation)
    },

    async detectVPNOrProxyUsage({ state, commit }) {
      if (!state.userState.vpnOrProxyUsageValidationTimestamp) {
        return
      }

      const unixTimestamp = state.userState.vpnOrProxyUsageValidationTimestamp
      const now = todayInSeconds()
      const shouldCheckVpnOrProxyUsage = SECONDS_IN_A_DAY.times(
        VPN_PROXY_VALIDATION_PERIOD
      )
        .plus(unixTimestamp)
        .lte(now)

      if (!shouldCheckVpnOrProxyUsage) {
        return
      }

      const vpnOrProxyUsageDetected = await detectVPNOrProxyUsageNoThrow()

      if (vpnOrProxyUsageDetected) {
        await this.app.$accessor.wallet.logout()
      } else {
        commit('setUserState', {
          ...state.userState,
          vpnOrProxyUsageValidationTimestamp: todayInSeconds()
        })
      }
    },

    queue({ state, commit }) {
      if (state.state === AppState.Busy) {
        throw new Error('You have a pending transaction.')
      } else {
        commit('setAppState', AppState.Busy)
      }
    },

    async fetchGasPrice({ commit }) {
      commit('setGasPrice', await gasService.fetchGasPrice())
    },

    async fetchGeoLocation({ state, commit }) {
      commit('setUserState', {
        ...state.userState,
        geoLocation: await fetchGeoLocation()
      })
    },

    async validate({ state, commit }) {
      if (GEO_IP_RESTRICTIONS_ENABLED) {
        if (state.userState.geoLocation) {
          await validateGeoLocation(state.userState.geoLocation)
        }

        await detectVPNOrProxyUsage()

        commit('setUserState', {
          ...state.userState,
          vpnOrProxyUsageValidationTimestamp: todayInSeconds()
        })
      }
    },

    async pollMarkets(_) {
      await this.app.$accessor.derivatives.fetchMarketsSummary()
      await this.app.$accessor.spot.fetchMarketsSummary()
    },

    cancelAllStreams() {
      streamProvider.cancelAll()
    }
  }
)
