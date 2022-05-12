import { useWindowSize } from 'hooks/useWindowSize'
import { ReactNode } from 'react'
import { Box } from 'rebass'
import styled from 'styled-components/macro'

import { MEDIA_WIDTHS } from '../../theme'

export const DesktopOnlyBox = styled(Box)`
  @media screen and (max-width: ${MEDIA_WIDTHS.upToSmall - 1}px) {
    display: none;
  }
`

export const MobileOnlyBox = styled(Box)`
  @media screen and (min-width: ${MEDIA_WIDTHS.upToSmall}px) {
    display: none;
  }
`

export const DesktopOnly = ({
  children,
  minWidth = MEDIA_WIDTHS.upToSmall,
}: {
  children?: ReactNode
  minWidth: number | keyof typeof MEDIA_WIDTHS
}) => {
  const { width } = useWindowSize()
  const conditionalWidth = typeof minWidth === 'number' ? minWidth : MEDIA_WIDTHS[minWidth]
  if (width && width < conditionalWidth) return null
  return <>{children}</>
}

export const MobileOnly = ({
  children,
  maxWidth = MEDIA_WIDTHS.upToSmall,
}: {
  children?: ReactNode
  maxWidth: number | keyof typeof MEDIA_WIDTHS
}) => {
  const { width } = useWindowSize()
  const conditionalWidth = typeof maxWidth === 'number' ? maxWidth : MEDIA_WIDTHS[maxWidth]
  if (width && width >= conditionalWidth) return null
  return <>{children}</>
}
