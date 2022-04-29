import { Trans } from '@lingui/macro'
import { Tier } from '@muffinfi/muffin-v1-sdk'
import { Currency, Price, Token } from '@uniswap/sdk-core'
import Badge from 'components/Badge'
import DoubleCurrencyLogo from 'components/DoubleLogo'
import HoverInlineText from 'components/HoverInlineText'
import { Bound } from 'state/mint/v3/actions'
import styled from 'styled-components/macro'
import { formatTickPrice } from 'utils/formatTickPrice'
import { unwrappedToken } from 'utils/unwrappedToken'
import { Row, Text } from '../core'

export const PriceUnit = ({
  currencyBase,
  currencyQuote,
  price,
  ...rest
}: (
  | { currencyBase: Currency | undefined; currencyQuote: Currency | undefined }
  | { price: Price<Currency, Currency> | undefined }
) &
  Parameters<typeof Text>[0]) => {
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
  tickAtLimit: { [key in Bound]?: boolean | undefined }
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

////////////////////////////

// TODO: use new badge
const FeeBadge = styled(Badge)`
  font-size: 0.875em;
  font-weight: inherit;
`

export const PoolTierExpr = ({
  currencyBase, //  i.e. currency0
  currencyQuote, // i.e. currency1
  tier,
  noLogo,
  noFee,
}: {
  currencyBase: Currency | undefined
  currencyQuote: Currency | undefined
  tier: Tier | undefined
  noLogo?: boolean
  noFee?: boolean
}) => {
  return (
    <Row gap="0.75em">
      {!noLogo && <DoubleCurrencyLogo currency0={currencyBase} currency1={currencyQuote} margin />}
      <Text>
        {currencyQuote?.symbol}&nbsp;/&nbsp;{currencyBase?.symbol}
      </Text>
      {tier && !noFee && (
        <FeeBadge>
          <Trans>{tier.feePercent.toFixed(2)}%</Trans>
        </FeeBadge>
      )}
    </Row>
  )
}
