/// <reference lib="webworker" />

import { cleanupOutdatedCaches, precacheAndRoute, createHandlerBoundToURL } from 'workbox-precaching'
import { NavigationRoute, registerRoute, setCatchHandler } from 'workbox-routing'
import { CacheFirst, StaleWhileRevalidate } from 'workbox-strategies'
import { ExpirationPlugin } from 'workbox-expiration'
import { CacheableResponsePlugin } from 'workbox-cacheable-response'

declare const self: ServiceWorkerGlobalScope

const BUILD_HASH = __BUILD_HASH__
const META_CACHE = 'app-meta'
const META_KEY = '/meta/build-hash'

cleanupOutdatedCaches()
precacheAndRoute(self.__WB_MANIFEST)

registerRoute(
  /\.(?:css|js)$/i,
  new StaleWhileRevalidate({
    cacheName: 'static-resources',
    plugins: [
      new ExpirationPlugin({
        maxEntries: 50,
        maxAgeSeconds: 60 * 60 * 24 * 7
      })
    ]
  })
)

registerRoute(
  /\.(?:png|jpg|jpeg|svg|gif|webp|ico)$/i,
  new CacheFirst({
    cacheName: 'images-cache',
    plugins: [
      new ExpirationPlugin({
        maxEntries: 100,
        maxAgeSeconds: 60 * 60 * 24 * 30
      }),
      new CacheableResponsePlugin({ statuses: [0, 200] })
    ]
  })
)

registerRoute(
  /\.(?:mp3|wav|ogg|m4a)$/i,
  new CacheFirst({
    cacheName: 'audio-cache',
    plugins: [
      new ExpirationPlugin({
        maxEntries: 50,
        maxAgeSeconds: 60 * 60 * 24 * 30
      }),
      new CacheableResponsePlugin({ statuses: [0, 200] })
    ]
  })
)

registerRoute(
  /^https:\/\/fonts\.googleapis\.com\/.*/i,
  new CacheFirst({
    cacheName: 'google-fonts-cache',
    plugins: [
      new ExpirationPlugin({
        maxEntries: 10,
        maxAgeSeconds: 60 * 60 * 24 * 365
      }),
      new CacheableResponsePlugin({ statuses: [0, 200] })
    ]
  })
)

registerRoute(
  /^https:\/\/fonts\.gstatic\.com\/.*/i,
  new CacheFirst({
    cacheName: 'google-fonts-webfonts',
    plugins: [
      new ExpirationPlugin({
        maxEntries: 30,
        maxAgeSeconds: 60 * 60 * 24 * 365
      }),
      new CacheableResponsePlugin({ statuses: [0, 200] })
    ]
  })
)

setCatchHandler(({ request }) => {
  if (request.destination === 'document') {
    return caches.match('/brain-training/offline.html').then(response => response ?? Response.error())
  }
  return Promise.resolve(Response.error())
})

const navigationHandler = createHandlerBoundToURL('/brain-training/index.html')
const navigationRoute = new NavigationRoute(navigationHandler, {
  allowlist: [/^\/brain-training\/.*/]
})
registerRoute(navigationRoute)

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
