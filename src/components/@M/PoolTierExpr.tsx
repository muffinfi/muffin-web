import { Trans } from '@lingui/macro'
import { Tier } from '@muffinfi/muffin-v1-sdk'
import { Currency } from '@uniswap/sdk-core'
import Badge from 'components/Badge'
import DoubleCurrencyLogo from 'components/DoubleLogo'
import styled from 'styled-components/macro'
import { Row, Text } from './misc'

// TODO: use new badge
const FeeBadge = styled(Badge)`
  font-size: 0.875em;
  font-weight: inherit;
`

export default function PoolTierExpr({
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
}) {
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
