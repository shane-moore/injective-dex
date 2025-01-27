const { Network } = require('@injectivelabs/networks')
const {
  IS_TESTNET,
  IS_MAINNET_STAGING,
  NETWORK
} = require('./app/utils/constants')

const mainnetSpot = [
  'inj-usdt',
  'huahua-usdt',
  'atom-usdt',
  'weth-usdt',
  'link-usdt',
  'ust-usdt',
  'luna-ust',
  'gf-usdt'
]
const testnetSpot = [...mainnetSpot]
const mainnetStagingSpot = [...mainnetSpot]
const spot = IS_TESTNET
  ? testnetSpot
  : IS_MAINNET_STAGING
  ? mainnetStagingSpot
  : mainnetSpot

const mainnetDerivatives = [
  'btc-usdt-perp',
  'inj-usdt-perp',
  'eth-usdt-perp',
  'luna-ust-perp',
  'bnb-usdt-perp',
  'atom-usdt-perp',
  'osmo-usdt-perp'
]
const testnetDerivatives = [...mainnetDerivatives]
const mainnetStagingDerivatives = [...mainnetDerivatives]
const derivatives = IS_TESTNET
  ? testnetDerivatives
  : IS_MAINNET_STAGING
  ? mainnetStagingDerivatives
  : mainnetDerivatives

if (NETWORK === Network.Devnet) {
  derivatives.push('bayc-weth-perp', 'stx-usdt-perp')
}

const spotRoutes = spot.map((s) => `/spot/${s}`) || []
const derivativesRoutes = derivatives.map((s) => `/derivatives/${s}`) || []

module.exports = [
  '/',
  '/portfolio',
  '/activity',
  '/fee-discounts',
  '/trade-and-earn',
  '/faq',
  '/register',
  '/trade-and-earn',
  ...spotRoutes,
  ...derivativesRoutes
]

module.exports.spot = spot
module.exports.derivatives = derivatives
