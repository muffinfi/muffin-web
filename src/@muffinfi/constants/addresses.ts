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
export const MUFFIN_MANAGER_ADDRESSES: AddressMap = constructSameAddressMap('0x35a7C2Ea35683104C81072eCB595a08F2429c2d5') // prettier-ignore
export const MUFFIN_LENS_ADDRESSES: AddressMap = constructSameAddressMap('0xBd8FdD668eD0B5E58307C5aC618BF8542a5c6083')
