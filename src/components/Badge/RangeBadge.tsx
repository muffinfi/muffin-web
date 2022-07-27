import { Trans } from '@lingui/macro'
import Badge, { BadgeVariant } from 'components/Badge'
import { memo } from 'react'
import { AlertCircle } from 'react-feather'
import styled from 'styled-components/macro'

import { MouseoverTooltip } from '../../components/Tooltip'

const StyledBadge = styled(Badge)`
  font-size: 0.875em;
  gap: 0.5em;
`

const Dot = styled.span<{ dotColor: string }>`
  background-color: ${({ dotColor }) => `var(--${dotColor})`};
  border-radius: 50%;
  height: 0.6em;
  width: 0.6em;
`

export default memo(function RangeBadge({
  removed,
  inRange,
  settled,
  isLimit,
}: {
  removed: boolean | undefined
  inRange: boolean | undefined
  settled: boolean | undefined
  isLimit: boolean | undefined
}) {
  if (removed) {
    return (
      <MouseoverTooltip text={<Trans>Your position has 0 liquidity, and is not earning fees.</Trans>}>
        <StyledBadge variant={BadgeVariant.DEFAULT}>
          <AlertCircle size="1em" />
          <Trans>Closed</Trans>
        </StyledBadge>
      </MouseoverTooltip>
    )
  }

  if (settled) {
    return (
      <MouseoverTooltip
        text={<Trans>Your limit range order is fulfilled. You can close your position and collect your tokens.</Trans>}
      >
        <StyledBadge variant={BadgeVariant.POSITIVE}>
          <AlertCircle size="1em" />
          <Trans>Pending to collect</Trans>
        </StyledBadge>
      </MouseoverTooltip>
    )
  }

  if (isLimit) {
    if (inRange) {
      return (
        <MouseoverTooltip
          text={
            <Trans>The price of this pool is within your selected range. Your limit range order is being filled.</Trans>
          }
        >
          <StyledBadge variant={BadgeVariant.DEFAULT}>
            <Dot dotColor="success" />
            <Trans>Filling</Trans>
          </StyledBadge>
        </MouseoverTooltip>
      )
    }
    return (
      <MouseoverTooltip
        text={
          <Trans>
            Your limit range order has not started to be filled, since the price of the pool is outside of your selected
            range.
          </Trans>
        }
      >
        <StyledBadge variant={BadgeVariant.DEFAULT}>
          <Dot dotColor="alert" />
          <Trans>Pending to fill</Trans>
        </StyledBadge>
      </MouseoverTooltip>
    )
  }

  if (inRange) {
    return (
      <MouseoverTooltip
        text={
          <Trans>The price of this pool is within your selected range. Your position is currently earning fees.</Trans>
        }
      >
        <StyledBadge variant={BadgeVariant.DEFAULT}>
          <Dot dotColor="success" />
          <Trans>In range</Trans>
        </StyledBadge>
      </MouseoverTooltip>
    )
  }

  return (
    <MouseoverTooltip
      text={
        <Trans>
          The price of this pool is outside of your selected range. Your position is not currently earning fees.
        </Trans>
      }
    >
      <StyledBadge variant={BadgeVariant.WARNING}>
        <AlertCircle size="1em" />
        <Trans>Out of range</Trans>
      </StyledBadge>
    </MouseoverTooltip>
  )
})
