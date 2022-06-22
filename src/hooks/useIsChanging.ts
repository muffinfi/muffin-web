import { useEffect, useRef } from 'react'

/**
 * Solely for debugging
 */
export default function useIsChanging(value: any, name: string) {
  const ref = useRef<any>()

  useEffect(() => {
    console.log(`[${name}] changed:`, ref.current, value)
    ref.current = value
  }, [value, name])
}
