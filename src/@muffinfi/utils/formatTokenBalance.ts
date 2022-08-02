import { Currency, CurrencyAmount } from '@uniswap/sdk-core'
import { DEFAULT_LOCALE } from 'constants/locales'
import JSBI from 'jsbi'

export const formatTokenBalance = (amount: CurrencyAmount<Currency> | undefined, sigFigs = 4) => {
  if (amount == null) return undefined
  if (JSBI.equal(amount.quotient, JSBI.BigInt(0))) return '0'

  // 18 sig fig should be precise enough
  const value = parseFloat(amount.toSignificant(18))

  if (value < 0.0001) return '<0.0001'
  if (value >= 10 ** sigFigs) return value.toLocaleString(DEFAULT_LOCALE, { maximumFractionDigits: 0 })
  return value.toLocaleString(DEFAULT_LOCALE, { maximumSignificantDigits: sigFigs })
}

export const formatTokenBalanceWithSymbol = (amount: CurrencyAmount<Currency> | undefined, sigFigs = 4) => {
  return amount ? `${formatTokenBalance(amount, sigFigs)} ${amount.currency.symbol}` : '-'
}
