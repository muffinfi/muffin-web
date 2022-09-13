import { Trans } from '@lingui/macro'
import { useHubContract } from '@muffinfi/hooks/useContract'
import { PoolState, useLimitOrderTickSpacingMultipliers, useMuffinPool } from '@muffinfi/hooks/usePools'
import { useSettlement } from '@muffinfi/hooks/useSettlements'
import {
  LimitOrderType,
  MAX_TICK,
  MIN_TICK,
  nearestUsableTick,
  Position,
  PositionManager,
  priceToClosestTick,
  // TickMath,
  tickToPrice,
  ZERO,
} from '@muffinfi/muffin-sdk'
import { useIsUsingInternalAccount } from '@muffinfi/state/user/hooks'
import { BalanceSource } from '@muffinfi/state/wallet/hooks'
import { formatFeePercent } from '@muffinfi/utils/formatFeePercent'
import * as M from '@muffinfi-ui'
import { Currency, CurrencyAmount, Percent, Price } from '@uniswap/sdk-core'
import AddressInputPanel from 'components/AddressInputPanel'
import AnimatedDropdown from 'components/AnimatedDropdown'
import { ErrorCard, YellowCard } from 'components/Card'
import CurrencyInputPanel from 'components/CurrencyInputPanel'
import StepCounter from 'components/InputStepCounter/InputStepCounter'
import { NetworkAlert } from 'components/NetworkAlert/NetworkAlert'
import { PositionPreview } from 'components/PositionPreview'
import { QuestionHelperInline } from 'components/QuestionHelper'
import { ArrowWrapper, FieldsWrapper } from 'components/swap/styleds'
import SwapHeader from 'components/swap/SwapHeader'
import { SwitchLocaleLink } from 'components/SwitchLocaleLink'
import { TierOption } from 'components/TierSelector/TierOption'
import TokenWarningModal from 'components/TokenWarningModal'
import TransactionConfirmationModal, { ConfirmationModalContent } from 'components/TransactionConfirmationModal'
import { BAD_RECIPIENT_ADDRESSES } from 'constants/addresses'
import { ZERO_PERCENT } from 'constants/misc'
import { WRAPPED_NATIVE_CURRENCY } from 'constants/tokens'
import useActiveWeb3React from 'hooks/useActiveWeb3React'
import { useArgentWalletContract } from 'hooks/useArgentWalletContract'
import { useManagerAddress } from 'hooks/useContractAddress'
import useCurrency from 'hooks/useCurrency'
import { useFirstTruthy } from 'hooks/useFirstTruthy'
import useParsedQueryString from 'hooks/useParsedQueryString'
import usePreviousExclude, { EXCLUDE_NULL_OR_UNDEFINED } from 'hooks/usePreviousExclude'
import useTheme from 'hooks/useTheme'
import useTokenWarningModalHooks from 'hooks/useTokenWarningModalHooks'
import useTransactionDeadline from 'hooks/useTransactionDeadline'
import { useUSDCValue } from 'hooks/useUSDCPrice'
import JSBI from 'jsbi'
import TokenApproveOrPermitButton from 'lib/components/TokenApproveOrPermitButton'
import { ApproveOrPermitState } from 'lib/hooks/useApproveOrPermit'
import useCurrencyBalance from 'lib/hooks/useCurrencyBalance'
import useOutstandingAmountToApprove from 'lib/hooks/useOutstandingAmountToApprove'
import { SignatureData, signatureDataToPermitOptions } from 'lib/utils/erc20Permit'
import tryParseCurrencyAmount from 'lib/utils/tryParseCurrencyAmount'
import { memo, useCallback, useEffect, useMemo, useState } from 'react'
import { AlertTriangle, ArrowDown } from 'react-feather'
import ReactGA from 'react-ga'
import { RouteComponentProps } from 'react-router-dom'
import { useWalletModalToggle } from 'state/application/hooks'
import { tryParseTick } from 'state/mint/v3/utils'
import { Field } from 'state/swap/actions'
import { tryParseAmount, useDefaultsFromURLSearch, useSwapActionHandlers, useSwapState } from 'state/swap/hooks'
import { TransactionType } from 'state/transactions/actions'
import { useTransactionAdder } from 'state/transactions/hooks'
import { useExpertModeManager } from 'state/user/hooks'
import styled from 'styled-components/macro'
import { ThemedText } from 'theme'
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

const StepCountersRow = styled(M.RowBetween)`
  & > :first-child {
    width: 100%;
  }
`

const Select = styled.div`
  align-items: flex-start;
  display: grid;
  grid-auto-flow: column;
  gap: 8px;
  padding: 0 1px; // 1px is for button hover shadow
`

