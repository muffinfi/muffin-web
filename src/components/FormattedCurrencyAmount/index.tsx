import { Currency, CurrencyAmount, Fraction } from '@uniswap/sdk-core'
import JSBI from 'jsbi'
import { memo } from 'react'

const CURRENCY_AMOUNT_MIN = new Fraction(JSBI.BigInt(1), JSBI.BigInt(1000000))

export default function FormattedCurrencyAmount({
  currencyAmount,
  significantDigits = 4,
}: {
  currencyAmount: CurrencyAmount<Currency>
  significantDigits?: number
}) {
  return (
    <>
      {currencyAmount.equalTo(JSBI.BigInt(0))
        ? '0'
        : currencyAmount.divide(currencyAmount.decimalScale).greaterThan(CURRENCY_AMOUNT_MIN)
        ? currencyAmount.toSignificant(significantDigits)
        : `<${CURRENCY_AMOUNT_MIN.toSignificant(1)}`}
    </>
  )
}

/**
 * Show currency amount in the format of "1.23*10^-4 ETH" format
 */
export const CurrencyAmountInScienticNotation = memo(function CurrencyAmountInScienticNotation({
  amount,
}: {
  amount: CurrencyAmount<Currency> | undefined
}) {
  if (!amount) return <span>---</span>

  const rawAmt = amount.quotient.toString()
  const sign = rawAmt[0] === '-' ? '-' : ''
  const absRawAmt = rawAmt.replace(/^-/, '')
  const exp = Math.floor(Math.log10(Number(absRawAmt))) - amount.currency.decimals
  let mantissa = absRawAmt.length > 1 ? `${absRawAmt[0]}.${absRawAmt.slice(1)}` : absRawAmt
  if (mantissa.length > 4) mantissa = (Number(mantissa) + 0.005).toFixed(2)

  return (
    <span>
      {sign}
      {mantissa}&times;10<sup>{exp}</sup> {amount.currency.symbol}
    </span>
  )
})
