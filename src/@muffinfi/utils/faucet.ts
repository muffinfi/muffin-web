import { SupportedChainId } from 'constants/chains'

export const FAUCET_URL = 'https://token-faucet-dkenw.vercel.app/'

export const isFaucetSupported = (chainId: number | undefined) => {
  return chainId === SupportedChainId.RINKEBY
}
