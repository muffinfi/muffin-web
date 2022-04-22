import { BigNumber } from '@ethersproject/bignumber'
import { TransactionResponse } from '@ethersproject/providers'
import { Trans } from '@lingui/macro'
import { useManagerContract } from '@muffinfi/hooks/useContract'
import { useDerivedMuffinPosition } from '@muffinfi/hooks/useDerivedPosition'
import { useIsTickAtLimit } from '@muffinfi/hooks/useIsTickAtLimit'
import { useMuffinPositionDetailFromTokenId } from '@muffinfi/hooks/usePositions'
import { usePositionUSDCValue } from '@muffinfi/hooks/usePositionUSDCValue'
import { ADDRESS_ZERO, PositionManager, Tier } from '@muffinfi/muffin-v1-sdk'
import { useUserStoreIntoInternalAccount } from '@muffinfi/state/user/hooks'
import { BalanceSource } from '@muffinfi/state/wallet/hooks'
import { Currency, CurrencyAmount, Fraction, Percent, Price, Token } from '@uniswap/sdk-core'
import * as DS from 'components/@DS'
import Badge from 'components/Badge'
import { LightCard } from 'components/Card'
import CurrencyLogo from 'components/CurrencyLogo'
import { usePricesFromPositionForUI } from 'components/PositionListItem/hooks'
import { Dots } from 'components/swap/styleds'
import TokenDestinationToggleRow from 'components/TokenDestinationToggleRow'
import TransactionConfirmationModal, { ConfirmationModalContent } from 'components/TransactionConfirmationModal'
import useActiveWeb3React from 'hooks/useActiveWeb3React'
import { PoolState } from 'hooks/usePools'
import { useCallback, useMemo, useState } from 'react'
import ReactGA from 'react-ga'
import { Link, RouteComponentProps } from 'react-router-dom'
import { Bound } from 'state/mint/v3/actions'
import { useIsTransactionPending, useTransactionAdder } from 'state/transactions/hooks'
import styled from 'styled-components/macro'
import { ExternalLink } from 'theme'
import { currencyId } from 'utils/currencyId'
import { formatCurrencyAmount } from 'utils/formatCurrencyAmount'
import { formatTickPrice } from 'utils/formatTickPrice'
import { unwrappedToken } from 'utils/unwrappedToken'
import RangeBadge from '../../components/Badge/RangeBadge'
import RateToggle from '../../components/RateToggle'
import { SwitchLocaleLink } from '../../components/SwitchLocaleLink'
import { TransactionType } from '../../state/transactions/actions'
import { calculateGasMargin } from '../../utils/calculateGasMargin'
import { ExplorerDataType, getExplorerLink } from '../../utils/getExplorerLink'
import { LoadingRows } from './styleds'

const PageWrapper = styled.div`
  width: 100%;
  max-width: 700px;
`

const LiquidityAndFeeRow = styled(DS.Row)`
  gap: 24px;
  align-items: flex-start;

  ${({ theme }) => theme.mediaWidth.upToSmall`
    flex-direction: column;
    width: 100%:
  `};
`

const Card = styled.div`
  width: 100%;
  padding: 20px 24px;
  border-radius: 16px;
  background-color: var(--bg0);
`

const CardTitle = styled.span`
  font-size: 1rem;
  font-weight: var(--fw-bold);
  color: var(--text1);
`

const CardTitleRowButtonWrapper = styled.div`
  align-self: flex-start;
  height: 0;
`

const BigValue = styled.div`
  font-size: 1.5em;
  font-weight: var(--fw-bold);
  color: var(--text1);
`

const BigValueGreen = styled(BigValue)`
  color: var(--green1);
`

const TokenAmountLabel = styled.div`
  font-weight: var(--fw-semibold);
  color: var(--text2);
`

const TokenAmountValue = styled.div`
  font-weight: var(--fw-semibold);
  color: var(--text2);
`

const TokenProportionBadge = styled(Badge)`
  font-size: 0.75em;
  color: var(--text2);
  margin-left: 12px;

  border-radius: 4px;
  padding: 0;
  min-width: 2.6em;
  background: var(--bg2);
  outline: 2px solid var(--bg2);
`

//////////

