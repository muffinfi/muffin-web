import { Link } from 'react-router-dom'
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

type RowProps = {
  gap?: string
  wrap?: string
  columnGap?: string
  rowGap?: string
}

export const Row = styled.div<RowProps>`
  display: flex;
  flex-direction: row;
  align-items: center;
  flex-wrap: ${({ wrap }) => wrap};

  gap: ${({ gap }) => gap};
  column-gap: ${({ columnGap }) => columnGap};
  row-gap: ${({ rowGap }) => rowGap};
`

export const RowBetween = styled(Row)`
  justify-content: space-between;
`

export const Column = styled.div<{ gap?: string; stretch?: boolean }>`
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: ${({ gap }) => gap};

  ${({ stretch }) => (stretch ? 'align-items: stretch;' : '')}
`

export const ColumnCenter = styled(Column)`
  align-items: center;
`

//////////////////// Link ////////////////////

export const RawLink = styled(Link)`
  width: fit-content;
  cursor: pointer;
  text-decoration: none;
  color: inherit;
  transition: color 150ms;

  :hover,
  :active {
    text-decoration: none;
    color: inherit;
  }
`

//////////////////// Page Layout ////////////////////

export const PageTitleRow = styled(Row).attrs({ wrap: 'wrap', gap: '16px' })`
  justify-content: space-between;
`

export const PageBackLink = styled(RawLink)`
  margin-bottom: 32px;
  font-weight: var(--fw-semibold);
  color: ${({ theme }) => theme.text3};
  :hover {
    color: ${({ theme }) => theme.text2};
  }
`
