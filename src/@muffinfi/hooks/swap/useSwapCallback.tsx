import { TransactionResponse } from '@ethersproject/abstract-provider'
import { BigNumber } from '@ethersproject/bignumber'
import { t, Trans } from '@lingui/macro' // eslint-disable-line no-restricted-imports
import { SwapManager, Trade } from '@muffinfi/muffin-sdk'
import { useIsUsingInternalAccount } from '@muffinfi/state/user/hooks'
import { BalanceSource } from '@muffinfi/state/wallet/hooks'
import { Currency, Percent, TradeType } from '@uniswap/sdk-core'
import useActiveWeb3React from 'hooks/useActiveWeb3React'
import { useArgentWalletContract } from 'hooks/useArgentWalletContract'
import { useManagerAddress } from 'hooks/useContractAddress'
import useENS from 'hooks/useENS'
import { SignatureData } from 'lib/utils/erc20Permit'
import { ReactNode, useMemo } from 'react'
import { TransactionType } from 'state/transactions/actions'
import { useTransactionAdder } from 'state/transactions/hooks'
import { useTokenBalances } from 'state/wallet/hooks'
import approveAmountCalldata from 'utils/approveAmountCalldata'
import { calculateGasMargin } from 'utils/calculateGasMargin'
import { currencyId } from 'utils/currencyId'
import isZero from 'utils/isZero'

enum SwapCallbackState {
  INVALID,
  LOADING,
  VALID,
}

interface SwapCall {
  address: string
  calldata: string
  value: string
}

interface SwapCallEstimate {
  call: SwapCall
}

interface SuccessfulCall extends SwapCallEstimate {
  call: SwapCall
  gasEstimate: BigNumber
}

interface FailedCall extends SwapCallEstimate {
  call: SwapCall
  error: Error
}

interface SwapCallbackArgs {
  trade: Trade<Currency, Currency, TradeType> | undefined // trade to execute, required
  allowedSlippage: Percent // in bips
  recipientAddressOrName: string | null // the ENS name or address of the recipient of the trade, or null if swap should be returned to sender
  toInternalAccount: boolean
  signatureData: SignatureData | undefined | null
  deadline?: BigNumber
}

interface SwapCallbackReturn {
  state: SwapCallbackState
  callback: null | (() => Promise<TransactionResponse>)
  error: ReactNode | null
}

/**
 * Returns the swap calls that can be used to make the trade
 * @param trade trade to execute
 * @param allowedSlippage user allowed slippage
 * @param recipientAddressOrName the ENS name or address of the recipient of the swap output
 * @param signatureData the signature data of the permit of the input token amount, if available
 */
function useSwapCallArguments(
  trade: Trade<Currency, Currency, TradeType> | undefined, // trade to execute, required
  allowedSlippage: Percent, // in bips
  recipientAddressOrName: string | null, // the ENS name or address of the recipient of the trade, or null if swap should be returned to sender
  toAccount: boolean,
  deadline: BigNumber | undefined,
  signatureData: SignatureData | null | undefined
): SwapCall[] {
  const { account, library } = useActiveWeb3React()

  const { address: recipientAddress } = useENS(recipientAddressOrName)
  const recipient = recipientAddressOrName === null ? account : recipientAddress
  const argentWalletContract = useArgentWalletContract()
  const managerAddress = useManagerAddress()
  const tryInternalAccount = useIsUsingInternalAccount()

  const internalBalance = useTokenBalances(
    account ?? undefined,
    useMemo(
      () => (trade?.inputAmount.currency.isToken ? [trade?.inputAmount.currency] : []),
      [trade?.inputAmount.currency]
    ),
    tryInternalAccount ? BalanceSource.INTERNAL_ACCOUNT : 0
  )

  return useMemo(() => {
    if (!trade || !recipient || !library || !account || !managerAddress || !deadline) return []

    if (!managerAddress) return []

    const fromAccount =
      (tryInternalAccount &&
        trade &&
        trade.inputAmount.currency.isToken &&
        internalBalance[trade.inputAmount.currency.address]?.greaterThan(0)) ??
      false

    const { value, calldata } = SwapManager.swapCallParameters(trade, {
      recipient,
      fromAccount,
      toAccount,
      deadline: deadline.toString(),
      slippageTolerance: allowedSlippage,
      managerAddress,
      ...(signatureData
        ? {
            inputTokenPermit:
              'allowed' in signatureData
                ? {
                    expiry: signatureData.deadline,
                    nonce: signatureData.nonce,
                    s: signatureData.s,
                    r: signatureData.r,
                    v: signatureData.v as any,
                  }
                : {
                    deadline: signatureData.deadline,
                    amount: signatureData.amount,
                    s: signatureData.s,
                    r: signatureData.r,
                    v: signatureData.v as any,
                  },
          }
        : undefined),
    })

    if (argentWalletContract && trade.inputAmount.currency.isToken) {
      return [
        {
          address: argentWalletContract.address,
          calldata: argentWalletContract.interface.encodeFunctionData('wc_multiCall', [
            [
              approveAmountCalldata(trade.maximumAmountIn(allowedSlippage), managerAddress),
              {
                to: managerAddress,
                value,
                data: calldata,
              },
            ],
          ]),
          value: '0x0',
        },
      ]
    }
    return [
      {
        address: managerAddress,
        calldata,
        value,
      },
    ]
  }, [
    account,
    allowedSlippage,
    argentWalletContract,
    managerAddress,
    deadline,
    internalBalance,
    library,
    recipient,
    signatureData,
    toAccount,
    trade,
    tryInternalAccount,
  ])
}

