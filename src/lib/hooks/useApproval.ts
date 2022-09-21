import { Interface } from '@ethersproject/abi'
import { MaxUint256 } from '@ethersproject/constants'
import { TransactionResponse } from '@ethersproject/providers'
import { Currency, CurrencyAmount, Token } from '@uniswap/sdk-core'
import ERC20ABI from 'abis/erc20.json'
import { Erc20Interface } from 'abis/types/Erc20'
import useActiveWeb3React from 'hooks/useActiveWeb3React'
import { useTokenContract } from 'hooks/useContract'
import { useTokenAllowance } from 'hooks/useTokenAllowance'
import { useCallback, useMemo } from 'react'
import { calculateGasMargin } from 'utils/calculateGasMargin'

import { useMultipleContractSingleData } from './multicall'
import { usePendingApprovals } from './transactions'

const ERC20Interface = new Interface(ERC20ABI) as Erc20Interface
const ALLOWANCE_NON_UPDATEABLE_ERC20 = ['0xdAC17F958D2ee523a2206206994597C13D831ec7']

export enum ApprovalState {
  UNKNOWN = 'UNKNOWN',
  NOT_APPROVED = 'NOT_APPROVED',
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
}

export function useMultipleApprovalStateForSpender(
  amountsToApprove: (CurrencyAmount<Currency> | undefined)[],
  spender: string | undefined
): ApprovalState[] {
  const { account } = useActiveWeb3React()

  const tokens = useMemo(
    () =>
      amountsToApprove.map((amountToApprove) =>
        amountToApprove?.currency.isToken ? amountToApprove?.currency : undefined
      ),
    [amountsToApprove]
  )
  const inputs = useMemo(() => [account ?? undefined, spender], [account, spender])
  const addresses = useMemo(() => tokens.map((token) => token?.address), [tokens])

  const allowanceResults = useMultipleContractSingleData(addresses, ERC20Interface, 'allowance', inputs)
  const pendingApprovals = usePendingApprovals(tokens, spender)

  return useMemo(
    () =>
      amountsToApprove.map((amountToApprove, i) => {
        if (!amountToApprove || !spender) return ApprovalState.UNKNOWN
        if (amountToApprove.currency.isNative) return ApprovalState.APPROVED
        const allowanceResult = allowanceResults[i].result
        const currentAllowance =
          amountToApprove.currency && allowanceResult
            ? CurrencyAmount.fromRawAmount(amountToApprove.currency, allowanceResult.toString())
            : undefined
        // we might not have enough data to know whether or not we need to approve
        if (!currentAllowance) return ApprovalState.UNKNOWN

        const pendingApproval = pendingApprovals[i]
        // amountToApprove will be defined if currentAllowance is
        return currentAllowance.lessThan(amountToApprove)
          ? pendingApproval
            ? ApprovalState.PENDING
            : ApprovalState.NOT_APPROVED
          : ApprovalState.APPROVED
      }),
    [allowanceResults, amountsToApprove, pendingApprovals, spender]
  )
}

export function useApprovalStateForSpender(
  amountToApprove: CurrencyAmount<Currency> | undefined,
  spender: string | undefined,
  useIsPendingApproval: (token?: Token, spender?: string) => boolean
): ApprovalState {
  const { account } = useActiveWeb3React()
  const token = amountToApprove?.currency?.isToken ? amountToApprove.currency : undefined

  const currentAllowance = useTokenAllowance(token, account ?? undefined, spender)
  const pendingApproval = useIsPendingApproval(token, spender)

  return useMemo(() => {
    if (!amountToApprove || !spender) return ApprovalState.UNKNOWN
    if (amountToApprove.currency.isNative) return ApprovalState.APPROVED
    // we might not have enough data to know whether or not we need to approve
    if (!currentAllowance) return ApprovalState.UNKNOWN

    // amountToApprove will be defined if currentAllowance is
    return currentAllowance.lessThan(amountToApprove)
      ? pendingApproval
        ? ApprovalState.PENDING
        : ApprovalState.NOT_APPROVED
      : ApprovalState.APPROVED
  }, [amountToApprove, currentAllowance, pendingApproval, spender])
}

export function useApproval(
  amountToApprove: CurrencyAmount<Currency> | undefined,
  spender: string | undefined,
  useIsPendingApproval: (token?: Token, spender?: string) => boolean
): [
  ApprovalState,
  () => Promise<{ response: TransactionResponse; tokenAddress: string; spenderAddress: string } | undefined>
] {
  const { chainId } = useActiveWeb3React()
  const token = amountToApprove?.currency?.isToken ? amountToApprove.currency : undefined

  // check the current approval status
  const approvalState = useApprovalStateForSpender(amountToApprove, spender, useIsPendingApproval)

  const tokenContract = useTokenContract(token?.address)

  const approve = useCallback(async () => {
    function logFailure(error: Error | string): undefined {
      console.warn(`${token?.symbol || 'Token'} approval failed:`, error)
      return
    }

    // Bail early if there is an issue.
    if (approvalState !== ApprovalState.NOT_APPROVED) {
      return logFailure('approve was called unnecessarily')
    } else if (!chainId) {
      return logFailure('no chainId')
    } else if (!token) {
      return logFailure('no token')
    } else if (!tokenContract) {
      return logFailure('tokenContract is null')
    } else if (!amountToApprove) {
      return logFailure('missing amount to approve')
    } else if (!spender) {
      return logFailure('no spender')
    }

    let useExact = false
    let resetZero = false
    const estimatedGas = await tokenContract.estimateGas
      .approve(spender, MaxUint256)
      .catch(() => {
        // general fallback for tokens which restrict approval amounts
        useExact = true
        return tokenContract.estimateGas.approve(spender, amountToApprove.quotient.toString())
      })
      .catch((error) => {
        if (ALLOWANCE_NON_UPDATEABLE_ERC20.includes(token.address)) {
          // USDT need reset to zero before update to a new limit
          resetZero = true
          return tokenContract.estimateGas.approve(spender, 0)
        }
        throw error
      })

    return new Promise<void>((resolve, reject) => {
      const msg = `You have approved Muffin to spend USDT but the allowance is currently not enough. Since ${
        token.symbol ?? 'the token'
      } does not support updating transfer allowance directly, you will first revoke the approval then approve again with a higher limit.`
      if (!resetZero || window.confirm(msg)) {
        resolve()
      } else {
        reject(new Error('User rejected'))
      }
    })
      .then(() =>
        tokenContract.approve(spender, resetZero ? 0 : useExact ? amountToApprove.quotient.toString() : MaxUint256, {
          gasLimit: calculateGasMargin(estimatedGas),
        })
      )
      .then((response) => ({
        response,
        tokenAddress: token.address,
        spenderAddress: spender,
      }))
      .catch((error: Error) => {
        logFailure(error)
        throw error
      })
  }, [approvalState, token, tokenContract, amountToApprove, spender, chainId])

  return [approvalState, approve]
}
