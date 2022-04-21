import { Trans } from '@lingui/macro'
import { MuffinPositionDetail } from '@muffinfi/hooks/usePositions'
import { ButtonText } from 'components/Button'
import PositionListItem from 'components/PositionListItem'
import React from 'react'
import styled from 'styled-components/macro'
import { MEDIA_WIDTHS } from 'theme'

const CardHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;

  font-size: 0.875rem;
  font-weight: var(--fw-bold);

  margin-bottom: 24px;
  padding: 8px;
  @media screen and (min-width: ${MEDIA_WIDTHS.upToSmall + 0.1}px) {
    padding: 0px;
  }
`

type PositionListProps = React.PropsWithChildren<{
  positions: MuffinPositionDetail[]
  setUserHideClosedPositions: any
  userHideClosedPositions: boolean
}>

export default function PositionList({
  positions,
  setUserHideClosedPositions,
  userHideClosedPositions,
}: PositionListProps) {
  return (
    <>
      <CardHeader>
        <div>
          <Trans>Your positions</Trans>
          {positions && ` (${positions.length})`}
        </div>
        <ButtonText style={{ opacity: 0.6 }} onClick={() => setUserHideClosedPositions(!userHideClosedPositions)}>
          {userHideClosedPositions ? <Trans>Show closed positions</Trans> : <Trans>Hide closed positions</Trans>}
        </ButtonText>
      </CardHeader>
      {positions.map((p) => {
        return <PositionListItem key={p.tokenId.toString()} positionDetails={p} />
      })}
    </>
  )
}
