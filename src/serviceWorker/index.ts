import 'workbox-precaching' // defines __WB_MANIFEST

import { clientsClaim } from 'workbox-core'
import { ExpirationPlugin } from 'workbox-expiration'
import { precacheAndRoute } from 'workbox-precaching'
import { PrecacheEntry } from 'workbox-precaching/_types'
import { registerRoute, Route } from 'workbox-routing'
import { CacheFirst } from 'workbox-strategies'

import { DocumentRoute } from './document'
import { toURL } from './utils'

declare const self: ServiceWorkerGlobalScope

/*
  Summary:

  1.  For documents (i.e. url wthout file extensions), we employ a "fetch -> compare etag -> serve" strategy.
      *   Normally, there'll only be one document, i.e. index.html.
      *   We always want a fresh index.html. And this is ok that index.html is fresh but the service worker
          is outdated (due to weird caching in cloudflare). No critical issues, at worst files are not cached.

  2.  For assets, we employ an on-demand "cache-first" strategy with max 150 entry slots.
      *   Cached assets are cached forever unless out of slots. Their filenames are appended with file hash, so it
          doesn't matter if it nevers invalidate.
      *   They are cached on demand, i.e. will not be precached when the service worker is installed. Note that if
          service worker version is out of sync with index.html, it will not cacce new assets from the new index.html.
          Doesn't matter though, just a bit performance issue.
      *   The 150 entry capacity is decided because generally one build includes ~150 asset files (including js/css
          chunks, images, font files).

*/

clientsClaim()
self.skipWaiting()

// Registers the document route for the precached document.
// This must be done before setting up workbox-precaching, so that it takes precedence.
registerRoute(new DocumentRoute())

/**
 * Splits entries into assets, which are loaded on-demand; and entries, which are precached.
 * Effectively, this precaches the document, and caches all other assets on-demand.
 *
 * In case you're curious, `__WB_MANIFEST` is like this:
 * [
 *    { revision: 'c68fba05900bca71e89fdee2ab641270', url: './index.html' },
 *    { revision: null, url: './static/css/3.375a6057.chunk.css' },
 *    { revision: null, url: './static/css/main.003a4ec5.chunk.css' },
 *    ...
 * ]
 */
const { assets, entries } = self.__WB_MANIFEST.reduce<{ assets: string[]; entries: PrecacheEntry[] }>(
  ({ assets, entries }, entry) => {
    if (typeof entry === 'string') {
      return { entries, assets: [...assets, entry] }
    } else if (entry.revision) {
      return { entries: [...entries, entry], assets }
    } else {
      return { entries, assets: [...assets, toURL(entry)] }
    }
  },
  { assets: [], entries: [] }
)

// Registers the assets' routes for on-demand caching.
registerRoute(
  new Route(
    ({ url }) => assets.includes('.' + url.pathname),
    new CacheFirst({
      cacheName: 'assets',
      plugins: [new ExpirationPlugin({ maxEntries: 150 })], // 16
    })
  )
)

// Precaches entries and registers a default route to serve them.
precacheAndRoute(entries)
