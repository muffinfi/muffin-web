import { Currency, CurrencyAmount } from '@uniswap/sdk-core'
import { useUSDCValue } from 'hooks/useUSDCPrice'
import { useMemo } from 'react'
import { computeFiatValuePriceImpact } from 'utils/computeFiatValuePriceImpact'

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
