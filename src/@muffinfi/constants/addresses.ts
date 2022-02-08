import { L1_CHAIN_IDS, SupportedChainId } from '../../constants/chains'

function constructSameAddressMap<T extends string>(
  address: T,
  additionalNetworks: SupportedChainId[] = []
): { [chainId: number]: T } {
  return (L1_CHAIN_IDS as readonly SupportedChainId[])
    .concat(additionalNetworks)
    .reduce<{ [chainId: number]: T }>((memo, chainId) => {
      memo[chainId] = address
      return memo
    }, {})
}

type AddressMap = { [chainId: number]: string }

// FIXME: these are Rinkeby
export const MUFFIN_HUB_ADDRESSES: AddressMap = constructSameAddressMap('0x37Ea623F66848f35cD296ff3251B4a2faA65f482')
export const MUFFIN_MANAGER_ADDRESSES: AddressMap = constructSameAddressMap('0xD65f4e56dbeA10E7802A0D3865ca84138432463B') // prettier-ignore
export const MUFFIN_LENS_ADDRESSES: AddressMap = constructSameAddressMap('0xa0Dd947fF81118dB73E72297B4369A7139fBd898')
export const MUFFIN_QUOTER_ADDRESSES: AddressMap = constructSameAddressMap('0x7Cfa70398A54d2b801600a74cc78B60057409Ccd')
