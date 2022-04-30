import { Trans } from '@lingui/macro'
import * as M from '@muffinfi-ui'
import { useIsTickAtLimit } from '@muffinfi/hooks/useIsTickAtLimit'
import { useMuffinPool } from '@muffinfi/hooks/usePools'
import { MuffinPositionDetail } from '@muffinfi/hooks/usePositions'
import { Position } from '@muffinfi/muffin-v1-sdk'
import RangeBadge from 'components/Badge/RangeBadge'
import DoubleCurrencyLogo from 'components/DoubleLogo'
import HoverInlineText from 'components/HoverInlineText'
import Loader from 'components/Loader'
import { useToken } from 'hooks/useCurrency'
import { usePricesFromPositionForUI } from 'hooks/usePricesFromPositionForUI'
import { useMemo } from 'react'
import { Bound } from 'state/mint/v3/actions'
import styled, { css } from 'styled-components/macro'
import { formatTickPrice } from 'utils/formatTickPrice'
import { unwrappedToken } from 'utils/unwrappedToken'

export const BasePositionRow = css`
  display: grid;
  align-items: center;
  grid-template-columns: 1.25rem 9rem 4rem 1fr max-content;
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

export default function PositionListItem({ positionDetails }: { positionDetails: MuffinPositionDetail }) {
  const {
    token0: token0Address,
    token1: token1Address,
    tierId,
    liquidityD8,
    tickLower,
    tickUpper,
    tokenId,
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
  const outOfRange: boolean = tier ? tier.computedTick < tickLower || tier.computedTick >= tickUpper : false

  const positionSummaryLink = '/pool/' + tokenId

  const removed = liquidityD8?.eq(0)

  return (
    <PositionRow to={positionSummaryLink}>
      <M.Text color="text2" size="sm">
        #{tokenId.toString()}
      </M.Text>
      {currencyBase && currencyQuote && priceLower && priceUpper && tier ? (
        <>
          <M.Row gap="0.5em">
            <DoubleCurrencyLogo currency0={currencyBase} currency1={currencyQuote} margin em={1.333} />
            <M.Text weight="semibold" ellipsis>
              {currencyQuote?.symbol}&nbsp;/&nbsp;{currencyBase?.symbol}
            </M.Text>
          </M.Row>
          <M.Text weight="semibold">
            <Trans>{tier.feePercent.toFixed(2)}%</Trans>
          </M.Text>
          <M.Row wrap="wrap" columnGap="0.5em" rowGap="0.25em" style={{ alignItems: 'baseline' }}>
            <M.Row wrap="wrap" columnGap="0.5em" rowGap="0.25em">
              <M.TextContents weight="semibold" nowrap>
                <M.Text>{formatTickPrice(priceLower, tickAtLimit, Bound.LOWER)}</M.Text>
                <M.Text size="xs">⟷</M.Text>
                <M.Text>{formatTickPrice(priceUpper, tickAtLimit, Bound.UPPER)}</M.Text>
              </M.TextContents>
            </M.Row>
            <M.Text size="sm" color="text2" nowrap>
              <HoverInlineText text={currencyQuote?.symbol} /> per <HoverInlineText text={currencyBase?.symbol} />
            </M.Text>
          </M.Row>
          <M.Row>
            <RangeBadge removed={removed} inRange={!outOfRange} />
          </M.Row>
        </>
      ) : (
        <LoaderWrapper>
          <Loader />
        </LoaderWrapper>
      )}
    </PositionRow>
  )
}
