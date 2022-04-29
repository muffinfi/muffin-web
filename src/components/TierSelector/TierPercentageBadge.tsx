import { Trans } from '@lingui/macro'
import { PercentagesByTierId } from '@muffinfi/hooks/useTierDistribution'
import * as M from '@muffinfi-ui'
import Badge from 'components/Badge'

export function TierPercentageBadge({
  tierId,
  distributions,
}: {
  tierId: number
  distributions?: PercentagesByTierId
}) {
  return (
    <Badge>
      <M.Text size="xs" weight="regular" color="text1">
        {distributions?.[tierId] == null ? (
          <Trans>Not created</Trans>
        ) : (
          <Trans>{distributions[tierId]?.toFixed(0)}% selected</Trans>
        )}
      </M.Text>
    </Badge>
  )
}
