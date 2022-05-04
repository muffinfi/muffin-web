import { Trans } from '@lingui/macro'
import Badge, { BadgeVariant } from 'components/Badge'
import { AlertCircle } from 'react-feather'
import styled from 'styled-components/macro'
import { MouseoverTooltip } from '../../components/Tooltip'

const StyledBadge = styled(Badge)`
  font-size: 0.875em;
  gap: 0.5em;
`

const ActiveDot = styled.span`
  background-color: var(--success);
  border-radius: 50%;
  height: 0.6em;
  width: 0.6em;
`

export default function RangeBadge({
  removed,
  inRange,
  settled,
}: {
  removed: boolean | undefined
  inRange: boolean | undefined
  settled: boolean | undefined
}) {
  return (
    <>
      {removed ? (
        <MouseoverTooltip text={<Trans>Your position has 0 liquidity, and is not earning fees.</Trans>}>
          <StyledBadge variant={BadgeVariant.DEFAULT}>
            <AlertCircle size="1em" />
            <Trans>Closed</Trans>
          </StyledBadge>
        </MouseoverTooltip>
      ) : settled ? (
        <MouseoverTooltip
          text={<Trans>Your limit range order is fulfilled but not yet collected, and is not earning fees.</Trans>}
        >
          <StyledBadge variant={BadgeVariant.POSITIVE}>
            <AlertCircle size="1em" />
            <Trans>Pending to collect</Trans>
          </StyledBadge>
        </MouseoverTooltip>
      ) : inRange ? (
        <MouseoverTooltip
          text={
            <Trans>
              The price of this pool is within your selected range. Your position is currently earning fees.
            </Trans>
          }
        >
          <StyledBadge variant={BadgeVariant.DEFAULT}>
            <ActiveDot />
            <Trans>In range</Trans>
          </StyledBadge>
        </MouseoverTooltip>
      ) : (
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
      )}
    </>
  )
}
