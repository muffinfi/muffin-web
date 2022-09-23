import { skipToken } from '@reduxjs/toolkit/query/react'
import { SupportedChainId } from 'constants/chains'
import useActiveWeb3React from 'hooks/useActiveWeb3React'
import { useMemoMap } from 'hooks/useMemoMap'
import { useMemoArrayWithEqualCheck } from 'hooks/useMemoWithEqualCheck'
import useBlockNumber from 'lib/hooks/useBlockNumber'
import ms from 'ms.macro'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useTokenPricesInEthQuery } from 'state/data/enhanced'
import { TokenPricesInEthQuery } from 'state/data/generated'

export interface PriceQueryResult {
  isLoading: boolean
  ethPriceUSD: number | undefined
  tokenPricesETH: { [tokenAddress: string]: number }
}

const UPDATE_INTERVAL = ms`60s`

/**
 * Get token prices from subgraph.
 */
export const useTokenEthPricesFromSubgraph = (tokenAddresses?: string[]): PriceQueryResult => {
  const latestBlock = useBlockNumber()
  const normalizedAddresses = useMemoArrayWithEqualCheck(tokenAddresses?.map((addr) => addr.toLowerCase()))

  const { isLoading, data } = useTokenPricesInEthQuery(
    normalizedAddresses ? { ids: normalizedAddresses, skip: 0 } : skipToken,
    { pollingInterval: UPDATE_INTERVAL }
  )
  const queryData = data as TokenPricesInEthQuery | undefined

  // lagging 20 blocks is considered stale data
  const isStale = Boolean(latestBlock && queryData && latestBlock - (queryData._meta?.block?.number ?? 0) > 20)

  return useMemo(() => {
    const ethPriceUSD = queryData?.bundle?.ethPriceUSD
    const tokenPricesETH = queryData?.tokens
      ? Object.fromEntries(
          queryData.tokens
            .filter((token) => token.derivedETH !== '0')
            .map((token) => {
              const addr = tokenAddresses?.find((addr) => addr.toLowerCase() === token.id) ?? token.id
              return [addr, Number(token.derivedETH)]
            })
        )
      : undefined
    return {
      isLoading,
      ethPriceUSD: !isStale && ethPriceUSD && ethPriceUSD !== '0' ? Number(ethPriceUSD) : undefined,
      tokenPricesETH: !isStale && tokenPricesETH ? tokenPricesETH ?? {} : {},
    }
  }, [tokenAddresses, isStale, queryData, isLoading])
}

type DefiLlamaAPICoinsResponse = {
  coins: {
    [k: string]: {
      decimals?: number
      symbol: string
      price: number
      timestamp: number
      confidence: number
    }
  }
}

const DEFILLAMA_CHAIN_NAME_BY_ID: Record<number, string | undefined> = {
  [SupportedChainId.MAINNET]: 'ethereum',
  [SupportedChainId.ARBITRUM_ONE]: 'arbitrum',
  [SupportedChainId.OPTIMISM]: 'optimism',
}

/**
 * Get token prices from DefiLlama API.
 */
export const useTokenEthPricesFromDefiLlama = (tokenAddresses?: string[]): PriceQueryResult => {
  const { chainId } = useActiveWeb3React()

  const [isLoading, setIsLoading] = useState(false) //whether currently loading for the first time. No data yet.
  const [tokenPricesETH, setTokenEthPrices] = useState<{ [addr: string]: number }>({})
  const [ethPriceUSD, setEthPriceUSD] = useState<number | undefined>()
  const lastUpdatedRef = useRef(0)

  useEffect(() => {
    const chainName = DEFILLAMA_CHAIN_NAME_BY_ID[chainId ?? -1]
    if (!chainName) return
    if (!tokenAddresses || tokenAddresses.length === 0) return

    if (Date.now() - lastUpdatedRef.current <= UPDATE_INTERVAL) return

    if (lastUpdatedRef.current === 0) setIsLoading(true)
    lastUpdatedRef.current = Date.now()

    const dataString = tokenAddresses.map((addr) => `${chainName}:${addr}`).join(',')
    const url = `https://coins.llama.fi/prices/current/coingecko:ethereum,${dataString}`
    console.log('fetch defillama: ', url)

    let stop = false
    fetch(url)
      .then((res) => res.json() as unknown as DefiLlamaAPICoinsResponse)
      .then((data) => {
        if (stop) return

        const ethPriceUSD = data.coins['coingecko:ethereum']?.price
        if (typeof ethPriceUSD !== 'number' || ethPriceUSD === 0) {
          setTokenEthPrices({})
          setEthPriceUSD(undefined)
          setIsLoading(false)
          return
        }

        const prices = Object.fromEntries(
          Object.entries(data.coins)
            .filter(([key, tokenData]) => {
              if (key === 'coingecko:ethereum') return false
              if (!key.split(':')[1]) return false
              if (typeof tokenData.confidence !== 'number' || tokenData.confidence < 0.9) return false
              if (typeof tokenData.price !== 'number' || !tokenData.price) return false
              return true
            })
            .map(([key, tokenData]) => {
              return [key.split(':')[1], tokenData.price / ethPriceUSD]
            })
        )

        setTokenEthPrices(prices)
        setEthPriceUSD(ethPriceUSD)
        setIsLoading(false)
      })
    return () => {
      stop = false
    }
  }, [chainId, tokenAddresses])

  return {
    isLoading,
    ethPriceUSD,
    tokenPricesETH,
  }
}

/**
 * Get token prices from subgraph first.
 * For tokens who have no valid price stored in subgraph, we try to get from DefiLlama API.
 */
export const useTokenPrices = (tokenAddresses?: string[]): PriceQueryResult => {
  const addresses = useMemoArrayWithEqualCheck(tokenAddresses)
  const { isLoading, ethPriceUSD, tokenPricesETH } = useTokenEthPricesFromSubgraph(addresses ?? undefined)

  const missingAddresses = useMemoArrayWithEqualCheck(
    useMemo(
      () => (!isLoading ? tokenAddresses?.filter((addr) => !tokenPricesETH?.[addr]) : undefined),
      [isLoading, tokenPricesETH, tokenAddresses]
    )
  )

  const {
    isLoading: isLoadingDefiLlama,
    ethPriceUSD: ethPriceUSDDefiLlama, //
    tokenPricesETH: tokenPricesETHDefiLlama,
  } = useTokenEthPricesFromDefiLlama(missingAddresses ?? undefined)

  const tokenPricesETHMerged = useMemoMap(
    useMemo(() => ({ ...tokenPricesETHDefiLlama, ...tokenPricesETH }), [tokenPricesETH, tokenPricesETHDefiLlama])
  )

  return {
    isLoading: isLoading || isLoadingDefiLlama,
    ethPriceUSD: ethPriceUSD ?? ethPriceUSDDefiLlama,
    tokenPricesETH: tokenPricesETHMerged,
  }
}
