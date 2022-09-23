import { useClientSideMuffinTradeBySimulation } from '@muffinfi/hooks/swap/useClientSideTradeBySimulation'
import { Currency, CurrencyAmount, Price, Token, TradeType } from '@uniswap/sdk-core'
import useActiveWeb3React from 'hooks/useActiveWeb3React'
import tryParseCurrencyAmount from 'lib/utils/tryParseCurrencyAmount'
import { useMemo } from 'react'

import { SupportedChainId } from '../constants/chains'
import { DAI_OPTIMISM, USDC_ARBITRUM, USDC_MAINNET, USDC_POLYGON, USDC_RINKEBY } from '../constants/tokens'

// Stablecoin amounts used when calculating spot price for a given currency.
// The amount is large enough to filter low liquidity pairs.
export const STABLECOIN_AMOUNT_OUT: { [chainId: number]: CurrencyAmount<Token> } = {
  [SupportedChainId.MAINNET]: CurrencyAmount.fromRawAmount(USDC_MAINNET, 1_000e6), // 100_000e6 // TODO: tune higher when we have more liquidity
  [SupportedChainId.ARBITRUM_ONE]: CurrencyAmount.fromRawAmount(USDC_ARBITRUM, 10_000e6),
  [SupportedChainId.OPTIMISM]: CurrencyAmount.fromRawAmount(DAI_OPTIMISM, 10_000e18),
  [SupportedChainId.RINKEBY]: CurrencyAmount.fromRawAmount(USDC_RINKEBY, 1000e6), // 10_000e6),
  [SupportedChainId.POLYGON]: CurrencyAmount.fromRawAmount(USDC_POLYGON, 10_000e6),
}

/**
 * Returns the price in USDC of the input currency.
 * @param currency currency to compute the USDC price of
 *
 * NOTE: it doesn't work when all pool liquidity is too low to fetch the USDC amount out.
 */
export default function useUSDCPrice(currency?: Currency): Price<Currency, Token> | undefined {
  const chainId = currency?.chainId

  const amountOut = chainId ? STABLECOIN_AMOUNT_OUT[chainId] : undefined
  const stablecoin = amountOut?.currency

  // const { trade: usdcTrade } = useClientSideMuffinTrade(TradeType.EXACT_OUTPUT, amountOut, currency)
  // const { price } = useTradeMarginalPrice(usdcTrade)

  const { marginalPrice: price } = useClientSideMuffinTradeBySimulation(TradeType.EXACT_OUTPUT, amountOut, currency)

  return useMemo(() => {
    if (!currency || !stablecoin) {
      return undefined
    }
    if (currency?.wrapped.equals(stablecoin)) {
      return new Price(stablecoin, stablecoin, '1', '1')
    }
    if (!price) {
      return undefined
    }
    return new Price(currency, stablecoin, price.denominator, price.numerator)
  }, [currency, stablecoin, price])
}

export function useUSDCValue(currencyAmount: CurrencyAmount<Currency> | undefined | null) {
  const price = useUSDCPrice(currencyAmount?.currency)

  return useMemo(() => {
    if (!price || !currencyAmount) return null
    try {
      return price.quote(currencyAmount)
    } catch (error) {
      return null
    }
  }, [currencyAmount, price])
}

/**
 *
 * @param fiatValue string representation of a USD amount
 * @returns CurrencyAmount where currency is stablecoin on active chain
 */
export function useStablecoinAmountFromFiatValue(fiatValue: string | null | undefined) {
  const { chainId } = useActiveWeb3React()
  const stablecoin = chainId ? STABLECOIN_AMOUNT_OUT[chainId]?.currency : undefined

  return useMemo(() => {
    if (fiatValue === null || fiatValue === undefined || !chainId || !stablecoin) {
      return undefined
    }

    // trim for decimal precision when parsing
    const parsedForDecimals = parseFloat(fiatValue).toFixed(stablecoin.decimals).toString()
    try {
      // parse USD string into CurrencyAmount based on stablecoin decimals
      return tryParseCurrencyAmount(parsedForDecimals, stablecoin)
    } catch (error) {
      return undefined
    }
  }, [chainId, fiatValue, stablecoin])
}
