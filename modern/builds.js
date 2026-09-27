(function () {
  'use strict';

  var namespace = window.PandoraRemaked = window.PandoraRemaked || {};
  var adapter = namespace.adapter;
  var store = namespace.buildStore;
  var DEBOUNCE_MS = 300;
  var timer = null;
  var lastSavedPayload = null;
  var autosaveStatus = null;
  var managerOverlay = null;
  var managerStatus = null;
  var buildList = null;
  var buildNameInput = null;
  var buildCode = null;
  var initialized = false;
  var suppressAutosave = false;
  var previousBodyOverflow = '';

  function nowLabel() {
    var now = new Date();
    return now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
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
    if (payload.indexOf(',') === -1) return null;
    var expected = String(reference || currentPayload()).split(',').length;
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

  function flushAutosave() {
    clearScheduledAutosave();
    if (!adapter || !store) {
      var unavailable = { ok: false, error: { code: 'unavailable', message: 'Autosave is unavailable.' } };
      setAutosaveStatus('Autosave unavailable', 'error');
      return unavailable;
    }

    var payload;
    try {
      payload = currentPayload();
    } catch (error) {
      setAutosaveStatus('Autosave unavailable', 'error');
      return { ok: false, error: { code: 'serialize-failed', message: String(error.message || error) } };
    }

    if (payload === lastSavedPayload) {
      return { ok: true, unchanged: true, payload: payload };
    }

    var written = store.writeAutosave(payload);
    if (!written.ok) {
      setAutosaveStatus('Autosave warning: ' + written.error.code, 'warning');
      return written;
    }
    lastSavedPayload = payload;
    setAutosaveStatus('Saved ' + nowLabel(), 'saved');
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
      setAutosaveStatus('Autosave warning: ' + written.error.code, 'warning');
      return written;
    }
    lastSavedPayload = payload;
    setAutosaveStatus(statusText || ('Saved ' + nowLabel()), statusText === 'Restored autosave' ? 'restored' : 'saved');
    return { ok: true, record: written.record };
  }

  function restoreAutosaveOnce() {
    if (!store || !adapter) {
      setAutosaveStatus('Autosave unavailable', 'error');
      return;
    }
    var read = store.readAutosave();
    if (!read.ok) {
      try { lastSavedPayload = currentPayload(); } catch (error) { lastSavedPayload = null; }
      setAutosaveStatus('Autosave warning: saved data ignored', 'warning');
      return;
    }
    if (!read.record) {
      try { lastSavedPayload = currentPayload(); } catch (error) { lastSavedPayload = null; }
      setAutosaveStatus('Autosave ready', 'ready');
      return;
    }

    var loaded = loadPayloadSafely(read.record.payload);
    if (!loaded.ok) {
      try { lastSavedPayload = currentPayload(); } catch (error) { lastSavedPayload = null; }
      setAutosaveStatus('Autosave warning: saved data ignored', 'warning');
      return;
    }
    lastSavedPayload = loaded.payload;
    setAutosaveStatus('Restored autosave', 'restored');
  }

  function button(label, className) {
    var node = document.createElement('button');
    node.type = 'button';
    node.className = className || 'remaked-build-button';
    node.textContent = label;
    return node;
  }

  function renderBuilds() {
    if (!buildList || !store) return;
    buildList.textContent = '';
    var listed = store.listBuilds();
    if (!listed.ok && listed.error && listed.error.code !== 'corrupt-entries') {
      var blocked = document.createElement('div');
      blocked.className = 'remaked-build-empty';
      blocked.textContent = 'Saved builds are unavailable (' + listed.error.code + ').';
      buildList.appendChild(blocked);
      setManagerStatus('Saved build storage could not be read.', 'warning');
      return;
    }
    if (!listed.ok && listed.error && listed.error.code === 'corrupt-entries') {
      setManagerStatus('Some damaged saved builds were ignored.', 'warning');
    }
    if (!listed.builds.length) {
      var empty = document.createElement('div');
      empty.className = 'remaked-build-empty';
      empty.textContent = 'No named builds yet. Save the current character to create one.';
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

      var load = button('Load');
      load.dataset.remakedBuildLoad = '';
      load.addEventListener('click', function () {
        var storedBuild = store.getBuild(build.id);
        if (!storedBuild) {
          setManagerStatus('Build could not be found.', 'error');
          renderBuilds();
          return;
        }
        var loaded = loadPayloadSafely(storedBuild.payload);
        if (!loaded.ok) {
          setManagerStatus('Build is invalid and could not be loaded.', 'error');
          return;
        }
        var saved = persistLoadedPayload(loaded.payload, 'Saved loaded build');
        setManagerStatus(saved.ok ? ('Loaded “' + storedBuild.name + '”.') : 'Build loaded, but autosave is unavailable.', saved.ok ? 'success' : 'warning');
      });
      row.appendChild(load);

      var rename = button('Rename');
      rename.dataset.remakedBuildRename = '';
      rename.addEventListener('click', function () {
        var nextName = window.prompt('Rename build', build.name);
        if (nextName === null) return;
        var result = store.updateBuild(build.id, { name: nextName });
        if (!result.ok) {
          setManagerStatus('Build could not be renamed.', 'error');
          return;
        }
        setManagerStatus('Renamed to “' + result.build.name + '”.', 'success');
        renderBuilds();
      });
      row.appendChild(rename);

      var duplicate = button('Duplicate');
      duplicate.dataset.remakedBuildDuplicate = '';
      duplicate.addEventListener('click', function () {
        var result = store.duplicateBuild(build.id);
        if (!result.ok) {
          setManagerStatus('Build could not be duplicated.', 'error');
          return;
        }
        setManagerStatus('Created “' + result.build.name + '”.', 'success');
        renderBuilds();
      });
      row.appendChild(duplicate);

      var remove = button('Delete');
      remove.dataset.remakedBuildDelete = '';
      remove.addEventListener('click', function () {
        if (!window.confirm('Delete “' + build.name + '”?')) return;
        var result = store.deleteBuild(build.id);
        if (!result.ok) {
          setManagerStatus('Build could not be deleted.', 'error');
          return;
        }
        setManagerStatus('Deleted “' + build.name + '”.', 'success');
        renderBuilds();
      });
      row.appendChild(remove);
      buildList.appendChild(row);
    });
  }

  function closeManager() {
    if (!managerOverlay) return;
    managerOverlay.hidden = true;
    document.body.style.overflow = previousBodyOverflow;
  }

  function openManager() {
    if (!managerOverlay) return;
    previousBodyOverflow = document.body.style.overflow;
    managerOverlay.hidden = false;
    document.body.style.overflow = 'hidden';
    setManagerStatus('', 'ready');
    renderBuilds();
    if (buildNameInput) buildNameInput.focus();
  }

  function createManager() {
    var overlay = document.createElement('div');
    overlay.className = 'remaked-build-overlay';
    overlay.hidden = true;
    overlay.dataset.remakedBuildManagerOverlay = '';

    var panel = document.createElement('section');
    panel.className = 'remaked-build-manager';
    panel.dataset.remakedBuildManager = '';
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-modal', 'true');
    panel.setAttribute('aria-labelledby', 'remaked-build-manager-title');

    var header = document.createElement('div');
    header.className = 'remaked-build-manager-header';
    var title = document.createElement('h2');
    title.className = 'remaked-build-manager-title';
    title.id = 'remaked-build-manager-title';
    title.textContent = 'Build Manager';
    header.appendChild(title);
    var close = button('×', 'remaked-build-close');
    close.setAttribute('aria-label', 'Close Build Manager');
    close.addEventListener('click', closeManager);
    header.appendChild(close);
    panel.appendChild(header);

    var body = document.createElement('div');
    body.className = 'remaked-build-manager-body';

    var savedSection = document.createElement('section');
    savedSection.className = 'remaked-build-section';
    var savedTitle = document.createElement('h3');
    savedTitle.textContent = 'Named builds';
    savedSection.appendChild(savedTitle);

    var create = document.createElement('div');
    create.className = 'remaked-build-create';
    buildNameInput = document.createElement('input');
    buildNameInput.className = 'remaked-build-input';
    buildNameInput.type = 'text';
    buildNameInput.maxLength = 120;
    buildNameInput.placeholder = 'Build name (optional)';
    buildNameInput.dataset.remakedBuildName = '';
    create.appendChild(buildNameInput);
    var save = button('Save current', 'remaked-build-button remaked-build-button-primary');
    save.dataset.remakedSaveBuild = '';
    save.addEventListener('click', function () {
      var payload;
      try {
        payload = currentPayload();
      } catch (error) {
        setManagerStatus('Current build could not be serialized.', 'error');
        return;
      }
      var result = store.saveBuild(buildNameInput.value, payload);
      if (!result.ok) {
        setManagerStatus('Build could not be saved (' + result.error.code + ').', 'error');
        return;
      }
      buildNameInput.value = '';
      setManagerStatus('Saved “' + result.build.name + '”.', 'success');
      renderBuilds();
    });
    create.appendChild(save);
    savedSection.appendChild(create);

    buildList = document.createElement('div');
    buildList.className = 'remaked-build-list';
    buildList.dataset.remakedBuildList = '';
    savedSection.appendChild(buildList);
    body.appendChild(savedSection);

    var codeSection = document.createElement('section');
    codeSection.className = 'remaked-build-section';
    var codeTitle = document.createElement('h3');
    codeTitle.textContent = 'Build code';
    codeSection.appendChild(codeTitle);

    buildCode = document.createElement('textarea');
    buildCode.className = 'remaked-build-code';
    buildCode.spellcheck = false;
    buildCode.placeholder = 'Export the current build or paste a Pandora Saga Simulator code here.';
    buildCode.dataset.remakedBuildCode = '';
    codeSection.appendChild(buildCode);

    var codeActions = document.createElement('div');
    codeActions.className = 'remaked-build-code-actions';
    var exportButton = button('Export current');
    exportButton.dataset.remakedExportBuild = '';
    exportButton.addEventListener('click', function () {
      try {
        buildCode.value = currentPayload();
        setManagerStatus('Current build code exported.', 'success');
      } catch (error) {
        setManagerStatus('Current build could not be exported.', 'error');
      }
    });
    codeActions.appendChild(exportButton);

    var importButton = button('Import code', 'remaked-build-button remaked-build-button-primary');
    importButton.dataset.remakedImportBuild = '';
    importButton.addEventListener('click', function () {
      var candidate = buildCode.value.trim();
      var loaded = loadPayloadSafely(candidate);
      if (!loaded.ok) {
        setManagerStatus('Invalid build code; current build was not changed.', 'error');
        return;
      }
      var saved = persistLoadedPayload(loaded.payload, 'Saved imported build');
      setManagerStatus(saved.ok ? 'Build code imported.' : 'Build imported, but autosave is unavailable.', saved.ok ? 'success' : 'warning');
    });
    codeActions.appendChild(importButton);
    codeSection.appendChild(codeActions);
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
    document.addEventListener('keydown', function (event) {
      if (event.key === 'Escape' && managerOverlay && !managerOverlay.hidden) closeManager();
    });
    document.body.appendChild(overlay);
    managerOverlay = overlay;
  }

  function createBuildTools() {
    var tools = document.querySelector('[data-remaked-tools]');
    if (!tools) return;

    var buildsButton = button('Builds', 'remaked-tool-button');
    buildsButton.dataset.remakedBuildsOpen = '';
    buildsButton.addEventListener('click', openManager);
    tools.appendChild(buildsButton);

    autosaveStatus = document.createElement('span');
    autosaveStatus.className = 'remaked-autosave';
    autosaveStatus.dataset.remakedAutosaveStatus = '';
    autosaveStatus.setAttribute('aria-live', 'polite');
    autosaveStatus.textContent = 'Autosave…';
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
    restoreAutosaveOnce();
    bindLegacyChanges();
  }

  namespace.builds = {
    scheduleAutosave: scheduleAutosave,
    flushAutosave: flushAutosave,
    openManager: openManager,
    closeManager: closeManager,
    init: init
  };

  init();
})();
