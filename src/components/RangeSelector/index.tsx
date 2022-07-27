import { Trans } from '@lingui/macro'
import * as M from '@muffinfi-ui'
import { Currency, Price, Token } from '@uniswap/sdk-core'
import StepCounter from 'components/InputStepCounter/InputStepCounter'
import { Bound } from 'state/mint/v3/actions'

const formatPricePercentDiff = (price: Price<Token, Token>, newPrice: Price<Token, Token>) => {
  const pctDiff = newPrice.subtract(price).divide(price).multiply(100)
  const plusSign = pctDiff.greaterThan(0) ? '+' : ''
  const valueStr = pctDiff.lessThan(100)
    ? pctDiff.toSignificant(3)
    : pctDiff.lessThan(10_000)
    ? pctDiff.toFixed(1)
    : '>9999.9'
  return `${plusSign}${valueStr}%`
}

// currencyA is the base token
export default function RangeSelector({
  priceCurrent,
  priceLower,
  priceUpper,
  onLeftRangeInput,
  onRightRangeInput,
  getDecrementLower,
  getIncrementLower,
  getDecrementUpper,
  getIncrementUpper,
  currencyA,
  currencyB,
  ticksAtLimit,
}: {
  priceCurrent?: Price<Token, Token>
  priceLower?: Price<Token, Token>
  priceUpper?: Price<Token, Token>
  getDecrementLower: () => string
  getIncrementLower: () => string
  getDecrementUpper: () => string
  getIncrementUpper: () => string
  onLeftRangeInput: (typedValue: string) => void
  onRightRangeInput: (typedValue: string) => void
  currencyA?: Currency | null
  currencyB?: Currency | null
  ticksAtLimit: { [bound in Bound]?: boolean | undefined }
}) {
  const tokenA = (currencyA ?? undefined)?.wrapped
  const tokenB = (currencyB ?? undefined)?.wrapped
  const isSorted = tokenA && tokenB && tokenA.sortsBefore(tokenB)

  const leftPrice = isSorted ? priceLower : priceUpper?.invert()
  const rightPrice = isSorted ? priceUpper : priceLower?.invert()

  const price = isSorted ? priceCurrent : priceCurrent?.invert()
  const pctDiffLeft = price && leftPrice ? formatPricePercentDiff(price, leftPrice) : undefined
  const pctDiffRight = price && rightPrice ? formatPricePercentDiff(price, rightPrice) : undefined

  return (
    <M.RowBetween gap="1em">
      <StepCounter
        value={ticksAtLimit[isSorted ? Bound.LOWER : Bound.UPPER] ? '0' : leftPrice?.toSignificant(5) ?? ''}
        onUserInput={onLeftRangeInput}
        decrement={isSorted ? getDecrementLower : getIncrementUpper}
        increment={isSorted ? getIncrementLower : getDecrementUpper}
        decrementDisabled={ticksAtLimit[isSorted ? Bound.LOWER : Bound.UPPER]}
        incrementDisabled={false} // {ticksAtLimit[isSorted ? Bound.LOWER : Bound.UPPER]}
        tokenA={currencyA?.symbol}
        tokenB={currencyB?.symbol}
        title={
          <>
            <Trans>Min Price</Trans>&nbsp;&nbsp;{pctDiffLeft ? <M.Text size="xs">({pctDiffLeft})</M.Text> : null}
          </>
        }
      />
      <StepCounter
        value={ticksAtLimit[isSorted ? Bound.UPPER : Bound.LOWER] ? '∞' : rightPrice?.toSignificant(5) ?? ''}
        onUserInput={onRightRangeInput}
        decrement={isSorted ? getDecrementUpper : getIncrementLower}
        increment={isSorted ? getIncrementUpper : getDecrementLower}
        decrementDisabled={false} // {ticksAtLimit[isSorted ? Bound.UPPER : Bound.LOWER]}
        incrementDisabled={ticksAtLimit[isSorted ? Bound.UPPER : Bound.LOWER]}
        tokenA={currencyA?.symbol}
        tokenB={currencyB?.symbol}
        title={
          <>
            <Trans>Max Price</Trans>&nbsp;&nbsp;{pctDiffRight ? <M.Text size="xs">({pctDiffRight}) </M.Text> : null}
          </>
        }
      />
    </M.RowBetween>
  )
}
