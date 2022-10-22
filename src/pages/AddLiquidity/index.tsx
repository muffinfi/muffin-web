import { faLock, faLockOpen } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { Trans } from '@lingui/macro'
import { useManagerContract } from '@muffinfi/hooks/useContract'
import { useDerivedMuffinPositionByTokenId } from '@muffinfi/hooks/useDerivedPosition'
import { useFeeTierOptions } from '@muffinfi/hooks/useFeeTierOptions'
import { usePoolDefaultTickSpacing } from '@muffinfi/hooks/usePoolDefaultTickSpacing'
import { PoolState, useMuffinPool } from '@muffinfi/hooks/usePools'
import {
  encodeSqrtPriceX72,
  getCapitalEfficiency,
  getTokenRatio,
  isSqrtPriceSupported,
  isValidSqrtGamma,
  MAX_TICK,
  MIN_TICK,
  nearestUsableTick,
  Pool,
  Position,
  PositionManager,
  priceToClosestTick,
  priceToNumber,
  TickMath,
  tickToPrice,
  Tier,
  withoutScientificNotation,
  ZERO,
} from '@muffinfi/muffin-sdk'
import { useIsUsingInternalAccount } from '@muffinfi/state/user/hooks'
import { BalanceSource } from '@muffinfi/state/wallet/hooks'
import { decodeManagerFunctionData } from '@muffinfi/utils/decodeFunctionData'
import { getPriceRangeWithTokenRatio } from '@muffinfi/utils/getPriceRangeWithTokenRatio'
import * as M from '@muffinfi-ui'
import AlertHelper from '@muffinfi-ui/components/AlertHelper'
import { Currency, CurrencyAmount, Fraction, Percent, Price } from '@uniswap/sdk-core'
import { CurrencyAmountInScienticNotation } from 'components/FormattedCurrencyAmount'
import { LiquidityChart } from 'components/LiquidityChart'
import PageTitle from 'components/PageTitle/PageTitle'
import { QuestionHelperInline } from 'components/QuestionHelper'
import SettingsTab from 'components/Settings'
import UnsupportedCurrencyFooter from 'components/swap/UnsupportedCurrencyFooter'
import TierSelector from 'components/TierSelector'
import TokenWarningModal from 'components/TokenWarningModal'
import { MouseoverTooltipText } from 'components/Tooltip'
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
import styled from 'styled-components/macro'
import approveAmountCalldata from 'utils/approveAmountCalldata'
import { calculateGasMargin } from 'utils/calculateGasMargin'
import { currencyId } from 'utils/currencyId'
import { maxAmountSpend } from 'utils/maxAmountSpend'

import { ErrorCard, OutlineCard, YellowCard } from '../../components/Card'
import CurrencyInputPanel from '../../components/CurrencyInputPanel'
import DowntimeWarning from '../../components/DowntimeWarning'
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
import { HideExtraSmall, ThemedText } from '../../theme'
import { Rate, RateHelpText, RateName, RatePeriodToggle } from './APR'
import { ColumnDisableable, CurrencyDropdown, LoadingRows, StyledInput } from './styled'

const DEFAULT_ADD_IN_RANGE_SLIPPAGE_TOLERANCE = new Percent(50, 10_000)

const parseSqrtGamma = (sqrtGammaFromUrl: string | undefined) => {
  return sqrtGammaFromUrl && isValidSqrtGamma(parseFloat(sqrtGammaFromUrl)) ? parseFloat(sqrtGammaFromUrl) : undefined
}

const StyledCard = styled(OutlineCard)`
  padding: 12px;
  border: 1px solid var(--borderColor);
  font-size: 13px;
`

