import { Trans } from '@lingui/macro'
import { Tier } from '@muffinfi/muffin-sdk'
import { formatFeePercent } from '@muffinfi/utils/formatFeePercent'
import { Currency, Price, Rounding, Token } from '@uniswap/sdk-core'
import Badge from 'components/Badge'
import DoubleCurrencyLogo from 'components/DoubleLogo'
import HoverInlineText from 'components/HoverInlineText'
import formatLocaleNumber from 'lib/utils/formatLocaleNumber'
import { memo } from 'react'
import { Bound } from 'state/mint/v3/actions'
import styled from 'styled-components/macro'
import { formatTickPrice } from 'utils/formatTickPrice'
import { unwrappedToken } from 'utils/unwrappedToken'

import { Row, Text } from '../core'

type TextParams = Parameters<typeof Text>[0]

type RowParams = Parameters<typeof Row>[0]

const RowBaseline = styled(Row)`
  align-items: baseline;
`

export const PriceUnit = memo(function PriceUnit({
  currencyBase,
  currencyQuote,
  price,
  ...rest
}: (
  | { currencyBase: Currency | undefined; currencyQuote: Currency | undefined }
  | { price: Price<Currency, Currency> | undefined }
) &
  TextParams) {
  const base = price ? unwrappedToken(price.baseCurrency) : currencyBase
  const quote = price ? unwrappedToken(price.quoteCurrency) : currencyQuote

  return (
    <Text color="text2" weight="regular" {...rest}>
      {base && quote && (
        <Trans>
          <HoverInlineText text={quote?.symbol} /> per <HoverInlineText text={base?.symbol} />
        </Trans>
      )}
    </Text>
  )
})

export const PriceExpr = memo(function PriceExpr({
  price,
  rounding,
  ...rest
}: { price: Price<Currency, Currency> | undefined; rounding?: Rounding } & RowParams) {
  const currencyBase = price ? unwrappedToken(price.baseCurrency) : undefined
  const currencyQuote = price ? unwrappedToken(price.quoteCurrency) : undefined

  return (
    <RowBaseline wrap="wrap" columnGap="0.666em" rowGap="0.25em" {...rest}>
      <Text>{price?.toSignificant(5, undefined, rounding)}</Text>
      <PriceUnit style={{ fontSize: '0.875em' }} currencyBase={currencyBase} currencyQuote={currencyQuote} />
    </RowBaseline>
  )
})

export const PriceRangeExpr = memo(function PriceRangeExpr({
  priceLower,
  priceUpper,
  tickAtLimit,
  ...rest
}: {
  priceLower: Price<Token, Token> | undefined
  priceUpper: Price<Token, Token> | undefined
  tickAtLimit: { [key in Bound]?: boolean | undefined }
} & RowParams) {
  const currencyBase = priceLower ? unwrappedToken(priceLower.baseCurrency) : undefined
  const currencyQuote = priceLower ? unwrappedToken(priceLower.quoteCurrency) : undefined

  return (
    <RowBaseline wrap="wrap" columnGap="0.666em" rowGap="0.25em" {...rest}>
      <Row wrap="wrap" columnGap="0.5em" rowGap="0.25em">
        <Text>{formatTickPrice(priceLower, tickAtLimit, Bound.LOWER)}</Text>
        <Text style={{ fontSize: '0.875em' }}>⟷</Text>
        <Text>{formatTickPrice(priceUpper, tickAtLimit, Bound.UPPER)}</Text>
      </Row>
      <PriceUnit style={{ fontSize: '0.875em' }} currencyBase={currencyBase} currencyQuote={currencyQuote} />
    </RowBaseline>
  )
})

////////////////////////////

export const PriceExprInline = memo(function PriceExpr({
  price,
  invert,
}: {
  price: Price<Currency, Currency> | undefined
  invert?: boolean
} & RowParams) {
  const _price = invert ? price?.invert() : price
  const currencyBase = _price ? unwrappedToken(_price.baseCurrency) : undefined
  const currencyQuote = _price ? unwrappedToken(_price.quoteCurrency) : undefined

  const priceFormatted = _price ? formatLocaleNumber({ number: _price, sigFigs: 5, locale: undefined }) : ''
  return (
    <span>
      {priceFormatted} <PriceUnit color="" weight="" currencyBase={currencyBase} currencyQuote={currencyQuote} />
    </span>
  )
})

export const PriceRangeExprInline = memo(function PriceRangeExprInline({
  priceLower,
  priceUpper,
  tickAtLimit,
  invert,
}: {
  priceLower: Price<Token, Token> | undefined
  priceUpper: Price<Token, Token> | undefined
  tickAtLimit: { [key in Bound]?: boolean | undefined }
  invert?: boolean
}) {
  const _priceLower = invert ? priceUpper?.invert() : priceLower
  const _priceUpper = invert ? priceLower?.invert() : priceUpper
  const _ticksAtLimit = invert
    ? { [Bound.LOWER]: tickAtLimit[Bound.UPPER], [Bound.UPPER]: tickAtLimit[Bound.LOWER] }
    : tickAtLimit

  const currencyBase = _priceLower ? unwrappedToken(_priceLower.baseCurrency) : undefined
  const currencyQuote = _priceLower ? unwrappedToken(_priceLower.quoteCurrency) : undefined

  return (
    <span>
      {formatTickPrice(_priceLower, _ticksAtLimit, Bound.LOWER)} <span style={{ fontSize: '0.8em' }}>↔</span>{' '}
      {formatTickPrice(_priceUpper, _ticksAtLimit, Bound.UPPER)}{' '}
      <PriceUnit color="" weight="" currencyBase={currencyBase} currencyQuote={currencyQuote} />
    </span>
  )
})

////////////////////////////

// TODO: use new badge
const FeeBadge = styled(Badge)`
  font-size: 0.875em;
  font-weight: inherit;
`

export const PoolTierExpr = memo(function PoolTierExpr({
  currencyBase, //  i.e. currency0
  currencyQuote, // i.e. currency1
  tier,
  noLogo,
  noFee,
  ...rest
}: {
  currencyBase: Currency | undefined
  currencyQuote: Currency | undefined
  tier: Tier | undefined
  noLogo?: boolean
  noFee?: boolean
} & RowParams) {
  return (
    <Row gap="0.75em" {...rest}>
      {!noLogo && <DoubleCurrencyLogo currency0={currencyBase} currency1={currencyQuote} margin />}
      <Text>
        {currencyQuote?.symbol}&nbsp;/&nbsp;{currencyBase?.symbol}
      </Text>
      {tier && !noFee && (
        <FeeBadge>
          <Trans>{formatFeePercent(tier.feePercent)}%</Trans>
        </FeeBadge>
      )}
    </Row>
  )
})

export const PoolTierExprInline = memo(function PoolTierExprInline({ tier }: { tier: Tier | undefined }) {
  const currencyBase = tier ? unwrappedToken(tier.token0) : undefined
  const currencyQuote = tier ? unwrappedToken(tier.token1) : undefined
  if (!currencyBase || !currencyQuote || !tier) return <span>-</span>
  return (
    <span>
      {currencyQuote.symbol}/{currencyBase.symbol} pool ({formatFeePercent(tier.feePercent)}% fee tier)
    </span>
  )
})
