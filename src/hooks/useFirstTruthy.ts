import { useCallback, useEffect, useReducer, useRef } from 'react'

/**
 * Cache the first-seen truthy value. Allow to reset to undefined if needed.
 */
export const useFirstTruthy = <T>(valueFn: () => T): [T, (render?: boolean) => void] => {
  const ref = useRef<T>()

  // Compute value only if cache is empty
  const value = ref.current ?? valueFn()

  // Cache first truthy value to ref. It doesn't trigger re-render, i.e. does not update ref.current in this draw
  useEffect(() => {
    if (value && value !== ref.current) ref.current = value
  }, [value])

  // Prepare a reset fn to clean cache and trigger re-render
  const [, forceRender] = useReducer((x) => x + 1, 0)
  const reset = useCallback((render?: boolean) => {
    ref.current = undefined
    if (render) forceRender()
  }, [])

  return [value, reset]
}
