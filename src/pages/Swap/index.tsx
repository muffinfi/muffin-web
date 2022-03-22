import { Trans } from '@lingui/macro'
import { useBestMuffinTrade } from '@muffinfi/hooks/swap/useBestTrade'
import { useSwapCallback } from '@muffinfi/hooks/swap/useSwapCallback'
import useSwapSlippageTolerance from '@muffinfi/hooks/swap/useSwapSlippageTolerance'
import { useTradeAdvancedDetails } from '@muffinfi/hooks/swap/useTradeAdvancedDetails'
import { Trade } from '@muffinfi/muffin-v1-sdk'
import { Currency, Token, TradeType } from '@uniswap/sdk-core'
import { LoadingOpacityContainer } from 'components/Loader/styled'
import { NetworkAlert } from 'components/NetworkAlert/NetworkAlert'
import { AdvancedSwapDetails } from 'components/swap/AdvancedSwapDetails'
import { AutoRouterLogo } from 'components/swap/RouterLabel'
import SwapRoute from 'components/swap/SwapRoute'
import TradePrice from 'components/swap/TradePrice'
import UnsupportedCurrencyFooter from 'components/swap/UnsupportedCurrencyFooter'
import TokenDestinationToggleRow from 'components/TokenDestinationToggleRow'
import { MouseoverTooltip, MouseoverTooltipContent } from 'components/Tooltip'
import useENS from 'hooks/useENS'
import useToggle from 'hooks/useToggle'
import JSBI from 'jsbi'
import { ReactNode, useCallback, useContext, useMemo, useState } from 'react'
import { ArrowDown, CheckCircle, HelpCircle, Info } from 'react-feather'
import ReactGA from 'react-ga'
import { RouteComponentProps } from 'react-router-dom'
import { Text } from 'rebass'
import { V3TradeState } from 'state/routing/types'
import { useCurrencyBalances } from 'state/wallet/hooks'
import styled, { ThemeContext } from 'styled-components/macro'
import AddressInputPanel from '../../components/AddressInputPanel'
import { ButtonConfirmed, ButtonError, ButtonLight, ButtonPrimary } from '../../components/Button'
import { GreyCard } from '../../components/Card'
import { AutoColumn } from '../../components/Column'
import CurrencyInputPanel from '../../components/CurrencyInputPanel'
import CurrencyLogo from '../../components/CurrencyLogo'
import Loader from '../../components/Loader'
import Row, { AutoRow, RowFixed } from '../../components/Row'
import confirmPriceImpactWithoutFee from '../../components/swap/confirmPriceImpactWithoutFee'
import ConfirmSwapModal from '../../components/swap/ConfirmSwapModal'
import {
  ArrowWrapper,
  Dots,
  ResponsiveTooltipContainer,
  SwapCallbackError,
  Wrapper,
} from '../../components/swap/styleds'
import SwapHeader from '../../components/swap/SwapHeader'
import { SwitchLocaleLink } from '../../components/SwitchLocaleLink'
import TokenWarningModal from '../../components/TokenWarningModal'
import { useAllTokens, useCurrency } from '../../hooks/Tokens'
import { ApprovalState, useApproveCallbackFromTrade } from '../../hooks/useApproveCallback'
import useENSAddress from '../../hooks/useENSAddress'
import { useERC20PermitFromTrade, UseERC20PermitState } from '../../hooks/useERC20Permit'
import useIsArgentWallet from '../../hooks/useIsArgentWallet'
import { useIsSwapUnsupported } from '../../hooks/useIsSwapUnsupported'
import { useUSDCValue } from '../../hooks/useUSDCPrice'
import useWrapCallback, { WrapType } from '../../hooks/useWrapCallback'
import { useActiveWeb3React } from '../../hooks/web3'
import { useWalletModalToggle } from '../../state/application/hooks'
import { Field } from '../../state/swap/actions'
import { tryParseAmount, useDefaultsFromURLSearch, useSwapActionHandlers, useSwapState } from '../../state/swap/hooks'
import { useExpertModeManager } from '../../state/user/hooks'
import { LinkStyledButton, ThemedText } from '../../theme'
import { isAddress } from '../../utils'
import { computeFiatValuePriceImpact } from '../../utils/computeFiatValuePriceImpact'
import { maxAmountSpend } from '../../utils/maxAmountSpend'
import { warningSeverity } from '../../utils/prices'
import AppBody from '../AppBody'

