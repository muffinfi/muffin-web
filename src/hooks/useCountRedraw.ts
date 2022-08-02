import { useEffect, useRef } from 'react'

/**
 * Solely for debugging
 */
export default function useCountRedraw(note?: string) {
  const ref = useRef(0)

  useEffect(() => {
    ref.current += 1
    console.log(`[${note ? `${note} ` : ''}redraw]`, ref.current)
  })
}
