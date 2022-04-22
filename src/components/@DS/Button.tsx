import { darken } from 'polished'
import styled, { css } from 'styled-components/macro'

const BaseButton = styled.button`
  /* normalize */
  appearance: none;
  text-decoration: none;
  outline: none;
  box-shadow: none;
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
  transition: background-color 150ms;
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

  color: var(--btnText);
  background: var(--btnBg);
  &:hover {
    background: var(--btnBgHover);
  }
  &:active {
    background: var(--btnBgActive);
  }
  &:disabled {
    background: var(--bg2);
    color: var(--text3);
  }
`

// export const ButtonPrimary = styled(BaseButton)`
//   --btnText: #fff;
//   --btnBg: ${({ theme }) => theme.primary1};
//   --btnBgHover: ${({ theme }) => darken(0.05, theme.primary1)};
//   --btnBgActive: ${({ theme }) => darken(0.1, theme.primary1)};
// `

// export const ButtonSecondary = styled(BaseButton)`
//   --btnText: var(--text1);
//   --btnBg: ${({ theme }) => theme.bg2};
//   --btnBgHover: ${({ theme }) => darken(0.05, theme.bg2)};
//   --btnBgActive: ${({ theme }) => darken(0.1, theme.bg2)};
// `

const buttonMixins = {
  color: {
    primary: css`
      --btnText: #fff;
      --btnBg: ${({ theme }) => theme.primary1};
      --btnBgHover: ${({ theme }) => darken(0.04, theme.primary1)};
      --btnBgActive: ${({ theme }) => darken(0.08, theme.primary1)};
    `,
    secondary: css`
      --btnText: ${({ theme }) => theme.primary1};
      --btnBg: ${({ theme }) => '#FDE7DA'};
      --btnBgHover: ${({ theme }) => darken(0.04, '#FDE7DA')};
      --btnBgActive: ${({ theme }) => darken(0.08, '#FDE7DA')};
    `,
    tertiary: css`
      --btnText: var(--text1);
      --btnBg: ${({ theme }) => theme.bg2};
      --btnBgHover: ${({ theme }) => darken(0.04, theme.bg2)};
      --btnBgActive: ${({ theme }) => darken(0.08, theme.bg2)};
    `,
  },
  size: {
    small: css`
      padding: 4px 8px;
    `,
    row: css`
      width: 100%;
      padding: 16px;
      border-radius: 16px;
    `,
  },
}

interface ButtonProps {
  color?: keyof typeof buttonMixins.color
  size?: keyof typeof buttonMixins.size
}

export const Button = styled(BaseButton)<ButtonProps>`
  ${({ color }) => color && buttonMixins.color[color]}
  ${({ size }) => size && buttonMixins.size[size]}
`

export const ButtonPrimary = styled(Button)`
  ${buttonMixins.color.primary}
`

export const ButtonSecondary = styled(Button)`
  ${buttonMixins.color.secondary}
`

export const ButtonRowPrimary = styled(Button)`
  ${buttonMixins.color.primary}
  ${buttonMixins.size.row}
`
