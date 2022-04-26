import { Link as RouterLink } from 'react-router-dom'
import styled, { css } from 'styled-components/macro'

//////////////////// TYPOGRAPHY ////////////////////

interface TextProps {
  size?: string
  weight?: string
  color?: string
}

const textMixin = css<TextProps>`
  font-size: ${({ size }) => size && `var(--text-${size})`};
  font-weight: ${({ weight }) => weight && `var(--${weight})`};
  color: ${({ color }) => color && `var(--${color})`};
`

export const Text = styled.span<TextProps>`
  ${textMixin}
`

export const TextDiv = styled.div<TextProps>`
  ${textMixin}
`

export const TextContents = styled.div<TextProps>`
  display: contents;
  ${textMixin}
`

export const Anchor = styled.a<TextProps>`
  color: inherit;
  ${textMixin}
`

export const Link = styled(RouterLink)<TextProps>`
  color: inherit;
  ${textMixin}
`

//////////////////// LAYOUT ////////////////////

interface RowProps {
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
  align-items: ${({ stretch }) => (stretch ? 'stretch' : 'flex-start')};
  gap: ${({ gap }) => gap};
`

export const ColumnCenter = styled(Column)`
  align-items: center;
`

//////////////////// GRID TABLE ////////////////////

interface GridTableProps {
  column: number
  columnGap?: string
  rowGap?: string
  alignItems?: string
}

export const GridTable = styled.div<GridTableProps>`
  display: grid;
  grid-template-columns: ${({ column }) => `repeat(${column}, max-content)`};
  column-gap: ${({ columnGap }) => columnGap};
  row-gap: ${({ rowGap }) => rowGap};

  align-items: ${({ alignItems }) => alignItems ?? 'start'};
  justify-items: start;
`
