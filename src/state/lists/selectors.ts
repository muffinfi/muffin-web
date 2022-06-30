import { createSelector } from '@reduxjs/toolkit'
import { UNSUPPORTED_LIST_URLS } from 'constants/lists'
import { tokensToChainTokenMap } from 'lib/hooks/useTokenList/utils'
import { AppState } from 'state'
import sortByListPriority from 'utils/listSort'

import BROKEN_LIST from '../../constants/tokenLists/broken.tokenlist.json'
import UNSUPPORTED_TOKEN_LIST from '../../constants/tokenLists/unsupported.tokenlist.json'
import { combineMaps, TokenAddressMap } from './hooks'

/**
 * @param {AppState} state
 * @return {string[] | undefined} Array of token list url
 */
export const selectActiveListUrls = createSelector(
  (state: AppState) => state.lists.activeListUrls,
  (activeListUrls) => activeListUrls?.filter((url) => !UNSUPPORTED_LIST_URLS.includes(url))
)

/**
 * @param {AppState} state
 * @returns {AppState['list']['byUrl']} Map of token list's fetch result
 */
export const selectAllLists = (state: AppState) => state.lists.byUrl

/**
 * // get all the tokens from active lists, combine with local default tokens
 * @param {AppState} state
 * @returns {TokenAddressMap}
 */
export const selectCombinedActiveListTokenMap = createSelector(
  [
    selectAllLists,
    selectActiveListUrls, //
  ],
  (listsByUrl, urls) => combineTokenMapFromUrls(listsByUrl, urls)
)

/**
 * // list of tokens not supported on interface for various reasons, used to show warnings and prevent swaps and adds
 * @param {AppState} state
 * @returns {TokenAddressMap}
 */
export const selectUnsupportedListTokenMap = createSelector(
  selectAllLists, //
  (listsByUrl) => {
    // get hard-coded broken tokens
    const brokenListMap = tokensToChainTokenMap(BROKEN_LIST)

    // get hard-coded list of unsupported tokens
    const localUnsupportedListMap = tokensToChainTokenMap(UNSUPPORTED_TOKEN_LIST)

    // get dynamic list of unsupported tokens
    const loadedUnsupportedListMap = combineTokenMapFromUrls(listsByUrl, UNSUPPORTED_LIST_URLS)

    // format into one token address map
    return combineMaps(brokenListMap, combineMaps(localUnsupportedListMap, loadedUnsupportedListMap))
  }
)

//////

const combineTokenMapFromUrls = (
  listsByUrl: AppState['lists']['byUrl'],
  urls: string[] | undefined
): TokenAddressMap => {
  // merge tokens contained within lists from urls
  if (!urls) return {}
  return urls
    .slice()
    .sort(sortByListPriority) // sort by priority so top priority goes last
    .reduce((allTokens, currentUrl) => {
      const current = listsByUrl[currentUrl]?.current
      if (!current) return allTokens
      try {
        return combineMaps(allTokens, tokensToChainTokenMap(current))
      } catch (error) {
        console.error('Could not show token list due to error', error)
        return allTokens
      }
    }, {})
}
