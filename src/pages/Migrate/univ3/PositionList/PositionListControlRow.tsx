import { Trans } from '@lingui/macro'
import * as M from '@muffinfi-ui'
import { ReactComponent as BarsIcon } from 'assets/images/list-bars.svg'
import { ReactComponent as GroupIcon } from 'assets/images/list-group.svg'
import { MouseoverTooltipText } from 'components/Tooltip'
import { atom, useAtom } from 'jotai'
import { memo } from 'react'
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

export default memo(function PositionListControlRow() {
  const [listDisplay, setListDisplay] = useAtom(listDisplayAtom)
  return (
    <M.RowBetween style={{ marginTop: -28, marginBottom: 4 }}>
      <span></span>
      <M.Row gap="16px">
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
      </M.Row>
    </M.RowBetween>
  )
})
