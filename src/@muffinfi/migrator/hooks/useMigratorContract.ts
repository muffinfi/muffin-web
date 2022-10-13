import MIGRATOR_ABI from 'abis/muffin-migrator.json'
import { MuffinMigrator } from 'abis/types'
import { useContract } from 'hooks/useContract'

import { MUFFIN_MIGRATOR_ADDRESSES } from '../addresses'

export function useMigratorContract(): MuffinMigrator | null {
  return useContract<MuffinMigrator>(MUFFIN_MIGRATOR_ADDRESSES, MIGRATOR_ABI)
}
