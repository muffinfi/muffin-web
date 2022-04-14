import { ApproveOrPermitState } from 'lib/hooks/useApproveOrPermit'
import { SignatureData } from 'lib/utils/erc20Permit'
import { useCallback, useMemo, useState } from 'react'

export const useTokenApproveOrPermitButtonHandler = () => {
  const [permitSignatures, setPermitSignatures] = useState<{ [buttonId: string]: SignatureData }>({})
  const [approvalStates, setApprovalStates] = useState<{ [buttonId: string]: ApproveOrPermitState }>({})

  const updatePermitSignature = useCallback((signatureData: SignatureData | null, buttonId = 'DEFAULT') => {
    if (signatureData) {
      setPermitSignatures((prev) => {
        if (prev[buttonId] === signatureData) return prev
        return { ...prev, [buttonId]: signatureData }
      })
    } else {
      setPermitSignatures((prev) => {
        if (buttonId in prev) {
          const state = { ...prev }
          delete state[buttonId]
          return state
        }
        return prev
      })
    }
  }, [])

  const updateApprovalStates = useCallback((state: ApproveOrPermitState | null, buttonId = 'DEFAULT') => {
    if (state !== null) {
      setApprovalStates((prev) => {
        if (prev[buttonId] === state) return prev
        return { ...prev, [buttonId]: state }
      })
    } else {
      setApprovalStates((prev) => {
        if (buttonId in prev) {
          const state = { ...prev }
          delete state[buttonId]
          return state
        }
        return prev
      })
    }
  }, [])

  return useMemo(
    () => ({ permitSignatures, updatePermitSignature, approvalStates, updateApprovalStates }),
    [permitSignatures, updatePermitSignature, approvalStates, updateApprovalStates]
  )
}