const StyledSectionCard = styled(M.SectionCard)`
  padding: 20px;
  border-radius: 20px;

  ${({ theme }) => theme.mediaWidth.upToExtraSmall`
    border-radius: 16px;
    padding: 1rem 0.75rem;
    margin: 0 -0.333rem;
  `}
`

const CardColumn = styled(M.Column).attrs({ stretch: true })`
  border: 1px solid var(--borderColor);
  border-radius: 16px;
  padding: 12px;

  font-size: 13px;
`

const Separator = styled.div`
  width: 100%;
  height: 1px;
  background-color: var(--borderColor);
`

const noopStepCounterButton = () => ''
const noopOnUserInput = () => null

const MemoizedCurrencyInputPanel = memo(CurrencyInputPanel)
const MemoizedStepCounter = memo(StepCounter)

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
  const [poolState, pool] = useMuffinPool(inputCurrency, outputCurrency)
  const previousPool = usePreviousExclude(pool, EXCLUDE_NULL_OR_UNDEFINED)
  const isPoolJustChanged = Boolean(!pool || !previousPool?.equals(pool))
  const [hasPoolEverChanged, resetHasPoolEverChanged] = useFirstTruthy(() => isPoolJustChanged)
  const { loading: isLoadingTickSpacingMultipliers, result: tickSpacingMultipliers } =
    useLimitOrderTickSpacingMultipliers(hubContract, pool)
  const [sqrtGamma, setSqrtGamma] = useState<number | undefined>()
  const [isEditTierDropdownOpened, setEditTierDropdownOpened] = useState(false)

  const { sqrtGamma: urlSqrtGamma, price: urlEndPrice, priceInverted: urlEndPriceInverted } = useParsedQueryString()

  const [tierId, selectedTier] = useMemo(() => {
    const res = pool?.getTierBySqrtGamma(sqrtGamma) ?? []
    if ((res[0] ?? -1) < 0) {
      res[0] = undefined
    }
    return res
  }, [pool, sqrtGamma])

  const availableSqrtGammas = useMemo(
    () =>
      (tickSpacingMultipliers?.map((val, i) => (val > 0 ? pool?.tiers[i].sqrtGamma : undefined)).filter(Boolean) ??
        []) as number[],
    [tickSpacingMultipliers, pool?.tiers]
  )

  const isValidTier = useMemo(
    () => sqrtGamma != null && availableSqrtGammas.includes(sqrtGamma),
    [sqrtGamma, availableSqrtGammas]
  )
  const defaultSqrtGamma = availableSqrtGammas.length > 0 ? availableSqrtGammas[0] : undefined
  const showEditTierButton = availableSqrtGammas.length > 1

  const tokenA = inputCurrency?.wrapped
  const tokenB = outputCurrency?.wrapped

  const [token0, token1, currency0, currency1, zeroForOne] =
    tokenA && tokenB
      ? tokenA.sortsBefore(tokenB)
        ? [tokenA, tokenB, inputCurrency, outputCurrency, true]
        : [tokenB, tokenA, outputCurrency, inputCurrency, false]
      : [undefined, undefined, undefined, undefined, undefined]

  const handleOpenEditTierDropdown = useCallback(
    () => setEditTierDropdownOpened(!isEditTierDropdownOpened),
    [isEditTierDropdownOpened]
  )

  // set default tier id
  useEffect(() => {
    if (poolState === PoolState.EXISTS && defaultSqrtGamma != null && isValidTier) return
    const parsedSqrtGamma = (typeof urlSqrtGamma === 'string' && parseInt(urlSqrtGamma)) || undefined
    setSqrtGamma(
      parsedSqrtGamma != null && availableSqrtGammas.includes(parsedSqrtGamma) ? parsedSqrtGamma : defaultSqrtGamma
    )
  }, [poolState, defaultSqrtGamma, availableSqrtGammas, isValidTier, urlSqrtGamma])

  /*======================================================================
   *                          RATE AND PRICE
   *====================================================================*/

  const [endPriceInverted, setEndPriceInverted] = useState<boolean | undefined>() // undefined means didn't initialized
  const [endTick, setEndTick] = useState<number | undefined>()
  const quoteCurrency = endPriceInverted ? currency0 : currency1
  const baseCurrency = endPriceInverted ? currency1 : currency0
  const quoteToken = endPriceInverted ? token0 : token1
  const baseToken = endPriceInverted ? token1 : token0

  const endPrice0 = useMemo(
    () => (token0 && token1 && endTick != null ? tickToPrice(token0, token1, endTick) : undefined),
    [token0, token1, endTick]
  )

  const { tickSpacing: settlementTickSpacing }: Partial<ReturnType<typeof useSettlement>> =
    useSettlement(hubContract, pool, tierId, endTick, !!zeroForOne) ?? {}

  const tickSpacing = pool?.tickSpacing

  const tickSpacingMultiplier = useMemo(() => {
    const multiplier = isValidTier && tierId != null && tickSpacingMultipliers?.[tierId]
    return typeof multiplier === 'number' ? multiplier : undefined
  }, [isValidTier, tickSpacingMultipliers, tierId])

  const positionPriceRange = useMemo(
    () =>
      tickSpacingMultiplier && tickSpacing ? tickSpacingMultiplier * (settlementTickSpacing || tickSpacing) : undefined,
    [tickSpacing, settlementTickSpacing, tickSpacingMultiplier]
  )

  const startTick = useMemo(() => {
    if (!positionPriceRange || endTick == null) return undefined
    return zeroForOne ? endTick - positionPriceRange : endTick + positionPriceRange
  }, [endTick, positionPriceRange, zeroForOne])

  const startPrice0 = useMemo(
    () => token0 && token1 && getTickToPrice(token0, token1, startTick),
    [startTick, token0, token1]
  )

  const handleRateToggle = useCallback(() => {
    setEndPriceInverted((value) => !value)
  }, [])

  /**
   * Note that "limits" refer to the limit for making *single-sided position*, not min and max tick of the pool.
   */
  const tickLimits: {
    LOWER?: number // End tick limit lower
    UPPER?: number // End tick limit upper
    END?: number // End tick limit base on zero for one
  } = useMemo(() => {
    const currentTick = selectedTier?.tickCurrent
    if (!tickSpacing || currentTick == null || positionPriceRange == null) return {}
    const limits = zeroForOne
      ? {
          LOWER: nearestUsableTick(currentTick, tickSpacing) + positionPriceRange + tickSpacing,
          UPPER: nearestUsableTick(MAX_TICK, tickSpacing),
          END: 0,
        }
      : {
          LOWER: nearestUsableTick(MIN_TICK, tickSpacing),
          UPPER: nearestUsableTick(currentTick, tickSpacing) - positionPriceRange - tickSpacing,
          END: 0,
        }
    limits.END = zeroForOne ? limits.LOWER : limits.UPPER

    return limits
  }, [tickSpacing, positionPriceRange, selectedTier?.tickCurrent, zeroForOne])

  const { ticks, areEndPriceAtLimit, isInvalidPriceRange, tickPrices } = useMemo(() => {
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
    const tickPrices = {
      LOWER: token0 && token1 && ticks.LOWER != null ? tickToPrice(token0, token1, ticks.LOWER) : undefined,
      UPPER: token0 && token1 && ticks.UPPER != null ? tickToPrice(token0, token1, ticks.UPPER) : undefined,
    }
    return { ticks, areEndPriceAtLimit, isInvalidPriceRange, tickPrices }
  }, [endTick, startTick, tickLimits.LOWER, tickLimits.UPPER, token0, token1, zeroForOne])

  const handleUserInput = useCallback(
    (value: string) => {
      const normalizedValue = value.replace(/\.$/, '')
      setEndTick(
        token0 && token1 && tickSpacing != null && parseFloat(normalizedValue) !== 0
          ? endPriceInverted
            ? tryParseTick(token1, token0, tickSpacing, normalizedValue)
            : tryParseTick(token0, token1, tickSpacing, normalizedValue)
          : undefined
      )
    },
    [endPriceInverted, tickSpacing, token0, token1]
  )

  const handlePriceIncrement = useCallback(() => {
    setEndTick((oldValue) => {
      if (!tickSpacing || tickLimits.END == null || tickLimits.LOWER == null || tickLimits.UPPER == null) {
        return oldValue
      }
      return oldValue == null
        ? tickLimits.END
        : endPriceInverted
        ? Math.max(tickLimits.LOWER, oldValue - tickSpacing)
        : Math.min(tickLimits.UPPER, oldValue + tickSpacing)
    })
  }, [tickSpacing, tickLimits.END, tickLimits.UPPER, tickLimits.LOWER, endPriceInverted])

  const handlePriceDecrement = useCallback(() => {
    setEndTick((oldValue) => {
      if (!tickSpacing || tickLimits.END == null || tickLimits.LOWER == null || tickLimits.UPPER == null) {
        return oldValue
      }
      return oldValue == null
        ? tickLimits.END
        : endPriceInverted
        ? Math.min(tickLimits.UPPER, oldValue + tickSpacing)
        : Math.max(tickLimits.LOWER, oldValue - tickSpacing)
    })
  }, [tickSpacing, tickLimits.END, tickLimits.UPPER, tickLimits.LOWER, endPriceInverted])

  // set default price
  useEffect(() => {
    if (!pool || tickLimits.END == null || !baseToken || !quoteToken) return
    if (!hasPoolEverChanged && endTick != null) return // set default price if pool changes or end tick does not exists

    // set default end price direction
    if (typeof endPriceInverted === 'undefined') {
      const inverted = Boolean(
        urlEndPriceInverted &&
          typeof urlEndPriceInverted === 'string' &&
          urlEndPriceInverted !== '0' &&
          urlEndPriceInverted?.toLowerCase() !== 'false'
      )
      setEndPriceInverted(inverted)
    }

    if (endTick != null || typeof urlEndPrice !== 'string' || tickSpacing == null) {
      // reset to limit if changed pool but endTick exists or no url provided price
      setEndTick(tickLimits.END)
    } else {
      // set to url defined price
      const quoteAmount = tryParseAmount(urlEndPrice, quoteToken)
      const baseAmount = tryParseAmount('1', baseToken)
      if (quoteAmount && baseAmount) {
        const price = new Price(baseAmount.currency, quoteAmount.currency, baseAmount.quotient, quoteAmount.quotient)
        setEndTick(nearestUsableTick(priceToClosestTick(endPriceInverted ? price.invert() : price), tickSpacing))
      }
    }

    // reset hasPoolEverChanged to false
    if (hasPoolEverChanged) resetHasPoolEverChanged()
  }, [
    pool,
    baseToken,
    endPriceInverted,
    quoteToken,
    hasPoolEverChanged,
    resetHasPoolEverChanged,
    endTick,
    tickLimits.END,
    urlEndPrice,
    urlEndPriceInverted,
    tickSpacing,
  ])

  // always make end tick usable
  useEffect(() => {
    setEndTick((oldValue) => {
      if (oldValue == null || tickSpacing == null) return oldValue
      return nearestUsableTick(oldValue, tickSpacing)
    })
  }, [tickSpacing])

  /**
   * Find whether ticks are across the supported min and max ticks in muffin. Used only in the confirmation modal.
   */
  const areTicksAtMinMaxTicks = useMemo(() => {
    if (!tickSpacing) {
      return {
        LOWER: false,
        UPPER: false,
      }
    }
    const limits = {
      LOWER: nearestUsableTick(MIN_TICK, tickSpacing),
      UPPER: nearestUsableTick(MAX_TICK, tickSpacing),
    }
    return {
      LOWER: ticks.LOWER != null && ticks.LOWER <= limits.LOWER,
      UPPER: ticks.UPPER != null && ticks.UPPER >= limits.UPPER,
    }
  }, [tickSpacing, ticks.UPPER, ticks.LOWER])

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
    if (!pool || !parsedAmount || tierId == null || ticks.LOWER == null || ticks.UPPER == null) {
      return undefined
    }

    const limitOrderType = zeroForOne ? LimitOrderType.ZeroForOne : LimitOrderType.OneForZero

    return isExactIn
      ? Position.fromAmounts({
          pool,
          tierId,
          tickLower: ticks.LOWER,
          tickUpper: ticks.UPPER,
          amount0: zeroForOne ? parsedAmount.quotient : ZERO,
          amount1: zeroForOne ? ZERO : parsedAmount.quotient,
          limitOrderType,
        })
      : Position.fromLimitOrderExactOutput({
          pool,
          tierId,
          tickLower: ticks.LOWER,
          tickUpper: ticks.UPPER,
          amount0: zeroForOne ? ZERO : parsedAmount.quotient,
          amount1: zeroForOne ? parsedAmount.quotient : ZERO,
          limitOrderType,
        })
  }, [pool, parsedAmount, tierId, ticks.LOWER, ticks.UPPER, zeroForOne, isExactIn])

  // const averagePrice0 = useMemo(() => {
  //   if (!pool || tierId == null || ticks.LOWER == null || ticks.UPPER == null || isPoolJustChanged) {
  //     // when pool changed, set to undefined to wait for new valid endTick set up
  //     return undefined
  //   }

  //   const limitOrderType = zeroForOne ? LimitOrderType.ZeroForOne : LimitOrderType.OneForZero

  //   const position = Position.fromLimitOrderExactOutput({
  //     pool,
  //     tierId,
  //     tickLower: ticks.LOWER,
  //     tickUpper: ticks.UPPER,
  //     amount0: zeroForOne ? ZERO : tryParseCurrencyAmount('1', pool.token0)?.quotient ?? 1,
  //     amount1: zeroForOne ? tryParseCurrencyAmount('1', pool.token1)?.quotient ?? 1 : ZERO,
  //     limitOrderType,
  //   })
  //   const { amount0: mintAmount0, amount1: mintAmount1 } = position.mintAmountsAtPrice(
  //     TickMath.tickToSqrtPriceX72(zeroForOne ? ticks.LOWER - 1 : ticks.UPPER + 1)
  //   )
  //   const { amount0: settleAmount0, amount1: settleAmount1 } = position.settleAmounts
  //   const settleAmount = zeroForOne ? settleAmount1 : settleAmount0
  //   if (!settleAmount) return undefined
  //   return new Price(
  //     pool.token0,
  //     pool.token1,
  //     (zeroForOne ? mintAmount0 : settleAmount).toString(),
  //     (!zeroForOne ? mintAmount1 : settleAmount).toString()
  //   )
  // }, [pool, isPoolJustChanged, tierId, ticks.LOWER, ticks.UPPER, zeroForOne])

  const priceChangeRate = useMemo(() => {
    if (!selectedTier?.token0Price || !selectedTier?.token1Price || !tickPrices.LOWER || !tickPrices.UPPER) {
      return undefined
    }
    const currentPrice = endPriceInverted ? selectedTier.token1Price : selectedTier.token0Price
    const endPrice0 = zeroForOne ? tickPrices.UPPER : tickPrices.LOWER
    const endPrice = endPriceInverted ? endPrice0.invert() : endPrice0
    const changeRate = endPrice.divide(currentPrice).subtract(1)
    const changePercent = new Percent(changeRate.numerator, changeRate.denominator)
    return changePercent.lessThan(100) ? changePercent : new Percent(999999, 10000)
  }, [
    selectedTier?.token0Price,
    selectedTier?.token1Price,
    tickPrices.LOWER,
    tickPrices.UPPER,
    endPriceInverted,
    zeroForOne,
  ])

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
          : isInvalidPriceRange
          ? undefined
          : inputCurrency &&
            position &&
            CurrencyAmount.fromRawAmount(
              inputCurrency,
              (zeroForOne ? position.mintAmounts.amount0 : position.mintAmounts.amount1).toString()
            ),
      [Field.OUTPUT]:
        independentField === Field.OUTPUT
          ? parsedAmount
          : isInvalidPriceRange
          ? undefined
          : outputCurrency &&
            position &&
            (rawAmount = zeroForOne ? position.settleAmounts.amount1 : position.settleAmounts.amount0) &&
            CurrencyAmount.fromRawAmount(outputCurrency, rawAmount.toString()),
    }
  }, [independentField, inputCurrency, isInvalidPriceRange, outputCurrency, parsedAmount, position, zeroForOne])

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

  const { onSwitchTokens, onCurrencySelection, onUserInput, onChangeRecipient, reset } = useSwapActionHandlers()

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

  // dismiss warning if all imported tokens are in active lists
  const {
    importTokensNotInDefault,
    dismissTokenWarning,
    handleConfirmTokenWarning,
    handleDismissTokenWarning: _handleDismissTokenWarning,
  } = useTokenWarningModalHooks(
    useMemo(() => [loadedInputCurrency, loadedOutputCurrency], [loadedInputCurrency, loadedOutputCurrency]),
    history,
    '/limit-range'
  )

  // reset if they close warning without tokens in params
  const handleDismissTokenWarning = useCallback(() => {
    _handleDismissTokenWarning()
    reset()
  }, [_handleDismissTokenWarning, reset])

  /*=====================================================================
   *                        MINT CONFIRMATION
   *====================================================================*/

  const insufficientFunding = maxInputAmount && parsedAmounts[Field.INPUT]?.greaterThan(maxInputAmount)
  const isInvalidTypedAmount = !(
    parsedAmounts[Field.INPUT]?.greaterThan(0) && parsedAmounts[Field.OUTPUT]?.greaterThan(0)
  )
  const isInvalidPrice = endTick == null || !endPrice0
  const managerAddress = useManagerAddress()

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
    if (!inputCurrency || !outputCurrency || !managerAddress || !position || !transactionDeadline) return

    const useNative = inputCurrency.isNative ? inputCurrency : outputCurrency.isNative ? outputCurrency : undefined
    const useAccount = tryInternalAccount && (internalBalance?.greaterThan(0) ?? false)

    const { calldata, value } = PositionManager.addCallParameters(position, {
      recipient: recipient ?? account,
      createPool: false,
      useAccount,
      slippageTolerance: ZERO_PERCENT,
      useNative,
      token0Permit: signatureDataToPermitOptions(zeroForOne ? signatureData : undefined),
      token1Permit: signatureDataToPermitOptions(zeroForOne ? undefined : signatureData),
    })

    let txn = { to: managerAddress as string, data: calldata, value }

    if (argentWalletContract) {
      const batch = [
        ...(amountToApprove && amountToApprove.currency.isToken
          ? [approveAmountCalldata(amountToApprove, managerAddress)]
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
        type: TransactionType.ADD_LIMIT_RANGE_ORDER,
        inputCurrencyId: currencyId(inputCurrency),
        outputCurrencyId: currencyId(outputCurrency),
        sqrtGamma: position.poolTier.sqrtGamma,
        expectedInputAmountRaw: parsedAmounts[Field.INPUT]?.quotient?.toString() ?? '0',
        expectedOutputAmountRaw: parsedAmounts[Field.OUTPUT]?.quotient?.toString() ?? '0',
      })
      setTxHash(response.hash)

      ReactGA.event({
        category: 'Limit Range',
        action: 'Add',
        label: [inputCurrency?.symbol, outputCurrency?.symbol].join('/'),
      })
    } catch (error) {
      setIsAttemptingTxn(false)
      console.error('Failed to send transaction', error)
    }
  }, [
    chainId,
    library,
    account,
    inputCurrency,
    outputCurrency,
    managerAddress,
    position,
    transactionDeadline,
    tryInternalAccount,
    internalBalance,
    recipient,
    zeroForOne,
    signatureData,
    argentWalletContract,
    amountToApprove,
    addTransaction,
    parsedAmounts,
  ])

  const handleDismissConfirmation = useCallback(() => {
    setShowTxModalConfirm(false)
    // if there was a tx hash, we want to clear the input
    if (txHash) {
      setEndTick(undefined)
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
  const isBuying = outputCurrency && baseCurrency?.equals(outputCurrency)

  const [upperFieldLabel, lowerFieldLabel] = useMemo(
    () => [
      independentField === Field.OUTPUT ? <Trans>Sell (at most)</Trans> : <Trans>Sell</Trans>,
      independentField === Field.INPUT ? <Trans>Buy (at least)</Trans> : <Trans>Buy</Trans>,
    ],
    [independentField]
  )
  const leftStepCounterLabel = useMemo(
    () =>
      isBuying ? (
        <M.Text nowrap>
          <Trans>Finish buying {outputCurrency?.symbol} at</Trans>{' '}
          <M.Text color={isInvalidPriceRange ? 'error' : 'green'}>
            {!priceChangeRate ? '' : `(${priceChangeRate.lessThan(0) ? '' : '+'}${priceChangeRate.toFixed(2)}%)`}
          </M.Text>
        </M.Text>
      ) : (
        <M.Text nowrap>
          <Trans>Finish selling {inputCurrency?.symbol} at</Trans>{' '}
          <M.Text color={isInvalidPriceRange ? 'error' : 'green'}>
            {!priceChangeRate ? '' : `(${priceChangeRate.lessThan(0) ? '' : '+'}${priceChangeRate.toFixed(2)}%)`}
          </M.Text>
        </M.Text>
      ),
    [isBuying, outputCurrency?.symbol, inputCurrency?.symbol, priceChangeRate, isInvalidPriceRange]
  )
  const rightStepCounterLabel = useMemo(
    () => (isBuying ? <Trans>Start buying at</Trans> : <Trans>Start selling at</Trans>),
    [isBuying]
  )

  const makeInputFields = () => (
    <M.Column stretch gap="12px">
      <FieldsWrapper>
        <MemoizedCurrencyInputPanel
          label={upperFieldLabel}
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

        <ArrowWrapper clickable style={{ color: inputCurrency && outputCurrency ? 'var(--text1)' : 'var(--text2)' }}>
          <ArrowDown
            size="16"
            onClick={() => {
              onSwitchTokens()
            }}
          />
        </ArrowWrapper>

        <MemoizedCurrencyInputPanel
          value={formattedAmounts[Field.OUTPUT]}
          onUserInput={handleTypeOutput}
          label={lowerFieldLabel}
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
      </FieldsWrapper>

      <StepCountersRow gap="12px">
        <MemoizedStepCounter
          value={(endPriceInverted ? endPrice0?.invert() : endPrice0)?.toSignificant(6) ?? ''}
          onUserInput={handleUserInput}
          decrement={noopStepCounterButton}
          increment={noopStepCounterButton}
          decrementDisabled={areEndPriceAtLimit[endPriceInverted ? 'UPPER' : 'LOWER']}
          incrementDisabled={areEndPriceAtLimit[endPriceInverted ? 'LOWER' : 'UPPER']}
          title={leftStepCounterLabel}
          tokenA={baseCurrency?.symbol}
          tokenB={quoteCurrency?.symbol}
          toggleRate={handleRateToggle}
          onDecrement={handlePriceDecrement}
          onIncrement={handlePriceIncrement}
          onImmediateInput={handleUserInput}
        />

        <MemoizedStepCounter
          value={(endPriceInverted ? startPrice0?.invert() : startPrice0)?.toSignificant(6) ?? ''}
          onUserInput={noopOnUserInput}
          decrement={noopStepCounterButton}
          increment={noopStepCounterButton}
          decrementDisabled
          incrementDisabled
          locked
          title={rightStepCounterLabel}
          tokenA={baseCurrency?.symbol}
          tokenB={quoteCurrency?.symbol}
          toggleRate={handleRateToggle}
        />
      </StepCountersRow>
    </M.Column>
  )

  const makeOrderInfoCard = () =>
    poolState === PoolState.NOT_EXISTS ? (
      <ErrorCard>
        <M.Row gap="12px">
          <AlertTriangle stroke={theme.red3} size="16px" style={{ flexShrink: 0 }} />
          <ThemedText.Main color="red3" fontSize="12px">
            <Trans>No pool has been created for this token pair. Limit Range Orders are therefore not supported.</Trans>
          </ThemedText.Main>
        </M.Row>
      </ErrorCard>
    ) : pool && defaultSqrtGamma == null ? (
      isLoadingTickSpacingMultipliers ? null : (
        <YellowCard>
          <M.Row gap="12px">
            <AlertTriangle stroke={theme.yellow3} size="16px" style={{ flexShrink: 0 }} />
            <ThemedText.Yellow fontSize="12px">
              <Trans>No fee tiers in this pool supports Limit Range Orders</Trans>
            </ThemedText.Yellow>
          </M.Row>
        </YellowCard>
      )
    ) : pool ? (
      <CardColumn gap="12px">
        <M.RowBetween gap="1em">
          <M.Text>
            <Trans>Current price</Trans>
          </M.Text>
          {selectedTier ? (
            <M.PriceExpr
              price={endPriceInverted ? selectedTier.token0Price.invert() : selectedTier.token0Price}
              justifyEnd
            />
          ) : (
            <span>-</span>
          )}
        </M.RowBetween>

        {/* NOTE: should we show this? */}
        {/* <M.RowBetween gap="1em">
          <M.Text>{isBuying ? <Trans>Average buying price</Trans> : <Trans>Average selling price</Trans>}</M.Text>
          {averagePrice0 &&
          !JSBI.equal(averagePrice0.denominator, ZERO) &&
          !JSBI.equal(averagePrice0.numerator, ZERO) ? (
            <M.PriceExpr
              price={endPriceInverted ? averagePrice0.invert() : averagePrice0}
              rounding={Rounding.ROUND_DOWN}
              justifyEnd
            />
          ) : (
            <span>-</span>
          )}
        </M.RowBetween> */}

        <div>
          <M.RowBetween gap="1em">
            <M.Row gap="0.0em">
              <M.Text>
                <Trans>Position&apos;s fee tier</Trans>
              </M.Text>
              <QuestionHelperInline
                text={
                  <Trans>
                    While your order is being filled, you also <M.Text weight="semibold">earn</M.Text> this percentage
                    swap fees from the swaps executed in your order&rsquo;s price range.
                  </Trans>
                }
              />
            </M.Row>
            <M.Row gap="0.5em">
              <M.Text>{selectedTier ? `${formatFeePercent(selectedTier.feePercent)}%` : '-'}</M.Text>
              {showEditTierButton && (
                <M.Anchor role="button" color="primary0" hoverColor="primary1" onClick={handleOpenEditTierDropdown}>
                  {isEditTierDropdownOpened ? <Trans>Close</Trans> : <Trans>Edit</Trans>}
                </M.Anchor>
              )}
            </M.Row>
          </M.RowBetween>

          <AnimatedDropdown open={isEditTierDropdownOpened}>
            <M.Column stretch gap="8px" style={{ padding: '12px 0 0px' }}>
              <M.Text size="xs" color="text2">
                Fee tiers supporting Limit Range Orders
              </M.Text>
              <Select>
                {availableSqrtGammas.map((value) => (
                  <TierOption
                    key={value}
                    active={value === sqrtGamma}
                    activeColor="var(--primary1)"
                    sqrtGamma={value}
                    handleTierSelect={setSqrtGamma}
                  />
                ))}
              </Select>
            </M.Column>
          </AnimatedDropdown>
        </div>

        {selectedTier ? (
          <>
            <Separator />
            <M.TextDiv color="text2" paragraphLineHeight>
              You&rsquo;re creating a position with the price range{' '}
              <M.PriceRangeExprInline
                priceLower={tickPrices.LOWER}
                priceUpper={tickPrices.UPPER}
                tickAtLimit={areTicksAtMinMaxTicks}
                invert={endPriceInverted}
              />{' '}
              in the <M.PoolTierExprInline tier={selectedTier} />. Your position will remain as 100%{' '}
              {outputCurrency?.symbol} once the price reaches{' '}
              <M.PriceExprInline price={endPrice0} invert={endPriceInverted} />.
            </M.TextDiv>
          </>
        ) : null}
      </CardColumn>
    ) : null

  const makeButton = () => (
    <M.Column stretch gap="12px">
      <TokenApproveOrPermitButton
        buttonId={Field.INPUT}
        amount={amountToApprove}
        deadline={transactionDeadline}
        hidden={!pool || Boolean(argentWalletContract) || !account || !parsedAmounts[Field.INPUT]}
        onSignatureDataChange={setSignatureData}
        onStateChanged={setApprovalState}
        onSubmitApproval={onSubmitApproval}
      />
      {!inputCurrency || !outputCurrency ? (
        <M.ButtonRowPrimary disabled>
          <Trans>Select a token</Trans>
        </M.ButtonRowPrimary>
      ) : poolState === PoolState.NOT_EXISTS || (pool && defaultSqrtGamma == null) ? (
        <M.ButtonRowPrimary disabled>
          <Trans>Select another token pair</Trans>
        </M.ButtonRowPrimary>
      ) : !account ? (
        <M.ButtonRowSecondary onClick={toggleWalletModal}>
          <Trans>Connect Wallet</Trans>
        </M.ButtonRowSecondary>
      ) : (
        <M.ButtonRow
          onClick={() => {
            isExpertMode ? onAdd() : setShowTxModalConfirm(true)
          }}
          id="swap-button"
          disabled={
            !pool ||
            defaultSqrtGamma == null ||
            isInvalidPriceRange ||
            isInvalidPrice ||
            insufficientFunding ||
            isInvalidTypedAmount ||
            noRecipient ||
            invalidRecipient ||
            approvalState !== ApproveOrPermitState.APPROVED
          }
          color={isInvalidPriceRange || isInvalidPrice || insufficientFunding || invalidRecipient ? 'error' : 'primary'}
        >
          <M.Text size="lg">
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
              <Trans>Place Order</Trans>
            )}
          </M.Text>
        </M.ButtonRow>
      )}
      {/* {isExpertMode && swapErrorMessage ? <SwapCallbackError error={swapErrorMessage} /> : null} */}
    </M.Column>
  )

  const makeTransactionModal = () => (
    <TransactionConfirmationModal
      isOpen={showTxModalConfirm}
      onDismiss={handleDismissConfirmation}
      attemptingTxn={isAttemptingTxn}
      hash={txHash}
      content={() => (
        <ConfirmationModalContent
          title={<Trans>Confirm Limit Range Order</Trans>}
          onDismiss={handleDismissConfirmation}
          topContent={() =>
            position ? (
              <PositionPreview
                position={position}
                inRange={false}
                ticksAtLimit={areTicksAtMinMaxTicks}
                title={<Trans>Selected Range</Trans>}
                baseCurrencyDefault={baseCurrency}
              />
            ) : null
          }
          bottomContent={() => (
            <M.ButtonRowPrimary style={{ marginTop: '1rem' }} onClick={onAdd}>
              <Trans>Create Position</Trans>
            </M.ButtonRowPrimary>
          )}
        />
      )}
      pendingText={`Adding limit order for swapping ${parsedAmounts[Field.INPUT]?.toSignificant(4)} ${
        parsedAmounts[Field.INPUT]?.currency.symbol
      } to ${parsedAmounts[Field.OUTPUT]?.toSignificant(4)} ${parsedAmounts[Field.OUTPUT]?.currency.symbol}`}
    />
  )

  return (
    <>
      <TokenWarningModal
        isOpen={importTokensNotInDefault.length > 0 && !dismissTokenWarning}
        tokens={importTokensNotInDefault}
        onConfirm={handleConfirmTokenWarning}
        onDismiss={handleDismissTokenWarning}
      />
      {makeTransactionModal()}

      <M.Container maxWidth="29rem">
        <M.Column stretch gap="32px">
          <StyledSectionCard>
            <M.Column stretch gap="16px">
              <SwapHeader swapState={swapState} allowedSlippage={DEFAULT_ADD_IN_RANGE_SLIPPAGE_TOLERANCE} />

              {makeInputFields()}
              {makeOrderInfoCard()}

              {recipient !== null && (
                <M.Column stretch gap="8px">
                  <M.Anchor
                    size="sm"
                    color="primary0"
                    id="remove-recipient-button"
                    onClick={() => onChangeRecipient(null)}
                    style={{ alignSelf: 'flex-end' }}
                  >
                    <Trans>- Remove recipient</Trans>
                  </M.Anchor>
                  <AddressInputPanel id="recipient" value={recipient} onChange={onChangeRecipient} />
                </M.Column>
              )}

              {makeButton()}
            </M.Column>
          </StyledSectionCard>
        </M.Column>
      </M.Container>

      <AlertWrapper>
        <NetworkAlert />
      </AlertWrapper>

      <SwitchLocaleLink />
    </>
  )
}
