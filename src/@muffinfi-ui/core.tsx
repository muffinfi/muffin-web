import { Link as RouterLink } from 'react-router-dom'
import styled, { css } from 'styled-components/macro'

//////////////////// TYPOGRAPHY ////////////////////

interface TextProps {
  // common styles
  size?: string
  weight?: string
  color?: string

  // for text overflow
  nowrap?: boolean
  ellipsis?: boolean

  // for long text form
  paragraphLineHeight?: boolean
  align?: string
}

const textMixin = css<TextProps>`
  font-size: ${({ size }) => size && `var(--text-${size})`};
  font-weight: ${({ weight }) => weight && `var(--${weight})`};
  color: ${({ color }) => color && `var(--${color})`};

  ${({ nowrap }) => nowrap && `white-space: nowrap;`}
  ${({ ellipsis }) =>
    ellipsis &&
    css`
      overflow: hidden;
      text-overflow: ellipsis;
    `}

  text-align: ${({ align }) => align};
  ${({ paragraphLineHeight }) => paragraphLineHeight && `line-height: 1.5;`}
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

//////////////////// LINK ////////////////////

interface LinkProps extends TextProps {
  hoverColor?: string
}

const linkMixin = css<LinkProps>`
  transition: color 150ms;
  &:hover {
    color: ${({ hoverColor }) => hoverColor && `var(--${hoverColor})`};
  }

  &[role='button'] {
    user-select: none;
  }
`

export const Anchor = styled.a<LinkProps>`
  color: inherit;
  ${textMixin}
  ${linkMixin}
`

export const Link = styled(RouterLink)<LinkProps>`
  color: inherit;
  ${textMixin}
  ${linkMixin}
`

//////////////////// LAYOUT ////////////////////

interface RowProps {
  gap?: string
  wrap?: string
  columnGap?: string
  rowGap?: string

  justifyEnd?: boolean
}

export const Row = styled.div<RowProps>`
  display: flex;
  flex-direction: row;
  align-items: center;
  flex-wrap: ${({ wrap }) => wrap};
  gap: ${({ gap }) => gap};
  column-gap: ${({ columnGap }) => columnGap};
  row-gap: ${({ rowGap }) => rowGap};

  ${({ justifyEnd }) => justifyEnd && 'justify-content: flex-end;'}
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

interface GridProps {
  column?: number
  columnGap?: string
  rowGap?: string
  alignItems?: string
}

export const Grid = styled.div<GridProps>`
  display: grid;
  grid-template-columns: ${({ column }) => (column ? `repeat(${column}, max-content)` : null)};
  column-gap: ${({ columnGap }) => columnGap};
  row-gap: ${({ rowGap }) => rowGap};

  align-items: ${({ alignItems }) => alignItems ?? 'start'};
  justify-items: start;
`
