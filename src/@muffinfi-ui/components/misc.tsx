import { NavLink as RouterNavLink, NavLinkProps as RouterNavLinkProps } from 'react-router-dom'
import styled, { css } from 'styled-components/macro'
import { handleClickExternalLink } from 'utils/handleClickExternalLink'

import { Anchor, Column, Link, Row, Text } from '../core'

export const ExternalLink = styled(Anchor).attrs({
  target: '_blank',
  rel: 'noopener noreferrer',
  onClick: handleClickExternalLink,
})``

/////////

export const NavLink = styled(Link).attrs({
  as: RouterNavLink,
  activeClassName: 'ACTIVE',
})<{ $activeColor?: string; $activeWeight?: string } & RouterNavLinkProps>`
  &.ACTIVE {
    font-weight: ${({ $activeWeight }) => $activeWeight && `var(--${$activeWeight})`};
    color: ${({ $activeColor }) => $activeColor && `var(--${$activeColor})`};
  }
`

/////////

export const Container = styled.div<{ maxWidth: string }>`
  max-width: ${({ maxWidth }) => maxWidth};
  width: 100%;
  margin: auto;
  margin-top: 1rem;
  margin-bottom: 72px;
`

export const SectionCard = styled.div<{ greedyMargin?: boolean; padding?: string }>`
  border-radius: 16px;
  padding: ${({ padding, greedyMargin }) => (greedyMargin ? null : padding) ?? '1.1rem'};
  margin: ${({ greedyMargin }) => greedyMargin && '0 -1.1rem'};
  background-color: var(--layer1);

  box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.02), 0 4px 6px -4px rgba(0, 0, 0, 0.02);

  @media (max-width: 500px) {
    padding: 1rem;
    margin: ${({ greedyMargin }) => greedyMargin && '0 -0.333rem'};
  }
`

/////////

export const ToggleElement = styled(Row)<{ $active?: boolean }>`
  border-radius: 0.71em;
  padding: 0.5em 0.7em;
  transition: color 100ms, background-color 100ms;
  background: ${({ $active }) => ($active ? 'var(--toggle-active-bg)' : 'rgba(255,255,255,0)')};
  color: ${({ $active }) => ($active ? 'var(--toggle-active-color)' : 'inherit')};

  :hover {
    color: ${({ $active }) => ($active ? undefined : 'var(--text1)')};
  }
`

export const Toggle = styled(Row).attrs({ role: 'button' })<{ $variant?: string; $size?: string }>`
  display: inline-flex;
  width: max-content;
  padding: 4px;
  gap: 3px;
  border-radius: 0.85em;
  cursor: pointer;
  user-select: none;

  color: var(--text2);
  /* :hover {
    color: var(--text1);
  } */

  ${({ $variant }) =>
    $variant === 'primary'
      ? css`
          background: var(--layer2);
          --toggle-active-bg: var(--primary0);
          --toggle-active-color: var(--primary-text);
        `
      : css`
          background: var(--badge-bg);
          --toggle-active-bg: var(--layer1);
          --toggle-active-color: var(--text1);
        `}

  ${({ $size }) =>
    $size === 'sm'
      ? css`
          padding: 3px;
          gap: 5px;

          ${ToggleElement} {
            padding: 0.3em 0.5em;
            border-radius: 0.65em;
          }
        `
      : null}
`

/////////

export const DataGroup = styled(Column).attrs({
  gap: '8px',
})``

export const DataLabel = styled(Text).attrs({
  size: 'sm',
  color: 'text2',
  weight: 'regular',
})``

export const DataValue = styled(Text).attrs({
  size: 'base',
  color: 'text1',
  weight: 'medium',
})``
