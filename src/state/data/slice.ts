import { BaseQueryFn } from '@reduxjs/toolkit/query'
import { createApi } from '@reduxjs/toolkit/query/react'
import { SupportedChainId } from 'constants/chains'
import { DocumentNode } from 'graphql'
import { ClientError, gql, GraphQLClient } from 'graphql-request'
import { AppState } from 'state'

// List of supported subgraphs. Note that the app currently only support one active subgraph at a time
const CHAIN_SUBGRAPH_URL: Record<number, string> = {
  [SupportedChainId.MAINNET]: 'https://api.thegraph.com/subgraphs/name/uniswap/uniswap-v3',
  [SupportedChainId.RINKEBY]: 'https://api.thegraph.com/subgraphs/name/virtues-milkier/muffin-rinkeby',

  [SupportedChainId.ARBITRUM_ONE]: 'https://api.thegraph.com/subgraphs/name/ianlapham/arbitrum-minimal',

  [SupportedChainId.OPTIMISM]: 'https://api.thegraph.com/subgraphs/name/ianlapham/uniswap-optimism-dev',
}

export const api = createApi({
  reducerPath: 'dataApi',
  baseQuery: graphqlRequestBaseQuery(),
  endpoints: (builder) => ({
    allV3Ticks: builder.query({
      query: ({ poolId, skip = 0 }) => ({
        document: gql`
          query allV3Ticks($poolId: String!, $skip: Int!) {
            tier0: ticks(first: 1000, skip: $skip, where: { poolId: $poolId, tierId: 0 }, orderBy: tickIdx) {
              tickIdx
              tierId
              liquidityNet
              price0
              price1
            }
            tier1: ticks(first: 1000, skip: $skip, where: { poolId: $poolId, tierId: 1 }, orderBy: tickIdx) {
              tickIdx
              tierId
              liquidityNet
              price0
              price1
            }
            tier2: ticks(first: 1000, skip: $skip, where: { poolId: $poolId, tierId: 2 }, orderBy: tickIdx) {
              tickIdx
              tierId
              liquidityNet
              price0
              price1
            }
            tier3: ticks(first: 1000, skip: $skip, where: { poolId: $poolId, tierId: 3 }, orderBy: tickIdx) {
              tickIdx
              tierId
              liquidityNet
              price0
              price1
            }
            tier4: ticks(first: 1000, skip: $skip, where: { poolId: $poolId, tierId: 4 }, orderBy: tickIdx) {
              tickIdx
              tierId
              liquidityNet
              price0
              price1
            }
            tier5: ticks(first: 1000, skip: $skip, where: { poolId: $poolId, tierId: 5 }, orderBy: tickIdx) {
              tickIdx
              tierId
              liquidityNet
              price0
              price1
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
      query: ({ token0, token1 }) => ({
        document: gql`
          query feeTierDistribution($token0: String!, $token1: String!) {
            _meta {
              block {
                number
              }
            }
            asToken0: tiers(
              orderBy: totalValueLockedToken0
              orderDirection: desc
              where: { token0: $token0, token1: $token1 }
            ) {
              feeTier
              totalValueLockedToken0
              totalValueLockedToken1
            }
            asToken1: tiers(
              orderBy: totalValueLockedToken0
              orderDirection: desc
              where: { token0: $token1, token1: $token0 }
            ) {
              feeTier
              totalValueLockedToken0
              totalValueLockedToken1
            }
          }
        `,
        variables: {
          token0,
          token1,
        },
      }),
    }),
    positionTokenIds: builder.query({
      query: ({ owner, skip = 0 }) => ({
        document: gql`
          query positionTokenIds($owner: Bytes!, $skip: Int!) {
            positions(first: 1000, skip: $skip, where: { owner: $owner }, orderBy: tokenId) {
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
