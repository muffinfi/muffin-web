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
  const tiers = useMemo(() => pool?.tiers || [], [pool])

  const data = useMemo(() => {
    let totalLiq = JSBI.BigInt(0)
    for (const tier of tiers) totalLiq = JSBI.add(totalLiq, tier.liquidity)

    let largestTier = tiers[0]
    for (const tier of tiers.slice(1)) {
      if (JSBI.greaterThan(tier.liquidity, largestTier.liquidity)) largestTier = tier
    }

    const distributions: PercentagesByTierId = {}
    const hasLiquidity = JSBI.greaterThan(totalLiq, JSBI.BigInt(0))
    for (const [i, tier] of tiers.entries()) {
      distributions[i] = hasLiquidity
        ? JSBI.toNumber(JSBI.divide(JSBI.multiply(tier.liquidity, JSBI.BigInt('10000')), totalLiq)) / 100
        : undefined
    }

    return { largestTier, distributions }
  }, [tiers])

  return {
    largestTierId: tiers.indexOf(data.largestTier),
    distributions: data.distributions,
  }
}
