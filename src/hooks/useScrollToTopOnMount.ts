import { useEffect } from 'react'

export default function useScrollToTopOnMount() {
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [])
}
