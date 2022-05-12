import { useCallback } from 'react'
import { useAppDispatch, useAppSelector } from 'state/hooks'

import {
  updateShowUntrustedTokens,
  updateShowZeroBalanceTokens,
  updateUserInternalAccountMode,
  updateUserStoreIntoInternalAccount,
} from './actions'

export function useIsUsingInternalAccount(): boolean {
  return useAppSelector((state) => state.user.userInternalAccountMode)
}

export function useInternalAccountModeManager(): [boolean, () => void] {
  const dispatch = useAppDispatch()
  const isUsingInternalAccount = useIsUsingInternalAccount()

  const toggle = useCallback(() => {
    dispatch(updateUserInternalAccountMode({ userInternalAccountMode: !isUsingInternalAccount }))
  }, [isUsingInternalAccount, dispatch])

  return [isUsingInternalAccount, toggle]
}

export function useUserShowZeroBalanceTokens(): [boolean, (newShowZeroBalanceTokens: boolean) => void] {
  const dispatch = useAppDispatch()

  const showZeroBalanceTokens = useAppSelector((state) => state.user.userShowZeroBalanceTokens)

  const setShowZeroBalanceTokens = useCallback(
    (newShowZeroBalanceTokens: boolean) => {
      dispatch(updateShowZeroBalanceTokens({ userShowZeroBalanceTokens: newShowZeroBalanceTokens }))
    },
    [dispatch]
  )

  return [showZeroBalanceTokens, setShowZeroBalanceTokens]
}

export function useUserShowUntrustesTokens(): [boolean, (newUserShowUntrustedTokens: boolean) => void] {
  const dispatch = useAppDispatch()

  const showUntrustedTokens = useAppSelector((state) => state.user.userShowUntrustedTokens)

  const setShowUntrustedTokens = useCallback(
    (newUserShowUntrustedTokens: boolean) => {
      dispatch(updateShowUntrustedTokens({ userShowUntrustedTokens: newUserShowUntrustedTokens }))
    },
    [dispatch]
  )

  return [showUntrustedTokens, setShowUntrustedTokens]
}

export function useUserStoreIntoInternalAccount(): [boolean, () => void] {
  const dispatch = useAppDispatch()

  const userStoreIntoInternalAccount = useAppSelector((state) => state.user.userStoreIntoInternalAccount)

  const toggleUserStoreIntoInternalAccount = useCallback(() => {
    dispatch(updateUserStoreIntoInternalAccount({ userStoreIntoInternalAccount: !userStoreIntoInternalAccount }))
  }, [dispatch, userStoreIntoInternalAccount])

  return [userStoreIntoInternalAccount, toggleUserStoreIntoInternalAccount]
}
