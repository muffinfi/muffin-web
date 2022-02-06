import { Route, SwapQuoter, Trade } from '@muffinfi/muffin-v1-sdk'
import { Currency, CurrencyAmount, TradeType } from '@uniswap/sdk-core'
import { SupportedChainId } from 'constants/chains'
import { useActiveWeb3React } from 'hooks/web3'
import JSBI from 'jsbi'
import { useMemo } from 'react'
import { useSingleContractWithCallData } from 'state/multicall/hooks'
import { V3TradeState } from 'state/routing/types'
import { useQuoterContract } from '../useContract'
import { useAllMuffinRoutes } from './useAllRoutes'

const DEFAULT_GAS_QUOTE = 2_000_000
const QUOTE_GAS_OVERRIDES: { [chainId: number]: number } = {
  [SupportedChainId.ARBITRUM_ONE]: 25_000_000,
  [SupportedChainId.ARBITRUM_RINKEBY]: 25_000_000,
}

const _EMPTY_CALLSTATES: ReturnType<typeof useSingleContractWithCallData> = []

// TODO: support order splitting
/**
 *
 * Returns the best muffin trade for a desired swap
 * @param tradeType whether the swap is an exact in/out
 * @param amountSpecified the exact amount to swap in/out
 * @param otherCurrency the desired output/payment currency
 */
export function useClientSideMuffinTrade<TTradeType extends TradeType>(
  tradeType: TTradeType,
  amountSpecified: CurrencyAmount<Currency> | undefined,
  otherCurrency: Currency | undefined
): {
  state: V3TradeState
  trade: Trade<Currency, Currency, TTradeType> | null
} {
  const [currencyIn, currencyOut] = useMemo(
    () =>
      tradeType === TradeType.EXACT_INPUT
        ? [amountSpecified?.currency, otherCurrency]
        : [otherCurrency, amountSpecified?.currency],
    [tradeType, amountSpecified, otherCurrency]
  )

  // make a list of swap routes for currencyIn and currencyOut
  const { routes, loading: routesLoading } = useAllMuffinRoutes(currencyIn, currencyOut)

  // fetch quotes from quoter contract
  const { chainId } = useActiveWeb3React()
  const _quotesResults = useSingleContractWithCallData(
    useQuoterContract(),
    useMemo(() => {
      return amountSpecified && routes
        ? routes.map((route) => SwapQuoter.quoteCallParameters(route, amountSpecified, tradeType).calldata)
        : []
    }, [amountSpecified, routes, tradeType]),
    { gasRequired: chainId ? QUOTE_GAS_OVERRIDES[chainId] ?? DEFAULT_GAS_QUOTE : undefined }
  )
  const quotesResults = _quotesResults.length > 0 ? _quotesResults : _EMPTY_CALLSTATES

  return useMemo(() => {
    if (
      !amountSpecified ||
      !currencyIn ||
      !currencyOut ||
      quotesResults.some(({ valid }) => !valid) ||
      // skip when tokens are the same
      (tradeType === TradeType.EXACT_INPUT
        ? amountSpecified.currency.equals(currencyOut)
        : amountSpecified.currency.equals(currencyIn))
    ) {
      return {
        state: V3TradeState.INVALID,
        trade: null,
      }
    }

    if (!routes || routesLoading || quotesResults.some(({ loading }) => loading)) {
      return {
        state: V3TradeState.LOADING,
        trade: null,
      }
    }

    const { bestRoute, amountIn, amountOut } = quotesResults.reduce(
      (currentBest, { result }, i) => {
        if (!result) return currentBest

        const amountIn = CurrencyAmount.fromRawAmount(currencyIn, result.amountIn.toString())
        const amountOut = CurrencyAmount.fromRawAmount(currencyOut, result.amountOut.toString())
        // const gasUsed = result.gasUsed // FIXME: consider gas cost

        if (tradeType === TradeType.EXACT_INPUT) {
          if (currentBest.amountOut === null || JSBI.lessThan(currentBest.amountOut.quotient, amountOut.quotient)) {
            return {
              bestRoute: routes[i],
              amountIn: amountSpecified,
              amountOut,
            }
          }
        } else {
          if (currentBest.amountIn === null || JSBI.greaterThan(currentBest.amountIn.quotient, amountIn.quotient)) {
            return {
              bestRoute: routes[i],
              amountIn,
              amountOut: amountSpecified,
            }
          }
        }

        return currentBest
      },
      {
        bestRoute: null,
        amountIn: null,
        amountOut: null,
      } as {
        bestRoute: Route<Currency, Currency> | null
        amountIn: CurrencyAmount<Currency> | null
        amountOut: CurrencyAmount<Currency> | null
      }
    )

    if (!bestRoute || !amountIn || !amountOut) {
      return {
        state: V3TradeState.NO_ROUTE_FOUND,
        trade: null,
      }
    }

    return {
      state: V3TradeState.VALID,
      trade: Trade.createUncheckedTrade({
        route: bestRoute,
        tradeType,
        inputAmount: amountIn,
        outputAmount: amountOut,
      }),
    }
  }, [amountSpecified, currencyIn, currencyOut, quotesResults, routes, routesLoading, tradeType])
}
