import * as M from '@muffinfi-ui'
import useActiveWeb3React from 'hooks/useActiveWeb3React'
import { CheckCircle, Triangle } from 'react-feather'
import styled from 'styled-components/macro'

import { useAllTransactions } from '../../state/transactions/hooks'
import { ExplorerDataType, getExplorerLink } from '../../utils/getExplorerLink'
import Loader from '../Loader'
import { TransactionSummary } from './TransactionSummary'

const TransactionState = styled(M.ExternalLink).attrs({ color: 'primary0', hoverColor: 'primary2' })`
  display: block;
  font-size: 0.825rem;
  padding: 0.5rem 0rem;
`

const IconWrapper = styled.div<{ pending: boolean; success?: boolean }>`
  color: ${({ pending, success }) => (pending ? 'var(--primary0)' : success ? 'var(--green)' : 'var(--red)')};
`

export default function Transaction({ hash }: { hash: string }) {
  const { chainId } = useActiveWeb3React()
  const allTransactions = useAllTransactions()

  const tx = allTransactions?.[hash]
  const info = tx?.info
  const pending = !tx?.receipt
  const success = !pending && tx && (tx.receipt?.status === 1 || typeof tx.receipt?.status === 'undefined')

  if (!chainId) return null

  return (
    <div>
      <TransactionState href={getExplorerLink(chainId, hash, ExplorerDataType.TRANSACTION)}>
        <M.RowBetween gap="1rem">
          <span>
            <TransactionSummary info={info} /> ↗
          </span>
          <IconWrapper pending={pending} success={success}>
            {pending ? <Loader /> : success ? <CheckCircle size="1rem" /> : <Triangle size="1rem" />}
          </IconWrapper>
        </M.RowBetween>
      </TransactionState>
    </div>
  )
}
