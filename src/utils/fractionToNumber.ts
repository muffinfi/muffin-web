import { Currency, CurrencyAmount, Price } from '@uniswap/sdk-core'

export const currencyAmountToNumber = (amount: CurrencyAmount<Currency>) => {
  const frac = amount.asFraction.divide(amount.decimalScale)
  return Number(frac.numerator) / Number(frac.denominator)
}

export const priceToNumber = (price: Price<Currency, Currency>) => {
  const frac = price.asFraction.multiply(price.scalar)
  return Number(frac.numerator) / Number(frac.denominator)
}
