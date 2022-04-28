import styled, { css } from 'styled-components/macro'
import { Column, Row, Text } from './misc'

export const Container = styled.div<{ maxWidth: string }>`
  max-width: ${({ maxWidth }) => maxWidth};
  width: 100%;
  margin: auto;
  margin-top: 1rem;
  margin-bottom: 72px;
`

export const SectionCard = styled.div<{ greedyMargin?: boolean }>`
  border-radius: 16px;
  padding: 1.1rem;
  margin: ${({ greedyMargin }) => greedyMargin && '0 -1.1rem'};
  background-color: var(--layer1);
  /* border: 1px solid rgba(0, 0, 0, 0.06); */
  /* box-shadow: 0px 0px 1px rgba(0, 0, 0, 0.01), 0px 4px 8px rgba(0, 0, 0, 0.04); */

  @media (max-width: 500px) {
    padding: 1rem;
    margin: ${({ greedyMargin }) => greedyMargin && '0 -0.333rem'};
  }
`

/////////

export const Toggle = styled(Row).attrs({ role: 'button' })<{ $variant?: string }>`
  display: inline-flex;
  width: max-content;
  padding: 4px;
  gap: 3px;
  border-radius: 0.85em;
  cursor: pointer;
  user-select: none;

  color: var(--text2);
  :hover {
    color: var(--text1);
  }

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
`

export const ToggleElement = styled(Row)<{ $active?: boolean }>`
  border-radius: 0.71em;
  padding: 0.5em 0.7em;
  transition: color 150ms, background-color 150ms;
  background: ${({ $active }) => ($active ? 'var(--toggle-active-bg)' : 'rgba(255,255,255,0)')};
  color: ${({ $active }) => ($active ? 'var(--toggle-active-color)' : 'inherit')};
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
