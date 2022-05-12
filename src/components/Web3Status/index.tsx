// eslint-disable-next-line no-restricted-imports
import { Trans } from '@lingui/macro'
import * as M from '@muffinfi-ui'
import { Connector } from '@web3-react/types'
import { darken } from 'polished'
import { useMemo } from 'react'
import { Activity } from 'react-feather'
import styled, { css } from 'styled-components/macro'
import { AbstractConnector } from 'web3-react-abstract-connector'
import { UnsupportedChainIdError, useWeb3React } from 'web3-react-core'

import { NetworkContextName } from '../../constants/misc'
import useENSName from '../../hooks/useENSName'
import { useWalletModalToggle } from '../../state/application/hooks'
import { isTransactionRecent, useAllTransactions } from '../../state/transactions/hooks'
import { TransactionDetails } from '../../state/transactions/reducer'
import { shortenAddress } from '../../utils'
import StatusIcon from '../Identicon/StatusIcon'
import Loader from '../Loader'
import WalletModal from '../WalletModal'

const IconWrapper = styled(M.Row)<{ size?: number }>`
  flex-wrap: nowrap;
  justify-content: center;
  & > * {
    height: ${({ size }) => (size ? size + 'px' : '32px')};
    width: ${({ size }) => (size ? size + 'px' : '32px')};
  }
`

const Web3StatusGeneric = styled(M.ButtonSecondary)`
  flex-wrap: nowrap;
  gap: 0.5rem;

  width: 100%;
  padding: 0.5rem 1rem;
  border-radius: 14px;
  font-weight: 500;

  height: 34px;
  margin-right: 2px;
  margin-left: 2px;
`

const Web3StatusError = styled(Web3StatusGeneric)`
  --btn-bg: ${({ theme }) => theme.red1};
  --btn-bgHover: ${({ theme }) => darken(0.1, theme.red1)};
  --btn-bgActive: ${({ theme }) => darken(0.1, theme.red1)};
  --btn-text: ${({ theme }) => theme.white};
`

const connectedNoPendingTxnStyle = css`
  --btn-bg: var(--layer2);
  --btn-bgHover: var(--layer3);
  --btn-bgActive: var(--layer3);
  --btn-text: var(--text1);
`

const Web3StatusConnect = styled(Web3StatusGeneric)`
  ${M.buttonMixins.color.secondary}
`

const Web3StatusConnected = styled(Web3StatusGeneric)<{ pending?: boolean }>`
  padding: 0.5rem 0.666em;
  ${({ pending }) => (pending ? M.buttonMixins.color.primary : connectedNoPendingTxnStyle)}
`

const ButtonText = styled.div`
  flex: 1 1 auto;
  font-size: 1rem;
  font-weight: 500;

  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`

// we want the latest one to come first, so return negative if a is after b
function newTransactionsFirst(a: TransactionDetails, b: TransactionDetails) {
  return b.addedTime - a.addedTime
}

function WrappedStatusIcon({ connector }: { connector: AbstractConnector | Connector }) {
  return (
    <IconWrapper size={16}>
      <StatusIcon connector={connector} />
    </IconWrapper>
  )
}

function Web3StatusInner() {
  const { account, connector, error } = useWeb3React()
  const { ENSName } = useENSName(account ?? undefined)

  const allTransactions = useAllTransactions()
  const sortedRecentTransactions = useMemo(() => {
    const txs = Object.values(allTransactions)
    return txs.filter(isTransactionRecent).sort(newTransactionsFirst)
  }, [allTransactions])

  const pending = sortedRecentTransactions.filter((tx) => !tx.receipt).map((tx) => tx.hash)
  const hasPendingTransactions = !!pending.length

  const toggleWalletModal = useWalletModalToggle()

  if (account) {
    return (
      <Web3StatusConnected id="web3-status-connected" onClick={toggleWalletModal} pending={hasPendingTransactions}>
        {hasPendingTransactions ? (
          <>
            <ButtonText>
              <Trans>{pending?.length} Pending</Trans>
            </ButtonText>
            <Loader stroke="white" />
          </>
        ) : (
          <>
            <ButtonText>{ENSName || shortenAddress(account)}</ButtonText>
            {connector && <WrappedStatusIcon connector={connector} />}
          </>
        )}
      </Web3StatusConnected>
    )
  } else if (error) {
    return (
      <Web3StatusError onClick={toggleWalletModal}>
        <Activity size={16} />
        <ButtonText>
          {error instanceof UnsupportedChainIdError ? <Trans>Wrong Network</Trans> : <Trans>Error</Trans>}
        </ButtonText>
      </Web3StatusError>
    )
  } else {
    return (
      <Web3StatusConnect id="connect-wallet" onClick={toggleWalletModal}>
        <ButtonText>
          <Trans>Connect Wallet</Trans>
        </ButtonText>
      </Web3StatusConnect>
    )
  }
}

export default function Web3Status() {
  const { active, account } = useWeb3React()
  const contextNetwork = useWeb3React(NetworkContextName)

  const { ENSName } = useENSName(account ?? undefined)

  const allTransactions = useAllTransactions()
  const sortedRecentTransactions = useMemo(() => {
    const txs = Object.values(allTransactions)
    return txs.filter(isTransactionRecent).sort(newTransactionsFirst)
  }, [allTransactions])

  const pending = sortedRecentTransactions.filter((tx) => !tx.receipt).map((tx) => tx.hash)
  const confirmed = sortedRecentTransactions.filter((tx) => tx.receipt).map((tx) => tx.hash)

  return (
    <>
      <Web3StatusInner />
      {(contextNetwork.active || active) && (
        <WalletModal ENSName={ENSName ?? undefined} pendingTransactions={pending} confirmedTransactions={confirmed} />
      )}
    </>
  )
}
