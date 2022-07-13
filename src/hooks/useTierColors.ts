import { useMemo } from 'react'

import useTheme from './useTheme'

export default function useTierColors() {
  const theme = useTheme()
  return useMemo(
    () => [
      '#4F79A7', // theme.blue2,
      theme.yellow1,
      theme.red1,
      theme.green1,
      theme.yellow2,
      theme.red2,
    ],
    [theme]
  )
}
