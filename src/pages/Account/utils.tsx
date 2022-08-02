import { formatTokenBalanceWithSymbol } from '@muffinfi/utils/formatTokenBalance'
import { Currency, CurrencyAmount } from '@uniswap/sdk-core'

export const getRowKey = (currency: Currency | undefined, index: number) =>
  currency ? (currency.isNative ? 'native' : currency.address) : index.toString()

export const getAmountsString = (amounts: (CurrencyAmount<Currency> | undefined)[]) =>
  (amounts.filter(Boolean) as CurrencyAmount<Currency>[])
    .map((amount) => formatTokenBalanceWithSymbol(amount, 4))
    .join(', ')
