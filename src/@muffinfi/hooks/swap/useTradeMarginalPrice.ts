import { getTradeMarginalPrice, Hop, Trade } from '@muffinfi/muffin-sdk'
import { Currency, Price, TradeType } from '@uniswap/sdk-core'
import { useMemo } from 'react'

import { useSimulateTrade } from './useSimulateTrade'

export enum TradeMarginalPriceState {
  INVALID = 'INVALID',
  LOADING = 'LOADING',
  VALID = 'VALID',
}

const allItemsExists = <T>(xs: (T | null | undefined)[]): xs is T[] => xs.every((x) => x != null)

/**
 * NOTE: Currently not being used anywhere
 */
export function useTradeMarginalPrice<TInput extends Currency, TOutput extends Currency>(
  trade: Trade<TInput, TOutput, TradeType> | undefined
): {
  state?: TradeMarginalPriceState
  price?: Price<TInput, TOutput>
} {
  const callstates = useSimulateTrade(trade)

  return useMemo(() => {
    if (trade == null || callstates == null) return {}
    if (callstates.some((state) => state.loading)) return { state: TradeMarginalPriceState.LOADING }
    if (callstates.some((state) => !state.valid)) return { state: TradeMarginalPriceState.INVALID }

    const results = callstates.map((state) => state.result)
    if (!allItemsExists(results)) return { state: TradeMarginalPriceState.INVALID }

    const hopsList: Hop[][] = results.map((result) => result.hops)
    const price = getTradeMarginalPrice(trade, hopsList)

    return { state: TradeMarginalPriceState.VALID, price }
  }, [callstates, trade])
}