const Text = styled.div<{ size?: string; weight?: string; color?: string }>`
  font-size: ${({ size }) => size && `var(--text-${size})`};
  font-weight: ${({ weight }) => weight && `var(--fw-${weight})`};
  color: ${({ color }) => color && `var(--${color})`};
`

const SmallHeader = styled(Text).attrs({ size: 'sm', weight: 'semibold', color: 'text2' })``

const PriceText = styled(Text).attrs({ size: 'xl', weight: 'semibold', color: 'text1' })``

const HelpText = styled(Text).attrs({ size: 'xs', weight: 'regular', color: 'text3' })``

//////////

const DoubleArrow = styled.span`
  color: ${({ theme }) => theme.text3};
  margin: 0 1rem;
`

function CurrentPriceCard({
  inverted,
  tier,
  currencyQuote,
  currencyBase,
}: {
  inverted?: boolean
  tier?: Tier | null
  currencyQuote?: Currency
  currencyBase?: Currency
}) {
  if (!tier || !currencyQuote || !currencyBase) {
    return null
  }

  return (
    <LightCard padding="12px" width="100%">
      <DS.ColumnCenter gap="8px">
        <SmallHeader>
          <Trans>Current price</Trans>
        </SmallHeader>
        <PriceText>{(inverted ? tier.token1Price : tier.token0Price).toSignificant(6)}</PriceText>
        <SmallHeader>
          <Trans>
            {currencyQuote?.symbol} per {currencyBase?.symbol}
          </Trans>
        </SmallHeader>
      </DS.ColumnCenter>
    </LightCard>
  )
}

function LinkedCurrency({ chainId, currency }: { chainId?: number; currency?: Currency }) {
  const address = (currency as Token)?.address

  if (typeof chainId === 'number' && address) {
    return (
      <ExternalLink href={getExplorerLink(chainId, address, ExplorerDataType.TOKEN)}>
        <DS.Row>
          <CurrencyLogo currency={currency} size={'20px'} style={{ marginRight: '0.5rem' }} />
          <TokenAmountLabel>{currency?.symbol} ↗</TokenAmountLabel>
        </DS.Row>
      </ExternalLink>
    )
  }

  return (
    <DS.Row>
      <CurrencyLogo currency={currency} size={'20px'} style={{ marginRight: '0.5rem' }} />
      <TokenAmountLabel>{currency?.symbol}</TokenAmountLabel>
    </DS.Row>
  )
}

function getRatio(
  lower: Price<Currency, Currency>,
  current: Price<Currency, Currency>,
  upper: Price<Currency, Currency>
) {
  try {
    if (!current.greaterThan(lower)) {
      return 100
    } else if (!current.lessThan(upper)) {
      return 0
    }

    const a = Number.parseFloat(lower.toSignificant(15))
    const b = Number.parseFloat(upper.toSignificant(15))
    const c = Number.parseFloat(current.toSignificant(15))

    // the weight of token0 in the position in terms of the cash value
    const ratio = Math.floor((1 / ((Math.sqrt(a * b) - Math.sqrt(b * c)) / (c - Math.sqrt(b * c)) + 1)) * 100)

    if (ratio < 0 || ratio > 100) {
      throw Error('Out of range')
    }

    return ratio
  } catch {
    return undefined
  }
}

//////////////////////////////////

