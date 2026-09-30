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
    } catch (error) {
      // If the legacy engine itself cannot restore a payload produced by Store(),
      // there is nothing safer the Modern layer can do here.
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
      if (namespace.catalog) namespace.catalog.clearRecovery();
      return { ok: true, payload: loaded };
    } catch (error) {
      rollback(before);
      return { ok: false, error: error };
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
    var payload;
    try {
      if (window.location.hash.length > 20000) throw new Error('Share link too large');
      payload = decodeURIComponent(window.location.hash.slice(7));
      if (namespace.catalog) await namespace.catalog.preparePayload(payload);
      if (request !== shareRequest || hash !== window.location.hash) return false;
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
      if (request !== shareRequest || hash !== window.location.hash) return false;
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
  function importPayload(candidate) {
    var loaded = loadPayloadSafely(typeof candidate === 'string' ? candidate.trim() : candidate);
    if (!loaded.ok) return loaded;
    var saved = persistLoadedPayload(loaded.payload, t('builds.savedImported', null, 'Saved imported build'));
    return { ok: true, payload: loaded.payload, autosaved: saved.ok };
  }

  async function importPreparedPayload(candidate) {
    try { if (namespace.catalog) await namespace.catalog.preparePayload(candidate); }
    catch (error) { return { ok: false, error }; }
    return importPayload(candidate);
  }

  async function importCodeField(code, feedback) {
    feedback = feedback || function (key, state, fallback) { setManagerStatus(t(key, null, fallback), state); };
    var result = await importPreparedPayload(code.value.trim());
    if (!result.ok) {
      code.setAttribute('aria-invalid', 'true');
      feedback('builds.invalidCode', 'error', 'Invalid build code; current build was not changed.');
      code.focus(); return result;
    }
    code.removeAttribute('aria-invalid');
    feedback(result.autosaved ? 'builds.imported' : 'builds.importedNoAutosave', result.autosaved ? 'success' : 'warning', 'Build code imported.');
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
        try { if (namespace.catalog) await namespace.catalog.preparePayload(storedBuild.payload); }
        catch { setManagerStatus('Catalog revision unavailable; your current and saved builds were kept.', 'warning'); return; }
        var loaded = loadPayloadSafely(storedBuild.payload);
        if (!loaded.ok) {
          setManagerStatus(t('builds.invalid', null, 'Build is invalid and could not be loaded.'), 'error');
          return;
        }
        var saved = persistLoadedPayload(loaded.payload, t('builds.savedLoaded', null, 'Saved loaded build'));
        setManagerStatus(saved.ok
          ? t('builds.loaded', { name: storedBuild.name }, 'Loaded “' + storedBuild.name + '”.')
          : t('builds.loadedNoAutosave', null, 'Build loaded, but autosave is unavailable.'), saved.ok ? 'success' : 'warning');
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
    var tools = document.querySelector('[data-remaked-tools]');
    if (!tools) return;

    var buildsButton = button('Builds', 'remaked-tool-button', 'builds.button');
    buildsButton.dataset.remakedBuildsOpen = '';
    buildsButton.addEventListener('click', openManager);
    (document.querySelector('[data-remaked-build-actions]') || tools).appendChild(buildsButton);

    autosaveStatus = document.createElement('span');
    autosaveStatus.className = 'remaked-autosave';
    autosaveStatus.dataset.remakedAutosaveStatus = '';
    autosaveStatus.setAttribute('aria-live', 'polite');
    if (i18n && typeof i18n.bindText === 'function') i18n.bindText(autosaveStatus, 'builds.autosavePending');
    else autosaveStatus.textContent = 'Autosave…';
    tools.appendChild(autosaveStatus);
  }

  function bindLegacyChanges() {
    var legacyBody = document.getElementById('body');
    if (!legacyBody) return;
    var onChange = function (event) {
      if (suppressAutosave) return;
      if (!event.target || !legacyBody.contains(event.target)) return;
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
    Promise.resolve(namespace.catalog?.ready).then(async function () {
      restoreAutosaveOnce(); await loadSharedBuild();
      window.addEventListener('hashchange', loadSharedBuild); bindLegacyChanges();
    }).finally(function () { suppressAutosave = false; if (legacy) legacy.inert = false; });
  }

  namespace.builds = {
    importPayload: importPayload,
    importPreparedPayload: importPreparedPayload,
    importCodeField: importCodeField,
    scheduleAutosave: scheduleAutosave,
    flushAutosave: flushAutosave,
    openManager: openManager,
    closeManager: closeManager,
    init: init
  };

  init();
})();
