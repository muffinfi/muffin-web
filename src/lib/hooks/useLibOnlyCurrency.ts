import type { Currency, Token } from '@uniswap/sdk-core'

import useCurrencyFromMap, { useTokenFromMapOrNetwork } from './useCurrencyFromMap'
import { useTokenMap } from './useTokenList'

/**
 * Returns a Currency from the currencyId.
 * Returns null if currency is loading or null was passed.
 * Returns undefined if currencyId is invalid or token does not exist.
 */
export default function useLibOnlyCurrency(currencyId?: string | null): Currency | null | undefined {
  const tokens = useTokenMap()
  return useCurrencyFromMap(tokens, currencyId)
}

/**
 * Returns a Token from the tokenAddress.
 * Returns null if token is loading or null was passed.
 * Returns undefined if tokenAddress is invalid or token does not exist.
 */
export function useLibOnlyToken(tokenAddress?: string | null): Token | null | undefined {
  const tokens = useTokenMap()
  return useTokenFromMapOrNetwork(tokens, tokenAddress)
}
