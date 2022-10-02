import { Trans } from '@lingui/macro'
import * as M from '@muffinfi-ui'
import { ReactComponent as BarsIcon } from 'assets/images/list-bars.svg'
import { ReactComponent as GroupIcon } from 'assets/images/list-group.svg'
import { MouseoverTooltipText } from 'components/Tooltip'
import { atom, useAtom } from 'jotai'
import { memo } from 'react'
import { useUserHideClosedPositions } from 'state/user/hooks'
import styled from 'styled-components/macro'

export enum ListDisplay {
  LIST = 'list',
  GROUP = 'group',
}

export const listDisplayAtom = atom<ListDisplay>(ListDisplay.LIST)

const DisplayButtonGroupWrapper = styled.div.attrs({ role: 'button' })`
  display: inline-block;
  border-radius: 6px;
  line-height: 0;
  color: var(--text2);
`
const DisplayButton = styled.div<{ ['data-active']?: string }>`
  display: inline-block;
  padding: 5px;
  border-radius: 6px;
  min-width: 35px;
  text-align: center;
  margin-right: 2px;
  line-height: 0;
  cursor: pointer;
  background: ${({ 'data-active': active }) => (active === '1' ? 'var(--tertiary1)' : 'transparent')};
  &:hover {
    color: var(--text1);
    background: var(--tertiary1);
  }
`

const DisplayButtonGroup = memo(function DisplayButtonGroup() {
  const [listDisplay, setListDisplay] = useAtom(listDisplayAtom)

  return (
    <DisplayButtonGroupWrapper>
      <MouseoverTooltipText text={<Trans>List view</Trans>} placement="top" tooltipSize="xs">
        <DisplayButton
          data-active={listDisplay === ListDisplay.LIST ? '1' : '0'}
          onClick={() => setListDisplay(ListDisplay.LIST)}
        >
          <BarsIcon height={14} />
        </DisplayButton>
      </MouseoverTooltipText>
      <MouseoverTooltipText text={<Trans>Group by token pair</Trans>} placement="top" tooltipSize="xs">
        <DisplayButton
          data-active={listDisplay === ListDisplay.GROUP ? '1' : '0'}
          onClick={() => setListDisplay(ListDisplay.GROUP)}
        >
          <GroupIcon height={14} />
        </DisplayButton>
      </MouseoverTooltipText>
    </DisplayButtonGroupWrapper>
  )
})

export default memo(function PositionListControlRow() {
  const [userHideClosedPositions, setUserHideClosedPositions] = useUserHideClosedPositions()

  return (
    <M.RowBetween style={{ marginTop: -28, marginBottom: 4 }}>
      <span></span>
      <M.Row gap="16px">
        <DisplayButtonGroup />
        <M.TextDiv size="xs" color="text2" style={{ textAlign: 'right' }}>
          <M.Row gap="0.5em" as="label">
            <input
              type="checkbox"
              checked={!userHideClosedPositions}
              onChange={(event) => setUserHideClosedPositions(!event.target.checked)}
            />
            <Trans>Show closed positions</Trans>
          </M.Row>
        </M.TextDiv>
      </M.Row>
    </M.RowBetween>
  )
})
