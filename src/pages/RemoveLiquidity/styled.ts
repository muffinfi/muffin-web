import { Text } from 'rebass'
import styled from 'styled-components/macro'

export const ResponsiveHeaderText = styled(Text)`
  font-size: 40px;
  font-weight: 500;
  ${({ theme }) => theme.mediaWidth.upToExtraSmall`
     font-size: 24px
  `};
`
