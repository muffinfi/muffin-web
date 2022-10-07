import {
  encodeSqrtPriceX72,
  MAX_SQRT_PRICE,
  MAX_TICK,
  MIN_SQRT_PRICE,
  MIN_TICK,
  nearestUsableTick,
  priceToClosestTick,
} from '@muffinfi/muffin-sdk'
import { Price, Token } from '@uniswap/sdk-core'
import JSBI from 'jsbi'

export function tryParsePrice(baseToken?: Token, quoteToken?: Token, value?: string) {
  if (!baseToken || !quoteToken || !value) return undefined
  if (!value.match(/^\d*\.?\d+$/)) return undefined

  const [whole, fraction] = value.split('.')

  const decimals = fraction?.length ?? 0
  const withoutDecimals = JSBI.BigInt((whole ?? '') + (fraction ?? ''))

  return new Price(
    baseToken,
    quoteToken,
    JSBI.multiply(JSBI.BigInt(10 ** decimals), JSBI.BigInt(10 ** baseToken.decimals)),
    JSBI.multiply(withoutDecimals, JSBI.BigInt(10 ** quoteToken.decimals))
  )
}

export function tryParseTick(
  baseToken?: Token,
  quoteToken?: Token,
  tickSpacing?: number,
  value?: string
): number | undefined {
  if (!baseToken || !quoteToken || !tickSpacing || !value) return undefined

  const price = tryParsePrice(baseToken, quoteToken, value)
  if (!price) return undefined

  if (JSBI.equal(price.numerator, JSBI.BigInt(0))) {
    return baseToken.sortsBefore(quoteToken) ? MIN_TICK : MAX_TICK
  }

  const sqrtPriceX72 = baseToken.sortsBefore(quoteToken)
    ? encodeSqrtPriceX72(price.numerator, price.denominator)
    : encodeSqrtPriceX72(price.denominator, price.numerator)

  let tick: number
  if (JSBI.greaterThanOrEqual(sqrtPriceX72, MAX_SQRT_PRICE)) {
    tick = MAX_TICK
  } else if (JSBI.lessThanOrEqual(sqrtPriceX72, MIN_SQRT_PRICE)) {
    tick = MIN_TICK
  } else {
    tick = priceToClosestTick(price) // this function is agnostic to the base, will always return the correct tick
  }

  return nearestUsableTick(tick, tickSpacing)
}
