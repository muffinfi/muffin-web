import { MUFFIN_HUB_ADDRESSES, MUFFIN_MANAGER_ADDRESSES } from '@muffinfi/constants/addresses'

import useActiveWeb3React from './useActiveWeb3React'

export default function useContractAddress(addressOrAddressMap: string | { [chainId: number]: string } | undefined) {
  const { chainId } = useActiveWeb3React()
  if (!chainId || !addressOrAddressMap) return undefined
  if (typeof addressOrAddressMap === 'string') return addressOrAddressMap
  return addressOrAddressMap[chainId]
}

export const useManagerAddress = () => useContractAddress(MUFFIN_MANAGER_ADDRESSES)
export const useHubAddress = () => useContractAddress(MUFFIN_HUB_ADDRESSES)
