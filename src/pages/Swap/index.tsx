import { Trans } from '@lingui/macro'
import { useSwapCallback } from '@muffinfi/hooks/swap/useSwapCallback'
import { useTradeAdvancedDetails } from '@muffinfi/hooks/swap/useTradeAdvancedDetails'
import { Trade } from '@muffinfi/muffin-v1-sdk'
import { useUserStoreIntoInternalAccount } from '@muffinfi/state/user/hooks'
import { Currency, Token, TradeType } from '@uniswap/sdk-core'
import { NetworkAlert } from 'components/NetworkAlert/NetworkAlert'
import SwapDetailsDropdown from 'components/swap/SwapDetailsDropdown'
import UnsupportedCurrencyFooter from 'components/swap/UnsupportedCurrencyFooter'
import TokenDestinationToggleRow from 'components/TokenDestinationToggleRow'
import useActiveWeb3React from 'hooks/useActiveWeb3React'
import useTransactionDeadline from 'hooks/useTransactionDeadline'
import JSBI from 'jsbi'
import TokenApproveOrPermitButton from 'lib/components/TokenApproveOrPermitButton'
import { ApproveOrPermitState } from 'lib/hooks/useApproveOrPermit'
import useFiatValuePriceImpact from 'lib/hooks/useFiatValuePriceImpact'
import useOutstandingAmountToApprove from 'lib/hooks/useOutstandingAmountToApprove'
import { SignatureData } from 'lib/utils/erc20Permit'
import { useCallback, useContext, useMemo, useState } from 'react'
import { ArrowDown } from 'react-feather'
import ReactGA from 'react-ga'
import { RouteComponentProps } from 'react-router-dom'
import { Text } from 'rebass'
import { TradeState } from 'state/routing/types'
import styled, { ThemeContext } from 'styled-components/macro'
import AddressInputPanel from '../../components/AddressInputPanel'
import { ButtonError, ButtonLight, ButtonPrimary } from '../../components/Button'
import { GreyCard } from '../../components/Card'
import { AutoColumn } from '../../components/Column'
import CurrencyInputPanel from '../../components/CurrencyInputPanel'
import { AutoRow } from '../../components/Row'
import confirmPriceImpactWithoutFee from '../../components/swap/confirmPriceImpactWithoutFee'
import ConfirmSwapModal from '../../components/swap/ConfirmSwapModal'
import { ArrowWrapper, SwapCallbackError, Wrapper } from '../../components/swap/styleds'
import SwapHeader from '../../components/swap/SwapHeader'
import { SwitchLocaleLink } from '../../components/SwitchLocaleLink'
import TokenWarningModal from '../../components/TokenWarningModal'
import { useAllTokens, useCurrency } from '../../hooks/Tokens'
import { useApprovalOptimizedTrade } from '../../hooks/useApproveCallback'
import useENSAddress from '../../hooks/useENSAddress'
import useIsArgentWallet from '../../hooks/useIsArgentWallet'
import { useIsSwapUnsupported } from '../../hooks/useIsSwapUnsupported'
import { useUSDCValue } from '../../hooks/useUSDCPrice'
import useWrapCallback, { WrapErrorText, WrapType } from '../../hooks/useWrapCallback'
import { useWalletModalToggle } from '../../state/application/hooks'
import { Field } from '../../state/swap/actions'
import {
  useDefaultsFromURLSearch,
  useDerivedSwapInfo,
  useSwapActionHandlers,
  useSwapState,
} from '../../state/swap/hooks'
import { useExpertModeManager } from '../../state/user/hooks'
import { LinkStyledButton, ThemedText } from '../../theme'
import { maxAmountSpend } from '../../utils/maxAmountSpend'
import { warningSeverity } from '../../utils/prices'
import AppBody from '../AppBody'

const AlertWrapper = styled.div`
  max-width: 460px;
  width: 100%;
`

