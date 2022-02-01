import { BigNumber } from '@ethersproject/bignumber'
import { Trans } from '@lingui/macro'
import { useManagerContract } from '@muffinfi/hooks/useContract'
import { useDerivedMuffinPosition } from '@muffinfi/hooks/useDerivedPosition'
import { useMuffinPositionDetailFromTokenId } from '@muffinfi/hooks/usePositions'
import { ADDRESS_ZERO, PositionManager } from '@muffinfi/muffin-v1-sdk'
import { CurrencyAmount, Percent } from '@uniswap/sdk-core'
import RangeBadge from 'components/Badge/RangeBadge'
import { ButtonConfirmed, ButtonPrimary } from 'components/Button'
import { LightCard } from 'components/Card'
import { AutoColumn } from 'components/Column'
import CurrencyLogo from 'components/CurrencyLogo'
import DoubleCurrencyLogo from 'components/DoubleLogo'
import { Break } from 'components/earn/styled'
import FormattedCurrencyAmount from 'components/FormattedCurrencyAmount'
import Loader from 'components/Loader'
import { AddRemoveTabs } from 'components/NavigationTabs'
import { AutoRow, RowBetween, RowFixed } from 'components/Row'
import Slider from 'components/Slider'
import Toggle from 'components/Toggle'
import useDebouncedChangeHandler from 'hooks/useDebouncedChangeHandler'
import useTheme from 'hooks/useTheme'
import useTransactionDeadline from 'hooks/useTransactionDeadline'
import { useActiveWeb3React } from 'hooks/web3'
import { ReactNode, useCallback, useMemo, useState } from 'react'
import ReactGA from 'react-ga'
import { Redirect, RouteComponentProps } from 'react-router-dom'
import { Text } from 'rebass'
import { useBurnV3ActionHandlers, useBurnV3State } from 'state/burn/v3/hooks'
import { useTransactionAdder } from 'state/transactions/hooks'
import { useUserSlippageToleranceWithDefault } from 'state/user/hooks'
import { ThemedText } from 'theme'
import { unwrappedToken } from 'utils/unwrappedToken'
import TransactionConfirmationModal, { ConfirmationModalContent } from '../../components/TransactionConfirmationModal'
import { TransactionType } from '../../state/transactions/actions'
import { calculateGasMargin } from '../../utils/calculateGasMargin'
import { currencyId } from '../../utils/currencyId'
import AppBody from '../AppBody'
import { ResponsiveHeaderText, SmallMaxButton, Wrapper } from './styled'

const DEFAULT_WITHDRAW = true // TODO:
const DEFAULT_COLLECT_ALL_FEES = false // TODO:
const DEFAULT_REMOVE_V3_LIQUIDITY_SLIPPAGE_TOLERANCE = new Percent(5, 100)

export default function RemoveLiquidityV3({ location, match: { params } }: RouteComponentProps<{ tokenId: string }>) {
  const tokenIdFromUrl: string | undefined = params.tokenId
  const parsedTokenId = useMemo(() => {
    try {
      return BigNumber.from(tokenIdFromUrl)
    } catch {
      return undefined
    }
  }, [tokenIdFromUrl])

  if (parsedTokenId == null || parsedTokenId.eq(0)) {
    // redirect invalid tokenIds
    return <Redirect to={{ ...location, pathname: '/pool' }} />
  }

  return <Remove tokenId={parsedTokenId} />
}

