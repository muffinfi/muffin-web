import { BaseQueryFn } from '@reduxjs/toolkit/query'
import { createApi } from '@reduxjs/toolkit/query/react'
import { SupportedChainId } from 'constants/chains'
import { DocumentNode } from 'graphql'
import { ClientError, gql, GraphQLClient } from 'graphql-request'
import { AppState } from 'state'

// TODO:
// List of supported subgraphs. Note that the app currently only support one active subgraph at a time
const CHAIN_SUBGRAPH_URL: Record<number, string> = {
  [SupportedChainId.MAINNET]: 'https://api.thegraph.com/subgraphs/name/muffinfi/muffin-mainnet',
  [SupportedChainId.RINKEBY]: 'https://api.thegraph.com/subgraphs/name/virtues-milkier/muffin-rinkeby',
  [SupportedChainId.GOERLI]: 'https://api.thegraph.com/subgraphs/name/dkenw/muffin-goerli',

  // [SupportedChainId.ARBITRUM_ONE]: 'https://api.thegraph.com/subgraphs/name/ianlapham/arbitrum-minimal',

  // [SupportedChainId.OPTIMISM]: 'https://api.thegraph.com/subgraphs/name/ianlapham/uniswap-optimism-dev',

  // [SupportedChainId.POLYGON]: 'https://api.thegraph.com/subgraphs/name/ianlapham/uniswap-v3-polygon',
}

export const api = createApi({
  reducerPath: 'dataApi',
  baseQuery: graphqlRequestBaseQuery(),
  endpoints: (builder) => ({
    subgraphState: builder.query({
      query: () => ({
        document: gql`
          query subgraphState {
            _meta {
              hasIndexingErrors
              block {
                number
              }
            }
          }
        `,
      }),
    }),
    allV3Ticks: builder.query({
      query: ({ poolId, skip = 0 }) => ({
        document: gql`
          query allV3Ticks($poolId: String!, $skip: Int!) {
            tiers(first: 1000, where: { poolId: $poolId }, orderBy: tierId) {
              tick
              liquidity
              sqrtGamma
              nextTickBelow
              nextTickAbove
              ticks(first: 1000, skip: $skip, orderBy: tickIdx) {
                tickIdx
                tierId
                liquidityNet
                price0
                price1
              }
            }
          }
        `,
        variables: {
          poolId,
          skip,
        },
      }),
    }),
    feeTierDistribution: builder.query({
      query: ({ poolId }) => ({
        document: gql`
          query feeTierDistribution($poolId: String!) {
            _meta {
              block {
                number
              }
            }
            tiers(orderBy: tierId, orderDirection: asc, where: { poolId: $poolId }) {
              tierId
              token0Price
              amount0
              amount1
            }
          }
        `,
        variables: {
          poolId,
        },
      }),
    }),
    positionTokenIds: builder.query({
      query: ({ owner, skip = 0 }) => ({
        document: gql`
          query positionTokenIds($owner: Bytes!, $skip: Int!) {
            _meta {
              block {
                number
              }
            }
            positions(first: 1000, skip: $skip, where: { owner: $owner }, orderBy: tokenId, orderDirection: desc) {
              tokenId
            }
          }
        `,
        variables: {
          owner,
          skip,
        },
      }),
    }),
    accountTokens: builder.query({
      query: ({ accountHash, skip = 0 }) => ({
        document: gql`
          query accountTokens($accountHash: String!, $skip: Int!) {
            _meta {
              block {
                number
              }
            }
            accountTokenBalances(
              first: 1000
              skip: $skip
              where: { accountHash: $accountHash }
              orderBy: balance
              orderDirection: desc
            ) {
              token {
                id
                decimals
                name
                symbol
              }
            }
          }
        `,
        variables: {
          accountHash,
          skip,
        },
      }),
    }),
    tokenPricesInEth: builder.query({
      query: ({ ids, skip = 0 }) => ({
        document: gql`
          query tokenPricesInEth($ids: [ID!]!, $skip: Int!) {
            _meta {
              block {
                number
              }
            }
            tokens(first: 1000, skip: $skip, where: { id_in: $ids }) {
              id
              symbol
              derivedETH
            }
            bundle(id: "1") {
              ethPriceUSD
            }
          }
        `,
        variables: {
          ids,
          skip,
        },
      }),
    }),
    poolTierFeeGrowth: builder.query({
      query: ({ pool }) => ({
        document: gql`
          query poolTierFeeGrowth($pool: String!) {
            _meta {
              block {
                number
              }
            }
            tiers(first: 16, where: { pool: $pool }) {
              id
              tierId
              sqrtPrice
              tierDayData(first: 3, orderBy: id, orderDirection: desc) {
                date
                feeGrowthGlobal0X64
                feeGrowthGlobal1X64
              }
            }
          }
        `,
        variables: {
          pool,
        },
      }),
    }),
  }),
})

// Graphql query client wrapper that builds a dynamic url based on chain id
function graphqlRequestBaseQuery(): BaseQueryFn<
  { document: string | DocumentNode; variables?: any },
  unknown,
  Pick<ClientError, 'name' | 'message' | 'stack'>,
  Partial<Pick<ClientError, 'request' | 'response'>>
> {
  return async ({ document, variables }, { getState }) => {
    try {
      const chainId = (getState() as AppState).application.chainId

      const subgraphUrl = chainId ? CHAIN_SUBGRAPH_URL[chainId] : undefined

      if (!subgraphUrl) {
        return {
          error: {
            name: 'UnsupportedChainId',
            message: `Subgraph queries against ChainId ${chainId} are not supported.`,
            stack: '',
          },
        }
      }

      return { data: await new GraphQLClient(subgraphUrl).request(document, variables), meta: {} }
    } catch (error) {
      if (error instanceof ClientError) {
        const { name, message, stack, request, response } = error
        return { error: { name, message, stack }, meta: { request, response } }
      }
      throw error
    }
  }
}
