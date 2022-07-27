import { Trade } from '@muffinfi/muffin-sdk'
import { getTxOptimizedSwapRouter, SwapRouterVersion } from '@muffinfi/utils/getTxOptimizedSwapRouter'
import { Currency, CurrencyAmount, Percent, Token, TradeType } from '@uniswap/sdk-core'
import { useManagerAddress } from 'hooks/useContractAddress'
import { useERC20PermitFromTrade, UseERC20PermitState } from 'hooks/useERC20Permit'
import useTransactionDeadline from 'lib/hooks/useTransactionDeadline'
import { useCallback, useMemo, useState } from 'react'

import { ApprovalState, useApproval, useApprovalStateForSpender } from '../useApproval'

export { ApprovalState } from '../useApproval'

/** Returns approval state for all known swap routers */
function useSwapApprovalStates(
  trade: Trade<Currency, Currency, TradeType> | undefined,
  allowedSlippage: Percent,
  useIsPendingApproval: (token?: Token, spender?: string) => boolean
): { v1: ApprovalState } {
  const amountToApprove = useMemo(
    () => (trade && trade.inputAmount.currency.isToken ? trade.maximumAmountIn(allowedSlippage) : undefined),
    [trade, allowedSlippage]
  )

  const v1ManagerAddress = useManagerAddress()
  const v1 = useApprovalStateForSpender(amountToApprove, v1ManagerAddress, useIsPendingApproval)

  return useMemo(() => ({ v1 }), [v1])
}

export function useSwapRouterAddress(trade: Trade<Currency, Currency, TradeType> | undefined) {
  return useManagerAddress()
}

// wraps useApproveCallback in the context of a swap
export default function useSwapApproval(
  trade: Trade<Currency, Currency, TradeType> | undefined,
  allowedSlippage: Percent,
  useIsPendingApproval: (token?: Token, spender?: string) => boolean,
  amount?: CurrencyAmount<Currency> // defaults to trade.maximumAmountIn(allowedSlippage)
) {
  const amountToApprove = useMemo(
    () => amount || (trade && trade.inputAmount.currency.isToken ? trade.maximumAmountIn(allowedSlippage) : undefined),
    [amount, trade, allowedSlippage]
  )
  const spender = useSwapRouterAddress(trade)

  const approval = useApproval(amountToApprove, spender, useIsPendingApproval)
  return approval
}

export function useSwapApprovalOptimizedTrade(
  trade: Trade<Currency, Currency, TradeType> | undefined,
  allowedSlippage: Percent,
  useIsPendingApproval: (token?: Token, spender?: string) => boolean
): Trade<Currency, Currency, TradeType> | undefined {
  const tradeHasSplits = (trade?.swaps?.length ?? 0) > 1

  const approvalStates = useSwapApprovalStates(trade, allowedSlippage, useIsPendingApproval)

  const optimizedSwapRouter = useMemo(
    () => getTxOptimizedSwapRouter({ tradeHasSplits, approvalStates }),
    [approvalStates, tradeHasSplits]
  )

  return useMemo(() => {
    if (!trade) return undefined

    try {
      switch (optimizedSwapRouter) {
        case SwapRouterVersion.V1:
          return trade
        default:
          return undefined
      }
    } catch (e) {
      // TODO(#2989): remove try-catch
      console.debug(e)
      return undefined
    }
  }, [trade, optimizedSwapRouter])
}

export enum ApproveOrPermitState {
  REQUIRES_APPROVAL,
  PENDING_APPROVAL,
  REQUIRES_SIGNATURE,
  PENDING_SIGNATURE,
  APPROVED,
}

/**
 * Returns all relevant statuses and callback functions for approvals.
 * Considers both standard approval and ERC20 permit.
 */
export const useApproveOrPermit = (
  trade: Trade<Currency, Currency, TradeType> | undefined,
  allowedSlippage: Percent,
  useIsPendingApproval: (token?: Token, spender?: string) => boolean,
  amount?: CurrencyAmount<Currency> // defaults to trade.maximumAmountIn(allowedSlippage)
) => {
  const deadline = useTransactionDeadline()

  // Check approvals on ERC20 contract based on amount.
  const [approval, getApproval] = useSwapApproval(trade, allowedSlippage, useIsPendingApproval, amount)

  // Check status of permit and whether token supports it.
  const {
    state: signatureState,
    signatureData,
    gatherPermitSignature,
  } = useERC20PermitFromTrade(trade, allowedSlippage, deadline)

  // Track when the interaction is blocked on a wallet so a PENDING state can be returned.
  const [isPendingWallet, setIsPendingWallet] = useState(false)

  // If permit is supported, trigger a signature, if not create approval transaction.
  const handleApproveOrPermit = useCallback(async () => {
    setIsPendingWallet(true)
    try {
      if (signatureState === UseERC20PermitState.NOT_SIGNED && gatherPermitSignature) {
        try {
          return await gatherPermitSignature()
        } catch (error) {
          // Try to approve if gatherPermitSignature failed for any reason other than the user rejecting it.
          if (error?.code !== 4001) {
            return await getApproval()
          }
        }
      } else {
        return await getApproval()
      }
    } catch (e) {
      // Swallow approval errors - user rejections do not need to be displayed.
    } finally {
      setIsPendingWallet(false)
    }
  }, [signatureState, gatherPermitSignature, getApproval])

  const approvalState = useMemo(() => {
    if (approval === ApprovalState.PENDING) {
      return ApproveOrPermitState.PENDING_APPROVAL
    } else if (signatureState === UseERC20PermitState.LOADING) {
      return ApproveOrPermitState.PENDING_SIGNATURE
    } else if (approval !== ApprovalState.NOT_APPROVED || signatureState === UseERC20PermitState.SIGNED) {
      return ApproveOrPermitState.APPROVED
    } else if (gatherPermitSignature) {
      return isPendingWallet ? ApproveOrPermitState.PENDING_SIGNATURE : ApproveOrPermitState.REQUIRES_SIGNATURE
    } else {
      return isPendingWallet ? ApproveOrPermitState.PENDING_APPROVAL : ApproveOrPermitState.REQUIRES_APPROVAL
    }
  }, [approval, gatherPermitSignature, isPendingWallet, signatureState])

  return {
    approvalState,
    signatureData,
    handleApproveOrPermit,
  }
}
