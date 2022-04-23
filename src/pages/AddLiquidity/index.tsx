import { Trans } from '@lingui/macro'
import { useManagerContract } from '@muffinfi/hooks/useContract'
import { useDerivedMuffinPositionByTokenId } from '@muffinfi/hooks/useDerivedPosition'
import { PoolState, useMuffinPool } from '@muffinfi/hooks/usePools'
import {
  DEFAULT_TICK_SPACING,
  encodeSqrtPriceX72,
  isSqrtPriceSupported,
  isValidFirstTierSqrtGamma,
  isValidSqrtGamma,
  MAX_TICK,
  MIN_TICK,
  nearestUsableTick,
  Pool,
  Position,
  PositionManager,
  priceToClosestTick,
  TickMath,
  tickToPrice,
  Tier,
  ZERO,
} from '@muffinfi/muffin-v1-sdk'
import { useIsUsingInternalAccount } from '@muffinfi/state/user/hooks'
import { BalanceSource } from '@muffinfi/state/wallet/hooks'
import { Currency, CurrencyAmount, Percent, Price } from '@uniswap/sdk-core'
import UnsupportedCurrencyFooter from 'components/swap/UnsupportedCurrencyFooter'
import TierSelector from 'components/TierSelector'
import useActiveWeb3React from 'hooks/useActiveWeb3React'
import TokenApproveOrPermitButton from 'lib/components/TokenApproveOrPermitButton'
import { ApproveOrPermitState } from 'lib/hooks/useApproveOrPermit'
import useCurrency from 'lib/hooks/useCurrency'
import useOutstandingAmountToApprove from 'lib/hooks/useOutstandingAmountToApprove'
import { useTokenApproveOrPermitButtonHandler } from 'lib/hooks/useTokenApproveOrPermitButtonHandlers'
import { signatureDataToPermitOptions } from 'lib/utils/erc20Permit'
import { ReactNode, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { AlertTriangle } from 'react-feather'
import ReactGA from 'react-ga'
import { RouteComponentProps } from 'react-router-dom'
import { Text } from 'rebass'
import { useRangeHopCallbacks, useV3MintActionHandlers, useV3MintState } from 'state/mint/v3/hooks'
import { tryParseTick } from 'state/mint/v3/utils'
import { tryParseAmount } from 'state/swap/hooks'
import { useCurrencyBalances, useTokenBalance } from 'state/wallet/hooks'
import { ThemeContext } from 'styled-components/macro'
import approveAmountCalldata from 'utils/approveAmountCalldata'
import { calculateGasMargin } from 'utils/calculateGasMargin'
import { currencyId } from 'utils/currencyId'
import { maxAmountSpend } from 'utils/maxAmountSpend'
import { ButtonError, ButtonLight, ButtonPrimary, ButtonText, ButtonYellow } from '../../components/Button'
import { BlueCard, OutlineCard, YellowCard } from '../../components/Card'
import { AutoColumn } from '../../components/Column'
import CurrencyInputPanel from '../../components/CurrencyInputPanel'
import DowntimeWarning from '../../components/DowntimeWarning'
import HoverInlineText from '../../components/HoverInlineText'
import LiquidityChartRangeInput from '../../components/LiquidityChartRangeInput'
import { AddRemoveTabs } from '../../components/NavigationTabs'
import { PositionPreview } from '../../components/PositionPreview'
import RangeSelector from '../../components/RangeSelector'
import PresetsButtons from '../../components/RangeSelector/PresetsButtons'
import RateToggle from '../../components/RateToggle'
import Row, { AutoRow, RowBetween, RowFixed } from '../../components/Row'
import { SwitchLocaleLink } from '../../components/SwitchLocaleLink'
import TransactionConfirmationModal, { ConfirmationModalContent } from '../../components/TransactionConfirmationModal'
import { ZERO_PERCENT } from '../../constants/misc'
import { WRAPPED_NATIVE_CURRENCY } from '../../constants/tokens'
import { useArgentWalletContract } from '../../hooks/useArgentWalletContract'
import { useIsSwapUnsupported } from '../../hooks/useIsSwapUnsupported'
import useTransactionDeadline from '../../hooks/useTransactionDeadline'
import { useUSDCValue } from '../../hooks/useUSDCPrice'
import { useWalletModalToggle } from '../../state/application/hooks'
import { Bound, Field } from '../../state/mint/v3/actions'
import { TransactionType } from '../../state/transactions/actions'
import { useTransactionAdder } from '../../state/transactions/hooks'
import { useIsExpertMode, useUserSlippageToleranceWithDefault } from '../../state/user/hooks'
import { ExternalLink, ThemedText } from '../../theme'
import { Review } from './Review'
import {
  CurrencyDropdown,
  DynamicSection,
  HideMedium,
  MediumOnly,
  ResponsiveTwoColumns,
  RightContainer,
  StackedContainer,
  StackedItem,
  StyledAppBody,
  StyledInput,
} from './styled'

const DEFAULT_ADD_IN_RANGE_SLIPPAGE_TOLERANCE = new Percent(50, 10_000)

const parseSqrtGamma = (sqrtGammaFromUrl: string | undefined) => {
  return sqrtGammaFromUrl && isValidSqrtGamma(parseFloat(sqrtGammaFromUrl)) ? parseFloat(sqrtGammaFromUrl) : undefined
}

export default function AddLiquidity({
  match: { params },
  history,
}: RouteComponentProps<{ currencyIdA?: string; currencyIdB?: string; sqrtGamma?: string; tokenId?: string }>) {
  const currencyIdA: string | undefined = params.currencyIdA
  const currencyIdB: string | undefined = params.currencyIdB
  const sqrtGammaFromUrl: string | undefined = params.sqrtGamma
  const tokenId: string | undefined = params.tokenId

  const { account, chainId, library } = useActiveWeb3React()

  /*=====================================================================
   *                        PARSE URL PARAMS
   *====================================================================*/

  const sqrtGamma = parseSqrtGamma(sqrtGammaFromUrl)
  const { position: existingPosition } = useDerivedMuffinPositionByTokenId(tokenId)
  const hasExistingPosition = existingPosition != null

  // fetch currencies
  const currencyA = useCurrency(currencyIdA) ?? undefined
  const _currencyB = useCurrency(currencyIdB) ?? undefined
  const currencyB = currencyA && _currencyB && currencyA.wrapped.equals(_currencyB.wrapped) ? undefined : _currencyB
  const baseCurrency = currencyA
  const quoteCurrency = currencyB
  const currencies = useMemo(
    () => ({ [Field.CURRENCY_A]: currencyA, [Field.CURRENCY_B]: currencyB }),
    [currencyA, currencyB]
  )

  // fetch pool and tier
  const [poolState, pool] = useMuffinPool(baseCurrency, quoteCurrency)
  const [tierId] = pool?.getTierBySqrtGamma(sqrtGamma) || []
  const isCreatingPool = poolState === PoolState.NOT_EXISTS
  const isInvalidPool = poolState === PoolState.INVALID
  const tickSpacing = poolState === PoolState.NOT_EXISTS ? DEFAULT_TICK_SPACING : pool?.tickSpacing

  // wrap native currencies to tokens and sort them
  const tokenA = currencyA?.wrapped
  const tokenB = currencyB?.wrapped
  const [token0, token1, invertPrice] =
    tokenA && tokenB
      ? tokenA.sortsBefore(tokenB)
        ? [tokenA, tokenB, false]
        : [tokenB, tokenA, true]
      : [undefined, undefined, undefined]

  /*=====================================================================
   *                            POOL PRICE
   *====================================================================*/

  const { startPriceTypedValue } = useV3MintState()

  // ger current pool price if pool exists, otherwise derive from input fields
  const price = useMemo(() => {
    if (poolState !== PoolState.NOT_EXISTS && pool) {
      // get the amount of quote currency, return undefined if tier is not found (i.e. wrong sqrt gamma)
      const [, tier] = pool.getTierBySqrtGamma(sqrtGamma)
      return tier && token0 ? tier.priceOf(token0) : undefined
    }

    const quoteAmount = tryParseAmount(startPriceTypedValue, invertPrice ? token0 : token1)
    const baseAmount = tryParseAmount('1', invertPrice ? token1 : token0)
    if (!quoteAmount || !baseAmount || !token0 || !token1) return undefined

    const price = new Price(baseAmount.currency, quoteAmount.currency, baseAmount.quotient, quoteAmount.quotient)
    return invertPrice ? price?.invert() : price
  }, [poolState, pool, sqrtGamma, token0, token1, invertPrice, startPriceTypedValue])

  // check for invalid price input (converts to invalid ratio)
  const isInvalidPrice = useMemo(
    () => (price != null ? !isSqrtPriceSupported(encodeSqrtPriceX72(price.numerator, price.denominator)) : undefined),
    [price]
  )

  /*=====================================================================
   *                               TICKS
   *====================================================================*/

  const { leftRangeTypedValue, rightRangeTypedValue } = useV3MintState()

  const { ticks, areTicksAtLimit, tickPrices } = useMemo(() => {
    const tickLimits = {
      LOWER: tickSpacing ? nearestUsableTick(MIN_TICK, tickSpacing) : undefined,
      UPPER: tickSpacing ? nearestUsableTick(MAX_TICK, tickSpacing) : undefined,
    }
    const ticks = {
      LOWER:
        existingPosition?.tickLower ??
        ((invertPrice && rightRangeTypedValue === true) || (!invertPrice && leftRangeTypedValue === true)
          ? tickLimits.LOWER
          : invertPrice
          ? tryParseTick(token1, token0, tickSpacing, rightRangeTypedValue.toString())
          : tryParseTick(token0, token1, tickSpacing, leftRangeTypedValue.toString())),
      UPPER:
        existingPosition?.tickUpper ??
        ((invertPrice && leftRangeTypedValue === true) || (!invertPrice && rightRangeTypedValue === true)
          ? tickLimits.UPPER
          : invertPrice
          ? tryParseTick(token1, token0, tickSpacing, leftRangeTypedValue.toString())
          : tryParseTick(token0, token1, tickSpacing, rightRangeTypedValue.toString())),
    }
    const areTicksAtLimit = {
      LOWER: tickLimits.LOWER != null && ticks.LOWER != null && ticks.LOWER <= tickLimits.LOWER,
      UPPER: tickLimits.UPPER != null && ticks.UPPER != null && ticks.UPPER >= tickLimits.UPPER,
    }
    const tickPrices = {
      LOWER: token0 && token1 && ticks.LOWER != null ? tickToPrice(token0, token1, ticks.LOWER) : undefined,
      UPPER: token0 && token1 && ticks.UPPER != null ? tickToPrice(token0, token1, ticks.UPPER) : undefined,
    }
    return { tickLimits, ticks, areTicksAtLimit, tickPrices }
  }, [token0, token1, invertPrice, tickSpacing, existingPosition, leftRangeTypedValue, rightRangeTypedValue])

  const tickLower = ticks.LOWER
  const tickUpper = ticks.UPPER
  const priceLower = tickPrices.LOWER
  const priceUpper = tickPrices.UPPER

  const isInvalidRange = Boolean(tickLower != null && tickUpper != null && tickLower >= tickUpper)
  const isOutOfRange = Boolean(
    !isInvalidPrice &&
      price &&
      priceLower &&
      priceUpper &&
      (price.lessThan(priceLower) || price.greaterThan(priceUpper))
  )

  /*=====================================================================
   *                        MOCK POOL AND TIER
   *====================================================================*/

  /**
   * Return existing pool and tier if they exists
   * Mock one if pool does not exist
   * Return undefined if tier does not exists (i.e. wrong sqrt gamma)
   */
  const { mockPool, mockTier, mockTierId } = useMemo(() => {
    // if pool exists:
    if (poolState !== PoolState.NOT_EXISTS && pool) {
      const [tierId, tier] = pool.getTierBySqrtGamma(sqrtGamma)
      return tierId !== -1 && tier ? { mockPool: pool, mockTier: tier, mockTierId: tierId } : {}
    }
    // if pool does not exist:
    if (tokenA && tokenB && tickSpacing && isValidFirstTierSqrtGamma(sqrtGamma) && price && !isInvalidPrice) {
      const parsedSqrtPrice = TickMath.tickToSqrtPriceX72(priceToClosestTick(price))
      const mockTier = new Tier(tokenA, tokenB, 0, parsedSqrtPrice, sqrtGamma, MIN_TICK, MAX_TICK) // empty liquidity
      const mockPool = new Pool(tokenA, tokenB, tickSpacing, [mockTier])
      return { mockPool, mockTier, mockTierId: 0 }
    }
    return {}
  }, [pool, poolState, tokenA, tokenB, sqrtGamma, tickSpacing, isInvalidPrice, price])

  /*=====================================================================
   *                       PARSED TOKEN AMOUNTS
   *====================================================================*/

  const tryUseInternalAccount = useIsUsingInternalAccount()
  const { independentField, typedValue } = useV3MintState()
  const dependentField = independentField === Field.CURRENCY_A ? Field.CURRENCY_B : Field.CURRENCY_A

  /**
   * Parse the input token amounts
   */
  const parsedAmounts = useMemo(() => {
    const independentAmount = tryParseAmount(typedValue, independentField === Field.CURRENCY_A ? currencyA : currencyB)
    const wrappedIndependentAmount = independentAmount?.wrapped

    // compute dependent amount
    let dependentAmount: CurrencyAmount<Currency> | undefined = undefined
    if (
      independentAmount &&
      wrappedIndependentAmount &&
      tickLower != null &&
      tickUpper != null &&
      mockPool != null &&
      mockTierId != null &&
      !isOutOfRange && // if price is out of range or invalid range - return 0 (single deposit will be independent)
      !isInvalidRange
    ) {
      const isToken0 = wrappedIndependentAmount.currency.equals(mockPool.token0)

      // try making a position with as much liquidity as it can have with the given independent token amount
      const baseParams = { pool: mockPool, tierId: mockTierId, tickLower, tickUpper }
      const position = isToken0
        ? Position.fromAmount0({ ...baseParams, amount0: independentAmount.quotient })
        : Position.fromAmount1({ ...baseParams, amount1: independentAmount.quotient })

      // use the mock position to calculate its underlying token amount
      const dependentTokenAmount = isToken0 ? position.amount1 : position.amount0

      // unwrap from CurrencyAmount<Token> to CurrencyAmount<Currency>
      const dependentCurrency = dependentField === Field.CURRENCY_B ? currencyB : currencyA
      dependentAmount =
        dependentCurrency && CurrencyAmount.fromRawAmount(dependentCurrency, dependentTokenAmount.quotient)
    }

    // group token amounts into dict
    return {
      [Field.CURRENCY_A]: independentField === Field.CURRENCY_A ? independentAmount : dependentAmount,
      [Field.CURRENCY_B]: independentField === Field.CURRENCY_A ? dependentAmount : independentAmount,
    }
  }, [
    currencyA,
    currencyB,
    tickLower,
    tickUpper,
    isInvalidRange,
    isOutOfRange,
    mockPool,
    mockTierId,
    independentField,
    dependentField,
    typedValue,
  ])

  // get formatted amounts
  const formattedAmounts = {
    [Field.CURRENCY_A]: independentField === Field.CURRENCY_A ? typedValue : parsedAmounts[dependentField]?.toSignificant(6) ?? '', // prettier-ignore
    [Field.CURRENCY_B]: independentField === Field.CURRENCY_A ? parsedAmounts[dependentField]?.toSignificant(6) ?? '' : typedValue, // prettier-ignore
  }
  const usdcValues = {
    [Field.CURRENCY_A]: useUSDCValue(parsedAmounts[Field.CURRENCY_A]),
    [Field.CURRENCY_B]: useUSDCValue(parsedAmounts[Field.CURRENCY_B]),
  }

  /*=====================================================================
   *                         ACCOUNT BALANCES
   *====================================================================*/

  const [balanceA, balanceB] = useCurrencyBalances(
    account ?? undefined,
    useMemo(() => [currencyA, currencyB], [currencyA, currencyB])
  )

  // get the max amounts user can add (actually only for taking care of native eth + gas)
  const maxAmounts = {
    CURRENCY_A: maxAmountSpend(balanceA),
    CURRENCY_B: maxAmountSpend(balanceB),
  }
  const atMaxAmounts = {
    CURRENCY_A: maxAmounts.CURRENCY_A?.equalTo(parsedAmounts.CURRENCY_A ?? '0'),
    CURRENCY_B: maxAmounts.CURRENCY_B?.equalTo(parsedAmounts.CURRENCY_B ?? '0'),
  }

  /*=====================================================================
   *                      UI: TOKEN AMOUNT FIELDS
   *====================================================================*/

  // restrict to single deposit if price is out of range
  const tickCurrent = mockTier?.computedTick
  const deposit0Disabled = tickCurrent != null && tickUpper != null && tickCurrent >= tickUpper
  const deposit1Disabled = tickCurrent != null && tickLower != null && tickCurrent <= tickLower

  const depositADisabled =
    isInvalidRange ||
    (deposit0Disabled && token0 && tokenA && token0.equals(tokenA)) ||
    (deposit1Disabled && token1 && tokenA && token1.equals(tokenA))

  const depositBDisabled =
    isInvalidRange ||
    (deposit0Disabled && token0 && tokenB && token0.equals(tokenB)) ||
    (deposit1Disabled && token1 && tokenB && token1.equals(tokenB))

  /*=====================================================================
   *                       BUTTON ERROR MESSAGE
   *====================================================================*/

  let errorMessage: ReactNode | undefined
  const amountA = parsedAmounts[Field.CURRENCY_A]
  const amountB = parsedAmounts[Field.CURRENCY_B]

  if (!account) {
    errorMessage = <Trans>Connect Wallet</Trans>
  }
  if (poolState === PoolState.INVALID) {
    errorMessage = errorMessage ?? <Trans>Invalid pair</Trans>
  }
  if (isInvalidPrice) {
    errorMessage = errorMessage ?? <Trans>Invalid price input</Trans>
  }
  if ((!amountA && !depositADisabled) || (!amountB && !depositBDisabled)) {
    errorMessage = errorMessage ?? <Trans>Enter an amount</Trans>
  }
  if (amountA && balanceA?.lessThan(amountA)) {
    errorMessage = <Trans>Insufficient {currencyA?.symbol} balance</Trans>
  }
  if (amountB && balanceB?.lessThan(amountB)) {
    errorMessage = <Trans>Insufficient {currencyB?.symbol} balance</Trans>
  }

  const isValid = !errorMessage && !isInvalidRange

  /*=====================================================================
   *                          FINAL POSITION
   *====================================================================*/

  // - now we have derived {upper,lower} ticks and token{0,1} amounts, we can formulate a finalized position.
  // - notice that this position object does not contain the existing position's current liquidity (if there is)
  // - create position entity based on users selection
  const position = useMemo(() => {
    if (!mockPool || !tokenA || mockTierId == null || tickLower == null || tickUpper == null || isInvalidRange) {
      return undefined
    }
    // mark as 0 if disabled because out of range
    const aEq0 = tokenA.equals(mockPool.token0)
    const amount0 = !deposit0Disabled ? parsedAmounts?.[aEq0 ? Field.CURRENCY_A : Field.CURRENCY_B]?.quotient : ZERO
    const amount1 = !deposit1Disabled ? parsedAmounts?.[aEq0 ? Field.CURRENCY_B : Field.CURRENCY_A]?.quotient : ZERO
    return amount0 != null && amount1 != null
      ? Position.fromAmounts({ pool: mockPool, tierId: mockTierId, tickLower, tickUpper, amount0, amount1 })
      : undefined
  }, [
    parsedAmounts,
    mockPool,
    mockTierId,
    tokenA,
    isInvalidRange,
    deposit0Disabled,
    deposit1Disabled,
    tickLower,
    tickUpper,
  ])

  /*=====================================================================
   *                              OTHERS
   *====================================================================*/

  const addIsUnsupported = useIsSwapUnsupported(currencyA, currencyA)

  const toggleWalletModal = useWalletModalToggle() // use to toggle wallet when disconnected

  const argentWalletContract = useArgentWalletContract()

  const expertMode = useIsExpertMode()

  /*=====================================================================
   *                          TOKEN APPROVALS
   *====================================================================*/

  // check whether the user has approved the router on the tokens
  const { permitSignatures, updatePermitSignature, approvalStates, updateApprovalStates } =
    useTokenApproveOrPermitButtonHandler()

  const amountsToApprove = {
    [Field.CURRENCY_A]: useOutstandingAmountToApprove(account ?? undefined, parsedAmounts[Field.CURRENCY_A]),
    [Field.CURRENCY_B]: useOutstandingAmountToApprove(account ?? undefined, parsedAmounts[Field.CURRENCY_B]),
  }

  /*=====================================================================
   *                        CONFIRM MODAL TEXT
   *====================================================================*/

  const _parsedAmtA = !depositADisabled ? parsedAmounts[Field.CURRENCY_A]?.toSignificant(6) : ''
  const _parsedAmtB = !depositBDisabled ? parsedAmounts[Field.CURRENCY_B]?.toSignificant(6) : ''
  const _symbolA = !depositADisabled ? currencies[Field.CURRENCY_A]?.symbol : ''
  const _symbolB = !depositBDisabled ? currencies[Field.CURRENCY_B]?.symbol : ''
  const pendingText = `Supplying ${_parsedAmtA} ${_symbolA} ${!isOutOfRange ? 'and' : ''} ${_parsedAmtB} ${_symbolB}`

  /*=====================================================================
   *                        FIELD STATE ACTIONS
   *====================================================================*/

  const noLiquidity = isCreatingPool

  const { onFieldAInput, onFieldBInput, onLeftRangeInput, onRightRangeInput, onStartPriceInput } =
    useV3MintActionHandlers(noLiquidity)

  const clearAll = useCallback(() => {
    onFieldAInput('')
    onFieldBInput('')
    onLeftRangeInput('')
    onRightRangeInput('')
    history.push(`/add`)
  }, [history, onFieldAInput, onFieldBInput, onLeftRangeInput, onRightRangeInput])

  /*=====================================================================
   *                             UI STATES
   *====================================================================*/

  // tx confirm modal
  const [showTxModalConfirm, setShowTxModalConfirm] = useState(false)
  const [isAttemptingTxn, setIsAttemptingTxn] = useState(false) // i.e. clicked confirm

  // hash of ongoing tx
  const [txHash, setTxHash] = useState('')

  // capital efficiency warning
  const [showCapitalEfficiencyWarning, setShowCapitalEfficiencyWarning] = useState(false)
  useEffect(() => setShowCapitalEfficiencyWarning(false), [currencyIdA, currencyIdB, sqrtGamma])

  /*=====================================================================
   *                         UI ACTION HANDLER
   *====================================================================*/

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

  const handleCurrencyASelect = useCallback(
    (currencyANew: Currency) => {
      const [idA, idB] = handleCurrencySelect(currencyANew, currencyIdB)
      if (idB === undefined) {
        history.push(`/add/${idA}`)
      } else {
        history.push(`/add/${idA}/${idB}`)
      }
    },
    [handleCurrencySelect, currencyIdB, history]
  )

  const handleCurrencyBSelect = useCallback(
    (currencyBNew: Currency) => {
      const [idB, idA] = handleCurrencySelect(currencyBNew, currencyIdA)
      if (idA === undefined) {
        history.push(`/add/${idB}`)
      } else {
        history.push(`/add/${idA}/${idB}`)
      }
    },
    [handleCurrencySelect, currencyIdA, history]
  )

  const handleTierSelect = useCallback(
    (sqrtGamma: number) => {
      onLeftRangeInput('')
      onRightRangeInput('')
      history.push(`/add/${currencyIdA}/${currencyIdB}/${sqrtGamma}`)
    },
    [currencyIdA, currencyIdB, history, onLeftRangeInput, onRightRangeInput]
  )

  const handleRateToggle = () => {
    if (!areTicksAtLimit[Bound.LOWER] && !areTicksAtLimit[Bound.UPPER]) {
      // switch price
      onLeftRangeInput((invertPrice ? priceLower : priceUpper?.invert())?.toSignificant(6) ?? '')
      onRightRangeInput((invertPrice ? priceUpper : priceLower?.invert())?.toSignificant(6) ?? '')
      if (independentField === Field.CURRENCY_A) {
        onFieldBInput(formattedAmounts[Field.CURRENCY_A] ?? '')
      } else {
        onFieldAInput(formattedAmounts[Field.CURRENCY_B] ?? '')
      }
    }
    history.push(`/add/${currencyIdB as string}/${currencyIdA as string}${sqrtGamma ? '/' + sqrtGamma : ''}`)
  }

  const handleDismissConfirmation = useCallback(() => {
    setShowTxModalConfirm(false)
    // if there was a tx hash, we want to clear the input
    if (txHash) {
      onFieldAInput('')
      history.push('/pool') // jump to position listing page after creating
    }
    setTxHash('')
  }, [history, onFieldAInput, txHash])

  // for RangeSelector. will not change state (only view functions)
  const { getDecrementLower, getIncrementLower, getDecrementUpper, getIncrementUpper, getSetFullRange } =
    useRangeHopCallbacks(baseCurrency, quoteCurrency, tickLower, tickUpper, tickSpacing, mockTier)

  /*=====================================================================
   *                    ADD LIQUIDITY CHAIN ACTION
   *====================================================================*/

  const manager = useManagerContract()
  const deadline = useTransactionDeadline() // NOTE: not using currently
  const slippageTolerance = useUserSlippageToleranceWithDefault(
    isOutOfRange ? ZERO_PERCENT : DEFAULT_ADD_IN_RANGE_SLIPPAGE_TOLERANCE
  )
  const addTransaction = useTransactionAdder()
  const internalAmountA = useTokenBalance(
    account ?? undefined,
    tokenA,
    tryUseInternalAccount ? BalanceSource.INTERNAL_ACCOUNT : 0
  )
  const internalAmountB = useTokenBalance(
    account ?? undefined,
    tokenB,
    tryUseInternalAccount ? BalanceSource.INTERNAL_ACCOUNT : 0
  )
  const useAccount = useMemo(
    () =>
      (tryUseInternalAccount &&
        ((!depositADisabled && internalAmountA?.greaterThan(0)) ||
          (!depositBDisabled && internalAmountB?.greaterThan(0)))) ??
      false,
    [tryUseInternalAccount, depositADisabled, internalAmountA, depositBDisabled, internalAmountB]
  )

  /**
   * NOTE:
   * - does not support deadline
   * - creating pool reduce position's received liquidity. UI not reminding user atm
   */
  const onAdd = useCallback(async () => {
    if (!chainId || !library || !account) return
    if (!baseCurrency || !quoteCurrency || !manager || !position || !deadline) return

    const useNative = baseCurrency.isNative ? baseCurrency : quoteCurrency.isNative ? quoteCurrency : undefined

    const isTokenAt0 = position.amount0.currency.equals(currencyA)
    const { calldata, value } = PositionManager.addCallParameters(position, {
      ...(hasExistingPosition && tokenId ? { tokenId } : { recipient: account, createPool: noLiquidity }),
      useAccount,
      slippageTolerance,
      useNative,
      token0Permit: signatureDataToPermitOptions(permitSignatures[isTokenAt0 ? Field.CURRENCY_A : Field.CURRENCY_B]),
      token1Permit: signatureDataToPermitOptions(permitSignatures[isTokenAt0 ? Field.CURRENCY_B : Field.CURRENCY_A]),
    })

    let txn = { to: manager.address, data: calldata, value }

    if (argentWalletContract) {
      const amountA = parsedAmounts[Field.CURRENCY_A]
      const amountB = parsedAmounts[Field.CURRENCY_B]
      const batch = [
        ...(amountA && amountA.currency.isToken ? [approveAmountCalldata(amountA, manager.address)] : []),
        ...(amountB && amountB.currency.isToken ? [approveAmountCalldata(amountB, manager.address)] : []),
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
        createPool: Boolean(noLiquidity),
        baseCurrencyId: currencyId(baseCurrency),
        quoteCurrencyId: currencyId(quoteCurrency),
        tierId: position.tierId,
        sqrtGamma: position.poolTier.sqrtGamma,
        expectedAmountBaseRaw: parsedAmounts[Field.CURRENCY_A]?.quotient?.toString() ?? '0',
        expectedAmountQuoteRaw: parsedAmounts[Field.CURRENCY_B]?.quotient?.toString() ?? '0',
      })
      setTxHash(response.hash)

      ReactGA.event({
        category: 'Liquidity',
        action: 'Add',
        label: [currencies[Field.CURRENCY_A]?.symbol, currencies[Field.CURRENCY_B]?.symbol].join('/'),
      })
    } catch (error) {
      setIsAttemptingTxn(false)
      console.error('Failed to send transaction', error)
    }
  }, [
    chainId,
    library,
    account,
    baseCurrency,
    quoteCurrency,
    manager,
    position,
    deadline,
    currencyA,
    hasExistingPosition,
    tokenId,
    noLiquidity,
    useAccount,
    slippageTolerance,
    permitSignatures,
    argentWalletContract,
    parsedAmounts,
    addTransaction,
    currencies,
  ])

  /*=====================================================================
   *                          REACT COMPONENTS
   *====================================================================*/

  const theme = useContext(ThemeContext)

  const makeTabHeader = () => (
    <AddRemoveTabs
      creating={false}
      adding={true}
      positionID={tokenId}
      defaultSlippage={DEFAULT_ADD_IN_RANGE_SLIPPAGE_TOLERANCE}
      showBackLink={!hasExistingPosition}
    >
      {!hasExistingPosition && (
        <Row justifyContent="flex-end" style={{ width: 'fit-content', minWidth: 'fit-content' }}>
          <MediumOnly>
            <ButtonText onClick={clearAll} margin="0 15px 0 0">
              <ThemedText.Blue fontSize="12px">
                <Trans>Clear All</Trans>
              </ThemedText.Blue>
            </ButtonText>
          </MediumOnly>
          {baseCurrency && quoteCurrency ? (
            <RateToggle currencyA={baseCurrency} currencyB={quoteCurrency} handleRateToggle={handleRateToggle} />
          ) : null}
        </Row>
      )}
    </AddRemoveTabs>
  )

  const makeSelectPairAndTierSection = () => (
    <AutoColumn gap="md">
      <RowBetween paddingBottom="20px">
        <ThemedText.Label>
          <Trans>Select Pair</Trans>
        </ThemedText.Label>
      </RowBetween>

      <RowBetween>
        <CurrencyDropdown
          value={formattedAmounts[Field.CURRENCY_A]}
          onUserInput={onFieldAInput}
          hideInput={true}
          onMax={() => {
            onFieldAInput(maxAmounts[Field.CURRENCY_A]?.toExact() ?? '')
          }}
          onCurrencySelect={handleCurrencyASelect}
          showMaxButton={!atMaxAmounts[Field.CURRENCY_A]}
          currency={currencies[Field.CURRENCY_A] ?? null}
          id="add-liquidity-input-tokena"
          showCommonBases
        />
        <div style={{ width: '12px' }} />

        <CurrencyDropdown
          value={formattedAmounts[Field.CURRENCY_B]}
          hideInput={true}
          onUserInput={onFieldBInput}
          onCurrencySelect={handleCurrencyBSelect}
          onMax={() => {
            onFieldBInput(maxAmounts[Field.CURRENCY_B]?.toExact() ?? '')
          }}
          showMaxButton={!atMaxAmounts[Field.CURRENCY_B]}
          currency={currencies[Field.CURRENCY_B] ?? null}
          id="add-liquidity-input-tokenb"
          showCommonBases
        />
      </RowBetween>
      <TierSelector
        disabled={!quoteCurrency || !baseCurrency}
        pool={pool ?? undefined}
        sqrtGammaSelected={sqrtGamma}
        handleTierSelect={handleTierSelect}
      />
    </AutoColumn>
  )

  const makeTokenAmountSection = () => (
    <DynamicSection disabled={tickLower === undefined || tickUpper === undefined || isInvalidPool || isInvalidRange}>
      <AutoColumn gap="md">
        <ThemedText.Label>
          {hasExistingPosition ? <Trans>Add more liquidity</Trans> : <Trans>Deposit Amounts</Trans>}
        </ThemedText.Label>

        <CurrencyInputPanel
          value={formattedAmounts[Field.CURRENCY_A]}
          onUserInput={onFieldAInput}
          onMax={() => onFieldAInput(maxAmounts[Field.CURRENCY_A]?.toExact() ?? '')}
          showMaxButton={!atMaxAmounts[Field.CURRENCY_A]}
          currency={currencies[Field.CURRENCY_A] ?? null}
          id="add-liquidity-input-tokena"
          fiatValue={usdcValues[Field.CURRENCY_A]}
          showCommonBases
          locked={depositADisabled}
        />

        <CurrencyInputPanel
          value={formattedAmounts[Field.CURRENCY_B]}
          onUserInput={onFieldBInput}
          onMax={() => onFieldBInput(maxAmounts[Field.CURRENCY_B]?.toExact() ?? '')}
          showMaxButton={!atMaxAmounts[Field.CURRENCY_B]}
          fiatValue={usdcValues[Field.CURRENCY_B]}
          currency={currencies[Field.CURRENCY_B] ?? null}
          id="add-liquidity-input-tokenb"
          showCommonBases
          locked={depositBDisabled}
        />
      </AutoColumn>
    </DynamicSection>
  )

  const makeSubmitButtons = () => {
    return addIsUnsupported ? (
      <ButtonPrimary disabled={true} $borderRadius="12px" padding={'12px'}>
        <ThemedText.Main mb="4px">
          <Trans>Unsupported Asset</Trans>
        </ThemedText.Main>
      </ButtonPrimary>
    ) : !account ? (
      <ButtonLight onClick={toggleWalletModal} $borderRadius="12px" padding={'12px'}>
        <Trans>Connect Wallet</Trans>
      </ButtonLight>
    ) : (
      <AutoColumn gap={'md'}>
        {!argentWalletContract &&
          [Field.CURRENCY_A, Field.CURRENCY_B].map((field) => {
            const key = field === Field.CURRENCY_A ? currencyIdA : currencyIdB
            return (
              <TokenApproveOrPermitButton
                key={key ?? field}
                buttonId={field}
                amount={amountsToApprove[field]}
                deadline={deadline}
                hidden={!isValid || !key || approvalStates[field] === ApproveOrPermitState.APPROVED}
                onSignatureDataChange={updatePermitSignature}
                onStateChanged={updateApprovalStates}
              />
            )
          })}
        <ButtonError
          onClick={() => {
            expertMode ? onAdd() : setShowTxModalConfirm(true)
          }}
          disabled={
            !isValid ||
            (!argentWalletContract &&
              approvalStates[Field.CURRENCY_A] !== ApproveOrPermitState.APPROVED &&
              !depositADisabled) ||
            (!argentWalletContract &&
              approvalStates[Field.CURRENCY_B] !== ApproveOrPermitState.APPROVED &&
              !depositBDisabled)
          }
          error={!isValid && !!parsedAmounts[Field.CURRENCY_A] && !!parsedAmounts[Field.CURRENCY_B]}
        >
          <Text fontWeight={500}>{errorMessage ? errorMessage : <Trans>Preview</Trans>}</Text>
        </ButtonError>
      </AutoColumn>
    )
  }

  const makeCapitalEfficiencyWarningCard = () => (
    <StackedItem zIndex={1}>
      <YellowCard
        padding="15px"
        $borderRadius="12px"
        height="100%"
        style={{
          borderColor: theme.yellow3,
          border: '1px solid',
        }}
      >
        <AutoColumn gap="8px" style={{ height: '100%' }}>
          <RowFixed>
            <AlertTriangle stroke={theme.yellow3} size="16px" />
            <ThemedText.Yellow ml="12px" fontSize="15px">
              <Trans>Efficiency Comparison</Trans>
            </ThemedText.Yellow>
          </RowFixed>
          <RowFixed>
            <ThemedText.Yellow ml="12px" fontSize="13px" margin={0} fontWeight={400}>
              <Trans>
                Full range positions may earn less fees than concentrated positions. Learn more{' '}
                <ExternalLink
                  style={{ color: theme.yellow3, textDecoration: 'underline' }}
                  href={
                    'https://help.uniswap.org/en/articles/5434296-can-i-provide-liquidity-over-the-full-range-in-v3'
                  }
                >
                  here
                </ExternalLink>
                .
              </Trans>
            </ThemedText.Yellow>
          </RowFixed>
          <Row>
            <ButtonYellow
              padding="8px"
              marginRight="8px"
              $borderRadius="8px"
              width="auto"
              onClick={() => {
                setShowCapitalEfficiencyWarning(false)
                getSetFullRange()
              }}
            >
              <ThemedText.Black fontSize={13} color="black">
                <Trans>I understand</Trans>
              </ThemedText.Black>
            </ButtonYellow>
          </Row>
        </AutoColumn>
      </YellowCard>
    </StackedItem>
  )

  const makeRangeFormSection = () => (
    <DynamicSection gap="md" disabled={!sqrtGamma || isInvalidPool || (isCreatingPool && !startPriceTypedValue)}>
      <StackedContainer>
        <StackedItem style={{ opacity: showCapitalEfficiencyWarning ? '0.05' : 1 }}>
          <AutoColumn gap="md">
            {isCreatingPool && (
              <RowBetween>
                <ThemedText.Label>
                  <Trans>Set Price Range</Trans>
                </ThemedText.Label>
              </RowBetween>
            )}
            <RangeSelector
              priceLower={priceLower}
              priceUpper={priceUpper}
              getDecrementLower={getDecrementLower}
              getIncrementLower={getIncrementLower}
              getDecrementUpper={getDecrementUpper}
              getIncrementUpper={getIncrementUpper}
              onLeftRangeInput={onLeftRangeInput}
              onRightRangeInput={onRightRangeInput}
              currencyA={baseCurrency}
              currencyB={quoteCurrency}
              tierId={tierId}
              ticksAtLimit={areTicksAtLimit}
            />
            {!isCreatingPool && <PresetsButtons setFullRange={() => setShowCapitalEfficiencyWarning(true)} />}
          </AutoColumn>
        </StackedItem>

        {showCapitalEfficiencyWarning ? makeCapitalEfficiencyWarningCard() : null}
      </StackedContainer>

      {isOutOfRange ? (
        <YellowCard padding="8px 12px" $borderRadius="12px">
          <RowBetween>
            <AlertTriangle stroke={theme.yellow3} size="16px" />
            <ThemedText.Yellow ml="12px" fontSize="12px">
              <Trans>
                Your position will not earn fees or be used in trades until the market price moves into your range.
              </Trans>
            </ThemedText.Yellow>
          </RowBetween>
        </YellowCard>
      ) : null}

      {isInvalidRange ? (
        <YellowCard padding="8px 12px" $borderRadius="12px">
          <RowBetween>
            <AlertTriangle stroke={theme.yellow3} size="16px" />
            <ThemedText.Yellow ml="12px" fontSize="12px">
              <Trans>Invalid range selected. The min price must be lower than the max price.</Trans>
            </ThemedText.Yellow>
          </RowBetween>
        </YellowCard>
      ) : null}
    </DynamicSection>
  )

  const makeTransactionModal = () => (
    <TransactionConfirmationModal
      isOpen={showTxModalConfirm}
      onDismiss={handleDismissConfirmation}
      attemptingTxn={isAttemptingTxn}
      hash={txHash}
      content={() => (
        <ConfirmationModalContent
          title={<Trans>Add Liquidity</Trans>}
          onDismiss={handleDismissConfirmation}
          topContent={() => (
            <Review
              parsedAmounts={parsedAmounts}
              position={position}
              existingPosition={existingPosition}
              priceLower={priceLower}
              priceUpper={priceUpper}
              outOfRange={isOutOfRange}
              ticksAtLimit={areTicksAtLimit}
            />
          )}
          bottomContent={() => (
            <ButtonPrimary style={{ marginTop: '1rem' }} onClick={onAdd}>
              <Text fontWeight={500} fontSize={20}>
                <Trans>Add</Trans>
              </Text>
            </ButtonPrimary>
          )}
        />
      )}
      pendingText={pendingText}
    />
  )

  const makeCreatePoolStartPriceForm = () => (
    <AutoColumn gap="md">
      <RowBetween>
        <ThemedText.Label>
          <Trans>Set Starting Price</Trans>
        </ThemedText.Label>
      </RowBetween>
      {noLiquidity && (
        <BlueCard
          style={{
            display: 'flex',
            flexDirection: 'row',
            alignItems: 'center',
            padding: '1rem 1rem',
          }}
        >
          <ThemedText.Body fontSize={14} style={{ fontWeight: 500 }} textAlign="left" color={theme.primaryText1}>
            <Trans>
              This pool must be initialized before you can add liquidity. To initialize, select a starting price for the
              pool. Then, enter your liquidity price range and deposit amount. Gas fees will be higher than usual due to
              the initialization transaction.
            </Trans>
          </ThemedText.Body>
        </BlueCard>
      )}
      <OutlineCard padding="12px">
        <StyledInput className="start-price-input" value={startPriceTypedValue} onUserInput={onStartPriceInput} />
      </OutlineCard>
      <RowBetween style={{ backgroundColor: theme.bg1, padding: '12px', borderRadius: '12px' }}>
        <ThemedText.Main>
          <Trans>Current {baseCurrency?.symbol} Price:</Trans>
        </ThemedText.Main>
        <ThemedText.Main>
          {price ? (
            <ThemedText.Main>
              <RowFixed>
                <HoverInlineText
                  maxCharacters={20}
                  text={invertPrice ? price?.invert()?.toSignificant(5) : price?.toSignificant(5)}
                />{' '}
                <span style={{ marginLeft: '4px' }}>{quoteCurrency?.symbol}</span>
              </RowFixed>
            </ThemedText.Main>
          ) : (
            '-'
          )}
        </ThemedText.Main>
      </RowBetween>
    </AutoColumn>
  )

  return (
    <>
      <>
        <DowntimeWarning />
        {makeTransactionModal()}
        <StyledAppBody wide={!hasExistingPosition}>
          {makeTabHeader()}

          <ResponsiveTwoColumns wide={!hasExistingPosition}>
            <AutoColumn gap="lg">
              {hasExistingPosition && existingPosition ? (
                <PositionPreview
                  position={existingPosition}
                  title={<Trans>Selected Range</Trans>}
                  inRange={!isOutOfRange}
                  ticksAtLimit={areTicksAtLimit}
                />
              ) : (
                makeSelectPairAndTierSection()
              )}
            </AutoColumn>
            <div>{makeTokenAmountSection()}</div>
            {!hasExistingPosition ? (
              <>
                <HideMedium>{makeSubmitButtons()}</HideMedium>
                <RightContainer gap="lg">
                  <DynamicSection gap="md" disabled={sqrtGamma == null || isInvalidPool}>
                    {!noLiquidity ? (
                      <>
                        <RowBetween>
                          <ThemedText.Label>
                            <Trans>Set Price Range</Trans>
                          </ThemedText.Label>
                        </RowBetween>

                        {!noLiquidity && price && baseCurrency && quoteCurrency && (
                          <AutoRow gap="4px" justify="center" style={{ marginTop: '0.5rem' }}>
                            <Trans>
                              <ThemedText.Main fontWeight={500} textAlign="center" fontSize={12} color="text1">
                                Current Price:
                              </ThemedText.Main>
                              <ThemedText.Body fontWeight={500} textAlign="center" fontSize={12} color="text1">
                                <HoverInlineText
                                  maxCharacters={20}
                                  text={invertPrice ? price.invert().toSignificant(6) : price.toSignificant(6)}
                                />
                              </ThemedText.Body>
                              <ThemedText.Body color="text2" fontSize={12}>
                                {quoteCurrency?.symbol} per {baseCurrency.symbol}
                              </ThemedText.Body>
                            </Trans>
                          </AutoRow>
                        )}
                        <LiquidityChartRangeInput
                          currencyA={baseCurrency ?? undefined}
                          currencyB={quoteCurrency ?? undefined}
                          pool={pool || undefined}
                          tierId={tierId}
                          ticksAtLimit={areTicksAtLimit}
                          price={
                            price ? parseFloat((invertPrice ? price.invert() : price).toSignificant(8)) : undefined
                          }
                          priceLower={priceLower}
                          priceUpper={priceUpper}
                          onLeftRangeInput={onLeftRangeInput}
                          onRightRangeInput={onRightRangeInput}
                          interactive={!hasExistingPosition}
                        />
                      </>
                    ) : (
                      makeCreatePoolStartPriceForm()
                    )}
                  </DynamicSection>

                  {makeRangeFormSection()}

                  <MediumOnly>{makeSubmitButtons()}</MediumOnly>
                </RightContainer>
              </>
            ) : (
              makeSubmitButtons()
            )}
          </ResponsiveTwoColumns>
        </StyledAppBody>
        {addIsUnsupported && <UnsupportedCurrencyFooter show={addIsUnsupported} currencies={[currencyA, currencyB]} />}
      </>
      <SwitchLocaleLink />
    </>
  )
}
