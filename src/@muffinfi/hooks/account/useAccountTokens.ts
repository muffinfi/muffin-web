import { getAccountHash } from '@muffinfi/utils/getAccountHash'
import { skipToken } from '@reduxjs/toolkit/query/react'
import { validateAndParseAddress } from '@uniswap/sdk-core'
import { useManagerAddress } from 'hooks/useContractAddress'
import ms from 'ms.macro'
import { useMemo } from 'react'
import { useAccountTokensQuery } from 'state/data/enhanced'
import { AccountTokensQuery } from 'state/data/generated'

export function useAccountTokens(account: string | null | undefined) {
  const managerAddress = useManagerAddress()
  const accountHash = getAccountHash(managerAddress, account ?? undefined)
  const { isLoading, data } = useAccountTokensQuery(accountHash ? { accountHash, skip: 0 } : skipToken, {
    pollingInterval: ms`30s`,
  })

  const queryData = data as AccountTokensQuery | undefined

  return useMemo(
    () => ({
      isLoading,
      subgraphBlockNumber: queryData?._meta?.block.number,
      tokenIds: queryData?.accountTokenBalances.map(({ token }) => validateAndParseAddress(token.id)),
    }),
    [isLoading, queryData]
  )
}
