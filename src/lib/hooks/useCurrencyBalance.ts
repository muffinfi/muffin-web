import { useIsUsingInternalAccount } from '@muffinfi/state/user/hooks'
import {
  BalanceSource,
  useInternalTokenBalancesWithLoadingIndicator,
  useValidatedTokens,
  useWalletTokenBalancesWithLoadingIndicator,
} from '@muffinfi/state/wallet/hooks'
import { Currency, CurrencyAmount, Token } from '@uniswap/sdk-core'
import useActiveWeb3React from 'hooks/useActiveWeb3React'
import JSBI from 'jsbi'
import { useSingleCallResult, useSingleContractMultipleData } from 'lib/hooks/multicall'
import { useMemo } from 'react'

import { nativeOnChain } from '../../constants/tokens'
import { useInterfaceMulticall } from '../../hooks/useContract'
import { isAddress } from '../../utils'

/**
 * Returns a map of the given addresses to their eventually consistent ETH balances.
 */
export function useNativeCurrencyBalances(uncheckedAddresses?: (string | undefined)[]): {
  [address: string]: CurrencyAmount<Currency> | undefined
} {
  const { chainId } = useActiveWeb3React()
  const multicallContract = useInterfaceMulticall()

  const validAddressInputs: [string][] = useMemo(
    () =>
      uncheckedAddresses
        ? uncheckedAddresses
            .map(isAddress)
            .filter((a): a is string => a !== false)
            .sort()
            .map((addr) => [addr])
        : [],
    [uncheckedAddresses]
  )

  const results = useSingleContractMultipleData(multicallContract, 'getEthBalance', validAddressInputs)

  return useMemo(
    () =>
      validAddressInputs.reduce<{ [address: string]: CurrencyAmount<Currency> }>((memo, [address], i) => {
        const value = results?.[i]?.result?.[0]
        if (value && chainId)
          memo[address] = CurrencyAmount.fromRawAmount(nativeOnChain(chainId), JSBI.BigInt(value.toString()))
        return memo
      }, {}),
    [validAddressInputs, chainId, results]
  )
}

export function useNativeCurrencyBalanceWithLoadingIndicator(
  uncheckedAddress: string | undefined
): [CurrencyAmount<Currency> | undefined, boolean] {
  const { chainId } = useActiveWeb3React()
  const multicallContract = useInterfaceMulticall()
  const address = uncheckedAddress ? isAddress(uncheckedAddress) || undefined : undefined

  const callstate = useSingleCallResult(
    address ? multicallContract : null,
    'getEthBalance',
    useMemo(() => (address ? [address] : undefined), [address])
  )

  const amount = useMemo(() => {
    const value = callstate?.result?.[0]
    return chainId && value != null
      ? CurrencyAmount.fromRawAmount(nativeOnChain(chainId), JSBI.BigInt(value.toString()))
      : undefined
  }, [callstate, chainId])

  return [amount, callstate.loading]
}

/**
 * Returns a map of token addresses to their eventually consistent token balances for a single account.
 */
export function useTokenBalancesWithLoadingIndicator(
  address?: string,
  tokens?: (Token | undefined)[],
  source?: BalanceSource
): [{ [tokenAddress: string]: CurrencyAmount<Token> | undefined }, boolean] {
  const isUseInternalAccount = useIsUsingInternalAccount()
  const validatedTokens = useValidatedTokens(tokens)

  const isUseWalletBalances = source == null || source & BalanceSource.WALLET
  const isUseInternalBalances =
    (source == null && isUseInternalAccount) || // if source is null, use app's setting
    (source ?? 0) & BalanceSource.INTERNAL_ACCOUNT

  const [walletBalances, loadingWallet] = useWalletTokenBalancesWithLoadingIndicator(
    isUseWalletBalances ? address : undefined,
    validatedTokens
  )
  const [internalBalances, loadingInternal] = useInternalTokenBalancesWithLoadingIndicator(
    isUseInternalBalances ? address : undefined,
    validatedTokens
  )
  return useMemo(
    () => [
      validatedTokens.reduce<{ [tokenAddress: string]: CurrencyAmount<Token> | undefined }>((memo, token) => {
        const wallatBalance = walletBalances[token.address]
        const internalBalance = internalBalances[token.address]

        if (isUseWalletBalances && isUseInternalBalances) {
          const sum = wallatBalance && internalBalance ? wallatBalance.add(internalBalance) : undefined
          return { ...memo, [token.address]: sum }
        }
        if (isUseWalletBalances) return { ...memo, [token.address]: wallatBalance }
        if (isUseInternalBalances) return { ...memo, [token.address]: internalBalance }
        return memo
      }, {}),
      loadingWallet || loadingInternal,
    ],
    [
      validatedTokens,
      loadingWallet,
      loadingInternal,
      walletBalances,
      internalBalances,
      isUseWalletBalances,
      isUseInternalBalances,
    ]
  )
}

export function useTokenBalances(
  address?: string,
  tokens?: (Token | undefined)[],
  source?: BalanceSource
): { [tokenAddress: string]: CurrencyAmount<Token> | undefined } {
  return useTokenBalancesWithLoadingIndicator(address, tokens, source)[0]
}

// get the balance for a single token/account combo
export function useTokenBalance(
  account?: string,
  token?: Token,
  source?: BalanceSource
): CurrencyAmount<Token> | undefined {
  const tokenBalances = useTokenBalances(
    account,
    useMemo(() => [token], [token]),
    source
  )
  if (!token) return undefined
  return tokenBalances[token.address]
}

export function useCurrencyBalancesWithLoadingIndicator(
  account?: string,
  currencies?: (Currency | undefined)[],
  source?: BalanceSource
): [(CurrencyAmount<Currency> | undefined)[], boolean] {
  const tokens = useMemo(
    () => currencies?.filter((currency): currency is Token => currency?.isToken ?? false) ?? [],
    [currencies]
  )
  const [tokenBalances, loadingTokenBalances] = useTokenBalancesWithLoadingIndicator(account, tokens, source)

  const containsETH: boolean = useMemo(() => currencies?.some((currency) => currency?.isNative) ?? false, [currencies])
  const [ethBalance, loadingEthBalance] = useNativeCurrencyBalanceWithLoadingIndicator(
    containsETH ? account : undefined
  )

  const amounts = useMemo(
    () =>
      currencies?.map((currency) => {
        if (!account || !currency) return undefined
        if (currency.isToken) return tokenBalances[currency.address]
        if (currency.isNative) return ethBalance
        return undefined
      }) ?? [],
    [account, currencies, ethBalance, tokenBalances]
  )
  return [amounts, loadingTokenBalances || loadingEthBalance]
}

export function useCurrencyBalances(
  account?: string,
  currencies?: (Currency | undefined)[],
  source?: BalanceSource
): (CurrencyAmount<Currency> | undefined)[] {
  return useCurrencyBalancesWithLoadingIndicator(account, currencies, source)[0]
}

export function useCurrencyBalanceWithLoadingIndicator(
  account?: string,
  currency?: Currency,
  source?: BalanceSource
): [CurrencyAmount<Currency> | undefined, boolean] {
  const [amounts, loading] = useCurrencyBalancesWithLoadingIndicator(
    account,
    useMemo(() => [currency], [currency]),
    source
  )
  return [amounts[0], loading]
}

export default function useCurrencyBalance(
  account?: string,
  currency?: Currency,
  source?: BalanceSource
): CurrencyAmount<Currency> | undefined {
  return useCurrencyBalanceWithLoadingIndicator(account, currency, source)[0]
}
