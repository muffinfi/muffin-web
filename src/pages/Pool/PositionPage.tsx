import { BigNumber } from '@ethersproject/bignumber'
import { TransactionResponse } from '@ethersproject/providers'
import { Trans } from '@lingui/macro'
import { useManagerContract } from '@muffinfi/hooks/useContract'
import { useDerivedMuffinPosition } from '@muffinfi/hooks/useDerivedPosition'
import { useIsTickAtLimit } from '@muffinfi/hooks/useIsTickAtLimit'
import { useMuffinPositionDetailFromTokenId } from '@muffinfi/hooks/usePositions'
import { usePositionUSDCValue } from '@muffinfi/hooks/usePositionUSDCValue'
import { ADDRESS_ZERO, PositionManager } from '@muffinfi/muffin-v1-sdk'
import { useUserStoreIntoInternalAccount } from '@muffinfi/state/user/hooks'
import { BalanceSource } from '@muffinfi/state/wallet/hooks'
import { Currency, CurrencyAmount, Fraction, Percent, Price, Token } from '@uniswap/sdk-core'
import * as M from '@muffinfi-ui'
import Badge from 'components/Badge'
import RangeBadge from 'components/Badge/RangeBadge'
import CurrencyLogo from 'components/CurrencyLogo'
import { Dots } from 'components/swap/styleds'
import TransactionConfirmationModal, { ConfirmationModalContent } from 'components/TransactionConfirmationModal'
import { CHAIN_INFO } from 'constants/chainInfo'
import useActiveWeb3React from 'hooks/useActiveWeb3React'
import { PoolState } from 'hooks/usePools'
import { usePricesFromPositionForUI } from 'hooks/usePricesFromPositionForUI'
import { useCallback, useMemo, useState } from 'react'
import ReactGA from 'react-ga'
import { Link, RouteComponentProps } from 'react-router-dom'
import { useIsTransactionPending, useTransactionAdder } from 'state/transactions/hooks'
import styled from 'styled-components/macro'
import { shortenAddress } from 'utils'
import { currencyId } from 'utils/currencyId'
import { formatCurrencyAmount } from 'utils/formatCurrencyAmount'
import { unwrappedToken } from 'utils/unwrappedToken'
import RateToggle from '../../components/RateToggle'
import { SwitchLocaleLink } from '../../components/SwitchLocaleLink'
import { TransactionType } from '../../state/transactions/actions'
import { calculateGasMargin } from '../../utils/calculateGasMargin'
import { ExplorerDataType, getExplorerLink } from '../../utils/getExplorerLink'
import { LoadingRows } from './styleds'

const TokenProportionBadge = styled(Badge)`
  font-size: 0.75em;
  color: var(--text2);
  margin-left: 12px;

  border-radius: 4px;
  padding: 2px solid var(--badge-bg);
  margin: -2px;
  min-width: 2.6em;
  background: var(--badge-bg);
`

