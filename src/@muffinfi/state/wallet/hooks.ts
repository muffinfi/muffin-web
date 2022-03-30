import { Interface } from '@ethersproject/abi'
import { useHubContract, useManagerContract } from '@muffinfi/hooks/useContract'
import { getAccountHash } from '@muffinfi/utils/getAccountHash'
import { CurrencyAmount, Token } from '@uniswap/sdk-core'
import ERC20ABI from 'abis/erc20.json'
import { Erc20Interface } from 'abis/types/Erc20'
import JSBI from 'jsbi'
import { useMultipleContractSingleData, useSingleContractMultipleData } from 'lib/hooks/multicall'
import { useMemo } from 'react'
import { isAddress } from 'utils'

const ERC20Interface = new Interface(ERC20ABI) as Erc20Interface
const tokenBalancesGasRequirement = { gasRequired: 125_000 }

export enum BalanceSource {
  INTERNAL_ACCOUNT = 0b01,
  WALLET = 0b10,
}

export function useValidatedTokens(tokens?: (Token | undefined)[]): Token[] {
  return useMemo(() => tokens?.filter((t?: Token): t is Token => isAddress(t?.address) !== false) ?? [], [tokens])
}

/**
 * Returns a map of token addresses to their eventually consistent token balances for a single account.
 */
export function useWalletTokenBalancesWithLoadingIndicator(
  address?: string,
  validatedTokens?: Token[]
): [{ [tokenAddress: string]: CurrencyAmount<Token> | undefined }, boolean] {
  const validatedTokenAddresses = useMemo(
    () => (address ? validatedTokens?.map((vt) => vt.address) ?? [] : []),
    [address, validatedTokens]
  )

  const balances = useMultipleContractSingleData(
    validatedTokenAddresses,
    ERC20Interface,
    'balanceOf',
    useMemo(() => [address], [address]),
    tokenBalancesGasRequirement
  )

  return useMemo(
    () => [
      address && validatedTokens && validatedTokens.length > 0
        ? validatedTokens.reduce<{ [tokenAddress: string]: CurrencyAmount<Token> | undefined }>((memo, token, i) => {
            const value = balances?.[i]?.result?.[0]
            const amount = value ? JSBI.BigInt(value.toString()) : undefined
            if (amount) {
              memo[token.address] = CurrencyAmount.fromRawAmount(token, amount)
            }
            return memo
          }, {})
        : {},
      balances.some((callState) => callState.loading),
    ],
    [address, validatedTokens, balances]
  )
}

/**
 * Returns a map of token addresses to their eventually consistent token balances inside hub contract.
 */
export function useInternalTokenBalancesWithLoadingIndicator(
  address?: string,
  validatedTokens?: Token[]
): [{ [tokenAddress: string]: CurrencyAmount<Token> | undefined }, boolean] {
  const hubContract = useHubContract()
  const managerContract = useManagerContract()
  const balances = useSingleContractMultipleData(
    managerContract && address ? hubContract : null,
    'accounts',
    useMemo(() => {
      const accHash = getAccountHash(managerContract?.address, address)
      return accHash ? validatedTokens?.map((token) => [token.address, accHash]) ?? [] : []
    }, [managerContract, address, validatedTokens])
  )

  return useMemo(
    () => [
      address && validatedTokens && validatedTokens.length > 0
        ? validatedTokens.reduce<{ [tokenAddress: string]: CurrencyAmount<Token> | undefined }>((memo, token, i) => {
            const value = balances?.[i]?.result?.[0]
            const amount = value ? JSBI.BigInt(value.toString()) : undefined
            if (amount) {
              memo[token.address] = CurrencyAmount.fromRawAmount(token, amount)
            }
            return memo
          }, {})
        : {},
      balances.some((callState) => callState.loading),
    ],
    [address, validatedTokens, balances]
  )
}
