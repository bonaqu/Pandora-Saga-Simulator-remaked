const CACHE_NAME = 'pandora-remaked-__CACHE_VERSION__';
const PRECACHE_URLS = __PRECACHE_URLS__;

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) =>
      cache.addAll(PRECACHE_URLS.map((url) => new Request(url, { cache: 'reload' })))
    )
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys
          .filter((key) => key.startsWith('pandora-remaked-') && key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      ))
      .then(() => self.clients.claim())
  );
});

function navigationFallback(request) {
  const url = new URL(request.url);
  const legacy = /\/legacy\/?$/.test(url.pathname);
  const target = legacy ? './legacy/index.html' : './index.html';
  return caches.open(CACHE_NAME).then((cache) => cache.match(target));
}

function navigationCacheFirst(request) {
  return caches.open(CACHE_NAME).then((cache) =>
    navigationFallback(request).then((cached) => {
      if (cached) return cached;
      return fetch(request).then((response) => {
        if (response && response.ok) cache.put(request, response.clone());
        return response;
      });
    })
  );
}

function cacheFirst(request) {
  return caches.open(CACHE_NAME).then((cache) =>
    cache.match(request).then((cached) => {
      if (cached) return cached;
      return fetch(request).then((response) => {
        if (response && response.ok) cache.put(request, response.clone());
        return response;
      });
    })
  );
}

self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== 'GET' || url.origin !== self.location.origin) return;
  event.respondWith(request.mode === 'navigate' ? navigationCacheFirst(request) : cacheFirst(request));
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') self.skipWaiting();
});
