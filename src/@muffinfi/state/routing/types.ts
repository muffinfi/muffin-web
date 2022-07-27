import { Route, Trade } from '@muffinfi/muffin-sdk'
import { Currency, CurrencyAmount, Token, TradeType } from '@uniswap/sdk-core'

export class InterfaceTrade<
  TInput extends Currency,
  TOutput extends Currency,
  TTradeType extends TradeType
> extends Trade<TInput, TOutput, TTradeType> {
  gasUseEstimateUSD: CurrencyAmount<Token> | null | undefined

  constructor({
    gasUseEstimateUSD,
    ...routes
  }: {
    gasUseEstimateUSD?: CurrencyAmount<Token> | undefined | null
    routes: {
      route: Route<TInput, TOutput>
      inputAmount: CurrencyAmount<TInput>
      outputAmount: CurrencyAmount<TOutput>
    }[]
    tradeType: TTradeType
  }) {
    super(routes)
    this.gasUseEstimateUSD = gasUseEstimateUSD
  }
}
