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
import * as M from '@muffinfi-ui'
import { Currency, CurrencyAmount, Percent, Price } from '@uniswap/sdk-core'
import SettingsTab from 'components/Settings'
import UnsupportedCurrencyFooter from 'components/swap/UnsupportedCurrencyFooter'
import TierSelector from 'components/TierSelector'
import TokenWarningModal from 'components/TokenWarningModal'
import useActiveWeb3React from 'hooks/useActiveWeb3React'
import useCurrency from 'hooks/useCurrency'
import useTheme from 'hooks/useTheme'
import useTokenWarningModalHooks from 'hooks/useTokenWarningModalHooks'
import TokenApproveOrPermitButton from 'lib/components/TokenApproveOrPermitButton'
import { ApproveOrPermitState } from 'lib/hooks/useApproveOrPermit'
import { useTokenBalances } from 'lib/hooks/useCurrencyBalance'
import useOutstandingAmountToApprove from 'lib/hooks/useOutstandingAmountToApprove'
import { useTokenApproveOrPermitButtonHandler } from 'lib/hooks/useTokenApproveOrPermitButtonHandlers'
import { signatureDataToPermitOptions } from 'lib/utils/erc20Permit'
import { ReactNode, useCallback, useMemo, useState } from 'react'
import { AlertTriangle } from 'react-feather'
import ReactGA from 'react-ga'
import { RouteComponentProps } from 'react-router-dom'
import { useAppDispatch } from 'state/hooks'
import { resetMintState as resetMintV3State } from 'state/mint/v3/actions'
import { useRangeHopCallbacks, useV3MintActionHandlers, useV3MintState } from 'state/mint/v3/hooks'
import { tryParseTick } from 'state/mint/v3/utils'
import { tryParseAmount } from 'state/swap/hooks'
import { useCurrencyBalances } from 'state/wallet/hooks'
import approveAmountCalldata from 'utils/approveAmountCalldata'
import { calculateGasMargin } from 'utils/calculateGasMargin'
import { currencyId } from 'utils/currencyId'
import { maxAmountSpend } from 'utils/maxAmountSpend'

