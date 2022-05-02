import { Trans } from '@lingui/macro'
import { ReactNode } from 'react'
import styled, { css } from 'styled-components/macro'

const activeOnMixin = css`
  color: #fff;
  background: var(--primary0);
`

const activeOffMixin = css`
  color: #fff;
  background: var(--text2);
`

const inactiveMixin = css`
  color: var(--text2);
  background: rgba(255, 255, 255, 0);
  :hover {
    color: var(--text1);
  }
`

const ToggleElement = styled.span<{ isActive?: boolean; isOnSwitch?: boolean }>`
  font-size: 14px;
  font-weight: 500;
  padding: 0.25rem 0.6rem;
  border-radius: 9px;

  ${({ isActive, isOnSwitch }) => {
    if (!isActive) return inactiveMixin
    if (isOnSwitch) return activeOnMixin
    return activeOffMixin
  }}
`

const StyledToggle = styled.button<{ isActive?: boolean; activeElement?: boolean }>`
  border-radius: 12px;
  border: none;
  background: ${({ theme }) => theme.bg0};
  display: flex;
  width: fit-content;
  cursor: pointer;
  outline: none;
  padding: 2px;
  column-gap: 2px;
`

interface ToggleProps {
  id?: string
  isActive: boolean
  toggle: () => void
  checked?: ReactNode
  unchecked?: ReactNode
}

export default function Toggle({
  id,
  isActive,
  toggle,
  checked = <Trans>On</Trans>,
  unchecked = <Trans>Off</Trans>,
}: ToggleProps) {
  return (
    <StyledToggle id={id} isActive={isActive} onClick={toggle}>
      <ToggleElement isActive={isActive} isOnSwitch={true}>
        {checked}
      </ToggleElement>
      <ToggleElement isActive={!isActive} isOnSwitch={false}>
        {unchecked}
      </ToggleElement>
    </StyledToggle>
  )
}
