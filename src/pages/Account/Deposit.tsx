import { Trans } from '@lingui/macro'
import { AccountManager } from '@muffinfi/muffin-sdk'
import { BalanceSource } from '@muffinfi/state/wallet/hooks'
import { formatTokenBalance } from '@muffinfi/utils/formatTokenBalance'
import * as M from '@muffinfi-ui'
import { Currency, CurrencyAmount, Token } from '@uniswap/sdk-core'
import DepositWithdrawInputRow from 'components/account/DepositWithdrawInputRow'
import { LightCard } from 'components/Card'
import CurrencyLogo from 'components/CurrencyLogo'
import Loader from 'components/Loader'
import { NetworkAlert } from 'components/NetworkAlert/NetworkAlert'
import PageTitle from 'components/PageTitle/PageTitle'
import UnsupportedCurrencyFooter from 'components/swap/UnsupportedCurrencyFooter'
import { SwitchLocaleLink } from 'components/SwitchLocaleLink'
import TokenWarningModal from 'components/TokenWarningModal'
import TransactionConfirmationModal, { ConfirmationModalContent } from 'components/TransactionConfirmationModal'
import { useIsTokenActive } from 'hooks/Tokens'
import useActiveWeb3React from 'hooks/useActiveWeb3React'
import { useArgentWalletContract } from 'hooks/useArgentWalletContract'
import { useManagerAddress } from 'hooks/useContractAddress'
import useCurrency from 'hooks/useCurrency'
import { useHasUnsupportedCurrencies } from 'hooks/useIsUnsupportedCurrency'
import useParsedQueryString from 'hooks/useParsedQueryString'
import useScrollToTopOnMount from 'hooks/useScrollToTopOnMount'
import useTransactionDeadline from 'hooks/useTransactionDeadline'
import TokenApproveOrPermitButton from 'lib/components/TokenApproveOrPermitButton'
import { ApproveOrPermitState } from 'lib/hooks/useApproveOrPermit'
import { useTokenApproveOrPermitButtonHandler } from 'lib/hooks/useTokenApproveOrPermitButtonHandlers'
import { signatureDataToPermitOptions } from 'lib/utils/erc20Permit'
import tryParseCurrencyAmount from 'lib/utils/tryParseCurrencyAmount'
import { useCallback, useEffect, useLayoutEffect, useMemo, useState } from 'react'
import ReactGA from 'react-ga'
import { RouteComponentProps } from 'react-router-dom'
import { animated, useSpring } from 'react-spring'
import { useWalletModalToggle } from 'state/application/hooks'
import { TransactionType } from 'state/transactions/actions'
import { useTransactionAdder } from 'state/transactions/hooks'
import { useIsExpertMode } from 'state/user/hooks'
import useResizeObserver from 'use-resize-observer'
import approveAmountCalldata from 'utils/approveAmountCalldata'
import { calculateGasMargin } from 'utils/calculateGasMargin'
import { maxAmountSpend } from 'utils/maxAmountSpend'

import { AlertWrapper } from './styled'
import { getAmountsString, getRowKey } from './utils'

const isNotNull = <T,>(x: T | undefined): x is T => x != null

