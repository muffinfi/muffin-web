import { BigNumber } from '@ethersproject/bignumber'
import { Trans } from '@lingui/macro'
import { useManagerContract } from '@muffinfi/hooks/useContract'
import { useDerivedMuffinPosition } from '@muffinfi/hooks/useDerivedPosition'
import { useMuffinPositionDetailFromTokenId } from '@muffinfi/hooks/usePositions'
import { ADDRESS_ZERO, PositionManager } from '@muffinfi/muffin-sdk'
import { useUserStoreIntoInternalAccount } from '@muffinfi/state/user/hooks'
import { BalanceSource } from '@muffinfi/state/wallet/hooks'
import { formatTokenBalance } from '@muffinfi/utils/formatTokenBalance'
import * as M from '@muffinfi-ui'
import { Currency, CurrencyAmount, Percent } from '@uniswap/sdk-core'
import RangeBadge from 'components/Badge/RangeBadge'
import { LightCard } from 'components/Card'
import CurrencyLogo from 'components/CurrencyLogo'
import Loader from 'components/Loader'
import PageTitle from 'components/PageTitle/PageTitle'
import QuestionHelper from 'components/QuestionHelper'
import { RowBetween } from 'components/Row'
import SettingsTab from 'components/Settings'
import Slider from 'components/Slider'
import useActiveWeb3React from 'hooks/useActiveWeb3React'
import useDebouncedChangeHandler from 'hooks/useDebouncedChangeHandler'
import useToggle from 'hooks/useToggle'
import useTransactionDeadline from 'hooks/useTransactionDeadline'
import { memo, ReactNode, useCallback, useMemo, useState } from 'react'
import ReactGA from 'react-ga'
import { Redirect, RouteComponentProps } from 'react-router-dom'
import { useBurnV3ActionHandlers, useBurnV3State } from 'state/burn/v3/hooks'
import { useTransactionAdder } from 'state/transactions/hooks'
import { useUserSlippageToleranceWithDefault } from 'state/user/hooks'
import { unwrappedToken } from 'utils/unwrappedToken'

import TransactionConfirmationModal, { ConfirmationModalContent } from '../../components/TransactionConfirmationModal'
import { TransactionType } from '../../state/transactions/actions'
import { calculateGasMargin } from '../../utils/calculateGasMargin'
import { currencyId } from '../../utils/currencyId'
import { ResponsiveHeaderText } from './styled'

const DEFAULT_REMOVE_V3_LIQUIDITY_SLIPPAGE_TOLERANCE = new Percent(5, 100)

const TokenAmountsCard = memo(function TokenAmountsCard({
  partialAmount0,
  partialAmount1,
  feeAmount0,
  feeAmount1,
}: {
  partialAmount0: CurrencyAmount<Currency> | undefined
  partialAmount1: CurrencyAmount<Currency> | undefined
  feeAmount0: CurrencyAmount<Currency> | undefined
  feeAmount1: CurrencyAmount<Currency> | undefined
}) {
  return (
    <M.Column stretch gap="24px" style={{ border: '1px solid var(--borderColor)', padding: 16, borderRadius: 16 }}>
      <M.Column stretch gap="12px">
        <M.Text color="text2" size="sm">
          <Trans>Liquidity assets</Trans>
        </M.Text>
        <M.RowBetween>
          <M.Row gap="0.5em">
            <CurrencyLogo size="1.25em" currency={partialAmount0?.currency} />
            <M.Text weight="medium">{partialAmount0?.currency.symbol}</M.Text>
          </M.Row>
          {formatTokenBalance(partialAmount0, 6, 0)}
        </M.RowBetween>
        <RowBetween>
          <M.Row gap="0.5em">
            <CurrencyLogo size="1.25em" currency={partialAmount1?.currency} />
            <M.Text weight="medium">{partialAmount1?.currency.symbol}</M.Text>
          </M.Row>
          {formatTokenBalance(partialAmount1, 6, 0)}
        </RowBetween>
      </M.Column>

      <M.Column stretch gap="12px">
        <M.Text color="text2" size="sm">
          <Trans>Fees to collect</Trans>
        </M.Text>
        <M.RowBetween>
          <M.Row gap="0.5em">
            <CurrencyLogo size="1.25em" currency={feeAmount0?.currency} />
            <M.Text weight="medium">{feeAmount0?.currency.symbol}</M.Text>
          </M.Row>
          {formatTokenBalance(feeAmount0, 6, 0)}
        </M.RowBetween>
        <M.RowBetween>
          <M.Row gap="0.5em">
            <CurrencyLogo size="1.25em" currency={feeAmount1?.currency} />
            <M.Text weight="medium">{feeAmount1?.currency.symbol}</M.Text>
          </M.Row>
          {formatTokenBalance(feeAmount1, 6, 0)}
        </M.RowBetween>
      </M.Column>
    </M.Column>
  )
})

