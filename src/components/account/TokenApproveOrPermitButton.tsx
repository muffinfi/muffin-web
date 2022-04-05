import { BigNumber } from '@ethersproject/bignumber'
import { Trans } from '@lingui/macro'
import { MUFFIN_MANAGER_ADDRESSES } from '@muffinfi/constants/addresses'
import { Currency, CurrencyAmount, Token } from '@uniswap/sdk-core'
import { ButtonConfirmed } from 'components/Button'
import Loader from 'components/Loader'
import { AutoRow } from 'components/Row'
import useActiveWeb3React from 'hooks/useActiveWeb3React'
import { SignatureData } from 'hooks/useERC20Permit'
import useApproveOrPermit, { ApproveOrPermitState } from 'lib/hooks/useApproveOrPermit'
import { TransactionType } from 'lib/state/transactions'
import { useCallback, useEffect, useState } from 'react'
import { Text } from 'rebass'
import { useTransactionAdder } from 'state/transactions/hooks'

export default function TokenApproveOrPermitButton({
  amount,
  deadline,
  onSignatureDataChange,
}: {
  amount: CurrencyAmount<Currency>
  deadline: BigNumber | undefined
  onSignatureDataChange: (token: Token, signatureData: SignatureData | null) => void
}) {
  const { chainId } = useActiveWeb3React()
  const [approvalSubmitted, setApprovalSubmitted] = useState(false)
  const spender = chainId ? MUFFIN_MANAGER_ADDRESSES[chainId] : undefined

  const { approvalState, signatureData, handleApproveOrPermit } = useApproveOrPermit(amount, spender, deadline)

  const addTransaction = useTransactionAdder()
  const onClick = useCallback(async () => {
    if (!amount.currency.isToken) return

    const transaction = await handleApproveOrPermit()
    if (transaction) {
      addTransaction(transaction.response, {
        type: TransactionType.APPROVAL,
        tokenAddress: transaction.tokenAddress,
        spender: transaction.spenderAddress,
      })
      setApprovalSubmitted(true)
    }
  }, [addTransaction, amount.currency, handleApproveOrPermit])

  useEffect(() => {
    if (!amount.currency.isToken) return
    onSignatureDataChange(amount.currency, signatureData)
  }, [onSignatureDataChange, amount.currency, signatureData])

  if (!amount.currency.isToken) return null

  return (
    <ButtonConfirmed
      onClick={onClick}
      disabled={
        approvalState === ApproveOrPermitState.PENDING_APPROVAL ||
        approvalState === ApproveOrPermitState.PENDING_SIGNATURE ||
        approvalState === ApproveOrPermitState.APPROVED ||
        approvalSubmitted
      }
      width="100%"
      altDisabledStyle={approvalState === ApproveOrPermitState.PENDING_APPROVAL} // show solid button while waiting
      confirmed={approvalState === ApproveOrPermitState.APPROVED}
    >
      <AutoRow justify="center" gap="4px">
        <Text fontSize={20} fontWeight={500}>
          {approvalState === ApproveOrPermitState.APPROVED ? (
            <Trans>Allowed {amount.currency.symbol}</Trans>
          ) : approvalState === ApproveOrPermitState.PENDING_APPROVAL ? (
            <Trans>Approving {amount.currency.symbol}</Trans>
          ) : approvalState === ApproveOrPermitState.PENDING_SIGNATURE ? (
            <Trans>Allowing {amount.currency.symbol}</Trans>
          ) : approvalState === ApproveOrPermitState.REQUIRES_SIGNATURE ? (
            approvalSubmitted ? (
              <Trans>Allowing {amount.currency.symbol}</Trans>
            ) : (
              <Trans>Allow {amount.currency.symbol}</Trans>
            )
          ) : approvalSubmitted ? (
            <Trans>Approving {amount.currency.symbol}</Trans>
          ) : (
            <Trans>Approve {amount.currency.symbol}</Trans>
          )}
        </Text>
        {approvalSubmitted ||
        approvalState === ApproveOrPermitState.PENDING_APPROVAL ||
        approvalState === ApproveOrPermitState.PENDING_SIGNATURE ? (
          <Loader stroke="white" />
        ) : null}
      </AutoRow>
    </ButtonConfirmed>
  )
}
