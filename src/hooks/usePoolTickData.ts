import { defaultAbiCoder } from '@ethersproject/abi'
import { BigNumber } from '@ethersproject/bignumber'
import { useLensContract } from '@muffinfi/hooks/useContract'
import { PoolState, useMuffinPool } from '@muffinfi/hooks/usePools'
import { MAX_TICK, MIN_TICK, Pool, SupportedChainId, TickMath, tickToPrice, Tier } from '@muffinfi/muffin-sdk'
import { skipToken } from '@reduxjs/toolkit/query/react'
import { Currency } from '@uniswap/sdk-core'
import JSBI from 'jsbi'
import useBlockNumber from 'lib/hooks/useBlockNumber'
import ms from 'ms.macro'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useAllV3TicksQuery } from 'state/data/enhanced'
import { Tick } from 'state/data/generated'
import computeSurroundingTicks from 'utils/computeSurroundingTicks'

const PRICE_FIXED_DIGITS = 8
const BLOCKS_PER_FETCH = 2
const CHAIN_IDS_WITH_SUBGRAPH_DATA: SupportedChainId[] = []

export interface LensTickData {
  tickIdx: number
  liquidityLowerD8: BigNumber
  liquidityUpperD8: BigNumber
  needSettle0: boolean
  needSettle1: boolean
}

