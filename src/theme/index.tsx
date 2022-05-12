import { GlobalStyle, NoTransition } from '@muffinfi-ui/style'
import React, { useEffect, useMemo, useRef, useState } from 'react'
import { Text, TextProps as TextPropsOriginal } from 'rebass'
import styled, { css, DefaultTheme, ThemeProvider as StyledComponentsThemeProvider } from 'styled-components/macro'

import { useIsDarkMode } from '../state/user/hooks'
import { Colors } from './styled'

export * from './components'

type TextProps = Omit<TextPropsOriginal, 'css'>

export const MEDIA_WIDTHS = {
  upToExtraSmall: 500,
  upToSmall: 720,
  upToMedium: 960,
  upToLarge: 1280,
}

// Migrating to a standard z-index system https://getbootstrap.com/docs/5.0/layout/z-index/
// Please avoid using deprecated numbers
export enum Z_INDEX {
  deprecated_zero = 0,
  deprecated_content = 1,
  dropdown = 1000,
  sticky = 1020,
  fixed = 1030,
  modalBackdrop = 1040,
  offcanvas = 1050,
  modal = 1060,
  popover = 1070,
  tooltip = 1080,
}

const mediaWidthTemplates: { [width in keyof typeof MEDIA_WIDTHS]: typeof css } = Object.keys(MEDIA_WIDTHS).reduce(
  (accumulator, size) => {
    ;(accumulator as any)[size] = (a: any, b: any, c: any) => css`
      @media (max-width: ${(MEDIA_WIDTHS as any)[size]}px) {
        ${css(a, b, c)}
      }
    `
    return accumulator
  },
  {}
) as any

const white = '#FFFFFF'
const black = '#000000'

function colors(darkMode: boolean): Colors {
  return {
    darkMode,
    // base
    white,
    black,

    // text
    text1: darkMode ? '#FFFFFF' : '#111111',
    text2: darkMode ? '#888888' : '#717171',
    text3: darkMode ? '#444444' : '#909090',
    text4: darkMode ? '#333333' : '#C0C0C0',
    text5: darkMode ? '#2C2C2C' : '#EEEEEE', // not using

    // backgrounds / greys
    bg0: darkMode ? '#181818' : '#FFF',
    bg1: darkMode ? '#242424' : '#F8F8F8',
    bg2: darkMode ? '#333333' : '#EEEEEE',
    bg3: darkMode ? '#404040' : '#CCCCCC',
    bg4: darkMode ? '#565656' : '#AAAAAA',
    bg5: darkMode ? '#6C6C6C' : '#989898',
    bg6: darkMode ? '#1A1A1A' : '#818181', // not using

    //specialty colors
    modalBG: darkMode ? 'rgba(0,0,0,.425)' : 'rgba(0,0,0,0.3)',
    advancedBG: darkMode ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.6)',

    //primary colors
    primary1: darkMode ? '#d23a25' : '#F95F04',
    primary2: darkMode ? '#b83320' : '#F95F0470', // not using
    primary3: darkMode ? '#b83320' : '#F95F0470',
    primary4: darkMode ? '#b8332070' : '#F95F0440',
    primary5: darkMode ? '#b8332070' : '#F95F0440',

    // color text
    primaryText1: darkMode ? '#d23a25' : '#d05006',

    // secondary colors
    secondary1: darkMode ? '#d23a25' : '#F95F04',
    secondary2: darkMode ? '#3f2119' : '#f6e5dd',
    secondary3: darkMode ? '#3f2119' : '#f6e5dd',

    // other
    red1: darkMode ? '#FF4343' : '#DA2D2B',
    red2: darkMode ? '#F82D3A' : '#DF1F38',
    red3: '#D60000',
    green1: darkMode ? '#27AE60' : '#007D35',
    yellow1: '#E3A507',
    yellow2: '#FF8F00',
    yellow3: '#F3B71E',
    blue1: darkMode ? '#2172E5' : '#0068FC',
    blue2: darkMode ? '#5199FF' : '#0068FC',
    error: darkMode ? '#FD4040' : '#DF1F38',
    success: darkMode ? '#27AE60' : '#007D35',
    warning: '#FF8F00',

    // dont wanna forget these blue yet
    blue4: darkMode ? '#153d6f70' : '#C4D9F8',
    // blue5: darkMode ? '#153d6f70' : '#EBF4FF',
  }
}