const StyledInfo = styled(Info)`
  height: 16px;
  width: 16px;
  margin-left: 4px;
  color: ${({ theme }) => theme.text3};
  :hover {
    color: ${({ theme }) => theme.text1};
  }
`

export default function Swap({ history }: RouteComponentProps) {
  const {
    independentField,
    typedValue,
    [Field.INPUT]: { currencyId: inputCurrencyId },
    [Field.OUTPUT]: { currencyId: outputCurrencyId },
    recipient,
  } = useSwapState()
  const dependentField = independentField === Field.INPUT ? Field.OUTPUT : Field.INPUT

  /*=====================================================================
   *                            CURRENCIES
   *====================================================================*/
  const currencyIn = useCurrency(inputCurrencyId)
  const currencyOut = useCurrency(outputCurrencyId)
  const currencies = {
    [Field.INPUT]: currencyIn,
    [Field.OUTPUT]: currencyOut,
  }

  /*=====================================================================
   *                          USER BALANCES
   *====================================================================*/
  const { account } = useActiveWeb3React()
  const _balanceArr = useCurrencyBalances(
    account ?? undefined,
    useMemo(() => [currencyIn ?? undefined, currencyOut ?? undefined], [currencyIn, currencyOut])
  )
  const currencyBalances = {
    [Field.INPUT]: _balanceArr[0],
    [Field.OUTPUT]: _balanceArr[1],
  }

  /*=====================================================================
   *                      PARSE SPECIFIED AMOUNT
   *====================================================================*/
  const isExactIn = independentField === Field.INPUT
  const parsedAmount = useMemo(
    () => tryParseAmount(typedValue, (isExactIn ? currencyIn : currencyOut) ?? undefined),
    [typedValue, isExactIn, currencyIn, currencyOut]
  )

  /*=====================================================================
   *                              TRADE
   *====================================================================*/
  const _tradeType = isExactIn ? TradeType.EXACT_INPUT : TradeType.EXACT_OUTPUT
  const { state: tradeState, trade } = useBestMuffinTrade(
    _tradeType,
    parsedAmount,
    (isExactIn ? currencyOut : currencyIn) ?? undefined
  )
  const slippageTolerance = useSwapSlippageTolerance(trade ?? undefined)
  const [storeInInternalAccount, toggleStoreInInternalAccount] = useToggle(true)

  /*=====================================================================
   *                       INPUT ERROR MESSAGE
   *====================================================================*/

  let inputError: ReactNode | undefined
  if (!account) {
    inputError = <Trans>Connect Wallet</Trans>
  }
  if (!parsedAmount) {
    inputError = inputError ?? <Trans>Enter an amount</Trans>
  }
  if (!currencies[Field.INPUT] || !currencies[Field.OUTPUT]) {
    inputError = inputError ?? <Trans>Select a token</Trans>
  }
  const _recipientLookup = useENS(recipient ?? undefined)
  const _to = (recipient == null ? account : _recipientLookup.address) ?? null
  const _formattedTo = isAddress(_to)
  if (!_to || !_formattedTo) {
    inputError = inputError ?? <Trans>Enter a recipient</Trans>
  }
  // if (_formattedTo && BAD_RECIPIENT_ADDRESSES[_formattedTo]) {
  //   inputError = inputError ?? <Trans>Invalid recipient</Trans>
  // }
  // check if user have enough tokens after taking account of slippage
  const _balanceIn = currencyBalances[Field.INPUT]
  const _amountIn = trade?.maximumAmountIn(slippageTolerance)
  if (_balanceIn && _amountIn && _balanceIn.lessThan(_amountIn)) {
    inputError = <Trans>Insufficient {_amountIn.currency.symbol} balance</Trans>
  }

  /*======================================================================
   *                       INPUT/OUTPUT AMOUNTS
   *====================================================================*/

  // for wrap/unwrap ETH <-> WETH
  const { wrapType, execute: onWrap, inputError: wrapInputError } = useWrapCallback(currencyIn, currencyOut, typedValue)
  const showWrap = wrapType !== WrapType.NOT_APPLICABLE

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

  /*=====================================================================
   *                           PRICE IMPACT
   *====================================================================*/

  // calculate fiat value price impact
  // note that this price impact is different from the price impact on the "AdvancedSwapDetails" tooltip
  const priceImpact =
    tradeState === V3TradeState.SYNCING
      ? undefined
      : computeFiatValuePriceImpact(fiatValues[Field.INPUT], fiatValues[Field.OUTPUT])

  const { priceImpact: executionPriceImpact } = useTradeAdvancedDetails(trade ?? undefined)

  // warnings on the greater of fiat value price impact and execution price impact
  const priceImpactSeverity = useMemo(() => {
    return warningSeverity(
      executionPriceImpact && priceImpact
        ? executionPriceImpact.greaterThan(priceImpact)
          ? executionPriceImpact
          : priceImpact
        : executionPriceImpact ?? priceImpact
    )
  }, [priceImpact, executionPriceImpact])

  // for expert mode
  const [isExpertMode] = useExpertModeManager()

  const priceImpactTooHigh = priceImpactSeverity > 3 && !isExpertMode

  /*=====================================================================
   *                          TOKEN APPROVALS
   *====================================================================*/

  // check if user has gone through approval process, used to show two step buttons, reset on token change
  const [approvalSubmitted, setApprovalSubmitted] = useState(false)

  const isArgentWallet = useIsArgentWallet()

  // NOTE: for non-permit approve
  // check whether the user has approved the router on the input token
  const [approvalState, approveCallback] = useApproveCallbackFromTrade(trade ?? undefined, slippageTolerance)

  // NOTE: fetch nonce and prepare gather permit signature functionn
  const {
    state: signatureState,
    signatureData,
    gatherPermitSignature,
  } = useERC20PermitFromTrade(trade ?? undefined, slippageTolerance)

  // show approve flow when: no error on inputs, not approved or pending, or approved in current session
  // never show if price impact is above threshold in non expert mode
  const showApproveFlow =
    !isArgentWallet &&
    !inputError &&
    (approvalState === ApprovalState.NOT_APPROVED ||
      approvalState === ApprovalState.PENDING ||
      (approvalSubmitted && approvalState === ApprovalState.APPROVED)) &&
    !(priceImpactSeverity > 3 && !isExpertMode)

  const handleApprove = useCallback(async () => {
    if (signatureState === UseERC20PermitState.NOT_SIGNED && gatherPermitSignature) {
      try {
        await gatherPermitSignature()
      } catch (error) {
        // try to approve if gatherPermitSignature failed for any reason other than the user rejecting it
        if (error?.code !== 4001) {
          await approveCallback()
        }
      }
    } else {
      await approveCallback()
      ReactGA.event({
        category: 'Swap',
        action: 'Approve',
        label: [trade?.inputAmount.currency.symbol].join('/'),
      })
    }
  }, [approveCallback, gatherPermitSignature, signatureState, trade?.inputAmount.currency.symbol])

  /*======================================================================
   *                          UI STATES
   *====================================================================*/
  const _inputCurrencyBalance = currencyBalances[Field.INPUT]
  const maxInputAmount = useMemo(() => maxAmountSpend(_inputCurrencyBalance), [_inputCurrencyBalance])
  const showMaxButton = Boolean(maxInputAmount?.greaterThan(0) && !parsedAmounts[Field.INPUT]?.equalTo(maxInputAmount))

  const theme = useContext(ThemeContext)

  const [showInverted, setShowInverted] = useState(false)

  const [routeNotFound, routeIsLoading, routeIsSyncing] = [
    !trade?.swaps,
    tradeState === V3TradeState.LOADING,
    tradeState === V3TradeState.SYNCING,
  ]

  const swapIsUnsupported = useIsSwapUnsupported(currencies[Field.INPUT], currencies[Field.OUTPUT])

  const toggleWalletModal = useWalletModalToggle()

  const userHasSpecifiedInputOutput = Boolean(
    currencies[Field.INPUT] && currencies[Field.OUTPUT] && parsedAmounts[independentField]?.greaterThan(JSBI.BigInt(0))
  )

  const isValid = !inputError

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
   *                     TOKEN WARNING MODAL (UI)
   *====================================================================*/

  const loadedUrlParams = useDefaultsFromURLSearch()
  const loadedInputCurrency = useCurrency(loadedUrlParams?.inputCurrencyId)
  const loadedOutputCurrency = useCurrency(loadedUrlParams?.outputCurrencyId)

  const urlLoadedTokens: Token[] = useMemo(
    () => [loadedInputCurrency, loadedOutputCurrency]?.filter((c): c is Token => c?.isToken ?? false) ?? [],
    [loadedInputCurrency, loadedOutputCurrency]
  )

  // dismiss warning if all imported tokens are in active lists
  const defaultTokens = useAllTokens()

  const importTokensNotInDefault =
    urlLoadedTokens && urlLoadedTokens.filter((token: Token) => !Boolean(token.address in defaultTokens))

  const [dismissTokenWarning, setDismissTokenWarning] = useState<boolean>(false)

  const handleConfirmTokenWarning = useCallback(() => {
    setDismissTokenWarning(true)
  }, [])

  // reset if they close warning without tokens in params
  const handleDismissTokenWarning = useCallback(() => {
    setDismissTokenWarning(true)
    history.push('/swap/')
  }, [history])

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
      setApprovalSubmitted(false) // reset 2 step UI for approvals
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
  const { callback: swapCallback, error: swapCallbackError } = useSwapCallback(
    trade ?? undefined,
    slippageTolerance,
    recipient,
    storeInInternalAccount,
    signatureData
  )

  const handleSwap = useCallback(() => {
    if (!swapCallback) {
      return
    }
    if (priceImpact && !confirmPriceImpactWithoutFee(priceImpact)) {
      return
    }
    setSwapState({ attemptingTxn: true, tradeToConfirm, showConfirm, swapErrorMessage: undefined, txHash: undefined })
    swapCallback()
      .then((hash) => {
        setSwapState({ attemptingTxn: false, tradeToConfirm, showConfirm, swapErrorMessage: undefined, txHash: hash })
        ReactGA.event({
          category: 'Swap',
          action:
            recipient === null
              ? 'Swap w/o Send'
              : (recipientAddress ?? recipient) === account
              ? 'Swap w/o Send + recipient'
              : 'Swap w/ Send',
          label: [trade?.inputAmount?.currency?.symbol, trade?.outputAmount?.currency?.symbol, 'MH'].join('/'),
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
  }, [swapCallback, priceImpact, tradeToConfirm, showConfirm, recipient, recipientAddress, account, trade])

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
            setApprovalSubmitted(false) // reset 2 step UI for approvals
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

  const makeAdvancedDetails = () => {
    return (
      !showWrap &&
      trade && (
        <Row justify={!trade ? 'center' : 'space-between'}>
          <RowFixed style={{ position: 'relative' }}>
            <MouseoverTooltipContent
              wrap={false}
              content={
                <ResponsiveTooltipContainer>
                  <SwapRoute trade={trade} syncing={routeIsSyncing} />
                </ResponsiveTooltipContainer>
              }
              placement="bottom"
              onOpen={() => ReactGA.event({ category: 'Swap', action: 'Router Tooltip Open' })}
            >
              <AutoRow gap="4px" width="auto">
                <AutoRouterLogo />
                <LoadingOpacityContainer $loading={routeIsSyncing}>
                  {trade.swaps.length > 1 && (
                    <ThemedText.Blue fontSize={14}>{trade.swaps.length} routes</ThemedText.Blue>
                  )}
                </LoadingOpacityContainer>
              </AutoRow>
            </MouseoverTooltipContent>
          </RowFixed>
          <RowFixed>
            <LoadingOpacityContainer $loading={routeIsSyncing}>
              <TradePrice price={trade.executionPrice} showInverted={showInverted} setShowInverted={setShowInverted} />
            </LoadingOpacityContainer>
            <MouseoverTooltipContent
              wrap={false}
              content={
                <ResponsiveTooltipContainer origin="top right" width={'295px'}>
                  <AdvancedSwapDetails trade={trade} allowedSlippage={slippageTolerance} syncing={routeIsSyncing} />
                </ResponsiveTooltipContainer>
              }
              placement="bottom"
              onOpen={() => ReactGA.event({ category: 'Swap', action: 'Transaction Details Tooltip Open' })}
            >
              <StyledInfo />
            </MouseoverTooltipContent>
          </RowFixed>
        </Row>
      )
    )
  }

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
          {wrapInputError ??
            (wrapType === WrapType.WRAP ? (
              <Trans>Wrap</Trans>
            ) : wrapType === WrapType.UNWRAP ? (
              <Trans>Unwrap</Trans>
            ) : null)}
        </ButtonPrimary>
      ) : routeIsSyncing || routeIsLoading ? (
        <GreyCard style={{ textAlign: 'center' }}>
          <ThemedText.Main mb="4px">
            <Dots>
              <Trans>Loading</Trans>
            </Dots>
          </ThemedText.Main>
        </GreyCard>
      ) : routeNotFound && userHasSpecifiedInputOutput ? (
        <GreyCard style={{ textAlign: 'center' }}>
          <ThemedText.Main mb="4px">
            <Trans>Insufficient liquidity for this trade.</Trans>
          </ThemedText.Main>
        </GreyCard>
      ) : showApproveFlow ? (
        <AutoRow style={{ flexWrap: 'nowrap', width: '100%' }}>
          <AutoColumn style={{ width: '100%' }} gap="12px">
            <ButtonConfirmed
              onClick={handleApprove}
              disabled={
                approvalState !== ApprovalState.NOT_APPROVED ||
                approvalSubmitted ||
                signatureState === UseERC20PermitState.SIGNED
              }
              width="100%"
              altDisabledStyle={approvalState === ApprovalState.PENDING} // show solid button while waiting
              confirmed={approvalState === ApprovalState.APPROVED || signatureState === UseERC20PermitState.SIGNED}
            >
              <AutoRow justify="space-between" style={{ flexWrap: 'nowrap' }}>
                <span style={{ display: 'flex', alignItems: 'center' }}>
                  <CurrencyLogo
                    currency={currencies[Field.INPUT]}
                    size={'20px'}
                    style={{ marginRight: '8px', flexShrink: 0 }}
                  />
                  {/* we need to shorten this string on mobile */}
                  {approvalState === ApprovalState.APPROVED || signatureState === UseERC20PermitState.SIGNED ? (
                    <Trans>You can now trade {currencies[Field.INPUT]?.symbol}</Trans>
                  ) : (
                    <Trans>Allow the Muffin Protocol to use your {currencies[Field.INPUT]?.symbol}</Trans>
                  )}
                </span>
                {approvalState === ApprovalState.PENDING ? (
                  <Loader stroke="white" />
                ) : (approvalSubmitted && approvalState === ApprovalState.APPROVED) ||
                  signatureState === UseERC20PermitState.SIGNED ? (
                  <CheckCircle size="20" color={theme.green1} />
                ) : (
                  <MouseoverTooltip
                    text={
                      <Trans>
                        You must give the Muffin smart contracts permission to use your{' '}
                        {currencies[Field.INPUT]?.symbol}. You only have to do this once per token.
                      </Trans>
                    }
                  >
                    <HelpCircle size="20" color={'white'} style={{ marginLeft: '8px' }} />
                  </MouseoverTooltip>
                )}
              </AutoRow>
            </ButtonConfirmed>
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
                (approvalState !== ApprovalState.APPROVED && signatureState !== UseERC20PermitState.SIGNED) ||
                priceImpactTooHigh
              }
              error={isValid && priceImpactSeverity > 2}
            >
              <Text fontSize={16} fontWeight={500}>
                {priceImpactTooHigh ? (
                  <Trans>High Price Impact</Trans>
                ) : priceImpactSeverity > 2 ? (
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
          disabled={!isValid || priceImpactTooHigh || !!swapCallbackError}
          error={isValid && priceImpactSeverity > 2 && !swapCallbackError}
        >
          <Text fontSize={20} fontWeight={500}>
            {inputError ? (
              inputError
            ) : priceImpactTooHigh ? (
              <Trans>Price Impact Too High</Trans>
            ) : priceImpactSeverity > 2 ? (
              <Trans>Swap Anyway</Trans>
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
      <NetworkAlert />
      <AppBody>
        <SwapHeader allowedSlippage={slippageTolerance} />
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
            allowedSlippage={slippageTolerance}
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
            {makeAdvancedDetails()}
            {makeButton()}
          </AutoColumn>
        </Wrapper>
      </AppBody>
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
