import { CallState } from '@uniswap/redux-multicall'
import { Currency } from '@uniswap/sdk-core'
import { useSingleContractWithCallData } from 'lib/hooks/multicall'
import { useMemo } from 'react'

import { useHubContract } from './useContract'
import { useMuffinPoolId } from './usePools'

export enum FeeTierOptionsFetchState {
  INVALID,
  LOADING,
  LOADED,
}

export const useFeeTierOptions = (
  currencyA: Currency | undefined,
  currencyB: Currency | undefined
): [FeeTierOptionsFetchState, number[] | undefined] => {
  const hubContract = useHubContract()

  const { poolId } = useMuffinPoolId(currencyA, currencyB)

  const calldatas = useMemo(() => {
    if (hubContract == null || poolId == null) return []
    return [
      hubContract.interface.encodeFunctionData('getDefaultAllowedSqrtGammas'),
      hubContract.interface.encodeFunctionData('getPoolAllowedSqrtGammas', [poolId]),
    ]
  }, [hubContract, poolId])

  const [defaultAllowed, poolAllowed]: (CallState | undefined)[] = useSingleContractWithCallData(hubContract, calldatas)

  const [state, resultStr] = useMemo(() => {
    if (!defaultAllowed || !poolAllowed) {
      return [FeeTierOptionsFetchState.INVALID, undefined]
    }
    if (defaultAllowed.loading || poolAllowed.loading) {
      return [FeeTierOptionsFetchState.LOADING, undefined]
    }
    if (!defaultAllowed.valid || !poolAllowed.valid) {
      return [FeeTierOptionsFetchState.INVALID, undefined]
    }
    if (!defaultAllowed.result || !poolAllowed.result) {
      return [FeeTierOptionsFetchState.INVALID, undefined]
    }

    const result = poolAllowed.result[0].length > 0 ? poolAllowed.result[0] : defaultAllowed.result[0]
    return [FeeTierOptionsFetchState.LOADED, JSON.stringify(result)]
  }, [defaultAllowed, poolAllowed])

  const result = useMemo(() => (resultStr ? JSON.parse(resultStr) : resultStr), [resultStr])

  return [state, result]
}
