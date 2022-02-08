import { Trans } from '@lingui/macro'
import { useMuffinTierDistribution } from '@muffinfi/hooks/useTierDistribution'
import { sqrtGammaToFeePercent } from '@muffinfi/muffin-v1-sdk'
import { ButtonRadioChecked } from 'components/Button'
import { AutoColumn } from 'components/Column'
import React, { ReactNode, useCallback, useMemo } from 'react'
import styled from 'styled-components/macro'
import { ThemedText } from 'theme'
import { TierPercentageBadge } from './TierPercentageBadge'

const ResponsiveText = styled(ThemedText.Label)`
  line-height: 16px;
  font-size: 14px;

  ${({ theme }) => theme.mediaWidth.upToSmall`
    font-size: 12px;
    line-height: 12px;
  `};
`

const SQRT_GAMMA_DETAIL: Record<number, { description: ReactNode }> = {
  // 99975: { description: <Trans>Best for stable pairs.</Trans> },
  // 99850: { description: <Trans>Best for most pairs.</Trans> },
}

export function TierOption({
  tierId,
  sqrtGamma,
  active,
  distributions,
  handleTierSelect,
}: {
  tierId: number
  sqrtGamma: number
  active: boolean
  distributions: ReturnType<typeof useMuffinTierDistribution>['distributions']
  handleTierSelect: (sqrtGamma: number) => void
}) {
  const feePercent = useMemo(() => sqrtGammaToFeePercent(sqrtGamma), [sqrtGamma])
  const onClick = useCallback(() => handleTierSelect(sqrtGamma), [handleTierSelect, sqrtGamma])

  return (
    <ButtonRadioChecked active={active} onClick={onClick}>
      <AutoColumn gap="sm" justify="flex-start">
        <AutoColumn justify="flex-start" gap="6px">
          <ResponsiveText>
            <Trans>{feePercent.toFixed(2)}%</Trans>
          </ResponsiveText>
          <ThemedText.Main fontWeight={400} fontSize="12px" textAlign="left">
            {SQRT_GAMMA_DETAIL[sqrtGamma]?.description}
          </ThemedText.Main>
        </AutoColumn>

        {distributions && <TierPercentageBadge distributions={distributions} tierId={tierId} />}
      </AutoColumn>
    </ButtonRadioChecked>
  )
}

// export const FEE_AMOUNT_DETAIL: Record<
//   FeeAmount,
//   { label: string; description: ReactNode; supportedChains: SupportedChainId[] }
// > = {
//   [FeeAmount.LOWEST]: {
//     label: '0.01',
//     description: <Trans>Best for very stable pairs.</Trans>,
//     supportedChains: [SupportedChainId.MAINNET],
//   },
//   [FeeAmount.LOW]: {
//     label: '0.05',
//     description: <Trans>Best for stable pairs.</Trans>,
//     supportedChains: ALL_SUPPORTED_CHAIN_IDS,
//   },
//   [FeeAmount.MEDIUM]: {
//     label: '0.3',
//     description: <Trans>Best for most pairs.</Trans>,
//     supportedChains: ALL_SUPPORTED_CHAIN_IDS,
//   },
//   [FeeAmount.HIGH]: {
//     label: '1',
//     description: <Trans>Best for exotic pairs.</Trans>,
//     supportedChains: ALL_SUPPORTED_CHAIN_IDS,
//   },
// }