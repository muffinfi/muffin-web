import { darken } from 'polished'
import { css, createGlobalStyle } from 'styled-components/macro'

const lightThemeMixin = css`
  /* color */
  --bg: #f8f8f8;
  --layer1: #fff;
  --layer2: #f8f8f8;
  --layer3: #ececec;

  /* border */
  --borderColor: #ececec;

  /* text color */
  --text1: #171717;
  --text2: #717171;

  /* button color */
  --primary0: #f95f04;
  --primary1: ${darken(0.03, '#F95F04')};
  --primary2: ${darken(0.06, '#F95F04')};
  --primary-text: #fff;

  --secondary0: #fde7da;
  --secondary1: ${darken(0.03, '#fde7da')};
  --secondary2: ${darken(0.06, '#fde7da')};
  --secondary-text: #f95f04;

  --tertiary0: #ececec;
  --tertiary1: ${darken(0.03, '#ececec')};
  --tertiary2: ${darken(0.06, '#ececec')};
  --tertiary-text: #171717;

  --disabled: #999999;
  --disabled-text: #717171;

  --badge-bg: #ececec;
  --badge-text: #717171;
`

const darkThemeMixin = css`
  /* color */
  --bg: #1d1d1d;
  --layer1: #2c2c2c;
  --layer2: #222222;
  --layer3: #404040;

  /* border */
  --borderColor: #404040;

  /* text color */
  --text1: #fff;
  --text2: #999;

  /* button color */
  --primary0: #ce5212;
  --primary1: ${darken(0.03, '#CE5212')};
  --primary2: ${darken(0.06, '#CE5212')};
  --primary-text: #fff;

  --secondary0: #fde7da;
  --secondary1: ${darken(0.03, '#fde7da')};
  --secondary2: ${darken(0.06, '#fde7da')};
  --secondary-text: #f95f04;

  --tertiary0: ##404040;
  --tertiary1: ${darken(0.03, '#404040')};
  --tertiary2: ${darken(0.06, '#404040')};
  --tertiary-text: #fff;

  --disabled: #999999;
  --disabled-text: #999;

  --badge-bg: #404040;
  --badge-text: #999;
`

export const GlobalStyle = createGlobalStyle`
  /* reset */
  html {
    font-size: 16px;
    background-color: var(--bg);
    color: var(--text1);
  }

  html,
  body {
    margin: 0;
    padding: 0;
  }

  a {
    cursor: pointer;
    text-decoration: none;
    color: inherit;
  }


  button {
    font-size: 1rem;
    appearance: none;
    text-decoration: none;
    outline: none;
    box-shadow: none;
    cursor: pointer;
    margin: 0;
    padding: 0;
    height: auto;
    user-select: none;
    text-align: center;
    &:disabled {
      pointer-events: auto;
      cursor: not-allowed;
    }
  }

  table {
    width: 100%;
    text-indent: 0;
    border-color: inherit;
    border-collapse: collapse;
    table-layout: auto;
  }

  th,
  td {
    padding: 0;
    width: auto;
    font-weight: inherit;
  }

  :root {
    ${({ theme }) => (theme.darkMode ? darkThemeMixin : lightThemeMixin)}

    /* font size */
    --text-xs: 0.75rem; /*    12px */
    --text-sm: 0.875rem; /*   14px */
    --text-base: 1rem; /*     16px */
    --text-lg: 1.125rem; /*   18px */
    --text-xl: 1.3125rem; /*  21px */
    --text-2xl: 1.5rem; /*    24px */
    --text-3xl: 1.75rem; /*   28px */

    /* font weight */
    --bold: 700;
    --semibold: 600;
    --medium: 500;
    --regular: 400;
  }
`
