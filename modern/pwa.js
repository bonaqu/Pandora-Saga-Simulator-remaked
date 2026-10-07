(function () {
  'use strict';
  // Retire only this site. Keep other origin applications and saved builds.
  window.addEventListener('beforeinstallprompt', function (event) { event.preventDefault(); });
  if (!('serviceWorker' in navigator)) return;
  var scope = new URL('./', location.href).href;
  navigator.serviceWorker.getRegistrations().then(async function (registrations) {
    for (var registration of registrations) {
      if (registration.scope !== scope) continue;
      var worker = registration.active || registration.waiting || registration.installing;
      if (!worker || new URL(worker.scriptURL).pathname !== new URL('service-worker.js', scope).pathname) continue;
      await registration.unregister();
    }
    if ('caches' in window) {
      var keys = await caches.keys();
      await Promise.all(keys.filter(function (key) { return key.startsWith('pandora-remaked-'); }).map(function (key) { return caches.delete(key); }));
    }
  }).catch(function () { /* Online calculator and saved builds remain usable. */ });
})();
