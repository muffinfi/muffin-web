import { useEffect } from 'react'
import { useDarkModeManager } from 'state/user/hooks'

export default function FaviconUpdater() {
  const [darkMode] = useDarkModeManager()

  useEffect(() => {
    const file = darkMode ? 'favicon-dark.$1' : 'favicon.$1'
    document.querySelectorAll('.js-site-favicon').forEach((elm) => {
      const link = elm instanceof HTMLLinkElement ? elm : undefined
      if (!link) return
      link.href = link.href.replace(/favicon[^/]*\.(svg|png)$/g, file)
    })
  }, [darkMode])

  return null
}
