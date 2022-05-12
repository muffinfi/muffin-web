import { TickProcessed } from 'hooks/usePoolTickData'
import JSBI from 'jsbi'

import computeSurroundingTicks from './computeSurroundingTicks'

const getV3Tick = (tickIdx: number, liquidityNet: (number | undefined)[]) =>
  ({
    tickIdx,
    price0: '1',
    liquidityActive: {},
    liquidityNet: liquidityNet.reduce<Record<number, JSBI>>((acc, liq, index) => {
      if (typeof liq === 'number') {
        acc[index] = JSBI.BigInt(liq)
      }
      return acc
    }, {}),
  } as TickProcessed)

describe('#computeSurroundingTicks', () => {
  it('correctly compute active liquidity', () => {
    const spacing = 500
    const activeTickProcessed: TickProcessed = {
      tickIdx: 1000,
      liquidityActive: { 0: JSBI.BigInt(300), 1: JSBI.BigInt(300), 2: JSBI.BigInt(300) },
      liquidityNet: { 0: JSBI.BigInt(100), 1: JSBI.BigInt(110), 2: JSBI.BigInt(90) },
      price0: '1',
    }
    const pivot = 3
    const sortedTickData: TickProcessed[] = [
      getV3Tick(activeTickProcessed.tickIdx - 4 * spacing, [10, undefined, undefined]),
      getV3Tick(activeTickProcessed.tickIdx - 2 * spacing, [20, undefined, 30]),
      getV3Tick(activeTickProcessed.tickIdx - 1 * spacing, [30, 40, undefined]),
      activeTickProcessed,
      getV3Tick(activeTickProcessed.tickIdx + 1 * spacing, [40, undefined, 50]),
      getV3Tick(activeTickProcessed.tickIdx + 2 * spacing, [20, 30, undefined]),
      getV3Tick(activeTickProcessed.tickIdx + 5 * spacing, [20, 30, 30]),
    ]

    for (let i = 0; i < 3; i++) {
      computeSurroundingTicks(sortedTickData, i, pivot, true)
      computeSurroundingTicks(sortedTickData, i, pivot, false)
    }

    expect(
      sortedTickData.map((t) => [
        t.tickIdx,
        ...Object.entries(t.liquidityActive).reduce(
          (arr, [index, val]) => {
            arr[+index] = parseFloat(val.toString())
            return arr
          },
          [0, 0, 0]
        ),
      ])
    ).toEqual([
      [activeTickProcessed.tickIdx - 4 * spacing, 150, 150, 180],
      [activeTickProcessed.tickIdx - 2 * spacing, 170, 150, 210],
      [activeTickProcessed.tickIdx - 1 * spacing, 200, 190, 210],
      [activeTickProcessed.tickIdx, 300, 300, 300],
      [activeTickProcessed.tickIdx + 1 * spacing, 340, 300, 350],
      [activeTickProcessed.tickIdx + 2 * spacing, 360, 330, 350],
      [activeTickProcessed.tickIdx + 5 * spacing, 380, 360, 380],
    ])
  })
})
