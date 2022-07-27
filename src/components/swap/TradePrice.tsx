import { Trans } from '@lingui/macro'
import * as M from '@muffinfi-ui'
import { Currency, Price } from '@uniswap/sdk-core'
import useUSDCPrice from 'hooks/useUSDCPrice'
import { useCallback } from 'react'
import styled from 'styled-components/macro'

interface TradePriceProps {
  price: Price<Currency, Currency>
  showInverted: boolean
  setShowInverted: (showInverted: boolean) => void
}

const StyledRow = styled(M.Row)`
  cursor: pointer;
  padding: 8px 0;
  :hover {
    opacity: 0.7;
  }
`

export default function TradePrice({ price, showInverted, setShowInverted }: TradePriceProps) {
  const usdcPrice = useUSDCPrice(showInverted ? price.baseCurrency : price.quoteCurrency)

  let formattedPrice: string
  try {
    formattedPrice = showInverted ? price.toSignificant(4) : price.invert()?.toSignificant(4)
  } catch (error) {
    formattedPrice = '0'
  }

  const label = showInverted ? `${price.quoteCurrency?.symbol}` : `${price.baseCurrency?.symbol} `
  const labelInverted = showInverted ? `${price.baseCurrency?.symbol} ` : `${price.quoteCurrency?.symbol}`
  const flipPrice = useCallback(() => setShowInverted(!showInverted), [setShowInverted, showInverted])

  const text = `${'1 ' + labelInverted + ' = ' + formattedPrice ?? '-'} ${label}`

  return (
    <StyledRow
      gap="0.5em"
      wrap="wrap"
      onClick={(e) => {
        e.stopPropagation() // dont want this click to affect dropdowns / hovers
        flipPrice()
      }}
      title={text}
    >
      <M.Text size="sm" weight="semibold" color="text1">
        {text}
      </M.Text>
      {usdcPrice && (
        <M.Text size="sm" color="text2">
          <Trans>(≈${usdcPrice.toSignificant(6, { groupSeparator: ',' })})</Trans>
        </M.Text>
      )}
    </StyledRow>
  )
}
