import { Pool } from '@muffinfi/muffin-v1-sdk'
import { Currency } from '@uniswap/sdk-core'
import { useAllCurrencyCombinations } from 'hooks/useAllCurrencyCombinations'
import { useMemo } from 'react'
import { PoolState, useMuffinPools } from '../usePools'

/**
 * Returns all the existing pools that should be considered for swapping between an input currency and an output currency
 * @param currencyIn the input currency
 * @param currencyOut the output currency
 */
export function useMuffinSwapPools(currencyIn?: Currency, currencyOut?: Currency): { pools: Pool[]; loading: boolean } {
  // make token pairs of all possible common currencies (even not related to currency{In,Out})
  const allCurrencyCombinations = useAllCurrencyCombinations(currencyIn, currencyOut)

  // load all pool data and init many Pool objects
  const results = useMuffinPools(allCurrencyCombinations)

  return useMemo(() => {
    return {
      loading: results.some(([state]) => state === PoolState.LOADING),
      pools: results
        .filter((tuple): tuple is [PoolState.EXISTS, Pool] => tuple[0] === PoolState.EXISTS && tuple[1] !== null)
        .map(([, pool]) => pool),
    }
  }, [results])
}
