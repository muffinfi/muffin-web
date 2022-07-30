import { Currency } from '@uniswap/sdk-core'
import { useMemo } from 'react'
import { currencyId } from 'utils/currencyId'

import { useUnsupportedCurrenciesById } from './Tokens'

/**
 * Returns true if the input currency or output currency cannot be traded in the interface
 * @param currencyIn the input currency to check
 * @param currencyOut the output currency to check
 */
export function useIsSwapUnsupported(currencyIn?: Currency | null, currencyOut?: Currency | null): boolean {
  const unsupportedCurrenciesById = useUnsupportedCurrenciesById()
  return useMemo(() => {
    if (!unsupportedCurrenciesById) {
      return false
    }
    const currencyInUnsupported = currencyIn ? Boolean(unsupportedCurrenciesById[currencyId(currencyIn)]) : false
    const currencyOutUnsupported = currencyOut ? Boolean(unsupportedCurrenciesById[currencyId(currencyOut)]) : false
    return currencyInUnsupported || currencyOutUnsupported
  }, [currencyIn, currencyOut, unsupportedCurrenciesById])
}
