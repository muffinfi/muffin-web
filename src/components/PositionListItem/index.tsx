import { Trans } from '@lingui/macro'
import { useIsTickAtLimit } from '@muffinfi/hooks/useIsTickAtLimit'
import { useMuffinPool } from '@muffinfi/hooks/usePools'
import { MuffinPositionDetail } from '@muffinfi/hooks/usePositions'
import { Position, sqrtGammaToFeePercent } from '@muffinfi/muffin-v1-sdk'
import { Price, Token } from '@uniswap/sdk-core'
import Badge from 'components/Badge'
import RangeBadge from 'components/Badge/RangeBadge'
import DoubleCurrencyLogo from 'components/DoubleLogo'
import HoverInlineText from 'components/HoverInlineText'
import Loader from 'components/Loader'
import { RowBetween } from 'components/Row'
import { useToken } from 'hooks/Tokens'
import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { Bound } from 'state/mint/v3/actions'
import styled from 'styled-components/macro'
import { HideSmall, MEDIA_WIDTHS, SmallOnly } from 'theme'
import { formatTickPrice } from 'utils/formatTickPrice'
import { unwrappedToken } from 'utils/unwrappedToken'
import { DAI, USDC, USDT, WBTC, WETH9_EXTENDED } from '../../constants/tokens'

const LinkRow = styled(Link)`
  align-items: center;
  border-radius: 20px;
  display: flex;
  cursor: pointer;
  user-select: none;
  display: flex;
  flex-direction: column;

  justify-content: space-between;
  color: ${({ theme }) => theme.text1};
  margin: 8px 0;
  padding: 16px;
  text-decoration: none;
  font-weight: 500;
  background-color: ${({ theme }) => theme.bg1};

  &:last-of-type {
    margin: 8px 0 0 0;
  }
  & > div:not(:first-child) {
    text-align: center;
  }
  :hover {
    background-color: ${({ theme }) => theme.bg2};
  }

  @media screen and (min-width: ${MEDIA_WIDTHS.upToSmall}px) {
    /* flex-direction: row; */
  }

  ${({ theme }) => theme.mediaWidth.upToSmall`
    flex-direction: column;
    row-gap: 12px;
  `};
`

const BadgeText = styled.div`
  font-weight: 500;
  font-size: 14px;
  ${({ theme }) => theme.mediaWidth.upToSmall`
    font-size: 12px;
  `};
`

const DataLineItem = styled.div`
  font-size: 14px;
`

const RangeLineItem = styled(DataLineItem)`
  display: flex;
  flex-direction: row;
  align-items: center;

  margin-top: 4px;
  width: 100%;

  ${({ theme }) => theme.mediaWidth.upToSmall`
  background-color: ${({ theme }) => theme.bg2};
    border-radius: 12px;
    padding: 8px 0;
`};
`

const DoubleArrow = styled.span`
  margin: 0 2px;
  color: ${({ theme }) => theme.text3};
  ${({ theme }) => theme.mediaWidth.upToSmall`
    margin: 4px;
    padding: 20px;
  `};
`

const RangeText = styled.span`
  /* background-color: ${({ theme }) => theme.bg2}; */
  padding: 0.25rem 0.5rem;
  border-radius: 8px;
`

const ExtentsText = styled.span`
  color: ${({ theme }) => theme.text3};
  font-size: 14px;
  margin-right: 4px;
  ${({ theme }) => theme.mediaWidth.upToSmall`
    display: none;
  `};
`

const PrimaryPositionIdData = styled.div`
  display: flex;
  flex-direction: row;
  align-items: center;
  > * {
    margin-right: 8px;
  }
`

const DataText = styled.div`
  font-weight: 600;
  font-size: 18px;

  ${({ theme }) => theme.mediaWidth.upToSmall`
    font-size: 14px;
  `};
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
  const stables = [DAI, USDC, USDT]
  if (stables.some((stable) => stable.equals(token0))) {
    return {
      priceLower: position.token0PriceUpper.invert(), // it means the upper tick's token0 price, denominated in token1
      priceUpper: position.token0PriceLower.invert(),
      quote: token0,
      base: token1,
    }
  }

  // if token1 is an ETH-/BTC-stable asset, set it as the base token
  const bases = [...Object.values(WETH9_EXTENDED), WBTC]
  if (bases.some((base) => base.equals(token1))) {
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
  const { token0: token0Address, token1: token1Address, tierId, liquidityD8, tickLower, tickUpper } = positionDetails

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

  const positionSummaryLink = '/pool/' + positionDetails.tokenId

  const removed = liquidityD8?.eq(0)

  return (
    <LinkRow to={positionSummaryLink}>
      <RowBetween>
        <PrimaryPositionIdData>
          <DoubleCurrencyLogo currency0={currencyBase} currency1={currencyQuote} size={18} margin />
          <DataText>
            &nbsp;{currencyQuote?.symbol}&nbsp;/&nbsp;{currencyBase?.symbol}
          </DataText>
          &nbsp;
          {tier && (
            <Badge>
              <BadgeText>
                <Trans>{sqrtGammaToFeePercent(tier.sqrtGamma).toSignificant(3)}%</Trans>
              </BadgeText>
            </Badge>
          )}
        </PrimaryPositionIdData>
        <RangeBadge removed={removed} inRange={!outOfRange} />
      </RowBetween>

      {priceLower && priceUpper ? (
        <RangeLineItem>
          <RangeText>
            <ExtentsText>
              <Trans>Min: </Trans>
            </ExtentsText>
            <Trans>
              {formatTickPrice(priceLower, tickAtLimit, Bound.LOWER)} <HoverInlineText text={currencyQuote?.symbol} />{' '}
              per <HoverInlineText text={currencyBase?.symbol ?? ''} />
            </Trans>
          </RangeText>{' '}
          <HideSmall>
            <DoubleArrow>⟷</DoubleArrow>{' '}
          </HideSmall>
          <SmallOnly>
            <DoubleArrow>⟷</DoubleArrow>{' '}
          </SmallOnly>
          <RangeText>
            <ExtentsText>
              <Trans>Max:</Trans>
            </ExtentsText>
            <Trans>
              {formatTickPrice(priceUpper, tickAtLimit, Bound.UPPER)} <HoverInlineText text={currencyQuote?.symbol} />{' '}
              per <HoverInlineText maxCharacters={10} text={currencyBase?.symbol} />
            </Trans>
          </RangeText>
        </RangeLineItem>
      ) : (
        <Loader />
      )}
    </LinkRow>
  )
}
