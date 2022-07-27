import { BigNumberish } from '@ethersproject/bignumber'
import { Position } from '@muffinfi/muffin-sdk'
import { Token } from '@uniswap/sdk-core'
import useCurrency from 'hooks/useCurrency'
import { useMemo } from 'react'

import { PoolState, useMuffinPool } from './usePools'
import { MuffinPositionDetail, useMuffinPositionDetailFromTokenId } from './usePositions'

export function useDerivedMuffinPosition(positionDetail: MuffinPositionDetail | undefined): {
  token0: Token | undefined
  token1: Token | undefined
  poolState: PoolState
  position: Position | undefined
} {
  const currency0 = useCurrency(positionDetail?.token0) ?? undefined
  const currency1 = useCurrency(positionDetail?.token1) ?? undefined
  const [poolState, pool] = useMuffinPool(currency0, currency1)

  const { tierId, tickLower, tickUpper, liquidityD8, limitOrderType, settlementSnapshotId, settled } =
    positionDetail || {}
  const liquidityD8Str = liquidityD8?.toString()

  const position = useMemo(
    () =>
      pool &&
      tierId !== undefined &&
      tickLower !== undefined &&
      tickUpper !== undefined &&
      liquidityD8Str !== undefined &&
      limitOrderType !== undefined &&
      settlementSnapshotId !== undefined &&
      settled !== undefined
        ? new Position({
            pool,
            tierId,
            tickLower,
            tickUpper,
            liquidityD8: liquidityD8Str,
            limitOrderType,
            settlementSnapshotId,
            settled,
          })
        : undefined,
    [pool, tierId, tickLower, tickUpper, liquidityD8Str, limitOrderType, settlementSnapshotId, settled]
  )

  return {
    token0: currency0?.wrapped,
    token1: currency1?.wrapped,
    poolState,
    position,
  }
}

export function useDerivedMuffinPositionByTokenId(tokenId: BigNumberish | undefined) {
  const { position: positionDetail } = useMuffinPositionDetailFromTokenId(tokenId)
  return useDerivedMuffinPosition(positionDetail)
}
