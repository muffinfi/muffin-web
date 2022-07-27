import { abi as IMuffinHubABI } from '@muffinfi/muffin-contracts/artifacts/contracts/interfaces/hub/IMuffinHubCombined.sol/IMuffinHubCombined.json'
import { abi as ILensABI } from '@muffinfi/muffin-contracts/artifacts/contracts/interfaces/lens/ILens.sol/ILens.json'
import { abi as IManagerABI } from '@muffinfi/muffin-contracts/artifacts/contracts/interfaces/manager/IManager.sol/IManager.json'
import { useContract } from 'hooks/useContract'

import { MUFFIN_HUB_ADDRESSES, MUFFIN_LENS_ADDRESSES, MUFFIN_MANAGER_ADDRESSES } from '../constants/addresses'
import { ILens, IMuffinHubCombined as IMuffinHub, Manager } from '../typechain/'

export function useHubContract(): IMuffinHub | null {
  return useContract<IMuffinHub>(MUFFIN_HUB_ADDRESSES, IMuffinHubABI, true)
}

export function useLensContract(): ILens | null {
  return useContract<ILens>(MUFFIN_LENS_ADDRESSES, ILensABI)
}

export function useManagerContract(): Manager | null {
  return useContract<Manager>(MUFFIN_MANAGER_ADDRESSES, IManagerABI)
}
