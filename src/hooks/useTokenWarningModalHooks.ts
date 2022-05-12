import { Currency, Token } from '@uniswap/sdk-core'
import { useCallback, useMemo, useState } from 'react'
import { RouteComponentProps } from 'react-router-dom'

import { useAllTokens } from './Tokens'

export default function useTokenWarningModalHooks<T>(
  currencies: (Currency | null | undefined)[],
  history: RouteComponentProps<T>['history'],
  pathIfNotImport: string
) {
  const defaultTokens = useAllTokens()

  // dismiss warning if all imported tokens are in active lists
  const importTokensNotInDefault = useMemo(
    () =>
      currencies.filter(
        (c): c is Token => (c?.isToken ?? false) && !Boolean(c?.isToken && c?.address in defaultTokens)
      ),
    [currencies, defaultTokens]
  )

  const [dismissTokenWarning, setDismissTokenWarning] = useState(false)

  const handleConfirmTokenWarning = useCallback(() => {
    setDismissTokenWarning(true)
  }, [])

  // reset if they close warning without tokens in params
  const handleDismissTokenWarning = useCallback(() => {
    setDismissTokenWarning(true)
    pathIfNotImport && history.push(pathIfNotImport)
  }, [history, pathIfNotImport])

  return {
    importTokensNotInDefault,
    dismissTokenWarning,
    setDismissTokenWarning,
    handleConfirmTokenWarning,
    handleDismissTokenWarning,
  }
}
