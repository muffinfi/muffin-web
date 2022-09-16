import { getAccountHash } from '@muffinfi/utils/getAccountHash'
import { skipToken } from '@reduxjs/toolkit/query/react'
import { validateAndParseAddress } from '@uniswap/sdk-core'
import { useManagerAddress } from 'hooks/useContractAddress'
import useBlockNumber from 'lib/hooks/useBlockNumber'
import ms from 'ms.macro'
import { useEffect, useMemo, useState } from 'react'
import { useAccountTokensQuery } from 'state/data/enhanced'
import { AccountTokensQuery } from 'state/data/generated'

import { useHubContract } from '../useContract'

export function useAccountTokens(account: string | null | undefined) {
  const { isLoading, subgraphBlockNumber, tokenIds: subgraphTokenIds } = useAccountTokensFromSubgraph(account)
  const tokenIdsFromLogs = useAccountTokensFromLogs(account, subgraphBlockNumber)

  const tokenIds = useMemo(() => {
    if (tokenIdsFromLogs.length === 0) return subgraphTokenIds
    const res: string[] = []
    for (let i = 0; i < tokenIdsFromLogs.length; i++) {
      const tokenIdsFromLog = tokenIdsFromLogs[i]
      if (!subgraphTokenIds?.includes(tokenIdsFromLog)) {
        res.push(tokenIdsFromLog)
      }
    }
    return [...res, ...(subgraphTokenIds ?? [])]
  }, [subgraphTokenIds, tokenIdsFromLogs])

  return useMemo(
    () => ({
      isLoading,
      subgraphBlockNumber,
      tokenIds,
    }),
    [isLoading, subgraphBlockNumber, tokenIds]
  )
}

export function useAccountTokensFromSubgraph(account: string | null | undefined) {
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

export function useAccountTokensFromLogs(account: string | null | undefined, fromBlock: number | undefined) {
  const blockNumber = useBlockNumber()
  const hub = useHubContract()
  const managerAddress = useManagerAddress()
  const [tokenIds, setTokenIds] = useState<string[]>([])

  useEffect(() => {
    if (!account || !blockNumber || !managerAddress || !fromBlock || !hub || blockNumber === fromBlock) return
    let ignore = false
    const filter = hub.filters.Deposit(managerAddress, account)
    hub
      .queryFilter(filter, fromBlock)
      .then((events) => {
        if (ignore) return
        setTokenIds((prev) => {
          const pending = events.map((event) => validateAndParseAddress(event.args.token))
          return JSON.stringify(prev) === JSON.stringify(pending) ? prev : pending
        })
      })
      .catch((err) => {
        console.error(err)
      })
    return () => {
      ignore = true
    }
  }, [account, blockNumber, fromBlock, hub, managerAddress])

  return tokenIds
}
