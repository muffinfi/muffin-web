import { MuffinPositionDetail } from '@muffinfi/hooks/usePositions'
import { PriceQueryResult, useTokenPrices } from '@muffinfi/hooks/useTokenPrices'
import useActiveWeb3React from 'hooks/useActiveWeb3React'
import { useToken } from 'hooks/useCurrency'
import { useMemoMap } from 'hooks/useMemoMap'
import { useMemoArrayWithEqualCheck } from 'hooks/useMemoWithEqualCheck'
import { atom } from 'jotai'
import { selectAtom, useAtomValue, useUpdateAtom } from 'jotai/utils'
import { memo, useCallback, useEffect, useMemo } from 'react'
import { PositionDetails } from 'types/position'

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
 * Return the price in ETH for the given token address
 * @param address token's address
 * @returns token price in ETH or `undefined` if not yet found
 */
export const useTokenValueETH = (address: string) => {
  const { tokenPricesETH } = useAtomValue(tokenPricesAtom)
  return tokenPricesETH[address] as number | undefined
}

/**
 * Return the list of price in ETH for the given token addresses
 * @param addresses tokens' addresses
 * @returns token price in ETH or `undefined` if not yet found
 */
export const useTokensValueETH = (addresses: string[]) => {
  const { tokenPricesETH } = useAtomValue(tokenPricesAtom)
  return useMemo(
    () => addresses.map((address) => tokenPricesETH[address] as number | undefined),
    [addresses, tokenPricesETH]
  )
}

/**
 * Return the ETH price in USD
 */
export const useETHPriceUSD = () => {
  const { ethPriceUSD } = useAtomValue(tokenPricesAtom)
  return ethPriceUSD
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
    const missingTokens: Record<string /* address */, { symbol: string; address: string }> = {}

    for (const position of positions) {
      const data = positionValues[position.tokenId.toString()]
      if (!data) continue

      totalValueETH += data.valueETH
      totalValueUSD += data.valueUSD

      if (data.missingToken0Value && !missingTokens[position.token0]) {
        missingTokens[position.token0] = { symbol: data.token0Symbol, address: position.token0 }
      }

      if (data.missingToken1Value && !missingTokens[position.token1]) {
        missingTokens[position.token1] = { symbol: data.token1Symbol, address: position.token1 }
      }
    }

    return {
      totalValueETH,
      totalValueUSD,
      missingTokens: Object.values(missingTokens),
    }
  }, [positions, positionValues])

  return { isLoading, ...result }
}

// --

/**
 * Fetch token prices and store query result into atom
 */
export const TokenPricesUpdater = memo(function TokenPricesUpdater({
  positionDetails,
}: {
  positionDetails: (MuffinPositionDetail | PositionDetails)[]
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
  const { tokenId } = positionDetail
  const tokenIdStr = useMemo(() => tokenId.toString(), [tokenId])

  // load tokens from chain
  const token0 = useToken(positionDetail.token0)
  const token1 = useToken(positionDetail.token1)
  const token0Decimals = token0?.decimals
  const token1Decimals = token1?.decimals

  // compute underlying token amounts
  const [amount0, amount1] = useMemo(() => {
    if (token0Decimals == null || token1Decimals == null) return [undefined, undefined]
    const amt0 = Number(positionDetail.underlyingAmount0.toString()) / 10 ** token0Decimals
    const amt1 = Number(positionDetail.underlyingAmount1.toString()) / 10 ** token1Decimals
    const feeAmt0 = Number(positionDetail.feeAmount0.toString()) / 10 ** token0Decimals
    const feeAmt1 = Number(positionDetail.feeAmount1.toString()) / 10 ** token1Decimals
    return [amt0 + feeAmt0, amt1 + feeAmt1]
  }, [positionDetail, token0Decimals, token1Decimals])

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
