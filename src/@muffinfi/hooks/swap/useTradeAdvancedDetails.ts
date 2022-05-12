import { getPriceImpact, getRealizedFee, Hop, SwapQuoter, Trade } from '@muffinfi/muffin-v1-sdk'
import { Currency, CurrencyAmount, Percent, TradeType } from '@uniswap/sdk-core'
import { CallStateResult, useSingleContractWithCallData } from 'lib/hooks/multicall'
import { useMemo } from 'react'

import { useQuoterContract } from '../useContract'

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
  const calldatas = useMemo(() => {
    if (!trade) return []
    return trade.swaps.map((swap) => {
      return SwapQuoter.simulateCallParameters(
        swap.route,
        trade.tradeType === TradeType.EXACT_INPUT ? swap.inputAmount : swap.outputAmount,
        trade.tradeType
      ).calldata
    })
  }, [trade])

  const callstates = useSingleContractWithCallData(useQuoterContract(), calldatas)

  return useMemo(() => {
    if (trade == null) return {}
    if (callstates.some((state) => state.loading)) return { state: TradeAdvancedDetailsState.LOADING }
    if (callstates.some((state) => !state.valid)) return { state: TradeAdvancedDetailsState.INVALID }

    const results = callstates.map((state) => state.result)
    if (!allResultsExist(results)) return { state: TradeAdvancedDetailsState.INVALID }

    const exactIn = trade.tradeType === TradeType.EXACT_INPUT
    const hopsList = results.map((result) => {
      const hops: Hop[] = result.hops
      return exactIn ? hops : [...hops].reverse()
    })

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
