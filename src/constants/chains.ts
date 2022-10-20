/**
 * List of all the networks supported by the Muffin Interface
 */
export enum SupportedChainId {
  MAINNET = 1,
  ROPSTEN = 3,
  RINKEBY = 4,
  GOERLI = 5,
  KOVAN = 42,

  ARBITRUM_ONE = 42161,
  ARBITRUM_RINKEBY = 421611,

  OPTIMISM = 10,
  OPTIMISTIC_KOVAN = 69,

  POLYGON = 137,
  POLYGON_MUMBAI = 80001,
}

export const CHAIN_IDS_TO_NAMES = {
  [SupportedChainId.MAINNET]: 'mainnet',
  [SupportedChainId.ROPSTEN]: 'ropsten',
  [SupportedChainId.RINKEBY]: 'rinkeby',
  [SupportedChainId.GOERLI]: 'goerli',
  [SupportedChainId.KOVAN]: 'kovan',
  [SupportedChainId.POLYGON]: 'polygon',
  [SupportedChainId.POLYGON_MUMBAI]: 'polygon_mumbai',
  [SupportedChainId.ARBITRUM_ONE]: 'arbitrum',
  [SupportedChainId.ARBITRUM_RINKEBY]: 'arbitrum_rinkeby',
  [SupportedChainId.OPTIMISM]: 'optimism',
  [SupportedChainId.OPTIMISTIC_KOVAN]: 'optimistic_kovan',
}

/**
 * Array of all the supported chain IDs.
 */
// export const ALL_SUPPORTED_CHAIN_IDS: SupportedChainId[] = Object.values(SupportedChainId).filter(
//   (id) => typeof id === 'number'
// ) as SupportedChainId[]
export const ALL_SUPPORTED_CHAIN_IDS = [
  SupportedChainId.MAINNET, //
  SupportedChainId.GOERLI,
  // SupportedChainId.RINKEBY,
]

/**
 * The default chain id for infura connector
 */
export const DEFAULT_CHAIN_ID = ALL_SUPPORTED_CHAIN_IDS[0]

//

export const SUPPORTED_GAS_ESTIMATE_CHAIN_IDS = [
  SupportedChainId.MAINNET,
  SupportedChainId.POLYGON,
  SupportedChainId.OPTIMISM,
  SupportedChainId.ARBITRUM_ONE,
]

/**
 * All the chain IDs that are running the Ethereum protocol.
 */
export const L1_CHAIN_IDS = [
  SupportedChainId.MAINNET,
  SupportedChainId.ROPSTEN,
  SupportedChainId.RINKEBY,
  SupportedChainId.GOERLI,
  SupportedChainId.KOVAN,
  SupportedChainId.POLYGON,
  SupportedChainId.POLYGON_MUMBAI,
] as const

export type SupportedL1ChainId = typeof L1_CHAIN_IDS[number]

/**
 * Controls some L2 specific behavior, e.g. slippage tolerance, special UI behavior.
 * The expectation is that all of these networks have immediate transaction confirmation.
 */
export const L2_CHAIN_IDS = [
  SupportedChainId.ARBITRUM_ONE,
  SupportedChainId.ARBITRUM_RINKEBY,
  SupportedChainId.OPTIMISM,
  SupportedChainId.OPTIMISTIC_KOVAN,
] as const

export type SupportedL2ChainId = typeof L2_CHAIN_IDS[number]

// ---

export const CHAIN_DISPLAY_NAMES = {
  [SupportedChainId.MAINNET]: 'Mainnet',
  [SupportedChainId.ROPSTEN]: 'Ropsten',
  [SupportedChainId.RINKEBY]: 'Rinkeby',
  [SupportedChainId.GOERLI]: 'Goerli',
  [SupportedChainId.KOVAN]: 'Kovan',
  [SupportedChainId.POLYGON]: 'Polygon',
  [SupportedChainId.POLYGON_MUMBAI]: 'Polygon Mumbai',
  [SupportedChainId.ARBITRUM_ONE]: 'Arbitrum',
  [SupportedChainId.ARBITRUM_RINKEBY]: 'Arbitrum Rinkeby',
  [SupportedChainId.OPTIMISM]: 'Optimism',
  [SupportedChainId.OPTIMISTIC_KOVAN]: 'Optimistic Kovan',
}

export const getChainDisplayName = (chainId: number | undefined) => {
  return CHAIN_DISPLAY_NAMES[(chainId ?? -1) as SupportedChainId] ?? `#${chainId}`
}
