import { BigNumber } from '@ethersproject/bignumber'
import { Trans } from '@lingui/macro'
import * as M from '@muffinfi-ui'
import { Currency, CurrencyAmount } from '@uniswap/sdk-core'
import { DesktopOnlyBox, MobileOnlyBox } from 'components/Box'
import CurrencyLogo from 'components/CurrencyLogo'
import Loader from 'components/Loader'
import { MouseoverTooltip } from 'components/Tooltip'
import { useManagerAddress } from 'hooks/useContractAddress'
import usePreviousExclude, { EXCLUDE_NULL_OR_UNDEFINED } from 'hooks/usePreviousExclude'
import useApproveOrPermit, { ApproveOrPermitState } from 'lib/hooks/useApproveOrPermit'
import { CheckCircle, HelpCircle } from 'lib/icons'
import { TransactionType } from 'lib/state/transactions'
import styled, { css } from 'lib/theme'
import { SignatureData } from 'lib/utils/erc20Permit'
import { useCallback, useEffect, useState } from 'react'
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

enum ButtonState {
  IDLE = 'IDLE',
  LOADING = 'LOADING',
  DISABLED = 'DISABLED',
}

interface StyledButtonProps {
  $state: ButtonState
}

const ApproveButton = styled(M.Button).attrs<StyledButtonProps>(({ $state }) => ({
  size: 'row',
  disabled: $state === ButtonState.LOADING || $state === ButtonState.DISABLED,
}))<StyledButtonProps>`
  ${M.buttonMixins.color.primary}
  /* min-height: 58px; */
  ${({ $state }) =>
    $state === ButtonState.LOADING &&
    css`
      &:disabled {
        background: var(--primary0) !important;
        color: var(--primary-text) !important;
        opacity: 0.5;
      }
    `}
`

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
  const [approvalSubmitted, setApprovalSubmitted] = useState(false)
  const [submitCount, setSubmitCount] = useState(0)
  const spender = useManagerAddress()
  const tokenAddress = amount?.currency?.isToken ? amount.currency.address : undefined
  const prevTokenAddress = usePreviousExclude(tokenAddress, EXCLUDE_NULL_OR_UNDEFINED)

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
    if (tokenAddress === prevTokenAddress || !tokenAddress) return
    setApprovalSubmitted(false)
    setSubmitCount(0)
  }, [tokenAddress, prevTokenAddress])

  // only display on currency is token and amount > 0
  if (hidden || !amount?.currency.isToken || amount?.equalTo(0)) return null

  const { approvalState } = approvalObject

  // hide if approved at first place (got approved but not yet approvalSubmitted)
  if (approvalState === ApproveOrPermitState.APPROVED && submitCount === 0) return null

  const buttonState = (() => {
    if (approvalState === ApproveOrPermitState.APPROVED) return ButtonState.DISABLED
    if (approvalSubmitted) return ButtonState.LOADING
    switch (approvalState) {
      // should wait for confirmation
      case ApproveOrPermitState.PENDING_APPROVAL:
      case ApproveOrPermitState.PENDING_SIGNATURE:
        return ButtonState.LOADING
      // enable when require action
      case ApproveOrPermitState.REQUIRES_APPROVAL:
      case ApproveOrPermitState.REQUIRES_APPROVAL_FALLBACK:
      case ApproveOrPermitState.REQUIRES_SIGNATURE:
        return ButtonState.IDLE
      default:
        return ButtonState.DISABLED
    }
  })()

  return (
    <>
      <ApproveButton $state={buttonState} onClick={onClick}>
        <M.RowBetween wrap="nowrap" gap="1em" style={{ flexGrow: 1 }}>
          <CurrencyLogo currency={amount.currency} size="1.25em" />
          <M.Text align="center" style={{ flexGrow: 1 }}>
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
          </M.Text>

          {approvalState === ApproveOrPermitState.APPROVED ? (
            <CheckCircle size="1.25em" color="success" />
          ) : approvalState === ApproveOrPermitState.PENDING_APPROVAL ||
            approvalState === ApproveOrPermitState.PENDING_SIGNATURE ||
            approvalSubmitted ? (
            <Loader stroke="white" />
          ) : (
            <span style={{ height: '1.25em' }}>
              <MouseoverTooltip
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
                <HelpCircle size="1.25em" color="white" />
              </MouseoverTooltip>
            </span>
          )}
        </M.RowBetween>
      </ApproveButton>
    </>
  )
}
