import { BigNumber } from '@ethersproject/bignumber'
import { TransactionResponse } from '@ethersproject/providers'
import { Trans } from '@lingui/macro'
import { useManagerContract } from '@muffinfi/hooks/useContract'
import { useDerivedMuffinPosition } from '@muffinfi/hooks/useDerivedPosition'
import { useIsTickAtLimit } from '@muffinfi/hooks/useIsTickAtLimit'
import { useMuffinPositionDetailFromTokenId } from '@muffinfi/hooks/usePositions'
import { usePositionUSDCValue } from '@muffinfi/hooks/usePositionUSDCValue'
import { PositionManager, Tier } from '@muffinfi/muffin-v1-sdk'
import { Currency, CurrencyAmount, Fraction, Percent, Price, Token } from '@uniswap/sdk-core'
import Badge from 'components/Badge'
import { ButtonConfirmed, ButtonGray, ButtonPrimary } from 'components/Button'
import { DarkCard, LightCard } from 'components/Card'
import { AutoColumn } from 'components/Column'
import CurrencyLogo from 'components/CurrencyLogo'
import DoubleCurrencyLogo from 'components/DoubleLogo'
import { usePricesFromPositionForUI } from 'components/PositionListItem/hooks'
import { RowBetween, RowFixed } from 'components/Row'
import { Dots } from 'components/swap/styleds'
import TransactionConfirmationModal, { ConfirmationModalContent } from 'components/TransactionConfirmationModal'
import { PoolState } from 'hooks/usePools'
import { useActiveWeb3React } from 'hooks/web3'
import { useCallback, useMemo, useState } from 'react'
import ReactGA from 'react-ga'
import { Link, RouteComponentProps } from 'react-router-dom'
import { Bound } from 'state/mint/v3/actions'
import { useIsTransactionPending, useTransactionAdder } from 'state/transactions/hooks'
import styled from 'styled-components/macro'
import { ExternalLink, HideExtraSmall, ThemedText } from 'theme'
import { currencyId } from 'utils/currencyId'
import { formatCurrencyAmount } from 'utils/formatCurrencyAmount'
import { formatTickPrice } from 'utils/formatTickPrice'
import { unwrappedToken } from 'utils/unwrappedToken'
import RangeBadge from '../../components/Badge/RangeBadge'
import RateToggle from '../../components/RateToggle'
import { SwitchLocaleLink } from '../../components/SwitchLocaleLink'
import useTheme from '../../hooks/useTheme'
import { TransactionType } from '../../state/transactions/actions'
import { calculateGasMargin } from '../../utils/calculateGasMargin'
import { ExplorerDataType, getExplorerLink } from '../../utils/getExplorerLink'
import { LoadingRows } from './styleds'

const PageWrapper = styled.div`
  min-width: 800px;
  max-width: 960px;

  ${({ theme }) => theme.mediaWidth.upToMedium`
    min-width: 680px;
    max-width: 680px;
  `};

  ${({ theme }) => theme.mediaWidth.upToSmall`
    min-width: 600px;
    max-width: 600px;
  `};

  @media only screen and (max-width: 620px) {
    min-width: 500px;
    max-width: 500px;
  }

  ${({ theme }) => theme.mediaWidth.upToExtraSmall`
    min-width: 340px;
    max-width: 340px;
  `};
`

const BadgeText = styled.div`
  font-weight: 500;
  font-size: 14px;
`

// responsive text
// disable the warning because we don't use the end prop, we just want to filter it out
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const Label = styled(({ end, ...props }) => <ThemedText.Label {...props} />)<{ end?: boolean }>`
  display: flex;
  font-size: 16px;
  justify-content: ${({ end }) => (end ? 'flex-end' : 'flex-start')};
  align-items: center;
`

const ExtentsText = styled.span`
  color: ${({ theme }) => theme.text2};
  font-size: 14px;
  text-align: center;
  margin-right: 4px;
  font-weight: 500;
`

const HoverText = styled(ThemedText.Main)`
  text-decoration: none;
  color: ${({ theme }) => theme.text3};
  :hover {
    color: ${({ theme }) => theme.text1};
    text-decoration: none;
  }
`

const DoubleArrow = styled.span`
  color: ${({ theme }) => theme.text3};
  margin: 0 1rem;
`
const ResponsiveRow = styled(RowBetween)`
  ${({ theme }) => theme.mediaWidth.upToSmall`
    flex-direction: column;
    align-items: flex-start;
    row-gap: 16px;
    width: 100%:
  `};
`

