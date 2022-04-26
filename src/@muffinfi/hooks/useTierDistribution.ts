import { Pool } from '@muffinfi/muffin-v1-sdk'
import JSBI from 'jsbi'
import { useMemo } from 'react'

type PercentagesByTierId = Record<number, number | undefined>

/**
 * Return distributions as percentages of overall active liquidity
 * TODO: use TVL instead of active liquidity
 */
export function useMuffinTierDistribution(pool: Pool | undefined): {
  largestTierId: number
  distributions: PercentagesByTierId
} {
  const data = useMemo(() => {
    const tiers = pool?.tiers || []
    const totalLiq = tiers.reduce((memo, tier) => JSBI.add(memo, tier.liquidity), JSBI.BigInt(0))

    const hasLiquidity = JSBI.greaterThan(totalLiq, JSBI.BigInt(0))
    return tiers.reduce(
      (memo, tier, i) => {
        if (JSBI.greaterThan(tier.liquidity, tiers[memo.largestTierId].liquidity)) {
          memo.largestTierId = i
        }
        memo.distributions[i] = hasLiquidity
          ? JSBI.toNumber(JSBI.divide(JSBI.multiply(tier.liquidity, JSBI.BigInt('10000')), totalLiq)) / 100
          : undefined
        return memo
      },
      { largestTierId: 0, distributions: {} } as {
        largestTierId: number
        distributions: PercentagesByTierId
      }
    )
  }, [pool?.tiers])

  return data
}
