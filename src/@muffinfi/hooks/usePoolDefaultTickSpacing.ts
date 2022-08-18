import { Pool } from '@muffinfi/muffin-sdk'
import { Currency } from '@uniswap/sdk-core'
import { useSingleCallResult } from 'lib/hooks/multicall'
import { useMemo } from 'react'

import { useHubContract } from './useContract'

export const usePoolDefaultTickSpacing = (
  currencyA: Currency | undefined,
  currencyB: Currency | undefined
): number | undefined => {
  const poolIdInArray = useMemo(
    () => (currencyA && currencyB ? [Pool.computePoolId(currencyA.wrapped, currencyB.wrapped)] : undefined),
    [currencyA, currencyB]
  )

  const hubContract = useHubContract()
  const { result: globalDefault } = useSingleCallResult(hubContract, 'getDefaultParameters')
  const { result: poolDefault, loading: loadingPoolDefault } = useSingleCallResult(
    poolIdInArray ? hubContract : undefined,
    'getPoolDefaultTickSpacing',
    poolIdInArray
  )

  // return undefiend unless currencies are given and the pool's default tick spacing is fetched
  if (currencyA == null || currencyB == null) return undefined
  if (loadingPoolDefault) return undefined

  // if pool default is zero or undefined, return global default
  return (poolDefault?.tickSpacing || globalDefault?.tickSpacing) as number | undefined
}
