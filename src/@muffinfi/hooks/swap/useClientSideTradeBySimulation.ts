import { getTradeMarginalPrice, Hop, Route, SwapQuoter } from '@muffinfi/muffin-sdk'
import { InterfaceTrade } from '@muffinfi/state/routing/types'
import { ILens } from '@muffinfi/typechain'
import { Currency, CurrencyAmount, Price, TradeType } from '@uniswap/sdk-core'
import { SupportedChainId } from 'constants/chains'
import useActiveWeb3React from 'hooks/useActiveWeb3React'
import { useMemoArrayWithEqualCheck } from 'hooks/useMemoWithEqualCheck'
import { useSingleContractWithCallData } from 'lib/hooks/multicall'
import { useMemo } from 'react'
import { TradeState } from 'state/routing/types'

import { useLensContract } from '../useContract'
import { useAllMuffinRoutes } from './useAllRoutes'

const DEFAULT_GAS_QUOTE = 2_000_000
const QUOTE_GAS_OVERRIDES: { [chainId: number]: number } = {
  [SupportedChainId.ARBITRUM_ONE]: 25_000_000,
  [SupportedChainId.ARBITRUM_RINKEBY]: 25_000_000,
}

// TODO: support order splitting
/**
 * Returns the best muffin trade for a desired swap
 * @param tradeType whether the swap is an exact in/out
 * @param amountSpecified the exact amount to swap in/out
 * @param otherCurrency the desired output/payment currency
 */
export function useClientSideMuffinTradeBySimulation<TTradeType extends TradeType>(
  tradeType: TTradeType,
  amountSpecified: CurrencyAmount<Currency> | undefined,
  otherCurrency: Currency | undefined
): {
  state: TradeState
  trade?: InterfaceTrade<Currency, Currency, TTradeType>
  hops?: Hop[]
  marginalPrice?: Price<Currency, Currency>
} {
  const [currencyIn, currencyOut] =
    tradeType === TradeType.EXACT_INPUT
      ? [amountSpecified?.currency, otherCurrency]
      : [otherCurrency, amountSpecified?.currency]

  // make a list of swap routes for currencyIn and currencyOut
  const { routes, loading: routesLoading } = useAllMuffinRoutes(currencyIn, currencyOut)

  // prepare quoter calldatas
  const calldatas = useMemo(() => {
    return routes && amountSpecified
      ? routes.map((route) => SwapQuoter.simulateCallParameters(route, amountSpecified, tradeType).calldata)
      : []
  }, [routes, amountSpecified, tradeType])

  // fetch quotes from quoter contract
  const { chainId } = useActiveWeb3React()
  const gasRequired = chainId ? QUOTE_GAS_OVERRIDES[chainId] ?? DEFAULT_GAS_QUOTE : undefined
  const _callstates = useSingleContractWithCallData(useLensContract(), calldatas, { gasRequired })
  const callstates = useMemoArrayWithEqualCheck(_callstates)

  // const gasPrice = useGasPrice()
  // const nativeCurrency = useNativeCurrency()
  // const nativeCurrencyPrice = useUSDCPrice(nativeCurrency)

  return useMemo(() => {
    if (
      !amountSpecified ||
      !currencyIn ||
      !currencyOut ||
      !callstates ||
      callstates.some(({ valid }) => !valid) ||
      amountSpecified.currency.equals(tradeType === TradeType.EXACT_INPUT ? currencyOut : currencyIn) // skip when tokens are the same
    ) {
      return { state: TradeState.INVALID }
    }

    if (!routes || routesLoading || callstates.some(({ loading }) => loading)) {
      return { state: TradeState.LOADING }
    }

    const results = callstates.map(({ result }) => result) as (
      | Awaited<ReturnType<ILens['functions']['simulate']>>
      | undefined
    )[]

    const { bestRoute, amountIn, amountOut, hops } = results.reduce<{
      bestRoute?: Route<Currency, Currency>
      amountIn?: CurrencyAmount<Currency>
      amountOut?: CurrencyAmount<Currency>
      hops?: Hop[]
    }>((currentBest, result, i) => {
      if (!result) return currentBest

      // TODO: consider gas cost
      const amountIn = CurrencyAmount.fromRawAmount(currencyIn, result.amountIn.toString())
      const amountOut = CurrencyAmount.fromRawAmount(currencyOut, result.amountOut.toString())

      if (tradeType === TradeType.EXACT_INPUT) {
        if (currentBest.amountOut == null || currentBest.amountOut.lessThan(amountOut)) {
          return {
            bestRoute: routes[i],
            amountIn: amountSpecified,
            amountOut,
            hops: result.hops,
          }
        }
      } else {
        if (currentBest.amountIn == null || currentBest.amountIn.greaterThan(amountIn)) {
          return {
            bestRoute: routes[i],
            amountIn,
            amountOut: amountSpecified,
            hops: result.hops,
          }
        }
      }

      return currentBest
    }, {})

    if (!bestRoute || !amountIn || !amountOut || !hops) {
      return { state: TradeState.NO_ROUTE_FOUND }
    }

    // const gasCost = gasPrice && gasUsed ? JSBI.multiply(gasPrice, JSBI.BigInt(gasUsed.toString())) : undefined
    // const gasUseEstimateUSD =
    //   nativeCurrency && gasCost && nativeCurrencyPrice
    //     ? nativeCurrencyPrice.quote(CurrencyAmount.fromRawAmount(nativeCurrency, gasCost))
    //     : undefined

    const trade = new InterfaceTrade({
      gasUseEstimateUSD: undefined,
      routes: [{ route: bestRoute, inputAmount: amountIn, outputAmount: amountOut }],
      tradeType,
    })
    const marginalPrice = getTradeMarginalPrice(trade, [hops])

    return {
      state: TradeState.VALID,
      trade,
      hops,
      marginalPrice,
    }
  }, [amountSpecified, currencyIn, currencyOut, callstates, routes, routesLoading, tradeType])
}
