import { Trans } from '@lingui/macro'
import { Tier } from '@muffinfi/muffin-v1-sdk'
import { Currency } from '@uniswap/sdk-core'
import Badge from 'components/Badge'
import DoubleCurrencyLogo from 'components/DoubleLogo'
import styled from 'styled-components/macro'
import { Row } from './misc'

const PairName = styled.div`
  margin-left: 0.75em;
  margin-right: 0.5em;
  font-weight: var(--fw-bold);

  &:first-child {
    margin-left: 0;
  }
`

const FeeBadge = styled(Badge)`
  font-size: 0.875em;
  font-weight: var(--fw-bold);
`

export default function PoolTierName({
  currencyBase, //  i.e. currency0
  currencyQuote, // i.e. currency1
  tier,
  noLogo,
}: {
  currencyBase: Currency | undefined
  currencyQuote: Currency | undefined
  tier: Tier | undefined
  noLogo?: boolean
}) {
  return (
    <Row>
      {!noLogo && <DoubleCurrencyLogo currency0={currencyBase} currency1={currencyQuote} margin />}
      <PairName>
        {currencyQuote?.symbol}&nbsp;/&nbsp;{currencyBase?.symbol}
      </PairName>
      {tier && (
        <FeeBadge>
          <Trans>{tier.feePercent.toFixed(2)}%</Trans>
        </FeeBadge>
      )}
    </Row>
  )
}