/**
 * This is hacking out the revert reason from the ethers provider thrown error however it can.
 * This object seems to be undocumented by ethers.
 * @param error an error from the ethers provider
 */
function swapErrorToUserReadableMessage(error: any): ReactNode {
  let reason: string | undefined
  while (Boolean(error)) {
    reason = error.reason ?? error.message ?? reason
    error = error.error ?? error.data?.originalError
  }

  if (reason?.indexOf('execution reverted: ') === 0) reason = reason.substr('execution reverted: '.length)

  switch (reason) {
    case 'FailedTransferFrom()':
      return <Trans>A token cannot be transferred. There may be an issue with the input or output token.</Trans>
    case 'TOO_LITTLE_RECEIVED':
    case 'TOO_MUCH_REQUESTED':
      return (
        <Trans>
          This transaction will not succeed due to price movement. Try increasing your slippage tolerance. Note: fee on
          transfer and rebase tokens are incompatible with Muffin.
        </Trans>
      )
    default:
      if (reason?.indexOf('undefined is not an object') !== -1) {
        console.error(error, reason)
        return (
          <Trans>
            An error occurred when trying to execute this swap. You may need to increase your slippage tolerance. If
            that does not work, there may be an incompatibility with the token you are trading. Note: fee on transfer
            and rebase tokens are incompatible with Muffin.
          </Trans>
        )
      }
      return (
        <Trans>
          Unknown error{reason ? `: "${reason}"` : ''}. Try increasing your slippage tolerance. Note: fee on transfer
          and rebase tokens are incompatible with Muffin.
        </Trans>
      )
  }
}

