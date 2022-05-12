import { Trans } from '@lingui/macro'
import * as M from '@muffinfi-ui'
import useActiveWeb3React from 'hooks/useActiveWeb3React'
import useCopyClipboard from 'hooks/useCopyClipboard'
import { memo, useCallback, useMemo } from 'react'
import { CheckCircle, Copy as CopyIcon, ExternalLink as LinkIcon } from 'react-feather'
import { useAppDispatch } from 'state/hooks'
import styled from 'styled-components/macro'

import { ReactComponent as Close } from '../../assets/images/x.svg'
import { injected, portis, walletlink } from '../../connectors'
import { SUPPORTED_WALLETS } from '../../constants/wallet'
import { clearAllTransactions } from '../../state/transactions/actions'
import { shortenAddress } from '../../utils'
import { ExplorerDataType, getExplorerLink } from '../../utils/getExplorerLink'
import StatusIcon from '../Identicon/StatusIcon'
import Transaction from './Transaction'

const UpperSection = styled(M.Column).attrs({ stretch: true })`
  padding: 1rem;
  background-color: var(--layer1);
`

const LowerSection = styled(M.Column).attrs({ stretch: true })`
  padding: 1.25rem;
  overflow: auto;
  background-color: var(--layer2);
`

function renderTransactions(transactions: string[]) {
  return (
    <M.Column stretch>
      {transactions.map((hash, i) => {
        return <Transaction key={i} hash={hash} />
      })}
    </M.Column>
  )
}

const CopyAddress = memo(function CopyAddress({ address }: { address: string }) {
  const [isCopied, setCopied] = useCopyClipboard()
  return (
    <M.Anchor role="button" color="text2" hoverColor="text3" onClick={() => setCopied(address)}>
      <M.Row gap="0.333em">
        {isCopied ? (
          <>
            <CheckCircle size="1em" />
            <span>
              <Trans>Copied</Trans>
            </span>
          </>
        ) : (
          <>
            <CopyIcon size="1em" />
            <span>
              <Trans>Copy Address</Trans>
            </span>
          </>
        )}
      </M.Row>
    </M.Anchor>
  )
})

interface AccountDetailsProps {
  toggleWalletModal: () => void
  pendingTransactions: string[]
  confirmedTransactions: string[]
  ENSName?: string
  openOptions: () => void
}

export default function AccountDetails({
  toggleWalletModal,
  pendingTransactions,
  confirmedTransactions,
  ENSName,
  openOptions,
}: AccountDetailsProps) {
  const { chainId, account, connector } = useActiveWeb3React()
  const dispatch = useAppDispatch()

  const { ethereum } = window
  const isMetaMask = !!(ethereum && ethereum.isMetaMask)
  const connectorName = useMemo(() => {
    const name = Object.keys(SUPPORTED_WALLETS)
      .filter(
        (k) =>
          SUPPORTED_WALLETS[k].connector === connector && (connector !== injected || isMetaMask === (k === 'METAMASK'))
      )
      .map((k) => SUPPORTED_WALLETS[k].name)[0]
    return <Trans>Connected with {name}</Trans>
  }, [connector, isMetaMask])

  const ENSNameOrShortenAddress = useMemo(
    () => ENSName || (account && shortenAddress(account, 6)) || '',
    [ENSName, account]
  )

  const transactions = useMemo(
    () => [...pendingTransactions, ...confirmedTransactions],
    [pendingTransactions, confirmedTransactions]
  )

  const clearAllTransactionsCallback = useCallback(() => {
    if (chainId) dispatch(clearAllTransactions({ chainId }))
  }, [dispatch, chainId])

  return (
    <>
      <UpperSection gap="16px">
        <M.RowBetween>
          <M.Text weight="semibold">
            <Trans>Account</Trans>
          </M.Text>
          <M.Anchor role="button" hoverColor="text2" onClick={toggleWalletModal}>
            <Close />
          </M.Anchor>
        </M.RowBetween>

        <M.RowBetween gap="1em">
          <M.Text size="sm" color="text2">
            {connectorName}
          </M.Text>
          <M.TextContents size="sm">
            <M.Row gap="1em">
              {connector !== injected && connector !== walletlink && (
                <M.Anchor
                  role="button"
                  color="primary0"
                  hoverColor="primary2"
                  onClick={() => (connector as any).close()}
                >
                  Disconnect
                </M.Anchor>
              )}
              <M.Anchor role="button" color="primary0" hoverColor="primary2" onClick={openOptions}>
                Change
              </M.Anchor>
            </M.Row>
          </M.TextContents>
        </M.RowBetween>

        <M.Row gap="0.5rem" wrap="wrap">
          {connector && (
            <>
              <StatusIcon connector={connector} />
              {connector === portis && (
                <M.Anchor
                  size="sm"
                  role="button"
                  color="primary0"
                  hoverColor="primary2"
                  onClick={() => {
                    portis.portis.showPortis()
                  }}
                >
                  <Trans>Show Portis</Trans>
                </M.Anchor>
              )}
            </>
          )}
          <M.Text weight="medium" size="xl" title={ENSNameOrShortenAddress}>
            {ENSNameOrShortenAddress}
          </M.Text>
        </M.Row>

        <M.TextContents size="xs">
          <M.Row gap="1rem">
            {account && <CopyAddress address={account} />}
            {chainId && account && (
              <M.ExternalLink
                color="text2"
                hoverColor="text3"
                href={getExplorerLink(chainId, ENSName || account, ExplorerDataType.ADDRESS)}
              >
                <M.Row gap="0.333em">
                  <LinkIcon size="1em" />
                  <span>
                    <Trans>View on Explorer</Trans>
                  </span>
                </M.Row>
              </M.ExternalLink>
            )}
          </M.Row>
        </M.TextContents>
      </UpperSection>

      {transactions.length > 0 ? (
        <LowerSection gap="16px">
          <M.RowBetween>
            <M.Column gap="0.25em">
              <M.Text weight="semibold">
                <Trans>Recent Transactions</Trans>
              </M.Text>
              <M.Text size="xs" color="text2">
                <Trans>Sorted from newest to oldest</Trans>
              </M.Text>
            </M.Column>
            <M.Anchor
              role="button"
              size="sm"
              color="primary0"
              hoverColor="primary2"
              onClick={clearAllTransactionsCallback}
            >
              <Trans>Clear all</Trans>
            </M.Anchor>
          </M.RowBetween>

          {renderTransactions(transactions)}
        </LowerSection>
      ) : (
        <LowerSection>
          <M.Text>
            <Trans>Your transactions will appear here...</Trans>
          </M.Text>
        </LowerSection>
      )}
    </>
  )
}
