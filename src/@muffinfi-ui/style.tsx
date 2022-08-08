import { darken, lighten, transparentize } from 'polished'
import { createGlobalStyle, css } from 'styled-components/macro'

const lightThemeMixin = css`
  /* color */
  --bg: #f6f6f6;
  --layer1: #fff;
  --layer2: #f6f6f6;
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
  --tertiary-disabled: ${transparentize(0.5, darken(0.08, '#ececec'))};
  --tertiary-disabled-text: ${transparentize(0.5, '#111')};

  --disabled: #ececec;
  --disabled-text: #aaa;

  --badge-bg: #ececec;
  --badge-text: #717171;

  --error-bg: #da2d2b;
  --error-text: #fff;
  --error-disabled: ${transparentize(0.5, '#da2d2b')};
  --error-disabled-text: ${transparentize(0.3, '#fff')};

  --alert: #e3a507;
  --alert-text: #d39000;

  /* color */
  --green: #007d35;
  --success: #007d35;
  --error: #da2d2b;
`

const darkThemeMixin = css`
  /* color */
  --bg: #141414;
  --layer1: #222222;
  --layer2: #1a1a1a;
  --layer3: #333;

  /* border */
  --borderColor: #404040;
  --borderColor1: ${lighten(0.12, '#404040')};

  /* text color */
  --text1: #fff;
  --text2: #888;
  --placeholder-text: #484848;

  /* button color */
  --primary0: #d23a25;
  --primary1: ${darken(0.06, '#D23A25')};
  --primary2: ${darken(0.12, '#D23A25')};
  --primary-text: #fff;

  --secondary0: #4e2318;
  --secondary1: #5c2517;
  --secondary2: #6e2816;
  --secondary-text: #f9381f;

  --tertiary0: #333;
  --tertiary1: ${lighten(0.04, '#333')};
  --tertiary2: ${lighten(0.08, '#333')};
  --tertiary-text: #fff;
  --tertiary-disabled: ${transparentize(0.5, darken(0.08, '#333'))};
  --tertiary-disabled-text: ${transparentize(0.5, '#fff')};

  --disabled: #333;
  --disabled-text: #666;

  --badge-bg: #333;
  --badge-text: #888;

  --error-bg: #ff3333;
  --error-text: #fff;
  --error-disabled: ${transparentize(0.5, '#ff3333')};
  --error-disabled-text: ${transparentize(0.5, '#fff')};

  --alert: #e3a507;
  --alert-text: #d39000;

  /* color */
  --green: #27ae60;
  --success: #27ae60;
  --error: #ff3333;
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

  input[type=checkbox] {
    accent-color: var(--text2);
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

export const NoTransition = createGlobalStyle<{ enabled: boolean }>`
  ${({ enabled }) => enabled && '* {transition: none !important;}'}
`
