import styled, { css } from 'styled-components/macro'

const BaseButton = styled.button`
  display: flex;
  justify-content: center;
  align-items: center;
  flex-direction: row;
  flex-wrap: nowrap;

  /* base style */
  border: 1px solid transparent;
  transition: background-color 150ms, color 150ms, border-color 150ms;
  font-weight: var(--semibold);

  &:disabled {
    color: var(--disabled-text) !important;
    background: var(--disabled) !important;
  }

  /* commonly changeable style */
  width: fit-content;
  padding: 6px 12px;
  border-radius: 8px;

  color: var(--btn-text);
  background: var(--btn-bg);
  &:hover {
    background: var(--btn-bgHover);
  }
  &:active {
    background: var(--btn-bgActive);
  }
`

export const buttonMixins = {
  color: {
    primary: css`
      --btn-bg: var(--primary0);
      --btn-bgHover: var(--primary1);
      --btn-bgActive: var(--primary2);
      --btn-text: var(--primary-text);
    `,
    secondary: css`
      --btn-bg: var(--secondary0);
      --btn-bgHover: var(--secondary1);
      --btn-bgActive: var(--secondary2);
      --btn-text: var(--secondary-text);
    `,
    tertiary: css`
      --btn-bg: var(--tertiary0);
      --btn-bgHover: var(--tertiary1);
      --btn-bgActive: var(--tertiary2);
      --btn-text: var(--tertiary-text);
      &:disabled {
        background: var(--tertiary-disabled) !important;
        color: var(--tertiary-disabled-text) !important;
      }
    `,
    error: css`
      --btn-bg: var(--error-bg);
      --btn-bgHover: var(--error-bg);
      --btn-bgActive: var(--error-bg);
      --btn-text: var(--error-text);
      &:disabled {
        background: var(--error-disabled) !important;
        color: var(--error-disabled-text) !important;
      }
    `,
    outline: css`
      --btn-bg: var(--layer1);
      --btn-bgHover: var(--layer1);
      --btn-bgActive: var(--layer1);
      --btn-text: var(--text1);
      border: 1px solid var(--borderColor);
      &:hover {
        border-color: var(--borderColor1);
      }
    `,
  },
  size: {
    row: css`
      width: 100%;
      padding: 16px;
      border-radius: 16px;
    `,
    badge: css`
      padding: 0.167em 0.333em;
      border-radius: 0.4em;
      font-size: var(--text-xs);
      font-weight: var(--semibold);
    `,
    xs: css`
      font-size: var(--text-xs);
      font-weight: var(--medium);
      padding: 8px 10px;
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

export const ButtonRow = styled(Button)`
  ${buttonMixins.size.row}
`

export const ButtonRowPrimary = styled(Button)`
  ${buttonMixins.color.primary}
  ${buttonMixins.size.row}
`

export const ButtonRowSecondary = styled(Button)`
  ${buttonMixins.color.secondary}
  ${buttonMixins.size.row}
`
