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
  --borderColor1: ${darken(0.12, '#ececec')};

  /* text color */
  --text1: #111;
  --text2: #717171;
  --placeholder-text: #c0c0c0;

  /* button color */
  --primary0: #f95f04;
  --primary1: ${darken(0.04, '#F95F04')};
  --primary2: ${darken(0.08, '#F95F04')};
  --primary-text: #fff;

  --secondary0: #fde7da;
  --secondary1: ${darken(0.04, '#fde7da')};
  --secondary2: ${darken(0.08, '#fde7da')};
  --secondary-text: #f95f04;

  --tertiary0: #ececec;
  --tertiary1: ${darken(0.04, '#ececec')};
  --tertiary2: ${darken(0.08, '#ececec')};
  --tertiary-text: #111;

  --disabled: #ececec;
  --disabled-text: #aaa;

  --badge-bg: #ececec;
  --badge-text: #717171;

  --error-bg: #da2d2b;
  --error-text: #fff;

  /* color */
  --green: #007d35;
  --success: #007d35;
`

const darkThemeMixin = css`
  /* color */
  --bg: #1d1d1d;
  --layer1: #2c2c2c;
  --layer2: #222222;
  --layer3: #404040;

  /* border */
  --borderColor: #404040;
  --borderColor1: ${darken(0.12, '#404040')};

  /* text color */
  --text1: #fff;
  --text2: #aaa;
  --placeholder-text: #999;

  /* button color */
  --primary0: #ce5212;
  --primary1: ${darken(0.04, '#CE5212')};
  --primary2: ${darken(0.08, '#CE5212')};
  --primary-text: #fff;

  --secondary0: #fde7da;
  --secondary1: ${darken(0.04, '#fde7da')};
  --secondary2: ${darken(0.08, '#fde7da')};
  --secondary-text: #f95f04;

  --tertiary0: ##404040;
  --tertiary1: ${darken(0.04, '#404040')};
  --tertiary2: ${darken(0.08, '#404040')};
  --tertiary-text: #fff;

  --disabled: #404040;
  --disabled-text: #666;

  --badge-bg: #404040;
  --badge-text: #999;

  --error-bg: #ff4343;
  --error-text: #fff;

  /* color */
  --green: #27ae60;
  --success: #27ae60;
`

// FIXME: put reset css to index.html directly

export const GlobalStyle = createGlobalStyle<{ darkMode: boolean }>`
  /* ========== reset ========== */

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

  /* ========== css variables ========== */

  :root {
    ${({ darkMode }) => (darkMode ? darkThemeMixin : lightThemeMixin)}

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
