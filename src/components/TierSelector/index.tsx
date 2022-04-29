import { PercentagesByTierId, useMuffinTierDistribution } from '@muffinfi/hooks/useTierDistribution'
import { Pool, SQRT_GAMMAS_FIRST_TIER } from '@muffinfi/muffin-v1-sdk'
import useActiveWeb3React from 'hooks/useActiveWeb3React'
import useTierColors from 'hooks/useTierColors'
import { ColumnDisableable } from 'pages/AddLiquidity/styled'
import { useMemo } from 'react'
import styled from 'styled-components/macro'
import { TierOption } from './TierOption'

const Select = styled.div`
  align-items: flex-start;
  display: grid;
  gap: 8px;
  grid-template-columns: repeat(auto-fill, minmax(110px, 1fr));
`

const DEFAULT_DISTRIBUTIONS = SQRT_GAMMAS_FIRST_TIER.reduce((memo, _, i) => {
  memo[i] = undefined
  return memo
}, {} as PercentagesByTierId)

export default function TierSelector({
  disabled = false,
  pool, // real pool, not mock pool
  sqrtGammaSelected,
  handleTierSelect,
  showNotCreated,
}: {
  disabled: boolean | undefined
  pool: Pool | undefined
  sqrtGammaSelected: number | undefined
  showNotCreated?: boolean
  handleTierSelect: (sqrtGamma: number) => void
}) {
  const { chainId } = useActiveWeb3React()
  const { distributions } = useMuffinTierDistribution(pool)

  // select options
  const sqrtGammas = useMemo(() => {
    return showNotCreated ? pool?.tiers.map((tier) => tier.sqrtGamma) ?? SQRT_GAMMAS_FIRST_TIER : []
  }, [showNotCreated, pool])

  // get selected tier id by finding the first tier that has the desired sqrt gamma
  const tierIdSelected = useMemo(() => {
    const i = sqrtGammas.indexOf(sqrtGammaSelected ?? -1)
    return i !== -1 ? i : undefined
  }, [sqrtGammas, sqrtGammaSelected])

  // tier colors
  const tierColors = useTierColors()

  return (
    <ColumnDisableable stretch gap="8px" disabled={disabled}>
      {chainId && (
        <Select>
          {sqrtGammas.map((sqrtGamma, i) => (
            <TierOption
              tierId={i}
              active={i === tierIdSelected}
              activeColor={tierColors[i % tierColors.length]}
              sqrtGamma={sqrtGamma}
              distributions={distributions ?? (showNotCreated ? DEFAULT_DISTRIBUTIONS : undefined)}
              handleTierSelect={handleTierSelect}
              key={i}
            />
          ))}
        </Select>
      )}
    </ColumnDisableable>
  )
}
