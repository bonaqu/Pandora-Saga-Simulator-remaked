// Retirement worker at the old URL: no fetch handler or offline cache.
self.addEventListener('install', event => event.waitUntil(self.skipWaiting()));
// Existing clients flush their autosave before sending this activation request.
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    event.waitUntil(self.skipWaiting());
  }
});
self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    for (const key of await caches.keys()) {
      if (key.startsWith('pandora-remaked-')) await caches.delete(key);
    }
    await self.clients.claim();
    await self.registration.unregister();
  })());
});
