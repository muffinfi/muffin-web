import { useEffect } from 'react'

/**
 * @deprecated Not using anymore. Instead, directly use <style> tag in favicon svg
 */
export default function FaviconUpdater() {
  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)')
    const handler = (e: MediaQueryListEvent | MediaQueryList) => {
      const file = e.matches ? 'favicon-dark.$1' : 'favicon.$1'
      document.querySelectorAll('.js-site-favicon').forEach((elm) => {
        const link = elm instanceof HTMLLinkElement ? elm : undefined
        if (!link) return
        link.href = link.href.replace(/favicon[^/]*\.(svg|png)$/g, file)
      })
    }
    handler(media)
    media.addEventListener('change', handler)
    return () => media.removeEventListener('change', handler)
  }, [])

  return null
}
