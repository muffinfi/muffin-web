import { useMuffinPool } from '@muffinfi/hooks/usePools'
import { MuffinPositionDetail } from '@muffinfi/hooks/usePositions'
import { PriceQueryResult, useTokenPrices } from '@muffinfi/hooks/useTokenPrices'
import { Position } from '@muffinfi/muffin-sdk'
import useActiveWeb3React from 'hooks/useActiveWeb3React'
import { useToken } from 'hooks/useCurrency'
import { useMemoMap } from 'hooks/useMemoMap'
import { useMemoArrayWithEqualCheck } from 'hooks/useMemoWithEqualCheck'
import { atom } from 'jotai'
import { selectAtom, useAtomValue, useUpdateAtom } from 'jotai/utils'
import { memo, useCallback, useEffect, useMemo } from 'react'
import { currencyAmountToNumber } from 'utils/fractionToNumber'

const tokenPricesAtom = atom<PriceQueryResult>({
  isLoading: false,
  ethPriceUSD: undefined,
  tokenPricesETH: {},
})

type PositionValue = {
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
type PositionValuesAtom = { [tokenId: string]: PositionValue | undefined }
const positionValuesAtom = atom<PositionValuesAtom>({})

const initialPositionValue: PositionValue = {
  tokenId: '',
  token0Symbol: '',
  token1Symbol: '',
  amount0: 0,
  amount1: 0,
  valueETH: 0,
  valueUSD: 0,
  missingToken0Value: false,
  missingToken1Value: false,
}

/**
 * Return the value of the given position
 */
export const usePositionValue = (tokenId: string): { isLoading: boolean } & PositionValue => {
  const { isLoading } = useAtomValue(tokenPricesAtom)
  const getter = useCallback((state: PositionValuesAtom) => state[tokenId], [tokenId])
  const state = useAtomValue(selectAtom(positionValuesAtom, getter))
  return {
    isLoading,
    ...(state ?? { ...initialPositionValue, tokenId }),
  }
}

/**
 * Calculate combined position value of the given positions
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

// --

/**
 * Fetch token prices and store query result into atom
 */
const TokenPricesUpdater = memo(function TokenPricesUpdater({
  positionDetails,
}: {
  positionDetails: MuffinPositionDetail[]
}) {
  const { chainId } = useActiveWeb3React()
  const setTokenPrices = useUpdateAtom(tokenPricesAtom)
  const setPositionValues = useUpdateAtom(positionValuesAtom)

  // reset states when chain id changes
  useEffect(() => {
    setTokenPrices({ isLoading: false, ethPriceUSD: undefined, tokenPricesETH: {} })
    setPositionValues({})
  }, [setTokenPrices, setPositionValues, chainId])

  const addresses = useMemoArrayWithEqualCheck(
    useMemo(
      () => [...new Set(positionDetails.flatMap((position) => [position.token0, position.token1]))],
      [positionDetails]
    )
  )
  const { isLoading, ethPriceUSD, tokenPricesETH } = useTokenPrices(addresses ?? undefined)

  useEffect(() => {
    setTokenPrices({ isLoading, ethPriceUSD, tokenPricesETH })
  }, [setTokenPrices, isLoading, ethPriceUSD, tokenPricesETH])

  return null
})

/**
 * Compute position value and store into atom
 */
const PositionValueUpdater = memo(function PositionValueUpdater({
  positionDetail,
}: {
  positionDetail: MuffinPositionDetail
}) {
  const {
    tokenId,
    token0: token0Address,
    token1: token1Address,
    tierId,
    liquidityD8,
    tickLower,
    tickUpper,
    limitOrderType,
    settlementSnapshotId,
    settled,
    feeAmount0,
    feeAmount1,
  } = positionDetail
  const tokenIdStr = useMemo(() => tokenId.toString(), [tokenId])
  const liquidityD8Str = useMemo(() => liquidityD8.toString(), [liquidityD8])
  const feeAmt0Str = useMemo(() => feeAmount0.toString(), [feeAmount0])
  const feeAmt1Str = useMemo(() => feeAmount1.toString(), [feeAmount1])

  // load tokens and pool from chain
  const token0 = useToken(token0Address)
  const token1 = useToken(token1Address)
  const [, pool] = useMuffinPool(token0 ?? undefined, token1 ?? undefined)

  // compute underlying token amounts
  const [amount0, amount1] = useMemo(() => {
    if (!pool) return [undefined, undefined]
    const position = new Position({
      pool,
      tierId,
      tickLower,
      tickUpper,
      liquidityD8: liquidityD8Str,
      limitOrderType,
      settlementSnapshotId,
      settled,
    })
    const amt0 = currencyAmountToNumber(position.amount0)
    const amt1 = currencyAmountToNumber(position.amount1)
    const feeAmt0 = Number(feeAmt0Str) / 10 ** pool.token0.decimals
    const feeAmt1 = Number(feeAmt1Str) / 10 ** pool.token1.decimals
    return [amt0 + feeAmt0, amt1 + feeAmt1]
  }, [
    liquidityD8Str,
    pool,
    tickLower,
    tickUpper,
    tierId,
    limitOrderType,
    settlementSnapshotId,
    settled,
    feeAmt0Str,
    feeAmt1Str,
  ])

  // load token prices
  const { ethPriceUSD, tokenPricesETH } = useAtomValue(tokenPricesAtom)
  const token0PriceETH = token0 ? tokenPricesETH[token0.address] : undefined
  const token1PriceETH = token1 ? tokenPricesETH[token1.address] : undefined

  // construct state for this position value
  const result = useMemoMap(
    useMemo(() => {
      if (!token0 || !token1 || amount0 == null || amount1 == null) {
        return { ...initialPositionValue, tokenId: tokenIdStr }
      }
      const value0ETH = amount0 * (token0PriceETH ?? 0)
      const value1ETH = amount1 * (token1PriceETH ?? 0)
      const valueETH = value0ETH + value1ETH
      const valueUSD = valueETH * (ethPriceUSD ?? 0)
      return {
        tokenId: tokenIdStr,
        token0Symbol: token0.symbol ?? '',
        token1Symbol: token1.symbol ?? '',
        amount0,
        amount1,
        valueETH,
        valueUSD,
        missingToken0Value: token0PriceETH == null,
        missingToken1Value: token1PriceETH == null,
      }
    }, [amount0, amount1, token0, token1, tokenIdStr, token0PriceETH, token1PriceETH, ethPriceUSD])
  )

  // update state
  const setPositionValues = useUpdateAtom(positionValuesAtom)
  useEffect(() => {
    setPositionValues((state) => ({ ...state, [result.tokenId]: result }))
  }, [setPositionValues, result])

  return null
})

/**
 * Compute all position values and store into atom
 */
export const PositionValuesUpdater = memo(function PositionValuesUpdater({
  positionDetails,
}: {
  positionDetails: MuffinPositionDetail[]
}) {
  return (
    <>
      <TokenPricesUpdater positionDetails={positionDetails} />
      {positionDetails.map((p) => (
        <PositionValueUpdater key={p.tokenId.toString()} positionDetail={p} />
      ))}
    </>
  )
})
