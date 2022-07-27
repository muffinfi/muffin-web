import { getPriceImpact, getRealizedFee, Hop, Trade } from '@muffinfi/muffin-sdk'
import { Currency, CurrencyAmount, Percent, TradeType } from '@uniswap/sdk-core'
import { CallStateResult } from 'lib/hooks/multicall'
import { useMemo } from 'react'

import { useSimulateTrade } from './useSimulateTrade'

const allResultsExist = (results: (CallStateResult | undefined)[]): results is CallStateResult[] => {
  return results.every((result) => result != null)
}

export enum TradeAdvancedDetailsState {
  INVALID = 'INVALID',
  LOADING = 'LOADING',
  VALID = 'VALID',
}

export function useTradeAdvancedDetails<TInput extends Currency>(
  trade: Trade<TInput, Currency, TradeType> | undefined
): {
  state?: TradeAdvancedDetailsState
  priceImpact?: Percent
  feePercent?: Percent
  feeAmount?: CurrencyAmount<TInput>
} {
  const callstates = useSimulateTrade(trade)

  return useMemo(() => {
    if (trade == null || callstates == null) return {}
    if (callstates.some((state) => state.loading)) return { state: TradeAdvancedDetailsState.LOADING }
    if (callstates.some((state) => !state.valid)) return { state: TradeAdvancedDetailsState.INVALID }

    const results = callstates.map((state) => state.result)
    if (!allResultsExist(results)) return { state: TradeAdvancedDetailsState.INVALID }

    const hopsList = results.map((result) => result.hops as Hop[])
    const priceImpact = getPriceImpact(trade, hopsList)
    const { percent: feePercent, amount: feeAmount } = getRealizedFee(trade, hopsList)

    return {
      state: TradeAdvancedDetailsState.VALID,
      priceImpact,
      feePercent,
      feeAmount,
    }
  }, [callstates, trade])
}
