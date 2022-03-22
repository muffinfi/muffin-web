import { useCallback } from 'react'
import { useAppDispatch, useAppSelector } from 'state/hooks'
import { updateUserInternalAccountMode } from './actions'

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