export default function RemoveLiquidity({ location, match: { params } }: RouteComponentProps<{ tokenId: string }>) {
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
    return <Redirect to={{ ...location, pathname: '/positions' }} />
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

  // TODO: remove it. we do not support receiving as ETH
  // flag for receiving WETH (default collect as WETH)
  const receiveWETH = true
  const _wantedCurrency0 = receiveWETH ? token0 : currency0
  const _wantedCurrency1 = receiveWETH ? token1 : currency1

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
   *                 FEE AMOUNTS AND TOKEN DESTINATION
   *====================================================================*/

  const [storeInInternalAccount, toggleStoreInInternalAccount] = useUserStoreIntoInternalAccount()
  const [collectAllFees, toggleCollectAllFees] = useToggle(false)

  // wrap fee amount into CurrencyAmount
  const [feeAmount0, feeAmount1] = useMemo(() => {
    if (!positionDetail || !_wantedCurrency0 || !_wantedCurrency1) return []
    return [
      CurrencyAmount.fromRawAmount(
        _wantedCurrency0,
        collectAllFees
          ? positionDetail.feeAmount0.toString()
          : liquidityPercent.multiply(positionDetail.feeAmount0.toString()).quotient
      ),
      CurrencyAmount.fromRawAmount(
        _wantedCurrency1,
        collectAllFees
          ? positionDetail.feeAmount1.toString()
          : liquidityPercent.multiply(positionDetail.feeAmount1.toString()).quotient
      ),
    ]
  }, [positionDetail, _wantedCurrency0, _wantedCurrency1, collectAllFees, liquidityPercent])

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
  const _tick = position?.poolTier.tickCurrent
  const outOfRange = position && _tick != null && (_tick < position.tickLower || _tick >= position.tickUpper)

  // whether the position is emptied
  const removed = positionDetail?.liquidityD8.eq(0)

  /*=====================================================================
   *                        FIELD STATE ACTIONS
   *====================================================================*/

  const { onPercentSelect } = useBurnV3ActionHandlers()
  const [percentForSlider, onPercentSelectForSlider] = useDebouncedChangeHandler(percent, onPercentSelect, 0) // turned off debounce

  /*=====================================================================
   *                            UI STATES
   *====================================================================*/

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
      withdrawalRecipient: storeInInternalAccount ? ADDRESS_ZERO : account,
      collectAllFees,
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
        tokenDestination: storeInInternalAccount ? BalanceSource.INTERNAL_ACCOUNT : BalanceSource.WALLET,
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
    storeInInternalAccount,
    collectAllFees,
    addTransaction,
  ])

  /*=====================================================================
   *                         REACT COMPONENTS
   *====================================================================*/

  const makeSliderCard = () => (
    <LightCard>
      <M.Column stretch gap="8px">
        <M.Text color="text2" weight="semibold" size="sm">
          <Trans>% of Liquidity</Trans>
        </M.Text>
        <M.RowBetween>
          <ResponsiveHeaderText>
            <Trans>{percentForSlider}%</Trans>
          </ResponsiveHeaderText>
          <M.Row wrap="wrap" gap="4px" style={{ justifyContent: 'flex-end' }}>
            <M.ButtonSecondary size="xs" onClick={() => onPercentSelect(25)}>
              <Trans>25%</Trans>
            </M.ButtonSecondary>
            <M.ButtonSecondary size="xs" onClick={() => onPercentSelect(50)}>
              <Trans>50%</Trans>
            </M.ButtonSecondary>
            <M.ButtonSecondary size="xs" onClick={() => onPercentSelect(75)}>
              <Trans>75%</Trans>
            </M.ButtonSecondary>
            <M.ButtonSecondary size="xs" onClick={() => onPercentSelect(100)}>
              <Trans>Max</Trans>
            </M.ButtonSecondary>
          </M.Row>
        </M.RowBetween>
        <Slider value={percentForSlider} onChange={onPercentSelectForSlider} />
      </M.Column>
    </LightCard>
  )

  const makeTransactionModalHeader = () => (
    <M.Column stretch gap="32px">
      <TokenAmountsCard
        partialAmount0={partialAmount0}
        partialAmount1={partialAmount1}
        feeAmount0={feeAmount0}
        feeAmount1={feeAmount1}
      />
      <M.RowBetween>
        <M.Text size="sm" weight="semibold">
          <Trans>Receive tokens to</Trans>
        </M.Text>
        <M.Text size="sm">{storeInInternalAccount ? <Trans>Muffin Account</Trans> : <Trans>Wallet</Trans>}</M.Text>
      </M.RowBetween>
      <M.ButtonRowPrimary onClick={burn}>
        <Trans>Remove Liquidity</Trans>
      </M.ButtonRowPrimary>
    </M.Column>
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
    <>
      <PageTitle title={`#${tokenId} - Remove Liquidity`} />

      {makeTransactionModal()}

      <M.Container maxWidth="24rem">
        <M.Column stretch gap="32px">
          <M.Link color="text2" to={`/positions/${tokenId.toString()}`}>
            <Trans>← Back</Trans>
          </M.Link>

          <M.Text size="xl" weight="bold">
            <Trans>Remove Liquidity</Trans>
          </M.Text>

          {position == null ? (
            <M.ColumnCenter>
              <Loader />
            </M.ColumnCenter>
          ) : (
            <M.SectionCard greedyMargin>
              <M.Column stretch gap="24px">
                <M.Column stretch gap="0.75em">
                  <M.RowBetween gap="1em">
                    <M.TextContents size="lg" weight="bold">
                      <M.PoolTierExpr currencyBase={currency1} currencyQuote={currency0} tier={position.poolTier} />
                    </M.TextContents>
                    <SettingsTab placeholderSlippage={DEFAULT_REMOVE_V3_LIQUIDITY_SLIPPAGE_TOLERANCE} noDeadline />
                  </M.RowBetween>
                  <span>
                    <RangeBadge
                      removed={removed}
                      inRange={!outOfRange}
                      settled={position.settled}
                      isLimit={position.isLimitOrder}
                    />
                  </span>
                </M.Column>

                {makeSliderCard()}

                <TokenAmountsCard
                  partialAmount0={partialAmount0}
                  partialAmount1={partialAmount1}
                  feeAmount0={feeAmount0}
                  feeAmount1={feeAmount1}
                />

                <M.RowBetween>
                  <M.Row gap="0.25em">
                    <M.Text weight="semibold" size="sm">
                      <Trans>Fees collection</Trans>
                    </M.Text>
                    <QuestionHelper
                      text={<Trans>Choose to collect all/partial of fee when removing partial liquidity.</Trans>}
                    />
                  </M.Row>
                  <M.TextContents size="xs" weight="semibold">
                    <M.Toggle $variant="primary" onClick={toggleCollectAllFees}>
                      <M.ToggleElement gap="0.5em" $active={collectAllFees}>
                        <Trans>All</Trans>
                      </M.ToggleElement>
                      <M.ToggleElement gap="0.5em" $active={!collectAllFees}>
                        <Trans>Partial</Trans>
                      </M.ToggleElement>
                    </M.Toggle>
                  </M.TextContents>
                </M.RowBetween>

                <M.TextContents weight="semibold" size="sm">
                  <M.OutputDestinationToggle
                    toInternalAccount={storeInInternalAccount}
                    questionHelperContent={<Trans>Choose the destination of the removed tokens and fees.</Trans>}
                    onToggle={toggleStoreInInternalAccount}
                  />
                </M.TextContents>

                <M.ButtonRowPrimary
                  disabled={removed || percent === 0 || !partialAmount0}
                  onClick={() => setShowConfirm(true)}
                >
                  {removed ? <Trans>Closed</Trans> : error ?? <Trans>Remove Liquidity</Trans>}
                </M.ButtonRowPrimary>
              </M.Column>
            </M.SectionCard>
          )}
        </M.Column>
      </M.Container>
    </>
  )
}
