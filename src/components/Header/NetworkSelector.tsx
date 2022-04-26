import { Trans } from '@lingui/macro'
import * as M from 'components/@M'
import { RowBetween } from 'components/Row'
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
import { replaceURLParam } from 'utils/routes'
import { useAppDispatch } from '../../state/hooks'
import { switchToNetwork } from '../../utils/switchToNetwork'
import HeaderButton from './HeaderButton'

///// Button on Header /////

const SelectorButton = styled(HeaderButton).attrs({ role: 'button' })`
  cursor: pointer;
  padding-left: 8px;
  padding-right: 8px;
`

const Logo = styled.img`
  height: 1.25rem;
  width: 1.25rem;
`

const SelectorLabel = styled.div`
  ${({ theme }) => theme.mediaWidth.upToSmall`
    display: none;
  `};
`

///// Dropdown /////

const FlyoutMenuWrapper = styled.div`
  position: absolute;
  width: 272px;
  z-index: 99;
  padding-top: 10px;
`

const FlyoutMenu = styled.div`
  padding: 16px;
  border-radius: 16px;
  background-color: var(--layer1);
  /* prettier-ignore */
  box-shadow:
    0px 0px 1px rgba(0, 0, 0, 0.01),
    0px 4px 8px rgba(0, 0, 0, 0.04),
    0px 16px 24px rgba(0, 0, 0, 0.04),
    0px 24px 32px rgba(0, 0, 0, 0.01);
`

const FlyoutItem = styled(M.Column).attrs({ stretch: true, gap: '0.75rem' })<{ active?: boolean }>`
  border-radius: 8px;
  background: ${({ active }) => (active ? 'var(--layer2)' : 'transparent')};
  padding: ${({ active }) => (active ? '16px' : '8px 8px')};
`

const GreenDot = styled.div`
  background-color: var(--green1);
  border-radius: 50%;
  height: 9px;
  width: 9px;
`

const ResourceLink = styled(M.ExternalLink)`
  display: flex;
  align-items: center;
  justify-content: space-between;
`

const LinkOutCircle = styled(ArrowDownCircle).attrs({ size: '1rem' })`
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

  return (
    <FlyoutItem active={active}>
      <RowBetween onClick={() => onSelectChain(targetChain)} style={{ cursor: 'pointer' }} role="button">
        <M.Row gap="0.5rem">
          <Logo src={logoUrl} />
          <M.Text weight="medium">{label}</M.Text>
        </M.Row>
        {chainId === targetChain && <GreenDot />}
      </RowBetween>

      {active && (
        <M.TextContents color="text2" size="sm" weight="medium">
          <M.Column stretch gap="0.75rem">
            {bridge ? (
              <ResourceLink href={bridge}>
                <BridgeLabel chainId={chainId} />
                <LinkOutCircle />
              </ResourceLink>
            ) : null}
            {explorer ? (
              <ResourceLink href={explorer}>
                <ExplorerLabel chainId={chainId} />
                <LinkOutCircle />
              </ResourceLink>
            ) : null}
            {helpCenterUrl ? (
              <ResourceLink href={helpCenterUrl}>
                <Trans>Help Center</Trans>
                <LinkOutCircle />
              </ResourceLink>
            ) : null}
          </M.Column>
        </M.TextContents>
      )}
    </FlyoutItem>
  )
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
      <SelectorButton gap="0.5em">
        <Logo src={info.logoUrl} />
        <SelectorLabel>{info.label}</SelectorLabel>
        <ChevronDown size="1em" />
      </SelectorButton>
      {open && (
        <FlyoutMenuWrapper>
          <FlyoutMenu>
            <M.Column stretch gap="0.5rem">
              <M.Text color="text2">
                <Trans>Select a network</Trans>
              </M.Text>
              <Row onSelectChain={handleChainSwitch} targetChain={SupportedChainId.MAINNET} />
              <Row onSelectChain={handleChainSwitch} targetChain={SupportedChainId.RINKEBY} />
              <Row onSelectChain={handleChainSwitch} targetChain={SupportedChainId.POLYGON} />
              <Row onSelectChain={handleChainSwitch} targetChain={SupportedChainId.OPTIMISM} />
              <Row onSelectChain={handleChainSwitch} targetChain={SupportedChainId.ARBITRUM_ONE} />
            </M.Column>
          </FlyoutMenu>
        </FlyoutMenuWrapper>
      )}
    </div>
  )
}
