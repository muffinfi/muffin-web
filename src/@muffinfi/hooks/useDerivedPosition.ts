import { BigNumberish } from '@ethersproject/bignumber'
import { Position } from '@muffinfi/muffin-v1-sdk'
import { Token } from '@uniswap/sdk-core'
import { useCurrency } from 'hooks/Tokens'
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

  const position = useMemo(
    () =>
      pool && positionDetail
        ? new Position({
            pool,
            tierId: positionDetail.tierId,
            tickLower: positionDetail.tickLower,
            tickUpper: positionDetail.tickUpper,
            liquidityD8: positionDetail.liquidityD8.toString(),
            limitOrderType: positionDetail.limitOrderType,
            settlementSnapshotId: positionDetail.settlementSnapshotId,
            settled: positionDetail.settled,
          })
        : undefined,
    [pool, positionDetail]
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