export function PositionPage({
  match: {
    params: { tokenId: tokenIdFromUrl },
  },
}: RouteComponentProps<{ tokenId?: string }>) {
  const { chainId, account, library } = useActiveWeb3React()

  /*=====================================================================
   *                             POSITION
   *====================================================================*/

  // fetch position data and pool data, then make sdk entiries
  const parsedTokenId = tokenIdFromUrl ? BigNumber.from(tokenIdFromUrl) : undefined
  const { loading, position: positionDetail } = useMuffinPositionDetailFromTokenId(parsedTokenId)
  const { token0, token1, poolState, position } = useDerivedMuffinPosition(positionDetail)
  const pool = position?.pool
  const tier = position?.poolTier

  // if token is WETH, unwrap it to ETH
  const currency0 = token0 ? unwrappedToken(token0) : undefined
  const currency1 = token1 ? unwrappedToken(token1) : undefined

  /*=====================================================================
   *                             UI STATE
   *====================================================================*/

  // switch of inverting quote/base tokens
  const [manuallyInverted, setManuallyInverted] = useState(false)

  // invert quote/base tokens and prices based on user's choice
  const { priceLower, priceUpper, base } = usePricesFromPositionForUI(position, manuallyInverted)
  const inverted = pool ? base?.equals(pool.token1) : undefined
  const currencyQuote = inverted ? currency0 : currency1
  const currencyBase = inverted ? currency1 : currency0

  // flag of whether all position liquidity is removed
  const removed = positionDetail?.liquidityD8?.eq(0)

  /*=====================================================================
   *                              HEADER
   *====================================================================*/

  // flag of whether price is within range
  const below = position ? position.poolTier.computedTick < position.tickLower : undefined
  const above = position ? position.poolTier.computedTick >= position.tickUpper : undefined
  const inRange = typeof below === 'boolean' && typeof above === 'boolean' ? !below && !above : false

  // flag of whether user is the position's owner or an approved operator
  const owner = positionDetail?.owner
  const ownsNFT = owner === account || positionDetail?.operator === account // FIXME: operator is not real atm

  /*=====================================================================
   *                          LIQUIDITY CARD
   *====================================================================*/

  // usdc values of position and unclaimed fees
  const { fiatValueOfLiquidity, fiatValueOfFees } = usePositionUSDCValue(positionDetail, position, token0, token1)

  // ratio between the values of the two underlying tokens
  const ratio = useMemo(() => {
    return priceLower && priceUpper && tier
      ? getRatio(
          inverted ? priceUpper.invert() : priceLower,
          tier.token0Price,
          inverted ? priceLower.invert() : priceUpper
        )
      : undefined
  }, [inverted, tier, priceLower, priceUpper])

  /*=====================================================================
   *                        UNCLAIMED FEES CARD
   *====================================================================*/

  const [feeAmt0Str, feeAmt1Str] = useMemo(
    () => (positionDetail ? [positionDetail.feeAmount0.toString(), positionDetail.feeAmount1.toString()] : []),
    [positionDetail]
  )
  const [feeAmount0, feeAmount1] = useMemo(
    () =>
      currency0 && currency1 && feeAmt0Str && feeAmt1Str
        ? [CurrencyAmount.fromRawAmount(currency0, feeAmt0Str), CurrencyAmount.fromRawAmount(currency1, feeAmt1Str)]
        : [],
    [currency0, currency1, feeAmt0Str, feeAmt1Str]
  )

  const feeAmountUpper = inverted ? feeAmount0 : feeAmount1
  const feeAmountLower = inverted ? feeAmount1 : feeAmount0

  const [collecting, setCollecting] = useState<boolean>(false)
  const [collectMigrationHash, setCollectMigrationHash] = useState<string | null>(null)
  const isCollectPending = useIsTransactionPending(collectMigrationHash ?? undefined)
  const [showConfirm, setShowConfirm] = useState(false)
  const [storeInInternalAccount, toggleStoreInInternalAccount] = useUserStoreIntoInternalAccount()

  // flag for receiving WETH
  // const [receiveWETH, setReceiveWETH] = useState(true)
  // const nativeCurrency = useNativeCurrency()
  // const nativeWrappedSymbol = nativeCurrency.wrapped.symbol
  // const onOptimisticChain = Boolean(
  //   chainId && [SupportedChainId.OPTIMISM, SupportedChainId.OPTIMISTIC_KOVAN].includes(chainId)
  // )
  // const showCollectAsWeth = Boolean(
  //   ownsNFT &&
  //     (feeAmount0?.greaterThan(0) || feeAmount1?.greaterThan(0)) &&
  //     currency0 &&
  //     currency1 &&
  //     (currency0.isNative || currency1.isNative) &&
  //     !collectMigrationHash &&
  //     !onOptimisticChain
  // )

  /*=====================================================================
   *                          PRICE RANGE CARD
   *====================================================================*/

  const tickAtLimit = useIsTickAtLimit(pool?.tickSpacing, position?.tickLower, position?.tickUpper)

  /*=====================================================================
   *                         COLLECT FEES ACTION
   *====================================================================*/

  const tokenId = positionDetail?.tokenId
  const manager = useManagerContract()
  const addTransaction = useTransactionAdder()

  const collect = useCallback(() => {
    if (!chainId || !feeAmount0 || !feeAmount1 || !manager || !account || !tokenId || !library || !position) return

    setCollecting(true)

    const { calldata, value } = PositionManager.removeCallParameters(position, {
      tokenId: tokenId.toString(),
      liquidityPercentage: new Percent(0),
      slippageTolerance: new Percent(0),
      withdrawalRecipient: storeInInternalAccount ? ADDRESS_ZERO : account,
      collectAllFees: true,
    })

    const txn = {
      to: manager.address,
      data: calldata,
      value,
    }

    library
      .getSigner()
      .estimateGas(txn)
      .then((estimate) => {
        const newTxn = { ...txn, gasLimit: calculateGasMargin(estimate) }
        return library
          .getSigner()
          .sendTransaction(newTxn)
          .then((response: TransactionResponse) => {
            setCollectMigrationHash(response.hash)
            setCollecting(false)

            ReactGA.event({
              category: 'Liquidity',
              action: 'CollectV3',
              label: [feeAmount0.currency.symbol, feeAmount1.currency.symbol].join('/'),
            })

            addTransaction(response, {
              type: TransactionType.COLLECT_FEES,
              currencyId0: currencyId(feeAmount0.currency),
              currencyId1: currencyId(feeAmount1.currency),
              tokenDestination: storeInInternalAccount ? BalanceSource.INTERNAL_ACCOUNT : BalanceSource.WALLET,
            })
          })
      })
      .catch((error) => {
        setCollecting(false)
        console.error(error)
      })
  }, [
    chainId,
    feeAmount0,
    feeAmount1,
    manager,
    account,
    tokenId,
    library,
    position,
    storeInInternalAccount,
    addTransaction,
  ])

  /*=====================================================================
   *                          REACT COMPONENT
   *====================================================================*/

  if (loading || poolState === PoolState.LOADING || !position) {
    return (
      <LoadingRows>
        <div />
        <div />
        <div />
        <div />
        <div />
        <div />
        <div />
        <div />
        <div />
        <div />
        <div />
        <div />
      </LoadingRows>
    )
  }

  const makeHeaderRow = () => (
    <DS.RowBetween wrap="wrap" gap="16px">
      <DS.Row gap="1em" wrap="wrap" rowGap="0.5em">
        <DS.H1>
          <DS.PoolTierName currencyBase={currencyBase} currencyQuote={currencyQuote} tier={position?.poolTier} />
        </DS.H1>
        {/* <RangeBadge removed={removed} inRange={inRange} /> */}
      </DS.Row>

      {ownsNFT && (
        <DS.Row gap="1em" wrap="wrap" rowGap="0.5em">
          {positionDetail && currency0 && currency1 ? (
            <DS.ButtonSecondary
              as={Link}
              to={`/increase/${currencyId(currency0)}/${currencyId(currency1)}/${position.poolTier.sqrtGamma}/${
                positionDetail.tokenId
              }`}
            >
              <Trans>Increase Liquidity</Trans>
            </DS.ButtonSecondary>
          ) : null}
          {positionDetail && !removed ? (
            <DS.ButtonPrimary as={Link} to={`/remove/${positionDetail.tokenId}`}>
              <Trans>Remove Liquidity</Trans>
            </DS.ButtonPrimary>
          ) : null}
        </DS.Row>
      )}
    </DS.RowBetween>
  )

  const makeLiquidityValueCard = () => (
    <Card>
      <DS.Column stretch gap="16px">
        <CardTitle>
          <Trans>Liquidity</Trans>
        </CardTitle>
        <BigValue>
          {fiatValueOfLiquidity?.greaterThan(new Fraction(1, 100)) ? (
            <Trans>${fiatValueOfLiquidity.toFixed(2, { groupSeparator: ',' })}</Trans>
          ) : (
            <Trans>$-</Trans>
          )}
        </BigValue>

        <LightCard padding="12px">
          <DS.Column stretch gap="8px">
            <DS.RowBetween>
              <LinkedCurrency chainId={chainId} currency={currencyQuote} />
              <DS.Row>
                <TokenAmountValue>
                  {inverted ? position?.amount0.toSignificant(4) : position?.amount1.toSignificant(4)}
                </TokenAmountValue>
                {typeof ratio === 'number' && !removed ? (
                  <TokenProportionBadge>
                    <Trans>{inverted ? ratio : 100 - ratio}%</Trans>
                  </TokenProportionBadge>
                ) : null}
              </DS.Row>
            </DS.RowBetween>
            <DS.RowBetween>
              <LinkedCurrency chainId={chainId} currency={currencyBase} />
              <DS.Row>
                <TokenAmountValue>
                  {inverted ? position?.amount1.toSignificant(4) : position?.amount0.toSignificant(4)}
                </TokenAmountValue>
                {typeof ratio === 'number' && !removed ? (
                  <TokenProportionBadge>
                    <Trans>{inverted ? 100 - ratio : ratio}%</Trans>
                  </TokenProportionBadge>
                ) : null}
              </DS.Row>
            </DS.RowBetween>
          </DS.Column>
        </LightCard>
      </DS.Column>
    </Card>
  )

  const makeFeeValueCard = () => (
    <Card>
      <DS.Column stretch gap="16px">
        <DS.RowBetween>
          <CardTitle>
            <Trans>Unclaimed fees</Trans>
          </CardTitle>
          <CardTitleRowButtonWrapper>
            {ownsNFT && (feeAmount0?.greaterThan(0) || feeAmount1?.greaterThan(0) || !!collectMigrationHash) ? (
              <DS.Button
                size="small"
                color={!!collectMigrationHash && !isCollectPending ? 'secondary' : 'primary'}
                disabled={collecting || !!collectMigrationHash}
                onClick={() => setShowConfirm(true)}
              >
                {!!collectMigrationHash && !isCollectPending ? (
                  <Trans>Collected</Trans>
                ) : isCollectPending || collecting ? (
                  <Dots>
                    <Trans>Collecting</Trans>
                  </Dots>
                ) : (
                  <Trans>Collect fees</Trans>
                )}
              </DS.Button>
            ) : null}
          </CardTitleRowButtonWrapper>
        </DS.RowBetween>
        {fiatValueOfFees?.greaterThan(new Fraction(1, 100)) ? (
          <BigValueGreen>
            <Trans>${fiatValueOfFees.toFixed(2, { groupSeparator: ',' })}</Trans>
          </BigValueGreen>
        ) : (
          <BigValue>
            <Trans>$-</Trans>
          </BigValue>
        )}

        <LightCard padding="12px">
          <DS.Column stretch gap="8px">
            <DS.RowBetween>
              <LinkedCurrency chainId={chainId} currency={feeAmountUpper?.currency} />
              <DS.Row>
                <TokenAmountValue>{feeAmountUpper ? formatCurrencyAmount(feeAmountUpper, 4) : '-'}</TokenAmountValue>
              </DS.Row>
            </DS.RowBetween>
            <DS.RowBetween>
              <LinkedCurrency chainId={chainId} currency={feeAmountLower?.currency} />
              <DS.Row>
                <TokenAmountValue>{feeAmountLower ? formatCurrencyAmount(feeAmountLower, 4) : '-'}</TokenAmountValue>
              </DS.Row>
            </DS.RowBetween>
          </DS.Column>
        </LightCard>
      </DS.Column>
    </Card>
  )

  const makePriceRangeCard = () => (
    <Card>
      <DS.Column stretch gap="16px">
        <DS.RowBetween>
          <DS.Row wrap="wrap">
            <CardTitle style={{ marginRight: '12px' }}>
              <Trans>Price range</Trans>
            </CardTitle>
            <RangeBadge removed={removed} inRange={inRange} />
          </DS.Row>
          <div>
            {currencyBase && currencyQuote && (
              <RateToggle
                currencyA={currencyBase}
                currencyB={currencyQuote}
                handleRateToggle={() => setManuallyInverted(!manuallyInverted)}
              />
            )}
          </div>
        </DS.RowBetween>

        <DS.RowBetween>
          <LightCard padding="12px" width="100%">
            <DS.ColumnCenter gap="8px">
              <SmallHeader>
                <Trans>Min price</Trans>
              </SmallHeader>
              <PriceText>{formatTickPrice(priceLower, tickAtLimit, Bound.LOWER)}</PriceText>
              <SmallHeader>
                <Trans>
                  {currencyQuote?.symbol} per {currencyBase?.symbol}
                </Trans>
              </SmallHeader>

              {inRange && (
                <HelpText>
                  <Trans>Your position will be 100% {currencyBase?.symbol} at this price.</Trans>
                </HelpText>
              )}
            </DS.ColumnCenter>
          </LightCard>

          <DoubleArrow>⟷</DoubleArrow>

          <LightCard padding="12px" width="100%">
            <DS.ColumnCenter gap="8px">
              <SmallHeader>
                <Trans>Max price</Trans>
              </SmallHeader>
              <PriceText>{formatTickPrice(priceUpper, tickAtLimit, Bound.UPPER)}</PriceText>
              <SmallHeader>
                <Trans>
                  {currencyQuote?.symbol} per {currencyBase?.symbol}
                </Trans>
              </SmallHeader>

              {inRange && (
                <HelpText>
                  <Trans>Your position will be 100% {currencyQuote?.symbol} at this price.</Trans>
                </HelpText>
              )}
            </DS.ColumnCenter>
          </LightCard>
        </DS.RowBetween>
        <CurrentPriceCard inverted={inverted} tier={tier} currencyQuote={currencyQuote} currencyBase={currencyBase} />
      </DS.Column>
    </Card>
  )

  const makeConfirmModalContent = () => (
    <DS.Column gap="16px" style={{ marginTop: '20px' }}>
      <LightCard padding="12px 16px">
        <DS.Column stretch gap="8px">
          <DS.RowBetween>
            <DS.Row>
              <CurrencyLogo currency={feeAmountUpper?.currency} size={'20px'} style={{ marginRight: '0.5rem' }} />
              <Text weight="semibold">{feeAmountUpper?.currency?.wrapped.symbol}</Text>
            </DS.Row>
            <Text weight="semibold">{feeAmountUpper ? formatCurrencyAmount(feeAmountUpper, 4) : '-'}</Text>
          </DS.RowBetween>
          <DS.RowBetween>
            <DS.Row>
              <CurrencyLogo currency={feeAmountLower?.currency} size={'20px'} style={{ marginRight: '0.5rem' }} />
              <Text weight="semibold">{feeAmountLower?.currency?.wrapped.symbol}</Text>
            </DS.Row>
            <Text weight="semibold">{feeAmountLower ? formatCurrencyAmount(feeAmountLower, 4) : '-'}</Text>
          </DS.RowBetween>
        </DS.Column>
      </LightCard>
      <TokenDestinationToggleRow
        toInternalAccount={storeInInternalAccount}
        questionHelperContent={<Trans>Choose the destination of the collected fee.</Trans>}
        onToggle={toggleStoreInInternalAccount}
      />
      <HelpText>
        <Trans>Collecting fees will withdraw currently available fees for you.</Trans>
      </HelpText>
      <DS.ButtonRowPrimary onClick={collect}>
        <Trans>Collect</Trans>
      </DS.ButtonRowPrimary>
    </DS.Column>
  )

  return (
    <>
      <PageWrapper>
        <TransactionConfirmationModal
          isOpen={showConfirm}
          onDismiss={() => setShowConfirm(false)}
          attemptingTxn={collecting}
          hash={collectMigrationHash ?? ''}
          content={() => (
            <ConfirmationModalContent
              title={<Trans>Collect fees</Trans>}
              onDismiss={() => setShowConfirm(false)}
              topContent={makeConfirmModalContent}
            />
          )}
          pendingText={<Trans>Collecting fees</Trans>}
        />
        <DS.Column stretch gap="24px">
          <DS.Column stretch>
            <DS.PageBackLink to="/pool">
              <Trans>← Back to Pools Overview</Trans>
            </DS.PageBackLink>
            {makeHeaderRow()}
          </DS.Column>
          <LiquidityAndFeeRow>
            {makeLiquidityValueCard()}
            {makeFeeValueCard()}
          </LiquidityAndFeeRow>
          {makePriceRangeCard()}
        </DS.Column>
      </PageWrapper>
      <SwitchLocaleLink />
    </>
  )
}
