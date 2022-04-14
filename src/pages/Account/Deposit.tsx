import { Trans } from '@lingui/macro'
import { MUFFIN_MANAGER_ADDRESSES } from '@muffinfi/constants/addresses'
import { AccountManager, StandardPermitArguments } from '@muffinfi/muffin-v1-sdk'
import { BalanceSource } from '@muffinfi/state/wallet/hooks'
import { Currency, CurrencyAmount, Token } from '@uniswap/sdk-core'
import DepositWithdrawInputRow from 'components/account/DepositWithdrawInputRow'
import { ButtonLight, ButtonPrimary, ButtonText } from 'components/Button'
import { GreyCard, LightCard } from 'components/Card'
import { AutoColumn } from 'components/Column'
import CurrencyLogo from 'components/CurrencyLogo'
import Loader from 'components/Loader'
import { DepositWithdrawTabs } from 'components/NavigationTabs'
import { NetworkAlert } from 'components/NetworkAlert/NetworkAlert'
import { AutoRow, RowBetween, RowFixed } from 'components/Row'
import { SwitchLocaleLink } from 'components/SwitchLocaleLink'
import TokenWarningModal from 'components/TokenWarningModal'
import TransactionConfirmationModal, { ConfirmationModalContent } from 'components/TransactionConfirmationModal'
import { useCurrency, useIsTokenActive } from 'hooks/Tokens'
import useActiveWeb3React from 'hooks/useActiveWeb3React'
import { useArgentWalletContract } from 'hooks/useArgentWalletContract'
import useParsedQueryString from 'hooks/useParsedQueryString'
import useTransactionDeadline from 'hooks/useTransactionDeadline'
import TokenApproveOrPermitButton from 'lib/components/TokenApproveOrPermitButton'
import { ApproveOrPermitState } from 'lib/hooks/useApproveOrPermit'
import { useTokenApproveOrPermitButtonHandler } from 'lib/hooks/useTokenApproveOrPermitButtonHandlers'
import tryParseCurrencyAmount from 'lib/utils/tryParseCurrencyAmount'
import AppBody from 'pages/AppBody'
import { useCallback, useEffect, useMemo, useState } from 'react'
import ReactGA from 'react-ga'
import { RouteComponentProps } from 'react-router-dom'
import { Text } from 'rebass'
import { useWalletModalToggle } from 'state/application/hooks'
import { TransactionType } from 'state/transactions/actions'
import { useTransactionAdder } from 'state/transactions/hooks'
import { useIsExpertMode } from 'state/user/hooks'
import { ThemedText } from 'theme'
import approveAmountCalldata from 'utils/approveAmountCalldata'
import { calculateGasMargin } from 'utils/calculateGasMargin'
import { formatCurrencyAmount } from 'utils/formatCurrencyAmount'
import { maxAmountSpend } from 'utils/maxAmountSpend'
import { AlertWrapper, Wrapper } from './styled'
import { getAmountsString, getRowKey } from './utils'

