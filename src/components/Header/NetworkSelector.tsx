import { Trans } from '@lingui/macro'
import { FAUCET_URL, isFaucetSupported } from '@muffinfi/utils/faucet'
import * as M from '@muffinfi-ui'
import { RowBetween } from 'components/Row'
import { CHAIN_INFO } from 'constants/chainInfo'
import { SupportedChainId } from 'constants/chains'
import useActiveWeb3React from 'hooks/useActiveWeb3React'
import { useOnClickOutside } from 'hooks/useOnClickOutside'
import { useRef } from 'react'
import { ArrowDownCircle, ChevronDown } from 'react-feather'
import { useOpenCloseModal } from 'state/application/hooks'
import { ApplicationModal } from 'state/application/reducer'
import styled from 'styled-components/macro'

import HeaderButton from './HeaderButton'
import { useHandleChainSwitch } from './useHandleChainSwitch'

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
  padding: 12px;
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
  border-radius: 10px;
  background: ${({ active }) => (active ? 'var(--layer2)' : 'transparent')};
  padding: ${({ active }) => (active ? '12px' : '8px 12px')};
`

const GreenDot = styled.div`
  background-color: var(--green);
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

            {isFaucetSupported(chainId) ? (
              <ResourceLink href={FAUCET_URL}>
                <Trans>Faucet</Trans>
                <LinkOutCircle />
              </ResourceLink>
            ) : null}
          </M.Column>
        </M.TextContents>
      )}
    </FlyoutItem>
  )
}

export default function NetworkSelector() {
  const { chainId, library } = useActiveWeb3React()

  const node = useRef<HTMLDivElement>(null)
  const [open, setOpen, setClose] = useOpenCloseModal(ApplicationModal.NETWORK_SELECTOR)
  const { handleChainSwitch } = useHandleChainSwitch(setClose)

  useOnClickOutside(node, open ? setClose : undefined)

  const info = chainId ? CHAIN_INFO[chainId] : undefined

  if (!chainId || !info || !library) {
    return null
  }

  return (
    <div ref={node} onMouseEnter={setOpen} onMouseLeave={setClose} style={{ position: 'relative' }}>
      <SelectorButton gap="0.5em">
        <Logo src={info.logoUrl} />
        <SelectorLabel>{info.label}</SelectorLabel>
        <ChevronDown size="1em" />
      </SelectorButton>
      {open && (
        <FlyoutMenuWrapper>
          <FlyoutMenu>
            <M.Column stretch gap="0.5rem">
              <M.TextDiv color="text2" style={{ padding: '4px 4px 0' }}>
                <Trans>Select a network</Trans>
              </M.TextDiv>
              {/* <Row onSelectChain={handleChainSwitch} targetChain={SupportedChainId.MAINNET} /> */}
              <Row onSelectChain={handleChainSwitch} targetChain={SupportedChainId.RINKEBY} />
              {/* <Row onSelectChain={handleChainSwitch} targetChain={SupportedChainId.POLYGON} />
              <Row onSelectChain={handleChainSwitch} targetChain={SupportedChainId.OPTIMISM} />
              <Row onSelectChain={handleChainSwitch} targetChain={SupportedChainId.ARBITRUM_ONE} /> */}
            </M.Column>
          </FlyoutMenu>
        </FlyoutMenuWrapper>
      )}
    </div>
  )
}
