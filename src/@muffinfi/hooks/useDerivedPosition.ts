import { BigNumberish } from '@ethersproject/bignumber'
import { Pool, Position } from '@muffinfi/muffin-v1-sdk'
import { useCurrency } from 'hooks/Tokens'
import { useMuffinPool } from './usePools'
import { MuffinPositionDetail, useMuffinPositionDetailFromTokenId } from './usePositions'

export function useDerivedMuffinPosition(positionDetail: MuffinPositionDetail | undefined): {
  position: Position | undefined
  pool: Pool | undefined
} {
  const currency0 = useCurrency(positionDetail?.token0) ?? undefined
  const currency1 = useCurrency(positionDetail?.token1) ?? undefined
  const [, pool] = useMuffinPool(currency0, currency1)

  const position =
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
      : undefined

  return {
    position,
    pool: pool ?? undefined,
  }
}

export function useDerivedMuffinPositionByTokenId(tokenId: BigNumberish | undefined) {
  const { position: positionDetail } = useMuffinPositionDetailFromTokenId(tokenId)
  return useDerivedMuffinPosition(positionDetail)
}