export interface TickData {
  tiers: {
    tick: number
    liquidity: string
    sqrtGamma: string
    nextTickBelow: number
    nextTickAbove: number
    ticks: {
      tickIdx: number
      tierId: number
      liquidityNet: string
    }[]
  }[]
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

const parseTickData = (tickData: string) => {
  const words = tickData.replace(/^0x/, '').match(/.{1,64}/g)
  if (words == null) return [] as LensTickData[]
  const abiTypes = [
    'int24 tickIdx', //
    'uint96 liquidityLowerD8',
    'uint96 liquidityUpperD8',
    'bool needSettle0',
    'bool needSettle1',
  ]
  return words.map((word) => {
    const sliced = [
      word.slice(0 / 4, 24 / 4), //     int24   tickIdx
      word.slice(24 / 4, 120 / 4), //   uint96  liquidityLowerD8
      word.slice(120 / 4, 216 / 4), //  uint96  liquidityUpperD8
      word.slice(216 / 4, 224 / 4), //  bool    needSettle0
      word.slice(224 / 4, 232 / 4), //  bool    needSettle1
    ]
    return defaultAbiCoder.decode(
      abiTypes,
      '0x' + sliced.map((x) => x.padStart(64, '0')).join('')
    ) as unknown as LensTickData
  })
}

function useTicksFromTickLens(pool?: Pool | null, numSurroundingTicks: number | undefined = 1000) {
  const [tickDataLatestSynced, setTickDataLatestSynced] = useState<TickData | undefined>()
  const blockNumber = useBlockNumber()
  const [lastUpdatedBlock, setLastUpdatedBlock] = useState(0)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<any>(undefined)
  const skipRef = useRef(false)
  const poolIdRef = useRef(pool?.poolId)

  const tickLens = useLensContract()

  // reset on input change
  useEffect(() => {
    poolIdRef.current = pool?.poolId
    setTickDataLatestSynced(undefined)
    setLastUpdatedBlock(0)
    setIsLoading(false)
    setError(undefined)
  }, [pool?.poolId])

  useEffect(
    () => () => {
      skipRef.current = true
    },
    []
  )

  useEffect(() => {
    if (
      isLoading ||
      error ||
      !tickLens ||
      !pool?.tiers ||
      pool.tiers.length === 0 ||
      blockNumber == null ||
      lastUpdatedBlock + BLOCKS_PER_FETCH > blockNumber
    ) {
      return
    }
    setIsLoading(true)
    const tickPromises = pool.tiers.map((_, i) => tickLens.getTicks(pool.poolId, i, MIN_TICK, MAX_TICK, 1000))
    Promise.all(tickPromises)
      .then((ticks) => {
        if (skipRef.current || poolIdRef.current !== pool.poolId) return
        const tickData = {
          tiers: ticks.map((result, i) => {
            const tier = pool.tiers[i] as Tier
            return {
              tick: tier.tickCurrent,
              liquidity: tier.liquidity.toString(),
              sqrtGamma: tier.sqrtGamma.toString(),
              nextTickBelow: tier.nextTickBelow,
              nextTickAbove: tier.nextTickAbove,
              ticks: parseTickData(result.ticks).map((parsed) => ({
                tickIdx: parsed.tickIdx,
                tierId: i,
                liquidityNet: parsed.liquidityLowerD8.sub(parsed.liquidityUpperD8).mul(256).toString(),
              })),
            }
          }),
        }
        setTickDataLatestSynced((prev) => (JSON.stringify(prev) !== JSON.stringify(tickData) ? tickData : prev))
      })
      .catch((error) => {
        if (skipRef.current || poolIdRef.current !== pool.poolId) return
        setError(error)
      })
      .finally(() => {
        if (skipRef.current || poolIdRef.current !== pool.poolId) return
        setLastUpdatedBlock(blockNumber)
        setIsLoading(false)
      })
  }, [blockNumber, error, isLoading, lastUpdatedBlock, pool?.poolId, pool?.tiers, tickLens])

  return useMemo(
    () => ({
      isLoading: isLoading && tickDataLatestSynced == null,
      isError: !!error,
      error,
      data: tickDataLatestSynced,
    }),
    [isLoading, error, tickDataLatestSynced]
  )
}

function useTicksFromSubgraph(pool?: Pool | null) {
  return useAllV3TicksQuery(pool ? { poolId: pool.poolId, skip: 0 } : skipToken, {
    pollingInterval: ms`30s`,
  })
}

// Fetches all ticks for a given pool
export function useAllV3Ticks(pool?: Pool | null): {
  isLoading: boolean
  isUninitialized?: boolean
  isError: boolean
  error?: unknown
  data: TickData | undefined
} {
  const useSubgraph = pool ? CHAIN_IDS_WITH_SUBGRAPH_DATA.includes(pool.chainId) : false

  const tickLensTickData = useTicksFromTickLens(!useSubgraph ? pool : undefined)
  const subgraphTickData = useTicksFromSubgraph(useSubgraph ? pool : undefined)

  return (useSubgraph ? subgraphTickData : tickLensTickData) as {
    isLoading: boolean
    isUninitialized?: boolean
    isError: boolean
    error?: unknown
    data: TickData | undefined
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
  const { isLoading, isUninitialized, isError, error, data: rawData } = useAllV3Ticks(pool)

  const tiers = useMemo(
    () =>
      !pool?.token0 || !pool?.token1
        ? undefined
        : rawData?.tiers.map(
            (tier) =>
              new Tier(
                pool.token0,
                pool.token1,
                tier.liquidity,
                TickMath.tickToSqrtPriceX72(tier.tick),
                parseInt(tier.sqrtGamma),
                tier.nextTickBelow,
                tier.nextTickAbove
              )
          ),
    [pool?.token0, pool?.token1, rawData]
  )

  const tier = typeof tierId === 'number' && tierId >= 0 && tierId < (tiers?.length || 0) ? tiers?.[tierId] : undefined

  const activeTick = useMemo(
    () => getActiveTick(tier?.tickCurrent, pool?.tickSpacing),
    [tier?.tickCurrent, pool?.tickSpacing]
  )

  const data = useMemo(() => {
    if (!currencyA || !currencyB || poolState !== PoolState.EXISTS || !pool?.tickSpacing || !rawData || !tiers) {
      return undefined
    }

    const token0 = currencyA?.wrapped
    const token1 = currencyB?.wrapped

    // flat map and sort all the tick data
    const allTicks = (() => {
      const allSortedTicks = rawData.tiers
        .flatMap(({ ticks }) => ticks)
        .sort((aTick, bTick) => aTick.tickIdx - bTick.tickIdx)

      let lastProcessedTick: TickProcessed | undefined
      return allSortedTicks.reduce((acc, tick) => {
        if (lastProcessedTick?.tickIdx !== tick.tickIdx) {
          lastProcessedTick = {
            tickIdx: tick.tickIdx,
            price0: tickToPrice(token0, token1, tick.tickIdx).toFixed(PRICE_FIXED_DIGITS),
            liquidityActive: {},
            liquidityNet: {},
          }
          acc.push(lastProcessedTick)
        }
        lastProcessedTick.liquidityNet[tick.tierId] = JSBI.BigInt(tick.liquidityNet)
        return acc
      }, [] as TickProcessed[])
    })()

    let hasError = false

    // calculate active tick for each tier and add liquidity to "pivot" tick
    // missing "pivot" tick will be inserted
    const activeTicks = tiers.map((tier, _tierId) => {
      // Find nearest valid tick for pool in case tick is not initialized.
      const localActiveTick = getActiveTick(tier.tickCurrent, pool.tickSpacing)
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
  }, [currencyA, currencyB, poolState, pool?.tickSpacing, tiers, rawData])

  return useMemo(() => {
    if (!currencyA || !currencyB || poolState !== PoolState.EXISTS || !data || isLoading || isUninitialized) {
      return {
        isLoading: isLoading || poolState === PoolState.LOADING,
        isUninitialized: isUninitialized ?? false,
        isError,
        error,
        activeTick,
        data: undefined,
      }
    }

    return {
      isLoading,
      isUninitialized: isUninitialized ?? false,
      isError,
      error,
      activeTick,
      data,
    }
  }, [currencyA, currencyB, poolState, isLoading, isUninitialized, isError, error, activeTick, data])
}
