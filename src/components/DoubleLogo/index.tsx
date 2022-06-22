import { Currency } from '@uniswap/sdk-core'
import styled from 'styled-components/macro'

import CurrencyLogo from '../CurrencyLogo'

const Wrapper = styled.div<{ em: number }>`
  display: flex;
  flex-direction: row;
  font-size: ${({ em }) => `${em ?? 1.125}em`};
`

/**
 * Logo at the bottom and at the left side
 */
const LogoBottom = styled(CurrencyLogo)``

/**
 * Logo at the top and at the right side
 */
const LogoTop = styled(CurrencyLogo)<{ $margin: boolean }>`
  margin-left: ${({ $margin }) => ($margin ? '-0.25em' : '0')};
`

interface DoubleCurrencyLogoProps {
  margin?: boolean
  size?: number
  em?: number
  currency0?: Currency
  currency1?: Currency
}

export default function DoubleCurrencyLogo({
  currency0,
  currency1,
  size = 16, // TODO: deprecating this in favour of "em"
  em = 1.2,
  margin = false,
}: DoubleCurrencyLogoProps) {
  return (
    <Wrapper em={em}>
      {currency1 && <LogoBottom size="1em" currency={currency1} />}
      {currency0 && <LogoTop size="1em" currency={currency0} $margin={margin} />}
    </Wrapper>
  )
}
