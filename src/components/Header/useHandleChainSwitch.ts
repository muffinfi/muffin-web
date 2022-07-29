import { ALL_SUPPORTED_CHAIN_IDS, CHAIN_IDS_TO_NAMES, SupportedChainId } from 'constants/chains'
import useActiveWeb3React from 'hooks/useActiveWeb3React'
import useParsedQueryString from 'hooks/useParsedQueryString'
import usePrevious from 'hooks/usePrevious'
import { ParsedQs } from 'qs'
import { useCallback, useEffect } from 'react'
import { useHistory } from 'react-router-dom'
import { addPopup } from 'state/application/reducer'
import { useAppDispatch } from 'state/hooks'
import { replaceURLParam } from 'utils/routes'
import { switchToNetwork } from 'utils/switchToNetwork'

const getParsedChainId = (parsedQs?: ParsedQs) => {
  const chain = parsedQs?.chain
  if (!chain || typeof chain !== 'string') return { qsChain: undefined, qsChainId: undefined }

  return {
    qsChain: chain.toLowerCase(),
    qsChainId: getChainIdFromName(chain),
  }
}

const getChainIdFromName = (name: string) => {
  const entry = Object.entries(CHAIN_IDS_TO_NAMES).find(([_, n]) => n === name)
  const chainIdStr = entry?.[0]
  const chainId = chainIdStr ? parseInt(chainIdStr) : undefined

  // return undefined if not supported
  const isSupported = chainId != null && ALL_SUPPORTED_CHAIN_IDS.includes(chainId)
  return isSupported ? chainId : undefined
}

const getChainNameFromId = (id: string | number) => {
  // casting here may not be right but fine to return undefined if it's not a supported chain ID
  return CHAIN_IDS_TO_NAMES[id as SupportedChainId] || ''
}

export const useHandleChainSwitch = (closeNetworkSelector: () => void) => {
  const { chainId, library } = useActiveWeb3React()
  const prevChainId = usePrevious(chainId)

  const parsedQs = useParsedQueryString()
  const { qsChain, qsChainId } = getParsedChainId(parsedQs)

  const history = useHistory()
  const replaceSearch = useCallback(
    (chainId: number) => {
      const search = replaceURLParam(history.location.search, 'chain', getChainNameFromId(chainId))
      history.replace({ search })
    },
    [history]
  )

  const dispatch = useAppDispatch()

  const handleChainSwitch = useCallback(
    (targetChain: number, skipCloseNetworkSelector?: boolean) => {
      if (!library) return

      // callback needed to be called no matter if the switch succeeds or not
      const callback = skipCloseNetworkSelector ? () => undefined : closeNetworkSelector

      // stop switching network if not supported
      if (!ALL_SUPPORTED_CHAIN_IDS.includes(targetChain)) {
        console.error('Attempted to switch wallet to an unsupported chain', targetChain)
        callback()
        if (chainId) replaceSearch(chainId) // sync qs-chain to app-chain
        return
      }

      switchToNetwork({ library, chainId: targetChain })
        .then(() => {
          callback()
          replaceSearch(targetChain)
        })
        .catch((error) => {
          console.error('Failed to switch networks', error)
          callback()

          // we want app network <-> chainId param to be in sync, so if user changes the network by changing the URL
          // but the request fails, revert the URL back to current chainId
          if (chainId) replaceSearch(chainId)

          // show popup of "failed to switch *wallet* network. please switch by yourself."
          dispatch(addPopup({ content: { failedSwitchNetwork: targetChain }, key: `failed-network-switch` }))
        })
    },
    [dispatch, library, closeNetworkSelector, replaceSearch, chainId]
  )

  /**
   * If:
   * - qs-chain is not set, or
   * - qs-chain is an unknown name, or
   * - qs-chain is not supported
   * Then:
   * - update qs-chain to current app-chain
   * - no need to initiate switching wallet-chain
   */
  useEffect(() => {
    if (chainId && !qsChainId) {
      replaceSearch(chainId)
    }
  }, [chainId, replaceSearch, qsChainId, qsChain])

  /**
   * - if app-chain changes, update qs-chain to app-chain
   * - if qs-chain changes and qs-chain ≠ app-chain, initiate switching wallet-chain (which will update app-chain afterwards)
   */
  useEffect(() => {
    if (!chainId || !prevChainId) return

    // when network change originates from wallet or dropdown selector, just update URL
    if (chainId !== prevChainId) {
      replaceSearch(chainId)
      return
    }
    // otherwise assume network change originates from URL
    if (qsChainId && qsChainId !== chainId) {
      handleChainSwitch(qsChainId, true)
    }
  }, [chainId, qsChainId, prevChainId, handleChainSwitch, replaceSearch])

  return { handleChainSwitch }
}
