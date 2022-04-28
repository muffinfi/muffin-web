import { BigintIsh, Fraction } from '@uniswap/sdk-core'
import JSBI from 'jsbi'

const TEN = JSBI.BigInt(10)

export const toFraction = (value: BigintIsh) => {
  if (typeof value !== 'string') return new Fraction(value)
  const [integer, decimal, ...rest] = value.split('.')
  if (rest.length > 0) throw new Error(`Cannot parse value ${value} to fraction`)
  if (!decimal) return new Fraction(value)
  return new Fraction(integer + decimal, JSBI.exponentiate(TEN, JSBI.BigInt(decimal.length)))
}