function LinkedCurrency({ chainId, currency }: { chainId?: number; currency?: Currency }) {
  const address = (currency as Token)?.address

  if (typeof chainId === 'number' && address) {
    return (
      <M.ExternalLink href={getExplorerLink(chainId, address, ExplorerDataType.TOKEN)} color="text1" hoverColor="text2">
        <M.Row gap="0.5em">
          <CurrencyLogo currency={currency} size={'20px'} />
          <M.Text weight="medium">{currency?.symbol} ↗</M.Text>
        </M.Row>
      </M.ExternalLink>
    )
  }

  return (
    <M.Row gap="0.5em">
      <CurrencyLogo currency={currency} size={'20px'} />
      <M.Text color="text1" weight="medium">
        {currency?.symbol}
      </M.Text>
    </M.Row>
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

const TokenAmountAndValue = ({
  chainId,
  currency,
  amount,
  fiatValue,
  ratio,
  showRatio,
}: {
  chainId: number | undefined
  currency: Currency | undefined
  amount: CurrencyAmount<Currency> | undefined
  fiatValue: CurrencyAmount<Currency> | undefined
  ratio?: number | undefined
  showRatio?: boolean
}) => {
  return (
    <>
      <M.Text>
        <LinkedCurrency chainId={chainId} currency={currency} />
      </M.Text>
      <M.Text>{amount?.toSignificant(4)}</M.Text>
      <M.Text color="text2" size="sm">
        {/* TODO: is 4 sig fig good? */}
        <Trans>${fiatValue?.toSignificant(4, { groupSeparator: ',' }) ?? '-'}</Trans>
      </M.Text>
      {showRatio ? (
        <div>
          {ratio != null ? (
            <TokenProportionBadge>
              <Trans>{ratio}%</Trans>
            </TokenProportionBadge>
          ) : null}
        </div>
      ) : null}
    </>
  )
}

const TwoColumnGrid = styled(M.Grid)`
  grid-template-columns: 50% 50%;
  ${({ theme }) => theme.mediaWidth.upToSmall`
    grid-template-columns: 100%;
  `}
`

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

  // usdc values of position and unclaimed Fees
  const { fiatValuesOfLiquidity, fiatValuesOfFees } = usePositionUSDCValue(positionDetail, position, token0, token1)
  const fiatValueOfLiquidity = fiatValuesOfLiquidity?.total
  const fiatValueOfFees = fiatValuesOfFees?.total

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
   *                      UNDERLYING TOKENS DATA
   *====================================================================*/

  const underlyings = {
    base: {
      currency: currency0,
      liquidity: {
        amount: position?.amount0,
        value: fiatValuesOfLiquidity?.[0],
        ratio: ratio ?? undefined,
      },
      fee: {
        amount: feeAmount0,
        value: fiatValuesOfFees?.[0],
      },
    },
    quote: {
      currency: currency1,
      liquidity: {
        amount: position?.amount1,
        value: fiatValuesOfLiquidity?.[1],
        ratio: ratio != null ? 100 - ratio : undefined,
      },
      fee: {
        amount: feeAmount1,
        value: fiatValuesOfFees?.[1],
      },
    },
  }
  if (inverted) {
    ;[underlyings.base, underlyings.quote] = [underlyings.quote, underlyings.base]
  }

  /*=====================================================================
   *                          PRICE RANGE CARD
   *====================================================================*/

  const tickAtLimit = useIsTickAtLimit(pool?.tickSpacing, position?.tickLower, position?.tickUpper)

  /*=====================================================================
   *                          GENERAL INFO CARD
   *====================================================================*/

  const ownerAddressShorten = useMemo(() => (owner ? shortenAddress(owner, 6) : null), [owner])
  const token0AddressShorten = useMemo(() => (token0 ? shortenAddress(token0.address, 4) : null), [token0])
  const token1AddressShorten = useMemo(() => (token1 ? shortenAddress(token1.address, 4) : null), [token1])

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
      <LoadingRows style={{ marginTop: 100 }}>
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

  const makeTitleSection = () => (
    <M.Column gap="0.5em">
      <M.Text color="text1">#{tokenId?.toString()}</M.Text>

      <M.TextContents size="xl" weight="bold">
        <M.PoolTierExpr currencyBase={currencyBase} currencyQuote={currencyQuote} tier={position?.poolTier} />
      </M.TextContents>

      <M.TextContents size="lg" weight="semibold">
        <M.PriceRangeExpr priceLower={priceLower} priceUpper={priceUpper} tickAtLimit={tickAtLimit} />
      </M.TextContents>

      <RangeBadge removed={removed} inRange={inRange} />
    </M.Column>
  )

  const makeButtonSection = () =>
    ownsNFT ? (
      <M.Row wrap="wrap" gap="0.75em">
        {positionDetail && currency0 && currency1 ? (
          <M.ButtonPrimary
            as={Link}
            to={`/increase/${currencyId(currency0)}/${currencyId(currency1)}/${position.poolTier.sqrtGamma}/${
              positionDetail.tokenId
            }`}
          >
            <Trans>Increase Liquidity</Trans>
          </M.ButtonPrimary>
        ) : null}

        {positionDetail && !removed ? (
          <M.ButtonPrimary as={Link} to={`/remove/${positionDetail.tokenId}`}>
            <Trans>Decrease Liquidity</Trans>
          </M.ButtonPrimary>
        ) : null}

        {feeAmount0?.greaterThan(0) || feeAmount1?.greaterThan(0) || !!collectMigrationHash ? (
          <M.Button
            color={!!collectMigrationHash && !isCollectPending ? 'tertiary' : 'secondary'}
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
          </M.Button>
        ) : null}
      </M.Row>
    ) : null

  const makeLiquidityValueCard = () => (
    <M.SectionCard style={{ flex: 1 }}>
      <M.Column gap="1em">
        <M.Column gap="0.5em">
          <M.Text size="sm" color="text2">
            <Trans>Liquidity</Trans>
          </M.Text>
          <M.Text size="2xl" weight="semibold">
            {fiatValueOfLiquidity?.greaterThan(new Fraction(1, 100)) ? (
              <Trans>${fiatValueOfLiquidity.toFixed(2, { groupSeparator: ',' })}</Trans>
            ) : (
              <Trans>$-</Trans>
            )}
          </M.Text>
        </M.Column>
        <M.Column gap="0.5em">
          <M.TextContents size="base">
            <M.Grid column={4} columnGap="1em" rowGap="0.5em" alignItems="center">
              <TokenAmountAndValue
                chainId={chainId}
                currency={underlyings.quote.currency}
                amount={underlyings.quote.liquidity.amount}
                fiatValue={underlyings.quote.liquidity.value}
                ratio={underlyings.quote.liquidity.ratio}
                showRatio
              />
              <TokenAmountAndValue
                chainId={chainId}
                currency={underlyings.base.currency}
                amount={underlyings.base.liquidity.amount}
                fiatValue={underlyings.base.liquidity.value}
                ratio={underlyings.base.liquidity.ratio}
                showRatio
              />
            </M.Grid>
          </M.TextContents>
        </M.Column>
      </M.Column>
    </M.SectionCard>
  )

  const makeFeeValueCard = () => (
    <M.SectionCard style={{ flex: 1 }}>
      <M.Column gap="1em">
        <M.Column gap="0.5em">
          <M.Text size="sm" color="text2">
            <Trans>Unclaimed fees</Trans>
          </M.Text>
          <M.Text size="2xl" weight="semibold">
            {fiatValueOfFees?.greaterThan(new Fraction(1, 100)) ? (
              <Trans>${fiatValueOfFees.toFixed(2, { groupSeparator: ',' })}</Trans>
            ) : (
              <Trans>$-</Trans>
            )}
          </M.Text>
        </M.Column>
        <M.Column gap="0.5em">
          <M.TextContents size="base">
            <M.Grid column={3} columnGap="1em" rowGap="0.5em" alignItems="center">
              <TokenAmountAndValue
                chainId={chainId}
                currency={underlyings.quote.currency}
                amount={underlyings.quote.fee.amount}
                fiatValue={underlyings.quote.fee.value}
              />
              <TokenAmountAndValue
                chainId={chainId}
                currency={underlyings.base.currency}
                amount={underlyings.base.fee.amount}
                fiatValue={underlyings.base.fee.value}
              />
            </M.Grid>
          </M.TextContents>
        </M.Column>
      </M.Column>
    </M.SectionCard>
  )

  const makePriceCard = () => (
    <M.Column stretch gap="1em">
      <div>
        {currencyBase && currencyQuote && (
          <RateToggle
            currencyA={currencyBase}
            currencyB={currencyQuote}
            handleRateToggle={() => setManuallyInverted(!manuallyInverted)}
          />
        )}
      </div>
      {/* <M.Toggle>
        <M.ToggleElement active>ETH per DAI</M.ToggleElement>
        <M.ToggleElement>DAI per ETH</M.ToggleElement>
      </M.Toggle> */}
      <M.SectionCard>
        <M.Column stretch gap="32px">
          <M.Column gap="8px">
            <M.Text size="sm" color="text2">
              <Trans>Price range</Trans>
            </M.Text>
            <M.TextContents weight="semibold">
              <M.PriceRangeExpr priceLower={priceLower} priceUpper={priceUpper} tickAtLimit={tickAtLimit} />
            </M.TextContents>
          </M.Column>
          <M.Column gap="8px">
            <M.Text size="sm" color="text2">
              <Trans>Current price</Trans>
            </M.Text>
            <M.TextContents weight="semibold">
              <M.PriceExpr price={inverted ? tier?.token1Price : tier?.token0Price} />
            </M.TextContents>
            <RangeBadge removed={removed} inRange={inRange} />
          </M.Column>
        </M.Column>
      </M.SectionCard>
    </M.Column>
  )

  const makeGeneralInfoCard = () => (
    <M.SectionCard>
      <TwoColumnGrid columnGap="32px" rowGap="32px">
        <M.DataGroup>
          <M.DataLabel>
            <Trans>Network</Trans>
          </M.DataLabel>
          <M.DataValue>{chainId ? CHAIN_INFO[chainId]?.label : undefined}</M.DataValue>
        </M.DataGroup>

        <M.DataGroup>
          <M.DataLabel>
            <Trans>Position ID</Trans>
          </M.DataLabel>
          <M.DataValue>#{tokenId?.toString()}</M.DataValue>
        </M.DataGroup>

        <M.DataGroup>
          <M.DataLabel>
            <Trans>Position Owner</Trans>
          </M.DataLabel>
          <M.DataValue>
            {chainId && owner ? (
              <M.ExternalLink href={getExplorerLink(chainId, owner, ExplorerDataType.ADDRESS)}>
                {ownerAddressShorten}
                <M.Text color="text2" weight="regular">
                  ↗
                </M.Text>
              </M.ExternalLink>
            ) : null}
          </M.DataValue>
        </M.DataGroup>

        <M.DataGroup>
          <M.DataLabel>
            <Trans>Fee tier</Trans>
          </M.DataLabel>
          <M.DataValue>{tier?.feePercent.toFixed(2)}%</M.DataValue>
        </M.DataGroup>

        <M.DataGroup>
          <M.DataLabel>
            <Trans>Pool token0</Trans>
          </M.DataLabel>
          <div>
            <M.DataValue>{token0?.name}</M.DataValue>{' '}
            {chainId && token0?.address ? (
              <M.ExternalLink
                href={getExplorerLink(chainId, token0.address, ExplorerDataType.TOKEN)}
                size="xs"
                color="text2"
              >
                ({token0AddressShorten}↗)
              </M.ExternalLink>
            ) : null}
          </div>
        </M.DataGroup>

        <M.DataGroup>
          <M.DataLabel>
            <Trans>Pool token1</Trans>
          </M.DataLabel>
          <div>
            <M.DataValue>{token1?.name}</M.DataValue>{' '}
            {chainId && token1?.address ? (
              <M.ExternalLink
                href={getExplorerLink(chainId, token1.address, ExplorerDataType.TOKEN)}
                size="xs"
                color="text2"
              >
                ({token1AddressShorten}↗)
              </M.ExternalLink>
            ) : null}
          </div>
        </M.DataGroup>
      </TwoColumnGrid>
    </M.SectionCard>
  )

  const makeConfirmModalContent = () => (
    <M.Column stretch gap="1em" style={{ marginTop: '0' }}>
      <M.Column stretch gap="0.666em">
        <M.RowBetween>
          <M.Row gap="0.5em">
            <CurrencyLogo currency={underlyings.quote.currency} size="1.25em" />
            <M.Text weight="medium">{underlyings.quote.currency?.wrapped.symbol}</M.Text>
          </M.Row>
          <M.Text>{underlyings.quote.fee.amount ? formatCurrencyAmount(underlyings.quote.fee.amount, 4) : '-'}</M.Text>
        </M.RowBetween>
        <M.RowBetween>
          <M.Row gap="0.5em">
            <CurrencyLogo currency={underlyings.base.currency} size="1.25em" />
            <M.Text weight="medium">{underlyings.base.currency?.wrapped.symbol}</M.Text>
          </M.Row>
          <M.Text>{underlyings.base.fee.amount ? formatCurrencyAmount(underlyings.base.fee.amount, 4) : '-'}</M.Text>
        </M.RowBetween>
      </M.Column>

      <M.TextContents weight="semibold" size="sm">
        <M.OutputDestinationToggle
          toInternalAccount={storeInInternalAccount}
          questionHelperContent={<Trans>Choose the destination of the collected fee.</Trans>}
          onToggle={toggleStoreInInternalAccount}
        />
      </M.TextContents>

      <M.Text color="text2" size="xs">
        <Trans>Collecting fees will withdraw currently available fees for you.</Trans>
      </M.Text>

      <M.ButtonRowPrimary onClick={collect}>
        <Trans>Collect</Trans>
      </M.ButtonRowPrimary>
    </M.Column>
  )

  return (
    <>
      <M.Container maxWidth="45rem">
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

        <M.Column stretch gap="32px">
          <M.Link to="/pool" color="text2">
            <Trans>← Back to Positions</Trans>
          </M.Link>

          {makeTitleSection()}
          {makeButtonSection()}

          <M.Row wrap="wrap" gap="32px" style={{ alignItems: 'flex-start' }}>
            {makeLiquidityValueCard()}
            {makeFeeValueCard()}
          </M.Row>

          {makePriceCard()}
          {makeGeneralInfoCard()}

          <SwitchLocaleLink />
        </M.Column>
      </M.Container>
    </>
  )
}
