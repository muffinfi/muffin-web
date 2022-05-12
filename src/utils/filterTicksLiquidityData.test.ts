import { scaleLinear, SeriesPoint, stack } from 'd3'

import filterTicksLiquidityData from './filterTicksLiquidityData'

const KEY = '0.3%'

// start price: 10, end price: 20
const xScale = scaleLinear().domain([10, 20]).range([0, 1000])
const leftEdgePrice = 9 // 10 - 1 (1 is hard coded in source)
const rightEdgePrice = xScale.invert(window.innerWidth)

const runTest = (input: number[], output: number[] | undefined) => {
  const data = stack().keys([KEY])(input.map((price0) => ({ [KEY]: 100, price0 })))
  const result = filterTicksLiquidityData(data[0], xScale)
  if (!output) {
    expect(result).toBeUndefined()
  } else {
    const expectedOutput = output.map((price0) => {
      const point = [0, 100] as SeriesPoint<{ [key: string]: number }>
      point.data = { [KEY]: 100, price0 }
      return point
    })
    expect([...(result as Iterable<[number, number]>)]).toEqual(expectedOutput)
  }
}

const runInBothDirections = (input: number[], output: number[] | undefined) => {
  // ascending
  runTest(input, output)
  // descending
  runTest(input.reverse(), output?.reverse())
}

describe('filterTicksLiquidityData', () => {
  it('all ticks on left', () => {
    runInBothDirections([2, 4, 6, 8], undefined)
  })

  it('all ticks on right', () => {
    runInBothDirections([22, 24, 26, 28], undefined)
  })

  it('across range', () => {
    const input = [5, 7, 10, 13, 15, 17, 20, 22, 24]
    const output = [leftEdgePrice, 10, 13, 15, 17, 20, rightEdgePrice]
    runInBothDirections(input, output)
  })

  it('across left only', () => {
    const input = [5, 7, 10, 13, 15, 17]
    const output = [leftEdgePrice, 10, 13, 15, 17]
    runInBothDirections(input, output)
  })

  it('across right only', () => {
    const input = [13, 15, 17, 20, 22, 24]
    const output = [13, 15, 17, 20, rightEdgePrice]
    runInBothDirections(input, output)
  })

  it('acrossed but not in range point', () => {
    const input = [5, 7, 22, 24]
    const output = [leftEdgePrice, rightEdgePrice]
    runInBothDirections(input, output)
  })

  it('in range only', () => {
    const input = [10, 13, 15, 17, 20]
    const output = [10, 13, 15, 17, 20]
    runInBothDirections(input, output)
  })

  // NOTE: uncomment below to profile filterTicksLiquidityData
  // it('profiling', () => {
  //   const input = [...Array(1_000_000).keys()]
  //   const xScale = scaleLinear().domain([0, 1000]).range([0, 1000])
  //   const data = stack().keys([KEY])(input.map((price0) => ({ [KEY]: 100, price0 })))
  //   const noop = (item: any) => undefined

  //   // use our custom generator
  //   console.time('custom')
  //   const result = filterTicksLiquidityData(data[0], xScale)
  //   if (result) {
  //     for (const item of result) {
  //       // loop item once
  //       noop(item)
  //     }
  //   }
  //   console.timeEnd('custom')

  //   // use filter to create new array
  //   console.time('filter')
  //   const array = data[0].filter((d) => {
  //     const value = xScale(d.data.price0)
  //     return value > -window.innerWidth && value <= window.innerWidth
  //   })
  //   for (const item of array) {
  //     // loop item once
  //     noop(item)
  //   }
  //   console.timeEnd('filter')

  //   // use generator to prevent creating new array
  //   console.time('generator')
  //   const generator = function* () {
  //     for (let index = 0; index < data[0].length; index++) {
  //       const d = data[0][index]
  //       const value = xScale(d.data.price0)
  //       if (value > -window.innerWidth && value <= window.innerWidth) {
  //         yield d
  //       }
  //     }
  //   }
  //   for (const item of generator()) {
  //     // loop item once
  //     noop(item)
  //   }
  //   console.timeEnd('generator')
  // })
})
