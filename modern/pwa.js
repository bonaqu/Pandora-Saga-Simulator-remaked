(function () {
  'use strict';

  var namespace = window.PandoraRemaked = window.PandoraRemaked || {};

  // Retire only this site's former PWA state. Keep other origin applications
  // and every local build untouched.
  window.addEventListener('beforeinstallprompt', function (event) { event.preventDefault(); });
  if ('serviceWorker' in navigator) {
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
        await Promise.all(keys.filter(function (key) {
          return key.startsWith('pandora-remaked-');
        }).map(function (key) { return caches.delete(key); }));
      }
    }).catch(function () { /* Online calculator and saved builds remain usable. */ });
  }

  var version = window.PandoraRemakedVersion;
  if (!version || !version.ui) return;

  var CURRENT_VERSION = String(version.ui);
  var CHECK_INTERVAL_MS = 60000;
  var IDLE_BEFORE_RELOAD_MS = 2500;
  var RETRY_AFTER_SAVE_FAILURE_MS = 5000;
  var pendingVersion = '';
  var applyTimer = null;
  var pollTimer = null;
  var checking = false;
  var lastActivity = Date.now();

  function cleanReloadMarker() {
    try {
      var url = new URL(window.location.href);
      if (url.searchParams.get('__remaked') !== CURRENT_VERSION) return;
      url.searchParams.delete('__remaked');
      window.history.replaceState(window.history.state, '', url.href);
    } catch { /* Cosmetic URL cleanup must never block the app. */ }
  }

  function noteActivity() {
    lastActivity = Date.now();
    if (pendingVersion) scheduleApply();
  }

  function scheduleApply(delay) {
    if (applyTimer !== null) window.clearTimeout(applyTimer);
    var idleRemaining = Math.max(0, IDLE_BEFORE_RELOAD_MS - (Date.now() - lastActivity));
    applyTimer = window.setTimeout(
      applyPending,
      delay === undefined ? idleRemaining : Math.max(delay, idleRemaining)
    );
  }

  async function applyPending() {
    applyTimer = null;
    if (!pendingVersion) return;
    var idleRemaining = IDLE_BEFORE_RELOAD_MS - (Date.now() - lastActivity);
    if (idleRemaining > 0) {
      scheduleApply(idleRemaining);
      return;
    }

    var active = document.activeElement;
    if (active && /^(INPUT|TEXTAREA|SELECT)$/.test(active.tagName) && typeof active.blur === 'function') {
      active.blur();
      await new Promise(function (resolve) { window.setTimeout(resolve, 50); });
    }

    var saved;
    try {
      saved = namespace.builds && typeof namespace.builds.flushAutosave === 'function'
        ? namespace.builds.flushAutosave()
        : null;
    } catch {
      saved = null;
    }
    if (!saved || saved.ok !== true) {
      scheduleApply(RETRY_AFTER_SAVE_FAILURE_MS);
      return;
    }

    var target = pendingVersion;
    try {
      var previous = JSON.parse(window.sessionStorage.getItem('pandora-remaked.update-attempt') || 'null');
      if (previous && previous.version === target && Date.now() - Number(previous.at || 0) < 15000) {
        scheduleApply(10000);
        return;
      }
      window.sessionStorage.setItem(
        'pandora-remaked.update-attempt',
        JSON.stringify({ version: target, at: Date.now() })
      );
    } catch { /* Reload safety does not depend on sessionStorage. */ }

    pendingVersion = '';
    var url = new URL(window.location.href);
    url.searchParams.set('__remaked', target);
    window.location.replace(url.href);
  }

  async function checkNow() {
    if (checking || document.visibilityState === 'hidden' || navigator.onLine === false) {
      return { ok: false, reason: 'paused' };
    }
    checking = true;
    try {
      var url = new URL('./modern/version.json', window.location.href);
      url.searchParams.set('check', String(Date.now()));
      var response = await fetch(url.href, { cache: 'no-store', credentials: 'same-origin' });
      if (!response.ok) throw new Error('Version check failed');
      var latest = await response.json();
      var next = latest && latest.ui ? String(latest.ui) : '';
      if (!next) throw new Error('Invalid version manifest');
      if (next !== CURRENT_VERSION) {
        pendingVersion = next;
        scheduleApply();
        return { ok: true, update: true, version: next };
      }
      return { ok: true, update: false, version: next };
    } catch (error) {
      return { ok: false, error: error };
    } finally {
      checking = false;
    }
  }

  function startPolling() {
    if (pollTimer !== null || document.visibilityState === 'hidden') return;
    pollTimer = window.setInterval(checkNow, CHECK_INTERVAL_MS);
  }

  function stopPolling() {
    if (pollTimer === null) return;
    window.clearInterval(pollTimer);
    pollTimer = null;
  }

  ['pointerdown', 'keydown', 'input', 'change'].forEach(function (type) {
    document.addEventListener(type, noteActivity, true);
  });
  document.addEventListener('visibilitychange', function () {
    if (document.visibilityState === 'visible') {
      checkNow();
      startPolling();
    } else {
      stopPolling();
    }
  });
  window.addEventListener('focus', checkNow);
  window.addEventListener('online', checkNow);

  cleanReloadMarker();
  startPolling();
  window.setTimeout(checkNow, 0);

  namespace.appUpdate = {
    checkNow: checkNow,
    getPendingVersion: function () { return pendingVersion; }
  };
})();
