import { Web3Provider } from '@ethersproject/providers'
import { SafeAppConnector } from '@gnosis.pm/safe-apps-web3-react'
import { ALL_SUPPORTED_CHAIN_IDS, DEFAULT_CHAIN_ID, SupportedChainId } from 'constants/chains'
import { SUPPORTED_INFURA_NETWORK_URLS } from 'constants/infura'
import { InjectedConnector } from 'web3-react-injected-connector'
import { PortisConnector } from 'web3-react-portis-connector'
import { WalletConnectConnector } from 'web3-react-walletconnect-connector'
import { WalletLinkConnector } from 'web3-react-walletlink-connector'

import APP_LOGO_URL from '../assets/svg/muffin_logo.svg'
import getLibrary from '../utils/getLibrary'
import { FortmaticConnector } from './Fortmatic'
import { NetworkConnector } from './NetworkConnector'

const FORMATIC_KEY = process.env.REACT_APP_FORTMATIC_KEY
const PORTIS_ID = process.env.REACT_APP_PORTIS_ID

export const network = new NetworkConnector({
  urls: SUPPORTED_INFURA_NETWORK_URLS,
  defaultChainId: DEFAULT_CHAIN_ID,
})

let networkLibrary: Web3Provider | undefined
export function getNetworkLibrary(): Web3Provider {
  return (networkLibrary = networkLibrary ?? getLibrary(network.provider))
}

export const injected = new InjectedConnector({
  supportedChainIds: ALL_SUPPORTED_CHAIN_IDS,
})

export const gnosisSafe = new SafeAppConnector()

export const walletconnect = new WalletConnectConnector({
  supportedChainIds: ALL_SUPPORTED_CHAIN_IDS,
  rpc: SUPPORTED_INFURA_NETWORK_URLS,
  qrcode: true,
})

// mainnet only
export const fortmatic = new FortmaticConnector({
  apiKey: FORMATIC_KEY ?? '',
  chainId: 1,
})

// mainnet only
export const portis = new PortisConnector({
  dAppId: PORTIS_ID ?? '',
  networks: [1],
})

export const walletlink = new WalletLinkConnector({
  url: SUPPORTED_INFURA_NETWORK_URLS[SupportedChainId.MAINNET],
  appName: 'Muffin',
  appLogoUrl: APP_LOGO_URL,
  supportedChainIds: ALL_SUPPORTED_CHAIN_IDS,
})