import { ErrorCard, OutlineCard, YellowCard } from '../../components/Card'
import CurrencyInputPanel from '../../components/CurrencyInputPanel'
import DowntimeWarning from '../../components/DowntimeWarning'
import LiquidityChartRangeInput from '../../components/LiquidityChartRangeInput'
import { PositionPreview } from '../../components/PositionPreview'
import RangeSelector from '../../components/RangeSelector'
import RateToggle from '../../components/RateToggle'
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
import { ThemedText } from '../../theme'
import { Review } from './Review'
import { ColumnDisableable, CurrencyDropdown, LoadingRows, StyledInput } from './styled'

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
    errorMessage = errorMessage ?? <Trans>Invalid token pair</Trans>
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

  // const clearAll = useCallback(() => {
  //   onFieldAInput('')
  //   onFieldBInput('')
  //   onLeftRangeInput('')
  //   onRightRangeInput('')
  //   history.push(`/add`)
  // }, [history, onFieldAInput, onFieldBInput, onLeftRangeInput, onRightRangeInput])

  /*=====================================================================
   *                             UI STATES
   *====================================================================*/

  // tx confirm modal
  const [showTxModalConfirm, setShowTxModalConfirm] = useState(false)
  const [isAttemptingTxn, setIsAttemptingTxn] = useState(false) // i.e. clicked confirm

  // hash of ongoing tx
  const [txHash, setTxHash] = useState('')

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
      history.push('/positions') // jump to position listing page after creating
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
  const internalAmounts = useTokenBalances(
    account ?? undefined,
    useMemo(() => (tokenA && tokenB ? [tokenA, tokenB] : []), [tokenA, tokenB]),
    tryUseInternalAccount ? BalanceSource.INTERNAL_ACCOUNT : 0
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
    const useAccount =
      (tryUseInternalAccount &&
        ((!depositADisabled && internalAmounts?.[baseCurrency.wrapped.address]?.greaterThan(0)) ||
          (!depositBDisabled && internalAmounts?.[quoteCurrency.wrapped.address]?.greaterThan(0)))) ??
      false

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
    tryUseInternalAccount,
    depositADisabled,
    internalAmounts,
    depositBDisabled,
    currencyA,
    hasExistingPosition,
    tokenId,
    noLiquidity,
    slippageTolerance,
    permitSignatures,
    argentWalletContract,
    parsedAmounts,
    addTransaction,
    currencies,
  ])

  /*=====================================================================
   *                     TOKEN WARNING MODAL (UI)
   *====================================================================*/

  const { importTokensNotInDefault, dismissTokenWarning, handleConfirmTokenWarning, handleDismissTokenWarning } =
    useTokenWarningModalHooks(
      useMemo(() => [currencyA, currencyB], [currencyA, currencyB]),
      history,
      '/add/ETH'
    )

  /*=====================================================================
   *                          REACT COMPONENTS
   *====================================================================*/

  const theme = useTheme()

  const makeSelectPoolTierSection = () =>
    tokenId == null &&
    !hasExistingPosition && (
      <M.SectionCard greedyMargin>
        <M.Column stretch gap="24px">
          <M.Column stretch gap="8px">
            <M.Text weight="semibold">
              <Trans>Select Token Pair</Trans>
            </M.Text>
            <M.RowBetween gap="16px">
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
            </M.RowBetween>
          </M.Column>

          <M.Column stretch gap="8px">
            <M.Text weight="semibold">
              <Trans>Select Fee Tier</Trans>
            </M.Text>
            <TierSelector
              disabled={!quoteCurrency || !baseCurrency}
              pool={pool ?? undefined}
              sqrtGammaSelected={sqrtGamma}
              showNotCreated
              handleTierSelect={handleTierSelect}
            />
          </M.Column>
        </M.Column>
      </M.SectionCard>
    )

  const makeSetStartingPriceForm = () =>
    tokenId == null &&
    !hasExistingPosition &&
    sqrtGamma != null &&
    !isInvalidPool &&
    noLiquidity && (
      <M.SectionCard greedyMargin>
        <M.Column stretch gap="24px">
          <M.RowBetween>
            <M.Text weight="semibold">
              <Trans>Set Starting Price</Trans>
            </M.Text>

            {baseCurrency && quoteCurrency ? (
              <RateToggle currencyA={baseCurrency} currencyB={quoteCurrency} handleRateToggle={handleRateToggle} />
            ) : null}
          </M.RowBetween>

          <ErrorCard>
            <M.Text color="primary2" size="sm" paragraphLineHeight>
              <Trans>
                This pool requires initialization. Please set a starting price for the pool. Also, gas fees will be
                higher than usual due to initialization.
              </Trans>
            </M.Text>
          </ErrorCard>

          <M.DataGroup>
            <M.DataLabel>
              <Trans>Starting price</Trans>
            </M.DataLabel>
            <OutlineCard padding="12px">
              <M.RowBetween gap="1em">
                <StyledInput
                  className="start-price-input"
                  value={startPriceTypedValue}
                  onUserInput={onStartPriceInput}
                  style={{ flex: 1 }}
                />
                <M.PriceUnit
                  currencyBase={baseCurrency}
                  currencyQuote={quoteCurrency}
                  style={{ width: 'max-content' }}
                />
              </M.RowBetween>
            </OutlineCard>
          </M.DataGroup>
        </M.Column>
      </M.SectionCard>
    )

  const makeSelectPriceRangeSection = () =>
    tokenId == null &&
    !hasExistingPosition && (
      <M.SectionCard greedyMargin>
        <ColumnDisableable
          stretch
          gap="24px"
          disabled={!sqrtGamma || isInvalidPool || (isCreatingPool && !startPriceTypedValue)}
        >
          <M.RowBetween>
            <M.Text weight="semibold">
              <Trans>Select Price Range</Trans>
            </M.Text>

            {baseCurrency && quoteCurrency ? (
              <RateToggle currencyA={baseCurrency} currencyB={quoteCurrency} handleRateToggle={handleRateToggle} />
            ) : null}
          </M.RowBetween>

          <M.Column stretch gap="16px">
            <M.Row gap="1em">
              <M.Text color="text2" size="sm">
                <Trans>Current Price:</Trans>
              </M.Text>
              <M.Text weight="semibold">
                <M.PriceExpr price={invertPrice ? price?.invert() : price} />
              </M.Text>
            </M.Row>

            {noLiquidity ? null : (
              <LiquidityChartRangeInput
                currencyA={baseCurrency ?? undefined}
                currencyB={quoteCurrency ?? undefined}
                pool={pool || undefined}
                tierId={tierId}
                ticksAtLimit={areTicksAtLimit}
                price={price ? parseFloat((invertPrice ? price.invert() : price).toSignificant(8)) : undefined}
                priceLower={priceLower}
                priceUpper={priceUpper}
                onLeftRangeInput={onLeftRangeInput}
                onRightRangeInput={onRightRangeInput}
                interactive={!hasExistingPosition}
              />
            )}
          </M.Column>

          <M.Column stretch gap="16px">
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
              ticksAtLimit={areTicksAtLimit}
            />

            <M.Row gap="1em">
              <M.Button color="outline" size="xs" onClick={getSetFullRange}>
                Full range
              </M.Button>
            </M.Row>
          </M.Column>

          {isOutOfRange ? (
            <YellowCard padding="12px" $borderRadius="12px">
              <M.RowBetween gap="12px">
                <AlertTriangle stroke={theme.yellow3} size="16px" style={{ flexShrink: 0 }} />
                <ThemedText.Yellow fontSize="12px">
                  <Trans>
                    Your position will not earn fees or be used in trades until the market price moves into your range.
                  </Trans>
                </ThemedText.Yellow>
              </M.RowBetween>
            </YellowCard>
          ) : null}

          {isInvalidRange ? (
            <YellowCard padding="12px" $borderRadius="12px">
              <M.RowBetween gap="12px">
                <AlertTriangle stroke={theme.yellow3} size="16px" />
                <ThemedText.Yellow fontSize="12px">
                  <Trans>Invalid range selected. The min price must be lower than the max price.</Trans>
                </ThemedText.Yellow>
              </M.RowBetween>
            </YellowCard>
          ) : null}
        </ColumnDisableable>
      </M.SectionCard>
    )

  const makeDepositAmountSection = () => (
    <M.SectionCard greedyMargin>
      <ColumnDisableable
        stretch
        gap="24px"
        disabled={!sqrtGamma || tickLower === undefined || tickUpper === undefined || isInvalidPool || isInvalidRange}
      >
        <M.RowBetween>
          <M.Text weight="semibold">
            {hasExistingPosition ? <Trans>Add more liquidity</Trans> : <Trans>Deposit Amounts</Trans>}
          </M.Text>
          <M.Row gap="0.5em">
            <M.AccountWalletButton />
            <SettingsTab placeholderSlippage={DEFAULT_ADD_IN_RANGE_SLIPPAGE_TOLERANCE} noDeadline={true} />
          </M.Row>
        </M.RowBetween>

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

        {addIsUnsupported ? (
          <M.ButtonRowPrimary disabled>
            <Trans>Unsupported Asset</Trans>
          </M.ButtonRowPrimary>
        ) : !account ? (
          <M.ButtonRowSecondary onClick={toggleWalletModal}>
            <Trans>Connect Wallet</Trans>
          </M.ButtonRowSecondary>
        ) : (
          <M.Column gap="16px">
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
            <M.ButtonRow
              onClick={() => {
                expertMode ? onAdd() : setShowTxModalConfirm(true)
              }}
              color={
                !isValid && !!parsedAmounts[Field.CURRENCY_A] && !!parsedAmounts[Field.CURRENCY_B] ? 'error' : 'primary'
              }
              disabled={
                !isValid ||
                (!argentWalletContract &&
                  !depositADisabled &&
                  approvalStates[Field.CURRENCY_A] !== ApproveOrPermitState.APPROVED) ||
                (!argentWalletContract &&
                  !depositBDisabled &&
                  approvalStates[Field.CURRENCY_B] !== ApproveOrPermitState.APPROVED)
              }
            >
              {errorMessage ? errorMessage : expertMode ? <Trans>Add Liquidity</Trans> : <Trans>Preview</Trans>}
            </M.ButtonRow>
          </M.Column>
        )}
      </ColumnDisableable>
    </M.SectionCard>
  )

  const makeExistingPositionInfoSection = () =>
    existingPosition != null && (
      <M.SectionCard greedyMargin>
        <M.Column stretch gap="24px">
          <M.Text weight="semibold">
            <Trans>Existing Position Info</Trans>
          </M.Text>
          <PositionPreview
            position={existingPosition}
            title={<Trans>Selected Range</Trans>}
            inRange={!isOutOfRange}
            ticksAtLimit={areTicksAtLimit}
          />
        </M.Column>
      </M.SectionCard>
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
            <M.ButtonRowPrimary style={{ marginTop: '1rem' }} onClick={onAdd}>
              <Trans>Add Liquidity</Trans>
            </M.ButtonRowPrimary>
          )}
        />
      )}
      pendingText={pendingText}
    />
  )

  const dispatch = useAppDispatch()

  return (
    <>
      <TokenWarningModal
        isOpen={importTokensNotInDefault.length > 0 && !dismissTokenWarning}
        tokens={importTokensNotInDefault}
        onConfirm={handleConfirmTokenWarning}
        onDismiss={handleDismissTokenWarning}
      />
      <DowntimeWarning />
      {makeTransactionModal()}

      <M.Container maxWidth={tokenId == null ? '29rem' : '27rem'}>
        <M.Column stretch gap="32px">
          <M.Link
            color="text2"
            to={`/positions${tokenId ? `/${tokenId.toString()}` : ''}`}
            onClick={() => {
              dispatch(resetMintV3State())
            }}
          >
            <Trans>← Back</Trans>
          </M.Link>

          <M.Text size="xl" weight="bold">
            <Trans>Add Liquidity</Trans>
          </M.Text>

          {tokenId != null && !hasExistingPosition ? (
            <LoadingRows>
              <div />
              <div />
              <div />
              <div />
              <div />
            </LoadingRows>
          ) : (
            <>
              {makeExistingPositionInfoSection()}
              {makeSelectPoolTierSection()}
              {makeSetStartingPriceForm()}
              {makeSelectPriceRangeSection()}
              {makeDepositAmountSection()}
            </>
          )}
        </M.Column>
      </M.Container>

      {addIsUnsupported && <UnsupportedCurrencyFooter show={addIsUnsupported} currencies={[currencyA, currencyB]} />}
      <SwitchLocaleLink />
    </>
  )
}
