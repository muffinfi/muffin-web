import { Trans } from '@lingui/macro'
import { MuffinPositionDetail } from '@muffinfi/hooks/usePositions'
import * as M from '@muffinfi-ui'
import styled from 'styled-components/macro'

import PositionListItem, { BasePositionRow } from './PositionListItem'

const PositionListHeader = styled.div`
  ${BasePositionRow}
  padding-top: 16px;
  padding-bottom: 8px;
  color: var(--text2);
  font-size: var(--text-sm);

  ${({ theme }) => theme.mediaWidth.upToSmall`
    display: none;
  `}
`

export default function PositionList({
  positions,
  setUserHideClosedPositions,
  userHideClosedPositions,
}: {
  positions: MuffinPositionDetail[]
  setUserHideClosedPositions: any
  userHideClosedPositions: boolean
}) {
  return (
    <>
      <M.Column stretch gap="16px">
        <M.RowBetween>
          <M.Text size="sm" weight="semibold">
            <Trans>Your positions</Trans>
            {positions && ` (${positions.length})`}
          </M.Text>

          <M.TextDiv size="xs" color="text2">
            <M.Row gap="0.5em" as="label">
              <input
                type="checkbox"
                checked={!userHideClosedPositions}
                onChange={(event) => setUserHideClosedPositions(!event.target.checked)}
              />
              <Trans>Show closed positions</Trans>
            </M.Row>
          </M.TextDiv>
        </M.RowBetween>

        <PositionListHeader>
          <span>ID</span>
          <span>Token Pair</span>
          <span>Fee tier</span>
          <span>Price range</span>
          <span>Status</span>
        </PositionListHeader>

        {positions.map((p) => (
          <PositionListItem key={p.tokenId.toString()} positionDetails={p} />
        ))}
      </M.Column>
    </>
  )
}
