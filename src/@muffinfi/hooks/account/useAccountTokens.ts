import { getAddress } from '@ethersproject/address'
import { skipToken } from '@reduxjs/toolkit/query/react'
import { Token } from '@uniswap/sdk-core'
import useActiveWeb3React from 'hooks/useActiveWeb3React'
import { useMemo } from 'react'
import { useAccountTokensQuery } from 'state/data/enhanced'
import { AccountTokensQuery } from 'state/data/generated'

export function useAccountTokens(account: string | null | undefined) {
  const { chainId } = useActiveWeb3React()
  const { isLoading, data } = useAccountTokensQuery(account ? { owner: account, skip: 0 } : skipToken)

  return useMemo(() => {
    if (!data || !chainId) {
      return { isLoading, tokens: undefined }
    }
    const balances = (data as AccountTokensQuery).accountTokenBalances
    const tokens = balances.reduce<{ [address: string]: Token }>((memo, { token }) => {
      const tokenObj = new Token(chainId, token.id, parseInt(token.decimals), token.symbol, token.name)
      memo[tokenObj.address] = tokenObj
      return memo
    }, {})
    const order = balances.map(({ token }) => getAddress(token.id))
    return { isLoading, tokens, order }
  }, [chainId, data, isLoading])
}
