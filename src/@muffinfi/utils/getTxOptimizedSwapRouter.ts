import { ApprovalState } from 'lib/hooks/useApproval'

export enum SwapRouterVersion {
  V1,
}

/**
 * Returns the swap router that will result in the least amount of txs (less gas) for a given swap.
 */
export function getTxOptimizedSwapRouter({
  tradeHasSplits,
  approvalStates,
}: {
  tradeHasSplits: boolean | undefined
  approvalStates: { v1: ApprovalState }
}): SwapRouterVersion | undefined {
  if (approvalStates.v1 === ApprovalState.PENDING) return undefined
  return SwapRouterVersion.V1
}
