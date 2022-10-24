import { Trans } from '@lingui/macro'
import { useIsTickAtLimit } from '@muffinfi/hooks/useIsTickAtLimit'
import { useMuffinPool } from '@muffinfi/hooks/usePools'
import { MuffinPositionDetail } from '@muffinfi/hooks/usePositions'
import { LimitOrderType, Position } from '@muffinfi/muffin-sdk'
import { formatFeePercent } from '@muffinfi/utils/formatFeePercent'
import * as M from '@muffinfi-ui'
import AlertHelper from '@muffinfi-ui/components/AlertHelper'
import RangeBadge from 'components/Badge/RangeBadge'
import RangeOrderBadge from 'components/Badge/RangeOrderBadge'
import DoubleCurrencyLogo from 'components/DoubleLogo'
import Loader from 'components/Loader'
import { useToken } from 'hooks/useCurrency'
import { usePricesFromPositionForUI } from 'hooks/usePricesFromPositionForUI'
import { memo, useMemo } from 'react'
import styled, { css } from 'styled-components/macro'
import { priceToNumber } from 'utils/fractionToNumber'
import { unwrappedToken } from 'utils/unwrappedToken'

import { usePositionValue } from './PositionValuesUpdater'

export const BasePositionRow = css`
  display: grid;
  align-items: center;
  grid-template-columns: 1.5rem 10rem 80px 1fr 110px 100px 100px;
  gap: 1rem;
  padding: 24px 24px;
  border-bottom: 1px solid var(--borderColor);

  &:last-child {
    border-bottom: 0;
  }

  ${({ theme }) => theme.mediaWidth.upToMedium`
    padding-left: 16px;
    padding-right: 16px;
    grid-template-columns: 1.5rem 10rem 72px 1fr 80px 80px;
  `}

  ${({ theme }) => theme.mediaWidth.upToSmall`
    padding-left: 0;
    padding-right: 0;
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 0.75rem;
  `}
`

export const PriceRangeBarWrapper = styled.div`
  ${({ theme }) => theme.mediaWidth.upToMedium`
    display: none
  `}
`

const LastColumn = styled.div`
  & > div {
    align-items: flex-end;

    ${({ theme }) => theme.mediaWidth.upToSmall`
      align-items: flex-start;
    `}
  }
`

const PositionRow = styled(M.Link)`
  ${BasePositionRow}
  min-height: 83px;
  transition: background-color 100ms;
  :hover {
    background: var(--layer2);
  }
`

const LoaderWrapper = styled(M.Row)`
  justify-content: center;
  padding-right: 2.5em;
  grid-column: 2 / 8;
`

const ProgressBar = styled.progress<{ height?: number; width?: number }>`
  width: ${({ width }) => `${width}px`};
  height: ${({ height }) => `${height}px`};
  appearance: none;
  border: none;
  border-radius: 3px;
  overflow: hidden;

  background-color: #637fff;

  &::-webkit-progress-bar {
    background-color: #637fff;
  }

  &::-moz-progress-bar {
    background-color: #ff9459;
  }

  &::-webkit-progress-value {
    background-color: #ff9459;
  }
`

const PositionPriceRangeBar = ({
  position,
  invertPrice,
  height = 8,
  width = 100,
}: {
  position: Position
  invertPrice?: boolean | undefined
  height?: number
  width?: number
}) => {
  const x = useMemo(() => {
    const priceLower = priceToNumber(position.token0PriceLower)
    const priceUpper = priceToNumber(position.token0PriceUpper)
    const priceCurrent = position.settled
      ? priceToNumber(position.priceToSettle)
      : priceToNumber(position.poolTier.token0Price)

    const pct = invertPrice
      ? (1 / priceCurrent - 1 / priceUpper) / (1 / priceLower - 1 / priceUpper)
      : (priceCurrent - priceLower) / (priceUpper - priceLower)
    const bounded = Math.min(1, Math.max(0, pct))
    return Math.round(bounded * 100)
  }, [position, invertPrice])

  return <ProgressBar width={width} height={height} value={x} max={100} />
}