const LockButton = styled(M.Button).attrs((props) => ({ size: 'badge', color: props.color }))`
  display: inline-flex;
  padding: 2px 0;
  min-width: 22px;
  line-height: 0;
  font-weight: var(--regular);
`

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

  const defaultTickSpacing = usePoolDefaultTickSpacing(currencyA, currencyB)

  // fetch pool and tier
  const [poolState, pool] = useMuffinPool(baseCurrency, quoteCurrency)
  const [, tier] = pool?.getTierBySqrtGamma(sqrtGamma) || []

  const isCreatingPool = poolState === PoolState.NOT_EXISTS
  const isInvalidPool = poolState === PoolState.INVALID
  const tickSpacing = poolState === PoolState.NOT_EXISTS ? defaultTickSpacing : pool?.tickSpacing
  const isAddingTier = Boolean(pool && sqrtGamma && !tier)

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

  // get tier's current price.
  // - if pool exists but fee tier is not selected, return undefined
  // - if tier exists, return tier's price
  // - if first tier exists, return first tier's price
  // - otherwise, derive price from input fields
  const price = useMemo(() => {
    if (!token0) return undefined

    if (pool) {
      if (!sqrtGamma) return undefined
      if (tier) return tier.priceOf(token0)
      if (pool.tiers[0]) return pool.tiers[0].priceOf(token0)
    }

    const quoteAmount = tryParseAmount(startPriceTypedValue, invertPrice ? token0 : token1)
    const baseAmount = tryParseAmount('1', invertPrice ? token1 : token0)
    if (!quoteAmount || !baseAmount || !token0 || !token1) return undefined

    const price = new Price(baseAmount.currency, quoteAmount.currency, baseAmount.quotient, quoteAmount.quotient)
    return invertPrice ? price?.invert() : price
  }, [pool, tier, sqrtGamma, token0, token1, invertPrice, startPriceTypedValue])

  // check for invalid price input (converts to invalid ratio)
  const isInvalidPrice = useMemo(
    () => (price != null ? !isSqrtPriceSupported(encodeSqrtPriceX72(price.numerator, price.denominator)) : undefined),
    [price]
  )

  /*=====================================================================
   *                         PATCH RANGE INPUT
   *====================================================================*/

  const [independentRangeField, setIndependentRangeField] = useState<'LOWER' | 'UPPER'>('LOWER')
  const [weightLockedCurrencyBase, setWeightLockedCurrencyBase] = useState<number | undefined>(undefined)
  const { leftRangeTypedValue, rightRangeTypedValue } = useV3MintState()

  const [leftBoundInput, rightBoundInput] = useMemo((): [string | true, string | true] => {
    if (weightLockedCurrencyBase != null && price && leftRangeTypedValue !== '' && rightRangeTypedValue !== '') {
      const newRange = getPriceRangeWithTokenRatio(
        priceToNumber(invertPrice ? price.invert() : price),
        leftRangeTypedValue === true ? 2 ** -112 : Number(leftRangeTypedValue),
        rightRangeTypedValue === true ? 2 ** 112 : Number(rightRangeTypedValue),
        independentRangeField,
        weightLockedCurrencyBase
      )?.map((x) => withoutScientificNotation(x.toString()))

      if (newRange && newRange[0] != null && newRange[1] != null) {
        return [newRange[0], newRange[1]]
      }
    }
    return [leftRangeTypedValue, rightRangeTypedValue]
  }, [weightLockedCurrencyBase, leftRangeTypedValue, rightRangeTypedValue, independentRangeField, price, invertPrice])

  /*=====================================================================
   *                               TICKS
   *====================================================================*/

  const { ticks, areTicksAtLimit, tickPrices } = useMemo(() => {
    const tickLimits = {
      LOWER: tickSpacing ? nearestUsableTick(MIN_TICK, tickSpacing) : undefined,
      UPPER: tickSpacing ? nearestUsableTick(MAX_TICK, tickSpacing) : undefined,
    }
    const ticks = {
      LOWER:
        existingPosition?.tickLower ??
        ((invertPrice && rightBoundInput === true) || (!invertPrice && leftBoundInput === true)
          ? tickLimits.LOWER
          : invertPrice
          ? tryParseTick(token1, token0, tickSpacing, rightBoundInput.toString())
          : tryParseTick(token0, token1, tickSpacing, leftBoundInput.toString())),
      UPPER:
        existingPosition?.tickUpper ??
        ((invertPrice && leftBoundInput === true) || (!invertPrice && rightBoundInput === true)
          ? tickLimits.UPPER
          : invertPrice
          ? tryParseTick(token1, token0, tickSpacing, leftBoundInput.toString())
          : tryParseTick(token0, token1, tickSpacing, rightBoundInput.toString())),
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
  }, [token0, token1, invertPrice, tickSpacing, existingPosition, leftBoundInput, rightBoundInput])

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

  const [, allowedSqrtGammas] = useFeeTierOptions(currencyA, currencyB)
  const isValidSqrtGamma = allowedSqrtGammas?.indexOf(sqrtGamma ?? -1) !== -1

  /**
   * Return existing pool and tier if they exists
   * Mock one if pool does not exist
   * Return undefined if tier does not exists (i.e. wrong sqrt gamma)
   */
  const { mockPool, mockTier, mockTierId } = useMemo(() => {
    // if pool exists:
    if (poolState !== PoolState.NOT_EXISTS && pool) {
      const [tierId, tier] = pool.getTierBySqrtGamma(sqrtGamma)
      // if tier exists:
      if (tierId !== -1 && tier) {
        return { mockPool: pool, mockTier: tier, mockTierId: tierId }
      }
      // if tier does not exists, create mock pool and mock tier:
      if (sqrtGamma && isValidSqrtGamma) {
        const firstTierSqrtPrice = pool.tiers[0].sqrtPriceX72
        const mockTier = new Tier(pool.token0, pool.token1, 0, firstTierSqrtPrice, sqrtGamma, MIN_TICK, MAX_TICK) // empty liquidity
        const mockPool = new Pool(pool.token0, pool.token1, pool.tickSpacing, [...pool.tiers, mockTier])
        return { mockPool, mockTier, mockTierId: mockPool.tiers.length - 1 }
      }
    } else {
      // if pool does not exist, create mock pool and mock tier:
      if (tokenA && tokenB && tickSpacing && sqrtGamma && isValidSqrtGamma && price && !isInvalidPrice) {
        const parsedSqrtPrice = TickMath.tickToSqrtPriceX72(priceToClosestTick(price))
        const mockTier = new Tier(tokenA, tokenB, 0, parsedSqrtPrice, sqrtGamma, MIN_TICK, MAX_TICK) // empty liquidity
        const mockPool = new Pool(tokenA, tokenB, tickSpacing, [mockTier])
        return { mockPool, mockTier, mockTierId: 0 }
      }
    }
    // otherwise, return null
    return {}
  }, [pool, poolState, tokenA, tokenB, sqrtGamma, tickSpacing, isValidSqrtGamma, isInvalidPrice, price])

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
   *                  EXTRA AMOUNTS FOR CREATE POOL/TIER
   *====================================================================*/

  /**
   * Amounts needed to be the base liquidity if creating tier
   */
  const [amtAForCreateTier, amtBForCreateTier] = useMemo(() => {
    if (!currencyA || !currencyB || !mockPool || (!isCreatingPool && !isAddingTier)) return [undefined, undefined]

    return invertPrice
      ? [
          CurrencyAmount.fromRawAmount(currencyA, mockPool.token1AmountForCreateTier.quotient),
          CurrencyAmount.fromRawAmount(currencyB, mockPool.token0AmountForCreateTier.quotient),
        ]
      : [
          CurrencyAmount.fromRawAmount(currencyA, mockPool.token0AmountForCreateTier.quotient),
          CurrencyAmount.fromRawAmount(currencyB, mockPool.token1AmountForCreateTier.quotient),
        ]
  }, [currencyA, mockPool, isCreatingPool, isAddingTier, invertPrice, currencyB])

  /**
   * Amounts we send to the contract, including the amounts for the position and the amounts for creating tier
   */
  const inputAmounts = useMemo(() => {
    let amtAIn = parsedAmounts[Field.CURRENCY_A]
    let amtBIn = parsedAmounts[Field.CURRENCY_B]
    if (amtAForCreateTier) amtAIn = amtAIn?.add(amtAForCreateTier) ?? amtAForCreateTier
    if (amtBForCreateTier) amtBIn = amtBIn?.add(amtBForCreateTier) ?? amtBForCreateTier
    return {
      [Field.CURRENCY_A]: amtAIn,
      [Field.CURRENCY_B]: amtBIn,
    }
  }, [parsedAmounts, amtAForCreateTier, amtBForCreateTier])

  /*=====================================================================
   *                         ACCOUNT BALANCES
   *====================================================================*/

  const [balanceA, balanceB] = useCurrencyBalances(
    account ?? undefined,
    useMemo(() => [currencyA, currencyB], [currencyA, currencyB])
  )

  const maxAmounts = useMemo(() => {
    // get the max amounts user can add (actually only for taking care of native eth + gas)
    let maxAmtA = maxAmountSpend(balanceA)
    let maxAmtB = maxAmountSpend(balanceB)

    // subtract with the amounts needed to create tier, if we're creating tier
    if (maxAmtA && amtAForCreateTier) maxAmtA = maxAmtA.subtract(amtAForCreateTier)
    if (maxAmtB && amtBForCreateTier) maxAmtB = maxAmtB.subtract(amtBForCreateTier)
    if (maxAmtA?.lessThan(0)) maxAmtA = CurrencyAmount.fromRawAmount(maxAmtA.currency, 0)
    if (maxAmtB?.lessThan(0)) maxAmtB = CurrencyAmount.fromRawAmount(maxAmtB.currency, 0)

    return {
      [Field.CURRENCY_A]: maxAmtA,
      [Field.CURRENCY_B]: maxAmtB,
    }
  }, [balanceA, balanceB, amtAForCreateTier, amtBForCreateTier])

  const atMaxAmounts = {
    [Field.CURRENCY_A]: maxAmounts[Field.CURRENCY_A]?.equalTo(parsedAmounts[Field.CURRENCY_A] ?? '0'),
    [Field.CURRENCY_B]: maxAmounts[Field.CURRENCY_B]?.equalTo(parsedAmounts[Field.CURRENCY_B] ?? '0'),
  }

  /*=====================================================================
   *                      UI: TOKEN AMOUNT FIELDS
   *====================================================================*/

  // restrict to single deposit if price is out of range
  const tickCurrent = mockTier?.tickCurrent
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
  const amountA = inputAmounts[Field.CURRENCY_A]
  const amountB = inputAmounts[Field.CURRENCY_B]

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
    [Field.CURRENCY_A]: useOutstandingAmountToApprove(account ?? undefined, inputAmounts[Field.CURRENCY_A]),
    [Field.CURRENCY_B]: useOutstandingAmountToApprove(account ?? undefined, inputAmounts[Field.CURRENCY_B]),
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

  const { onFieldAInput, onFieldBInput, onLeftRangeInput, onRightRangeInput, onStartPriceInput } =
    useV3MintActionHandlers(isCreatingPool)

  const onLeftRangeInputViaField = useCallback(
    (typedValue: string) => {
      setIndependentRangeField('LOWER')
      onLeftRangeInput(typedValue)
    },
    [onLeftRangeInput]
  )
  const onRightRangeInputViaField = useCallback(
    (typedValue: string) => {
      setIndependentRangeField('UPPER')
      onRightRangeInput(typedValue)
    },
    [onRightRangeInput]
  )

  // const clearAll = useCallback(() => {
  //   setWeightLockedCurrencyBase(undefined)
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
      setWeightLockedCurrencyBase(undefined)
      onLeftRangeInput('')
      onRightRangeInput('')
      history.push(`/add/${currencyIdA}/${currencyIdB}/${sqrtGamma}`)
    },
    [currencyIdA, currencyIdB, history, onLeftRangeInput, onRightRangeInput]
  )

  const handleRateToggle = () => {
    if (!areTicksAtLimit[Bound.LOWER] && !areTicksAtLimit[Bound.UPPER]) {
      // switch price
      if (weightLockedCurrencyBase != null) setWeightLockedCurrencyBase(1 - weightLockedCurrencyBase)
      setIndependentRangeField((field) => (field === 'LOWER' ? 'UPPER' : 'LOWER'))
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
  const {
    getDecrementLower,
    getIncrementLower,
    getDecrementUpper,
    getIncrementUpper,
    getSetFullRange: setFullRange,
  } = useRangeHopCallbacks(baseCurrency, quoteCurrency, tickLower, tickUpper, tickSpacing, mockTier)

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
      ...(hasExistingPosition && tokenId
        ? { tokenId }
        : { recipient: account, createPool: isCreatingPool, createTier: isAddingTier }),
      useAccount,
      slippageTolerance,
      useNative,
      token0Permit: signatureDataToPermitOptions(permitSignatures[isTokenAt0 ? Field.CURRENCY_A : Field.CURRENCY_B]),
      token1Permit: signatureDataToPermitOptions(permitSignatures[isTokenAt0 ? Field.CURRENCY_B : Field.CURRENCY_A]),
    })

    let txn = { to: manager.address, data: calldata, value }

    if (argentWalletContract) {
      const amountA = inputAmounts[Field.CURRENCY_A]
      const amountB = inputAmounts[Field.CURRENCY_B]
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
        createPool: Boolean(isCreatingPool),
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
      // for debugging
      console.log(decodeManagerFunctionData(calldata, value))
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
    isCreatingPool,
    isAddingTier,
    slippageTolerance,
    permitSignatures,
    argentWalletContract,
    parsedAmounts,
    inputAmounts,
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
   *                   UI: PRICE RANGE DERIVED INFO
   *====================================================================*/

  const [valueRatio, capitalEfficiency] = useMemo(() => {
    if (!price || !priceLower || !priceUpper) return [undefined, undefined]

    const capitalEfficiency = getCapitalEfficiency(price, priceLower, priceUpper)
    const _ratio = getTokenRatio(price, priceLower, priceUpper)
    const ratio: [number, number] = invertPrice ? [_ratio[1], _ratio[0]] : _ratio

    return [ratio, capitalEfficiency]
  }, [price, priceLower, priceUpper, invertPrice])

  const setPriceRange = useCallback(
    (multiplier: Fraction) => {
      if (!price) return
      const newPriceLower = price.asFraction.multiply(price.scalar).divide(multiplier)
      const newPriceUpper = price.asFraction.multiply(price.scalar).multiply(multiplier)
      setWeightLockedCurrencyBase(undefined)
      if (invertPrice) {
        onLeftRangeInput(newPriceUpper.invert().toFixed(6))
        onRightRangeInput(newPriceLower.invert().toFixed(6))
      } else {
        onLeftRangeInput(newPriceLower.toFixed(6))
        onRightRangeInput(newPriceUpper.toFixed(6))
      }
    },
    [onLeftRangeInput, onRightRangeInput, price, invertPrice]
  )

  const handleSetFullRange = useCallback(() => {
    setWeightLockedCurrencyBase(undefined)
    setFullRange()
  }, [setFullRange])
  const handleSetPriceRange20000Bps = useCallback(() => setPriceRange(new Fraction(20000, 10000)), [setPriceRange])
  const handleSetPriceRange12000Bps = useCallback(() => setPriceRange(new Fraction(12000, 10000)), [setPriceRange])
  const handleSetPriceRange10100Bps = useCallback(() => setPriceRange(new Fraction(10100, 10000)), [setPriceRange])

  const currentWeight0 = valueRatio?.[0]
  const handleToggleWeightLock = useCallback(() => {
    if (weightLockedCurrencyBase == null) {
      setWeightLockedCurrencyBase(currentWeight0)
    } else {
      if (typeof leftBoundInput === 'string') onLeftRangeInput(leftBoundInput)
      if (typeof rightBoundInput === 'string') onRightRangeInput(rightBoundInput)
      setWeightLockedCurrencyBase(undefined)
    }
  }, [leftBoundInput, rightBoundInput, onLeftRangeInput, onRightRangeInput, currentWeight0, weightLockedCurrencyBase])

  const isTokenWeightUnmatched = useMemo(() => {
    if (weightLockedCurrencyBase == null || currentWeight0 == null) return false
    const absDiff = Math.abs(currentWeight0 - weightLockedCurrencyBase)
    const pctDiff = Math.abs(currentWeight0 / weightLockedCurrencyBase - 1)
    return absDiff > 0.01 && pctDiff > 0.03 // threshold: 1% abs diff and 3% pct diff
  }, [weightLockedCurrencyBase, currentWeight0])

  /*=====================================================================
   *                          REACT COMPONENTS
   *====================================================================*/

  const theme = useTheme()

  const makeSelectPoolTierSection = () =>
    tokenId == null &&
    !hasExistingPosition && (
      <M.SectionCard greedyMargin>
        <M.Column stretch gap="32px">
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
              currencyA={currencyA}
              currencyB={currencyB}
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
    isCreatingPool && (
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

          {isAddingTier ? (
            <YellowCard padding="12px" $borderRadius="12px">
              <M.RowBetween gap="12px">
                <AlertTriangle stroke="#d39000" size="16px" style={{ flexShrink: 0 }} />
                <M.Text color="alert-text" style={{ fontSize: 13 }}>
                  <Trans>
                    Note that initializing a fee tier will cost a higher gas fee, and will also charge a tiny amount of
                    the underlying tokens (
                    <CurrencyAmountInScienticNotation amount={amtAForCreateTier} /> and{' '}
                    <CurrencyAmountInScienticNotation amount={amtBForCreateTier} />
                    ).
                  </Trans>
                </M.Text>
              </M.RowBetween>
            </YellowCard>
          ) : null}

          <M.Column stretch gap="16px">
            <M.Row gap="1em">
              <M.Text color="text2" size="sm">
                <Trans>Current Price:</Trans>
              </M.Text>
              <M.Text weight="semibold">
                <M.PriceExpr price={invertPrice ? price?.invert() : price} />
              </M.Text>
            </M.Row>

            {isCreatingPool ? null : (
              <>
                <LiquidityChart
                  currencyBase={baseCurrency}
                  currencyQuote={quoteCurrency}
                  tierId={mockTierId}
                  priceLower={invertPrice ? priceUpper?.invert() : priceLower}
                  priceUpper={invertPrice ? priceLower?.invert() : priceUpper}
                  weightLockedCurrencyBase={weightLockedCurrencyBase}
                  onLeftRangeInput={onLeftRangeInput}
                  onRightRangeInput={onRightRangeInput}
                  setIndependentRangeField={setIndependentRangeField}
                  resetRangeNonce={sqrtGamma}
                />
                {/* <LiquidityChartRangeInput
                  currencyA={baseCurrency ?? undefined}
                  currencyB={quoteCurrency ?? undefined}
                  pool={pool || undefined}
                  tierId={isAddingTier ? 0 : tierId}
                  ticksAtLimit={areTicksAtLimit}
                  price={price ? parseFloat((invertPrice ? price.invert() : price).toSignificant(8)) : undefined}
                  priceLower={priceLower}
                  priceUpper={priceUpper}
                  onLeftRangeInput={onLeftRangeInput}
                  onRightRangeInput={onRightRangeInput}
                  interactive={!hasExistingPosition}
                /> */}
              </>
            )}
          </M.Column>

          <M.Column stretch gap="16px">
            <RangeSelector
              priceCurrent={price}
              priceLower={priceLower}
              priceUpper={priceUpper}
              getDecrementLower={getDecrementLower}
              getIncrementLower={getIncrementLower}
              getDecrementUpper={getDecrementUpper}
              getIncrementUpper={getIncrementUpper}
              onLeftRangeInput={onLeftRangeInputViaField}
              onRightRangeInput={onRightRangeInputViaField}
              currencyA={baseCurrency}
              currencyB={quoteCurrency}
              ticksAtLimit={areTicksAtLimit}
            />

            <M.Row gap="1em">
              <M.Button color="outline" size="xs" onClick={handleSetFullRange}>
                Full range
              </M.Button>
              <M.Button color="outline" size="xs" onClick={handleSetPriceRange20000Bps}>
                &times;&divide;2
              </M.Button>
              <M.Button color="outline" size="xs" onClick={handleSetPriceRange12000Bps}>
                &times;&divide;1.2
              </M.Button>
              <M.Button color="outline" size="xs" onClick={handleSetPriceRange10100Bps}>
                &times;&divide;1.01
              </M.Button>
            </M.Row>

            <StyledCard>
              <M.Column stretch gap="12px">
                <M.RowBetween>
                  <M.Text>
                    <Trans>Token Ratio</Trans> ({baseCurrency?.symbol} : {quoteCurrency?.symbol})
                    <QuestionHelperInline
                      text={
                        <Trans>
                          This is the ratio of the cash values of the two underlying tokens in this position.
                        </Trans>
                      }
                      placement="top"
                    />
                  </M.Text>

                  <M.Row gap="6px" justifyEnd>
                    <M.Text>
                      {valueRatio ? `${(valueRatio[0] * 100).toFixed(0)}% : ${(valueRatio[1] * 100).toFixed(0)}%` : '-'}
                    </M.Text>
                    {weightLockedCurrencyBase != null && isTokenWeightUnmatched ? (
                      <AlertHelper
                        text={
                          <Trans>
                            We failed to adjust the price range to your wanted token ratio (
                            {(weightLockedCurrencyBase * 100).toFixed(0)}%:
                            {((1 - weightLockedCurrencyBase) * 100).toFixed(0)}%). Maybe because the price range is too
                            narrow or too wide.
                          </Trans>
                        }
                        placement="top"
                        tooltipSize="xs"
                      />
                    ) : null}
                    {valueRatio ? (
                      <MouseoverTooltipText
                        text={
                          <Trans>
                            Lock the token ratio such that your price range automatically adjusts when changing price
                            boundary.
                          </Trans>
                        }
                        tooltipSize="xs"
                        placement="top"
                      >
                        <LockButton
                          color={weightLockedCurrencyBase == null ? 'tertiary' : 'secondary'}
                          onClick={handleToggleWeightLock}
                        >
                          {weightLockedCurrencyBase == null ? (
                            <FontAwesomeIcon icon={faLockOpen} fontSize={10} />
                          ) : (
                            <FontAwesomeIcon icon={faLock} fontSize={10} />
                          )}
                        </LockButton>
                      </MouseoverTooltipText>
                    ) : null}
                  </M.Row>
                </M.RowBetween>

                <M.RowBetween>
                  <M.Text>
                    <Trans>Capitial Efficiency</Trans>
                    <QuestionHelperInline
                      text={
                        <Trans>
                          For example, 2x capital efficiency means one unit of liquidity in a concentrated liquidity
                          position would require 2x capital in a full-range position.
                          <br />
                          <br />
                          The narrower the price range, the higher the capitial efficiency.
                        </Trans>
                      }
                      placement="top"
                    />
                  </M.Text>
                  <M.Text>
                    {capitalEfficiency && Number.isFinite(capitalEfficiency) && capitalEfficiency >= 0 ? (
                      <>{capitalEfficiency.toFixed(2)}x</>
                    ) : (
                      '-'
                    )}
                  </M.Text>
                </M.RowBetween>

                <M.RowBetween>
                  <M.Text>
                    <MouseoverTooltipText
                      text={<RatePeriodToggle />}
                      keepOpenWhenHoverTooltip
                      placement="bottom-start"
                      tooltipPadding="0.3rem"
                    >
                      <span style={{ textDecoration: 'underline', textDecorationStyle: 'dotted', cursor: 'pointer' }}>
                        <RateName />
                      </span>
                    </MouseoverTooltipText>
                    <HideExtraSmall>
                      {' '}
                      <Trans>(when in-range; excl. IL)</Trans>
                    </HideExtraSmall>
                    <QuestionHelperInline text={<RateHelpText />} keepOpenWhenHoverTooltip placement="top" />
                  </M.Text>
                  <M.Text align="right">
                    <Rate pool={pool ?? undefined} tierId={mockTierId} capitalEfficiency={capitalEfficiency} />
                  </M.Text>
                </M.RowBetween>
              </M.Column>
            </StyledCard>

            {isInvalidRange ? (
              <ErrorCard padding="12px" $borderRadius="12px">
                <M.RowBetween gap="12px">
                  <AlertTriangle stroke={theme.red3} size="16px" />
                  <ThemedText.Main color="red3" fontSize="12px">
                    <Trans>Invalid range selected. The min price must be lower than the max price.</Trans>
                  </ThemedText.Main>
                </M.RowBetween>
              </ErrorCard>
            ) : null}

            {isOutOfRange ? (
              <YellowCard padding="12px" $borderRadius="12px">
                <M.RowBetween gap="12px">
                  <AlertTriangle stroke="#d39000" size="16px" style={{ flexShrink: 0 }} />
                  <M.Text color="alert-text" size="xs">
                    <Trans>
                      Your position will not earn fees or be used in trades until the market price moves into your
                      range.
                    </Trans>
                  </M.Text>
                </M.RowBetween>
              </YellowCard>
            ) : null}
          </M.Column>
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

        {isCreatingPool || isAddingTier ? (
          <StyledCard>
            <M.TextDiv paragraphLineHeight>
              In addition, <CurrencyAmountInScienticNotation amount={amtAForCreateTier} /> and{' '}
              <CurrencyAmountInScienticNotation amount={amtBForCreateTier} /> are charged for creating this new{' '}
              {isCreatingPool ? 'pool' : 'fee tier'}.
            </M.TextDiv>
          </StyledCard>
        ) : null}

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
          topContent={() =>
            position ? (
              <PositionPreview
                position={position}
                title={<Trans>Selected Range</Trans>}
                inRange={!isOutOfRange}
                ticksAtLimit={areTicksAtLimit}
                baseCurrencyDefault={baseCurrency}
              />
            ) : null
          }
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
      <PageTitle title={tokenId ? `#${tokenId} - Add Liquidity` : 'Add Liquidity'} />

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

      {addIsUnsupported && <UnsupportedCurrencyFooter currencies={[currencyA, currencyB]} />}
      <SwitchLocaleLink />
    </>
  )
}
