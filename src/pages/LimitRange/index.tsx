import { Trans } from '@lingui/macro'
import { useHubContract, useManagerContract } from '@muffinfi/hooks/useContract'
import { useLimitOrderTickSpacingMultipliers, useMuffinPool } from '@muffinfi/hooks/usePools'
import { useSettlement } from '@muffinfi/hooks/useSettlements'
import {
  LimitOrderType,
  MAX_TICK,
  MIN_TICK,
  nearestUsableTick,
  PermitOptions,
  Position,
  PositionManager,
  priceToClosestTick,
  tickToPrice,
  ZERO,
} from '@muffinfi/muffin-v1-sdk'
import { useIsUsingInternalAccount } from '@muffinfi/state/user/hooks'
import { BalanceSource } from '@muffinfi/state/wallet/hooks'
import { Currency, CurrencyAmount, Percent, Price, Rounding, Token } from '@uniswap/sdk-core'
import { Wrapper } from 'components/account/styleds'
import AddressInputPanel from 'components/AddressInputPanel'
import { ButtonError, ButtonLight, ButtonPrimary } from 'components/Button'
import { AutoColumn } from 'components/Column'
import CurrencyInputPanel from 'components/CurrencyInputPanel'
import StepCounter from 'components/InputStepCounter/InputStepCounter'
import { NetworkAlert } from 'components/NetworkAlert/NetworkAlert'
import RateToggle from 'components/RateToggle'
import { AutoRow, RowBetween, RowFixed } from 'components/Row'
import { ArrowWrapper } from 'components/swap/styleds'
import SwapHeader from 'components/swap/SwapHeader'
import UnsupportedCurrencyFooter from 'components/swap/UnsupportedCurrencyFooter'
import { SwitchLocaleLink } from 'components/SwitchLocaleLink'
import TokenWarningModal from 'components/TokenWarningModal'
import TransactionConfirmationModal, { ConfirmationModalContent } from 'components/TransactionConfirmationModal'
import { BAD_RECIPIENT_ADDRESSES } from 'constants/addresses'
import { ZERO_PERCENT } from 'constants/misc'
import { WRAPPED_NATIVE_CURRENCY } from 'constants/tokens'
import { useAllTokens } from 'hooks/Tokens'
import useActiveWeb3React from 'hooks/useActiveWeb3React'
import { useArgentWalletContract } from 'hooks/useArgentWalletContract'
import usePrevious from 'hooks/usePrevious'
import useTheme from 'hooks/useTheme'
import useTransactionDeadline from 'hooks/useTransactionDeadline'
import { useUSDCValue } from 'hooks/useUSDCPrice'
import JSBI from 'jsbi'
import TokenApproveOrPermitButton from 'lib/components/TokenApproveOrPermitButton'
import { ApproveOrPermitState } from 'lib/hooks/useApproveOrPermit'
import useCurrency from 'lib/hooks/useCurrency'
import useCurrencyBalance from 'lib/hooks/useCurrencyBalance'
import useOutstandingAmountToApprove from 'lib/hooks/useOutstandingAmountToApprove'
import { SignatureData } from 'lib/utils/erc20Permit'
import tryParseCurrencyAmount from 'lib/utils/tryParseCurrencyAmount'
import AppBody from 'pages/AppBody'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { ArrowDown } from 'react-feather'
import ReactGA from 'react-ga'
import { RouteComponentProps } from 'react-router-dom'
import { Text } from 'rebass'
import { useWalletModalToggle } from 'state/application/hooks'
import { Field } from 'state/swap/actions'
import { tryParseAmount, useDefaultsFromURLSearch, useSwapActionHandlers, useSwapState } from 'state/swap/hooks'
import { TransactionType } from 'state/transactions/actions'
import { useTransactionAdder } from 'state/transactions/hooks'
import { useExpertModeManager } from 'state/user/hooks'
import styled from 'styled-components/macro'
import { LinkStyledButton, ThemedText } from 'theme'
import { isAddress } from 'utils'
import approveAmountCalldata from 'utils/approveAmountCalldata'
import { calculateGasMargin } from 'utils/calculateGasMargin'
import { currencyId } from 'utils/currencyId'
import { getTickToPrice } from 'utils/getTickToPrice'
import { maxAmountSpend } from 'utils/maxAmountSpend'

const DEFAULT_ADD_IN_RANGE_SLIPPAGE_TOLERANCE = new Percent(50, 10_000)

const AlertWrapper = styled.div`
  max-width: 460px;
  width: 100%;
`

