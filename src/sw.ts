/// <reference lib="webworker" />

import { clientsClaim, skipWaiting } from 'workbox-core'
import { cleanupOutdatedCaches, matchPrecache, precacheAndRoute } from 'workbox-precaching'
import { registerRoute, setCatchHandler } from 'workbox-routing'
import { NetworkFirst } from 'workbox-strategies'
import { ExpirationPlugin } from 'workbox-expiration'
import { CacheableResponsePlugin } from 'workbox-cacheable-response'

declare const self: ServiceWorkerGlobalScope

const BUILD_HASH = __BUILD_HASH__
const META_CACHE = 'app-meta'
const META_KEY = '/meta/build-hash'
const NETWORK_TIMEOUT_SECONDS = 4

cleanupOutdatedCaches()
skipWaiting()
clientsClaim()

const precacheFallbackPlugin = {
  async handlerDidError({ request }: { request: Request }) {
    return (await matchPrecache(request)) ?? Response.error()
  }
}

const navigationFallbackPlugin = {
  async handlerDidError() {
    return (
      (await matchPrecache('/brain-training/index.html'))
      ?? (await matchPrecache('/brain-training/offline.html'))
      ?? Response.error()
    )
  }
}

registerRoute(
  ({ request, url }) => request.mode === 'navigate' && url.pathname.startsWith('/brain-training/'),
  new NetworkFirst({
    cacheName: 'navigation-pages',
    networkTimeoutSeconds: NETWORK_TIMEOUT_SECONDS,
    plugins: [
      navigationFallbackPlugin,
      new CacheableResponsePlugin({ statuses: [0, 200] })
    ]
  })
)

registerRoute(
  /\.(?:css|js)$/i,
  new NetworkFirst({
    cacheName: 'static-resources',
    networkTimeoutSeconds: NETWORK_TIMEOUT_SECONDS,
    plugins: [
      precacheFallbackPlugin,
      new CacheableResponsePlugin({ statuses: [0, 200] }),
      new ExpirationPlugin({
        maxEntries: 50,
        maxAgeSeconds: 60 * 60 * 24 * 7
      })
    ]
  })
)

registerRoute(
  /\.(?:png|jpg|jpeg|svg|gif|webp|ico)$/i,
  new NetworkFirst({
    cacheName: 'images-cache',
    networkTimeoutSeconds: NETWORK_TIMEOUT_SECONDS,
    plugins: [
      precacheFallbackPlugin,
      new CacheableResponsePlugin({ statuses: [0, 200] }),
      new ExpirationPlugin({
        maxEntries: 100,
        maxAgeSeconds: 60 * 60 * 24 * 30
      })
    ]
  })
)

registerRoute(
  /\.(?:mp3|wav|ogg|m4a)$/i,
  new NetworkFirst({
    cacheName: 'audio-cache',
    networkTimeoutSeconds: NETWORK_TIMEOUT_SECONDS,
    plugins: [
      precacheFallbackPlugin,
      new CacheableResponsePlugin({ statuses: [0, 200] }),
      new ExpirationPlugin({
        maxEntries: 50,
        maxAgeSeconds: 60 * 60 * 24 * 30
      })
    ]
  })
)

registerRoute(
  /^https:\/\/fonts\.googleapis\.com\/.*/i,
  new NetworkFirst({
    cacheName: 'google-fonts-cache',
    networkTimeoutSeconds: NETWORK_TIMEOUT_SECONDS,
    plugins: [
      new CacheableResponsePlugin({ statuses: [0, 200] }),
      new ExpirationPlugin({
        maxEntries: 10,
        maxAgeSeconds: 60 * 60 * 24 * 365
      })
    ]
  })
)

registerRoute(
  /^https:\/\/fonts\.gstatic\.com\/.*/i,
  new NetworkFirst({
    cacheName: 'google-fonts-webfonts',
    networkTimeoutSeconds: NETWORK_TIMEOUT_SECONDS,
    plugins: [
      new CacheableResponsePlugin({ statuses: [0, 200] }),
      new ExpirationPlugin({
        maxEntries: 30,
        maxAgeSeconds: 60 * 60 * 24 * 365
      })
    ]
  })
)

setCatchHandler(({ request }) => {
  if (request.destination === 'document') {
    return caches.match('/brain-training/offline.html').then(response => response ?? Response.error())
  }
  return Promise.resolve(Response.error())
})

precacheAndRoute(self.__WB_MANIFEST)

async function persistBuildHash(): Promise<void> {
  const cache = await caches.open(META_CACHE)
  const response = new Response(
    JSON.stringify({ buildHash: BUILD_HASH, updatedAt: new Date().toISOString() }),
    { headers: { 'Content-Type': 'application/json' } }
  )
  await cache.put(META_KEY, response)
}

self.addEventListener('install', event => {
  event.waitUntil(persistBuildHash())
})

self.addEventListener('activate', event => {
  event.waitUntil(persistBuildHash())
})

self.addEventListener('message', event => {
  const data = event.data as { type?: string }
  if (!data?.type) return

  if (data.type === 'SKIP_WAITING') {
    void self.skipWaiting()
    return
  }

  if (data.type === 'GET_VERSION') {
    event.ports?.[0]?.postMessage({ buildHash: BUILD_HASH })
  }
})
