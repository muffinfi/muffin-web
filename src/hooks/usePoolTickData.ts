import { useMuffinPool } from '@muffinfi/hooks/usePools'
import { tickToPrice } from '@muffinfi/muffin-v1-sdk'
import { skipToken } from '@reduxjs/toolkit/query/react'
import { Currency } from '@uniswap/sdk-core'
import JSBI from 'jsbi'
import ms from 'ms.macro'
import { useMemo } from 'react'
import { AllV3TicksQueryResultKey, AllV3TicksQueryResultKeys, useAllV3TicksQuery } from 'state/data/enhanced'
import { AllV3TicksQuery, Tick } from 'state/data/generated'
import computeSurroundingTicks from 'utils/computeSurroundingTicks'
import { PoolState } from './usePools'

const PRICE_FIXED_DIGITS = 8

// Tick with fields parsed to JSBIs, and active liquidity computed.
export interface TickProcessed {
  tickIdx: number
  price0: string
  liquidityActive: Record<number, JSBI>
  liquidityNet: Record<number, JSBI>
}

export type StackedTick = Record<number, any> & Pick<Tick, 'tickIdx' | 'price0'>

const getActiveTick = (tickCurrent: number | undefined, tickSpacing: number | undefined) =>
  tickCurrent && tickSpacing ? Math.floor(tickCurrent / tickSpacing) * tickSpacing : undefined

// Fetches all ticks for a given pool
export function useAllV3Ticks(poolId: string | undefined) {
  const { isLoading, isError, error, isUninitialized, data } = useAllV3TicksQuery(
    poolId ? { poolId: poolId?.toLowerCase(), skip: 0 } : skipToken,
    {
      pollingInterval: ms`30s`,
    }
  )

  return {
    isLoading,
    isUninitialized,
    isError,
    error,
    ticks: data as AllV3TicksQuery,
  }
}

export function usePoolActiveLiquidity(
  currencyA: Currency | undefined,
  currencyB: Currency | undefined,
  tierId: number | undefined
): {
  isLoading: boolean
  isUninitialized: boolean
  isError: boolean
  error: any
  activeTick: number | undefined
  data: TickProcessed[] | undefined
} {
  const [poolState, pool] = useMuffinPool(currencyA, currencyB)
  const tier =
    typeof tierId === 'number' && tierId >= 0 && tierId < (pool?.tiers.length || 0) ? pool?.tiers[tierId] : undefined

  const activeTick = useMemo(
    () => getActiveTick(tier?.computedTick, pool?.tickSpacing),
    [tier?.computedTick, pool?.tickSpacing]
  )

  const { isLoading, isUninitialized, isError, error, ticks } = useAllV3Ticks(pool?.poolId)

  const data = useMemo(() => {
    if (!currencyA || !currencyB || poolState !== PoolState.EXISTS || !pool || !ticks) {
      return undefined
    }

    const token0 = currencyA?.wrapped
    const token1 = currencyB?.wrapped

    // flat map and sort all the tick data
    const allTicks = (() => {
      const tickMap = AllV3TicksQueryResultKeys.reduce((acc, key) => {
        const tierTicks = (ticks as AllV3TicksQuery)[key]
        tierTicks.forEach((tick) => {
          if (!acc[tick.tickIdx]) {
            acc[tick.tickIdx] = {
              tickIdx: tick.tickIdx,
              price0: tickToPrice(token0, token1, tick.tickIdx).toFixed(PRICE_FIXED_DIGITS),
              liquidityActive: {},
              liquidityNet: {},
            }
          }
          acc[tick.tickIdx].liquidityNet[tick.tierId] = JSBI.BigInt(tick.liquidityNet)
        })
        return acc
      }, {} as Record<number, TickProcessed>)
      return Object.values(tickMap).sort((aTick, bTick) => aTick.tickIdx - bTick.tickIdx)
    })()

    let hasError = false

    // calculate active tick for each tier and add liquidity to "pivot" tick
    // missing "pivot" tick will be inserted
    const activeTicks = pool.tiers.map((tier, _tierId) => {
      const selectedTicks = ticks[`tier${_tierId}` as AllV3TicksQueryResultKey]
      if (selectedTicks.length === 0) {
        hasError = true
        return 0
      }

      // Find nearest valid tick for pool in case tick is not initialized.
      const localActiveTick = getActiveTick(tier.computedTick, pool.tickSpacing)
      if (typeof localActiveTick === 'undefined') {
        hasError = true
        return 0
      }

      // find where the active tick would be to partition the array
      // if the active tick is initialized, the pivot will be an element
      // if not, take the previous tick as pivot
      let pivot = allTicks.findIndex(({ tickIdx }) => tickIdx > localActiveTick) - 1

      if (pivot < 0) {
        console.error(`TickData pivot not found for tier: ${_tierId}`)
        hasError = true
        return 0
      }

      if (allTicks[pivot].tickIdx !== localActiveTick) {
        const activeTickProcessed = {
          tickIdx: localActiveTick,
          price0: tickToPrice(token0, token1, localActiveTick).toFixed(PRICE_FIXED_DIGITS),
          liquidityActive: {},
          liquidityNet: { [_tierId]: JSBI.BigInt(0) },
        }
        allTicks.splice(pivot + 1, 0, activeTickProcessed)
        pivot += 1
      }

      allTicks[pivot].liquidityActive[_tierId] = tier.liquidity

      return localActiveTick
    })

    if (hasError) return undefined

    activeTicks.forEach((localActiveTick, _tierId) => {
      const pivot = allTicks.findIndex(({ tickIdx }) => tickIdx > localActiveTick) - 1
      computeSurroundingTicks(allTicks, _tierId, pivot, true)
      computeSurroundingTicks(allTicks, _tierId, pivot, false)
    })

    return allTicks
  }, [currencyA, currencyB, poolState, pool, ticks])

  return useMemo(() => {
    if (!currencyA || !currencyB || poolState !== PoolState.EXISTS || !data || isLoading || isUninitialized) {
      return {
        isLoading: isLoading || poolState === PoolState.LOADING,
        isUninitialized,
        isError,
        error,
        activeTick,
        data: undefined,
      }
    }

    return {
      isLoading,
      isUninitialized,
      isError,
      error,
      activeTick,
      data,
    }
  }, [currencyA, currencyB, poolState, isLoading, isUninitialized, isError, error, activeTick, data])
}
