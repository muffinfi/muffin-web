import { useEffect } from 'react'

export default function FaviconUpdater() {
  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)')
    const handler = (e: { matches: boolean }) => {
      const file = e.matches ? 'favicon-dark.$1' : 'favicon.$1'
      document.querySelectorAll('.js-site-favicon').forEach((elm) => {
        const link = elm instanceof HTMLLinkElement ? elm : undefined
        if (!link) return
        link.href = link.href.replace(/favicon[^/]*\.(svg|png)$/g, file)
      })
    }
    media.addEventListener('change', handler)
    handler({ matches: media.matches })
    return () => media.removeEventListener('change', handler)
  }, [])

  return null
}
