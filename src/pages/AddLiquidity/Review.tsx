import { Position } from '@muffinfi/muffin-v1-sdk'
import { Currency, CurrencyAmount, Price } from '@uniswap/sdk-core'
import { PositionPreview } from 'components/PositionPreview'
import { Bound, Field } from '../../state/mint/v3/actions'

export function Review({
  position,
  outOfRange,
  ticksAtLimit,
}: {
  position?: Position
  existingPosition?: Position
  parsedAmounts: { [field in Field]?: CurrencyAmount<Currency> }
  priceLower?: Price<Currency, Currency>
  priceUpper?: Price<Currency, Currency>
  outOfRange: boolean
  ticksAtLimit: { [bound in Bound]?: boolean | undefined }
}) {
  return (
    <>
      {position ? (
        <PositionPreview
          position={position}
          inRange={!outOfRange}
          ticksAtLimit={ticksAtLimit}
          title={'Selected Range'}
        />
      ) : null}
    </>
  )
}
