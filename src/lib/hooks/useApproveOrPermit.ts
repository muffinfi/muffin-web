import { BigNumber } from '@ethersproject/bignumber'
import { Currency, CurrencyAmount } from '@uniswap/sdk-core'
import { useERC20Permit, UseERC20PermitState } from 'hooks/useERC20Permit'
import { useCallback, useMemo, useState } from 'react'
import { useIsPendingApproval } from './transactions'
import { ApprovalState, useApproval } from './useApproval'

export enum ApproveOrPermitState {
  REQUIRES_APPROVAL,
  PENDING_APPROVAL,
  REQUIRES_SIGNATURE,
  PENDING_SIGNATURE,
  APPROVED,
}

export default function useApproveOrPermit(
  amount: CurrencyAmount<Currency> | undefined,
  spender: string | undefined,
  deadline: BigNumber | undefined
) {
  // Check approvals on ERC20 contract based on amount.
  const [approval, getApproval] = useApproval(amount, spender, useIsPendingApproval)

  // Check status of permit and whether token supports it.
  const {
    state: signatureState,
    signatureData,
    gatherPermitSignature,
  } = useERC20Permit(amount, spender, deadline, null)

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