export default memo(function PositionListRow({ positionDetails }: { positionDetails: MuffinPositionDetail }) {
  const {
    tokenId,
    token0: token0Address,
    token1: token1Address,
    tierId,
    liquidityD8,
    tickLower,
    tickUpper,
    limitOrderType,
    settlementSnapshotId,
    settled,
  } = positionDetails

  // NOTE: fetch token basic info, init Token objects from sdk-core
  const token0 = useToken(token0Address)
  const token1 = useToken(token1Address)

  // NOTE: unwrap Token into Currency (i.e. WETH -> ETH, if there is WETH)
  const currency0 = token0 ? unwrappedToken(token0) : undefined
  const currency1 = token1 ? unwrappedToken(token1) : undefined

  // construct Position from details returned
  const [, pool] = useMuffinPool(currency0 ?? undefined, currency1 ?? undefined)
  const tier = pool?.tiers[tierId] ?? undefined

  const position = useMemo(() => {
    // ensure `tierId` exists before position object creation
    if (pool && tierId < pool.tiers.length) {
      return new Position({
        pool,
        tierId,
        tickLower,
        tickUpper,
        liquidityD8: liquidityD8.toString(),
        limitOrderType,
        settlementSnapshotId,
        settled,
      })
    }
    return undefined
  }, [liquidityD8, pool, tickLower, tickUpper, tierId, limitOrderType, settlementSnapshotId, settled])

  const tickAtLimit = useIsTickAtLimit(pool?.tickSpacing, tickLower, tickUpper)
  const isFullRange = Boolean(tickAtLimit.LOWER && tickAtLimit.UPPER)

  // prices
  const { priceLower, priceUpper, quote, base } = usePricesFromPositionForUI(position)

  const currencyQuote = quote && unwrappedToken(quote)
  const currencyBase = base && unwrappedToken(base)

  // check if price is within range
  const outOfRange: boolean = tier ? tier.tickCurrent < tickLower || tier.tickCurrent >= tickUpper : false

  const positionSummaryLink = `/positions/${tokenId}`

  const removed = liquidityD8.eq(0)

  const invertPrice = base && position && base.equals(position.poolTier.token1)

  const { valueETH, valueUSD, missingToken0Value, missingToken1Value } = usePositionValue(tokenId.toString())

  return (
    <PositionRow to={positionSummaryLink}>
      {/* 1 */}
      <M.Text size="xs" color="text2">
        #{tokenId.toString()}
      </M.Text>

      {currencyBase && currencyQuote && priceLower && priceUpper && tier ? (
        <>
          {/* 2 */}
          <M.Row gap="0.5em">
            <DoubleCurrencyLogo currency0={currencyBase} currency1={currencyQuote} margin={false} em={1.4} />
            <M.Text weight="semibold">
              {currencyQuote?.symbol}&nbsp;/&nbsp;{currencyBase?.symbol}
            </M.Text>
          </M.Row>

          {/* 3 */}
          <M.Text weight="semibold">
            <Trans>{formatFeePercent(tier.feePercent)}%</Trans>
          </M.Text>

          {/* 4 */}
          <M.Column gap="0.15em">
            <M.Text weight="medium">
              <M.PriceRangeExpr
                priceLower={priceLower}
                priceUpper={priceUpper}
                tickAtLimit={tickAtLimit}
                // style={{ flexDirection: 'column', rowGap: '0.15em' }}
              />
            </M.Text>
            <M.TextDiv size="xs" color="text2">
              <Trans>Current:</Trans>{' '}
              {(invertPrice ? position?.poolTier.token1Price : position?.poolTier.token0Price)?.toSignificant(5)}
            </M.TextDiv>
            {/* <div style={{ marginTop: 3, marginBottom: -3, lineHeight: 0 }}>
          {position ? (
            <PositionPriceRangeBar position={position} invertPrice={invertPrice} height={3} width={160} />
          ) : null}
        </div> */}
          </M.Column>

          {/* 5 */}
          <PriceRangeBarWrapper>
            {isFullRange ? (
              <M.TextDiv size="sm" color="text2" style={{ width: 80, textAlign: 'center' }}>
                ---
              </M.TextDiv>
            ) : position ? (
              <PositionPriceRangeBar position={position} invertPrice={invertPrice} width={80} />
            ) : null}

            {/* <M.PriceExpr
          price={position?.poolTier.token1Price}
          invert={invertPrice}
          style={{ flexDirection: 'column', rowGap: '0.15em' }}
        /> */}
          </PriceRangeBarWrapper>

          {/* 6 */}
          <M.Column gap="0.15em">
            <M.TextDiv weight="semibold">
              ${valueUSD.toLocaleString(undefined, { maximumFractionDigits: 0, minimumFractionDigits: 0 })}{' '}
              {missingToken0Value || missingToken1Value ? (
                <AlertHelper
                  text={
                    <Trans>
                      We are unable to evaluate {missingToken0Value ? `${position?.pool.token0.symbol ?? '---'}` : ''}{' '}
                      {missingToken0Value && missingToken1Value ? 'and' : ''}{' '}
                      {missingToken1Value ? `${position?.pool.token1.symbol ?? '---'}` : ''} value.
                    </Trans>
                  }
                />
              ) : null}
            </M.TextDiv>
            <M.TextDiv size="xs" color="text2">
              Ξ{valueETH.toLocaleString(undefined, { maximumFractionDigits: 3, minimumFractionDigits: 3 })}
            </M.TextDiv>
          </M.Column>

          {/* 7 */}
          <LastColumn>
            <M.Column gap="0.5em">
              <RangeOrderBadge limitOrderType={limitOrderType} token0={token0} token1={token1} />
              <RangeBadge
                removed={removed}
                inRange={!outOfRange}
                settled={settled}
                isLimit={limitOrderType !== LimitOrderType.NotLimitOrder}
              />
            </M.Column>
          </LastColumn>
        </>
      ) : (
        <LoaderWrapper>
          <Loader />
        </LoaderWrapper>
      )}
    </PositionRow>
  )
})
