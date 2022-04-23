import { Currency } from '@uniswap/sdk-core'
import CurrencyLogo from 'components/CurrencyLogo'
import styled from 'styled-components/macro'
import { Row } from './misc'

const TokenSymbol = styled.div`
  font-weight: var(--fw-semibold);
`

export default function Token({ currency }: { currency: Currency | undefined }) {
  return (
    <Row gap="8px">
      <CurrencyLogo size="1.25em" currency={currency} />
      <TokenSymbol>{currency?.symbol}</TokenSymbol>
    </Row>
  )
}
