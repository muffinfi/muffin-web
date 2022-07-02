import { Position } from '@muffinfi/muffin-v1-sdk'
import { PositionPreview } from 'components/PositionPreview'
import { memo } from 'react'

import { Bound } from '../../state/mint/v3/actions'

export const Review = memo(function Review({
  position,
  outOfRange,
  ticksAtLimit,
}: {
  position?: Position
  outOfRange: boolean
  ticksAtLimit: { [bound in Bound]?: boolean | undefined }
  // existingPosition?: Position
  // parsedAmounts: { [field in Field]?: CurrencyAmount<Currency> }
  // priceLower?: Price<Currency, Currency>
  // priceUpper?: Price<Currency, Currency>
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
})
