import { useIsUsingInternalAccount } from '@muffinfi/state/user/hooks'
import {
  BalanceSource,
  useInternalTokenBalancesWithLoadingIndicator,
  useValidatedTokens,
  useWalletTokenBalancesWithLoadingIndicator,
} from '@muffinfi/state/wallet/hooks'
import { Currency, CurrencyAmount, Ether, Token } from '@uniswap/sdk-core'
import JSBI from 'jsbi'
import { useMemo } from 'react'
import { UNI } from '../../constants/tokens'
import { useAllTokens } from '../../hooks/Tokens'
import { useMulticall2Contract } from '../../hooks/useContract'
import { useActiveWeb3React } from '../../hooks/web3'
import { isAddress } from '../../utils'
import { useUserUnclaimedAmount } from '../claim/hooks'
import { useSingleContractMultipleData } from '../multicall/hooks'
import { useTotalUniEarned } from '../stake/hooks'

/**
 * Returns a map of the given addresses to their eventually consistent ETH balances.
 */
export function useETHBalances(uncheckedAddresses?: (string | undefined)[]): {
  [address: string]: CurrencyAmount<Currency> | undefined
} {
  const { chainId } = useActiveWeb3React()
  const multicallContract = useMulticall2Contract()

  const addresses: string[] = useMemo(
    () =>
      uncheckedAddresses
        ? uncheckedAddresses
            .map(isAddress)
            .filter((a): a is string => a !== false)
            .sort()
        : [],
    [uncheckedAddresses]
  )

  const results = useSingleContractMultipleData(
    multicallContract,
    'getEthBalance',
    addresses.map((address) => [address])
  )

  return useMemo(
    () =>
      addresses.reduce<{ [address: string]: CurrencyAmount<Currency> }>((memo, address, i) => {
        const value = results?.[i]?.result?.[0]
        if (value && chainId)
          memo[address] = CurrencyAmount.fromRawAmount(Ether.onChain(chainId), JSBI.BigInt(value.toString()))
        return memo
      }, {}),
    [addresses, chainId, results]
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
    typeof source === 'undefined' || source & BalanceSource.WALLET ? address : undefined,
    validatedTokens
  )
  const [internalBalances, loadingInternal] = useInternalTokenBalancesWithLoadingIndicator(
    (typeof source === 'undefined' && isUseInternalAccount) || (source ?? 0) & BalanceSource.INTERNAL_ACCOUNT
      ? address
      : undefined,
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
  const tokens = useMemo(() => [token], [token])
  const tokenBalances = useTokenBalances(account, tokens, source)
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
  const ethBalance = useETHBalances(containsETH ? [account] : [])

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

export function useCurrencyBalance(
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

// mimics useAllBalances
export function useAllTokenBalances(source?: BalanceSource): {
  [tokenAddress: string]: CurrencyAmount<Token> | undefined
} {
  const { account } = useActiveWeb3React()
  const allTokens = useAllTokens()
  const allTokensArray = useMemo(() => Object.values(allTokens ?? {}), [allTokens])
  const balances = useTokenBalances(account ?? undefined, allTokensArray, source)
  return balances ?? {}
}

// get the total owned, unclaimed, and unharvested UNI for account
export function useAggregateUniBalance(source?: BalanceSource): CurrencyAmount<Token> | undefined {
  const { account, chainId } = useActiveWeb3React()

  const uni = chainId ? UNI[chainId] : undefined

  const uniBalance: CurrencyAmount<Token> | undefined = useTokenBalance(account ?? undefined, uni, source)
  const uniUnclaimed: CurrencyAmount<Token> | undefined = useUserUnclaimedAmount(account)
  const uniUnHarvested: CurrencyAmount<Token> | undefined = useTotalUniEarned()

  if (!uni) return undefined

  return CurrencyAmount.fromRawAmount(
    uni,
    JSBI.add(
      JSBI.add(uniBalance?.quotient ?? JSBI.BigInt(0), uniUnclaimed?.quotient ?? JSBI.BigInt(0)),
      uniUnHarvested?.quotient ?? JSBI.BigInt(0)
    )
  )
}
