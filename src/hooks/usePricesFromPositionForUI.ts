import { Position } from '@muffinfi/muffin-sdk'
import { Price, Token } from '@uniswap/sdk-core'
import { Position as UniV3Position } from '@uniswap/v3-sdk'
import { useMemo } from 'react'

import { DAI, USDC_MAINNET, USDT, WBTC, WRAPPED_NATIVE_CURRENCY } from '../constants/tokens'

const STABLES_MAINNET = [DAI, USDC_MAINNET, USDT]

/**
 * Get the upper and lower tick prices of the position
 */
export function usePricesFromPositionForUI(
  position: Position | UniV3Position | undefined,
  invert?: boolean
): {
  priceLower?: Price<Token, Token>
  priceUpper?: Price<Token, Token>
  quote?: Token
  base?: Token
} {
  const token0 = position?.amount0.currency
  const token1 = position?.amount1.currency
  const priceLower = position?.token0PriceLower
  const priceUpper = position?.token0PriceUpper

  const prices = useMemo(() => {
    if (!token0 || !token1 || !priceLower || !priceUpper) return {}

    /**
     * Logic:
     * 1. if have stablecoin, stablecoin as quote currency      | ABC-USD
     * 2. else if have ETH or BTC, ETH or BTC as base currency  | ETH-ABC
     * 3. else if both tick prices below 1, invert them
     * 4. otherwise, nothing changed
     */

    // if token0 is a dollar-stable asset, set it as the quote token
    if (STABLES_MAINNET.some((stable) => stable.equals(token0))) {
      return {
        priceLower: priceUpper.invert(), // it means the upper tick's token0 price, denominated in token1
        priceUpper: priceLower.invert(),
        quote: token0,
        base: token1,
      }
    }

    // if token1 is an ETH-/BTC-stable asset, set it as the base token
    const bases = [...Object.values(WRAPPED_NATIVE_CURRENCY), WBTC]
    if (bases.some((base) => base?.equals(token1))) {
      return {
        priceLower: priceUpper.invert(),
        priceUpper: priceLower.invert(),
        quote: token0,
        base: token1,
      }
    }

    // if both prices are below 1, invert
    if (priceUpper.lessThan(1)) {
      return {
        priceLower: priceUpper.invert(),
        priceUpper: priceLower.invert(),
        quote: token0,
        base: token1,
      }
    }

    // otherwise, just return the default
    return {
      priceLower,
      priceUpper,
      quote: token1,
      base: token0,
    }
  }, [priceLower, priceUpper, token0, token1])

  return useMemo(() => {
    return invert
      ? {
          priceUpper: prices.priceLower?.invert(),
          priceLower: prices.priceUpper?.invert(),
          quote: prices.base,
          base: prices.quote,
        }
      : prices
  }, [prices, invert])
}
