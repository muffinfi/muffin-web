import { Trans } from '@lingui/macro'
import { MuffinPositionDetail } from '@muffinfi/hooks/usePositions'
import * as M from '@muffinfi-ui'
import { QuestionHelperInline } from 'components/QuestionHelper'
import styled from 'styled-components/macro'

// import PositionListItem from './PositionListItem'
import PositionListRow, { BasePositionRow, PriceRangeBarWrapper } from './PositionListRow'
import { TokenPricesQueryUpdater } from './usePositionValues'

const PositionListHeader = styled.div`
  ${BasePositionRow}
  padding-top: 24px;
  padding-bottom: 16px;
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
      <TokenPricesQueryUpdater positions={positions} />

      <M.Column stretch gap="16px">
        <M.RowBetween>
          <M.Text size="sm" weight="semibold">
            <Trans>Your positions</Trans>
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

        <M.TextDiv size="sm">
          <PositionListHeader>
            <div>
              <Trans>ID</Trans>
            </div>
            <div>
              <Trans>Token pair</Trans>
            </div>
            <div>
              <Trans>Fee tier</Trans>
            </div>
            <div>
              <Trans>Price range</Trans>
            </div>
            <PriceRangeBarWrapper></PriceRangeBarWrapper>
            <div>
              <Trans>Value</Trans>{' '}
              <QuestionHelperInline
                text={
                  <Trans>
                    The estimated value of your position&apos;s assets, including the unclaimed fees.
                    <br />
                    <br />
                    The asset prices used in the estimation are fetched from Muffin subgraph, or if missing, fall back
                    to using DefiLlama API.
                  </Trans>
                }
              />
            </div>
            <div style={{ textAlign: 'right' }}>
              <Trans>Status</Trans>
            </div>
          </PositionListHeader>

          {positions.map((p) => (
            <PositionListRow key={p.tokenId.toString()} positionDetails={p} />
          ))}
        </M.TextDiv>
      </M.Column>
    </>
  )
}
