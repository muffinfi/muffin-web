import { BigNumber } from '@ethersproject/bignumber'
import { Trans } from '@lingui/macro'
import { MUFFIN_MANAGER_ADDRESSES } from '@muffinfi/constants/addresses'
import { Currency, CurrencyAmount } from '@uniswap/sdk-core'
import { DesktopOnlyBox, MobileOnlyBox } from 'components/Box'
import { ButtonConfirmed } from 'components/Button'
import CurrencyLogo from 'components/CurrencyLogo'
import Loader from 'components/Loader'
import { AutoRow } from 'components/Row'
import { MouseoverTooltip } from 'components/Tooltip'
import useActiveWeb3React from 'hooks/useActiveWeb3React'
import useApproveOrPermit, { ApproveOrPermitState } from 'lib/hooks/useApproveOrPermit'
import { CheckCircle, HelpCircle } from 'lib/icons'
import { TransactionType } from 'lib/state/transactions'
import { SignatureData } from 'lib/utils/erc20Permit'
import { useCallback, useEffect, useState } from 'react'
import { Text } from 'rebass'
import { useTransactionAdder } from 'state/transactions/hooks'

function LongButtonText({
  approvalState,
  approvalSubmitted,
  symbol,
}: {
  approvalState: ApproveOrPermitState
  approvalSubmitted: boolean
  symbol?: string
}) {
  return approvalState === ApproveOrPermitState.APPROVED ? (
    <Trans>You can now use {symbol}</Trans>
  ) : approvalState === ApproveOrPermitState.PENDING_SIGNATURE ? (
    <Trans>Allowing Muffin to use your {symbol}</Trans>
  ) : approvalState === ApproveOrPermitState.PENDING_APPROVAL ? (
    <Trans>Approving Muffin to use your {symbol}</Trans>
  ) : approvalState === ApproveOrPermitState.REQUIRES_SIGNATURE ? (
    approvalSubmitted ? (
      <Trans>Allowing Muffin to use your {symbol}</Trans>
    ) : (
      <Trans>Allow Muffin to use your {symbol}</Trans>
    )
  ) : approvalState === ApproveOrPermitState.REQUIRES_APPROVAL_FALLBACK ? (
    approvalSubmitted ? (
      <Trans>Approving Muffin to use your {symbol}</Trans>
    ) : (
      <Trans>Approve again Muffin to use your {symbol}</Trans>
    )
  ) : approvalSubmitted ? (
    <Trans>Approving Muffin to use your {symbol}</Trans>
  ) : (
    <Trans>Approve Muffin to use your {symbol}</Trans>
  )
}

function ShortButtonText({
  approvalState,
  approvalSubmitted,
  symbol,
}: {
  approvalState: ApproveOrPermitState
  approvalSubmitted: boolean
  symbol?: string
}) {
  return approvalState === ApproveOrPermitState.APPROVED ? (
    <Trans>Approved {symbol}</Trans>
  ) : approvalState === ApproveOrPermitState.PENDING_SIGNATURE ? (
    <Trans>Allowing {symbol}</Trans>
  ) : approvalState === ApproveOrPermitState.PENDING_APPROVAL ? (
    <Trans>Approving {symbol}</Trans>
  ) : approvalState === ApproveOrPermitState.REQUIRES_SIGNATURE ? (
    approvalSubmitted ? (
      <Trans>Allowing {symbol}</Trans>
    ) : (
      <Trans>Allow {symbol}</Trans>
    )
  ) : approvalState === ApproveOrPermitState.REQUIRES_APPROVAL_FALLBACK ? (
    approvalSubmitted ? (
      <Trans>Approving {symbol}</Trans>
    ) : (
      <Trans>Approve again {symbol}</Trans>
    )
  ) : approvalSubmitted ? (
    <Trans>Approving {symbol}</Trans>
  ) : (
    <Trans>Approve {symbol}</Trans>
  )
}

