import { FeeTierOptionsFetchState, useFeeTierOptions } from '@muffinfi/hooks/useFeeTierOptions'
import { PercentagesByTierId, useMuffinTierDistribution } from '@muffinfi/hooks/useTierDistribution'
import { Pool } from '@muffinfi/muffin-sdk'
import { Currency } from '@uniswap/sdk-core'
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

export default function TierSelector({
  disabled = false,
  pool, // real pool, not mock pool
  currencyA, // used only when pool is undefined
  currencyB, // used only when pool is undefined
  sqrtGammaSelected,
  handleTierSelect,
  showNotCreated,
  activeColor,
}: {
  disabled: boolean | undefined
  pool: Pool | undefined
  currencyA: Currency | undefined
  currencyB: Currency | undefined
  sqrtGammaSelected: number | undefined
  showNotCreated?: boolean
  handleTierSelect: (sqrtGamma: number) => void
  activeColor?: string
}) {
  const { chainId } = useActiveWeb3React()

  // fetch allowed sqrt gammas
  const [optionFetchState, allowed] = useFeeTierOptions(pool?.token0 || currencyA, pool?.token1 || currencyB)

  // TVL distribution
  const { distributions } = useMuffinTierDistribution(pool)
  const defaultDistribution = useMemo(() => {
    return (allowed || []).reduce((acc, _, i) => ({ ...acc, [i]: undefined }), {} as PercentagesByTierId)
  }, [allowed])

  // select options
  const sqrtGammas = useMemo(() => {
    const created = pool?.tiers.map((tier) => tier.sqrtGamma)
    return showNotCreated ? [...(created || []), ...(allowed || [])].filter((x, i, arr) => arr.indexOf(x) === i) : []
  }, [showNotCreated, pool, allowed])

  // get selected tier id by finding the first tier that has the desired sqrt gamma
  const tierIdSelected = useMemo(() => {
    const i = sqrtGammas.indexOf(sqrtGammaSelected ?? -1)
    return i !== -1 ? i : undefined
  }, [sqrtGammas, sqrtGammaSelected])

  // tier colors
  const tierColors = useTierColors()

  return (
    <ColumnDisableable stretch gap="8px" disabled={disabled}>
      {chainId &&
        (optionFetchState === FeeTierOptionsFetchState.LOADING ? (
          <div>Loading</div> // TODO:
        ) : (
          <Select>
            {sqrtGammas.map((sqrtGamma, i) => (
              <TierOption
                tierId={i}
                active={i === tierIdSelected}
                activeColor={activeColor ?? tierColors[i % tierColors.length]}
                sqrtGamma={sqrtGamma}
                distributions={distributions ?? (showNotCreated ? defaultDistribution : undefined)}
                handleTierSelect={handleTierSelect}
                key={i}
              />
            ))}
          </Select>
        ))}
    </ColumnDisableable>
  )
}
