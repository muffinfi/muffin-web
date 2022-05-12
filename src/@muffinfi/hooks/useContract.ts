import { abi as IMuffinHubABI } from '@muffinfi/muffin-v1-sdk/src/artifacts/contracts/interfaces/IMuffinHubCombined.sol/IMuffinHubCombined.json'
import { abi as ILensABI } from '@muffinfi/muffin-v1-sdk/src/artifacts/contracts/periphery/lens/ILens.sol/ILens.json'
import { abi as IQuoterABI } from '@muffinfi/muffin-v1-sdk/src/artifacts/contracts/periphery/lens/IQuoter.sol/IQuoter.json'
import { abi as ManagerABI } from '@muffinfi/muffin-v1-sdk/src/artifacts/contracts/periphery/Manager.sol/Manager.json'
import { useContract } from 'hooks/useContract'

import {
  MUFFIN_HUB_ADDRESSES,
  MUFFIN_LENS_ADDRESSES,
  MUFFIN_MANAGER_ADDRESSES,
  MUFFIN_QUOTER_ADDRESSES,
} from '../constants/addresses'
import { ILens, IMuffinHubCombined as IMuffinHub, IQuoter, Manager } from '../typechain/'

export function useHubContract(): IMuffinHub | null {
  return useContract<IMuffinHub>(MUFFIN_HUB_ADDRESSES, IMuffinHubABI, true)
}

export function useLensContract(): ILens | null {
  return useContract<ILens>(MUFFIN_LENS_ADDRESSES, ILensABI)
}

export function useManagerContract(): Manager | null {
  return useContract<Manager>(MUFFIN_MANAGER_ADDRESSES, ManagerABI)
}

export function useQuoterContract(): IQuoter | null {
  return useContract<IQuoter>(MUFFIN_QUOTER_ADDRESSES, IQuoterABI)
}
