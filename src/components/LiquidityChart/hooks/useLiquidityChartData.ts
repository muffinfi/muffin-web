import { useMuffinPool, useMuffinPoolId } from '@muffinfi/hooks/usePools'
import { skipToken } from '@reduxjs/toolkit/query/react'
import { Currency } from '@uniswap/sdk-core'
import { useMemo } from 'react'
import { useAllV3TicksQuery } from 'state/data/enhanced'
import { AllV3TicksQuery } from 'state/data/generated'

import { processTicksData } from '../utils/processData'

export const useLiquidityChartData = (currencyBase: Currency | undefined, currencyQuote: Currency | undefined) => {
  const { poolId, token0, token1 } = useMuffinPoolId(currencyBase, currencyQuote)

  const { data: rawData, ...queryState } = useAllV3TicksQuery(poolId ? { poolId, skip: 0 } : skipToken, {
    pollingInterval: 30000, // 30 secs polling
  }) as {
    isLoading: boolean
    isUninitialized?: boolean
    isError: boolean
    error: unknown
    data: AllV3TicksQuery | undefined
  }

  const invertPrice = token0 && currencyBase ? token0 !== currencyBase.wrapped : undefined

  const priceLiquidityDataList = useMemo(() => {
    return rawData && token0 && token1 && invertPrice != null
      ? processTicksData(rawData, token0, token1, invertPrice)
      : undefined
  }, [rawData, token0, token1, invertPrice])

  const [poolState, pool] = useMuffinPool(currencyBase, currencyQuote)

  return {
    invertPrice,
    queryState,
    priceLiquidityDataList,
    poolState,
    pool,
  }
}
