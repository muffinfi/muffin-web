import { Trans } from '@lingui/macro'
import { useMuffinTierDistribution } from '@muffinfi/hooks/useTierDistribution'
import { Pool, sqrtGammaToFeePercent, SQRT_GAMMAS_FIRST_TIER } from '@muffinfi/muffin-v1-sdk'
import Card from 'components/Card'
import { AutoColumn } from 'components/Column'
import { RowBetween } from 'components/Row'
import useTierColors from 'hooks/useTierColors'
import { useActiveWeb3React } from 'hooks/web3'
import { DynamicSection } from 'pages/AddLiquidity/styled'
import React, { useEffect, useMemo, useState } from 'react'
import { Box } from 'rebass'
import styled, { keyframes } from 'styled-components/macro'
import usePrevious from '../../hooks/usePrevious'
import { ThemedText } from '../../theme'
import { TierOption } from './TierOption'
import { TierPercentageBadge } from './TierPercentageBadge'

const pulse = (color: string) => keyframes`
  0% {
    box-shadow: 0 0 0 0 ${color};
  }

  70% {
    box-shadow: 0 0 0 2px ${color};
  }

  100% {
    box-shadow: 0 0 0 0 ${color};
  }
`
const FocusedOutlineCard = styled(Card)<{ pulsing: boolean }>`
  border: 1px solid ${({ theme }) => theme.bg2};
  animation: ${({ pulsing, theme }) => pulsing && pulse(theme.primary1)} 0.6s linear;
  align-self: center;
`

const Select = styled.div`
  align-items: flex-start;
  display: grid;
  grid-auto-flow: column;
  grid-gap: 8px;
`

export default function TierSelector({
  disabled = false,
  pool, // real pool, not mock pool
  sqrtGammaSelected,
  handleTierSelect,
}: {
  disabled: boolean | undefined
  pool: Pool | undefined
  sqrtGammaSelected: number | undefined
  handleTierSelect: (sqrtGamma: number) => void
}) {
  const { chainId } = useActiveWeb3React()
  const { distributions } = useMuffinTierDistribution(pool)

  // select options
  const sqrtGammas = useMemo(() => {
    return pool?.tiers.map((tier) => tier.sqrtGamma) ?? SQRT_GAMMAS_FIRST_TIER
  }, [pool])

  // get selected tier id by finding the first tier that has the desired sqrt gamma
  const tierIdSelected = useMemo(() => {
    const i = sqrtGammas.indexOf(sqrtGammaSelected ?? -1)
    return i !== -1 ? i : undefined
  }, [sqrtGammas, sqrtGammaSelected])

  // calculate fee percent of the selected sqrt gamma
  const feePercentSelected = useMemo(
    () => (sqrtGammaSelected != null ? sqrtGammaToFeePercent(sqrtGammaSelected) : undefined),
    [sqrtGammaSelected]
  )

  // tier colors
  const tierColors = useTierColors()

  // pulsing animation
  const [pulsing, setPulsing] = useState(false)
  const prevSqrtGammaSelected = usePrevious(sqrtGammaSelected)
  useEffect(() => {
    if (sqrtGammaSelected != null && prevSqrtGammaSelected !== sqrtGammaSelected) setPulsing(true)
  }, [sqrtGammaSelected, prevSqrtGammaSelected])

  return (
    <AutoColumn gap="16px">
      <DynamicSection gap="md" disabled={disabled}>
        <FocusedOutlineCard pulsing={pulsing} onAnimationEnd={() => setPulsing(false)}>
          <RowBetween>
            <AutoColumn id="add-liquidity-selected-fee">
              {sqrtGammaSelected == null ? (
                <>
                  <ThemedText.Label>
                    <Trans>Fee tier</Trans>
                  </ThemedText.Label>
                  <ThemedText.Main fontWeight={400} fontSize="12px" textAlign="left">
                    <Trans>The % you will earn in fees.</Trans>
                  </ThemedText.Main>
                </>
              ) : (
                <>
                  <ThemedText.Label className="selected-fee-label">
                    <Trans>{feePercentSelected?.toFixed(2)}% fee tier</Trans>
                  </ThemedText.Label>
                  <Box style={{ width: 'fit-content', marginTop: '8px' }} className="selected-fee-percentage">
                    {distributions && tierIdSelected != null && (
                      <TierPercentageBadge distributions={distributions} tierId={tierIdSelected} />
                    )}
                  </Box>
                </>
              )}
            </AutoColumn>

            {/* <ButtonGray onClick={() => setShowOptions(!showOptions)} width="auto" padding="4px" $borderRadius="6px">
              {showOptions ? <Trans>Hide</Trans> : <Trans>Edit</Trans>}
            </ButtonGray> */}
          </RowBetween>
        </FocusedOutlineCard>

        {chainId && (
          <Select>
            {sqrtGammas.map((sqrtGamma, i) => (
              <TierOption
                tierId={i}
                active={i === tierIdSelected}
                activeColor={tierColors[i % tierColors.length]}
                sqrtGamma={sqrtGamma}
                distributions={distributions}
                handleTierSelect={handleTierSelect}
                key={i}
              />
            ))}
          </Select>
        )}
      </DynamicSection>
    </AutoColumn>
  )
}
