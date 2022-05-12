import type { Currency, Token } from '@uniswap/sdk-core'
import useCurrencyFromMap, { useTokenFromMapOrNetwork } from 'lib/hooks/useCurrencyFromMap'

import { useAllTokens } from './Tokens'

/**
 * Returns a Currency from the currencyId.
 * Returns null if currency is loading or null was passed.
 * Returns undefined if currencyId is invalid or token does not exist.
 */
export default function useCurrency(currencyId?: string | null): Currency | null | undefined {
  const tokens = useAllTokens()
  return useCurrencyFromMap(tokens, currencyId)
}

/**
 * Returns a Token from the tokenAddress.
 * Returns null if token is loading or null was passed.
 * Returns undefined if tokenAddress is invalid or token does not exist.
 */
export function useToken(tokenAddress?: string | null): Token | null | undefined {
  const tokens = useAllTokens()
  return useTokenFromMapOrNetwork(tokens, tokenAddress)
}
