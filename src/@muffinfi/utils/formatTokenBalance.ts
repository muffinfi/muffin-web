import { CurrencyAmount, Token } from '@uniswap/sdk-core'
import { DEFAULT_LOCALE } from 'constants/locales'
import JSBI from 'jsbi'

export const formatTokenBalance = (amount: CurrencyAmount<Token> | undefined) => {
  if (amount == null) return undefined
  if (JSBI.equal(amount.quotient, JSBI.BigInt(0))) return '0'

  // 18 sig fig should be precise enough
  const value = parseFloat(amount.toSignificant(18))

  if (value < 0.0001) return '<0.0001'
  if (value >= 100) return value.toLocaleString(DEFAULT_LOCALE, { maximumFractionDigits: 2 })
  return value.toLocaleString(DEFAULT_LOCALE, { maximumSignificantDigits: 4 })
}
