import { Trans } from '@lingui/macro'
import useScrollPosition from '@react-hook/window-scroll'
import { CHAIN_INFO } from 'constants/chainInfo'
import { SupportedChainId } from 'constants/chains'
import useActiveWeb3React from 'hooks/useActiveWeb3React'
import { match, NavLink } from 'react-router-dom'
import { useDarkModeManager } from 'state/user/hooks'
import { useNativeCurrencyBalances } from 'state/wallet/hooks'
import styled from 'styled-components/macro'
import { ReactComponent as Logo } from '../../assets/svg/logo.svg'
import Menu from '../Menu'
import Web3Status from '../Web3Status'
import HeaderButton from './HeaderButton'
import NetworkSelector from './NetworkSelector'

///// HEADER /////

const HeaderFrame = styled.div<{ showBackground: boolean }>`
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: space-between;

  padding: 16px;
  transition: background 0.1s, box-shadow 0.1s;

  font-size: 1rem;
  font-weight: var(--fw-semibold);

  ${({ theme, showBackground }) => `
    background: ${showBackground ? (theme.darkMode ? 'rgba(0,0,0,0.3)' : 'rgba(255,255,255, 0.3)') : 'transparent'};
    backdrop-filter: ${showBackground ? 'blur(22px)' : 'blur(0px)'};
    box-shadow: 0px 0px 0px 1px ${showBackground ? 'var(--bg2)' : 'transparent'};
  `};
`

const Row = styled.div`
  display: flex;
  flex-direction: row;
  align-items: center;
`

const HeaderLeft = styled(Row)``

const HeaderRight = styled(Row)`
  & > :not(:first-child) {
    margin-left: 0.5em;
  }
`

///// LEFT /////

const LogoAnchor = styled.a`
  margin-right: 32px;
  pointer-events: auto;
  cursor: pointer;
`

const NavBar = styled(Row)`
  ${({ theme }) => theme.mediaWidth.upToMedium`
    display: none;
  `};
`

const StyledNavLink = styled(NavLink).attrs({ activeClassName: 'ACTIVE' })`
  display: flex;
  flex-direction: row;

  margin-right: 16px;
  padding: 8px 12px;
  border-radius: 14px;

  color: var(--text2);

  cursor: pointer;
  outline: none;
  text-decoration: none;
  white-space: nowrap;

  &.ACTIVE {
    font-weight: var(--fw-bold);
    color: var(--text1);
    background-color: var(--bg0);
  }

  :hover,
  :focus {
    color: var(--text1);
  }
`

///// RIGHT /////

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

  // // related to claim UNI
  // const toggleClaimModal = useToggleSelfClaimModal()
  // const availableClaim: boolean = useUserHasAvailableClaim(account)
  // const { claimTxn } = useUserHasSubmittedClaim(account ?? undefined)
  // const [showUniBalanceModal, setShowUniBalanceModal] = useState(false)
  // const showClaimPopup = useShowClaimPopup()

  const scrollY = useScrollPosition()

  // // link to info site
  const {
    // infoLink,
    nativeCurrency: { symbol: nativeCurrencySymbol },
  } = CHAIN_INFO[chainId ?? SupportedChainId.MAINNET]

  return (
    <HeaderFrame showBackground={scrollY > 45}>
      {/* <ClaimModal />
      <Modal isOpen={showUniBalanceModal} onDismiss={() => setShowUniBalanceModal(false)}>
        <UniBalanceContent setShowUniBalanceModal={setShowUniBalanceModal} />
      </Modal> */}
      <HeaderLeft>
        <LogoAnchor href=".">
          <Logo fill={darkMode ? 'white' : 'black'} width="24px" height="100%" title="logo" />
        </LogoAnchor>
        <NavBar>
          <StyledNavLink id={`swap-nav-link`} to={'/swap'} isActive={isSwapActive}>
            <Trans>Swap</Trans>
          </StyledNavLink>
          <StyledNavLink
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
          </StyledNavLink>
          <StyledNavLink id={`account-nav-link`} to={'/account'}>
            <Trans>Account</Trans>
          </StyledNavLink>
          {/* <StyledExternalLink id={`charts-nav-link`} href={infoLink}>
            <Trans>Charts</Trans>
            <sup>↗</sup>
          </StyledExternalLink> */}
        </NavBar>
      </HeaderLeft>

      <HeaderRight>
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
      </HeaderRight>
    </HeaderFrame>
  )
}
