import { Trans } from '@lingui/macro'
import { CHAIN_INFO } from 'constants/chainInfo'
import { CHAIN_IDS_TO_NAMES, SupportedChainId } from 'constants/chains'
import useActiveWeb3React from 'hooks/useActiveWeb3React'
import { useOnClickOutside } from 'hooks/useOnClickOutside'
import useParsedQueryString from 'hooks/useParsedQueryString'
import usePrevious from 'hooks/usePrevious'
import { ParsedQs } from 'qs'
import { useCallback, useEffect, useRef } from 'react'
import { ArrowDownCircle, ChevronDown } from 'react-feather'
import { useHistory } from 'react-router-dom'
import { useModalOpen, useToggleModal } from 'state/application/hooks'
import { addPopup, ApplicationModal } from 'state/application/reducer'
import styled from 'styled-components/macro'
import { ExternalLink, MEDIA_WIDTHS } from 'theme'
import { replaceURLParam } from 'utils/routes'
import { useAppDispatch } from '../../state/hooks'
import { switchToNetwork } from '../../utils/switchToNetwork'
import HeaderButton from './HeaderButton'

///// Button on Header /////

const SelectorButton = styled(HeaderButton)`
  cursor: pointer;
  padding: 6px 8px;
`

const Logo = styled.img`
  height: 20px;
  width: 20px;
  margin-right: 8px;
`

const SelectorLabel = styled.div`
  margin-right: 8px;
  display: none;

  @media screen and (min-width: ${MEDIA_WIDTHS.upToSmall + 0.1}px) {
    display: block;
  }
`

///// Dropdown /////

const FlyoutMenu = styled.div`
  position: absolute;
  width: 272px;
  z-index: 99;
  padding-top: 10px;
`

const FlyoutMenuContents = styled.div`
  padding: 16px;
  border-radius: 20px;
  background-color: var(--bg0);
  /* prettier-ignore */
  box-shadow:
    0px 0px 1px rgba(0, 0, 0, 0.01),
    0px 4px 8px rgba(0, 0, 0, 0.04),
    0px 16px 24px rgba(0, 0, 0, 0.04),
    0px 24px 32px rgba(0, 0, 0, 0.01);

  & > *:not(:last-child) {
    margin-bottom: 12px;
  }
`

const FlyoutHeader = styled.div`
  color: var(--text2);
`

///// Row /////

const FlyoutRow = styled.div<{ active: boolean }>`
  display: flex;
  align-items: center;
  padding: 6px 8px;
  cursor: pointer;
  font-weight: 500;
  text-align: left;
`

const ActiveRowWrapper = styled.div`
  background-color: var(--bg1);
  border-radius: 8px;
  padding: 8px;
  width: 100%;
`

const FlyoutRowActiveIndicator = styled.div`
  background-color: var(--green1);
  border-radius: 50%;
  height: 9px;
  width: 9px;
`

const ActiveRowLinkList = styled.div`
  padding: 0 8px;
`

const ActiveRowLink = styled(ExternalLink)`
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  align-items: center;

  color: var(--text2);
  font-size: 0.875em;
  font-weight: 500;
  padding: 8px 0 4px;
  text-decoration: none;

  &:first-child {
    padding-top: 10px;
  }
`

const NetworkLabel = styled.div`
  flex: 1 1 auto;
`

const LinkOutCircle = styled(ArrowDownCircle).attrs({ size: 16 })`
  transform: rotate(230deg);
`

///////////////

const BridgeLabel = ({ chainId }: { chainId: SupportedChainId }) => {
  switch (chainId) {
    case SupportedChainId.ARBITRUM_ONE:
    case SupportedChainId.ARBITRUM_RINKEBY:
      return <Trans>Arbitrum Bridge</Trans>
    case SupportedChainId.OPTIMISM:
    case SupportedChainId.OPTIMISTIC_KOVAN:
      return <Trans>Optimism Gateway</Trans>
    case SupportedChainId.POLYGON:
    case SupportedChainId.POLYGON_MUMBAI:
      return <Trans>Polygon Bridge</Trans>
    default:
      return <Trans>Bridge</Trans>
  }
}
const ExplorerLabel = ({ chainId }: { chainId: SupportedChainId }) => {
  switch (chainId) {
    case SupportedChainId.ARBITRUM_ONE:
    case SupportedChainId.ARBITRUM_RINKEBY:
      return <Trans>Arbiscan</Trans>
    case SupportedChainId.OPTIMISM:
    case SupportedChainId.OPTIMISTIC_KOVAN:
      return <Trans>Optimistic Etherscan</Trans>
    case SupportedChainId.POLYGON:
    case SupportedChainId.POLYGON_MUMBAI:
      return <Trans>Polygonscan</Trans>
    default:
      return <Trans>Etherscan</Trans>
  }
}

