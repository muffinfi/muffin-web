// const UNI_LIST = 'https://tokens.uniswap.org'
const AAVE_LIST = 'tokenlist.aave.eth'
const BA_LIST = 'https://raw.githubusercontent.com/The-Blockchain-Association/sec-notice-list/master/ba-sec-list.json'
// const CMC_ALL_LIST = 'https://api.coinmarketcap.com/data-api/v3/uniswap/all.json'
const COINGECKO_LIST = 'https://tokens.coingecko.com/uniswap/all.json'
const COMPOUND_LIST = 'https://raw.githubusercontent.com/compound-finance/token-list/master/compound.tokenlist.json'
const GEMINI_LIST = 'https://www.gemini.com/uniswap/manifest.json'
const KLEROS_LIST = 't2crtokens.eth'
// const ROLL_LIST = 'https://app.tryroll.com/tokens.json'
// const SET_LIST = 'https://raw.githubusercontent.com/SetProtocol/uniswap-tokenlist/main/set.tokenlist.json'
const WRAPPED_LIST = 'wrapped.tokensoft.eth'

export const OPTIMISM_LIST = 'https://static.optimism.io/optimism.tokenlist.json'
export const ARBITRUM_LIST = 'https://bridge.arbitrum.io/token-list-42161.json'

const MUFFIN_TESTNET_LIST = 'https://raw.githubusercontent.com/dkenw/token-list/master/tokenlist.json'
const MUFFIN_LIST = 'https://raw.githubusercontent.com/muffinfi/default-token-list/main/build/tokenlist.json'

export const UNSUPPORTED_LIST_URLS: string[] = [BA_LIST]

// this is the default list of lists that are exposed to users
// lower index == higher priority for token import
const DEFAULT_LIST_OF_LISTS_TO_DISPLAY: string[] = [
  MUFFIN_LIST,
  GEMINI_LIST,
  COMPOUND_LIST,
  AAVE_LIST,
  ARBITRUM_LIST,
  OPTIMISM_LIST,
  COINGECKO_LIST,
  KLEROS_LIST,
  WRAPPED_LIST,
  MUFFIN_TESTNET_LIST,
  // CMC_ALL_LIST,
  // SET_LIST,
  // ROLL_LIST,
  // UNI_LIST,
]

export const DEFAULT_LIST_OF_LISTS: string[] = [
  ...DEFAULT_LIST_OF_LISTS_TO_DISPLAY,
  ...UNSUPPORTED_LIST_URLS, // need to load dynamic unsupported tokens as well
]

// default lists to be 'active' aka searched across
export const DEFAULT_ACTIVE_LIST_URLS: string[] = [
  MUFFIN_LIST,
  GEMINI_LIST,
  MUFFIN_TESTNET_LIST,
  // UNI_LIST,
]
