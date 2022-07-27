import { ZERO } from '@muffinfi/muffin-sdk'
import { TickProcessed } from 'hooks/usePoolTickData'
import JSBI from 'jsbi'

// Computes the numSurroundingTicks above or below the active tick.
export default function computeSurroundingTicks(
  sortedTickData: TickProcessed[],
  tierId: number,
  pivot: number,
  ascending: boolean
) {
  let previousTickProcessed: TickProcessed = sortedTickData[pivot]

  // Iterate outwards (either up or down depending on direction) from the active tick,
  // building active liquidity for every tick.
  for (let i = pivot + (ascending ? 1 : -1); ascending ? i < sortedTickData.length : i >= 0; ascending ? i++ : i--) {
    const currentTickProcessed = sortedTickData[i]
    currentTickProcessed.liquidityActive[tierId] = previousTickProcessed.liquidityActive[tierId]
    currentTickProcessed.liquidityNet[tierId] = JSBI.BigInt(currentTickProcessed.liquidityNet[tierId] ?? 0)

    // Update the active liquidity.
    // If we are iterating ascending and we found an initialized tick we immediately apply
    // it to the current processed tick we are building.
    // If we are iterating descending, we don't want to apply the net liquidity until the following tick.
    if (ascending) {
      currentTickProcessed.liquidityActive[tierId] = JSBI.add(
        previousTickProcessed.liquidityActive[tierId] ?? ZERO,
        currentTickProcessed.liquidityNet[tierId]
      )
    } else if (!ascending && JSBI.notEqual(previousTickProcessed.liquidityNet[tierId] ?? ZERO, ZERO)) {
      // We are iterating descending, so look at the previous tick and apply any net liquidity.
      currentTickProcessed.liquidityActive[tierId] = JSBI.subtract(
        previousTickProcessed.liquidityActive[tierId] ?? ZERO,
        JSBI.BigInt(previousTickProcessed.liquidityNet[tierId] ?? 0)
      )
    }

    previousTickProcessed = currentTickProcessed
  }
}
