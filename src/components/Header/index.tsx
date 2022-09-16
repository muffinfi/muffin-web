import { Trans } from '@lingui/macro'
import { getFaucetUrl, isFaucetSupported } from '@muffinfi/utils/faucet'
import { getMuffinAnalyticsURL } from '@muffinfi/utils/getMuffinAnalyticsURL'
import * as M from '@muffinfi-ui'
import useScrollPosition from '@react-hook/window-scroll'
import { CHAIN_INFO } from 'constants/chainInfo'
import { SupportedChainId } from 'constants/chains'
import useActiveWeb3React from 'hooks/useActiveWeb3React'
import { useGPUAccelerated } from 'hooks/useGPUAccelerated'
import { ExternalLink } from 'react-feather'
import { match } from 'react-router-dom'
import { useNativeCurrencyBalances } from 'state/wallet/hooks'
import styled, { css } from 'styled-components/macro'
import { HideSmall } from 'theme'

import { ReactComponent as Logo } from '../../assets/svg/muffin_logo.svg'
import { ReactComponent as LogoText } from '../../assets/svg/muffin_logo_text.svg'
import Menu from '../Menu'
import Web3Status from '../Web3Status'
import HeaderButton from './HeaderButton'
import NetworkSelector from './NetworkSelector'

const HeaderWrapper = styled(M.RowBetween)<{ showBackground: boolean; isGPUAccelerated: boolean }>`
  padding: 12px 28px;
  transition: background-color 100ms, box-shadow 100ms;

  ${({ theme, showBackground }) => css`
    background: ${showBackground ? (theme.darkMode ? 'rgb(20,20,20)' : 'rgb(246,246,246)') : 'transparent'};
    box-shadow: 0px 0px 0px 1px ${showBackground ? 'var(--borderColor)' : 'transparent'};
  `};

  ${({ theme }) => theme.mediaWidth.upToSmall`
    padding-left: 16px;
    padding-right: 16px;
  `};

  @supports (backdrop-filter: blur(0px)) {
    ${({ theme, showBackground, isGPUAccelerated }) =>
      isGPUAccelerated
        ? css`
            background: ${showBackground
              ? theme.darkMode
                ? 'rgba(20,20,20,0.3)'
                : 'rgba(246,246,246,0.3)'
              : 'transparent'};
            backdrop-filter: ${showBackground ? 'blur(22px)' : 'blur(0px)'};
          `
        : ''};
  }
`

const NavItemRow = styled(M.Row)`
  ${({ theme }) => theme.mediaWidth.upToMedium`
    display: none;
  `};
`

const navItemMixin = css`
  // underline stroke
  padding: 0.25em 0;
  box-shadow: 0 2px 0 0 transparent;

  opacity: 0.8;
  transition: color 100ms, opacity 100ms, box-shadow 100ms;

  &:hover {
    color: var(--text1);
    opacity: 1;
  }
  &.ACTIVE {
    opacity: 1;
    box-shadow: 0 2px 0 0 var(--text1);
  }
`

const NavItem = styled(M.NavLink).attrs({
  color: 'text2',
  weight: 'medium',
  $activeColor: 'text1',
  $activeWeight: 'medium',
})`
  ${navItemMixin}
`

const NavItemExternal = styled(M.ExternalLink).attrs({
  color: 'text2',
  weight: 'medium',
})`
  ${navItemMixin}
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
      margin-bottom: 5px;
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
  const isGPUAccelerated = useGPUAccelerated()

  // // link to info site
  const {
    // infoLink,
    nativeCurrency: { symbol: nativeCurrencySymbol },
  } = CHAIN_INFO[chainId ?? SupportedChainId.MAINNET]

  return (
    <HeaderWrapper showBackground={scrollY > 45} isGPUAccelerated={isGPUAccelerated}>
      <M.Row gap="48px">
        <LogoLink to=".">
          <LogoText width="110px" height={undefined} />
          <Logo width="28px" height={undefined} />
        </LogoLink>
        <NavItemRow gap="40px">
          <NavItem id={`swap-nav-link`} to={'/swap'} isActive={isSwapActive}>
            <Trans>Swap</Trans>
          </NavItem>
          <NavItem id={`pool-nav-link`} to={'/positions'} isActive={isPositionsActive}>
            <Trans>Positions</Trans>
          </NavItem>
          <NavItem id={`account-nav-link`} to={'/account'}>
            <Trans>Account</Trans>
          </NavItem>
          <NavItemExternal href={getMuffinAnalyticsURL(chainId)}>
            <M.Row wrap="nowrap" style={{ alignItems: 'flex-start' }}>
              <Trans>Analytics</Trans>
              <sup>↗</sup>
            </M.Row>
          </NavItemExternal>
        </NavItemRow>
      </M.Row>

      <M.Row gap="8px">
        <FaucetButton />
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

const FaucetButton = () => {
  const { chainId } = useActiveWeb3React()
  if (!isFaucetSupported(chainId)) return null

  return (
    <HideSmall>
      <M.ExternalLink href={getFaucetUrl(chainId)} style={{ borderRadius: 16 }}>
        <HeaderButton style={{ paddingLeft: '0.75rem', paddingRight: '0.75rem' }}>
          <M.Row gap="0.3em">
            <span>Faucet</span>
            <ExternalLink size="1em" />
          </M.Row>
        </HeaderButton>
      </M.ExternalLink>
    </HideSmall>
  )
}
