(function () {
  'use strict';

  var namespace = window.PandoraRemaked = window.PandoraRemaked || {};
  var i18n = namespace.i18n;
  var installPrompt = null;
  var installButton = null;
  var updateNotice = null;
  var waitingWorker = null;
  var activeRegistration = null;
  var updateReloadPending = false;
  var updateFallbackTimer = null;
  var updatePollTimer = null;
  var UPDATE_POLL_MS = 15000;
  var initialized = false;

  function bindText(node, key, fallback) {
    if (i18n && typeof i18n.bindText === 'function') i18n.bindText(node, key);
    else node.textContent = fallback;
  }

  function actionsMount() {
    return document.querySelector('[data-remaked-pwa-actions]');
  }

  function ensureInstallButton() {
    if (installButton && installButton.isConnected) return installButton;
    var mount = actionsMount();
    if (!mount) return null;
    installButton = document.createElement('button');
    installButton.type = 'button';
    installButton.className = 'remaked-install-button';
    installButton.dataset.remakedInstall = '';
    bindText(installButton, 'pwa.install', 'Install App');
    installButton.hidden = true;
    installButton.addEventListener('click', async function () {
      var promptEvent = installPrompt;
      installPrompt = null;
      installButton.hidden = true;
      if (!promptEvent || typeof promptEvent.prompt !== 'function') return;
      try {
        await promptEvent.prompt();
        if (promptEvent.userChoice) await promptEvent.userChoice;
      } catch (error) {
        // Installation is optional and must never interrupt calculator use.
      }
    });
    mount.appendChild(installButton);
    return installButton;
  }

  function captureInstallPrompt(event) {
    if (!event) return;
    if (typeof event.preventDefault === 'function') event.preventDefault();
    installPrompt = event;
    var button = ensureInstallButton();
    if (button) button.hidden = false;
  }

  function clearInstallPrompt() {
    installPrompt = null;
    if (installButton) installButton.hidden = true;
  }

  function requestUpdate(worker) {
    if (worker && typeof worker.postMessage === 'function') waitingWorker = worker;
    if (window.__pandoraPwaBootstrapUpdating) return;
    if (!waitingWorker || typeof waitingWorker.postMessage !== 'function' || updateReloadPending) return;
    if (namespace.builds && typeof namespace.builds.flushAutosave === 'function') {
      var saved = namespace.builds.flushAutosave();
      if (!saved || saved.ok !== true) {
        updateReloadPending = false;
        showUpdateNotice(waitingWorker);
        return;
      }
    }
    updateReloadPending = true;
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('controllerchange', function () {
        window.clearTimeout(updateFallbackTimer);
        if (window.__pandoraPwaReloading) return;
        if (namespace.builds && typeof namespace.builds.flushAutosave === 'function') {
          var savedAtSwitch = namespace.builds.flushAutosave();
          if (!savedAtSwitch || savedAtSwitch.ok !== true) {
            updateReloadPending = false;
            return;
          }
        }
        window.__pandoraPwaReloading = true;
        window.location.reload();
      }, { once: true });
    }
    var reload = updateNotice && updateNotice.querySelector('[data-remaked-update-reload]');
    if (reload) reload.disabled = true;
    waitingWorker.postMessage({ type: 'SKIP_WAITING' });
    updateFallbackTimer = window.setTimeout(function () {
      if (!updateReloadPending) return;
      updateReloadPending = false;
      var retry = updateNotice && updateNotice.querySelector('[data-remaked-update-reload]');
      if (retry) retry.disabled = false;
      showUpdateNotice(waitingWorker);
    }, 8000);
  }

  function showUpdateNotice(worker) {
    if (!worker || typeof worker.postMessage !== 'function') return null;
    waitingWorker = worker;
    if (updateNotice && updateNotice.isConnected) return updateNotice;

    updateNotice = document.createElement('aside');
    updateNotice.className = 'remaked-update-notice';
    updateNotice.dataset.remakedUpdateNotice = '';
    updateNotice.setAttribute('role', 'status');
    updateNotice.setAttribute('aria-live', 'polite');

    var message = document.createElement('span');
    bindText(message, 'pwa.updateMessage', 'New version available — ');
    updateNotice.appendChild(message);

    var reload = document.createElement('button');
    reload.type = 'button';
    reload.className = 'remaked-update-reload';
    reload.dataset.remakedUpdateReload = '';
    bindText(reload, 'pwa.reload', 'Reload');
    reload.addEventListener('click', requestUpdate);
    updateNotice.appendChild(reload);

    document.body.appendChild(updateNotice);
    return updateNotice;
  }

  function watchRegistration(registration) {
    if (!registration) return;
    activeRegistration = registration;
    if (registration.waiting && navigator.serviceWorker.controller) {
      requestUpdate(registration.waiting);
    }
    function watchInstalling(installing) {
      if (!installing) return;
      // Capture whether an older active worker already controls this page now.
      // On first install, clients.claim() may create a controller before the
      // "installed" state callback runs (notably in WebKit); that must not be
      // mistaken for an update and trigger a surprise reload.
      var replacingActiveWorker = Boolean(registration.active && navigator.serviceWorker.controller);
      installing.addEventListener('statechange', function () {
        if (installing.state === 'installed' && replacingActiveWorker) {
          requestUpdate(registration.waiting || installing);
        }
      });
    }
    if (registration.installing) watchInstalling(registration.installing);
    registration.addEventListener('updatefound', function () {
      watchInstalling(registration.installing);
    });
  }

  function checkForUpdate() {
    if (!activeRegistration || document.visibilityState === 'hidden' || navigator.onLine === false) {
      return Promise.resolve(null);
    }
    if (activeRegistration.waiting) {
      requestUpdate(activeRegistration.waiting);
      return Promise.resolve(activeRegistration);
    }
    return activeRegistration.update().then(function () {
      if (activeRegistration.waiting) requestUpdate(activeRegistration.waiting);
      return activeRegistration;
    }).catch(function () { return null; });
  }

  function startUpdatePolling() {
    if (updatePollTimer !== null) return;
    updatePollTimer = window.setInterval(checkForUpdate, UPDATE_POLL_MS);
  }

  function register() {
    if (!('serviceWorker' in navigator)) return Promise.resolve(null);
    return navigator.serviceWorker.register('./service-worker.js', { updateViaCache: 'none' })
      .then(function (registration) {
        watchRegistration(registration);
        return registration;
      })
      .catch(function () {
        return null;
      });
  }

  function init() {
    ensureInstallButton();
    if (initialized) return;
    initialized = true;
    window.addEventListener('beforeinstallprompt', captureInstallPrompt);
    window.addEventListener('appinstalled', clearInstallPrompt);
    document.addEventListener('visibilitychange', function () {
      if (document.visibilityState === 'visible') checkForUpdate();
    });
    window.addEventListener('online', checkForUpdate);
    register().then(function () {
      startUpdatePolling();
      checkForUpdate();
    });
  }

  namespace.pwa = {
    init: init,
    register: register,
    captureInstallPrompt: captureInstallPrompt,
    showUpdateNotice: showUpdateNotice,
    checkForUpdate: checkForUpdate
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})();
