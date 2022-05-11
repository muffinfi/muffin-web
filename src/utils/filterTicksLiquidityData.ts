import type { ScaleLinear, Series, SeriesPoint } from 'd3'

function findRightIndex<T>(array: T[], predicate: (element: T, index: number, array: T[]) => boolean, endingIndex = 0) {
  for (let index = array.length - 1; index >= endingIndex; index--) {
    if (predicate(array[index], index, array)) {
      return index
    }
  }
  return -1
}

const changeDataPointPriceData = (point: SeriesPoint<{ [key: string]: number }>, newPrice: number) => {
  const newPoint = [...point] as SeriesPoint<{ [key: string]: number }>
  newPoint.data = {
    ...point.data,
    price0: newPrice,
  }
  return newPoint
}

const filterTicksLiquidityData = (
  data: Series<{ [key: string]: number }, string>,
  xScale: ScaleLinear<number, number>
) => {
  if (data.length < 2) return undefined // cannot show area if less than 2 points

  // starting price respected to the DOM element
  const startPrice0 = Math.max(0, xScale.invert(0))

  // ending price respected to `window.innerWidth`
  // it is used to to prevent depends on chart DOM width, but may give out more off screen points
  const endPrice0 = xScale.invert(window.innerWidth)

  // logic goes different with the order direction of the data
  const isAscending = data[0].data.price0 <= data[data.length - 1].data.price0

  const startIndex = isAscending
    ? data.findIndex((d) => d.data.price0 >= startPrice0)
    : data.findIndex((d) => d.data.price0 <= endPrice0)

  // no starting point found
  if (startIndex === -1) return undefined

  const endIndex = isAscending
    ? findRightIndex(data, (d) => d.data.price0 <= endPrice0, startIndex)
    : findRightIndex(data, (d) => d.data.price0 >= startPrice0, startIndex)

  // cannot show are if only has one point to output
  if (endIndex === -1 && startIndex === 0) {
    return undefined
  }

  // use generator to iterate the result effectively
  const generator = function* () {
    // yield startIndex - 1 point, cap it to prevent svg overflow
    if (startIndex > 0) {
      yield changeDataPointPriceData(data[startIndex - 1], isAscending ? Math.max(startPrice0 - 1, 0) : endPrice0)
    }
    // if no endIndex found, yield startIndex only as endIndex and return
    if (endIndex === -1) {
      // it is located at right if ascending, left if descending. cap it to prevent svg overflow
      yield changeDataPointPriceData(data[startIndex], isAscending ? endPrice0 : Math.max(startPrice0 - 1, 0))
      return
    }
    // yield every valid point
    for (let index = startIndex; index <= endIndex; index++) {
      yield data[index]
    }
    // yield endIndex + 1 point, cap it to prevent svg overflow
    if (endIndex + 1 < data.length) {
      yield changeDataPointPriceData(data[endIndex + 1], isAscending ? endPrice0 : Math.max(startPrice0 - 1, 0))
    }
  }

  return generator() as Iterable<[number, number]>
}

export default filterTicksLiquidityData
