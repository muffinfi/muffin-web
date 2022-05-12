import { useIsUsingInternalAccount } from '@muffinfi/state/user/hooks'
import { BalanceSource } from '@muffinfi/state/wallet/hooks'
import { Currency, CurrencyAmount } from '@uniswap/sdk-core'
import { useMemo } from 'react'

import { useTokenBalance } from './useCurrencyBalance'

export default function useOutstandingAmountToApprove(account?: string, amount?: CurrencyAmount<Currency>) {
  const includeAccountBalance = useIsUsingInternalAccount()
  const accountBalance = useTokenBalance(
    includeAccountBalance ? account : undefined,
    amount?.currency.isToken ? amount.currency : undefined,
    BalanceSource.INTERNAL_ACCOUNT
  )
  return useMemo(() => {
    const outstanding = includeAccountBalance && accountBalance ? amount?.subtract(accountBalance) : amount
    return outstanding?.greaterThan(0) ? outstanding : undefined
  }, [includeAccountBalance, amount, accountBalance])
}
