import { Pool } from '@muffinfi/muffin-sdk'
import { IMuffinHubCombined } from '@muffinfi/typechain'
import { useSingleCallResult } from 'lib/hooks/multicall'
import { useMemo } from 'react'
import type { Optional } from 'types/optional'

export const useSettlement = (
  hubContract: Optional<IMuffinHubCombined>,
  pool: Optional<Pool>,
  tierId: Optional<number>,
  tick: Optional<number>,
  zeroForOne: boolean
) => {
  const inputs = useMemo(
    () =>
      pool?.poolId && tierId != null && tick != null ? [pool.poolId, tierId, tick, Number(zeroForOne)] : undefined,
    [pool?.poolId, tierId, tick, zeroForOne]
  )

  const state = useSingleCallResult(inputs ? hubContract : undefined, 'getSettlement', inputs)
  return state.result as Awaited<ReturnType<IMuffinHubCombined['getSettlement']>> | undefined
}
