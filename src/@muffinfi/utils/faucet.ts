import { SupportedChainId } from 'constants/chains'

export const isFaucetSupported = (chainId: number | undefined) => {
  return chainId === SupportedChainId.RINKEBY || chainId === SupportedChainId.GOERLI
}

export const getFaucetUrl = (chainId: number | undefined) => {
  const tokenListUrl = 'https://raw.githubusercontent.com/dkenw/token-list/master/tokenlist.json'
  return `https://token-faucet-dkenw.vercel.app/?url=${tokenListUrl}`
}
