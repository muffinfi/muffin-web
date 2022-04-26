import { useMemo, useRef } from 'react'
import type { Optional } from 'types/optional'

export type EqualCheck<T> = (prevValue: Optional<T>, newValue: Optional<T>) => boolean

function arrayCheck<T>(prevValue: Optional<T[]>, newValue: Optional<T[]>, predicate: EqualCheck<T>) {
  if (!prevValue || !newValue || prevValue.length !== newValue.length) return false
  for (let index = 0; index < prevValue.length; index++) {
    if (!predicate(prevValue[index], newValue[index])) return false
  }
  return true
}

export const REF_CHECK = <T>(prevValue: Optional<T>, newValue: Optional<T>) => {
  return Object.is(prevValue, newValue)
}

export const EQUALS_CHECK = <T extends { equals?: (other: T) => boolean }>(
  prevValue: Optional<T>,
  newValue: Optional<T>
) => Boolean(newValue && prevValue?.equals?.(newValue))

export const EQUAL_TO_CHECK = <T extends { equalTo?: (other: T) => boolean }>(
  prevValue: Optional<T>,
  newValue: Optional<T>
) => Boolean(newValue && prevValue?.equalTo?.(newValue))

export default function useMemoWithEqualCheck<T>(value: Optional<T>, equalCheck: EqualCheck<T> = REF_CHECK) {
  const ref = useRef<Optional<T>>()

  return useMemo(() => {
    const prev = ref.current
    if (equalCheck(prev, value)) {
      return prev
    }
    ref.current = value
    return value
  }, [equalCheck, value])
}

export function useMemoArrayWithEqualCheck<T>(value: Optional<T[]>, equalCheck: EqualCheck<T> = REF_CHECK) {
  const ref = useRef<Optional<T[]>>()

  return useMemo(() => {
    const prev = ref.current
    if (arrayCheck(prev, value, equalCheck)) {
      return prev
    }
    ref.current = value
    return value
  }, [equalCheck, value])
}
