import { Position } from '@muffinfi/muffin-sdk'
import { Currency, CurrencyAmount, Token } from '@uniswap/sdk-core'
import useUSDCPrice from 'hooks/useUSDCPrice'
import { useMemo } from 'react'

import { MuffinPositionDetail } from './usePositions'

type FiatValues = {
  0: CurrencyAmount<Currency>
  1: CurrencyAmount<Currency>
  total: CurrencyAmount<Currency>
}

/**
 * @param token0 Optional. Pre-define token0 to fetch its usdc value first when position is still fetching
 * @param token1 Optional. Pre-define token1 to fetch its usdc value first when position is still fetching
 */
export function usePositionUSDCValue(
  positionDetail: MuffinPositionDetail | undefined,
  position: Position | undefined,
  token0?: Token | undefined,
  token1?: Token | undefined
): {
  fiatValuesOfLiquidity: FiatValues | undefined
  fiatValuesOfFees: FiatValues | undefined
} {
  const price0 = useUSDCPrice(position?.pool.token0 ?? token0)
  const price1 = useUSDCPrice(position?.pool.token1 ?? token1)

  const fiatValuesOfLiquidity = useMemo(() => {
    if (!price0 || !price1 || !position) return undefined

    const value0 = price0.quote(position.amount0)
    const value1 = price1.quote(position.amount1)
    return { 0: value0, 1: value1, total: value0.add(value1) }
  }, [price0, price1, position])

  const fiatValuesOfFees = useMemo(() => {
    if (!price0 || !price1 || !positionDetail) return undefined

    const feeAmount0 = CurrencyAmount.fromRawAmount(price0.baseCurrency, positionDetail.feeAmount0.toString())
    const feeAmount1 = CurrencyAmount.fromRawAmount(price1.baseCurrency, positionDetail.feeAmount1.toString())
    const value0 = price0.quote(feeAmount0)
    const value1 = price1.quote(feeAmount1)
    return { 0: value0, 1: value1, total: value0.add(value1) }
  }, [price0, price1, positionDetail])

  return {
    fiatValuesOfLiquidity,
    fiatValuesOfFees,
  }
}