export default function Deposit({ history }: RouteComponentProps) {
  const { account, library } = useActiveWeb3React()
  const toggleWalletModal = useWalletModalToggle()
  const addTransaction = useTransactionAdder()
  const isExpertMode = useIsExpertMode()
  const managerAddress = useManagerAddress()

  const { currency: defaultCurrencyId }: { currency?: string | string[] } = useParsedQueryString()
  const defaultCurrency = useCurrency(Array.isArray(defaultCurrencyId) ? defaultCurrencyId[0] : defaultCurrencyId)

  const [showConfirm, setShowConfirm] = useState(false)
  const [isAttemptingTxn, setIsAttemptingTxn] = useState(false)
  const [txnHash, setTxnHash] = useState('')
  const [inputAmounts, setInputAmounts] = useState<(CurrencyAmount<Currency> | undefined)[]>([undefined])
  const [maxInputAmounts, setMaxInputAmounts] = useState<(CurrencyAmount<Currency> | undefined)[]>([undefined])
  const { permitSignatures, updatePermitSignature, approvalStates, updateApprovalStates } =
    useTokenApproveOrPermitButtonHandler()

  const currencies = useMemo(() => inputAmounts.filter(isNotNull).map((amount) => amount.currency), [inputAmounts])
  const hasUnsupportedCurrencies = Boolean(useHasUnsupportedCurrencies(currencies))

  const argentWalletContract = useArgentWalletContract()

  const resetState = useCallback(() => {
    setInputAmounts([undefined])
    setMaxInputAmounts([undefined])
    setTxnHash('')
  }, [])

  const deposit = useCallback(() => {
    if (!account || !managerAddress || inputAmounts.length === 0) return
    // Sort currency amounts to prevent ETH/WETH race condition
    const amounts = inputAmounts
      .filter(isNotNull)
      .sort((a, b) => (a.currency.isNative ? -1 : b.currency.isNative ? 1 : 0))
    const permits = Object.fromEntries(
      Object.entries(permitSignatures)
        .map(([key, value]) => [key, signatureDataToPermitOptions(value)])
        .filter(([, value]) => value)
    )
    const { calldata, value } = AccountManager.depositCallParameters(amounts, {
      managerAddress,
      recipient: account,
      inputTokenPermits: permits,
    })
    const req = argentWalletContract
      ? {
          to: argentWalletContract.address,
          data: argentWalletContract.interface.encodeFunctionData('wc_multiCall', [
            [
              ...amounts
                .filter((amount): amount is CurrencyAmount<Token> => amount.currency.isToken)
                .map((amount) => approveAmountCalldata(amount, managerAddress)),
              {
                to: managerAddress,
                value,
                data: calldata,
              },
            ],
          ]),
          value,
        }
      : { to: managerAddress, data: calldata, value }
    setIsAttemptingTxn(true)
    library
      ?.getSigner()
      .estimateGas(req)
      .then((estimate) => library.getSigner().sendTransaction({ ...req, gasLimit: calculateGasMargin(estimate) }))
      .then((response) => {
        setTxnHash(response.hash)
        setIsAttemptingTxn(false)

        amounts.forEach((amount) => {
          ReactGA.event({
            category: 'Account',
            action: 'Deposit',
            label: amount.currency.symbol,
          })
        })

        addTransaction(response, {
          type: TransactionType.DEPOSIT_INTERNAL_ACCOUNT,
          tokenAddresses: amounts.map(({ currency }) => (currency.isToken ? currency.address : 'ETH')),
          amounts: amounts.map(({ quotient }) => quotient.toString()),
        })

        if (isExpertMode) {
          resetState()
          history.push('/account')
        }
      })
      .catch((error) => {
        setIsAttemptingTxn(false)
        console.error(error)
      })
  }, [
    account,
    argentWalletContract,
    managerAddress,
    inputAmounts,
    permitSignatures,
    library,
    addTransaction,
    isExpertMode,
    resetState,
    history,
  ])

  const handleDeposit = useCallback(() => {
    if (isExpertMode) {
      return deposit()
    }
    setShowConfirm(true)
  }, [deposit, isExpertMode])

  const handleDismissConfirmation = useCallback(() => {
    setShowConfirm(false)
    if (txnHash) {
      resetState()
      history.push('/account')
    }
    setIsAttemptingTxn(false)
  }, [txnHash, resetState, history])

  const makeTransactionModalTopContent = () => (
    <M.Column stretch gap="24px">
      <LightCard padding="16px">
        <M.Column stretch gap="16px">
          {inputAmounts.filter(Boolean).map((amount, index) => (
            <M.RowBetween key={getRowKey(amount?.currency, index)}>
              <M.Row>
                <CurrencyLogo currency={amount?.currency} size={'20px'} style={{ marginRight: '0.5rem' }} />
                <M.Text>{amount?.currency.symbol}</M.Text>
              </M.Row>
              <M.Text>{amount ? formatTokenBalance(amount, 4) : '-'}</M.Text>
            </M.RowBetween>
          ))}
        </M.Column>
      </LightCard>
      <M.ButtonRowPrimary onClick={deposit}>
        <Trans>Deposit</Trans>
      </M.ButtonRowPrimary>
    </M.Column>
  )

  const makeTransactionModal = () => (
    <TransactionConfirmationModal
      isOpen={showConfirm}
      onDismiss={handleDismissConfirmation}
      attemptingTxn={isAttemptingTxn}
      hash={txnHash ?? ''}
      content={() => (
        <ConfirmationModalContent
          title={<Trans>Deposit into account</Trans>}
          onDismiss={handleDismissConfirmation}
          topContent={makeTransactionModalTopContent}
        />
      )}
      pendingText={<Trans>Depositing {getAmountsString(inputAmounts)} into account</Trans>}
    />
  )

  /*=====================================================================
   *                           Input fields
   *====================================================================*/

  const onUserInput = useCallback((index: number, input: string, max: CurrencyAmount<Currency> | undefined) => {
    setInputAmounts((prev) => {
      const currency = prev[index]?.currency
      if (!currency) return prev
      const newValue = [...prev]
      newValue[index] = tryParseCurrencyAmount(input, currency) ?? CurrencyAmount.fromRawAmount(currency, 0)
      return newValue
    })
    setMaxInputAmounts((prev) => [...prev.slice(0, index), max as CurrencyAmount<Token>, ...prev.slice(index + 1)])
  }, [])

  const onCurrencySelect = useCallback((index: number, currency: Currency) => {
    setInputAmounts((prev) => {
      const newValue = [...prev]
      newValue[index] = CurrencyAmount.fromRawAmount(currency, 0)
      return newValue
    })
    setMaxInputAmounts((prev) => [...prev.slice(0, index), undefined, ...prev.slice(index + 1)])
  }, [])

  const onRemoveRow = useCallback(
    (index: number) => {
      setInputAmounts((prev) => {
        const amount = prev[index]
        if (amount?.currency.isToken) {
          updatePermitSignature(null, amount.currency.address)
          updateApprovalStates(ApproveOrPermitState.REQUIRES_SIGNATURE, amount.currency.address)
        }
        return [...prev.slice(0, index), ...prev.slice(index + 1)]
      })
      setMaxInputAmounts((prev) => [...prev.slice(0, index), ...prev.slice(index + 1)])
    },
    [updateApprovalStates, updatePermitSignature]
  )

  const isCurrencySelected = useCallback(
    (currency: Currency) => inputAmounts.findIndex((amount) => amount?.currency.equals(currency)) > -1,
    [inputAmounts]
  )

  // skip height animation for initial rendering
  const [heightTransitionReady, setHeightTransitionReady] = useState(false)
  useLayoutEffect(() => {
    const timeoutId = setTimeout(() => setHeightTransitionReady(true), 1000)
    return () => clearTimeout(timeoutId)
  }, [])
  const { ref, height } = useResizeObserver()
  const springProps = useSpring({ height: height ?? 0, immediate: !heightTransitionReady })

  const makeInputFields = () => (
    <animated.div style={{ ...springProps, overflow: 'hidden', width: '100%', willChange: 'height' }}>
      <div ref={ref}>
        <M.Column stretch gap="24px" style={{ position: 'relative' }}>
          {inputAmounts.map((amount, index) => (
            <DepositWithdrawInputRow
              key={getRowKey(amount?.currency, index)}
              inputBalanceSource={BalanceSource.WALLET}
              currencyAmount={amount}
              onUserInput={onUserInput}
              onCurrencySelect={onCurrencySelect}
              onRemoveRow={onRemoveRow}
              showRemoveButton={inputAmounts.length > 1}
              id={`deposit-currency-input-${getRowKey(amount?.currency, index)}`}
              index={index}
              isCurrencySelected={isCurrencySelected}
            />
          ))}
        </M.Column>
      </div>
    </animated.div>
  )

  /*=====================================================================
   *                            Add row
   *====================================================================*/

  const onAddRow = useCallback(() => {
    setInputAmounts((prev) => [...prev, undefined])
  }, [])

  const makeAddRowButton = () => (
    <div style={{ alignSelf: 'flex-end' }}>
      <M.Anchor role="button" color="primary0" hoverColor="primary1" size="sm" weight="semibold" onClick={onAddRow}>
        + <Trans>Another token</Trans>
      </M.Anchor>
    </div>
  )

  /*=====================================================================
   *                          Approval buttons
   *====================================================================*/

  const deadline = useTransactionDeadline()
  const pendingApprovalCurrencyAmounts = useMemo(
    () =>
      argentWalletContract
        ? []
        : (inputAmounts.filter(
            (amount, i) =>
              amount?.currency.isToken && approvalStates[amount.currency.address] !== ApproveOrPermitState.APPROVED
          ) as CurrencyAmount<Token>[]),
    [argentWalletContract, inputAmounts, approvalStates]
  )

  const makeApprovalButtons = () =>
    argentWalletContract
      ? null
      : (inputAmounts.filter(Boolean) as CurrencyAmount<Currency>[]).map((amount) => (
          <TokenApproveOrPermitButton
            key={amount.currency.isNative ? 'ETH' : amount.currency.address}
            buttonId={amount.currency.isNative ? 'ETH' : amount.currency.address}
            amount={amount}
            deadline={deadline}
            onSignatureDataChange={updatePermitSignature}
            onStateChanged={updateApprovalStates}
          />
        ))

  /*=====================================================================
   *                          Deposit button
   *====================================================================*/

  const zeroCurrencyAmount = useMemo(() => inputAmounts.find((amount) => !amount || amount.equalTo(0)), [inputAmounts])
  const overflowCurrencyAmount = useMemo(
    () => inputAmounts.find((amount, i) => amount && maxAmountSpend(maxInputAmounts[i])?.lessThan(amount)),
    [inputAmounts, maxInputAmounts]
  )

  const makeButton = () => (
    <div>
      {hasUnsupportedCurrencies ? (
        <M.ButtonRowPrimary disabled>
          <Trans>Unsupported Asset</Trans>
        </M.ButtonRowPrimary>
      ) : !account ? (
        <M.ButtonRowSecondary onClick={toggleWalletModal}>
          <Trans>Connect Wallet</Trans>
        </M.ButtonRowSecondary>
      ) : zeroCurrencyAmount ? (
        <M.ButtonRow color="tertiary" disabled>
          <Trans>Enter an amount for {zeroCurrencyAmount.currency.symbol}</Trans>
        </M.ButtonRow>
      ) : overflowCurrencyAmount ? (
        <M.ButtonRow color="tertiary" disabled>
          <Trans>Insufficient {overflowCurrencyAmount.currency.symbol} balance in wallet</Trans>
        </M.ButtonRow>
      ) : (
        <M.ButtonRowPrimary
          onClick={handleDeposit}
          id="deposit-button"
          disabled={isAttemptingTxn || !inputAmounts[0] || pendingApprovalCurrencyAmounts.length > 0}
        >
          <M.Row gap="4px">
            <M.Text>
              {isAttemptingTxn ? (
                <Trans>Waiting For Confirmation</Trans>
              ) : !inputAmounts[0] ? (
                <Trans>Select a token</Trans>
              ) : (
                <Trans>Deposit from Wallet to Account</Trans>
              )}
            </M.Text>
            {isAttemptingTxn && <Loader />}
          </M.Row>
        </M.ButtonRowPrimary>
      )}
    </div>
  )

  /*=====================================================================
   *                        Token warning model
   *====================================================================*/

  const [isTokenWarningModelOpen, setIsTokenWarningModelOpen] = useState(false)
  const isDefaultTokenActive = useIsTokenActive(defaultCurrency?.isToken ? defaultCurrency : undefined)
  const onConfirmWarning = useCallback(() => {
    setIsTokenWarningModelOpen(false)
  }, [])
  const onDismissWarning = useCallback(() => {
    setIsTokenWarningModelOpen(false)
    history.push('/account/deposit')
  }, [history])

  const makeTokenWarningModal = () =>
    defaultCurrency?.isToken && (
      <TokenWarningModal
        isOpen={isTokenWarningModelOpen}
        tokens={[defaultCurrency]}
        onConfirm={onConfirmWarning}
        onDismiss={onDismissWarning}
      />
    )

  useEffect(() => {
    if (!defaultCurrency) return
    if (isDefaultTokenActive) {
      setMaxInputAmounts([undefined])
      setInputAmounts([CurrencyAmount.fromRawAmount(defaultCurrency, 0)])
    } else {
      setIsTokenWarningModelOpen(true)
    }
  }, [defaultCurrency, isDefaultTokenActive])

  useScrollToTopOnMount()

  return (
    <>
      <PageTitle title="Despoit" />

      {makeTransactionModal()}
      {makeTokenWarningModal()}
      <M.Container maxWidth="27rem">
        <M.Column stretch gap="32px">
          <M.Link color="text2" to="/account">
            <Trans>← Back to Account</Trans>
          </M.Link>

          <M.Text size="xl" weight="bold">
            <Trans>Deposit into account</Trans>
          </M.Text>

          <M.SectionCard greedyMargin>
            <M.Column stretch gap="24px">
              {makeInputFields()}
              {makeAddRowButton()}
              {makeApprovalButtons()}
              {makeButton()}
            </M.Column>
          </M.SectionCard>
        </M.Column>
      </M.Container>

      {hasUnsupportedCurrencies && <UnsupportedCurrencyFooter currencies={currencies} />}

      <AlertWrapper>
        <NetworkAlert />
      </AlertWrapper>
      <SwitchLocaleLink />
    </>
  )
}
