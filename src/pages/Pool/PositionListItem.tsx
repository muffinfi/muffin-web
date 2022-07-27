import { Trans } from '@lingui/macro'
import { useIsTickAtLimit } from '@muffinfi/hooks/useIsTickAtLimit'
import { useMuffinPool } from '@muffinfi/hooks/usePools'
import { MuffinPositionDetail } from '@muffinfi/hooks/usePositions'
import { LimitOrderType, Position } from '@muffinfi/muffin-sdk'
import { formatFeePercent } from '@muffinfi/utils/formatFeePercent'
import * as M from '@muffinfi-ui'
import RangeBadge from 'components/Badge/RangeBadge'
import RangeOrderBadge from 'components/Badge/RangeOrderBadge'
import DoubleCurrencyLogo from 'components/DoubleLogo'
import Loader from 'components/Loader'
import { useToken } from 'hooks/useCurrency'
import { usePricesFromPositionForUI } from 'hooks/usePricesFromPositionForUI'
import { useMemo } from 'react'
import styled, { css } from 'styled-components/macro'
import { unwrappedToken } from 'utils/unwrappedToken'

export const BasePositionRow = css`
  display: grid;
  align-items: center;
  grid-template-columns: 1.25rem 10.5rem 4.5rem 1fr max-content;
  gap: 1.5rem;
  padding: 16px 24px;

  ${({ theme }) => theme.mediaWidth.upToSmall`
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 0.75rem;
    font-size: var(--text-sm);
  `}
`

const PositionRow = styled(M.Link)`
  ${BasePositionRow}
  border-radius: 16px;
  min-height: 4.5em;
  background: var(--layer2);
  transition: background-color 100ms;
  :hover {
    background: var(--layer3);
  }
`

const LoaderWrapper = styled(M.Row)`
  justify-content: center;
  padding-right: 2.5em;
  grid-column: 2 / 6;

  ${({ theme }) => theme.mediaWidth.upToSmall`
    padding-right: 0;
  `}
`

const LastColumn = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
  align-items: flex-end;

  ${({ theme }) => theme.mediaWidth.upToSmall`
    flex-direction: row;
    align-items: flex-start;
  `}
`

export default function PositionListItem({ positionDetails }: { positionDetails: MuffinPositionDetail }) {
  const {
    token0: token0Address,
    token1: token1Address,
    tierId,
    liquidityD8,
    tickLower,
    tickUpper,
    tokenId,
    limitOrderType,
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
  const tier = typeof tierId === 'number' ? pool?.tiers[tierId] : undefined

  const position = useMemo(() => {
    if (pool) {
      return new Position({ pool, liquidityD8: liquidityD8.toString(), tierId, tickLower, tickUpper })
    }
    return undefined
  }, [liquidityD8, pool, tickLower, tickUpper, tierId])

  const tickAtLimit = useIsTickAtLimit(pool?.tickSpacing, tickLower, tickUpper)

  // prices
  const { priceLower, priceUpper, quote, base } = usePricesFromPositionForUI(position)

  const currencyQuote = quote && unwrappedToken(quote)
  const currencyBase = base && unwrappedToken(base)

  // check if price is within range
  const outOfRange: boolean = tier ? tier.tickCurrent < tickLower || tier.tickCurrent >= tickUpper : false

  const positionSummaryLink = `/positions/${tokenId}`

  const removed = liquidityD8.eq(0)

  return (
    <M.TextContents size="sm">
      <PositionRow to={positionSummaryLink}>
        <M.Text color="text2" size="sm">
          #{tokenId.toString()}
        </M.Text>
        {currencyBase && currencyQuote && priceLower && priceUpper && tier ? (
          <>
            <M.Row gap="0.5em">
              <DoubleCurrencyLogo currency0={currencyBase} currency1={currencyQuote} margin={true} em={1.333} />
              <M.Text weight="semibold">
                {currencyQuote?.symbol}&nbsp;/&nbsp;{currencyBase?.symbol}
              </M.Text>
            </M.Row>
            <M.Text weight="semibold">
              <Trans>{formatFeePercent(tier.feePercent)}%</Trans>
            </M.Text>
            <M.Row wrap="wrap" columnGap="0.7em" rowGap="0.33em">
              <M.PriceRangeExpr priceLower={priceLower} priceUpper={priceUpper} tickAtLimit={tickAtLimit} />
              <M.Text size="xs">({tickUpper - tickLower} ticks)</M.Text>
            </M.Row>
            <LastColumn>
              <RangeOrderBadge limitOrderType={limitOrderType} token0={token0} token1={token1} />
              <RangeBadge
                removed={removed}
                inRange={!outOfRange}
                settled={settled}
                isLimit={limitOrderType !== LimitOrderType.NotLimitOrder}
              />
            </LastColumn>
          </>
        ) : (
          <LoaderWrapper>
            <Loader />
          </LoaderWrapper>
        )}
      </PositionRow>
    </M.TextContents>
  )
}
