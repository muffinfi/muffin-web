import { SwapQuoter, Trade } from '@muffinfi/muffin-sdk'
import { Currency, TradeType } from '@uniswap/sdk-core'
import { useMemoArrayWithEqualCheck } from 'hooks/useMemoWithEqualCheck'
import { useSingleContractWithCallData } from 'lib/hooks/multicall'
import { useMemo } from 'react'

import { useLensContract } from '../useContract'

/**
 * Simulate a trade with quoter contract
 * @param trade
 * @returns
 */
export const useSimulateTrade = (trade: Trade<Currency, Currency, TradeType> | undefined) => {
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

  const _callstates = useSingleContractWithCallData(useLensContract(), calldatas)
  const callstates = useMemoArrayWithEqualCheck(_callstates)

  return callstates
}
