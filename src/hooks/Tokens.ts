import { createSelector } from '@reduxjs/toolkit'
import { Currency, Token } from '@uniswap/sdk-core'
import { CHAIN_INFO } from 'constants/chainInfo'
import { L2_CHAIN_IDS, SupportedChainId, SupportedL2ChainId } from 'constants/chains'
import { DISALLOWED_CURRENCIES } from 'constants/tokens'
import useActiveWeb3React from 'hooks/useActiveWeb3React'
import { getTokenFilter } from 'lib/hooks/useTokenList/filtering'
import { useMemo } from 'react'
import { useAppSelector } from 'state/hooks'
import { currencyId } from 'utils/currencyId'

import { useAllLists, useInactiveListUrls } from '../state/lists/hooks'
import {
  selectAllLists,
  selectCombinedActiveListTokenMap,
  selectUnsupportedListTokenMap,
} from '../state/lists/selectors'
import { WrappedTokenInfo } from '../state/lists/wrappedTokenInfo'
import { useUserAddedTokens } from '../state/user/hooks'
import { selectUserAddedTokens } from '../state/user/selectors'
import { TokenAddressMap } from './../state/lists/hooks'

// reduce token map into standard address <-> Token mapping, optionally include user added tokens
const reduceTokenAddressMap = (
  tokenMap: TokenAddressMap,
  chainId: number | undefined,
  userAddedTokens: Token[] | undefined
): { [address: string]: Token } => {
  if (!chainId) return {}

  // reduce to just tokens
  const mapWithoutUrls = Object.keys(tokenMap[chainId] ?? {}).reduce<{ [address: string]: Token }>(
    (newMap, address) => {
      newMap[address] = tokenMap[chainId][address].token
      return newMap
    },
    {}
  )

  if (userAddedTokens) {
    return (
      userAddedTokens
        // reduce into all ALL_TOKENS filtered by the current chain
        .reduce<{ [address: string]: Token }>(
          (tokenMap, token) => {
            tokenMap[token.address] = token
            return tokenMap
          },
          // must make a copy because reduce modifies the map, and we do not
          // want to make a copy in every iteration
          { ...mapWithoutUrls }
        )
    )
  }

  return mapWithoutUrls
}

/**
 * @param {AppState} state
 * @param {number | undefined} chainId
 * @return {{ [address: string]: Token }} a token map of all tokens
 */
const selectAllTokens = createSelector(
  [
    selectCombinedActiveListTokenMap,
    selectUserAddedTokens,
    (_: any, chainId: number | undefined) => chainId, //
  ],
  // reduce token map into standard address <-> Token mapping, optionally include user added tokens
  (tokenMap, userAddedTokens, chainId) => reduceTokenAddressMap(tokenMap, chainId, userAddedTokens)
)

type BridgeInfo = Record<
  SupportedChainId,
  {
    tokenAddress: string
    originBridgeAddress: string
    destBridgeAddress: string
  }
>

/**
 * @param {AppState} state
 * @param {number | undefined} chainId
 * @return {{ [address: string]: Token }} a token map of unsupported tokens
 */
const selectUnsupportedTokens = createSelector(
  [
    selectAllLists,
    selectUnsupportedListTokenMap,
    (_: any, chainId: number | undefined) => chainId, //
  ],
  (listsByUrl, tokenMap, chainId): { [address: string]: Token } => {
    const unsupportedTokens = reduceTokenAddressMap(tokenMap, chainId, undefined)

    // checks the default L2 lists to see if `bridgeInfo` has an L1 address value that is unsupported
    const l2InferredBlockedTokens: typeof unsupportedTokens = (() => {
      if (!chainId || !L2_CHAIN_IDS.includes(chainId)) {
        return {}
      }

      if (!listsByUrl) {
        return {}
      }

      const listUrl = CHAIN_INFO[chainId as SupportedL2ChainId].defaultListUrl
      const { current: list } = listsByUrl[listUrl]
      if (!list) {
        return {}
      }

      const unsupportedSet = new Set(Object.keys(unsupportedTokens))

      return list.tokens.reduce((acc, tokenInfo) => {
        const bridgeInfo = tokenInfo.extensions?.bridgeInfo as unknown as BridgeInfo
        if (
          bridgeInfo &&
          bridgeInfo[SupportedChainId.MAINNET] &&
          bridgeInfo[SupportedChainId.MAINNET].tokenAddress &&
          unsupportedSet.has(bridgeInfo[SupportedChainId.MAINNET].tokenAddress)
        ) {
          const address = bridgeInfo[SupportedChainId.MAINNET].tokenAddress
          // don't rely on decimals--it's possible that a token could be bridged w/ different decimals on the L2
          return { ...acc, [address]: new Token(SupportedChainId.MAINNET, address, tokenInfo.decimals) }
        }
        return acc
      }, {})
    })()

    return { ...unsupportedTokens, ...l2InferredBlockedTokens }
  }
)

