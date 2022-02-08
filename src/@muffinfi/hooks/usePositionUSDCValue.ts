import { Position } from '@muffinfi/muffin-v1-sdk'
import { Currency, CurrencyAmount, Token } from '@uniswap/sdk-core'
import useUSDCPrice from 'hooks/useUSDCPrice'
import { useMemo } from 'react'
import { MuffinPositionDetail } from './usePositions'

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
  fiatValueOfLiquidity: CurrencyAmount<Currency> | null
  fiatValueOfFees: CurrencyAmount<Currency> | null
} {
  const price0 = useUSDCPrice(position?.pool.token0 ?? token0)
  const price1 = useUSDCPrice(position?.pool.token1 ?? token1)

  const fiatValueOfLiquidity = useMemo(() => {
    if (!price0 || !price1 || !position) return null

    const value0 = price0.quote(position.amount0)
    const value1 = price1.quote(position.amount1)
    return value0.add(value1)
  }, [price0, price1, position])

  const fiatValueOfFees = useMemo(() => {
    if (!price0 || !price1 || !positionDetail) return null

    const feeAmount0 = CurrencyAmount.fromRawAmount(price0.baseCurrency, positionDetail.feeAmount0.toString())
    const feeAmount1 = CurrencyAmount.fromRawAmount(price1.baseCurrency, positionDetail.feeAmount1.toString())
    const value0 = price0.quote(feeAmount0)
    const value1 = price1.quote(feeAmount1)
    return value0.add(value1)
  }, [price0, price1, positionDetail])

  return {
    fiatValueOfLiquidity,
    fiatValueOfFees,
  }
}
