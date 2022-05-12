import { InterfaceTrade } from '@muffinfi/state/routing/types'
import { Currency, CurrencyAmount, TradeType } from '@uniswap/sdk-core'
import useDebounce from 'hooks/useDebounce'
import { useMemo } from 'react'
import { TradeState } from 'state/routing/types'

import { useClientSideMuffinTrade } from './useClientSideTrade'

/**
 * Returns the best muffin trade for a desired swap.
 * @param tradeType whether the swap is an exact in/out
 * @param amountSpecified the exact amount to swap in/out
 * @param otherCurrency the desired output/payment currency
 */
export function useBestMuffinTrade(
  tradeType: TradeType,
  amountSpecified?: CurrencyAmount<Currency>,
  otherCurrency?: Currency
): {
  state: TradeState
  trade: InterfaceTrade<Currency, Currency, typeof tradeType> | undefined
} {
  const [debouncedAmount, debouncedOtherCurrency] = useDebounce(
    useMemo(() => [amountSpecified, otherCurrency], [amountSpecified, otherCurrency]),
    200
  )
  const result = useClientSideMuffinTrade(tradeType, debouncedAmount, debouncedOtherCurrency)

  // consider trade debouncing when inputs/outputs do not match
  const debouncing =
    result.trade &&
    amountSpecified &&
    (tradeType === TradeType.EXACT_INPUT
      ? !result.trade.inputAmount.equalTo(amountSpecified) ||
        !amountSpecified.currency.equals(result.trade.inputAmount.currency) ||
        !debouncedOtherCurrency?.equals(result.trade.outputAmount.currency)
      : !result.trade.outputAmount.equalTo(amountSpecified) ||
        !amountSpecified.currency.equals(result.trade.outputAmount.currency) ||
        !debouncedOtherCurrency?.equals(result.trade.inputAmount.currency))

  const isLoading = amountSpecified !== undefined && debouncedAmount === undefined

  if (isLoading) {
    return { ...result, state: TradeState.LOADING }
  } else if (debouncing) {
    return { ...result, state: TradeState.SYNCING }
  } else {
    return { ...result }
  }
}
