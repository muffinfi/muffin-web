import { darken } from 'polished'
import { ReactNode } from 'react'
import { NavLink } from 'react-router-dom'
import styled from 'styled-components/macro'

const activeClassName = 'ACTIVE'

const StyledNavLink = styled(NavLink).attrs({
  activeClassName,
})`
  ${({ theme }) => theme.flexRowNoWrap}
  align-items: left;
  border-radius: 3rem;
  outline: none;
  cursor: pointer;
  text-decoration: none;
  color: ${({ theme }) => theme.text2};
  font-size: 1rem;
  font-weight: 500;
  padding: 8px 12px;
  word-break: break-word;
  overflow: hidden;
  white-space: nowrap;
  &.${activeClassName} {
    border-radius: 14px;
    font-weight: 600;
    justify-content: center;
    color: ${({ theme }) => theme.text1};
    background-color: ${({ theme }) => theme.bg1};
  }

  :hover,
  :focus {
    color: ${({ theme }) => darken(0.1, theme.text1)};
  }
`

const StyledTabButtonText = styled.span`
  font-weight: 500;
  font-size: 16px;
`

type TabNavLinkProps = Parameters<typeof StyledNavLink>[0] & {
  title: ReactNode
}

export function TabNavLink({ title, children, ...rest }: TabNavLinkProps) {
  return (
    <StyledNavLink {...rest}>
      <StyledTabButtonText>{title}</StyledTabButtonText>
    </StyledNavLink>
  )
}
