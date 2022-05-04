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
import { useSingleContractMultipleData } from 'lib/hooks/multicall'
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
  const [walletBalances, loadingWallet] = useWalletTokenBalancesWithLoadingIndicator(
    source == null || source & BalanceSource.WALLET ? address : undefined,
    validatedTokens
  )
  const [internalBalances, loadingInternal] = useInternalTokenBalancesWithLoadingIndicator(
    (source == null && isUseInternalAccount) || (source ?? 0) & BalanceSource.INTERNAL_ACCOUNT ? address : undefined,
    validatedTokens
  )
  return useMemo(
    () => [
      validatedTokens.reduce<{ [tokenAddress: string]: CurrencyAmount<Token> | undefined }>((memo, token) => {
        const value = walletBalances[token.address] ?? CurrencyAmount.fromRawAmount(token, 0)
        memo[token.address] = internalBalances[token.address]
          ? value.add(internalBalances[token.address] as CurrencyAmount<typeof token>)
          : value
        return memo
      }, {}),
      loadingWallet || loadingInternal,
    ],
    [validatedTokens, loadingWallet, loadingInternal, walletBalances, internalBalances]
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

export function useCurrencyBalances(
  account?: string,
  currencies?: (Currency | undefined)[],
  source?: BalanceSource
): (CurrencyAmount<Currency> | undefined)[] {
  const tokens = useMemo(
    () => currencies?.filter((currency): currency is Token => currency?.isToken ?? false) ?? [],
    [currencies]
  )

  const tokenBalances = useTokenBalances(account, tokens, source)
  const containsETH: boolean = useMemo(() => currencies?.some((currency) => currency?.isNative) ?? false, [currencies])
  const ethBalance = useNativeCurrencyBalances(useMemo(() => (containsETH ? [account] : []), [containsETH, account]))

  return useMemo(
    () =>
      currencies?.map((currency) => {
        if (!account || !currency) return undefined
        if (currency.isToken) return tokenBalances[currency.address]
        if (currency.isNative) return ethBalance[account]
        return undefined
      }) ?? [],
    [account, currencies, ethBalance, tokenBalances]
  )
}

export default function useCurrencyBalance(
  account?: string,
  currency?: Currency,
  source?: BalanceSource
): CurrencyAmount<Currency> | undefined {
  return useCurrencyBalances(
    account,
    useMemo(() => [currency], [currency]),
    source
  )[0]
}
