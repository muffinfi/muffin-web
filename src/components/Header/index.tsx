import { Trans } from '@lingui/macro'
import useScrollPosition from '@react-hook/window-scroll'
import * as M from 'components/@M'
import { CHAIN_INFO } from 'constants/chainInfo'
import { SupportedChainId } from 'constants/chains'
import useActiveWeb3React from 'hooks/useActiveWeb3React'
import { match, NavLink } from 'react-router-dom'
import { useDarkModeManager } from 'state/user/hooks'
import { useNativeCurrencyBalances } from 'state/wallet/hooks'
import styled, { css } from 'styled-components/macro'
import { ReactComponent as Logo } from '../../assets/svg/logo.svg'
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

/////////////////////

const isSwapActive = (matchOrNull: match | null, location: { pathname: string }) => {
  if (matchOrNull) return true
  return location.pathname.startsWith('/limit-range')
}

export default function Header() {
  const { account, chainId } = useActiveWeb3React()

  const userEthBalance = useNativeCurrencyBalances(account ? [account] : [])?.[account ?? '']
  const [darkMode] = useDarkModeManager()

  const scrollY = useScrollPosition()

  // // link to info site
  const {
    // infoLink,
    nativeCurrency: { symbol: nativeCurrencySymbol },
  } = CHAIN_INFO[chainId ?? SupportedChainId.MAINNET]

  return (
    <HeaderWrapper showBackground={scrollY > 45}>
      <M.Row gap="32px">
        <M.Link to=".">
          <Logo fill={darkMode ? 'white' : 'black'} width="24px" height="100%" title="logo" />
        </M.Link>
        <NavItemRow gap="32px">
          <NavItem id={`swap-nav-link`} to={'/swap'} isActive={isSwapActive}>
            <Trans>Swap</Trans>
          </NavItem>
          <NavItem
            id={`pool-nav-link`}
            to={'/pool'}
            isActive={(match, { pathname }) =>
              Boolean(match) ||
              pathname.startsWith('/add') ||
              pathname.startsWith('/remove') ||
              pathname.startsWith('/increase') ||
              pathname.startsWith('/find')
            }
          >
            <Trans>Pool</Trans>
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