function Row({
  targetChain,
  onSelectChain,
}: {
  targetChain: SupportedChainId
  onSelectChain: (targetChain: number) => void
}) {
  const { library, chainId } = useActiveWeb3React()
  if (!library || !chainId) {
    return null
  }
  const active = chainId === targetChain
  const { helpCenterUrl, explorer, bridge, label, logoUrl } = CHAIN_INFO[targetChain]

  const rowContent = (
    <FlyoutRow onClick={() => onSelectChain(targetChain)} active={active}>
      <Logo src={logoUrl} />
      <NetworkLabel>{label}</NetworkLabel>
      {chainId === targetChain && <FlyoutRowActiveIndicator />}
    </FlyoutRow>
  )

  if (active) {
    return (
      <ActiveRowWrapper>
        {rowContent}
        <ActiveRowLinkList>
          {bridge ? (
            <ActiveRowLink href={bridge}>
              <BridgeLabel chainId={chainId} /> <LinkOutCircle />
            </ActiveRowLink>
          ) : null}
          {explorer ? (
            <ActiveRowLink href={explorer}>
              <ExplorerLabel chainId={chainId} /> <LinkOutCircle />
            </ActiveRowLink>
          ) : null}
          {helpCenterUrl ? (
            <ActiveRowLink href={helpCenterUrl}>
              <Trans>Help Center</Trans> <LinkOutCircle />
            </ActiveRowLink>
          ) : null}
        </ActiveRowLinkList>
      </ActiveRowWrapper>
    )
  }
  return rowContent
}

const getParsedChainId = (parsedQs?: ParsedQs) => {
  const chain = parsedQs?.chain
  if (!chain || typeof chain !== 'string') return { urlChain: undefined, urlChainId: undefined }

  return { urlChain: chain.toLowerCase(), urlChainId: getChainIdFromName(chain) }
}

const getChainIdFromName = (name: string) => {
  const entry = Object.entries(CHAIN_IDS_TO_NAMES).find(([_, n]) => n === name)
  const chainId = entry?.[0]
  return chainId ? parseInt(chainId) : undefined
}

const getChainNameFromId = (id: string | number) => {
  // casting here may not be right but fine to return undefined if it's not a supported chain ID
  return CHAIN_IDS_TO_NAMES[id as SupportedChainId] || ''
}

export default function NetworkSelector() {
  const { chainId, library } = useActiveWeb3React()
  const parsedQs = useParsedQueryString()
  const { urlChain, urlChainId } = getParsedChainId(parsedQs)
  const prevChainId = usePrevious(chainId)
  const node = useRef<HTMLDivElement>(null)
  const open = useModalOpen(ApplicationModal.NETWORK_SELECTOR)
  const toggle = useToggleModal(ApplicationModal.NETWORK_SELECTOR)

  useOnClickOutside(node, open ? toggle : undefined)

  const history = useHistory()

  const info = chainId ? CHAIN_INFO[chainId] : undefined

  const dispatch = useAppDispatch()

  const handleChainSwitch = useCallback(
    (targetChain: number, skipToggle?: boolean) => {
      if (!library) return
      switchToNetwork({ library, chainId: targetChain })
        .then(() => {
          if (!skipToggle) {
            toggle()
          }
          history.replace({
            search: replaceURLParam(history.location.search, 'chain', getChainNameFromId(targetChain)),
          })
        })
        .catch((error) => {
          console.error('Failed to switch networks', error)

          // we want app network <-> chainId param to be in sync, so if user changes the network by changing the URL
          // but the request fails, revert the URL back to current chainId
          if (chainId) {
            history.replace({ search: replaceURLParam(history.location.search, 'chain', getChainNameFromId(chainId)) })
          }

          if (!skipToggle) {
            toggle()
          }

          dispatch(addPopup({ content: { failedSwitchNetwork: targetChain }, key: `failed-network-switch` }))
        })
    },
    [dispatch, library, toggle, history, chainId]
  )

  useEffect(() => {
    if (!chainId || !prevChainId) return

    // when network change originates from wallet or dropdown selector, just update URL
    if (chainId !== prevChainId) {
      history.replace({ search: replaceURLParam(history.location.search, 'chain', getChainNameFromId(chainId)) })
      // otherwise assume network change originates from URL
    } else if (urlChainId && urlChainId !== chainId) {
      handleChainSwitch(urlChainId, true)
    }
  }, [chainId, urlChainId, prevChainId, handleChainSwitch, history])

  // set chain parameter on initial load if not there
  useEffect(() => {
    if (chainId && !urlChainId) {
      history.replace({ search: replaceURLParam(history.location.search, 'chain', getChainNameFromId(chainId)) })
    }
  }, [chainId, history, urlChainId, urlChain])

  if (!chainId || !info || !library) {
    return null
  }

  return (
    <div ref={node} onMouseEnter={toggle} onMouseLeave={toggle} style={{ position: 'relative' }}>
      <SelectorButton>
        <Logo src={info.logoUrl} />
        <SelectorLabel>{info.label}</SelectorLabel>
        <ChevronDown size={16} />
      </SelectorButton>
      {open && (
        <FlyoutMenu>
          <FlyoutMenuContents>
            <FlyoutHeader>
              <Trans>Select a network</Trans>
            </FlyoutHeader>
            <Row onSelectChain={handleChainSwitch} targetChain={SupportedChainId.MAINNET} />
            <Row onSelectChain={handleChainSwitch} targetChain={SupportedChainId.RINKEBY} />
            {/* <Row onSelectChain={handleChainSwitch} targetChain={SupportedChainId.POLYGON} />
            <Row onSelectChain={handleChainSwitch} targetChain={SupportedChainId.OPTIMISM} />
            <Row onSelectChain={handleChainSwitch} targetChain={SupportedChainId.ARBITRUM_ONE} /> */}
          </FlyoutMenuContents>
        </FlyoutMenu>
      )}
    </div>
  )
}
