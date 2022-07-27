import { MAX_TICK, MIN_TICK, nearestUsableTick } from '@muffinfi/muffin-sdk'
import { useMemo } from 'react'
import { Bound } from 'state/mint/v3/actions'

export function useIsTickAtLimit(
  tickSpacing: number | undefined,
  tickLower: number | undefined,
  tickUpper: number | undefined
) {
  return useMemo(
    () => ({
      [Bound.LOWER]: tickLower && tickSpacing ? tickLower === nearestUsableTick(MIN_TICK, tickSpacing) : undefined,
      [Bound.UPPER]: tickUpper && tickSpacing ? tickUpper === nearestUsableTick(MAX_TICK, tickSpacing) : undefined,
    }),
    [tickLower, tickUpper, tickSpacing]
  )
}
