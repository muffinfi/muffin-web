import { darken } from 'polished'
import styled from 'styled-components/macro'

//////////////////// TYPOGRAPHY ////////////////////

export const H1 = styled.h1`
  font-size: 22px;
  font-weight: var(--fw-bold);
  color: var(--text1);
  margin: 0;
  padding: 0;
`

//////////////////// LAYOUT ////////////////////

export const Row = styled.div<{ gap?: string; wrap?: string }>`
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: ${({ gap }) => gap};
  flex-wrap: ${({ wrap }) => wrap};
`

export const Column = styled.div<{ gap?: string }>`
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: ${({ gap }) => gap};
`

export const PageTitleRow = styled(Row).attrs({ wrap: 'wrap', gap: '16px' })`
  justify-content: space-between;
`

//////////////////// Button ////////////////////

const BaseButton = styled.button`
  /* reset */
  appearance: none;
  text-decoration: none;
  outline: none;
  cursor: pointer;
  margin: 0;
  height: auto;
  > * {
    user-select: none;
  }
  > a {
    text-decoration: none;
  }

  /* display */
  display: flex;
  justify-content: center;
  align-items: center;
  flex-direction: row;
  flex-wrap: nowrap;
  position: relative;
  z-index: 1;

  /* base style */
  border: 1px solid transparent;
  transition: background-color 100ms;
  text-align: center;
  font-weight: var(--fw-bold);
  &:disabled {
    pointer-events: none;
    cursor: auto;
  }

  /* commonly changeable style */
  width: fit-content;
  font-size: 1rem;
  padding: 6px 12px;
  border-radius: 8px;
`

export const ButtonPrimary = styled(BaseButton)`
  --bg: ${({ theme }) => theme.primary1};
  --bgFocus: ${({ theme }) => darken(0.05, theme.primary1)};
  --bgActive: ${({ theme }) => darken(0.1, theme.primary1)};

  color: #fff;
  background: var(--bg);

  &:hover,
  &:focus {
    background: var(--bgFocus);
  }
  &:active {
    background: var(--bgActive);
  }
  &:disabled {
    opacity: 0.5;
  }
`
