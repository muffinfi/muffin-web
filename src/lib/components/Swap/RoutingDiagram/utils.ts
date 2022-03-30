import { Protocol } from '@muffinfi/router-sdk'
import { InterfaceTrade } from '@muffinfi/state/routing/types'
import { Currency, Percent, TradeType } from '@uniswap/sdk-core'

type TierChoices = number

export interface RoutingDiagramEntry {
  percent: Percent
  path: [Currency, Currency, TierChoices][]
  protocol: Protocol
}

/**
 * Loops through all routes on a trade and returns an array of diagram entries.
 */
export function getTokenPath(trade: InterfaceTrade<Currency, Currency, TradeType>): RoutingDiagramEntry[] {
  return trade.swaps.map(({ route: { tokenPath, pools, tierChoicesList }, inputAmount, outputAmount }) => {
    const portion =
      trade.tradeType === TradeType.EXACT_INPUT
        ? inputAmount.divide(trade.inputAmount)
        : outputAmount.divide(trade.outputAmount)
    const percent = new Percent(portion.numerator, portion.denominator)
    const path: RoutingDiagramEntry['path'] = []
    for (let i = 0; i < pools.length; i++) {
      // const nextPool = pools[i]
      const tokenIn = tokenPath[i]
      const tokenOut = tokenPath[i + 1]
      const tierChoices = tierChoicesList[i]
      const entry: RoutingDiagramEntry['path'][0] = [tokenIn, tokenOut, tierChoices]
      path.push(entry)
    }
    return {
      percent,
      path,
      protocol: Protocol.V1,
    }
  })
}
