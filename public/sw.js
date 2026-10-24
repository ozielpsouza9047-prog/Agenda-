const CACHE_NAME = 'divida-zero-v5';
const PRECACHE_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icon.svg'
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_ASSETS).catch((err) => {
        console.warn('Precache partial fallback:', err);
      });
    })
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Ignore non-GET, non-HTTP, and cross-origin requests (e.g. Supabase API)
  if (
    event.request.method !== 'GET' ||
    !url.protocol.startsWith('http') ||
    url.origin !== self.location.origin
  ) {
    return;
  }

  // Do not cache backend API requests; let them go directly to server
  if (url.pathname.startsWith('/api/')) {
    return;
  }

  // Network-first strategy for all same-origin assets and navigation so updates appear immediately
  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200) {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return networkResponse;
      })
      .catch(async () => {
        const cachedResponse = await caches.match(event.request);
        if (cachedResponse) {
          return cachedResponse;
        }
        if (event.request.mode === 'navigate') {
          const cachedIndex = await caches.match('/index.html');
          if (cachedIndex) return cachedIndex;
          const cachedRoot = await caches.match('/');
          if (cachedRoot) return cachedRoot;
        }
        return new Response('Recurso offline indisponível', {
          status: 503,
          statusText: 'Service Unavailable (Offline)',
          headers: { 'Content-Type': 'text/plain' }
        });
      })
  );
});
