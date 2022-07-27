import { tickToPrice, Tier } from '@muffinfi/muffin-sdk'
import { Currency, Rounding } from '@uniswap/sdk-core'
import { useCallback, useMemo } from 'react'
import { useAppDispatch, useAppSelector } from 'state/hooks'

import { AppState } from '../../index'
import { Field, setFullRange, typeInput, typeLeftRangeInput, typeRightRangeInput, typeStartPriceInput } from './actions'

export function useV3MintState(): AppState['mintV3'] {
  return useAppSelector((state) => state.mintV3)
}

export function useV3MintActionHandlers(noLiquidity: boolean | undefined): {
  onFieldAInput: (typedValue: string) => void
  onFieldBInput: (typedValue: string) => void
  onLeftRangeInput: (typedValue: string) => void
  onRightRangeInput: (typedValue: string) => void
  onStartPriceInput: (typedValue: string) => void
} {
  const dispatch = useAppDispatch()

  const onFieldAInput = useCallback(
    (typedValue: string) => {
      dispatch(typeInput({ field: Field.CURRENCY_A, typedValue, noLiquidity: noLiquidity === true }))
    },
    [dispatch, noLiquidity]
  )

  const onFieldBInput = useCallback(
    (typedValue: string) => {
      dispatch(typeInput({ field: Field.CURRENCY_B, typedValue, noLiquidity: noLiquidity === true }))
    },
    [dispatch, noLiquidity]
  )

  const onLeftRangeInput = useCallback(
    (typedValue: string) => {
      dispatch(typeLeftRangeInput({ typedValue }))
    },
    [dispatch]
  )
  const onRightRangeInput = useCallback(
    (typedValue: string) => {
      dispatch(typeRightRangeInput({ typedValue }))
    },
    [dispatch]
  )

  const onStartPriceInput = useCallback(
    (typedValue: string) => {
      dispatch(typeStartPriceInput({ typedValue }))
    },
    [dispatch]
  )

  return {
    onFieldAInput,
    onFieldBInput,
    onLeftRangeInput,
    onRightRangeInput,
    onStartPriceInput,
  }
}

const PRICE_SIG_FIG = 21

export function useRangeHopCallbacks(
  baseCurrency: Currency | undefined,
  quoteCurrency: Currency | undefined,
  tickLower: number | undefined,
  tickUpper: number | undefined,
  tickSpacing: number | undefined,
  tier?: Tier | undefined
) {
  const dispatch = useAppDispatch()
  const baseToken = useMemo(() => baseCurrency?.wrapped, [baseCurrency])
  const quoteToken = useMemo(() => quoteCurrency?.wrapped, [quoteCurrency])

  // use tier current tick as starting tick if we have tier but no tick input
  const _tickLower = tickLower ?? tier?.tickCurrent
  const _tickUpper = tickUpper ?? tier?.tickCurrent

  const getDecrementLower = useCallback(() => {
    if (baseToken && quoteToken && tickSpacing != null && _tickLower != null) {
      const newPrice = tickToPrice(baseToken, quoteToken, _tickLower - tickSpacing)
      return newPrice.toSignificant(PRICE_SIG_FIG, undefined, Rounding.ROUND_UP)
    }
    return ''
  }, [baseToken, quoteToken, tickSpacing, _tickLower])

  const getIncrementLower = useCallback(() => {
    if (baseToken && quoteToken && tickSpacing != null && _tickLower != null) {
      const newPrice = tickToPrice(baseToken, quoteToken, _tickLower + tickSpacing)
      return newPrice.toSignificant(PRICE_SIG_FIG, undefined, Rounding.ROUND_UP)
    }
    return ''
  }, [baseToken, quoteToken, tickSpacing, _tickLower])

  const getDecrementUpper = useCallback(() => {
    if (baseToken && quoteToken && tickSpacing != null && _tickUpper != null) {
      const newPrice = tickToPrice(baseToken, quoteToken, _tickUpper - tickSpacing)
      return newPrice.toSignificant(PRICE_SIG_FIG, undefined, Rounding.ROUND_UP)
    }
    return ''
  }, [baseToken, quoteToken, tickSpacing, _tickUpper])

  const getIncrementUpper = useCallback(() => {
    if (baseToken && quoteToken && tickSpacing != null && _tickUpper != null) {
      const newPrice = tickToPrice(baseToken, quoteToken, _tickUpper + tickSpacing)
      return newPrice.toSignificant(PRICE_SIG_FIG, undefined, Rounding.ROUND_UP)
    }
    return ''
  }, [baseToken, quoteToken, tickSpacing, _tickUpper])

  const getSetFullRange = useCallback(() => {
    dispatch(setFullRange())
  }, [dispatch])

  return { getDecrementLower, getIncrementLower, getDecrementUpper, getIncrementUpper, getSetFullRange }
}
