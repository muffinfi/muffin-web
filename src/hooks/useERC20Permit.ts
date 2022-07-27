import { BigNumber } from '@ethersproject/bignumber'
import { splitSignature } from '@ethersproject/bytes'
import { PermitOptions, SelfPermit, Trade } from '@muffinfi/muffin-sdk'
import { Currency, CurrencyAmount, Percent, TradeType } from '@uniswap/sdk-core'
import useActiveWeb3React from 'hooks/useActiveWeb3React'
import JSBI from 'jsbi'
import { NEVER_RELOAD, useSingleCallResult } from 'lib/hooks/multicall'
import {
  generateObjectToSign,
  getPermitInfo,
  PermitInfo,
  SignatureData,
  signatureDataToPermitOptions,
} from 'lib/utils/erc20Permit'
import { useEffect, useMemo, useState } from 'react'

import { useEIP2612Contract } from './useContract'
import { useManagerAddress } from './useContractAddress'
import useIsArgentWallet from './useIsArgentWallet'
import usePreviousExclude, { EXCLUDE_NULL_OR_UNDEFINED } from './usePreviousExclude'

// 20 minutes to submit after signing
const PERMIT_VALIDITY_BUFFER = 20 * 60

export enum UseERC20PermitState {
  // returned for any reason, e.g. it is an argent wallet, or the currency does not support it
  NOT_APPLICABLE,
  LOADING,
  NOT_SIGNED,
  SIGNED,
  SIGNED_NOT_APPLICABLE, // we tried to sign and permit but failed
}

enum CheckDomainState {
  NOT_CHECK,
  CHECKING,
  CHECKED,
}

