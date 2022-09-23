import { MuffinPositionDetail } from '@muffinfi/hooks/usePositions'
import { PriceQueryResult, useTokenPrices } from '@muffinfi/hooks/useTokenPrices'
import { Position } from '@muffinfi/muffin-sdk'
import useActiveWeb3React from 'hooks/useActiveWeb3React'
import { useMemoMap } from 'hooks/useMemoMap'
import { useMemoArrayWithEqualCheck } from 'hooks/useMemoWithEqualCheck'
import { atom } from 'jotai'
import { useAtomValue, useUpdateAtom } from 'jotai/utils'
import { useEffect, useMemo } from 'react'
import { currencyAmountToNumber } from 'utils/fractionToNumber'

const tokenPricesAtom = atom<PriceQueryResult>({
  isLoading: false,
  ethPriceUSD: undefined,
  tokenPricesETH: {},
})

const positionValuesAtom = atom<{
  [tokenId: string]: {
    tokenId: string
    token0Symbol: string
    token1Symbol: string
    amount0: number
    amount1: number
    valueETH: number
    valueUSD: number
    missingToken0Value: boolean
    missingToken1Value: boolean
  }
}>({})

/**
 * Fetch token prices and store query result into atom
 */
export const TokenPricesQueryUpdater = ({ positions }: { positions: MuffinPositionDetail[] }) => {
  const { chainId } = useActiveWeb3React()
  const setTokenPrices = useUpdateAtom(tokenPricesAtom)
  const setPositionValues = useUpdateAtom(positionValuesAtom)

  // result states when chain id change
  useEffect(() => {
    setTokenPrices({ isLoading: false, ethPriceUSD: undefined, tokenPricesETH: {} })
    setPositionValues({})
  }, [setTokenPrices, setPositionValues, chainId])

  const addresses = useMemoArrayWithEqualCheck(
    useMemo(() => [...new Set(positions.flatMap((position) => [position.token0, position.token1]))], [positions])
  )
  const { isLoading, ethPriceUSD, tokenPricesETH } = useTokenPrices(addresses ?? undefined)

  useEffect(() => {
    setTokenPrices({ isLoading, ethPriceUSD, tokenPricesETH })
  }, [setTokenPrices, isLoading, ethPriceUSD, tokenPricesETH])

  return null
}

/**
 * Calculate position value, then store the result into atom
 */
export const usePositionValue = (position: Position | undefined, positionDetail: MuffinPositionDetail) => {
  const { isLoading, ethPriceUSD, tokenPricesETH } = useAtomValue(tokenPricesAtom)

  const _result = useMemo(() => {
    if (!position) {
      return {
        tokenId: positionDetail.tokenId.toString(),
        token0Symbol: '',
        token1Symbol: '',
        amount0: 0,
        amount1: 0,
        valueETH: 0,
        valueUSD: 0,
        missingToken0Value: false,
        missingToken1Value: false,
      }
    }

    const amt0 = currencyAmountToNumber(position.amount0)
    const amt1 = currencyAmountToNumber(position.amount1)
    const feeAmt0 = Number(positionDetail.feeAmount0.toString()) / Number(position.amount0.decimalScale.toString())
    const feeAmt1 = Number(positionDetail.feeAmount1.toString()) / Number(position.amount1.decimalScale.toString())

    const value0ETH = (amt0 + feeAmt0) * (tokenPricesETH[position.pool.token0.address] ?? 0)
    const value1ETH = (amt1 + feeAmt1) * (tokenPricesETH[position.pool.token1.address] ?? 0)
    const valueETH = value0ETH + value1ETH
    const valueUSD = valueETH * (ethPriceUSD ?? 0)

    return {
      tokenId: positionDetail.tokenId.toString(),
      token0Symbol: position.pool.token0.symbol ?? '',
      token1Symbol: position.pool.token1.symbol ?? '',
      amount0: amt0 + feeAmt0,
      amount1: amt1 + feeAmt1,
      valueETH,
      valueUSD,
      missingToken0Value: !tokenPricesETH[position.pool.token0.address],
      missingToken1Value: !tokenPricesETH[position.pool.token1.address],
    }
  }, [position, positionDetail, tokenPricesETH, ethPriceUSD])

  const result = useMemoMap(_result)

  const setPositionValues = useUpdateAtom(positionValuesAtom)

  useEffect(() => {
    setPositionValues((state) => ({
      ...state,
      [result.tokenId]: result,
    }))
  }, [setPositionValues, result])

  return { isLoading, ...result }
}

/**
 * Calculate total position value
 */
export const usePositionValues = (positions: MuffinPositionDetail[]) => {
  const { isLoading } = useAtomValue(tokenPricesAtom)
  const positionValues = useAtomValue(positionValuesAtom)

  const result = useMemo(() => {
    let totalValueETH = 0
    let totalValueUSD = 0
    const missingTokens: Set<{ symbol: string; address: string }> = new Set()

    for (const position of positions) {
      const data = positionValues[position.tokenId.toString()]
      if (!data) continue

      totalValueETH += data.valueETH
      totalValueUSD += data.valueUSD

      if (data.missingToken0Value) missingTokens.add({ symbol: data.token0Symbol, address: position.token0 })
      if (data.missingToken1Value) missingTokens.add({ symbol: data.token1Symbol, address: position.token1 })
    }

    return {
      totalValueETH,
      totalValueUSD,
      missingTokens: [...missingTokens],
    }
  }, [positions, positionValues])

  return { isLoading, ...result }
}
