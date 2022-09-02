import { Pool } from '@muffinfi/muffin-sdk'
import { skipToken } from '@reduxjs/toolkit/query/react'
import { Fraction, Percent } from '@uniswap/sdk-core'
import useBlockNumber from 'lib/hooks/useBlockNumber'
import ms from 'ms.macro'
import { useMemo } from 'react'
import ReactGA from 'react-ga'
import { useFeeTierDistributionQuery } from 'state/data/enhanced'
import { FeeTierDistributionQuery } from 'state/data/generated'
import { toFraction } from 'utils/fraction'

export type PercentagesByTierId = Record<number, Percent | undefined>

// maximum number of blocks past which we consider the data stale
const MAX_DATA_BLOCK_AGE = 20

const ZERO = new Fraction(0)

/**
 * Return distributions as percentages of TVL
 */
export function useMuffinTierDistribution(pool: Pool | undefined) {
  const latestBlock = useBlockNumber()

  const { isLoading, isFetching, isUninitialized, isError, data } = useFeeTierDistributionQuery(
    pool ? { poolId: pool.poolId } : skipToken,
    { pollingInterval: ms`30s` }
  )

  const { tiers, _meta } = (data as FeeTierDistributionQuery) ?? {}

  return useMemo(() => {
    if (!latestBlock || !_meta || !tiers || !pool) {
      return {
        isLoading,
        isFetching,
        isUninitialized,
        isError,
      }
    }

    if (latestBlock - (_meta?.block?.number ?? 0) > MAX_DATA_BLOCK_AGE) {
      ReactGA.exception({ description: `Graph stale (latest block: ${latestBlock})` })

      return {
        isLoading,
        isFetching,
        isUninitialized,
        isError,
      }
    }

    // sum total tvl for token0 and token1
    const tvls = tiers.map((value) => ({
      tierId: value.tierId,
      tvl: toFraction(value.amount0 ?? 0).add(
        toFraction(value.amount1 ?? 0).multiply(toFraction(value.token0Price ?? 0))
      ),
    }))

    const sum = tvls.reduce((memo, { tvl }) => memo.add(tvl), ZERO)
    const hasLiquidity = sum.greaterThan(0)

    const { largestTierId, distributions } = tvls.reduce(
      (memo, { tierId, tvl }) => {
        if (tvl.greaterThan(memo.greatestTvl)) {
          memo.largestTierId = tierId
          memo.greatestTvl = tvl
        }
        const fraction = tvl.divide(sum)
        memo.distributions[tierId] = hasLiquidity ? new Percent(fraction.numerator, fraction.denominator) : undefined
        return memo
      },
      { largestTierId: 0, greatestTvl: ZERO, distributions: {} } as {
        largestTierId: number
        greatestTvl: Fraction
        distributions: PercentagesByTierId
      }
    )

    return {
      isLoading,
      isFetching,
      isUninitialized,
      isError,
      largestTierId,
      distributions,
    }
  }, [latestBlock, _meta, tiers, pool, isLoading, isFetching, isUninitialized, isError])
}