// returns a function that will execute a swap, if the parameters are all valid
// and the user has approved the slippage adjusted input amount for the trade
export function useSwapCallback({
  trade,
  allowedSlippage,
  recipientAddressOrName,
  toInternalAccount,
  deadline,
  signatureData,
}: SwapCallbackArgs): SwapCallbackReturn {
  const { account, chainId, library } = useActiveWeb3React()

  const swapCalls = useSwapCallArguments(
    trade,
    allowedSlippage,
    recipientAddressOrName,
    toInternalAccount,
    deadline,
    signatureData
  )

  const addTransaction = useTransactionAdder()

  const { address: recipientAddress } = useENS(recipientAddressOrName)
  const recipient = recipientAddressOrName === null ? account : recipientAddress

  return useMemo(() => {
    if (!trade || !library || !account || !chainId) {
      return { state: SwapCallbackState.INVALID, callback: null, error: <Trans>Missing dependencies</Trans> }
    }
    if (!recipient) {
      if (recipientAddressOrName !== null) {
        return { state: SwapCallbackState.INVALID, callback: null, error: <Trans>Invalid recipient</Trans> }
      } else {
        return { state: SwapCallbackState.LOADING, callback: null, error: null }
      }
    }

    return {
      state: SwapCallbackState.VALID,
      callback: async function onSwap(): Promise<TransactionResponse> {
        const estimatedCalls: SwapCallEstimate[] = await Promise.all(
          swapCalls.map((call) => {
            const { address, calldata, value } = call

            const tx =
              !value || isZero(value)
                ? { from: account, to: address, data: calldata }
                : { from: account, to: address, data: calldata, value }

            return library
              .estimateGas(tx)
              .then((gasEstimate) => {
                return {
                  call,
                  gasEstimate,
                }
              })
              .catch((gasError) => {
                console.debug('Gas estimate failed, trying eth_call to extract error', call)

                return library
                  .call(tx)
                  .then((result) => {
                    console.debug('Unexpected successful call after failed estimate gas', call, gasError, result)
                    return { call, error: <Trans>Unexpected issue with estimating the gas. Please try again.</Trans> }
                  })
                  .catch((callError) => {
                    console.debug('Call threw error', call, callError)
                    return { call, error: swapErrorToUserReadableMessage(callError) }
                  })
              })
          })
        )

        // a successful estimation is a bignumber gas estimate and the next call is also a bignumber gas estimate
        let bestCallOption: SuccessfulCall | SwapCallEstimate | undefined = estimatedCalls.find(
          (el, ix, list): el is SuccessfulCall =>
            'gasEstimate' in el && (ix === list.length - 1 || 'gasEstimate' in list[ix + 1])
        )

        // check if any calls errored with a recognizable error
        if (!bestCallOption) {
          const errorCalls = estimatedCalls.filter((call): call is FailedCall => 'error' in call)
          if (errorCalls.length > 0) throw errorCalls[errorCalls.length - 1].error
          const firstNoErrorCall = estimatedCalls.find<SwapCallEstimate>(
            (call): call is SwapCallEstimate => !('error' in call)
          )
          if (!firstNoErrorCall) throw new Error(t`Unexpected error. Could not estimate gas for the swap.`)
          bestCallOption = firstNoErrorCall
        }

        const {
          call: { address, calldata, value },
        } = bestCallOption

        // for debug:
        if ('gasEstimate' in bestCallOption) {
          console.log('gasEstimate:', bestCallOption.gasEstimate.toString())
          console.log('gasLimit:   ', calculateGasMargin(bestCallOption.gasEstimate).toString())
        }

        return library
          .getSigner()
          .sendTransaction({
            from: account,
            to: address,
            data: calldata,
            // let the wallet try if we can't estimate the gas
            ...('gasEstimate' in bestCallOption ? { gasLimit: calculateGasMargin(bestCallOption.gasEstimate) } : {}),
            ...(value && !isZero(value) ? { value } : {}),
          })
          .then((response) => {
            addTransaction(
              response,
              trade.tradeType === TradeType.EXACT_INPUT
                ? {
                    type: TransactionType.SWAP,
                    tradeType: TradeType.EXACT_INPUT,
                    inputCurrencyId: currencyId(trade.inputAmount.currency),
                    inputCurrencyAmountRaw: trade.inputAmount.quotient.toString(),
                    expectedOutputCurrencyAmountRaw: trade.outputAmount.quotient.toString(),
                    outputCurrencyId: currencyId(trade.outputAmount.currency),
                    minimumOutputCurrencyAmountRaw: trade.minimumAmountOut(allowedSlippage).quotient.toString(),
                  }
                : {
                    type: TransactionType.SWAP,
                    tradeType: TradeType.EXACT_OUTPUT,
                    inputCurrencyId: currencyId(trade.inputAmount.currency),
                    maximumInputCurrencyAmountRaw: trade.maximumAmountIn(allowedSlippage).quotient.toString(),
                    outputCurrencyId: currencyId(trade.outputAmount.currency),
                    outputCurrencyAmountRaw: trade.outputAmount.quotient.toString(),
                    expectedInputCurrencyAmountRaw: trade.inputAmount.quotient.toString(),
                  }
            )

            return response
          })
          .catch((error) => {
            // if the user rejected the tx, pass this along
            if (error?.code === 4001) {
              throw new Error(t`Transaction rejected.`)
            } else {
              // otherwise, the error was unexpected and we need to convey that
              console.error(`Swap failed`, error, address, calldata, value)

              throw new Error(t`Swap failed: ${swapErrorToUserReadableMessage(error)}`)
            }
          })
      },
      error: null,
    }
  }, [trade, library, account, chainId, recipient, recipientAddressOrName, swapCalls, addTransaction, allowedSlippage])
}
