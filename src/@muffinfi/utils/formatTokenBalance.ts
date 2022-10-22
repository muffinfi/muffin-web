import { BigintIsh, Currency, CurrencyAmount, Fraction } from '@uniswap/sdk-core'

const DEFAULT_LOWEST_AMOUNT = new Fraction(1, 10_000)

export const formatTokenBalance = (
  amount: CurrencyAmount<Currency> | undefined,
  sigFigs = 4,
  lowest: Fraction | BigintIsh = DEFAULT_LOWEST_AMOUNT
) => {
  if (amount == null) return undefined
  if (amount.equalTo(0)) return '0'

  const value = amount.divide(amount.decimalScale)

  if (value.lessThan(lowest)) {
    return `<${lowest instanceof Fraction ? lowest.toSignificant(1) : lowest}`
  }

  // e.g. value is 123.456 => show 123.5; value is 123456 => show 123456
  return value.lessThan(10 ** sigFigs) ? amount.toSignificant(sigFigs) : amount.toFixed(0)
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
  if (amount.equalTo(0)) return '$0'

  const value = amount.divide(amount.decimalScale)

  const lowest = new Fraction(1, 10 ** maxDecimalPlaces)

  if (value.lessThan(lowest)) {
    return `<$${lowest.toSignificant(1)}`
  }

  for (let n = 0; n < maxDecimalPlaces; n++) {
    if (!value.lessThan(10 ** (minSigFigs - 1 - n))) {
      return `$${amount.toFixed(n)}`
    }
  }

  return `$${amount.toFixed(maxDecimalPlaces)}`
}
