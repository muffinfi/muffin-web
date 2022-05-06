import { Trans } from '@lingui/macro'
import * as M from '@muffinfi-ui'
import useScrollPosition from '@react-hook/window-scroll'
import { CHAIN_INFO } from 'constants/chainInfo'
import { SupportedChainId } from 'constants/chains'
import useActiveWeb3React from 'hooks/useActiveWeb3React'
import { match, NavLink } from 'react-router-dom'
import { useNativeCurrencyBalances } from 'state/wallet/hooks'
import styled, { css } from 'styled-components/macro'
import { ReactComponent as Logo } from '../../assets/svg/muffin_logo.svg'
import { ReactComponent as LogoText } from '../../assets/svg/muffin_logo_text.svg'
import Menu from '../Menu'
import Web3Status from '../Web3Status'
import HeaderButton from './HeaderButton'
import NetworkSelector from './NetworkSelector'

const HeaderWrapper = styled(M.RowBetween)<{ showBackground: boolean }>`
  padding: 16px 32px;
  transition: background-color 100ms, box-shadow 100ms;

  ${({ theme, showBackground }) => css`
    background: ${showBackground ? (theme.darkMode ? 'rgba(0,0,0,0.3)' : 'rgba(255,255,255, 0.3)') : 'transparent'};
    backdrop-filter: ${showBackground ? 'blur(22px)' : 'blur(0px)'};
    box-shadow: 0px 0px 0px 1px ${showBackground ? 'var(--borderColor)' : 'transparent'};
  `};

  ${({ theme }) => theme.mediaWidth.upToSmall`
    padding-left: 16px;
    padding-right: 16px;
  `};
`

const NavItemRow = styled(M.Row)`
  ${({ theme }) => theme.mediaWidth.upToMedium`
    display: none;
  `};
`

const NavItem = styled(NavLink).attrs({ activeClassName: 'ACTIVE' })`
  color: var(--text2);
  font-weight: var(--regular);
  :hover {
    color: var(--text1);
  }

  &.ACTIVE {
    color: var(--text1);
    font-weight: var(--semibold);
  }
`

const BalanceText = styled.div`
  padding-left: 0.75rem;
  padding-right: 0.5rem;

  ${({ theme }) => theme.mediaWidth.upToExtraSmall`
    display: none;
  `};
`

const LogoLink = styled(M.Link)`
  line-height: 0px;
  /* font-size: 0px; */

  & > svg {
    transition: fill 200ms;
    fill: var(--text1);
    :hover {
      fill: var(--primary0);
    }
  }

  & > svg {
    /* logo with text */
    :first-child {
      margin-bottom: 5.454%; // 5px for 110px tall
      display: inline;
      ${({ theme }) => theme.mediaWidth.upToExtraSmall`display: none;`};
    }

    /* logo only */
    :last-child {
      display: none;
      ${({ theme }) => theme.mediaWidth.upToExtraSmall`display: inline;`};
    }
  }
`

/////////////////////

const isSwapActive = (matchOrNull: match | null, { pathname }: { pathname: string }) => {
  return Boolean(matchOrNull) || pathname.startsWith('/limit-range')
}

const isPositionsActive = (matchOrNull: match | null, { pathname }: { pathname: string }) => {
  return (
    Boolean(matchOrNull) ||
    pathname.startsWith('/add') ||
    pathname.startsWith('/remove') ||
    pathname.startsWith('/increase') ||
    pathname.startsWith('/find')
  )
}

export default function Header() {
  const { account, chainId } = useActiveWeb3React()

  const userEthBalance = useNativeCurrencyBalances(account ? [account] : [])?.[account ?? '']

  const scrollY = useScrollPosition()

  // // link to info site
  const {
    // infoLink,
    nativeCurrency: { symbol: nativeCurrencySymbol },
  } = CHAIN_INFO[chainId ?? SupportedChainId.MAINNET]

  return (
    <HeaderWrapper showBackground={scrollY > 45}>
      <M.Row gap="40px">
        <LogoLink to=".">
          <LogoText width="110px" height="30px" />
          <Logo width="26px" height="29px" />
        </LogoLink>
        <NavItemRow gap="32px">
          <NavItem id={`swap-nav-link`} to={'/swap'} isActive={isSwapActive}>
            <Trans>Swap</Trans>
          </NavItem>
          <NavItem id={`pool-nav-link`} to={'/positions'} isActive={isPositionsActive}>
            <Trans>Positions</Trans>
          </NavItem>
          <NavItem id={`account-nav-link`} to={'/account'}>
            <Trans>Account</Trans>
          </NavItem>
        </NavItemRow>
      </M.Row>

      <M.Row gap="8px">
        <NetworkSelector />
        <HeaderButton>
          {account && userEthBalance ? (
            <BalanceText>
              <Trans>
                {userEthBalance?.toSignificant(3)} {nativeCurrencySymbol}
              </Trans>
            </BalanceText>
          ) : null}
          <Web3Status />
        </HeaderButton>
        <Menu />
      </M.Row>
    </HeaderWrapper>
  )
}
