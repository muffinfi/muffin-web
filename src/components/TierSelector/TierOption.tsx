import { Trans } from '@lingui/macro'
import { PercentagesByTierId } from '@muffinfi/hooks/useTierDistribution'
import { sqrtGammaToFeePercent } from '@muffinfi/muffin-sdk'
import { formatFeePercent } from '@muffinfi/utils/formatFeePercent'
import * as M from '@muffinfi-ui'
import { ButtonRadioChecked } from 'components/Button'
import { useCallback, useMemo } from 'react'

import { TierPercentageBadge } from './TierPercentageBadge'

export function TierOption({
  tierId,
  sqrtGamma,
  active,
  activeColor,
  distributions,
  handleTierSelect,
}: {
  tierId?: number
  sqrtGamma: number
  active: boolean
  activeColor: string
  distributions?: PercentagesByTierId
  handleTierSelect: (sqrtGamma: number) => void
}) {
  const feePercent = useMemo(() => sqrtGammaToFeePercent(sqrtGamma), [sqrtGamma])
  const onClick = useCallback(() => handleTierSelect(sqrtGamma), [handleTierSelect, sqrtGamma])

  return (
    <ButtonRadioChecked active={active} onClick={onClick} activeColor={activeColor}>
      <M.Column gap="0.5em">
        <M.Text weight="semibold">
          <Trans>{formatFeePercent(feePercent)}%</Trans>
        </M.Text>
        {distributions && tierId != null && <TierPercentageBadge distributions={distributions} tierId={tierId} />}
      </M.Column>
    </ButtonRadioChecked>
  )
}