const ResponsiveButtonPrimary = styled(ButtonPrimary)`
  border-radius: 12px;
  padding: 6px 8px;
  width: fit-content;
  ${({ theme }) => theme.mediaWidth.upToSmall`
    flex: 1 1 auto;
    width: 49%;
  `};
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
    <LightCard padding="12px ">
      <AutoColumn gap="8px" justify="center">
        <ExtentsText>
          <Trans>Current price</Trans>
        </ExtentsText>
        <ThemedText.MediumHeader textAlign="center">
          {(inverted ? tier.token1Price : tier.token0Price).toSignificant(6)}{' '}
        </ThemedText.MediumHeader>
        <ExtentsText>
          <Trans>
            {currencyQuote?.symbol} per {currencyBase?.symbol}
          </Trans>
        </ExtentsText>
      </AutoColumn>
    </LightCard>
  )
}

function LinkedCurrency({ chainId, currency }: { chainId?: number; currency?: Currency }) {
  const address = (currency as Token)?.address

  if (typeof chainId === 'number' && address) {
    return (
      <ExternalLink href={getExplorerLink(chainId, address, ExplorerDataType.TOKEN)}>
        <RowFixed>
          <CurrencyLogo currency={currency} size={'20px'} style={{ marginRight: '0.5rem' }} />
          <ThemedText.Main>{currency?.symbol} ↗</ThemedText.Main>
        </RowFixed>
      </ExternalLink>
    )
  }

  return (
    <RowFixed>
      <CurrencyLogo currency={currency} size={'20px'} style={{ marginRight: '0.5rem' }} />
      <ThemedText.Main>{currency?.symbol}</ThemedText.Main>
    </RowFixed>
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
  const theme = useTheme()

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

  // const [receiveWETH, setReceiveWETH] = useState(true)
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
      withdrawalRecipient: account,
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
            })
          })
      })
      .catch((error) => {
        setCollecting(false)
        console.error(error)
      })
  }, [chainId, feeAmount0, feeAmount1, manager, account, tokenId, addTransaction, library, position])

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
    <ResponsiveRow>
      <RowFixed>
        <DoubleCurrencyLogo currency0={currencyBase} currency1={currencyQuote} size={24} margin={true} />
        <ThemedText.Label fontSize={'24px'} mr="10px">
          &nbsp;{currencyQuote?.symbol}&nbsp;/&nbsp;{currencyBase?.symbol}
        </ThemedText.Label>
        <Badge style={{ marginRight: '8px' }}>
          <BadgeText>
            <Trans>{position?.poolTier.feePercent.toFixed(2)}%</Trans>
          </BadgeText>
        </Badge>
        <RangeBadge removed={removed} inRange={inRange} />
      </RowFixed>

      {ownsNFT && (
        <RowFixed>
          {currency0 && currency1 && positionDetail ? (
            <ButtonGray
              as={Link}
              to={`/increase/${currencyId(currency0)}/${currencyId(currency1)}/${position.poolTier.sqrtGamma}/${
                positionDetail.tokenId
              }`}
              width="fit-content"
              padding="6px 8px"
              $borderRadius="12px"
              style={{ marginRight: '8px' }}
            >
              <Trans>Increase Liquidity</Trans>
            </ButtonGray>
          ) : null}
          {positionDetail && !removed ? (
            <ResponsiveButtonPrimary
              as={Link}
              to={`/remove/${positionDetail.tokenId}`}
              width="fit-content"
              padding="6px 8px"
              $borderRadius="12px"
            >
              <Trans>Remove Liquidity</Trans>
            </ResponsiveButtonPrimary>
          ) : null}
        </RowFixed>
      )}
    </ResponsiveRow>
  )

  const makeLiquidityValueCard = () => (
    <DarkCard style={{ marginRight: 12 }}>
      <AutoColumn gap="md" style={{ width: '100%' }}>
        <AutoColumn gap="md">
          <Label>
            <Trans>Liquidity</Trans>
          </Label>
          {fiatValueOfLiquidity?.greaterThan(new Fraction(1, 100)) ? (
            <ThemedText.LargeHeader fontSize="36px" fontWeight={500}>
              <Trans>${fiatValueOfLiquidity.toFixed(2, { groupSeparator: ',' })}</Trans>
            </ThemedText.LargeHeader>
          ) : (
            <ThemedText.LargeHeader color={theme.text1} fontSize="36px" fontWeight={500}>
              <Trans>$-</Trans>
            </ThemedText.LargeHeader>
          )}
        </AutoColumn>
        <LightCard padding="12px 16px">
          <AutoColumn gap="md">
            <RowBetween>
              <LinkedCurrency chainId={chainId} currency={currencyQuote} />
              <RowFixed>
                <ThemedText.Main>
                  {inverted ? position?.amount0.toSignificant(4) : position?.amount1.toSignificant(4)}
                </ThemedText.Main>
                {typeof ratio === 'number' && !removed ? (
                  <Badge style={{ marginLeft: '10px' }}>
                    <ThemedText.Main fontSize={11}>
                      <Trans>{inverted ? ratio : 100 - ratio}%</Trans>
                    </ThemedText.Main>
                  </Badge>
                ) : null}
              </RowFixed>
            </RowBetween>
            <RowBetween>
              <LinkedCurrency chainId={chainId} currency={currencyBase} />
              <RowFixed>
                <ThemedText.Main>
                  {inverted ? position?.amount1.toSignificant(4) : position?.amount0.toSignificant(4)}
                </ThemedText.Main>
                {typeof ratio === 'number' && !removed ? (
                  <Badge style={{ marginLeft: '10px' }}>
                    <ThemedText.Main color={theme.text2} fontSize={11}>
                      <Trans>{inverted ? 100 - ratio : ratio}%</Trans>
                    </ThemedText.Main>
                  </Badge>
                ) : null}
              </RowFixed>
            </RowBetween>
          </AutoColumn>
        </LightCard>
      </AutoColumn>
    </DarkCard>
  )

  const makeFeeValueCard = () => (
    <DarkCard>
      <AutoColumn gap="md" style={{ width: '100%' }}>
        <AutoColumn gap="md">
          <RowBetween style={{ alignItems: 'flex-start' }}>
            <AutoColumn gap="md">
              <Label>
                <Trans>Unclaimed fees</Trans>
              </Label>
              {fiatValueOfFees?.greaterThan(new Fraction(1, 100)) ? (
                <ThemedText.LargeHeader color={theme.green1} fontSize="36px" fontWeight={500}>
                  <Trans>${fiatValueOfFees.toFixed(2, { groupSeparator: ',' })}</Trans>
                </ThemedText.LargeHeader>
              ) : (
                <ThemedText.LargeHeader color={theme.text1} fontSize="36px" fontWeight={500}>
                  <Trans>$-</Trans>
                </ThemedText.LargeHeader>
              )}
            </AutoColumn>
            {ownsNFT && (feeAmount0?.greaterThan(0) || feeAmount1?.greaterThan(0) || !!collectMigrationHash) ? (
              <ButtonConfirmed
                disabled={collecting || !!collectMigrationHash}
                confirmed={!!collectMigrationHash && !isCollectPending}
                width="fit-content"
                style={{ borderRadius: '12px' }}
                padding="4px 8px"
                onClick={() => setShowConfirm(true)}
              >
                {!!collectMigrationHash && !isCollectPending ? (
                  <ThemedText.Main color={theme.text1}>
                    <Trans> Collected</Trans>
                  </ThemedText.Main>
                ) : isCollectPending || collecting ? (
                  <ThemedText.Main color={theme.text1}>
                    {' '}
                    <Dots>
                      <Trans>Collecting</Trans>
                    </Dots>
                  </ThemedText.Main>
                ) : (
                  <>
                    <ThemedText.Main color={theme.white}>
                      <Trans>Collect fees</Trans>
                    </ThemedText.Main>
                  </>
                )}
              </ButtonConfirmed>
            ) : null}
          </RowBetween>
        </AutoColumn>
        <LightCard padding="12px 16px">
          <AutoColumn gap="md">
            <RowBetween>
              <RowFixed>
                <CurrencyLogo currency={feeAmountUpper?.currency} size={'20px'} style={{ marginRight: '0.5rem' }} />
                <ThemedText.Main>{feeAmountUpper?.currency?.symbol}</ThemedText.Main>
              </RowFixed>
              <RowFixed>
                <ThemedText.Main>{feeAmountUpper ? formatCurrencyAmount(feeAmountUpper, 4) : '-'}</ThemedText.Main>
              </RowFixed>
            </RowBetween>
            <RowBetween>
              <RowFixed>
                <CurrencyLogo currency={feeAmountLower?.currency} size={'20px'} style={{ marginRight: '0.5rem' }} />
                <ThemedText.Main>{feeAmountLower?.currency?.symbol}</ThemedText.Main>
              </RowFixed>
              <RowFixed>
                <ThemedText.Main>{feeAmountLower ? formatCurrencyAmount(feeAmountLower, 4) : '-'}</ThemedText.Main>
              </RowFixed>
            </RowBetween>
          </AutoColumn>
        </LightCard>
        {/* {showCollectAsWeth && (
          <AutoColumn gap="md">
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
          </AutoColumn>
        )} */}
      </AutoColumn>
    </DarkCard>
  )

  const makePriceRangeCard = () => (
    <DarkCard>
      <AutoColumn gap="md">
        <RowBetween>
          <RowFixed>
            <Label display="flex" style={{ marginRight: '12px' }}>
              <Trans>Price range</Trans>
            </Label>
            <HideExtraSmall>
              <>
                <RangeBadge removed={removed} inRange={inRange} />
                <span style={{ width: '8px' }} />
              </>
            </HideExtraSmall>
          </RowFixed>
          <RowFixed>
            {currencyBase && currencyQuote && (
              <RateToggle
                currencyA={currencyBase}
                currencyB={currencyQuote}
                handleRateToggle={() => setManuallyInverted(!manuallyInverted)}
              />
            )}
          </RowFixed>
        </RowBetween>

        <RowBetween>
          <LightCard padding="12px" width="100%">
            <AutoColumn gap="8px" justify="center">
              <ExtentsText>
                <Trans>Min price</Trans>
              </ExtentsText>
              <ThemedText.MediumHeader textAlign="center">
                {formatTickPrice(priceLower, tickAtLimit, Bound.LOWER)}
              </ThemedText.MediumHeader>
              <ExtentsText>
                {' '}
                <Trans>
                  {currencyQuote?.symbol} per {currencyBase?.symbol}
                </Trans>
              </ExtentsText>

              {inRange && (
                <ThemedText.Small color={theme.text3}>
                  <Trans>Your position will be 100% {currencyBase?.symbol} at this price.</Trans>
                </ThemedText.Small>
              )}
            </AutoColumn>
          </LightCard>

          <DoubleArrow>⟷</DoubleArrow>
          <LightCard padding="12px" width="100%">
            <AutoColumn gap="8px" justify="center">
              <ExtentsText>
                <Trans>Max price</Trans>
              </ExtentsText>
              <ThemedText.MediumHeader textAlign="center">
                {formatTickPrice(priceUpper, tickAtLimit, Bound.UPPER)}
              </ThemedText.MediumHeader>
              <ExtentsText>
                {' '}
                <Trans>
                  {currencyQuote?.symbol} per {currencyBase?.symbol}
                </Trans>
              </ExtentsText>

              {inRange && (
                <ThemedText.Small color={theme.text3}>
                  <Trans>Your position will be 100% {currencyQuote?.symbol} at this price.</Trans>
                </ThemedText.Small>
              )}
            </AutoColumn>
          </LightCard>
        </RowBetween>
        <CurrentPriceCard inverted={inverted} tier={tier} currencyQuote={currencyQuote} currencyBase={currencyBase} />
      </AutoColumn>
    </DarkCard>
  )

  const makeConfirmModalHeader = () => (
    <AutoColumn gap={'md'} style={{ marginTop: '20px' }}>
      <LightCard padding="12px 16px">
        <AutoColumn gap="md">
          <RowBetween>
            <RowFixed>
              <CurrencyLogo currency={feeAmountUpper?.currency} size={'20px'} style={{ marginRight: '0.5rem' }} />
              <ThemedText.Main>{feeAmountUpper ? formatCurrencyAmount(feeAmountUpper, 4) : '-'}</ThemedText.Main>
            </RowFixed>
            <ThemedText.Main>{feeAmountUpper?.currency?.wrapped.symbol}</ThemedText.Main>
          </RowBetween>
          <RowBetween>
            <RowFixed>
              <CurrencyLogo currency={feeAmountLower?.currency} size={'20px'} style={{ marginRight: '0.5rem' }} />
              <ThemedText.Main>{feeAmountLower ? formatCurrencyAmount(feeAmountLower, 4) : '-'}</ThemedText.Main>
            </RowFixed>
            <ThemedText.Main>{feeAmountLower?.currency?.wrapped.symbol}</ThemedText.Main>
          </RowBetween>
        </AutoColumn>
      </LightCard>
      <ThemedText.Italic>
        <Trans>Collecting fees will withdraw currently available fees for you.</Trans>
      </ThemedText.Italic>
      <ButtonPrimary onClick={collect}>
        <Trans>Collect</Trans>
      </ButtonPrimary>
    </AutoColumn>
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
              title={<Trans>Claim fees</Trans>}
              onDismiss={() => setShowConfirm(false)}
              topContent={makeConfirmModalHeader}
            />
          )}
          pendingText={<Trans>Collecting fees</Trans>}
        />
        <AutoColumn gap="md">
          <AutoColumn gap="sm">
            <Link style={{ textDecoration: 'none', width: 'fit-content', marginBottom: '0.5rem' }} to="/pool">
              <HoverText>
                <Trans>← Back to Pools Overview</Trans>
              </HoverText>
            </Link>
            {makeHeaderRow()}
            <RowBetween></RowBetween>
          </AutoColumn>
          <ResponsiveRow align="flex-start">
            {makeLiquidityValueCard()}
            {makeFeeValueCard()}
          </ResponsiveRow>
          {makePriceRangeCard()}
        </AutoColumn>
      </PageWrapper>
      <SwitchLocaleLink />
    </>
  )
}
