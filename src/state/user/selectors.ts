import { createSelector } from '@reduxjs/toolkit'
import { Token } from '@uniswap/sdk-core'
import { AppState } from 'state'

import { SerializedToken } from './actions'

/**
 * @param {AppState} state
 * @param {number | undefined} chainId
 * @return {Token[]}
 */
export const selectUserAddedTokens = createSelector(
  [
    (state: AppState) => state.user.tokens,
    (_: any, chainId: number | undefined) => chainId, //
  ],
  (serializedTokensMap, chainId): Token[] => {
    if (!chainId) return []
    return serializedTokensMap?.[chainId] ? Object.values(serializedTokensMap[chainId]).map(deserializeToken) : []
  }
)

export function deserializeToken(serializedToken: SerializedToken): Token {
  return new Token(
    serializedToken.chainId,
    serializedToken.address,
    serializedToken.decimals,
    serializedToken.symbol,
    serializedToken.name
  )
}
