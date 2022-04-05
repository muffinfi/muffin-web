import { createAction } from '@reduxjs/toolkit'

export const updateUserInternalAccountMode = createAction<{ userInternalAccountMode: boolean }>(
  'user/updateUserInternalAccountMode'
)

export const updateShowZeroBalanceTokens = createAction<{ userShowZeroBalanceTokens: boolean }>(
  'user/updateShowZeroBalanceTokens'
)

export const updateShowUntrustedTokens = createAction<{ userShowUntrustedTokens: boolean }>(
  'user/updateShowUntrustedTokens'
)

export const updateUserStoreIntoInternalAccount = createAction<{ userStoreIntoInternalAccount: boolean }>(
  'user/updateUserStoreIntoInternalAccount'
)
