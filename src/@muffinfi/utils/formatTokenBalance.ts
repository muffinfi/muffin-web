import { Currency, CurrencyAmount } from '@uniswap/sdk-core'
import { DEFAULT_LOCALE } from 'constants/locales'
import JSBI from 'jsbi'

export const formatTokenBalance = (amount: CurrencyAmount<Currency> | undefined, sigFigs = 4, lowest = 0.0001) => {
  if (amount == null) return undefined
  if (JSBI.equal(amount.quotient, JSBI.BigInt(0))) return '0'

  // 12 sig fig should be precise enough
  const value = parseFloat(amount.toSignificant(12))

  if (value < lowest) return `<${lowest}`
  if (value >= 10 ** sigFigs) return value.toLocaleString(DEFAULT_LOCALE, { maximumFractionDigits: 0 })
  return value.toLocaleString(DEFAULT_LOCALE, { maximumSignificantDigits: sigFigs })
}

export const formatTokenBalanceWithSymbol = (amount: CurrencyAmount<Currency> | undefined, sigFigs = 4) => {
  return amount ? `${formatTokenBalance(amount, sigFigs)} ${amount.currency.symbol}` : '-'
}

export const formatUSDBalanceWithDollarSign = (
  amount: CurrencyAmount<Currency> | undefined,
  maxDecimalPlaces = 2,
  minSigFigs = 4
) => {
  if (amount == null) return undefined
  if (JSBI.equal(amount.quotient, JSBI.BigInt(0))) return '$0'

  const value = parseFloat(amount.toSignificant(12))

  const lowest = 1 / 10 ** maxDecimalPlaces
  if (value < lowest) return `<$${lowest}`

  for (let n = 0; n < maxDecimalPlaces; n++) {
    if (value >= 10 ** (minSigFigs - 1) / 10 ** n) {
      return `$${value.toLocaleString(DEFAULT_LOCALE, { maximumFractionDigits: n })}`
    }
  }
  return `$${value.toLocaleString(DEFAULT_LOCALE, { maximumFractionDigits: maxDecimalPlaces })}`
}
