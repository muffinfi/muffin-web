import { Pool } from '@muffinfi/muffin-v1-sdk'
import { IMuffinHubCombined } from '@muffinfi/typechain'
import { CallState } from '@uniswap/redux-multicall'
import { Currency } from '@uniswap/sdk-core'
import { defaultAbiCoder, keccak256 } from 'ethers/lib/utils'
import useActiveWeb3React from 'hooks/useActiveWeb3React'
import useMemoWithEqualCheck, { EQUALS_CHECK, useMemoArrayWithEqualCheck } from 'hooks/useMemoWithEqualCheck'
import { useSingleCallResult, useSingleContractMultipleData, useSingleContractWithCallData } from 'lib/hooks/multicall'
import { useMemo } from 'react'
import type { Optional } from 'types/optional'

import { useHubContract } from './useContract'

export enum PoolState {
  LOADING,
  NOT_EXISTS,
  EXISTS,
  INVALID,
}

export const useMuffinPool = (
  currencyA: Currency | undefined,
  currencyB: Currency | undefined
): [PoolState, Pool | null] => {
  const { chainId } = useActiveWeb3React()

  // sort tokens and compute pool id
  const { token0, token1, poolId } = useMemo(() => {
    const tokenA = currencyA?.wrapped
    const tokenB = currencyB?.wrapped
    if (!chainId || !tokenA || !tokenB) return {}
    const [token0, token1] = tokenA.sortsBefore(tokenB) ? [tokenA, tokenB] : [tokenB, tokenA]
    const poolId = keccak256(defaultAbiCoder.encode(['address', 'address'], [token0.address, token1.address]))
    return { token0, token1, poolId }
  }, [chainId, currencyA, currencyB])

  // compute calldata
  const hubContract = useHubContract()
  const calldatas = useMemo(() => {
    if (hubContract == null || poolId == null) return []
    return [
      hubContract.interface.encodeFunctionData('getPoolParameters', [poolId]),
      hubContract.interface.encodeFunctionData('getAllTiers', [poolId]),
    ]
  }, [hubContract, poolId])

  // fetch data from chain
  const [poolParams, tiersData]: (CallState | undefined)[] = useSingleContractWithCallData(hubContract, calldatas)

  // return pool
  const [poolState, pool] = useMemo(() => {
    if (!token0 || !token1 || !poolParams || !tiersData) return [PoolState.INVALID, null]
    if (!poolParams.valid || !tiersData.valid) return [PoolState.INVALID, null]
    if (poolParams.loading || tiersData.loading) return [PoolState.LOADING, null]

    const [_poolParams, _tiersData] = [poolParams.result, tiersData.result]
    if (!_poolParams || !_tiersData || _poolParams.tickSpacing === 0) return [PoolState.NOT_EXISTS, null]

    try {
      const pool = Pool.fromChainData(token0, token1, _poolParams.tickSpacing, _tiersData[0])
      return [PoolState.EXISTS, pool]
    } catch (error) {
      console.error('Error when constructing the pool', error)
      return [PoolState.NOT_EXISTS, null]
    }
  }, [token0, token1, poolParams, tiersData])

  // memoize pool
  return [poolState, useMemoWithEqualCheck(pool, EQUALS_CHECK) ?? null]
}

/////////////

export const useMuffinPools = (
  currencyPairs: [Currency | undefined, Currency | undefined][]
): [PoolState, Pool | null][] => {
  const { chainId } = useActiveWeb3React()

  const pairs = useMemo(() => {
    return currencyPairs.map(([currencyA, currencyB]) => {
      if (!chainId || !currencyA || !currencyB) return null

      // if it is ETH, wrap it into WETH
      const tokenA = currencyA?.wrapped
      const tokenB = currencyB?.wrapped
      if (!tokenA || !tokenB || tokenA.equals(tokenB)) return null

      const [token0, token1] = tokenA.sortsBefore(tokenB) ? [tokenA, tokenB] : [tokenB, tokenA]
      const poolId = keccak256(defaultAbiCoder.encode(['address', 'address'], [token0.address, token1.address]))
      return { token0, token1, poolId }
    })
  }, [chainId, currencyPairs])

  const hubContract = useHubContract()
  const poolIds = useMemo(() => pairs.map((pair) => [pair?.poolId]), [pairs])

  type NullableCalldata = CallState | undefined
  const poolParamsList: NullableCalldata[] = useSingleContractMultipleData(hubContract, 'getPoolParameters', poolIds)
  const tiersDataList: NullableCalldata[] = useSingleContractMultipleData(hubContract, 'getAllTiers', poolIds)

  return useMemo(() => {
    return pairs.map((pair, i) => {
      const { token0, token1, poolId } = pair || {}
      const poolParamsState = poolParamsList[i]
      const tiersDataState = tiersDataList[i]

      if (!token0 || !token1 || !poolId || !poolParamsState || !tiersDataState) return [PoolState.INVALID, null]
      if (!poolParamsState.valid || !tiersDataState.valid) return [PoolState.INVALID, null]
      if (poolParamsState.loading || tiersDataState.loading) return [PoolState.LOADING, null]

      const poolParams = poolParamsState.result
      const tiersData = tiersDataState.result
      if (!poolParams || !tiersData) return [PoolState.NOT_EXISTS, null]
      if (poolParams.tickSpacing === 0) return [PoolState.NOT_EXISTS, null]

      try {
        const pool = Pool.fromChainData(token0, token1, poolParams.tickSpacing, tiersData[0])
        return [PoolState.EXISTS, pool]
      } catch (error) {
        console.error('Error when constructing the pool', error)
        return [PoolState.NOT_EXISTS, null]
      }
    })
  }, [pairs, poolParamsList, tiersDataList])
}

export const useLimitOrderTickSpacingMultipliers = (
  hubContract: Optional<IMuffinHubCombined>,
  pool: Optional<Pool>
) => {
  const calldata = useMemo(() => (pool ? [pool.poolId] : undefined), [pool])

  const state = useSingleCallResult(calldata ? hubContract : undefined, 'getLimitOrderTickSpacingMultipliers', calldata)
  return useMemoArrayWithEqualCheck(
    state.result?.[0] as Awaited<ReturnType<IMuffinHubCombined['getLimitOrderTickSpacingMultipliers']>> | undefined
  )
}