export default function Swap({ history }: RouteComponentProps) {
  const { account } = useActiveWeb3React()

  /*=====================================================================
   *                            SWAP STATE
   *====================================================================*/

  const [isExpertMode] = useExpertModeManager()

  const swapState = useSwapState()
  const { independentField, typedValue, recipient } = swapState
  const dependentField = independentField === Field.INPUT ? Field.OUTPUT : Field.INPUT

  const {
    trade: { state: tradeState, trade },
    allowedSlippage,
    currencyBalances,
    parsedAmount,
    currencies,
    inputError: swapInputError,
  } = useDerivedSwapInfo(swapState)

  const [storeInInternalAccount, toggleStoreInInternalAccount] = useUserStoreIntoInternalAccount()

  /*======================================================================
   *                         TRADE AND ROUTE
   *====================================================================*/

  // for wrap/unwrap ETH <-> WETH
  const {
    wrapType,
    execute: onWrap,
    inputError: wrapInputError,
  } = useWrapCallback(currencies[Field.INPUT], currencies[Field.OUTPUT], typedValue)
  const showWrap = wrapType !== WrapType.NOT_APPLICABLE

  const routeNotFound = !trade?.swaps
  const routeIsLoading = TradeState.LOADING === tradeState
  const routeIsSyncing = TradeState.SYNCING === tradeState

  /*======================================================================
   *                       INPUT/OUTPUT AMOUNTS
   *====================================================================*/

  // parse trade input and output amounts
  const parsedAmounts = useMemo(() => {
    if (showWrap) return { [Field.INPUT]: parsedAmount, [Field.OUTPUT]: parsedAmount }
    return {
      [Field.INPUT]: independentField === Field.INPUT ? parsedAmount : trade?.inputAmount,
      [Field.OUTPUT]: independentField === Field.OUTPUT ? parsedAmount : trade?.outputAmount,
    }
  }, [independentField, parsedAmount, showWrap, trade])

  // make formated input and output amounts
  const formattedAmounts = useMemo(() => {
    return {
      [independentField]: typedValue,
      [dependentField]: showWrap
        ? parsedAmounts[independentField]?.toExact() ?? ''
        : parsedAmounts[dependentField]?.toSignificant(6) ?? '',
    }
  }, [dependentField, independentField, parsedAmounts, showWrap, typedValue])

  // compute fiat value of input and output amounts
  const fiatValues = {
    [Field.INPUT]: useUSDCValue(parsedAmounts[Field.INPUT]) ?? undefined,
    [Field.OUTPUT]: useUSDCValue(parsedAmounts[Field.OUTPUT]) ?? undefined,
  }

  /*======================================================================
   *                           PRICE IMPACT
   *====================================================================*/

  // compute price impact
  const priceImpact = useFiatValuePriceImpact(trade?.inputAmount, trade?.outputAmount, routeIsSyncing)
  const { priceImpact: executionPriceImpact } = useTradeAdvancedDetails(trade ?? undefined)

  // warnings on the greater of fiat value price impact and execution price impact
  const priceImpactSeverity = useMemo(
    () =>
      warningSeverity(
        executionPriceImpact && priceImpact
          ? executionPriceImpact.greaterThan(priceImpact)
            ? executionPriceImpact
            : priceImpact
          : executionPriceImpact ?? priceImpact
      ),
    [priceImpact, executionPriceImpact]
  )

  // for expert mode
  const priceImpactTooHigh = priceImpactSeverity > 3 && !isExpertMode

  /*=====================================================================
   *                          TOKEN APPROVALS
   *====================================================================*/

  const approvalOptimizedTradeString = 'Muffin'

  // check if user has gone through approval process, used to show two step buttons, reset on token change
  // const [approvalSubmitted, setApprovalSubmitted] = useState(false)

  const isArgentWallet = useIsArgentWallet()
  const transactionDeadline = useTransactionDeadline()
  const approvalOptimizedTrade = useApprovalOptimizedTrade(trade ?? undefined, allowedSlippage)
  const amountToApprove = useOutstandingAmountToApprove(
    account ?? undefined,
    approvalOptimizedTrade?.maximumAmountIn(allowedSlippage)
  )
  const [signatureData, setSignatureData] = useState<SignatureData | null>(null)
  const [approvalState, setApprovalState] = useState<ApproveOrPermitState | null>(null)

  // show approve flow when: no error on inputs, not approved or pending, or approved in current session
  // never show if price impact is above threshold in non expert mode
  const showApproveFlow =
    !isArgentWallet && !swapInputError && amountToApprove && !(priceImpactSeverity > 3 && !isExpertMode)

  const onSubmitApproval = useCallback(() => {
    ReactGA.event({
      category: 'Swap',
      action: 'Approve',
      label: [approvalOptimizedTradeString, approvalOptimizedTrade?.inputAmount?.currency.symbol].join('/'),
    })
  }, [approvalOptimizedTradeString, approvalOptimizedTrade?.inputAmount?.currency.symbol])

  /*=====================================================================
   *                     TOKEN WARNING MODAL (UI)
   *====================================================================*/

  const loadedUrlParams = useDefaultsFromURLSearch()
  const loadedInputCurrency = useCurrency(loadedUrlParams?.[Field.INPUT].currencyId)
  const loadedOutputCurrency = useCurrency(loadedUrlParams?.[Field.OUTPUT].currencyId)

  const defaultTokens = useAllTokens()

  // dismiss warning if all imported tokens are in active lists
  const importTokensNotInDefault = useMemo(
    () =>
      [loadedInputCurrency, loadedOutputCurrency].filter(
        (c): c is Token => (c?.isToken ?? false) && !Boolean(c?.isToken && c?.address in defaultTokens)
      ),
    [loadedInputCurrency, loadedOutputCurrency, defaultTokens]
  )

  const [dismissTokenWarning, setDismissTokenWarning] = useState<boolean>(false)

  const handleConfirmTokenWarning = useCallback(() => {
    setDismissTokenWarning(true)
  }, [])

  // reset if they close warning without tokens in params
  const handleDismissTokenWarning = useCallback(() => {
    setDismissTokenWarning(true)
    history.push('/swap/')
  }, [history])

  /*======================================================================
   *                          UI STATES
   *====================================================================*/

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const maxInputAmount = useMemo(() => maxAmountSpend(currencyBalances[Field.INPUT]), [currencyBalances[Field.INPUT]])
  const showMaxButton = Boolean(maxInputAmount?.greaterThan(0) && !parsedAmounts[Field.INPUT]?.equalTo(maxInputAmount))

  const theme = useContext(ThemeContext)

  const [showInverted, setShowInverted] = useState(false)

  const swapIsUnsupported = useIsSwapUnsupported(currencies[Field.INPUT], currencies[Field.OUTPUT])

  const toggleWalletModal = useWalletModalToggle()

  const userHasSpecifiedInputOutput = Boolean(
    currencies[Field.INPUT] && currencies[Field.OUTPUT] && parsedAmounts[independentField]?.greaterThan(JSBI.BigInt(0))
  )

  const isValid = !swapInputError

  // modal and loading
  const [{ showConfirm, tradeToConfirm, swapErrorMessage, attemptingTxn, txHash }, setSwapState] = useState<{
    showConfirm: boolean
    tradeToConfirm: Trade<Currency, Currency, TradeType> | null | undefined
    attemptingTxn: boolean
    swapErrorMessage: string | undefined
    txHash: string | undefined
  }>({
    showConfirm: false,
    tradeToConfirm: undefined,
    attemptingTxn: false,
    swapErrorMessage: undefined,
    txHash: undefined,
  })

  /*=====================================================================
   *                         UI ACTION HANDLER
   *====================================================================*/

  const { onSwitchTokens, onCurrencySelection, onUserInput, onChangeRecipient } = useSwapActionHandlers()

  const handleTypeInput = useCallback(
    (value: string) => {
      onUserInput(Field.INPUT, value)
    },
    [onUserInput]
  )

  const handleTypeOutput = useCallback(
    (value: string) => {
      onUserInput(Field.OUTPUT, value)
    },
    [onUserInput]
  )

  const handleInputSelect = useCallback(
    (inputCurrency) => {
      onCurrencySelection(Field.INPUT, inputCurrency)
    },
    [onCurrencySelection]
  )

  const handleOutputSelect = useCallback(
    (outputCurrency) => {
      onCurrencySelection(Field.OUTPUT, outputCurrency)
    },
    [onCurrencySelection]
  )

  const handleMaxInput = useCallback(() => {
    maxInputAmount && onUserInput(Field.INPUT, maxInputAmount.toExact())
    ReactGA.event({ category: 'Swap', action: 'Max' })
  }, [maxInputAmount, onUserInput])

  const handleAcceptChanges = useCallback(() => {
    setSwapState({ tradeToConfirm: trade, swapErrorMessage, txHash, attemptingTxn, showConfirm })
  }, [attemptingTxn, showConfirm, swapErrorMessage, trade, txHash])

  const handleConfirmDismiss = useCallback(() => {
    setSwapState({ showConfirm: false, tradeToConfirm, attemptingTxn, swapErrorMessage, txHash })
    // if there was a tx hash, we want to clear the input
    if (txHash) {
      onUserInput(Field.INPUT, '')
    }
  }, [attemptingTxn, onUserInput, swapErrorMessage, tradeToConfirm, txHash])

  /*=====================================================================
   *                              SWAP
   *====================================================================*/

  const { address: recipientAddress } = useENSAddress(recipient)

  // the callback to execute the swap
  const { callback: swapCallback, error: swapCallbackError } = useSwapCallback({
    trade: approvalOptimizedTrade,
    allowedSlippage,
    recipientAddressOrName: recipient,
    toInternalAccount: storeInInternalAccount,
    deadline: transactionDeadline,
    signatureData,
  })

  const handleSwap = useCallback(() => {
    if (!swapCallback) {
      return
    }
    if (priceImpact && !confirmPriceImpactWithoutFee(priceImpact)) {
      return
    }
    setSwapState({ attemptingTxn: true, tradeToConfirm, showConfirm, swapErrorMessage: undefined, txHash: undefined })
    swapCallback()
      .then((response) => {
        setSwapState({
          attemptingTxn: false,
          tradeToConfirm,
          showConfirm,
          swapErrorMessage: undefined,
          txHash: response.hash,
        })
        ReactGA.event({
          category: 'Swap',
          action:
            recipient === null
              ? 'Swap w/o Send'
              : (recipientAddress ?? recipient) === account
              ? 'Swap w/o Send + recipient'
              : 'Swap w/ Send',
          label: [
            approvalOptimizedTradeString,
            approvalOptimizedTrade?.inputAmount?.currency?.symbol,
            approvalOptimizedTrade?.outputAmount?.currency?.symbol,
            'MH',
          ].join('/'),
        })
      })
      .catch((error) => {
        setSwapState({
          attemptingTxn: false,
          tradeToConfirm,
          showConfirm,
          swapErrorMessage: error.message,
          txHash: undefined,
        })
      })
  }, [
    swapCallback,
    priceImpact,
    tradeToConfirm,
    showConfirm,
    recipient,
    recipientAddress,
    account,
    approvalOptimizedTradeString,
    approvalOptimizedTrade?.inputAmount?.currency?.symbol,
    approvalOptimizedTrade?.outputAmount?.currency?.symbol,
  ])

  /*=====================================================================
   *                         REACT COMPONENT
   *====================================================================*/

  const makeInputFields = () => (
    <div style={{ display: 'relative' }}>
      <CurrencyInputPanel
        label={independentField === Field.OUTPUT && !showWrap ? <Trans>From (at most)</Trans> : <Trans>From</Trans>}
        value={formattedAmounts[Field.INPUT]}
        showMaxButton={showMaxButton}
        currency={currencies[Field.INPUT]}
        onUserInput={handleTypeInput}
        onMax={handleMaxInput}
        fiatValue={fiatValues[Field.INPUT]}
        onCurrencySelect={handleInputSelect}
        otherCurrency={currencies[Field.OUTPUT]}
        showCommonBases={true}
        id="swap-currency-input"
        loading={independentField === Field.OUTPUT && routeIsSyncing}
      />
      <ArrowWrapper clickable>
        <ArrowDown
          size="16"
          onClick={() => {
            onSwitchTokens()
          }}
          color={currencies[Field.INPUT] && currencies[Field.OUTPUT] ? theme.text1 : theme.text3}
        />
      </ArrowWrapper>
      <CurrencyInputPanel
        value={formattedAmounts[Field.OUTPUT]}
        onUserInput={handleTypeOutput}
        label={independentField === Field.INPUT && !showWrap ? <Trans>To (at least)</Trans> : <Trans>To</Trans>}
        showMaxButton={false}
        hideBalance={false}
        fiatValue={fiatValues[Field.OUTPUT]}
        priceImpact={priceImpact}
        currency={currencies[Field.OUTPUT]}
        onCurrencySelect={handleOutputSelect}
        otherCurrency={currencies[Field.INPUT]}
        showCommonBases={true}
        id="swap-currency-output"
        loading={independentField === Field.INPUT && routeIsSyncing}
      />
    </div>
  )

  const makeButton = () => (
    <div>
      {swapIsUnsupported ? (
        <ButtonPrimary disabled={true}>
          <ThemedText.Main mb="4px">
            <Trans>Unsupported Asset</Trans>
          </ThemedText.Main>
        </ButtonPrimary>
      ) : !account ? (
        <ButtonLight onClick={toggleWalletModal}>
          <Trans>Connect Wallet</Trans>
        </ButtonLight>
      ) : showWrap ? (
        <ButtonPrimary disabled={Boolean(wrapInputError)} onClick={onWrap}>
          {wrapInputError ? (
            <WrapErrorText wrapInputError={wrapInputError} />
          ) : wrapType === WrapType.WRAP ? (
            <Trans>Wrap</Trans>
          ) : wrapType === WrapType.UNWRAP ? (
            <Trans>Unwrap</Trans>
          ) : null}
        </ButtonPrimary>
      ) : routeNotFound && userHasSpecifiedInputOutput && !routeIsLoading && !routeIsSyncing ? (
        <GreyCard style={{ textAlign: 'center' }}>
          <ThemedText.Main mb="4px">
            <Trans>Insufficient liquidity for this trade.</Trans>
          </ThemedText.Main>
        </GreyCard>
      ) : showApproveFlow ? (
        <AutoRow style={{ flexWrap: 'nowrap', width: '100%' }}>
          <AutoColumn style={{ width: '100%' }} gap="12px">
            <TokenApproveOrPermitButton
              buttonId={Field.INPUT}
              amount={amountToApprove}
              deadline={transactionDeadline}
              onSignatureDataChange={setSignatureData}
              onStateChanged={setApprovalState}
              onSubmitApproval={onSubmitApproval}
            />
            <ButtonError
              onClick={() => {
                if (isExpertMode) {
                  handleSwap()
                } else {
                  setSwapState({
                    tradeToConfirm: trade,
                    attemptingTxn: false,
                    swapErrorMessage: undefined,
                    showConfirm: true,
                    txHash: undefined,
                  })
                }
              }}
              width="100%"
              id="swap-button"
              disabled={
                !isValid ||
                routeIsSyncing ||
                routeIsLoading ||
                approvalState !== ApproveOrPermitState.APPROVED ||
                priceImpactTooHigh
              }
              error={isValid && priceImpactSeverity > 2}
            >
              <Text fontSize={16} fontWeight={500}>
                {priceImpactTooHigh ? (
                  <Trans>High Price Impact</Trans>
                ) : trade && priceImpactSeverity > 2 ? (
                  <Trans>Swap Anyway</Trans>
                ) : (
                  <Trans>Swap</Trans>
                )}
              </Text>
            </ButtonError>
          </AutoColumn>
        </AutoRow>
      ) : (
        <ButtonError
          onClick={() => {
            if (isExpertMode) {
              handleSwap()
            } else {
              setSwapState({
                tradeToConfirm: trade,
                attemptingTxn: false,
                swapErrorMessage: undefined,
                showConfirm: true,
                txHash: undefined,
              })
            }
          }}
          id="swap-button"
          disabled={!isValid || routeIsSyncing || routeIsLoading || priceImpactTooHigh || !!swapCallbackError}
          error={isValid && priceImpactSeverity > 2 && !swapCallbackError}
        >
          <Text fontSize={20} fontWeight={500}>
            {swapInputError ? (
              swapInputError
            ) : routeIsSyncing || routeIsLoading ? (
              <Trans>Swap</Trans>
            ) : priceImpactSeverity > 2 ? (
              <Trans>Swap Anyway</Trans>
            ) : priceImpactTooHigh ? (
              <Trans>Price Impact Too High</Trans>
            ) : (
              <Trans>Swap</Trans>
            )}
          </Text>
        </ButtonError>
      )}
      {isExpertMode && swapErrorMessage ? <SwapCallbackError error={swapErrorMessage} /> : null}
    </div>
  )

  return (
    <>
      <TokenWarningModal
        isOpen={importTokensNotInDefault.length > 0 && !dismissTokenWarning}
        tokens={importTokensNotInDefault}
        onConfirm={handleConfirmTokenWarning}
        onDismiss={handleDismissTokenWarning}
      />
      <AppBody>
        <SwapHeader swapState={swapState} allowedSlippage={allowedSlippage} />
        <Wrapper id="swap-page">
          <ConfirmSwapModal
            isOpen={showConfirm}
            trade={trade ?? undefined}
            originalTrade={tradeToConfirm ?? undefined}
            onAcceptChanges={handleAcceptChanges}
            attemptingTxn={attemptingTxn}
            txHash={txHash}
            recipient={recipient}
            toInternalAccount={storeInInternalAccount}
            allowedSlippage={allowedSlippage}
            onConfirm={handleSwap}
            swapErrorMessage={swapErrorMessage}
            onDismiss={handleConfirmDismiss}
          />

          <AutoColumn gap={'sm'}>
            {makeInputFields()}

            {recipient !== null && !showWrap ? (
              <>
                <AutoRow justify="space-between" style={{ padding: '0 1rem' }}>
                  <ArrowWrapper clickable={false}>
                    <ArrowDown size="16" color={theme.text2} />
                  </ArrowWrapper>
                  <LinkStyledButton id="remove-recipient-button" onClick={() => onChangeRecipient(null)}>
                    <Trans>- Remove recipient</Trans>
                  </LinkStyledButton>
                </AutoRow>
                <AddressInputPanel id="recipient" value={recipient} onChange={onChangeRecipient} />
              </>
            ) : null}

            <TokenDestinationToggleRow
              padding="0.25rem"
              toInternalAccount={storeInInternalAccount}
              questionHelperContent={<Trans>Choose the destination of the swapped token.</Trans>}
              onToggle={toggleStoreInInternalAccount}
            />
            {!showWrap && userHasSpecifiedInputOutput && (trade || routeIsLoading || routeIsSyncing) && (
              <SwapDetailsDropdown
                trade={trade}
                syncing={routeIsSyncing}
                loading={routeIsLoading}
                showInverted={showInverted}
                setShowInverted={setShowInverted}
                allowedSlippage={allowedSlippage}
              />
            )}
            {makeButton()}
          </AutoColumn>
        </Wrapper>
      </AppBody>
      <AlertWrapper>
        <NetworkAlert />
      </AlertWrapper>
      <SwitchLocaleLink />
      {!swapIsUnsupported ? null : (
        <UnsupportedCurrencyFooter
          show={swapIsUnsupported}
          currencies={[currencies[Field.INPUT], currencies[Field.OUTPUT]]}
        />
      )}
    </>
  )
}
