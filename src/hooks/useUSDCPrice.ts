import { useClientSideMuffinTrade } from '@muffinfi/hooks/swap/useClientSideTrade'
import { Currency, CurrencyAmount, Price, Token, TradeType } from '@uniswap/sdk-core'
import { useMemo } from 'react'
import { SupportedChainId } from '../constants/chains'
import { DAI_OPTIMISM, USDC, USDC_ARBITRUM, USDC_RINKEBY } from '../constants/tokens'
import { useActiveWeb3React } from './web3'

// Stablecoin amounts used when calculating spot price for a given currency.
// The amount is large enough to filter low liquidity pairs.
const STABLECOIN_AMOUNT_OUT: { [chainId: number]: CurrencyAmount<Token> } = {
  [SupportedChainId.MAINNET]: CurrencyAmount.fromRawAmount(USDC, 100_000e6),
  [SupportedChainId.ARBITRUM_ONE]: CurrencyAmount.fromRawAmount(USDC_ARBITRUM, 10_000e6),
  [SupportedChainId.OPTIMISM]: CurrencyAmount.fromRawAmount(DAI_OPTIMISM, 10_000e18),
  [SupportedChainId.RINKEBY]: CurrencyAmount.fromRawAmount(USDC_RINKEBY, 10_000e18),
}

/**
 * Returns the price in USDC of the input currency.
 * @param currency currency to compute the USDC price of
 *
 * NOTE: it doesn't work when all pool liquidity is too low to fetch the USDC amount out.
 */
export default function useUSDCPrice(currency?: Currency): Price<Currency, Token> | undefined {
  const { chainId } = useActiveWeb3React()

  const amountOut = chainId ? STABLECOIN_AMOUNT_OUT[chainId] : undefined
  const stablecoin = amountOut?.currency

  const { trade: usdcTrade } = useClientSideMuffinTrade(TradeType.EXACT_OUTPUT, amountOut, currency)

  return useMemo(() => {
    if (!currency || !stablecoin) {
      return undefined
    }
    if (currency?.wrapped.equals(stablecoin)) {
      return new Price(stablecoin, stablecoin, '1', '1')
    }
    if (!usdcTrade) {
      return undefined
    }

    const price = usdcTrade.swaps[0].route.impreciseMidPrice
    return new Price(currency, stablecoin, price.denominator, price.numerator)
  }, [currency, stablecoin, usdcTrade])
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
