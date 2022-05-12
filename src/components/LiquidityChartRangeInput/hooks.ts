import { Currency } from '@uniswap/sdk-core'
import { TickProcessed, usePoolActiveLiquidity } from 'hooks/usePoolTickData'
import { useCallback, useMemo } from 'react'

import { ChartEntry } from './types'

export function useDensityChartData({
  currencyA,
  currencyB,
  tierId,
}: {
  currencyA: Currency | undefined
  currencyB: Currency | undefined
  tierId: number | undefined
}) {
  const { isLoading, isUninitialized, isError, error, data } = usePoolActiveLiquidity(currencyA, currencyB, tierId)

  const formatData = useCallback(() => {
    if (!data?.length) {
      return undefined
    }

    const newData: ChartEntry[] = []

    for (let i = 0; i < data.length; i++) {
      const t: TickProcessed = data[i]

      const chartEntry = {
        activeLiquidity: Object.fromEntries(
          Object.entries(t.liquidityActive).map(([key, value]) => [key, parseFloat(value.toString())])
        ),
        price0: parseFloat(t.price0),
      }

      const liquidities = Object.values(chartEntry.activeLiquidity)

      if (liquidities.length > 0 && liquidities.every((value) => value > 0)) {
        newData.push(chartEntry)
      }
    }

    return newData
  }, [data])

  return useMemo(() => {
    return {
      isLoading,
      isUninitialized,
      isError,
      error,
      formattedData: !isLoading && !isUninitialized ? formatData() : undefined,
    }
  }, [isLoading, isUninitialized, isError, error, formatData])
}