function Remove({ tokenId }: { tokenId: BigNumber }) {
  const { account, chainId, library } = useActiveWeb3React()
  const { position: positionDetail } = useMuffinPositionDetailFromTokenId(tokenId)
  const { position } = useDerivedMuffinPosition(positionDetail)

  const token0 = position?.pool.token0
  const token1 = position?.pool.token1
  const currency0 = token0 != null ? unwrappedToken(token0) : undefined
  const currency1 = token1 != null ? unwrappedToken(token1) : undefined

  /*=====================================================================
   *                        RECEIVE WETH OR ETH
   *====================================================================*/

  // flag for receiving WETH (default collect as WETH)
  const [receiveWETH, setReceiveWETH] = useState(true)
  const showCollectAsWeth = false // Boolean(currency0 && currency1 && (currency0.isNative || currency1.isNative))
  const _wantedCurrency0 = receiveWETH ? token0 : currency0
  const _wantedCurrency1 = receiveWETH ? token1 : currency1

  /*=====================================================================
   *                           FEE AMOUNTS
   *====================================================================*/

  // wrap fee amount into CurrencyAmount
  const [feeAmount0, feeAmount1] = useMemo(() => {
    if (!positionDetail || !_wantedCurrency0 || !_wantedCurrency1) return []
    return [
      CurrencyAmount.fromRawAmount(_wantedCurrency0, positionDetail.feeAmount0.toString()),
      CurrencyAmount.fromRawAmount(_wantedCurrency1, positionDetail.feeAmount1.toString()),
    ]
  }, [positionDetail, _wantedCurrency0, _wantedCurrency1])

  /*=====================================================================
   *                   AMOUNTS FROM BURNED LIQUIDITY
   *====================================================================*/

  // compute the amount received from burning the liquidity
  const { percent } = useBurnV3State()
  const liquidityPercent = useMemo(() => new Percent(percent, 100), [percent])

  // unwrap token amount to the wanted currency amount
  const [partialAmount0, partialAmount1] = useMemo(() => {
    if (!position || !_wantedCurrency0 || !_wantedCurrency1) return []
    return [
      CurrencyAmount.fromRawAmount(_wantedCurrency0, liquidityPercent.multiply(position.amount0.quotient).quotient),
      CurrencyAmount.fromRawAmount(_wantedCurrency1, liquidityPercent.multiply(position.amount1.quotient).quotient),
    ]
  }, [liquidityPercent, position, _wantedCurrency0, _wantedCurrency1])

  /*=====================================================================
   *                       BUTTON ERROR MESSAGE
   *====================================================================*/

  let error: ReactNode | undefined
  if (!account) {
    error = <Trans>Connect Wallet</Trans>
  }
  if (percent === 0) {
    error = error ?? <Trans>Enter a percent</Trans>
  }

  /*=====================================================================
   *                              MISCS
   *====================================================================*/

  // compute whether position is out of range
  const _tick = position?.poolTier.computedTick
  const outOfRange = position && _tick != null && (_tick < position.tickLower || _tick >= position.tickUpper)

  // whether the position is emptied
  const removed = positionDetail?.liquidityD8.eq(0)

  /*=====================================================================
   *                        FIELD STATE ACTIONS
   *====================================================================*/

  const { onPercentSelect } = useBurnV3ActionHandlers()
  const [percentForSlider, onPercentSelectForSlider] = useDebouncedChangeHandler(percent, onPercentSelect)

  /*=====================================================================
   *                            UI STATES
   *====================================================================*/

  const theme = useTheme()
  const [showConfirm, setShowConfirm] = useState(false)
  const [isAttemptingTxn, setIsAttemptingTxn] = useState(false)
  const [txHash, setTxHash] = useState<string | undefined>()

  /*=====================================================================
   *                         UI ACTION HANDLER
   *====================================================================*/

  const handleDismissConfirmation = useCallback(() => {
    setShowConfirm(false)
    if (txHash) {
      // having txHash implies we just removed liquidity. clear input if so
      onPercentSelectForSlider(0)
    }
    setTxHash('')
    setIsAttemptingTxn(false)
  }, [onPercentSelectForSlider, txHash])

  /*=====================================================================
   *                    BURN LIQUIDITY CHAIN ACTION
   *====================================================================*/

  const manager = useManagerContract()
  const deadline = useTransactionDeadline() // NOTE: not using currently
  const slippageTolerance = useUserSlippageToleranceWithDefault(DEFAULT_REMOVE_V3_LIQUIDITY_SLIPPAGE_TOLERANCE)
  const addTransaction = useTransactionAdder()

  /**
   * NOTE:
   * - does not support internal account
   * - does not support collect as native eth
   * - does not support deadline
   */
  const burn = useCallback(async () => {
    if (!chainId || !library || !account || !manager) return
    if (!deadline || !positionDetail || !position || !liquidityPercent || !partialAmount0 || !partialAmount1) return

    const { calldata, value } = PositionManager.removeCallParameters(position, {
      tokenId: tokenId.toString(),
      liquidityPercentage: liquidityPercent,
      slippageTolerance,
      withdrawalRecipient: DEFAULT_WITHDRAW ? account : ADDRESS_ZERO,
      collectAllFees: DEFAULT_COLLECT_ALL_FEES,
      isSettledPosition: position.settled,
    })

    try {
      setIsAttemptingTxn(true)
      const txn = { to: manager.address, data: calldata, value }
      const gasEst = await library.getSigner().estimateGas(txn)
      const response = await library.getSigner().sendTransaction({ ...txn, gasLimit: calculateGasMargin(gasEst) })
      setIsAttemptingTxn(false)

      addTransaction(response, {
        type: TransactionType.REMOVE_LIQUIDITY_MUFFIN,
        baseCurrencyId: currencyId(partialAmount0.currency),
        quoteCurrencyId: currencyId(partialAmount1.currency),
        sqrtGamma: position.poolTier.sqrtGamma,
        expectedAmountBaseRaw: partialAmount0.quotient.toString(),
        expectedAmountQuoteRaw: partialAmount1.quotient.toString(),
      })
      setTxHash(response.hash)

      ReactGA.event({
        category: 'Liquidity',
        action: 'RemoveV3',
        label: [partialAmount0.currency.symbol, partialAmount1.currency.symbol].join('/'),
      })
    } catch (error) {
      setIsAttemptingTxn(false)
      console.error('Failed to send transaction', error)
    }
  }, [
    chainId,
    library,
    account,
    manager,
    deadline,
    positionDetail,
    position,
    liquidityPercent,
    partialAmount0,
    partialAmount1,
    tokenId,
    slippageTolerance,
    addTransaction,
  ])

  /*=====================================================================
   *                         REACT COMPONENTS
   *====================================================================*/

  const makeSliderCard = () => (
    <LightCard>
      <AutoColumn gap="md">
        <ThemedText.Main fontWeight={400}>
          <Trans>Amount</Trans>
        </ThemedText.Main>
        <RowBetween>
          <ResponsiveHeaderText>
            <Trans>{percentForSlider}%</Trans>
          </ResponsiveHeaderText>
          <AutoRow gap="4px" justify="flex-end">
            <SmallMaxButton onClick={() => onPercentSelect(25)} width="20%">
              <Trans>25%</Trans>
            </SmallMaxButton>
            <SmallMaxButton onClick={() => onPercentSelect(50)} width="20%">
              <Trans>50%</Trans>
            </SmallMaxButton>
            <SmallMaxButton onClick={() => onPercentSelect(75)} width="20%">
              <Trans>75%</Trans>
            </SmallMaxButton>
            <SmallMaxButton onClick={() => onPercentSelect(100)} width="20%">
              <Trans>Max</Trans>
            </SmallMaxButton>
          </AutoRow>
        </RowBetween>
        <Slider value={percentForSlider} onChange={onPercentSelectForSlider} />
      </AutoColumn>
    </LightCard>
  )

  const makePartialLiquidityDataCard = () => (
    <LightCard>
      <AutoColumn gap="md">
        <RowBetween>
          <Text fontSize={16} fontWeight={500}>
            <Trans>Pooled {partialAmount0?.currency?.symbol}:</Trans>
          </Text>
          <RowFixed>
            <Text fontSize={16} fontWeight={500} marginLeft={'6px'}>
              {partialAmount0 && <FormattedCurrencyAmount currencyAmount={partialAmount0} />}
            </Text>
            <CurrencyLogo size="20px" style={{ marginLeft: '8px' }} currency={partialAmount0?.currency} />
          </RowFixed>
        </RowBetween>
        <RowBetween>
          <Text fontSize={16} fontWeight={500}>
            <Trans>Pooled {partialAmount1?.currency?.symbol}:</Trans>
          </Text>
          <RowFixed>
            <Text fontSize={16} fontWeight={500} marginLeft={'6px'}>
              {partialAmount1 && <FormattedCurrencyAmount currencyAmount={partialAmount1} />}
            </Text>
            <CurrencyLogo size="20px" style={{ marginLeft: '8px' }} currency={partialAmount1?.currency} />
          </RowFixed>
        </RowBetween>
        {feeAmount0?.greaterThan(0) || feeAmount1?.greaterThan(0) ? (
          <>
            <Break />
            <RowBetween>
              <Text fontSize={16} fontWeight={500}>
                <Trans>{feeAmount0?.currency?.symbol} Fees Earned:</Trans>
              </Text>
              <RowFixed>
                <Text fontSize={16} fontWeight={500} marginLeft={'6px'}>
                  {feeAmount0 && <FormattedCurrencyAmount currencyAmount={feeAmount0} />}
                </Text>
                <CurrencyLogo size="20px" style={{ marginLeft: '8px' }} currency={feeAmount0?.currency} />
              </RowFixed>
            </RowBetween>
            <RowBetween>
              <Text fontSize={16} fontWeight={500}>
                <Trans>{feeAmount1?.currency?.symbol} Fees Earned:</Trans>
              </Text>
              <RowFixed>
                <Text fontSize={16} fontWeight={500} marginLeft={'6px'}>
                  {feeAmount1 && <FormattedCurrencyAmount currencyAmount={feeAmount1} />}
                </Text>
                <CurrencyLogo size="20px" style={{ marginLeft: '8px' }} currency={feeAmount1?.currency} />
              </RowFixed>
            </RowBetween>
          </>
        ) : null}
      </AutoColumn>
    </LightCard>
  )

  // TODO: simplifying it by reusing code in liquidity data card
  const makeTransactionModalHeader = () => (
    <AutoColumn gap={'sm'} style={{ padding: '16px' }}>
      <RowBetween align="flex-end">
        <Text fontSize={16} fontWeight={500}>
          <Trans>Pooled {partialAmount0?.currency?.symbol}:</Trans>
        </Text>
        <RowFixed>
          <Text fontSize={16} fontWeight={500} marginLeft={'6px'}>
            {partialAmount0 && <FormattedCurrencyAmount currencyAmount={partialAmount0} />}
          </Text>
          <CurrencyLogo size="20px" style={{ marginLeft: '8px' }} currency={partialAmount0?.currency} />
        </RowFixed>
      </RowBetween>
      <RowBetween align="flex-end">
        <Text fontSize={16} fontWeight={500}>
          <Trans>Pooled {partialAmount1?.currency?.symbol}:</Trans>
        </Text>
        <RowFixed>
          <Text fontSize={16} fontWeight={500} marginLeft={'6px'}>
            {partialAmount1 && <FormattedCurrencyAmount currencyAmount={partialAmount1} />}
          </Text>
          <CurrencyLogo size="20px" style={{ marginLeft: '8px' }} currency={partialAmount1?.currency} />
        </RowFixed>
      </RowBetween>
      {feeAmount0?.greaterThan(0) || feeAmount1?.greaterThan(0) ? (
        <>
          <ThemedText.Italic fontSize={12} color={theme.text2} textAlign="left" padding={'8px 0 0 0'}>
            <Trans>You will also collect fees earned from this position.</Trans>
          </ThemedText.Italic>
          <RowBetween>
            <Text fontSize={16} fontWeight={500}>
              <Trans>{feeAmount0?.currency?.symbol} Fees Earned:</Trans>
            </Text>
            <RowFixed>
              <Text fontSize={16} fontWeight={500} marginLeft={'6px'}>
                {feeAmount0 && <FormattedCurrencyAmount currencyAmount={feeAmount0} />}
              </Text>
              <CurrencyLogo size="20px" style={{ marginLeft: '8px' }} currency={feeAmount0?.currency} />
            </RowFixed>
          </RowBetween>
          <RowBetween>
            <Text fontSize={16} fontWeight={500}>
              <Trans>{feeAmount1?.currency?.symbol} Fees Earned:</Trans>
            </Text>
            <RowFixed>
              <Text fontSize={16} fontWeight={500} marginLeft={'6px'}>
                {feeAmount1 && <FormattedCurrencyAmount currencyAmount={feeAmount1} />}
              </Text>
              <CurrencyLogo size="20px" style={{ marginLeft: '8px' }} currency={feeAmount1?.currency} />
            </RowFixed>
          </RowBetween>
        </>
      ) : null}
      <ButtonPrimary mt="16px" onClick={burn}>
        <Trans>Remove</Trans>
      </ButtonPrimary>
    </AutoColumn>
  )

  const makeTransactionModal = () => (
    <TransactionConfirmationModal
      isOpen={showConfirm}
      onDismiss={handleDismissConfirmation}
      attemptingTxn={isAttemptingTxn}
      hash={txHash ?? ''}
      content={() => (
        <ConfirmationModalContent
          title={<Trans>Remove Liquidity</Trans>}
          onDismiss={handleDismissConfirmation}
          topContent={makeTransactionModalHeader}
        />
      )}
      pendingText={
        <Trans>
          Removing {partialAmount0?.toSignificant(6)} {partialAmount0?.currency?.symbol} and{' '}
          {partialAmount1?.toSignificant(6)} {partialAmount1?.currency?.symbol}
        </Trans>
      }
    />
  )

  return (
    <AutoColumn>
      {makeTransactionModal()}
      <AppBody>
        <AddRemoveTabs
          creating={false}
          adding={false}
          positionID={tokenId.toString()}
          defaultSlippage={DEFAULT_REMOVE_V3_LIQUIDITY_SLIPPAGE_TOLERANCE}
        />
        <Wrapper>
          {position ? (
            <AutoColumn gap="lg">
              <RowBetween>
                <RowFixed>
                  <DoubleCurrencyLogo currency0={currency0} currency1={currency1} size={20} margin={true} />
                  <ThemedText.Label
                    ml="10px"
                    fontSize="20px"
                  >{`${currency0?.symbol}/${currency1?.symbol}`}</ThemedText.Label>
                </RowFixed>
                <RangeBadge removed={removed} inRange={!outOfRange} />
              </RowBetween>
              {makeSliderCard()}
              {makePartialLiquidityDataCard()}

              {showCollectAsWeth && (
                <RowBetween>
                  <ThemedText.Main>
                    <Trans>Collect as WETH</Trans>
                  </ThemedText.Main>
                  <Toggle
                    id="receive-as-weth"
                    isActive={receiveWETH}
                    toggle={() => setReceiveWETH((receiveWETH) => !receiveWETH)}
                  />
                </RowBetween>
              )}

              <div style={{ display: 'flex' }}>
                <AutoColumn gap="12px" style={{ flex: '1' }}>
                  <ButtonConfirmed
                    confirmed={false}
                    disabled={removed || percent === 0 || !partialAmount0}
                    onClick={() => setShowConfirm(true)}
                  >
                    {removed ? <Trans>Closed</Trans> : error ?? <Trans>Remove</Trans>}
                  </ButtonConfirmed>
                </AutoColumn>
              </div>
            </AutoColumn>
          ) : (
            <Loader />
          )}
        </Wrapper>
      </AppBody>
    </AutoColumn>
  )
}
