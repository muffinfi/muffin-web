import { Interface } from '@ethersproject/abi'
import { useHubContract } from '@muffinfi/hooks/useContract'
import { useIsUsingInternalAccount } from '@muffinfi/state/user/hooks'
import { getAccountHash } from '@muffinfi/utils/getAccountHash'
import { CurrencyAmount, Token } from '@uniswap/sdk-core'
import ERC20ABI from 'abis/erc20.json'
import { Erc20Interface } from 'abis/types/Erc20'
import { useAllTokens } from 'hooks/Tokens'
import useActiveWeb3React from 'hooks/useActiveWeb3React'
import { useInterfaceMulticall } from 'hooks/useContract'
import { useManagerAddress } from 'hooks/useContractAddress'
import JSBI from 'jsbi'
import { useMultipleContractSingleData, useSingleContractMultipleData } from 'lib/hooks/multicall'
import { useEffect, useMemo, useRef } from 'react'
import { useAppDispatch, useAppSelector } from 'state/hooks'
import {
  updateInternalBalances,
  updateInternalBalancesLastUpdated,
  updateWalletBalances,
  updateWalletBalancesLastUpdated,
} from 'state/wallet/slice'
import { isAddress } from 'utils'

const ERC20Interface = new Interface(ERC20ABI) as Erc20Interface
const tokenBalancesGasRequirement = { gasRequired: 185_000 }

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
    () => (address && validatedTokens ? validatedTokens.map((vt) => vt.address) : []),
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
  const managerAddress = useManagerAddress()
  const balances = useSingleContractMultipleData(
    managerAddress && address && validatedTokens?.length ? hubContract : null,
    'accounts',
    useMemo(() => {
      const accHash = getAccountHash(managerAddress, address)
      return accHash && validatedTokens ? validatedTokens.map((token) => [token.address, accHash]) : []
    }, [managerAddress, address, validatedTokens])
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

// ----------

const makeChunks = <T>(xs: T[], chunkSize: number): T[][] => {
  const chunks: T[][] = []
  for (let i = 0; i < xs.length; i += chunkSize) {
    chunks.push(xs.slice(i, i + chunkSize))
  }
  return chunks
}

/**
 * Bypassing redux-multicall
 */
export function useAllWalletTokenBalances(
  chainId: number | undefined,
  account: string | null | undefined,
  allTokens: Token[],
  fetchEnabled = true
) {
  const lastUpdated = useAppSelector((state) => state.wallet[chainId ?? -1]?.[account ?? '']?.wallet.lastUpdated ?? 0)
  const secondElaspedRef = useRef(0) // use ref because we don't want it to trigger re-fetch
  secondElaspedRef.current = Date.now() - lastUpdated

  const dispatch = useAppDispatch()
  const multicallContract = useInterfaceMulticall()

  useEffect(() => {
    if (!fetchEnabled) return
    if (!chainId || !account) return
    if (secondElaspedRef.current < 60 * 1000) return // 60 seconds

    dispatch(updateWalletBalancesLastUpdated({ account, chainId }))

    const CHUNK_SIZE = 1000
    makeChunks(allTokens, CHUNK_SIZE).forEach((tokens, i) => {
      setTimeout(() => {
        const callData = ERC20Interface.encodeFunctionData('balanceOf', [account])
        const calls = tokens.map((token) => ({ target: token.address, callData, gasLimit: 50000 }))
        console.log('start fetch wallet', i, calls.length)

        multicallContract.callStatic.multicall(calls).then((output) => {
          console.log('end fetch wallet', i, output.returnData.length)
          dispatch(
            updateWalletBalances({
              chainId,
              account,
              tokens,
              blockNumber: output.blockNumber,
              results: output.returnData,
            })
          )
        })
      }, i * 200)
    })
  }, [fetchEnabled, multicallContract, allTokens, chainId, account, dispatch])

  return useAppSelector((state) => state.wallet[chainId ?? -1]?.[account ?? '']?.wallet.balancesByAddress ?? {})
}

/**
 * Bypassing redux-multicall
 */
export function useAllInternalTokenBalances(
  chainId: number | undefined,
  account: string | null | undefined,
  allTokens: Token[],
  fetchEnabled = true
) {
  const lastUpdated = useAppSelector((state) => state.wallet[chainId ?? -1]?.[account ?? '']?.internal.lastUpdated ?? 0)
  const secondElaspedRef = useRef(0) // use ref because we don't want it to trigger re-fetch
  secondElaspedRef.current = Date.now() - lastUpdated

  const dispatch = useAppDispatch()
  const multicallContract = useInterfaceMulticall()
  const hubContract = useHubContract()
  const managerAddress = useManagerAddress()

  useEffect(() => {
    if (!fetchEnabled) return
    if (!chainId || !account) return
    if (!hubContract || !managerAddress) return
    if (secondElaspedRef.current < 60 * 1000) return // 60 seconds

    dispatch(updateInternalBalancesLastUpdated({ account, chainId }))

    const CHUNK_SIZE = 1000
    makeChunks(allTokens, CHUNK_SIZE).forEach((tokens, i) => {
      setTimeout(() => {
        const calls = tokens.map((token) => {
          const accHash = getAccountHash(managerAddress, account) as string
          const callData = hubContract.interface.encodeFunctionData('accounts', [token.address, accHash])
          return { target: hubContract.address, callData, gasLimit: 50000 }
        })
        console.log('start fetch internal', i, calls.length)

        multicallContract.callStatic.multicall(calls).then((output) => {
          console.log('end fetch internal', i, output.returnData.length)
          dispatch(
            updateInternalBalances({
              chainId,
              account,
              tokens,
              blockNumber: output.blockNumber,
              results: output.returnData,
            })
          )
        })
      }, i * 200 + 100)
    })
  }, [fetchEnabled, multicallContract, hubContract, managerAddress, allTokens, chainId, account, dispatch])

  return useAppSelector((state) => state.wallet[chainId ?? -1]?.[account ?? '']?.internal.balancesByAddress ?? {})
}

/**
 * Sort by token balance in descending order, and then by symbol in alphabetical order
 */
export const useSortTokensByBalances = (tokens: Token[], source: BalanceSource | undefined): Token[] => {
  const { chainId, account } = useActiveWeb3React()
  const allTokensByAddress = useAllTokens()
  const allTokens = useMemo(() => Object.values(allTokensByAddress), [allTokensByAddress])

  const isUseInternalAccount = useIsUsingInternalAccount()
  const includesWallet = source == null ? true : Boolean(source & BalanceSource.WALLET)
  const includesInternal = source == null ? isUseInternalAccount : Boolean(source & BalanceSource.INTERNAL_ACCOUNT)

  const walletBalances = useAllWalletTokenBalances(chainId, account, allTokens, includesWallet)
  const internalBalances = useAllInternalTokenBalances(chainId, account, allTokens, includesInternal)

  return useMemo(() => {
    return tokens.slice().sort((a, b) => {
      const wbA = includesWallet ? walletBalances[a.address] : undefined
      const wbB = includesWallet ? walletBalances[b.address] : undefined
      const ibA = includesInternal ? internalBalances[a.address] : undefined
      const ibB = includesInternal ? internalBalances[b.address] : undefined

      const bA = wbA == null && ibA == null ? undefined : (wbA ?? 0) + (ibA ?? 0)
      const bB = wbB == null && ibB == null ? undefined : (wbB ?? 0) + (ibB ?? 0)

      if (bA != null && bB != null) {
        if (bA > bB) return -1
        if (bA < bB) return 1
      }
      if (a.symbol && b.symbol) {
        return a.symbol.toLowerCase() < b.symbol.toLowerCase() ? -1 : 1
      }
      return -1
    })
  }, [tokens, walletBalances, internalBalances, includesWallet, includesInternal])
}
