import { useEffect, useRef } from 'react'

export const EXCLUDE_NULL_OR_UNDEFINED = [null, undefined]

type Optional<T> = T | null | undefined

// modified from https://usehooks.com/usePrevious/
export default function usePreviousExclude<T>(value: T, exclude?: Optional<T> | Optional<T>[]) {
  // The ref object is a generic container whose current property is mutable ...
  // ... and can hold any value, similar to an instance property on a class
  const ref = useRef<T>()

  // Store current value in ref
  useEffect(() => {
    if (exclude) {
      if (Array.isArray(exclude)) {
        if (exclude.includes(value)) return
      } else if (exclude === value) return
    }
    ref.current = value
  }, [exclude, value]) // Only re-run if value changes

  // Return previous value (happens before update in useEffect above)
  return ref.current
}
