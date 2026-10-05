(function () {
  'use strict';

  var namespace = window.PandoraRemaked = window.PandoraRemaked || {};
  var adapter = namespace.adapter;
  var store = namespace.buildStore;
  var i18n = namespace.i18n;
  var DEBOUNCE_MS = 300;
  var timer = null;
  var lastSavedPayload = null;
  var autosaveStatus = null;
  var managerOverlay = null;
  var managerStatus = null;
  var buildList = null;
  var legacyRecovery = null;
  var buildNameInput = null;
  var buildCode = null;
  var shareUrl = null;
  var initialized = false;
  var suppressAutosave = false;
  var previousBodyOverflow = '';
  var catalogRevision = null, catalogUpdate = null, catalogStatus = null;
  var catalogRequest = 0, catalogBusy = false, catalogMessage = null;
  var restorationFailed = false;
  var loadRequest = 0;

  function t(key, values, fallback) {
    return i18n && typeof i18n.t === 'function' ? i18n.t(key, values) : fallback;
  }

  function nowLabel() {
    var now = new Date();
    var locale = i18n && i18n.getLocale && i18n.getLocale() === 'ru' ? 'ru-RU' : 'en';
    return now.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' });
  }

  function setAutosaveStatus(message, state) {
    if (!autosaveStatus) return;
    autosaveStatus.textContent = message;
    autosaveStatus.dataset.state = state || 'ready';
  }

  function setManagerStatus(message, state) {
    if (!managerStatus) return;
    managerStatus.textContent = message || '';
    managerStatus.dataset.state = state || 'ready';
  }

  function currentPayload() {
    return adapter.serialize();
  }

  function beginLoadIntent() {
    return { request: ++loadRequest, payload: currentPayload(), hash: location.hash };
  }

  function currentLoadIntent(intent, stillWanted) {
    try {
      return intent.request === loadRequest && intent.hash === location.hash && intent.payload === currentPayload() && (!stillWanted || stillWanted());
    } catch { return false; }
  }

  function cancelledLoad(intent, stillWanted) {
    return { ok: false, reason: 'cancelled', request: intent.request,
      silent: intent.request !== loadRequest || Boolean(stillWanted && !stillWanted()) };
  }

  async function prepareLoad(candidate, stillWanted) {
    var intent;
    try { intent = beginLoadIntent(); }
    catch (error) { return { ok: false, error: error }; }
    try { if (namespace.catalog) await namespace.catalog.preparePayload(candidate); }
    catch (error) {
      return currentLoadIntent(intent, stillWanted) ? { ok: false, error: error, request: intent.request } : cancelledLoad(intent, stillWanted);
    }
    return currentLoadIntent(intent, stillWanted) ? { ok: true, request: intent.request } : cancelledLoad(intent, stillWanted);
  }

  function refreshCatalogControls() {
    if (!catalogRevision) return;
    var revision = namespace.catalog.getRevision();
    catalogRevision.textContent = revision
      ? t('builds.catalogRevision', { revision: revision }, 'Catalog revision: ' + revision)
      : t('builds.catalogSource', null, 'Legacy source (revision 0)');
    catalogUpdate.disabled = catalogBusy;
    catalogUpdate.setAttribute('aria-busy', String(catalogBusy));
    catalogUpdate.textContent = catalogBusy
      ? t('builds.catalogChecking', null, 'Checking published catalog…')
      : t('builds.catalogUpdate', null, 'Update current build');
    catalogStatus.textContent = catalogMessage ? t(catalogMessage.key, catalogMessage.values, catalogMessage.fallback) : '';
    catalogStatus.dataset.state = catalogMessage?.state || 'ready';
  }

  function setCatalogStatus(key, state, values, fallback) {
    catalogMessage = { key: key, state: state, values: values, fallback: fallback };
    refreshCatalogControls();
  }

  function detachLoadedShareLink() {
    if (location.hash.indexOf('#build=') !== 0) return true;
    try {
      var url = new URL(location.href); url.hash = '';
      history.replaceState(history.state, '', url.href);
      shareRequest++; return true;
    } catch { return false; }
  }

  async function updateCurrentCatalog() {
    var catalog = namespace.catalog;
    if (!catalog || catalogBusy) return { ok: false, reason: 'unavailable' };
    if (restorationFailed) {
      setCatalogStatus('builds.catalogRestorationFailed', 'error', null, 'Recalculation failed and restoration could not be verified. Autosave is paused; reload to recover the untouched saved build.');
      return { ok: false, reason: 'restore-failed' };
    }
    if (catalog.needsRecovery()) {
      setCatalogStatus('builds.catalogProtected', 'warning', null, 'Restore or export the protected autosave first. It was not replaced.');
      return { ok: false, reason: 'protected-save' };
    }
    var before;
    try { before = currentPayload(); }
    catch (error) {
      setCatalogStatus('builds.serializeFailed', 'error', null, 'Current build could not be serialized.');
      return { ok: false, error: error };
    }
    var request = ++catalogRequest, hash = location.hash, shared = shareRequest, loading = ++loadRequest;
    catalogBusy = true; setCatalogStatus('builds.catalogChecking', 'ready', null, 'Checking published catalog…');
    try {
      var snapshot = await catalog.fetchSnapshot(null, { networkOnly: true });
      if (request !== catalogRequest) return { ok: false, reason: 'cancelled' };
      if (loading !== loadRequest || hash !== location.hash || shared !== shareRequest || before !== currentPayload() || catalog.needsRecovery()) {
        setCatalogStatus('builds.catalogCancelled', 'warning', null, 'Update cancelled: the character or link changed. Try again for the current build.');
        return { ok: false, reason: 'cancelled' };
      }
      if (snapshot.revision < catalog.getRevision()) throw new Error('Published head predates current revision');
      if (snapshot.revision === catalog.getRevision()) {
        setCatalogStatus('builds.catalogCurrent', 'success', null, 'This catalog is already current. No build or save was changed.');
        return { ok: true, unchanged: true };
      }
      try { catalog.preflightSnapshot(snapshot); }
      catch (error) {
        setCatalogStatus('builds.catalogIncompatible', 'warning', null, 'Update incompatible with equipped items, Soul slots or class requirements. Current build and saves kept.');
        return { ok: false, error: error };
      }
      var candidate = catalog.packPayload(catalog.unpackPayload(before).payload, snapshot.revision);
      var loaded = loadPayloadSafely(candidate);
      if (!loaded.ok) {
        setCatalogStatus(loaded.restored ? 'builds.catalogCalculationFailed' : 'builds.catalogRestorationFailed', 'error', null,
          loaded.restored ? 'Recalculation failed. The previous catalog, character and saves were restored.' : 'Recalculation failed and restoration could not be verified. Autosave is paused; reload to recover the untouched saved build.');
        return loaded;
      }
      clearScheduledAutosave();
      var saved = persistLoadedPayload(loaded.payload);
      var detached = detachLoadedShareLink();
      if (shareUrl) { shareUrl.hidden = true; shareUrl.value = ''; }
      setCatalogStatus(!saved.ok ? 'builds.catalogUnsaved' : !detached ? 'builds.catalogUrlWarning' : 'builds.catalogApplied',
        saved.ok && detached ? 'success' : 'warning', { revision: snapshot.revision },
        'Catalog ' + snapshot.revision + ' applied. Named builds keep their original revision.');
      return { ok: true, payload: loaded.payload, autosaved: saved.ok, detached: detached };
    } catch (error) {
      if (request === catalogRequest) setCatalogStatus('builds.catalogUnavailable', 'warning', null, 'Could not check the published catalog. Current build and saves kept; try again online.');
      return { ok: false, error: error };
    } finally {
      if (request === catalogRequest) { catalogBusy = false; refreshCatalogControls(); }
    }
  }

  function payloadLooksLikeCurrentCsv(payload, reference) {
    if (typeof payload !== 'string' || !payload.trim()) return false;
    try {
      if (namespace.catalog) {
        payload = namespace.catalog.unpackPayload(payload).payload;
        if (reference) reference = namespace.catalog.unpackPayload(reference).payload;
      }
    } catch { return false; }
    if (payload.indexOf(',') === -1) return null;
    var ref = reference || currentPayload();
    if (namespace.catalog) ref = namespace.catalog.unpackPayload(ref).payload;
    var expected = String(ref).split(',').length;
    var values = payload.split(',');
    if (values.length !== expected) return false;
    for (var index = 0; index < values.length; index += 1) {
      if (!values[index].trim() || !Number.isFinite(Number(values[index]))) return false;
    }
    return true;
  }

  function restoredStateIsSane(before, sourcePayload) {
    var after;
    try {
      after = currentPayload();
    } catch (error) {
      return false;
    }
    if (namespace.catalog) {
      try { before = namespace.catalog.unpackPayload(before).payload; after = namespace.catalog.unpackPayload(after).payload; }
      catch { return false; }
    }
    var beforeParts = before.split(',');
    var afterParts = after.split(',');
    if (afterParts.length !== beforeParts.length) return false;
    for (var index = 0; index < afterParts.length; index += 1) {
      if (!afterParts[index].trim() || !Number.isFinite(Number(afterParts[index]))) return false;
    }
    if (sourcePayload.indexOf(',') !== -1) {
      return payloadLooksLikeCurrentCsv(sourcePayload, before) === true;
    }
    return true;
  }

  function rollback(before) {
    try {
      suppressAutosave = true;
      adapter.load(before);
      if (currentPayload() !== before) throw new Error('Restored build differs from original');
      return { ok: true };
    } catch (error) {
      return { ok: false, error: error };
    } finally {
      suppressAutosave = false;
    }
  }

  function loadPayloadSafely(payload) {
    var before;
    try {
      before = currentPayload();
    } catch (error) {
      return { ok: false, error: error };
    }

    var csvShape = payloadLooksLikeCurrentCsv(payload, before);
    if (csvShape === false) {
      return { ok: false, error: new Error('Invalid Pandora Saga build code.') };
    }

    try {
      suppressAutosave = true;
      adapter.load(payload);
      if (!restoredStateIsSane(before, payload)) {
        throw new Error('Invalid Pandora Saga build code.');
      }
      var loaded = currentPayload();
      restorationFailed = false;
      catalogMessage = null;
      if (namespace.catalog) namespace.catalog.clearRecovery();
      refreshCatalogControls();
      return { ok: true, payload: loaded };
    } catch (error) {
      var restored = rollback(before);
      restorationFailed = !restored.ok;
      if (restorationFailed) setAutosaveStatus(t('builds.autosaveWarning', { code: 'restore-failed' }, 'Autosave paused: restore-failed'), 'warning');
      refreshCatalogControls();
      return { ok: false, error: error, restored: restored.ok, restorationError: restored.error };
    } finally {
      suppressAutosave = false;
    }
  }

  function clearScheduledAutosave() {
    if (timer !== null) {
      window.clearTimeout(timer);
      timer = null;
    }
  }

  var shareRequest = 0;
  async function loadSharedBuild() {
    var request = ++shareRequest, hash = window.location.hash;
    if (window.location.hash.indexOf('#build=') !== 0) return false;
    var payload, intent;
    try {
      intent = beginLoadIntent();
      if (window.location.hash.length > 20000) throw new Error('Share link too large');
      payload = decodeURIComponent(window.location.hash.slice(7));
      if (namespace.catalog) await namespace.catalog.preparePayload(payload);
      if (request !== shareRequest || hash !== window.location.hash || !currentLoadIntent(intent)) return false;
      // Links use plain numeric Legacy CSV, never untrusted compressed input.
      if (payloadLooksLikeCurrentCsv(payload) !== true) throw new Error('Invalid shared CSV');
      var loaded = loadPayloadSafely(payload);
      if (!loaded.ok) throw loaded.error;
      clearScheduledAutosave();
      lastSavedPayload = null;
      var saved = flushAutosave();
      // The character can load successfully even when browser storage is full.
      // Preserve the autosave warning rather than hiding it with a success label.
      if (saved.ok) setAutosaveStatus(t('builds.sharedLoaded', null, 'Shared build loaded'), 'restored');
      return true;
    } catch (error) {
      if (request !== shareRequest || hash !== window.location.hash || intent && !currentLoadIntent(intent)) return false;
      setAutosaveStatus(t('builds.invalidShare', null, 'Invalid share link; current build kept'), 'warning');
      return false;
    }
  }

  async function shareCurrentBuild() {
    try {
      var url = new URL(window.location.href);
      url.search = '';
      url.hash = 'build=' + encodeURIComponent(currentPayload());
      shareUrl.value = url.href;
      shareUrl.hidden = false;
      if (!navigator.clipboard || !navigator.clipboard.writeText) throw new Error('Clipboard unavailable');
      await navigator.clipboard.writeText(url.href);
      setManagerStatus(t('builds.shareCopied', null, 'Build link copied.'), 'success');
    } catch (error) {
      if (shareUrl && shareUrl.value) {
        shareUrl.hidden = false; shareUrl.focus(); shareUrl.select();
        setManagerStatus(t('builds.shareManual', null, 'Copy the link below to share your build.'), 'warning');
      } else setManagerStatus(t('builds.exportFailed', null, 'Current build could not be exported.'), 'error');
    }
  }

  function flushAutosave() {
    clearScheduledAutosave();
    if (restorationFailed) {
      setAutosaveStatus(t('builds.autosaveWarning', { code: 'restore-failed' }, 'Autosave paused: restore-failed'), 'warning');
      return { ok: false, error: { code: 'restore-failed' } };
    }
    if (namespace.catalog?.needsRecovery()) {
      setAutosaveStatus('Catalog unavailable; saved build kept. Autosave paused.', 'warning');
      return { ok: false, error: { code: 'catalog-unavailable' } };
    }
    if (!adapter || !store) {
      var unavailable = { ok: false, error: { code: 'unavailable', message: 'Autosave is unavailable.' } };
      setAutosaveStatus(t('builds.autosaveUnavailable', null, 'Autosave unavailable'), 'error');
      return unavailable;
    }

    var payload;
    try {
      payload = currentPayload();
    } catch (error) {
      setAutosaveStatus(t('builds.autosaveUnavailable', null, 'Autosave unavailable'), 'error');
      return { ok: false, error: { code: 'serialize-failed', message: String(error.message || error) } };
    }

    if (payload === lastSavedPayload) {
      return { ok: true, unchanged: true, payload: payload };
    }

    var written = store.writeAutosave(payload);
    if (!written.ok) {
      setAutosaveStatus(t('builds.autosaveWarning', { code: written.error.code }, 'Autosave warning: ' + written.error.code), 'warning');
      return written;
    }
    lastSavedPayload = payload;
    setAutosaveStatus(t('builds.savedAt', { time: nowLabel() }, 'Saved ' + nowLabel()), 'saved');
    return { ok: true, unchanged: false, payload: payload, record: written.record };
  }

  function scheduleAutosave() {
    if (suppressAutosave) return { ok: true, suppressed: true };
    clearScheduledAutosave();
    timer = window.setTimeout(function () {
      timer = null;
      flushAutosave();
    }, DEBOUNCE_MS);
    return { ok: true, scheduled: true };
  }

  function persistLoadedPayload(payload, statusText) {
    var written = store.writeAutosave(payload);
    if (!written.ok) {
      setAutosaveStatus(t('builds.autosaveWarning', { code: written.error.code }, 'Autosave warning: ' + written.error.code), 'warning');
      return written;
    }
    lastSavedPayload = payload;
    setAutosaveStatus(statusText || t('builds.savedAt', { time: nowLabel() }, 'Saved ' + nowLabel()), statusText === 'Restored autosave' ? 'restored' : 'saved');
    return { ok: true, record: written.record };
  }

  // Shared by both Modern import surfaces. Never call File('CodeLoad'): it
  // mutates before validation and also reads/writes unrelated Legacy slots.
  function commitImportedPayload(candidate) {
    var loaded = loadPayloadSafely(typeof candidate === 'string' ? candidate.trim() : candidate);
    if (!loaded.ok) return loaded;
    var saved = persistLoadedPayload(loaded.payload, t('builds.savedImported', null, 'Saved imported build'));
    var detached = detachLoadedShareLink();
    return { ok: true, payload: loaded.payload, autosaved: saved.ok, detached: detached };
  }

  function importPayload(candidate) {
    loadRequest++;
    return commitImportedPayload(candidate);
  }

  async function importPreparedPayload(candidate, stillWanted) {
    candidate = typeof candidate === 'string' ? candidate.trim() : candidate;
    var prepared = await prepareLoad(candidate, stillWanted);
    if (!prepared.ok) return prepared;
    var result = commitImportedPayload(candidate); result.request = prepared.request;
    return result;
  }

  async function importCodeField(code, feedback) {
    feedback = feedback || function (key, state, fallback) { setManagerStatus(t(key, null, fallback), state); };
    var draft = code.value;
    var result = await importPreparedPayload(draft, function () { return code.value === draft; });
    if (result.reason === 'cancelled') {
      if (!result.silent) feedback('builds.loadCancelled', 'warning', 'Loading cancelled. Current character and saved builds kept.');
      return result;
    }
    if (code.value !== draft || result.request !== undefined && result.request !== loadRequest) return result;
    if (!result.ok) {
      code.setAttribute('aria-invalid', 'true');
      feedback('builds.invalidCode', 'error', 'Invalid build code; current build was not changed.');
      code.focus(); return result;
    }
    code.removeAttribute('aria-invalid');
    feedback(!result.autosaved ? 'builds.importedNoAutosave' : !result.detached ? 'builds.urlWarning' : 'builds.imported',
      result.autosaved && result.detached ? 'success' : 'warning', 'Build code imported.');
    return result;
  }

  function restoreAutosaveOnce() {
    if (!store || !adapter) {
      setAutosaveStatus(t('builds.autosaveUnavailable', null, 'Autosave unavailable'), 'error');
      return;
    }
    var read = store.readAutosave();
    if (!read.ok) {
      try { lastSavedPayload = currentPayload(); } catch (error) { lastSavedPayload = null; }
      setAutosaveStatus(t('builds.autosaveIgnored', null, 'Autosave warning: saved data ignored'), 'warning');
      return;
    }
    if (!read.record) {
      try { lastSavedPayload = currentPayload(); } catch (error) { lastSavedPayload = null; }
      setAutosaveStatus(t('builds.autosaveReady', null, 'Autosave ready'), 'ready');
      return;
    }

    var loaded = loadPayloadSafely(read.record.payload);
    if (!loaded.ok) {
      try { lastSavedPayload = currentPayload(); } catch (error) { lastSavedPayload = null; }
      setAutosaveStatus(t('builds.autosaveIgnored', null, 'Autosave warning: saved data ignored'), 'warning');
      return;
    }
    lastSavedPayload = loaded.payload;
    setAutosaveStatus(t('builds.autosaveRestored', null, 'Restored autosave'), 'restored');
  }

  function button(label, className, key) {
    var node = document.createElement('button');
    node.type = 'button';
    node.className = className || 'remaked-build-button';
    if (key && i18n && typeof i18n.bindText === 'function') i18n.bindText(node, key);
    else node.textContent = label;
    return node;
  }

  function renderBuilds() {
    if (!buildList || !store) return;
    if (legacyRecovery) {
      var oldSlots = store.readLegacySlots();
      legacyRecovery.hidden = oldSlots.ok && !oldSlots.slots.length;
    }
    buildList.textContent = '';
    var listed = store.listBuilds();
    if (!listed.ok && listed.error && listed.error.code !== 'corrupt-entries') {
      var blocked = document.createElement('div');
      blocked.className = 'remaked-build-empty';
      blocked.textContent = t('builds.storageUnavailable', { code: listed.error.code }, 'Saved builds are unavailable (' + listed.error.code + ').');
      buildList.appendChild(blocked);
      setManagerStatus(t('builds.storageReadFailed', null, 'Saved build storage could not be read.'), 'warning');
      return;
    }
    if (!listed.ok && listed.error && listed.error.code === 'corrupt-entries') {
      setManagerStatus(t('builds.damagedIgnored', null, 'Some damaged saved builds were ignored.'), 'warning');
    }
    if (!listed.builds.length) {
      var empty = document.createElement('div');
      empty.className = 'remaked-build-empty';
      empty.textContent = t('builds.none', null, 'No named builds yet. Save the current character to create one.');
      buildList.appendChild(empty);
      return;
    }

    listed.builds.forEach(function (build) {
      var row = document.createElement('div');
      row.className = 'remaked-build-row';
      row.dataset.remakedBuildRow = '';
      row.dataset.buildId = build.id;

      var name = document.createElement('div');
      name.className = 'remaked-build-row-name';
      name.textContent = build.name;
      name.title = build.name;
      row.appendChild(name);

      var load = button('Load', null, 'builds.load');
      load.dataset.remakedBuildLoad = '';
      load.addEventListener('click', async function () {
        var storedBuild = store.getBuild(build.id);
        if (!storedBuild) {
          setManagerStatus(t('builds.notFound', null, 'Build could not be found.'), 'error');
          renderBuilds();
          return;
        }
        var prepared = await prepareLoad(storedBuild.payload, function () {
          return load.isConnected && managerOverlay.open && store.getBuild(build.id)?.payload === storedBuild.payload;
        });
        if (!prepared.ok) {
          if (prepared.reason === 'cancelled') {
            if (!prepared.silent) setManagerStatus(t('builds.loadCancelled', null, 'Loading cancelled. Current character and saved builds kept.'), 'warning');
          } else setManagerStatus(t('builds.loadUnavailable', null, 'Catalog revision unavailable; current character and saved builds kept.'), 'warning');
          return;
        }
        var loaded = loadPayloadSafely(storedBuild.payload);
        if (!loaded.ok) {
          setManagerStatus(t('builds.invalid', null, 'Build is invalid and could not be loaded.'), 'error');
          return;
        }
        var saved = persistLoadedPayload(loaded.payload, t('builds.savedLoaded', null, 'Saved loaded build'));
        var detached = detachLoadedShareLink();
        setManagerStatus(!detached ? t('builds.urlWarning', null, 'Old shared link could not be cleared. Export a new link before reloading.') : saved.ok
          ? t('builds.loaded', { name: store.getBuild(build.id).name }, 'Loaded “' + store.getBuild(build.id).name + '”.')
          : t('builds.loadedNoAutosave', null, 'Build loaded, but autosave is unavailable.'), saved.ok && detached ? 'success' : 'warning');
      });
      row.appendChild(load);

      var rename = button('Rename', null, 'builds.rename');
      rename.dataset.remakedBuildRename = '';
      rename.addEventListener('click', function () {
        var nextName = window.prompt(t('builds.renamePrompt', null, 'Rename build'), build.name);
        if (nextName === null) return;
        var result = store.updateBuild(build.id, { name: nextName });
        if (!result.ok) {
          setManagerStatus(t('builds.renameFailed', null, 'Build could not be renamed.'), 'error');
          return;
        }
        setManagerStatus(t('builds.renamed', { name: result.build.name }, 'Renamed to “' + result.build.name + '”.'), 'success');
        renderBuilds();
      });
      row.appendChild(rename);

      var duplicate = button('Duplicate', null, 'builds.duplicate');
      duplicate.dataset.remakedBuildDuplicate = '';
      duplicate.addEventListener('click', function () {
        var result = store.duplicateBuild(build.id);
        if (!result.ok) {
          setManagerStatus(t('builds.duplicateFailed', null, 'Build could not be duplicated.'), 'error');
          return;
        }
        setManagerStatus(t('builds.created', { name: result.build.name }, 'Created “' + result.build.name + '”.'), 'success');
        renderBuilds();
      });
      row.appendChild(duplicate);

      var remove = button('Delete', null, 'builds.delete');
      remove.dataset.remakedBuildDelete = '';
      remove.addEventListener('click', function () {
        if (!window.confirm(t('builds.deleteConfirm', { name: build.name }, 'Delete “' + build.name + '”?'))) return;
        var result = store.deleteBuild(build.id);
        if (!result.ok) {
          setManagerStatus(t('builds.deleteFailed', null, 'Build could not be deleted.'), 'error');
          return;
        }
        setManagerStatus(t('builds.deleted', { name: build.name }, 'Deleted “' + build.name + '”.'), 'success');
        renderBuilds();
      });
      row.appendChild(remove);
      buildList.appendChild(row);
    });
  }

  function closeManager() {
    if (!managerOverlay || managerOverlay.hidden) return;
    loadRequest++;
    var pending = catalogBusy;
    catalogRequest++; catalogBusy = false;
    if (pending) setCatalogStatus('builds.catalogCancelled', 'warning', null, 'Update cancelled: the character or link changed. Try again for the current build.');
    else refreshCatalogControls();
    managerOverlay.close();
    managerOverlay.hidden = true;
    document.body.style.overflow = previousBodyOverflow;
  }

  function openManager() {
    if (!managerOverlay || managerOverlay.open) return;
    previousBodyOverflow = document.body.style.overflow;
    managerOverlay.hidden = false;
    document.body.style.overflow = 'hidden';
    setManagerStatus('', 'ready');
    renderBuilds();
    refreshCatalogControls();
    managerOverlay.showModal();
    if (buildNameInput) buildNameInput.focus();
  }

  function createManager() {
    var overlay = document.createElement('dialog');
    overlay.className = 'remaked-build-overlay remaked-modal';
    overlay.hidden = true;
    overlay.dataset.remakedBuildManagerOverlay = '';

    var panel = document.createElement('section');
    panel.className = 'remaked-build-manager';
    panel.dataset.remakedBuildManager = '';
    overlay.setAttribute('aria-labelledby', 'remaked-build-manager-title');

    var header = document.createElement('div');
    header.className = 'remaked-build-manager-header';
    var title = document.createElement('h2');
    title.className = 'remaked-build-manager-title';
    title.id = 'remaked-build-manager-title';
    if (i18n && typeof i18n.bindText === 'function') i18n.bindText(title, 'builds.managerTitle');
    else title.textContent = 'Build Manager';
    header.appendChild(title);
    var close = button('×', 'remaked-build-close');
    if (i18n && typeof i18n.bindAttribute === 'function') i18n.bindAttribute(close, 'aria-label', 'builds.close');
    else close.setAttribute('aria-label', 'Close Build Manager');
    close.addEventListener('click', closeManager);
    header.appendChild(close);
    panel.appendChild(header);

    var body = document.createElement('div');
    body.className = 'remaked-build-manager-body';

    var savedSection = document.createElement('section');
    savedSection.className = 'remaked-build-section';
    var savedTitle = document.createElement('h3');
    if (i18n && typeof i18n.bindText === 'function') i18n.bindText(savedTitle, 'builds.named');
    else savedTitle.textContent = 'Named builds';
    savedSection.appendChild(savedTitle);

    var create = document.createElement('div');
    create.className = 'remaked-build-create';
    buildNameInput = document.createElement('input');
    buildNameInput.className = 'remaked-build-input';
    buildNameInput.type = 'text';
    buildNameInput.maxLength = 120;
    if (i18n && typeof i18n.bindAttribute === 'function') i18n.bindAttribute(buildNameInput, 'placeholder', 'builds.namePlaceholder');
    else buildNameInput.placeholder = 'Build name (optional)';
    buildNameInput.dataset.remakedBuildName = '';
    create.appendChild(buildNameInput);
    var save = button('Save current', 'remaked-build-button remaked-build-button-primary', 'builds.saveCurrent');
    save.dataset.remakedSaveBuild = '';
    save.addEventListener('click', function () {
      var payload;
      try {
        payload = currentPayload();
      } catch (error) {
        setManagerStatus(t('builds.serializeFailed', null, 'Current build could not be serialized.'), 'error');
        return;
      }
      var result = store.saveBuild(buildNameInput.value, payload);
      if (!result.ok) {
        setManagerStatus(t('builds.saveFailed', { code: result.error.code }, 'Build could not be saved (' + result.error.code + ').'), 'error');
        return;
      }
      buildNameInput.value = '';
      setManagerStatus(t('builds.saved', { name: result.build.name }, 'Saved “' + result.build.name + '”.'), 'success');
      renderBuilds();
    });
    create.appendChild(save);
    savedSection.appendChild(create);

    buildList = document.createElement('div');
    buildList.className = 'remaked-build-list';
    buildList.dataset.remakedBuildList = '';
    savedSection.appendChild(buildList);
    legacyRecovery = document.createElement('div');
    legacyRecovery.className = 'remaked-legacy-recovery';
    var recoveryNote = document.createElement('p');
    if (i18n) i18n.bindText(recoveryNote, 'builds.legacyHelp');
    else recoveryNote.textContent = 'Copy old FILE slots into named builds. Originals stay untouched; duplicate codes are skipped.';
    legacyRecovery.appendChild(recoveryNote);
    var recover = button('Copy Legacy FILE slots', null, 'builds.legacyImport');
    recover.dataset.remakedImportLegacy = '';
    recover.addEventListener('click', function () {
      var result = store.importLegacySlots();
      if (!result.ok) {
        setManagerStatus(t('builds.legacyFailed', { code: result.error.code }, 'FILE recovery failed (' + result.error.code + '). Originals and current build were kept.'), 'error');
        return;
      }
      renderBuilds();
      setManagerStatus(t('builds.legacyCopied', { added: result.added, skipped: result.skipped }, 'Copied ' + result.added + ' builds; skipped ' + result.skipped + ' duplicates. Original FILE slots kept.'), 'success');
    });
    legacyRecovery.appendChild(recover); savedSection.appendChild(legacyRecovery);
    body.appendChild(savedSection);

    var codeSection = document.createElement('section');
    codeSection.className = 'remaked-build-section';
    var codeTitle = document.createElement('h3');
    if (i18n && typeof i18n.bindText === 'function') i18n.bindText(codeTitle, 'builds.codeTitle');
    else codeTitle.textContent = 'Build code';
    codeSection.appendChild(codeTitle);

    // Move the actual source field and handlers, not a second Code interface.
    // TextSet and old File callbacks keep their original DOM/translation anchors;
    // calculator-controls supplies safe keyboard actions at this one location.
    buildCode = document.getElementById('InCode');
    buildCode.addEventListener('input', function () { loadRequest++; });
    var sourceField = buildCode.closest('li').parentElement;
    var sourceActions = sourceField.nextElementSibling;
    var workspace = document.createElement('div');
    workspace.dataset.remakedBuildCodeWorkspace = '';
    workspace.appendChild(sourceField); workspace.appendChild(sourceActions);
    workspace.querySelectorAll('[style]').forEach(function (node) { node.removeAttribute('style'); });
    buildCode.classList.add('remaked-build-input');
    buildCode.spellcheck = false;
    // Fail safely even if calculator-controls does not load: the preserved
    // click anchor must never fall back to unvalidated Modern CodeLoad.
    sourceActions.querySelector('li[onclick="File(\'CodeLoad\');"]').onclick = function () { return importCodeField(buildCode); };
    var sourceExport = sourceActions.querySelector('li[onclick*="Base64.toBase64"]');
    var retainedExport = sourceExport.onclick;
    sourceExport.dataset.remakedCompleteExport = '';
    sourceExport.onclick = function (event) {
      var prior = buildCode.value;
      try {
        var result = retainedExport.call(this, event);
        var payload = currentPayload();
        if (payload.indexOf('PS3:') === 0) buildCode.value = payload;
        return result;
      } catch (error) { buildCode.value = prior; throw error; }
    };
    if (i18n && typeof i18n.bindAttribute === 'function') i18n.bindAttribute(buildCode, 'placeholder', 'builds.codePlaceholder');
    else buildCode.placeholder = 'Export the current build or paste a Pandora Saga Simulator code here.';
    buildCode.dataset.remakedBuildCode = '';
    codeSection.appendChild(workspace);

    var codeActions = sourceActions.querySelector('ul');
    codeActions.classList.add('remaked-build-code-actions');
    var share = button('Share build', 'remaked-build-button', 'builds.share');
    share.dataset.remakedShareBuild = '';
    share.addEventListener('click', shareCurrentBuild);
    var shareAction = document.createElement('li'); shareAction.appendChild(share);
    codeActions.appendChild(shareAction);
    shareUrl = document.createElement('input');
    shareUrl.type = 'url'; shareUrl.readOnly = true; shareUrl.hidden = true;
    shareUrl.className = 'remaked-build-input';
    shareUrl.dataset.remakedShareUrl = '';
    if (i18n) i18n.bindAttribute(shareUrl, 'aria-label', 'builds.shareLink');
    codeSection.appendChild(shareUrl);
    body.appendChild(codeSection);

    if (namespace.catalog) {
      var catalogSection = document.createElement('section');
      catalogSection.className = 'remaked-build-section remaked-build-catalog';
      catalogRevision = document.createElement('h3');
      catalogRevision.dataset.remakedCatalogRevision = '';
      catalogSection.appendChild(catalogRevision);
      var catalogHelp = document.createElement('p');
      catalogHelp.id = 'remaked-catalog-update-help';
      if (i18n) i18n.bindText(catalogHelp, 'builds.catalogHelp');
      else catalogHelp.textContent = 'Updates only this character to the published catalog. Equipped items, Souls and effects are checked; named builds keep their original revision.';
      catalogSection.appendChild(catalogHelp);
      catalogUpdate = button('Update current build', null, 'builds.catalogUpdate');
      catalogUpdate.dataset.remakedCatalogUpdate = '';
      catalogUpdate.setAttribute('aria-describedby', catalogHelp.id);
      catalogUpdate.addEventListener('click', updateCurrentCatalog);
      catalogSection.appendChild(catalogUpdate);
      catalogStatus = document.createElement('p');
      catalogStatus.className = 'remaked-build-status'; catalogStatus.dataset.remakedCatalogStatus = '';
      catalogStatus.setAttribute('role', 'status'); catalogSection.appendChild(catalogStatus);
      body.appendChild(catalogSection); refreshCatalogControls();
      window.addEventListener('pandora-remaked:localechange', refreshCatalogControls);
    }

    managerStatus = document.createElement('p');
    managerStatus.className = 'remaked-build-status';
    managerStatus.dataset.remakedBuildManagerStatus = '';
    managerStatus.setAttribute('aria-live', 'polite');
    body.appendChild(managerStatus);

    panel.appendChild(body);
    overlay.appendChild(panel);
    overlay.addEventListener('click', function (event) {
      if (event.target === overlay) closeManager();
    });
    overlay.addEventListener('cancel', function (event) { event.preventDefault(); closeManager(); });
    document.body.appendChild(overlay);
    managerOverlay = overlay;
  }

  function createBuildTools() {
    var actions = document.querySelector('[data-remaked-build-actions]');
    var statusHost = document.querySelector('[data-remaked-nav-row]');
    if (!actions || !statusHost) return;

    var buildsButton = button('Builds', 'remaked-tool-button', 'builds.button');
    buildsButton.dataset.remakedBuildsOpen = '';
    buildsButton.addEventListener('click', openManager);
    actions.appendChild(buildsButton);

    autosaveStatus = document.createElement('span');
    autosaveStatus.className = 'remaked-autosave';
    autosaveStatus.dataset.remakedAutosaveStatus = '';
    autosaveStatus.setAttribute('aria-live', 'polite');
    if (i18n && typeof i18n.bindText === 'function') i18n.bindText(autosaveStatus, 'builds.autosavePending');
    else autosaveStatus.textContent = 'Autosave…';
    statusHost.appendChild(autosaveStatus);
  }

  function bindLegacyChanges() {
    var legacyBody = document.getElementById('body');
    if (!legacyBody) return;
    var onChange = function (event) {
      if (suppressAutosave) return;
      if (!event.target || !legacyBody.contains(event.target)) return;
      loadRequest++;
      scheduleAutosave();
    };
    legacyBody.addEventListener('change', onChange, true);
    legacyBody.addEventListener('input', onChange, true);
  }

  function init() {
    if (initialized) return;
    initialized = true;
    if (!adapter || !store) return;
    createBuildTools();
    createManager();
    var legacy = document.getElementById('body');
    suppressAutosave = true; if (legacy && namespace.catalog) legacy.inert = true;
    var startupRequest = loadRequest;
    Promise.resolve(namespace.catalog?.ready).then(async function () {
      if (startupRequest === loadRequest) { restoreAutosaveOnce(); await loadSharedBuild(); }
      window.addEventListener('hashchange', loadSharedBuild); bindLegacyChanges();
    }).finally(function () { suppressAutosave = false; if (legacy) legacy.inert = false; });
  }

  namespace.builds = {
    importPayload: importPayload,
    importPreparedPayload: importPreparedPayload,
    importCodeField: importCodeField,
    updateCurrentCatalog: updateCurrentCatalog,
    scheduleAutosave: scheduleAutosave,
    flushAutosave: flushAutosave,
    openManager: openManager,
    closeManager: closeManager,
    init: init
  };

  init();
})();