export default function Deposit({ history }: RouteComponentProps) {
  const { account, chainId, library } = useActiveWeb3React()
  const toggleWalletModal = useWalletModalToggle()
  const addTransaction = useTransactionAdder()
  const isExpertMode = useIsExpertMode()
  const managerAddress = chainId ? MUFFIN_MANAGER_ADDRESSES[chainId] : undefined

  const { currency: defaultCurrencyId }: { currency?: string | string[] } = useParsedQueryString()
  const defaultCurrency = useCurrency(Array.isArray(defaultCurrencyId) ? defaultCurrencyId[0] : defaultCurrencyId)

  const [showConfirm, setShowConfirm] = useState(false)
  const [isAttemptingTxn, setIsAttemptingTxn] = useState(false)
  const [txnHash, setTxnHash] = useState('')
  const [inputAmounts, setInputAmounts] = useState<(CurrencyAmount<Currency> | undefined)[]>([undefined])
  const [maxInputAmounts, setMaxInputAmounts] = useState<(CurrencyAmount<Currency> | undefined)[]>([undefined])
  const { permitSignatures, updatePermitSignature, approvalStates, updateApprovalStates } =
    useTokenApproveOrPermitButtonHandler()

  const argentWalletContract = useArgentWalletContract()

  const resetState = useCallback(() => {
    setInputAmounts([undefined])
    setMaxInputAmounts([undefined])
    setTxnHash('')
  }, [])

  const deposit = useCallback(() => {
    if (!account || !managerAddress || inputAmounts.length === 0) return
    // Sort currency amounts to prevent ETH/WETH race condition
    const amounts = (inputAmounts.filter(Boolean) as CurrencyAmount<Currency>[]).sort((a, b) =>
      a.currency.isNative ? -1 : b.currency.isNative ? 1 : 0
    )
    const { calldata, value } = AccountManager.depositCallParameters(amounts, {
      managerAddress,
      recipient: account,
      inputTokenPermits: permitSignatures as { [address: string]: StandardPermitArguments },
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
    <AutoColumn gap={'md'} style={{ marginTop: '20px' }}>
      <LightCard padding="12px 16px">
        <AutoColumn gap="md">
          {inputAmounts.filter(Boolean).map((amount, index) => (
            <RowBetween key={getRowKey(amount?.currency, index)}>
              <RowFixed>
                <CurrencyLogo currency={amount?.currency} size={'20px'} style={{ marginRight: '0.5rem' }} />
                <ThemedText.Main>{amount ? formatCurrencyAmount(amount, 4) : '-'}</ThemedText.Main>
              </RowFixed>
              <ThemedText.Main>{amount?.currency.symbol}</ThemedText.Main>
            </RowBetween>
          ))}
        </AutoColumn>
      </LightCard>
      <ButtonPrimary onClick={deposit}>
        <Trans>Deposit</Trans>
      </ButtonPrimary>
    </AutoColumn>
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

  const makeInputFields = () => (
    <AutoColumn gap="lg" style={{ display: 'relative' }}>
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
    </AutoColumn>
  )

  /*=====================================================================
   *                            Add row
   *====================================================================*/

  const onAddRow = useCallback(() => {
    setInputAmounts((prev) => [...prev, undefined])
  }, [])

  const makeAddRowButton = () => (
    <AutoColumn justify="flex-end" style={{ marginTop: '1rem', paddingRight: '4px' }}>
      <ButtonText onClick={onAddRow}>
        + <Trans>Add token</Trans>
      </ButtonText>
    </AutoColumn>
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
      {!account ? (
        <ButtonLight onClick={toggleWalletModal}>
          <Trans>Connect Wallet</Trans>
        </ButtonLight>
      ) : zeroCurrencyAmount ? (
        <GreyCard style={{ textAlign: 'center' }}>
          <ThemedText.Main mb="4px">
            <Trans>Enter an amount for {zeroCurrencyAmount.currency.symbol}</Trans>
          </ThemedText.Main>
        </GreyCard>
      ) : overflowCurrencyAmount ? (
        <GreyCard style={{ textAlign: 'center' }}>
          <ThemedText.Main mb="4px">
            <Trans>Insufficient {overflowCurrencyAmount.currency.symbol} balance in wallet</Trans>
          </ThemedText.Main>
        </GreyCard>
      ) : (
        <ButtonPrimary
          onClick={handleDeposit}
          id="deposit-button"
          disabled={isAttemptingTxn || !inputAmounts[0] || pendingApprovalCurrencyAmounts.length > 0}
          // error={isValid && priceImpactSeverity > 2 && !swapCallbackError}
        >
          <AutoRow gap="4px" justify="center">
            <Text fontSize={20} fontWeight={500}>
              {isAttemptingTxn ? (
                <Trans>Waiting For Confirmation</Trans>
              ) : !inputAmounts[0] ? (
                <Trans>Select a token</Trans>
              ) : (
                <Trans>Deposit</Trans>
              )}
            </Text>
            {isAttemptingTxn && <Loader />}
          </AutoRow>
        </ButtonPrimary>
      )}
      {/* {isExpertMode && swapErrorMessage ? <SwapCallbackError error={swapErrorMessage} /> : null} */}
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

  return (
    <>
      <AutoColumn>
        {makeTransactionModal()}
        {makeTokenWarningModal()}
        <AppBody>
          <DepositWithdrawTabs title={<Trans>Deposit</Trans>} />
          <Wrapper>
            <AutoColumn gap="md">
              {makeInputFields()}
              {makeAddRowButton()}
              {makeApprovalButtons()}
              {makeButton()}
            </AutoColumn>
          </Wrapper>
        </AppBody>
      </AutoColumn>
      <AlertWrapper>
        <NetworkAlert />
      </AlertWrapper>
      <SwitchLocaleLink />
    </>
  )
}
