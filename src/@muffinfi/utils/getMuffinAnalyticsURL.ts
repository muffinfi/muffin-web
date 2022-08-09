import { CHAIN_INFO } from 'constants/chainInfo'
import { CHAIN_IDS_TO_NAMES } from 'constants/chains'

export const getMuffinAnalyticsURL = (chainId: number | undefined) => {
  const chainName = (CHAIN_IDS_TO_NAMES as Record<number, string | undefined>)[chainId ?? -1]
  const isTestnet = CHAIN_INFO[chainId ?? -1]?.testnet ?? false

  const url = isTestnet ? `https://analytics-testnet.muffin.fi/` : 'https://analytics.muffin.fi/'
  const path = chainId === 1 || chainName == null ? '' : `#/${chainName}/`

  return `${url}${path}`
}