const StepCountersRow = styled(RowBetween)`
  column-gap: 8px;
`

export default function LimitRange({ history }: RouteComponentProps) {
  const { account, chainId, library } = useActiveWeb3React()

  /*=====================================================================
   *                            SWAP STATE
   *====================================================================*/

  const [isExpertMode] = useExpertModeManager()

  const swapState = useSwapState()
  const {
    independentField,
    typedValue,
    [Field.INPUT]: { currencyId: inputCurrencyId },
    [Field.OUTPUT]: { currencyId: outputCurrencyId },
    recipient,
  } = swapState
  const dependentField = independentField === Field.INPUT ? Field.OUTPUT : Field.INPUT

  const inputCurrency: Currency | undefined = useCurrency(inputCurrencyId) ?? undefined
  const outputCurrency: Currency | undefined = (useCurrency(outputCurrencyId) ?? undefined)?.wrapped
  const isExactIn = independentField === Field.INPUT

  /*=====================================================================
   *                              POOL
   *====================================================================*/

  const hubContract = useHubContract()
  const [, pool] = useMuffinPool(inputCurrency, outputCurrency)
  const tickSpacingMultipliers = useLimitOrderTickSpacingMultipliers(hubContract, pool)
  const [tierId, setTierId] = useState<number | undefined>()
  const isValidTier = useMemo(
    () => tierId != null && (tickSpacingMultipliers?.[tierId] ?? 0) > 0,
    [tierId, tickSpacingMultipliers]
  )
  const defaultTierIndex = useMemo(() => {
    const tierIndex = tickSpacingMultipliers?.findIndex((val) => (val ?? 0) > 0) ?? -1
    return tierIndex > -1 ? tierIndex : undefined
  }, [tickSpacingMultipliers])
  const selectedTier =
    ((tierId != null && pool?.tiers[tierId]) ?? (defaultTierIndex != null && pool?.tiers[defaultTierIndex])) ||
    undefined

  const tokenA = inputCurrency?.wrapped
  const tokenB = outputCurrency?.wrapped

  const [token0, token1, currency0, currency1, zeroForOne] =
    tokenA && tokenB
      ? tokenA.sortsBefore(tokenB)
        ? [tokenA, tokenB, inputCurrency, outputCurrency, true]
        : [tokenB, tokenA, outputCurrency, inputCurrency, false]
      : [undefined, undefined, undefined, undefined, undefined]

  // set default tier id
  useEffect(() => {
    if (isValidTier) return
    setTierId(defaultTierIndex)
  }, [defaultTierIndex, isValidTier])

  /*======================================================================
   *                          RATE AND PRICE
   *====================================================================*/

  const [endPriceInverted, setEndPriceInverted] = useState(false)
  const [endPriceTypedAmount, setEndPriceTypedAmount] = useState('')
  const quoteCurrency = endPriceInverted ? currency0 : currency1
  const baseCurrency = endPriceInverted ? currency1 : currency0
  const quoteToken = endPriceInverted ? token0 : token1
  const baseToken = endPriceInverted ? token1 : token0

  const endPrice0 = useMemo(() => {
    const quoteAmount = tryParseAmount(endPriceTypedAmount, quoteToken)
    const baseAmount = tryParseAmount('1', baseToken)
    if (!quoteAmount || !baseAmount || !quoteToken || !baseToken) return undefined

    const price = new Price(baseAmount.currency, quoteAmount.currency, baseAmount.quotient, quoteAmount.quotient)
    return endPriceInverted ? price?.invert() : price
  }, [endPriceTypedAmount, endPriceInverted, quoteToken, baseToken])

  const endTick = useMemo(
    () =>
      endPrice0 && pool?.tickSpacing ? nearestUsableTick(priceToClosestTick(endPrice0), pool.tickSpacing) : undefined,
    [endPrice0, pool?.tickSpacing]
  )

  const { tickSpacing: settlementTickSpacing }: Partial<ReturnType<typeof useSettlement>> =
    useSettlement(hubContract, pool, tierId, endTick, !!zeroForOne) ?? {}

  const tickSpacingMultiplier = useMemo(() => {
    const multiplier = settlementTickSpacing || (isValidTier && tierId != null && tickSpacingMultipliers?.[tierId])
    return typeof multiplier === 'number' ? multiplier : undefined
  }, [isValidTier, settlementTickSpacing, tickSpacingMultipliers, tierId])

  const fullTickSpacing = useMemo(
    () => (pool?.tickSpacing && tickSpacingMultiplier ? tickSpacingMultiplier * pool.tickSpacing : undefined),
    [pool?.tickSpacing, tickSpacingMultiplier]
  )

  const startTick = useMemo(() => {
    if (!fullTickSpacing || !selectedTier || endTick == null || !tickSpacingMultiplier) return undefined
    return zeroForOne ? endTick - fullTickSpacing : endTick + fullTickSpacing
  }, [endTick, fullTickSpacing, selectedTier, tickSpacingMultiplier, zeroForOne])

  const startPrice0 = useMemo(
    () => token0 && token1 && getTickToPrice(token0, token1, startTick),
    [startTick, token0, token1]
  )

  const handleRateToggle = useCallback(() => {
    setEndPriceInverted(!endPriceInverted)
    setEndPriceTypedAmount((endPriceInverted ? endPrice0 : endPrice0?.invert())?.toSignificant(6) ?? '')
  }, [endPrice0, endPriceInverted])

  const tickLimits: {
    LOWER?: number
    UPPER?: number
    END?: number
  } = useMemo(() => {
    const tickSpacing = pool?.tickSpacing
    const currentTick = selectedTier?.computedTick
    if (!tickSpacing || currentTick == null || fullTickSpacing == null) return {}
    const limits = zeroForOne
      ? {
          LOWER: nearestUsableTick(currentTick, tickSpacing) + fullTickSpacing + tickSpacing,
          UPPER: nearestUsableTick(MAX_TICK, tickSpacing),
          END: 0,
        }
      : {
          LOWER: nearestUsableTick(MIN_TICK, tickSpacing),
          UPPER: nearestUsableTick(currentTick, tickSpacing) - fullTickSpacing - tickSpacing,
          END: 0,
        }
    limits.END = zeroForOne ? limits.LOWER : limits.UPPER
    return limits
  }, [pool?.tickSpacing, fullTickSpacing, selectedTier?.computedTick, zeroForOne])

  const { areEndPriceAtLimit, isInvalidPriceRange } = useMemo(() => {
    const ticks =
      startTick != null && endTick != null
        ? {
            LOWER: Math.min(startTick, endTick),
            UPPER: Math.max(startTick, endTick),
          }
        : {}
    const areEndPriceAtLimit = {
      LOWER: tickLimits.LOWER != null && ticks.LOWER != null && endTick != null && endTick <= tickLimits.LOWER,
      UPPER: tickLimits.UPPER != null && ticks.UPPER != null && endTick != null && endTick >= tickLimits.UPPER,
    }
    const isInvalidPriceRange =
      endTick == null || tickLimits.LOWER == null || tickLimits.UPPER == null
        ? false
        : zeroForOne
        ? endTick < tickLimits.LOWER
        : endTick > tickLimits.UPPER
    return { ticks, areEndPriceAtLimit, isInvalidPriceRange }
  }, [endTick, startTick, tickLimits.LOWER, tickLimits.UPPER, zeroForOne])

  const handlePriceIncrement = useCallback(() => {
    if (!pool?.tickSpacing || tickLimits.END == null || !baseToken || !quoteToken) {
      return endPriceTypedAmount
    }
    const newPrice = tickToPrice(
      baseToken,
      quoteToken,
      endTick != null && !isInvalidPriceRange
        ? endTick + pool.tickSpacing * (endPriceInverted ? -1 : 1)
        : tickLimits.END
    )
    return newPrice.toFixed(quoteToken.decimals, undefined, zeroForOne ? Rounding.ROUND_DOWN : Rounding.ROUND_UP) ?? ''
  }, [
    pool?.tickSpacing,
    tickLimits.END,
    baseToken,
    quoteToken,
    endTick,
    isInvalidPriceRange,
    endPriceInverted,
    zeroForOne,
    endPriceTypedAmount,
  ])

  const handlePriceDecrement = useCallback(() => {
    if (!pool?.tickSpacing || tickLimits.END == null || !baseToken || !quoteToken) {
      return endPriceTypedAmount
    }
    const newPrice = tickToPrice(
      baseToken,
      quoteToken,
      endTick != null && !isInvalidPriceRange
        ? endTick - pool.tickSpacing * (endPriceInverted ? -1 : 1)
        : tickLimits.END
    )
    return newPrice.toFixed(quoteToken.decimals, undefined, zeroForOne ? Rounding.ROUND_UP : Rounding.ROUND_DOWN) ?? ''
  }, [
    pool?.tickSpacing,
    tickLimits.END,
    baseToken,
    quoteToken,
    endTick,
    isInvalidPriceRange,
    endPriceInverted,
    zeroForOne,
    endPriceTypedAmount,
  ])

  const previousPool = usePrevious(pool)
  useEffect(() => {
    if (!pool || !selectedTier || !baseToken || !quoteToken) return
    if (previousPool === pool && endPriceTypedAmount) return
    setEndPriceTypedAmount(
      getTickToPrice(baseToken, quoteToken, tickLimits.END)?.toFixed(
        quoteToken.decimals,
        undefined,
        Rounding.ROUND_UP
      ) ?? ''
    )
  }, [pool, selectedTier, baseToken, endPriceInverted, quoteToken, previousPool, endPriceTypedAmount, tickLimits.END])

  /*======================================================================
   *                              POSITION
   *====================================================================*/

  const parsedAmount = useMemo(
    () =>
      (tryParseCurrencyAmount(typedValue, isExactIn ? inputCurrency : outputCurrency) as CurrencyAmount<Currency>) ??
      undefined,
    [inputCurrency, isExactIn, outputCurrency, typedValue]
  )

  const position = useMemo(() => {
    if (!pool || !tokenA || !parsedAmount || tierId == null || endTick == null || startTick == null) {
      return undefined
    }

    const [tickLower, tickUpper] = startTick > endTick ? [endTick, startTick] : [startTick, endTick]
    const limitOrderType = zeroForOne ? LimitOrderType.ZeroForOne : LimitOrderType.OneForZero

    if (isExactIn) {
      return Position.fromAmounts({
        pool,
        tierId,
        tickLower,
        tickUpper,
        amount0: zeroForOne ? parsedAmount.quotient : ZERO,
        amount1: zeroForOne ? ZERO : parsedAmount.quotient,
        limitOrderType,
      })
    }

    return Position.fromLimitOrderExactOutput({
      pool,
      tierId,
      tickLower,
      tickUpper,
      amount0: zeroForOne ? ZERO : parsedAmount.quotient,
      amount1: zeroForOne ? parsedAmount.quotient : ZERO,
      limitOrderType,
    })
  }, [endTick, zeroForOne, isExactIn, parsedAmount, pool, startTick, tierId, tokenA])

  const averagePrice0 = useMemo(() => {
    if (!position || !token0 || !token1) return undefined
    const { amount0: mintAmount0, amount1: mintAmount1 } = position.mintAmounts
    const { amount0: settleAmount0, amount1: settleAmount1 } = position.settleAmounts
    const settleAmount = zeroForOne ? settleAmount1 : settleAmount0
    if (!settleAmount) return undefined
    return new Price(
      token0,
      token1,
      (zeroForOne ? mintAmount0 : settleAmount).toString(),
      (!zeroForOne ? mintAmount1 : settleAmount).toString()
    )
  }, [zeroForOne, position, token0, token1])

  /*======================================================================
   *                       INPUT/OUTPUT AMOUNTS
   *====================================================================*/

  // parse trade input and output amounts
  const parsedAmounts = useMemo(() => {
    let rawAmount: JSBI | undefined = undefined
    return {
      [Field.INPUT]:
        independentField === Field.INPUT
          ? parsedAmount
          : inputCurrency &&
            (rawAmount = zeroForOne ? position?.mintAmounts.amount0 : position?.mintAmounts.amount1) &&
            CurrencyAmount.fromRawAmount(inputCurrency, rawAmount.toString()),
      [Field.OUTPUT]:
        independentField === Field.OUTPUT
          ? parsedAmount
          : outputCurrency &&
            (rawAmount = zeroForOne ? position?.settleAmounts.amount1 : position?.settleAmounts.amount0) &&
            CurrencyAmount.fromRawAmount(outputCurrency, rawAmount.toString()),
    }
  }, [independentField, inputCurrency, outputCurrency, parsedAmount, position, zeroForOne])

  // make formated input and output amounts
  const formattedAmounts = useMemo(() => {
    return {
      [independentField]: typedValue,
      [dependentField]: parsedAmounts[dependentField]?.toSignificant(6) ?? '',
    }
  }, [dependentField, independentField, parsedAmounts, typedValue])

  // compute fiat value of input and output amounts
  const fiatValues = {
    [Field.INPUT]: useUSDCValue(parsedAmounts[Field.INPUT]) ?? undefined,
    [Field.OUTPUT]: useUSDCValue(parsedAmounts[Field.OUTPUT]) ?? undefined,
  }

  const inputBalance = useCurrencyBalance(account ?? undefined, inputCurrency)

  const maxInputAmount = useMemo(() => maxAmountSpend(inputBalance), [inputBalance])
  const showMaxButton = Boolean(maxInputAmount?.greaterThan(0) && !parsedAmounts[Field.INPUT]?.equalTo(maxInputAmount))

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

  const handleCurrencySelect = useCallback(
    (currencyNew: Currency, currencyIdOther?: string): (string | undefined)[] => {
      const currencyIdNew = currencyId(currencyNew)

      if (currencyIdNew === currencyIdOther) {
        // not ideal, but for now clobber the other if the currency ids are equal
        return [currencyIdNew, undefined]
      } else {
        // prevent weth + eth
        const isETHOrWETHNew =
          currencyIdNew === 'ETH' ||
          (chainId !== undefined && currencyIdNew === WRAPPED_NATIVE_CURRENCY[chainId]?.address)
        const isETHOrWETHOther =
          currencyIdOther !== undefined &&
          (currencyIdOther === 'ETH' ||
            (chainId !== undefined && currencyIdOther === WRAPPED_NATIVE_CURRENCY[chainId]?.address))

        if (isETHOrWETHNew && isETHOrWETHOther) {
          return [currencyIdNew, undefined]
        } else {
          return [currencyIdNew, currencyIdOther]
        }
      }
    },
    [chainId]
  )

  const handleInputSelect = useCallback(
    (currencyANew: Currency) => {
      if (outputCurrencyId) {
        const [, idB] = handleCurrencySelect(currencyANew, outputCurrencyId)
        if (idB === undefined) {
          onSwitchTokens()
        }
      }
      onCurrencySelection(Field.INPUT, currencyANew)
    },
    [handleCurrencySelect, onCurrencySelection, onSwitchTokens, outputCurrencyId]
  )

  const handleOutputSelect = useCallback(
    (currencyANew: Currency) => {
      if (inputCurrencyId) {
        const [, idB] = handleCurrencySelect(currencyANew, inputCurrencyId)
        if (idB === 'ETH') {
          onCurrencySelection(Field.OUTPUT, currencyANew.wrapped)
          return
        }
        if (idB === undefined) {
          onSwitchTokens()
        }
      }
      onCurrencySelection(Field.OUTPUT, currencyANew)
    },
    [handleCurrencySelect, onCurrencySelection, onSwitchTokens, inputCurrencyId]
  )

  const handleMaxInput = useCallback(() => {
    maxInputAmount && onUserInput(Field.INPUT, maxInputAmount.toExact())
    ReactGA.event({ category: 'Limit Range', action: 'Max' })
  }, [maxInputAmount, onUserInput])

  const formattedRecipient = recipient && isAddress(recipient)
  const noRecipient = recipient && !formattedRecipient
  const invalidRecipient = Boolean(
    chainId && formattedRecipient && BAD_RECIPIENT_ADDRESSES[chainId]?.[formattedRecipient]
  )

  /*=====================================================================
   *                          TOKEN APPROVALS
   *====================================================================*/

  const argentWalletContract = useArgentWalletContract()
  const transactionDeadline = useTransactionDeadline()
  const amountToApprove = useOutstandingAmountToApprove(account ?? undefined, parsedAmounts[Field.INPUT])
  const [signatureData, setSignatureData] = useState<SignatureData | null>(null)
  const [approvalState, setApprovalState] = useState<ApproveOrPermitState | null>(null)

  const onSubmitApproval = useCallback(() => {
    ReactGA.event({
      category: 'Limit Range',
      action: 'Approve',
      label: inputCurrency?.symbol,
    })
  }, [inputCurrency?.symbol])

  /*=====================================================================
   *                     TOKEN WARNING MODAL (UI)
   *====================================================================*/

  const loadedUrlParams = useDefaultsFromURLSearch()
  const loadedInputCurrency = useCurrency(loadedUrlParams?.[Field.INPUT].currencyId)
  const loadedOutputCurrency = useCurrency(loadedUrlParams?.[Field.OUTPUT].currencyId)?.wrapped

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
    history.push('/limit-range/')
  }, [history])

  /*=====================================================================
   *                        MINT CONFIRMATION
   *====================================================================*/

  const insufficientFunding = maxInputAmount && parsedAmounts[Field.INPUT]?.greaterThan(maxInputAmount)
  const isInvalidTypedAmount = !(
    parsedAmounts[Field.INPUT]?.greaterThan(0) && parsedAmounts[Field.OUTPUT]?.greaterThan(0)
  )
  const isInvalidPrice = !endPriceTypedAmount || !endPrice0
  const manager = useManagerContract()

  const tryInternalAccount = useIsUsingInternalAccount()
  const internalBalance = useCurrencyBalance(account ?? undefined, tokenA, BalanceSource.INTERNAL_ACCOUNT)

  const addTransaction = useTransactionAdder()

  // tx confirm modal
  const [showTxModalConfirm, setShowTxModalConfirm] = useState(false)
  const [isAttemptingTxn, setIsAttemptingTxn] = useState(false) // i.e. clicked confirm

  // hash of ongoing tx
  const [txHash, setTxHash] = useState('')

  const onAdd = useCallback(async () => {
    if (!chainId || !library || !account) return
    if (!inputCurrency || !outputCurrency || !manager || !position || !transactionDeadline) return

    const useNative = inputCurrency.isNative ? inputCurrency : outputCurrency.isNative ? outputCurrency : undefined
    const useAccount = tryInternalAccount && (internalBalance?.greaterThan(0) ?? false)

    const { calldata, value } = PositionManager.addCallParameters(position, {
      recipient: recipient ?? account,
      createPool: false,
      useAccount,
      slippageTolerance: ZERO_PERCENT,
      useNative,
      token0Permit: (signatureData as PermitOptions) ?? undefined,
    })

    let txn = { to: manager.address, data: calldata, value }

    if (argentWalletContract) {
      const batch = [
        ...(amountToApprove && amountToApprove.currency.isToken
          ? [approveAmountCalldata(amountToApprove, manager.address)]
          : []),
        { ...txn },
      ]
      const data = argentWalletContract.interface.encodeFunctionData('wc_multiCall', [batch])
      txn = { to: argentWalletContract.address, data, value: '0x0' }
    }

    try {
      setIsAttemptingTxn(true)
      const gasEst = await library.getSigner().estimateGas(txn)
      const response = await library.getSigner().sendTransaction({ ...txn, gasLimit: calculateGasMargin(gasEst) })
      setIsAttemptingTxn(false)

      addTransaction(response, {
        type: TransactionType.ADD_LIQUIDITY_MUFFIN,
        createPool: false,
        baseCurrencyId: currencyId(inputCurrency),
        quoteCurrencyId: currencyId(outputCurrency),
        tierId: position.tierId,
        sqrtGamma: position.poolTier.sqrtGamma,
        expectedAmountBaseRaw: parsedAmounts[Field.INPUT]?.quotient?.toString() ?? '0',
        expectedAmountQuoteRaw: '0',
      })
      setTxHash(response.hash)

      ReactGA.event({
        category: 'Liquidity',
        action: 'Add',
        label: [inputCurrency?.symbol, outputCurrency?.symbol].join('/'),
      })

      const receipt = await response.wait()
      console.log({ receipt, response })
    } catch (error) {
      setIsAttemptingTxn(false)
      console.error('Failed to send transaction', error)
    }
  }, [
    account,
    addTransaction,
    amountToApprove,
    argentWalletContract,
    chainId,
    inputCurrency,
    internalBalance,
    library,
    manager,
    outputCurrency,
    parsedAmounts,
    position,
    signatureData,
    transactionDeadline,
    tryInternalAccount,
    recipient,
  ])

  const handleDismissConfirmation = useCallback(() => {
    setShowTxModalConfirm(false)
    // if there was a tx hash, we want to clear the input
    if (txHash) {
      onUserInput(Field.INPUT, '')
      history.push('/limit-range') // jump to position listing page after creating
    }
    setTxHash('')
  }, [history, onUserInput, txHash])

  /*=====================================================================
   *                         REACT COMPONENT
   *====================================================================*/

  const theme = useTheme()
  const toggleWalletModal = useWalletModalToggle()

  const makeInputFields = () => (
    <AutoColumn gap="md">
      <CurrencyInputPanel
        label={independentField === Field.OUTPUT ? <Trans>Sell (at most)</Trans> : <Trans>Sell</Trans>}
        value={formattedAmounts[Field.INPUT]}
        showMaxButton={showMaxButton}
        currency={inputCurrency ?? null}
        onUserInput={handleTypeInput}
        onMax={handleMaxInput}
        fiatValue={fiatValues[Field.INPUT]}
        onCurrencySelect={handleInputSelect}
        otherCurrency={outputCurrency}
        showCommonBases
        id="limit-range-currency-input"
      />
      <StepCountersRow>
        <StepCounter
          value={endPriceTypedAmount}
          onUserInput={setEndPriceTypedAmount}
          decrement={handlePriceDecrement}
          increment={handlePriceIncrement}
          decrementDisabled={areEndPriceAtLimit[endPriceInverted ? 'UPPER' : 'LOWER']}
          incrementDisabled={areEndPriceAtLimit[endPriceInverted ? 'LOWER' : 'UPPER']}
          // label={leftPrice ? `${currencyB?.symbol}` : '-'}
          title={<Trans>End Price</Trans>}
          tokenA={baseCurrency?.symbol}
          tokenB={quoteCurrency?.symbol}
          handleChangeImmediately
          disablePulsing
        />
        <div>
          <ArrowWrapper clickable>
            <ArrowDown
              size="16"
              onClick={() => {
                onSwitchTokens()
              }}
              color={inputCurrency && outputCurrency ? theme.text1 : theme.text3}
            />
          </ArrowWrapper>
        </div>
        <StepCounter
          value={(endPriceInverted ? startPrice0?.invert() : startPrice0)?.toSignificant(6) ?? ''}
          onUserInput={() => null}
          decrement={() => ''}
          increment={() => ''}
          decrementDisabled
          incrementDisabled
          locked
          title={<Trans>Start Price</Trans>}
          tokenA={baseCurrency?.symbol}
          tokenB={quoteCurrency?.symbol}
          disablePulsing
        />
      </StepCountersRow>
      <CurrencyInputPanel
        value={formattedAmounts[Field.OUTPUT]}
        onUserInput={handleTypeOutput}
        label={independentField === Field.INPUT ? <Trans>Buy (at least)</Trans> : <Trans>Buy</Trans>}
        showMaxButton={false}
        hideBalance={false}
        fiatValue={fiatValues[Field.OUTPUT]}
        currency={outputCurrency ?? null}
        onCurrencySelect={handleOutputSelect}
        otherCurrency={inputCurrency}
        disableNonToken
        showCommonBases
        id="limit-range-currency-output"
      />
    </AutoColumn>
  )

  const makeButton = () => (
    <div>
      <AutoRow style={{ flexWrap: 'nowrap', width: '100%' }}>
        <AutoColumn style={{ width: '100%' }} gap="12px">
          <TokenApproveOrPermitButton
            buttonId={Field.INPUT}
            amount={amountToApprove}
            deadline={transactionDeadline}
            hidden={!pool || Boolean(argentWalletContract) || !account || !parsedAmounts[Field.INPUT]}
            onSignatureDataChange={setSignatureData}
            onStateChanged={setApprovalState}
            onSubmitApproval={onSubmitApproval}
          />
          {!pool ? (
            <ButtonPrimary disabled={true}>
              <ThemedText.Main mb="4px">
                <Trans>Unsupported Asset</Trans>
              </ThemedText.Main>
            </ButtonPrimary>
          ) : !account ? (
            <ButtonLight onClick={toggleWalletModal}>
              <Trans>Connect Wallet</Trans>
            </ButtonLight>
          ) : (
            <ButtonError
              onClick={() => {
                !isExpertMode ? onAdd() : setShowTxModalConfirm(true)
              }}
              width="100%"
              id="swap-button"
              disabled={
                isInvalidPriceRange ||
                isInvalidPrice ||
                insufficientFunding ||
                isInvalidTypedAmount ||
                noRecipient ||
                invalidRecipient ||
                approvalState !== ApproveOrPermitState.APPROVED
              }
              error={isInvalidPriceRange || isInvalidPrice || insufficientFunding || invalidRecipient}
            >
              <Text fontSize={20} fontWeight={500}>
                {isInvalidPriceRange ? (
                  <Trans>Invalid price range</Trans>
                ) : isInvalidPrice ? (
                  <Trans>Invalid price</Trans>
                ) : insufficientFunding ? (
                  <Trans>Insufficient {inputCurrency?.symbol} balance</Trans>
                ) : isInvalidTypedAmount ? (
                  <Trans>Enter an amount</Trans>
                ) : noRecipient ? (
                  <Trans>Enter a recipient</Trans>
                ) : invalidRecipient ? (
                  <Trans>Invalid recipient</Trans>
                ) : (
                  <Trans>Swap</Trans>
                )}
              </Text>
            </ButtonError>
          )}
        </AutoColumn>
      </AutoRow>
      {/* {isExpertMode && swapErrorMessage ? <SwapCallbackError error={swapErrorMessage} /> : null} */}
    </div>
  )

  const makeTransactionModal = () => (
    <TransactionConfirmationModal
      isOpen={showTxModalConfirm}
      onDismiss={handleDismissConfirmation}
      attemptingTxn={isAttemptingTxn}
      hash={txHash}
      content={() => (
        <ConfirmationModalContent
          title={<Trans>Limit Range Order</Trans>}
          onDismiss={handleDismissConfirmation}
          topContent={() => {
            // if (!pool) return null
            // const tickLimits = {
            //   LOWER: nearestUsableTick(MIN_TICK, pool.tickSpacing),
            //   UPPER: nearestUsableTick(MAX_TICK, pool.tickSpacing),
            // }
            // const ticks = {
            //   LOWER: startTick != null && endTick != null && Math.min(startTick, endTick),
            //   UPPER: startTick != null && endTick != null && Math.max(startTick, endTick),
            // }
            // return (
            //   <Review
            //     parsedAmounts={{
            //       CURRENCY_A: parsedAmounts[Field.INPUT],
            //       CURRENCY_B: parsedAmounts[Field.OUTPUT],
            //     }}
            //     position={position}
            //     priceLower={priceLower}
            //     priceUpper={priceUpper}
            //     outOfRange
            //     ticksAtLimit={{
            //       LOWER: tickLimits.LOWER != null && ticks.LOWER != null && ticks.LOWER <= tickLimits.LOWER,
            //       UPPER: tickLimits.UPPER != null && ticks.UPPER != null && ticks.UPPER >= tickLimits.UPPER,
            //     }}
            //   />
            // )
            return null
          }}
          bottomContent={() => (
            <ButtonPrimary style={{ marginTop: '1rem' }} onClick={onAdd}>
              <Text fontWeight={500} fontSize={20}>
                <Trans>Add</Trans>
              </Text>
            </ButtonPrimary>
          )}
        />
      )}
      pendingText={`Adding limit order for swapping ${parsedAmounts[Field.INPUT]?.toSignificant(4)} ${
        parsedAmounts[Field.INPUT]?.currency.symbol
      } to ${parsedAmounts[Field.OUTPUT]?.toSignificant(4)} ${parsedAmounts[Field.OUTPUT]?.currency.symbol}`}
    />
  )

  const makeRateToggle = () =>
    baseCurrency &&
    quoteCurrency && (
      <RateToggle currencyA={quoteCurrency} currencyB={baseCurrency} handleRateToggle={handleRateToggle} />
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
        <SwapHeader
          swapState={swapState}
          allowedSlippage={DEFAULT_ADD_IN_RANGE_SLIPPAGE_TOLERANCE}
          extraContents={makeRateToggle}
        />
        <Wrapper id="limit-range-page">
          {makeTransactionModal()}

          <AutoColumn gap="md">
            {makeInputFields()}
            <RowBetween padding="0 8px">
              <RowFixed>
                <ThemedText.Black fontWeight={400} fontSize={14} color={theme.text2}>
                  <Trans>Position&apos;s fee tier</Trans>
                </ThemedText.Black>
              </RowFixed>
              <RowFixed>
                <ThemedText.Black fontWeight={400} fontSize={14} color={theme.text2}>
                  {selectedTier ? `${selectedTier.feePercent.toFixed(2)}%` : null}
                </ThemedText.Black>
              </RowFixed>
            </RowBetween>
            <RowBetween padding="0 8px">
              <RowFixed>
                <ThemedText.Black fontWeight={400} fontSize={14} color={theme.text2}>
                  <Trans>Average selling price</Trans>
                </ThemedText.Black>
              </RowFixed>
              <RowFixed>
                <ThemedText.Black fontWeight={400} fontSize={14} color={theme.text2}>
                  {averagePrice0 && JSBI.greaterThan(averagePrice0.denominator, ZERO) ? (
                    <Trans>
                      {(endPriceInverted ? averagePrice0.invert() : averagePrice0).toSignificant(6)}{' '}
                      {quoteCurrency?.symbol} per {baseCurrency?.symbol}
                    </Trans>
                  ) : (
                    'N/A'
                  )}
                </ThemedText.Black>
              </RowFixed>
            </RowBetween>

            {recipient !== null ? (
              <>
                <AutoRow justify="space-between">
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

            {makeButton()}
          </AutoColumn>
        </Wrapper>
      </AppBody>
      <AlertWrapper>
        <NetworkAlert />
      </AlertWrapper>
      <SwitchLocaleLink />
      {!pool && <UnsupportedCurrencyFooter show currencies={[inputCurrency, outputCurrency]} />}
    </>
  )
}
