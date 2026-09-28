(function () {
  'use strict';

  var namespace = window.PandoraRemaked = window.PandoraRemaked || {};
  var installPrompt = null;
  var installButton = null;
  var updateNotice = null;
  var waitingWorker = null;
  var initialized = false;

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
    installButton.textContent = 'Install App';
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

  function requestUpdate() {
    if (!waitingWorker || typeof waitingWorker.postMessage !== 'function') return;
    if (namespace.builds && typeof namespace.builds.flushAutosave === 'function') {
      namespace.builds.flushAutosave();
    }
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('controllerchange', function () {
        window.location.reload();
      }, { once: true });
    }
    var reload = updateNotice && updateNotice.querySelector('[data-remaked-update-reload]');
    if (reload) reload.disabled = true;
    waitingWorker.postMessage({ type: 'SKIP_WAITING' });
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
    message.textContent = 'New version available — ';
    updateNotice.appendChild(message);

    var reload = document.createElement('button');
    reload.type = 'button';
    reload.className = 'remaked-update-reload';
    reload.dataset.remakedUpdateReload = '';
    reload.textContent = 'Reload';
    reload.addEventListener('click', requestUpdate);
    updateNotice.appendChild(reload);

    document.body.appendChild(updateNotice);
    return updateNotice;
  }

  function watchRegistration(registration) {
    if (!registration) return;
    if (registration.waiting && navigator.serviceWorker.controller) {
      showUpdateNotice(registration.waiting);
    }
    registration.addEventListener('updatefound', function () {
      var installing = registration.installing;
      if (!installing) return;
      installing.addEventListener('statechange', function () {
        if (installing.state === 'installed' && navigator.serviceWorker.controller) {
          showUpdateNotice(registration.waiting || installing);
        }
      });
    });
  }

  function register() {
    if (!('serviceWorker' in navigator)) return Promise.resolve(null);
    return navigator.serviceWorker.register('./service-worker.js')
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
    register();
  }

  namespace.pwa = {
    init: init,
    register: register,
    captureInstallPrompt: captureInstallPrompt,
    showUpdateNotice: showUpdateNotice
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})();
