import { Currency } from '@uniswap/sdk-core'
import { useMemo } from 'react'
import { currencyId } from 'utils/currencyId'

import { useUnsupportedCurrenciesById } from './Tokens'

/**
 * Returns true if the currency is unsupported on the site
 */
export function useIsUnsupportedCurrency(currency: Currency | null | undefined): boolean {
  const unsupportedCurrenciesById = useUnsupportedCurrenciesById()
  return useMemo(() => {
    return currency ? Boolean(unsupportedCurrenciesById[currencyId(currency)]) : false
  }, [currency, unsupportedCurrenciesById])
}

/**
 * List out unsupported currencies in the given array of currency
 * Return undefined if not found
 */
export function useHasUnsupportedCurrencies(currencies: Currency[] | undefined) {
  const unsupportedCurrenciesById = useUnsupportedCurrenciesById()
  return useMemo(() => {
    const unsupported = currencies?.filter((currency) => Boolean(unsupportedCurrenciesById[currencyId(currency)]))
    return unsupported && unsupported.length > 0 ? unsupported : undefined
  }, [currencies, unsupportedCurrenciesById])
}
