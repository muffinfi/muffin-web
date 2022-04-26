import { PoolState, useMuffinPool } from '@muffinfi/hooks/usePools'
import { Pool, tickToPrice } from '@muffinfi/muffin-v1-sdk'
import { skipToken } from '@reduxjs/toolkit/query/react'
import { Currency } from '@uniswap/sdk-core'
import JSBI from 'jsbi'
import ms from 'ms.macro'
import { useMemo } from 'react'
import { AllV3TicksQueryResultKey, AllV3TicksQueryResultKeys, useAllV3TicksQuery } from 'state/data/enhanced'
import { AllV3TicksQuery, Tick } from 'state/data/generated'
import computeSurroundingTicks from 'utils/computeSurroundingTicks'

const PRICE_FIXED_DIGITS = 8
// const CHAIN_IDS_MISSING_SUBGRAPH_DATA = [ChainId.ARBITRUM_ONE, ChainId.ARBITRUM_RINKEBY]

export interface TickData {
  tick: number
  liquidityNet: JSBI
  liquidityGross: JSBI
}

// Tick with fields parsed to JSBIs, and active liquidity computed.
export interface TickProcessed {
  tickIdx: number
  price0: string
  liquidityActive: Record<number, JSBI>
  liquidityNet: Record<number, JSBI>
}

export type StackedTick = Record<number, any> & Pick<Tick, 'tickIdx' | 'price0'>

const getActiveTick = (tickCurrent: number | undefined, tickSpacing: number | undefined) =>
  tickCurrent != null && tickSpacing != null ? Math.floor(tickCurrent / tickSpacing) * tickSpacing : undefined

// const REFRESH_FREQUENCY = { blocksPerFetch: 2 }

// const bitmapIndex = (tick: number, tickSpacing: number) => {
//   return Math.floor(tick / tickSpacing / 256)
// }

// function useTicksFromTickLens(
//   currencyA: Currency | undefined,
//   currencyB: Currency | undefined,
//   feeAmount: FeeAmount | undefined,
//   numSurroundingTicks: number | undefined = 125
// ) {
//   const [tickDataLatestSynced, setTickDataLatestSynced] = useState<TickData[]>([])

//   const [poolState, pool] = usePool(currencyA, currencyB, feeAmount)

//   const tickSpacing = feeAmount && TICK_SPACINGS[feeAmount]

//   // Find nearest valid tick for pool in case tick is not initialized.
//   const activeTick = pool?.tickCurrent && tickSpacing ? nearestUsableTick(pool?.tickCurrent, tickSpacing) : undefined

//   const poolAddress =
//     currencyA && currencyB && feeAmount && poolState === PoolState.EXISTS
//       ? Pool.getAddress(currencyA?.wrapped, currencyB?.wrapped, feeAmount)
//       : undefined

//   // it is also possible to grab all tick data but it is extremely slow
//   // bitmapIndex(nearestUsableTick(TickMath.MIN_TICK, tickSpacing), tickSpacing)
//   const minIndex = useMemo(
//     () =>
//       tickSpacing && activeTick ? bitmapIndex(activeTick - numSurroundingTicks * tickSpacing, tickSpacing) : undefined,
//     [tickSpacing, activeTick, numSurroundingTicks]
//   )

//   const maxIndex = useMemo(
//     () =>
//       tickSpacing && activeTick ? bitmapIndex(activeTick + numSurroundingTicks * tickSpacing, tickSpacing) : undefined,
//     [tickSpacing, activeTick, numSurroundingTicks]
//   )

//   const tickLensArgs: [string, number][] = useMemo(
//     () =>
//       maxIndex && minIndex && poolAddress && poolAddress !== ZERO_ADDRESS
//         ? new Array(maxIndex - minIndex + 1)
//             .fill(0)
//             .map((_, i) => i + minIndex)
//             .map((wordIndex) => [poolAddress, wordIndex])
//         : [],
//     [minIndex, maxIndex, poolAddress]
//   )

