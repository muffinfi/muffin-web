import { Fraction } from '@uniswap/sdk-core'

export const formatFeePercent = (feePercent: Fraction) => {
  return feePercent.toFixed(feePercent.lessThan(new Fraction(99, 10000)) ? 3 : 2)
}
