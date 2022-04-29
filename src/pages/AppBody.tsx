import styled from 'styled-components/macro'

interface BodyWrapperProps {
  minWidth?: string
  maxWidth?: string
  padding?: string
}

export const BodyWrapper = styled.main<BodyWrapperProps>`
  width: 100%;
  min-width: ${({ minWidth }) => minWidth ?? '340px'};
  max-width: ${({ maxWidth }) => maxWidth ?? '480px'};

  padding: ${({ padding }) => padding};
  border-radius: 24px;
  background: var(--layer1);
  /* prettier-ignore */
  box-shadow:
    0px 0px 1px rgba(0, 0, 0, 0.01),
    0px 4px 8px rgba(0, 0, 0, 0.04),
    0px 16px 24px rgba(0, 0, 0, 0.04),
    0px 24px 32px rgba(0, 0, 0, 0.01);

  ${({ theme }) => theme.mediaWidth.upToSmall`
    padding: 16px;
  `};
`

export default BodyWrapper

// /**
//  * The styled container element that wraps the content of most pages and the tabs.
//  */
// export default function AppBody({ children, ...rest }: { children: React.ReactNode }) {
//   return <BodyWrapper {...rest}>{children}</BodyWrapper>
// }
