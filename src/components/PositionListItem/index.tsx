import { Trans } from '@lingui/macro'
import { useIsTickAtLimit } from '@muffinfi/hooks/useIsTickAtLimit'
import { useMuffinPool } from '@muffinfi/hooks/usePools'
import { MuffinPositionDetail } from '@muffinfi/hooks/usePositions'
import { Position } from '@muffinfi/muffin-v1-sdk'
import { Price, Token } from '@uniswap/sdk-core'
import * as DS from 'components/@DS'
import RangeBadge from 'components/Badge/RangeBadge'
import DoubleCurrencyLogo from 'components/DoubleLogo'
import HoverInlineText from 'components/HoverInlineText'
import Loader from 'components/Loader'
import { useToken } from 'hooks/Tokens'
import { darken } from 'polished'
import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { Bound } from 'state/mint/v3/actions'
import styled from 'styled-components/macro'
import { formatTickPrice } from 'utils/formatTickPrice'
import { unwrappedToken } from 'utils/unwrappedToken'
import { DAI, USDC_MAINNET, USDT, WBTC, WRAPPED_NATIVE_CURRENCY } from '../../constants/tokens'

const LinkRow = styled(Link)`
  display: grid;
  align-items: center;
  grid-template-columns: 1.5em 1fr auto;
  gap: 1.5em;

  cursor: pointer;
  text-decoration: none;
  color: inherit;

  min-height: 88px;
  padding: 16px 16px;
  border-radius: 16px;
  margin-bottom: 16px;

  &:last-of-type {
    margin-bottom: 0;
  }

  background: var(--bg1);
  transition: background-color 150ms;
  :hover {
    background: ${({ theme }) => darken(0.03, theme.bg1)};
  }

  ${({ theme }) => theme.mediaWidth.upToSmall`
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
  `};
`

const NftId = styled.div`
  font-size: 0.875em;
  font-weight: var(--regular);
  color: var(--text2);
`

const PositionInfoWrapper = styled(DS.Row)`
  flex-wrap: wrap;
  gap: 1.25em;
  ${({ theme }) => theme.mediaWidth.upToSmall`
    gap: 0.375em;
  `}
`

const PriceRange = styled.div`
  font-size: 0.875em;
  white-space: nowrap;

  & > span {
    display: inline-block;
    vertical-align: baseline;
  }
`

const PriceRangeValue = styled.span`
  font-weight: var(--fw-bold);
`

const PriceRangeArrow = styled.span`
  font-weight: var(--fw-semibold);
  margin: 0 0.75em;
`

const PriceRangeUnit = styled.span`
  font-weight: var(--fw-semibold);
  opacity: 0.625;
  margin-left: 1em;
`

interface PositionListItemProps {
  positionDetails: MuffinPositionDetail
}

export function getPriceOrderingFromPositionForUI(position?: Position): {
  priceLower?: Price<Token, Token>
  priceUpper?: Price<Token, Token>
  quote?: Token
  base?: Token
} {
  if (!position) {
    return {}
  }

  // NOTE: general logic
  // 1. if have stablecoin, stablecoin as quote currency  | ABC-USD
  // 2. if have ETH or BTC, ETH or BTC as base currency   | ETH-ABC
  // 3. if both tick prices below 1, invert them
  // 4. otherwise, nothing changed

  const token0 = position.amount0.currency
  const token1 = position.amount1.currency

  // if token0 is a dollar-stable asset, set it as the quote token
  const stables = [DAI, USDC_MAINNET, USDT]
  if (stables.some((stable) => stable.equals(token0))) {
    return {
      priceLower: position.token0PriceUpper.invert(), // it means the upper tick's token0 price, denominated in token1
      priceUpper: position.token0PriceLower.invert(),
      quote: token0,
      base: token1,
    }
  }

  // if token1 is an ETH-/BTC-stable asset, set it as the base token
  const bases = [...Object.values(WRAPPED_NATIVE_CURRENCY), WBTC]
  if (bases.some((base) => base && base.equals(token1))) {
    return {
      priceLower: position.token0PriceUpper.invert(),
      priceUpper: position.token0PriceLower.invert(),
      quote: token0,
      base: token1,
    }
  }

  // if both prices are below 1, invert
  if (position.token0PriceUpper.lessThan(1)) {
    return {
      priceLower: position.token0PriceUpper.invert(),
      priceUpper: position.token0PriceLower.invert(),
      quote: token0,
      base: token1,
    }
  }

  // otherwise, just return the default
  return {
    priceLower: position.token0PriceLower,
    priceUpper: position.token0PriceUpper,
    quote: token1,
    base: token0,
  }
}

export default function PositionListItem({ positionDetails }: PositionListItemProps) {
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
  const { priceLower, priceUpper, quote, base } = getPriceOrderingFromPositionForUI(position)

  const currencyQuote = quote && unwrappedToken(quote)
  const currencyBase = base && unwrappedToken(base)

  // check if price is within range
  const outOfRange: boolean = tier ? tier.computedTick < tickLower || tier.computedTick >= tickUpper : false

  const positionSummaryLink = '/pool/' + tokenId

  const removed = liquidityD8?.eq(0)

  return (
    <LinkRow to={positionSummaryLink}>
      <NftId>#{tokenId.toString()}</NftId>
      {currencyBase && currencyQuote && priceLower && priceUpper ? (
        <PositionInfoWrapper>
          <DoubleCurrencyLogo currency0={currencyBase} currency1={currencyQuote} margin em={1.5} />
          <DS.Column gap="0.375em">
            <DS.PoolTierName noLogo currencyBase={currencyBase} currencyQuote={currencyQuote} tier={tier} />
            <PriceRange>
              <PriceRangeValue>{formatTickPrice(priceLower, tickAtLimit, Bound.LOWER)}</PriceRangeValue>
              <PriceRangeArrow>⟷</PriceRangeArrow>
              <PriceRangeValue>{formatTickPrice(priceUpper, tickAtLimit, Bound.UPPER)}</PriceRangeValue>
              <PriceRangeUnit>
                <Trans>
                  <HoverInlineText text={currencyQuote?.symbol} /> per <HoverInlineText text={currencyBase?.symbol} />
                </Trans>
              </PriceRangeUnit>
            </PriceRange>
          </DS.Column>
        </PositionInfoWrapper>
      ) : (
        <Loader />
      )}
      <RangeBadge removed={removed} inRange={!outOfRange} />
    </LinkRow>
  )
}
