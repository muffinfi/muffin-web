import { skipToken } from '@reduxjs/toolkit/query/react'
import { Token } from '@uniswap/sdk-core'
import { useActiveWeb3React } from 'hooks/web3'
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
    const tokens = (data as AccountTokensQuery).accountTokenBalances.reduce<{ [address: string]: Token }>(
      (memo, { token }) => {
        const tokenObj = new Token(chainId, token.id, parseInt(token.decimals), token.symbol, token.name)
        memo[tokenObj.address] = tokenObj
        return memo
      },
      {}
    )
    return { isLoading, tokens }
  }, [chainId, data, isLoading])
}
