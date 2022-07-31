import { SupportedChainId } from 'constants/chains'

export const FAUCET_URL =
  'https://token-faucet-dkenw.vercel.app/?url=https://raw.githubusercontent.com/dkenw/token-list/master/tokenlist.json'

export const isFaucetSupported = (chainId: number | undefined) => {
  return chainId === SupportedChainId.RINKEBY
}
