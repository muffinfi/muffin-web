import { Trans } from '@lingui/macro'
import * as M from '@muffinfi-ui'
import { QuestionHelperInline } from 'components/QuestionHelper'
import styled from 'styled-components/macro'
import { PositionDetails } from 'types/position'

import PositionListRow, { BasePositionRow } from './PositionListRow'

const PositionListHeader = styled.div`
  ${BasePositionRow}
  padding-top: 20px;
  padding-bottom: 16px;
  font-size: var(--text-sm);
  color: var(--text2);

  ${({ theme }) => theme.mediaWidth.upToSmall`
    display: none;
  `}
`

export default function PositionList({ positionDetails }: { positionDetails: PositionDetails[] }) {
  return (
    <M.SectionCard padding="0">
      <M.Column stretch gap="16px">
        <M.TextDiv size="sm">
          <PositionListHeader>
            <div />
            <div>
              <Trans>Token pair, fee tier</Trans>
            </div>
            <div>
              <Trans>Price range</Trans>
            </div>
            <div>
              <Trans>Token amounts</Trans>
            </div>
            <div>
              <Trans>Value</Trans>{' '}
              <QuestionHelperInline
                text={
                  <Trans>
                    The estimated value of your position&apos;s assets, excluding the unclaimed fees.
                    <br />
                    <br />
                    The asset prices used in the estimation are fetched from Muffin subgraph, or if missing, fall back
                    to using DefiLlama API.
                  </Trans>
                }
              />
            </div>
            <div />
          </PositionListHeader>

          {positionDetails.map((p) => (
            <PositionListRow key={p.tokenId.toString()} positionDetails={p} />
          ))}
        </M.TextDiv>
      </M.Column>
    </M.SectionCard>
  )
}
