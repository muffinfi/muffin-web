import { Trans } from '@lingui/macro'
import { useMuffinTierDistribution } from '@muffinfi/hooks/useTierDistribution'
import Badge from 'components/Badge'
import React from 'react'
import { ThemedText } from 'theme'

export function TierPercentageBadge({
  tierId,
  distributions,
}: {
  tierId: number
  distributions: ReturnType<typeof useMuffinTierDistribution>['distributions']
}) {
  return (
    <Badge>
      <ThemedText.Label fontSize={10}>
        {distributions[tierId] == null ? (
          <Trans>Not created</Trans>
        ) : (
          <Trans>{distributions[tierId]?.toFixed(0)}% select</Trans>
        )}
      </ThemedText.Label>
    </Badge>
  )
}
