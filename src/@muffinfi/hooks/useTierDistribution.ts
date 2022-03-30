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
    let totalLiq = JSBI.BigInt(0)
    for (const tier of tiers) totalLiq = JSBI.add(totalLiq, tier.liquidity)

    let largestTierId = 0

    const distributions: PercentagesByTierId = {}
    const hasLiquidity = JSBI.greaterThan(totalLiq, JSBI.BigInt(0))
    for (const [i, tier] of tiers.entries()) {
      if (JSBI.greaterThan(tier.liquidity, tiers[largestTierId].liquidity)) largestTierId = i
      distributions[i] = hasLiquidity
        ? JSBI.toNumber(JSBI.divide(JSBI.multiply(tier.liquidity, JSBI.BigInt('10000')), totalLiq)) / 100
        : undefined
    }

    return { largestTierId, distributions }
  }, [pool?.tiers])

  return data
}