export default function TokenApproveOrPermitButton({
  amount,
  deadline,
  hidden,
  buttonId,
  onSignatureDataChange,
  onSubmitApproval,
  onStateChanged,
}: {
  buttonId?: string
  amount?: CurrencyAmount<Currency> | undefined
  deadline?: BigNumber | undefined
  hidden?: boolean
  onSignatureDataChange?: (signatureData: SignatureData | null, buttonId?: string) => void
  onSubmitApproval?: (buttonId?: string) => void
  onStateChanged?: (state: ApproveOrPermitState | null, buttonId?: string) => void
}) {
  const { chainId } = useActiveWeb3React()
  const [approvalSubmitted, setApprovalSubmitted] = useState(false)
  const [submitCount, setSubmitCount] = useState(0)
  const spender = chainId ? MUFFIN_MANAGER_ADDRESSES[chainId] : undefined

  const approvalObject = useApproveOrPermit(amount, spender, deadline)

  const addTransaction = useTransactionAdder()
  const onClick = useCallback(async () => {
    if (!amount?.currency.isToken) return

    const transaction = await approvalObject.handleApproveOrPermit()
    if (transaction) {
      setApprovalSubmitted(true)
      setSubmitCount((c) => c + 1)
      if (typeof transaction !== 'boolean') {
        addTransaction(transaction.response, {
          type: TransactionType.APPROVAL,
          tokenAddress: transaction.tokenAddress,
          spender: transaction.spenderAddress,
        })
        onSubmitApproval?.(buttonId)
      }
    }
  }, [addTransaction, amount?.currency.isToken, approvalObject, onSubmitApproval, buttonId])

  // reset submit state when fallback
  useEffect(() => {
    if (
      approvalObject.approvalState === ApproveOrPermitState.REQUIRES_APPROVAL ||
      approvalObject.approvalState === ApproveOrPermitState.REQUIRES_APPROVAL_FALLBACK ||
      approvalObject.approvalState === ApproveOrPermitState.REQUIRES_SIGNATURE
    ) {
      setApprovalSubmitted(false)
    }
  }, [approvalObject])

  // data change trigger
  useEffect(() => {
    onSignatureDataChange?.(approvalObject.signatureData, buttonId)
  }, [onSignatureDataChange, buttonId, approvalObject])

  // state change trigger
  useEffect(() => {
    onStateChanged?.(approvalObject.approvalState, buttonId)
  }, [approvalObject, onStateChanged, buttonId])

  // reset submit state
  useEffect(() => {
    setApprovalSubmitted(false)
    setSubmitCount(0)
  }, [amount?.currency])

  // only display on currency is token and amount > 0
  if (hidden || !amount?.currency.isToken || amount?.equalTo(0)) return null

  const { approvalState } = approvalObject

  // hide if approved at first place (got approved but not yet approvalSubmitted)
  if (approvalState === ApproveOrPermitState.APPROVED && submitCount === 0) return null

  return (
    <ButtonConfirmed
      onClick={onClick}
      width="100%"
      disabled={
        // should wait for confirmation
        approvalSubmitted ||
        // or enable when require action
        !(
          approvalState === ApproveOrPermitState.REQUIRES_APPROVAL ||
          approvalState === ApproveOrPermitState.REQUIRES_APPROVAL_FALLBACK ||
          approvalState === ApproveOrPermitState.REQUIRES_SIGNATURE
        )
      }
      altDisabledStyle={
        // show solid button while waiting
        approvalSubmitted ||
        approvalState === ApproveOrPermitState.PENDING_APPROVAL ||
        approvalState === ApproveOrPermitState.PENDING_SIGNATURE
      }
      confirmed={approvalState === ApproveOrPermitState.APPROVED}
    >
      <AutoRow style={{ flexWrap: 'nowrap' }}>
        <CurrencyLogo currency={amount.currency} size={'20px'} />
        <Text flexGrow={1} textAlign="center" px="2">
          <MobileOnlyBox as="span">
            <ShortButtonText
              approvalState={approvalState}
              approvalSubmitted={approvalSubmitted}
              symbol={amount.currency.symbol}
            />
          </MobileOnlyBox>
          <DesktopOnlyBox as="span">
            <LongButtonText
              approvalState={approvalState}
              approvalSubmitted={approvalSubmitted}
              symbol={amount.currency.symbol}
            />
          </DesktopOnlyBox>
        </Text>
        {approvalState === ApproveOrPermitState.APPROVED ? (
          <CheckCircle size="20px" color="success" />
        ) : approvalState === ApproveOrPermitState.PENDING_APPROVAL ||
          approvalState === ApproveOrPermitState.PENDING_SIGNATURE ||
          approvalSubmitted ? (
          <Loader stroke="white" />
        ) : (
          <MouseoverTooltip
            wrapperProps={{ display: 'flex' }}
            text={
              approvalState === ApproveOrPermitState.REQUIRES_APPROVAL_FALLBACK ? (
                <Trans>
                  You must give the Muffin smart contracts permission to use your {amount.currency.symbol}. You only
                  have to do this once per token.
                </Trans>
              ) : (
                <Trans>
                  You must give the Muffin smart contracts permission to use your {amount.currency.symbol}. You only
                  have to do this once per token.
                </Trans>
              )
            }
          >
            <HelpCircle size="20px" color="white" />
          </MouseoverTooltip>
        )}
      </AutoRow>
    </ButtonConfirmed>
  )
}
