import { createAction } from '@reduxjs/toolkit'

export const updateUserInternalAccountMode = createAction<{ userInternalAccountMode: boolean }>(
  'user/updateUserInternalAccountMode'
)
