import styled from 'styled-components/macro'

export const Wrapper = styled.div`
  position: relative;
  padding: 20px;
  min-width: 460px;

  ${({ theme }) => theme.mediaWidth.upToExtraSmall`
    min-width: 340px;
  `};
`

export const AlertWrapper = styled.div`
  max-width: 460px;
  width: 100%;
`
