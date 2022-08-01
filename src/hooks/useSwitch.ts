import { useCallback, useRef, useState } from 'react'

export const useSwitch = () => {
  const [state, setState] = useState(false)
  const open = useCallback(() => setState(true), [])
  const close = useCallback(() => setState(false), [])
  return { state, open, close }
}

export const useSwitchWithDelayedClose = () => {
  const [state, setState] = useState(false)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  const open = useCallback(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
    setState(true)
  }, [])

  const close = useCallback(() => {
    // Delay close because the node's mouseleave fires before the tooltip's mouseenter
    timeoutRef.current = setTimeout(() => setState(false), 10)
  }, [])

  return { state, open, close }
}