export function useAllTokens(): { [address: string]: Token } {
  const { chainId } = useActiveWeb3React()
  return useAppSelector((state) => selectAllTokens(state, chainId))
}

/**
 * @deprecated please use `useUnsupportedCurrenciesById` instead.
 */
export function useUnsupportedTokens(): { [address: string]: Token } {
  const { chainId } = useActiveWeb3React()
  return useAppSelector((state) => selectUnsupportedTokens(state, chainId))
}

export function useUnsupportedCurrenciesById(): { [id: string]: Currency } {
  const { chainId } = useActiveWeb3React()
  const unsupportedTokenMap = useAppSelector((state) => selectUnsupportedTokens(state, chainId))

  return useMemo(() => {
    const currencies = DISALLOWED_CURRENCIES[chainId ?? -1] ?? []
    const currenciesById = currencies.reduce<{ [id: string]: Currency }>(
      (acc, currency) => ({ ...acc, [currencyId(currency)]: currency }),
      {}
    )
    return { ...currenciesById, ...unsupportedTokenMap }
  }, [chainId, unsupportedTokenMap])
}

export function useSearchInactiveTokenLists(search: string | undefined, minResults = 10): WrappedTokenInfo[] {
  const lists = useAllLists()
  const inactiveUrls = useInactiveListUrls()
  const { chainId } = useActiveWeb3React()
  const activeTokens = useAllTokens()
  return useMemo(() => {
    if (!search || search.trim().length === 0) return []
    const tokenFilter = getTokenFilter(search)
    const result: WrappedTokenInfo[] = []
    const addressSet: { [address: string]: true } = {}
    for (const url of inactiveUrls) {
      const list = lists[url].current
      if (!list) continue
      for (const tokenInfo of list.tokens) {
        if (tokenInfo.chainId === chainId && tokenFilter(tokenInfo)) {
          const wrapped: WrappedTokenInfo = new WrappedTokenInfo(tokenInfo, list)
          if (!(wrapped.address in activeTokens) && !addressSet[wrapped.address]) {
            addressSet[wrapped.address] = true
            result.push(wrapped)
            if (result.length >= minResults) return result
          }
        }
      }
    }
    return result
  }, [activeTokens, chainId, inactiveUrls, lists, minResults, search])
}

export function useIsTokenActive(token: Token | undefined | null): boolean {
  const activeTokens = useAllTokens()

  if (!activeTokens || !token) {
    return false
  }

  return !!activeTokens[token.address]
}

// Check if currency is included in custom list from user storage
export function useIsUserAddedToken(currency: Currency | undefined | null): boolean {
  const userAddedTokens = useUserAddedTokens()

  if (!currency) {
    return false
  }

  return !!userAddedTokens.find((token) => currency.equals(token))
}

// // undefined if invalid or does not exist
// // null if loading or null was passed
// // otherwise returns the token
// export function useToken(tokenAddress?: string | null): Token | null | undefined {
//   const tokens = useAllTokens()
//   return useTokenFromMapOrNetwork(tokens, tokenAddress)
// }

// /**
//  * Manually cache currency into a global object.
//  * Anti-pattern, but this is to stop re-fetching token data in any circumstances (e.g. block number changes).
//  * We are expecting token data will never change.
//  */
// const CURRENCIES: Record<number, Record<string, Currency> | undefined> = {}

// export function useCurrency(_currencyId: string | null | undefined): Currency | null | undefined {
//   const { chainId } = useActiveWeb3React()

//   // try to get currency from cache
//   const cachedCurrency = chainId != null && _currencyId != null ? CURRENCIES[chainId]?.[_currencyId] : undefined
//   const currencyId = cachedCurrency == null ? _currencyId : undefined

//   // fetch token data if it is not native eth
//   const isETH = currencyId?.toUpperCase() === 'ETH'
//   const token = useToken(isETH ? undefined : currencyId)
//   const extendedEther = useMemo(() => ExtendedEther.onChain(chainId ?? SupportedChainId.MAINNET), [chainId]) // display mainnet when not connected

//   // return currency if it is cached
//   if (cachedCurrency != null) return cachedCurrency

//   // return null/undefined if currencyId is null/undefined
//   if (currencyId === null || currencyId === undefined) return currencyId

//   // return weth if currencyId is a weth address
//   const weth = chainId ? WRAPPED_NATIVE_CURRENCY[chainId] : undefined
//   if (weth?.address?.toUpperCase() === currencyId?.toUpperCase()) return weth

//   // cache currency by chainId and currencyId
//   const currency = isETH ? extendedEther : token
//   if (chainId != null && currencyId != null && currency != null) {
//     const caches = CURRENCIES[chainId] ?? (CURRENCIES[chainId] = {})
//     caches[currencyId] = currency
//   }

//   return currency
// }