export function useERC20Permit(
  currencyAmount: CurrencyAmount<Currency> | null | undefined,
  spender: string | null | undefined,
  transactionDeadline: BigNumber | undefined,
  overridePermitInfo: PermitInfo | undefined | null
): {
  signatureData: SignatureData | null
  state: UseERC20PermitState
  gatherPermitSignature: null | (() => Promise<void>)
} {
  const { account, chainId, library } = useActiveWeb3React()
  const tokenAddress = currencyAmount?.currency?.isToken ? currencyAmount.currency.address : undefined
  const prevTokenAddress = usePreviousExclude(tokenAddress, EXCLUDE_NULL_OR_UNDEFINED)

  const eip2612Contract = useEIP2612Contract(tokenAddress)
  const managerAddress = useManagerAddress()
  const isArgentWallet = useIsArgentWallet()

  // NOTE: fetch nonce from chain. invalid result = token no support permit
  const nonceInputs = useMemo(() => [account ?? undefined], [account])
  const tokenNonceState = useSingleCallResult(eip2612Contract, 'nonces', nonceInputs)
  const domainSeparatorState = useSingleCallResult(eip2612Contract, 'DOMAIN_SEPARATOR', undefined, NEVER_RELOAD)

  const [signatureData, setSignatureData] = useState<SignatureData | null>(null)
  const [checkedState, setCheckedState] = useState(CheckDomainState.NOT_CHECK)
  const [forceNotApplicable, setForceNotApplicable] = useState(false)

  const domainSeparator = domainSeparatorState.result?.[0] as string | undefined
  const permitInfo = useMemo(
    () =>
      overridePermitInfo ||
      getPermitInfo(
        {
          name: currencyAmount?.currency?.isToken ? currencyAmount.currency.name : undefined,
          chainId,
          verifyingContract: tokenAddress,
        },
        domainSeparator
      ),
    [
      chainId,
      currencyAmount?.currency?.isToken,
      currencyAmount?.currency?.name,
      domainSeparator,
      overridePermitInfo,
      tokenAddress,
    ]
  )

  const nonceNumber = tokenNonceState.result?.[0]?.toNumber()
  const isSignatureDataValid = Boolean(
    currencyAmount &&
      transactionDeadline &&
      signatureData &&
      signatureData.owner === account &&
      signatureData.deadline >= transactionDeadline.toNumber() &&
      signatureData.tokenAddress === tokenAddress &&
      signatureData.nonce === nonceNumber &&
      signatureData.spender === spender &&
      ('allowed' in signatureData ||
        JSBI.greaterThanOrEqual(JSBI.BigInt(signatureData.amount), currencyAmount.quotient))
  )

  // Fallback to not applicable if the signature cannot pass SelfPermit
  useEffect(() => {
    if (
      forceNotApplicable ||
      !managerAddress ||
      !library ||
      !currencyAmount?.currency?.isToken ||
      !signatureData ||
      !isSignatureDataValid ||
      !permitInfo?.isEstimated ||
      checkedState === CheckDomainState.CHECKED
    ) {
      return
    }
    setCheckedState(CheckDomainState.CHECKING)
    let ignore = false
    const data = SelfPermit.encodePermit(
      currencyAmount.currency,
      signatureDataToPermitOptions(signatureData) as PermitOptions
    )
    library
      .getSigner()
      .estimateGas({ to: managerAddress, data })
      .catch(() => ignore || setForceNotApplicable(true))
      .finally(() => ignore || setCheckedState(CheckDomainState.CHECKED))
    return () => {
      ignore = true
    }
  }, [
    forceNotApplicable,
    managerAddress,
    checkedState,
    currencyAmount?.currency,
    isSignatureDataValid,
    library,
    permitInfo?.isEstimated,
    signatureData,
    tokenAddress,
  ])

  // reset checking if currency changed
  useEffect(() => {
    if (prevTokenAddress === tokenAddress || !tokenAddress) return
    setForceNotApplicable(false)
    setCheckedState(CheckDomainState.NOT_CHECK)
  }, [prevTokenAddress, tokenAddress])

  return useMemo(() => {
    if (forceNotApplicable) {
      return {
        state: UseERC20PermitState.SIGNED_NOT_APPLICABLE,
        signatureData: null,
        gatherPermitSignature: null,
      }
    }

    if (
      isArgentWallet ||
      !currencyAmount ||
      !eip2612Contract ||
      !account ||
      !chainId ||
      !transactionDeadline ||
      !library ||
      !tokenNonceState.valid ||
      !tokenAddress ||
      !spender ||
      !permitInfo
    ) {
      return {
        state: UseERC20PermitState.NOT_APPLICABLE,
        signatureData: null,
        gatherPermitSignature: null,
      }
    }

    if (
      tokenNonceState.loading ||
      typeof nonceNumber !== 'number' ||
      domainSeparatorState.loading ||
      checkedState === CheckDomainState.CHECKING
    ) {
      return {
        state: UseERC20PermitState.LOADING,
        signatureData: null,
        gatherPermitSignature: null,
      }
    }

    return {
      state: isSignatureDataValid ? UseERC20PermitState.SIGNED : UseERC20PermitState.NOT_SIGNED,
      signatureData: isSignatureDataValid ? signatureData : null,
      gatherPermitSignature: async function gatherPermitSignature() {
        const signatureDeadline = transactionDeadline.toNumber() + PERMIT_VALIDITY_BUFFER
        const object = generateObjectToSign(
          permitInfo,
          chainId,
          tokenAddress,
          account,
          spender,
          nonceNumber,
          signatureDeadline
        )

        return library
          .send('eth_signTypedData_v4', [account, JSON.stringify(object)])
          .then(splitSignature)
          .then((signature) => {
            setSignatureData({
              v: signature.v,
              r: signature.r,
              s: signature.s,
              deadline: signatureDeadline,
              ...(object.message.allowed ? { allowed: true } : { amount: object.message.value }),
              nonce: nonceNumber,
              chainId,
              owner: account,
              spender,
              tokenAddress,
              permitType: permitInfo.type,
            })
          })
      },
    }
  }, [
    isArgentWallet,
    forceNotApplicable,
    currencyAmount,
    eip2612Contract,
    account,
    chainId,
    transactionDeadline,
    library,
    tokenNonceState.valid,
    tokenNonceState.loading,
    tokenAddress,
    spender,
    permitInfo,
    checkedState,
    nonceNumber,
    domainSeparatorState.loading,
    isSignatureDataValid,
    signatureData,
  ])
}

export function useERC20PermitFromTrade(
  trade: Trade<Currency, Currency, TradeType> | undefined,
  allowedSlippage: Percent,
  transactionDeadline: BigNumber | undefined
) {
  const managerAddress = useManagerAddress()
  const amountToApprove = useMemo(
    () => (trade ? trade.maximumAmountIn(allowedSlippage) : undefined),
    [trade, allowedSlippage]
  )

  return useERC20Permit(amountToApprove, trade && managerAddress, transactionDeadline, null)
}