//   const tickLens = useTickLens()
//   const callStates = useSingleContractMultipleData(
//     tickLensArgs.length > 0 ? tickLens : undefined,
//     'getPopulatedTicksInWord',
//     tickLensArgs,
//     REFRESH_FREQUENCY
//   )

//   const isError = useMemo(() => callStates.some(({ error }) => error), [callStates])
//   const isLoading = useMemo(() => callStates.some(({ loading }) => loading), [callStates])
//   const IsSyncing = useMemo(() => callStates.some(({ syncing }) => syncing), [callStates])
//   const isValid = useMemo(() => callStates.some(({ valid }) => valid), [callStates])

//   const tickData: TickData[] = useMemo(
//     () =>
//       callStates
//         .map(({ result }) => result?.populatedTicks)
//         .reduce(
//           (accumulator, current) => [
//             ...accumulator,
//             ...(current?.map((tickData: TickData) => {
//               return {
//                 tick: tickData.tick,
//                 liquidityNet: JSBI.BigInt(tickData.liquidityNet),
//                 liquidityGross: JSBI.BigInt(tickData.liquidityGross),
//               }
//             }) ?? []),
//           ],
//           []
//         ),
//     [callStates]
//   )

//   // reset on input change
//   useEffect(() => {
//     setTickDataLatestSynced([])
//   }, [currencyA, currencyB, feeAmount])

//   // return the latest synced tickData even if we are still loading the newest data
//   useEffect(() => {
//     if (!IsSyncing && !isLoading && !isError && isValid) {
//       setTickDataLatestSynced(tickData.sort((a, b) => a.tick - b.tick))
//     }
//   }, [isError, isLoading, IsSyncing, tickData, isValid])

//   return useMemo(
//     () => ({ isLoading, IsSyncing, isError, isValid, tickData: tickDataLatestSynced }),
//     [isLoading, IsSyncing, isError, isValid, tickDataLatestSynced]
//   )
// }

function useTicksFromSubgraph(pool?: Pool | null) {
  return useAllV3TicksQuery(pool ? { poolId: pool.poolId, skip: 0 } : skipToken, {
    pollingInterval: ms`30s`,
  })
}

// Fetches all ticks for a given pool
function useAllV3Ticks(pool?: Pool | null): {
  isLoading: boolean
  isUninitialized: boolean
  isError: boolean
  error: unknown
  ticks: Omit<AllV3TicksQuery, '__typename'> | undefined
} {
  // const useSubgraph = currencyA ? !CHAIN_IDS_MISSING_SUBGRAPH_DATA.includes(currencyA.chainId) : true
  const useSubgraph = true

  // const tickLensTickData = useTicksFromTickLens(!useSubgraph ? currencyA : undefined, currencyB, feeAmount)
  const tickLensTickData = useTicksFromSubgraph(!useSubgraph ? pool : undefined)
  const subgraphTickData = useTicksFromSubgraph(useSubgraph ? pool : undefined)

  return {
    isLoading: useSubgraph ? subgraphTickData.isLoading : tickLensTickData.isLoading,
    isUninitialized: useSubgraph ? subgraphTickData.isUninitialized : false,
    isError: useSubgraph ? subgraphTickData.isError : tickLensTickData.isError,
    error: useSubgraph ? subgraphTickData.error : tickLensTickData.isError,
    ticks: useSubgraph ? subgraphTickData.data : tickLensTickData.data,
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

  const { isLoading, isUninitialized, isError, error, ticks } = useAllV3Ticks(pool)

  const data = useMemo(() => {
    if (!currencyA || !currencyB || poolState !== PoolState.EXISTS || !pool || !ticks) {
      return undefined
    }

    const token0 = currencyA?.wrapped
    const token1 = currencyB?.wrapped

    // flat map and sort all the tick data
    const allTicks = (() => {
      const tickMap = AllV3TicksQueryResultKeys.reduce((acc, key) => {
        ticks[key].forEach((tick) => {
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
