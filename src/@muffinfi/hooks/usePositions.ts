import { BigNumber, BigNumberish } from '@ethersproject/bignumber'
import { ADDRESS_ZERO, LimitOrderType } from '@muffinfi/muffin-v1-sdk'
import type { ILens } from '@muffinfi/typechain'
import { skipToken } from '@reduxjs/toolkit/query/react'
import { useSingleContractMultipleData } from 'lib/hooks/multicall'
import ms from 'ms.macro'
import { useMemo } from 'react'
import { usePositionTokenIdsQuery } from 'state/data/enhanced'
import { PositionTokenIdsQuery } from 'state/data/generated'
import { useLensContract } from './useContract'

export interface MuffinPositionDetail {
  tokenId: BigNumber
  owner: string
  token0: string
  token1: string
  tierId: number
  tickLower: number
  tickUpper: number
  liquidityD8: BigNumber
  feeGrowthInside0LastX64: BigNumber
  feeGrowthInside1LastX64: BigNumber
  limitOrderType: LimitOrderType
  settlementSnapshotId: number
  settled: boolean
  underlyingAmount0: BigNumber
  underlyingAmount1: BigNumber
  feeAmount0: BigNumber
  feeAmount1: BigNumber
  nonce: BigNumber
  operator: string
}

export function useMuffinPositionDetailsFromTokenIds(tokenIds: BigNumberish[] | undefined): {
  loading: boolean
  positions: MuffinPositionDetail[] | undefined
} {
  const lensContract = useLensContract()

  const _tokenIds = useMemo(() => (tokenIds ? tokenIds.map((tokenId) => [BigNumber.from(tokenId)]) : []), [tokenIds])
  const results = useSingleContractMultipleData(lensContract, 'getDerivedPosition', _tokenIds)

  const loading = useMemo(() => [...results].some(({ loading }) => loading), [results])
  const error = useMemo(() => [...results].some(({ error }) => error), [results])

  const positions = useMemo(() => {
    if (loading || error) return undefined
    return results.map((call, i) => {
      const result = call.result as Awaited<ReturnType<ILens['getDerivedPosition']>>
      const [info, position] = result
      return {
        tokenId: _tokenIds[i][0],
        owner: info.owner,
        token0: info.token0,
        token1: info.token1,
        tierId: info.tierId,
        tickLower: info.tickLower,
        tickUpper: info.tickUpper,
        liquidityD8: position.liquidityD8,
        feeGrowthInside0LastX64: position.feeGrowthInside0Last,
        feeGrowthInside1LastX64: position.feeGrowthInside1Last,
        limitOrderType: position.limitOrderType,
        settlementSnapshotId: position.settlementSnapshotId,
        settled: result.settled,
        underlyingAmount0: result.amount0, // FIXME: seems actually sdk can calculate this. Remove this from lens contract?
        underlyingAmount1: result.amount1, // FIXME: seems actually sdk can calculate this. Remove this from lens contract?
        feeAmount0: result.feeAmount0,
        feeAmount1: result.feeAmount1,
        nonce: BigNumber.from(0), // FIXME:
        operator: ADDRESS_ZERO, // FIXME:
      }
    })
  }, [loading, error, results, _tokenIds])

  return { loading, positions }
}

export function useMuffinPositionDetailFromTokenId(tokenId: BigNumberish | undefined) {
  const tokenIds = useMemo(() => (tokenId ? [tokenId] : undefined), [tokenId])
  const result = useMuffinPositionDetailsFromTokenIds(tokenIds)
  return {
    loading: result.loading,
    position: result.positions?.[0],
  }
}

export function useMuffinPositionTokenIds(account: string | null | undefined) {
  const { isLoading, data } = usePositionTokenIdsQuery(account ? { owner: account, skip: 0 } : skipToken, {
    pollingInterval: ms`30s`,
  })

  const queryData = data as PositionTokenIdsQuery | undefined

  return useMemo(
    () => ({
      isLoading,
      subgraphBlockNumber: queryData?._meta?.block.number,
      tokenIds: queryData?.positions.map((position) => position.tokenId),
    }),
    [isLoading, queryData]
  )
}

export function useMuffinPositionDetails(account: string | null | undefined) {
  const { isLoading, tokenIds, subgraphBlockNumber } = useMuffinPositionTokenIds(account)
  const { positions, loading: positionsLoading } = useMuffinPositionDetailsFromTokenIds(tokenIds)
  return {
    loading: isLoading || positionsLoading,
    subgraphBlockNumber,
    positions,
  }
}