function theme(darkMode: boolean): DefaultTheme {
  return {
    ...colors(darkMode),

    grids: {
      sm: 8,
      md: 12,
      lg: 24,
    },

    //shadows
    shadow1: darkMode ? '#000' : '#2F80ED',

    // media queries
    mediaWidth: mediaWidthTemplates,

    // css snippets
    flexColumnNoWrap: css`
      display: flex;
      flex-flow: column nowrap;
    `,
    flexRowNoWrap: css`
      display: flex;
      flex-flow: row nowrap;
    `,
  }
}

/**
 * Disable all css transitions before allowing darkMode to be changed.
 * This is to avoid awkward transition animation when changing dark/light mode.
 */
const useDarkModeNoTransition = () => {
  const darkMode = useIsDarkMode()
  const [darkModeDelayed, setDarkModeDelayed] = useState(darkMode)
  const [noTransition, setNoTransition] = useState(false)
  const timeoutId = useRef<ReturnType<typeof setTimeout>>()

  useEffect(() => {
    const timeout = (fn: () => void) => {
      if (timeoutId.current) clearTimeout(timeoutId.current)
      timeoutId.current = setTimeout(fn, 0)
    }
    if (noTransition === false && darkMode !== darkModeDelayed) {
      timeout(() => setNoTransition(true))
    } else if (noTransition === true && darkMode !== darkModeDelayed) {
      timeout(() => setDarkModeDelayed(darkMode))
    } else if (noTransition === true && darkMode === darkModeDelayed) {
      timeout(() => setNoTransition(false))
    }
  }, [noTransition, darkMode, darkModeDelayed])

  return [darkModeDelayed, noTransition]
}

export default function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [darkMode, noTransition] = useDarkModeNoTransition()

  const themeObject = useMemo(() => theme(darkMode), [darkMode])

  return (
    <StyledComponentsThemeProvider theme={themeObject}>
      <GlobalStyle darkMode={darkMode} />
      <NoTransition enabled={noTransition} />
      {children}
    </StyledComponentsThemeProvider>
  )
}

const TextWrapper = styled(Text)<{ color: keyof Colors }>`
  color: ${({ color, theme }) => (theme as any)[color]};
`

/**
 * Preset styles of the Rebass Text component
 */
export const ThemedText = {
  Main(props: TextProps) {
    return <TextWrapper fontWeight={500} color={'text2'} {...props} />
  },
  Link(props: TextProps) {
    return <TextWrapper fontWeight={500} color={'primary1'} {...props} />
  },
  Label(props: TextProps) {
    return <TextWrapper fontWeight={600} color={'text1'} {...props} />
  },
  Black(props: TextProps) {
    return <TextWrapper fontWeight={500} color={'text1'} {...props} />
  },
  White(props: TextProps) {
    return <TextWrapper fontWeight={500} color={'white'} {...props} />
  },
  Body(props: TextProps) {
    return <TextWrapper fontWeight={400} fontSize={16} color={'text1'} {...props} />
  },
  LargeHeader(props: TextProps) {
    return <TextWrapper fontWeight={600} fontSize={24} {...props} />
  },
  MediumHeader(props: TextProps) {
    return <TextWrapper fontWeight={500} fontSize={20} {...props} />
  },
  SubHeader(props: TextProps) {
    return <TextWrapper fontWeight={400} fontSize={14} {...props} />
  },
  Small(props: TextProps) {
    return <TextWrapper fontWeight={500} fontSize={11} {...props} />
  },
  Blue(props: TextProps) {
    return <TextWrapper fontWeight={500} color={'blue1'} {...props} />
  },
  Yellow(props: TextProps) {
    return <TextWrapper fontWeight={500} color={'yellow3'} {...props} />
  },
  DarkGray(props: TextProps) {
    return <TextWrapper fontWeight={500} color={'text3'} {...props} />
  },
  Gray(props: TextProps) {
    return <TextWrapper fontWeight={500} color={'bg3'} {...props} />
  },
  Italic(props: TextProps) {
    return <TextWrapper fontWeight={500} fontSize={12} fontStyle={'italic'} color={'text2'} {...props} />
  },
  Error({ error, ...props }: { error: boolean } & TextProps) {
    return <TextWrapper fontWeight={500} color={error ? 'red1' : 'text2'} {...props} />
  },
}
