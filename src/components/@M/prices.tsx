import { Trans } from '@lingui/macro'
import { Currency, Price, Token } from '@uniswap/sdk-core'
import HoverInlineText from 'components/HoverInlineText'
import { Bound } from 'state/mint/v3/actions'
import { formatTickPrice } from 'utils/formatTickPrice'
import { unwrappedToken } from 'utils/unwrappedToken'
import { Row, Text } from './misc'

export const PriceUnit = ({
  currencyBase,
  currencyQuote,
  ...rest
}: {
  currencyBase: Currency | undefined
  currencyQuote: Currency | undefined
} & Parameters<typeof Text>[0]) => {
  return (
    <Text color="text2" weight="regular" {...rest}>
      <Trans>
        <HoverInlineText text={currencyQuote?.symbol} /> per <HoverInlineText text={currencyBase?.symbol} />
      </Trans>
    </Text>
  )
}

export const PriceExpr = ({ price }: { price: Price<Currency, Currency> | undefined }) => {
  const currencyBase = price ? unwrappedToken(price.baseCurrency) : undefined
  const currencyQuote = price ? unwrappedToken(price.quoteCurrency) : undefined

  return (
    <Row wrap="wrap" columnGap="0.666em" rowGap="0.25em" style={{ alignItems: 'baseline' }}>
      <Text>{price?.toSignificant(6)}</Text>
      <PriceUnit style={{ fontSize: '0.875em' }} currencyBase={currencyBase} currencyQuote={currencyQuote} />
    </Row>
  )
}

export const PriceRangeExpr = ({
  priceLower,
  priceUpper,
  tickAtLimit,
}: {
  priceLower: Price<Token, Token> | undefined
  priceUpper: Price<Token, Token> | undefined
  tickAtLimit: { [key in Bound]: boolean | undefined }
}) => {
  const currencyBase = priceLower ? unwrappedToken(priceLower.baseCurrency) : undefined
  const currencyQuote = priceLower ? unwrappedToken(priceLower.quoteCurrency) : undefined

  return (
    <Row wrap="wrap" columnGap="0.666em" rowGap="0.25em" style={{ alignItems: 'baseline' }}>
      <Row wrap="wrap" columnGap="0.5em" rowGap="0.25em">
        <Text>{formatTickPrice(priceLower, tickAtLimit, Bound.LOWER)}</Text>
        <Text size="base">⟷</Text>
        <Text>{formatTickPrice(priceUpper, tickAtLimit, Bound.UPPER)}</Text>
      </Row>
      <PriceUnit style={{ fontSize: '0.875em' }} currencyBase={currencyBase} currencyQuote={currencyQuote} />
    </Row>
  )
}
