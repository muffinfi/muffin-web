import { useSingleCallResult } from 'lib/hooks/multicall'

import { useHubContract } from './useContract'

export const usePoolDefaultParameters = () => {
  const hubContract = useHubContract()
  const state = useSingleCallResult(hubContract, 'getDefaultParameters')

  const result = state.result
  return [result?.tickSpacing, result?.protocolFee] as [number | undefined, number | undefined]
}
