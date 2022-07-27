import { ALL_TIERS, Pool, Route } from '@muffinfi/muffin-sdk'
import { Currency } from '@uniswap/sdk-core'
import { useAllCurrencyCombinations } from 'hooks/useAllCurrencyCombinations'
import { useMemo } from 'react'

import { PoolState, useMuffinPools } from '../usePools'

const DEFAULT_TIER_CHOICES = ALL_TIERS // FIXME: support tier choice selection

/**
 * Returns true if poolA is equivalent to poolB
 * @param poolA one of the two pools
 * @param poolB the other pool
 */
function poolEquals(poolA: Pool, poolB: Pool): boolean {
  return poolA === poolB || (poolA.token0.equals(poolB.token0) && poolA.token1.equals(poolB.token1))
}

function computeAllRoutes(
  currencyIn: Currency,
  currencyOut: Currency,
  pools: Pool[],
  currentPath: { pools: Pool[]; tierChoicesList: number[] } | null,
  allPaths: Route<Currency, Currency>[] = [],
  startCurrencyIn: Currency = currencyIn,
  maxHops = 2
): Route<Currency, Currency>[] {
  const tokenIn = currencyIn?.wrapped
  const tokenOut = currencyOut?.wrapped
  if (!tokenIn || !tokenOut) throw new Error('Missing tokenIn/tokenOut')

  // initialize currentPath
  if (currentPath == null) {
    currentPath = { pools: [], tierChoicesList: [] }
  }

  for (const pool of pools) {
    // allow pool that involves the input token, and has not been swapped yet in the currect trade path
    if (!pool.involvesToken(tokenIn) || currentPath.pools.find((pastPool) => poolEquals(pool, pastPool))) continue

    const outputToken = pool.token0.equals(tokenIn) ? pool.token1 : pool.token0
    if (outputToken.equals(tokenOut)) {
      // if the output token of this swap equals to our target output token, then the path is finished and we append to "allPaths"
      allPaths.push(
        new Route(
          [...currentPath.pools, pool],
          [...currentPath.tierChoicesList, DEFAULT_TIER_CHOICES],
          startCurrencyIn,
          currencyOut
        )
      )
    } else if (maxHops > 1) {
      // otherwise, if we're still allowed to hop, we loop all pools again to find if any pool that involves this
      // swap's output token again
      computeAllRoutes(
        outputToken,
        currencyOut,
        pools,
        {
          pools: [...currentPath.pools, pool],
          tierChoicesList: [...currentPath.tierChoicesList, DEFAULT_TIER_CHOICES],
        },
        allPaths,
        startCurrencyIn,
        maxHops - 1
      )
    }
  }

  return allPaths
}

/**
 * Returns all the existing pools that should be considered for swapping between an input currency and an output currency
 * @param currencyIn the input currency
 * @param currencyOut the output currency
 */
function useMuffinSwapPools(currencyIn?: Currency, currencyOut?: Currency): { pools: Pool[]; loading: boolean } {
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

/**
 * Returns all the routes from an input currency to an output currency
 * @param currencyIn the input currency
 * @param currencyOut the output currency
 */
export function useAllMuffinRoutes(
  currencyIn?: Currency,
  currencyOut?: Currency
): { loading: true; routes: undefined } | { loading: false; routes: Route<Currency, Currency>[] } {
  // load all pools related to currencyIn, currencyOut, and all common tokens (even not pool underlyings)
  const { pools, loading: poolsLoading } = useMuffinSwapPools(currencyIn, currencyOut)

  return useMemo(() => {
    if (poolsLoading || !pools || !currencyIn || !currencyOut) {
      return {
        loading: true,
        routes: undefined,
      }
    }
    return {
      loading: false,
      routes: computeAllRoutes(currencyIn, currencyOut, pools, null, [], currencyIn, 2),
    }
  }, [currencyIn, currencyOut, pools, poolsLoading])
}
