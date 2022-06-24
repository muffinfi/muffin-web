import { Currency, CurrencyAmount } from '@uniswap/sdk-core'
import { useUSDCValue } from 'hooks/useUSDCPrice'
import { useMemo } from 'react'
import { computeFiatValuePriceImpact } from 'utils/computeFiatValuePriceImpact'

/**
 * Calculate the percent decrease of the fiat values.
 * NOTE: Be careful. This is not *price impact* !!
 */
export default function useFiatValuePriceImpact(
  inputAmount: CurrencyAmount<Currency> | null | undefined,
  outputAmount: CurrencyAmount<Currency> | null | undefined,
  routeIsSyncing: boolean
) {
  const fiatValueInput = useUSDCValue(inputAmount)
  const fiatValueOutput = useUSDCValue(outputAmount)
  return useMemo(
    () => (routeIsSyncing ? undefined : computeFiatValuePriceImpact(fiatValueInput, fiatValueOutput)),
    [fiatValueInput, fiatValueOutput, routeIsSyncing]
  )
}
