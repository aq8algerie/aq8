const CACHE_PREFIX = 'aq8-';
const CACHE_NAME = 'aq8-static-v2';
const PRECACHE_ASSETS = [
  '/images/logo.png',
  '/images/favicon.png',
  '/images/aq8algerie.webp',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => (
      Promise.allSettled(PRECACHE_ASSETS.map((asset) => cache.add(asset)))
    )),
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => Promise.all(
      cacheNames
        .filter((cacheName) => cacheName.startsWith(CACHE_PREFIX) && cacheName !== CACHE_NAME)
        .map((cacheName) => caches.delete(cacheName)),
    )),
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;

  if (
    event.request.mode === 'navigate'
    || url.pathname.startsWith('/crm')
    || url.pathname.startsWith('/login')
    || url.pathname.startsWith('/api/')
  ) {
    return;
  }

  const isVersionedNextAsset = url.pathname.startsWith('/_next/static/');
  const isPublicAsset = (
    url.pathname.startsWith('/images/')
    || url.pathname.startsWith('/fonts/')
  );
  if (!isVersionedNextAsset && !isPublicAsset) return;

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) return cachedResponse;

      return fetch(event.request).then((networkResponse) => {
        if (!networkResponse.ok) return networkResponse;

        const responseToCache = networkResponse.clone();
        void caches.open(CACHE_NAME).then((cache) => {
          void cache.put(event.request, responseToCache);
        });
        return networkResponse;
      });
    }),
  );
});
