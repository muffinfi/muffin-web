import { BigNumber } from '@ethersproject/bignumber'
import { TypedEvent } from '@muffinfi/typechain/commons'
import { getAccountHash } from '@muffinfi/utils/getAccountHash'
import { skipToken } from '@reduxjs/toolkit/query/react'
import { validateAndParseAddress } from '@uniswap/sdk-core'
import { useManagerAddress } from 'hooks/useContractAddress'
import { useSingleContractMultipleData } from 'lib/hooks/multicall'
import useBlockNumber from 'lib/hooks/useBlockNumber'
import ms from 'ms.macro'
import { useEffect, useMemo, useState } from 'react'
import { useAccountTokensQuery } from 'state/data/enhanced'
import { AccountTokensQuery } from 'state/data/generated'

import { useHubContract } from '../useContract'

type SwapEvent = TypedEvent<
  [string, string, string, BigNumber, BigNumber, BigNumber, BigNumber, BigNumber, BigNumber, BigNumber[]] & {
    poolId: string
    sender: string
    recipient: string
    senderAccRefId: BigNumber
    recipientAccRefId: BigNumber
    amount0: BigNumber
    amount1: BigNumber
    amountInDistribution: BigNumber
    amountOutDistribution: BigNumber
    tierData: BigNumber[]
  }
>

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
  const [depositTokens, setDepositTokens] = useState<string[]>([])
  const [swapEvents, setSwapEvents] = useState<SwapEvent[]>([])

  const poolIds = useMemo(() => swapEvents.map((event) => [event.args.poolId]), [swapEvents])
  const pairs = useSingleContractMultipleData(hub, 'underlyings', poolIds)
  const swapTokens: (string | undefined)[] = useMemo(
    () =>
      swapEvents.map((event, i) =>
        !pairs[i]?.result
          ? undefined
          : event.args.amount0.lt(0) // is swapping out token0
          ? validateAndParseAddress(pairs[i]?.result?.token0)
          : validateAndParseAddress(pairs[i]?.result?.token1)
      ),
    [swapEvents, pairs]
  )

  // fetch events
  useEffect(() => {
    if (!account || !blockNumber || !managerAddress || !fromBlock || !hub || blockNumber === fromBlock) return
    let ignore = false
    const depositFilter = hub.filters.Deposit(managerAddress, account)
    const swapFilter = hub.filters.Swap(null, null, managerAddress)
    Promise.all([hub.queryFilter(depositFilter, fromBlock), hub.queryFilter(swapFilter, fromBlock)])
      .then(([depositEvents, newSwapEvents]) => {
        if (ignore) return
        const swapReceived = newSwapEvents.filter((event) => event.args.recipientAccRefId.eq(BigNumber.from(account)))
        setDepositTokens((prev) => {
          const pending = depositEvents.map((event) => validateAndParseAddress(event.args.token))
          return JSON.stringify(prev) === JSON.stringify(pending) ? prev : pending
        })
        setSwapEvents((prev) => {
          const prevData = prev.map((event) => event.transactionHash)
          const pendingData = swapReceived.map((event) => event.transactionHash)
          return JSON.stringify(prevData) === JSON.stringify(pendingData) ? prev : swapReceived
        })
      })
      .catch((err) => {
        console.error(err)
      })
    return () => {
      ignore = true
    }
  }, [account, blockNumber, fromBlock, hub, managerAddress])

  return useMemo(() => {
    const tokens = new Set<string>()
    depositTokens.forEach((token) => tokens.add(token))
    swapTokens.forEach((token) => token && tokens.add(token))
    return Array.from(tokens)
  }, [depositTokens, swapTokens])
}
