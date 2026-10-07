(function () {
  'use strict';

  var namespace = window.PandoraRemaked = window.PandoraRemaked || {};
  var adapter = namespace.adapter;
  var store = namespace.buildStore;
  var i18n = namespace.i18n;
  var DEBOUNCE_MS = 300;
  var RESTORED_STATUS_MS = 4500;
  var CATALOG_POLL_MS = 10000;
  var timer = null;
  var autosaveSettleTimer = null;
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
  var catalogRevision = null, catalogStatus = null, catalogReport = null;
  var catalogRequest = 0, catalogBusy = false, catalogMessage = null;
  var catalogPollTimer = null, catalogHeadBusy = false, latestCatalogRevision = 0, latestCatalogImpactRevision = 0;
  var restorationFailed = false;
  var loadRequest = 0;

  function t(key, values, fallback) {
    var text = i18n && typeof i18n.t === 'function' ? i18n.t(key, values) : key;
    return text === key && fallback ? fallback : text;
  }

  function liveText(key, values) {
    var locale = i18n && typeof i18n.getLocale === 'function' ? i18n.getLocale() : 'en';
    var copy = {
      loadedUpdated: {
        en: 'Loaded and updated “{name}” to the current catalog.',
        ru: '«{name}» загружен и обновлён до актуального каталога.',
        jp: '「{name}」を読み込み、最新カタログへ更新しました。',
        tw: '已載入「{name}」並更新至最新目錄。'
      },
      autoApplied: {
        en: 'Catalog {revision} applied automatically.',
        ru: 'Каталог {revision} применён автоматически.',
        jp: 'カタログ {revision} を自動適用しました。',
        tw: '已自動套用目錄 {revision}。'
      },
      catalogHelp: {
        en: 'The site updates items, skills and other game data automatically. Saved builds always use current data; specific automatic changes are listed.',
        ru: 'Сайт сам обновляет предметы, навыки и другие игровые данные. Сохранённые билды используют текущие данные; конкретные изменения показываются в отчёте.',
        jp: 'アイテムやスキルなどのゲームデータは自動で更新されます。保存したビルドに影響する更新がある場合は、ビルドの横に警告が表示されます。',
        tw: '網站會自動更新物品、技能和其他遊戲資料。如果更新可能影響已儲存的配置，配置旁會顯示提醒。'
      },
      catalogLine: {
        en: 'Game data: version {revision} · updates automatically',
        ru: 'Игровые данные: версия {revision} · обновляются автоматически',
        jp: 'ゲームデータ: バージョン {revision} · 自動更新',
        tw: '遊戲資料：版本 {revision} · 自動更新'
      },
      catalogSourceLine: {
        en: 'Game data: base version · updates automatically',
        ru: 'Игровые данные: базовая версия · обновляются автоматически',
        jp: 'ゲームデータ: 基本バージョン · 自動更新',
        tw: '遊戲資料：基礎版本 · 自動更新'
      },
      catalogCheckingLine: {
        en: 'Game data: version {revision} · checking for updates…',
        ru: 'Игровые данные: версия {revision} · проверяем обновления…',
        jp: 'ゲームデータ: バージョン {revision} · 更新を確認中…',
        tw: '遊戲資料：版本 {revision} · 正在檢查更新…'
      }
    };
    var text = (copy[key] && (copy[key][locale] || copy[key].en)) || key;
    Object.keys(values || {}).forEach(function (name) {
      text = text.replace(new RegExp('\\{' + name + '\\}', 'g'), String(values[name]));
    });
    return text;
  }

  function nowLabel() {
    var now = new Date();
    var locale = i18n && i18n.getLocale && i18n.getLocale() === 'ru' ? 'ru-RU' : 'en';
    return now.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' });
  }

  function clearAutosaveSettleTimer() {
    if (autosaveSettleTimer !== null) {
      window.clearTimeout(autosaveSettleTimer);
      autosaveSettleTimer = null;
    }
  }

  function autosaveEnabledLabel() {
    return t('builds.autosaveEnabled', null, 'Autosave enabled');
  }

  function setAutosaveStatus(message, state) {
    clearAutosaveSettleTimer();
    if (!autosaveStatus) return;
    delete autosaveStatus.dataset.remakedI18n;
    delete autosaveStatus.dataset.remakedI18nValues;
    autosaveStatus.textContent = message;
    autosaveStatus.dataset.state = state || 'ready';
  }

  function showRestoredAutosaveStatus() {
    setAutosaveStatus(t('builds.autosaveRestored', null, 'Restored autosave'), 'restored');
    autosaveSettleTimer = window.setTimeout(function () {
      autosaveSettleTimer = null;
      if (!autosaveStatus || autosaveStatus.dataset.state !== 'restored') return;
      autosaveStatus.textContent = autosaveEnabledLabel();
      autosaveStatus.dataset.state = 'ready';
    }, RESTORED_STATUS_MS);
  }

  function setManagerStatus(message, state) {
    if (!managerStatus) return;
    managerStatus.textContent = message || '';
    managerStatus.dataset.state = state || 'ready';
  }

  function currentPayload() {
    return adapter.serialize();
  }

  function payloadRevision(payload) {
    if (!namespace.catalog) return 0;
    try { return namespace.catalog.unpackPayload(payload).revision; }
    catch { return 0; }
  }

  function setLatestCatalogRevision(next, impact) {
    next = Number(next);
    impact = Number(impact);
    if (!Number.isSafeInteger(next) || next < 0) return;
    if (!Number.isSafeInteger(impact) || impact < 0 || impact > next) impact = next;
    var changed = next !== latestCatalogRevision || impact !== latestCatalogImpactRevision;
    latestCatalogRevision = next;
    latestCatalogImpactRevision = impact;
    if (changed && managerOverlay && managerOverlay.open) renderBuilds();
    if (changed) window.dispatchEvent(new CustomEvent('pandora-remaked:buildcataloghead', {
      detail: { revision: next, impactRevision: impact }
    }));
  }

  function migrationText(changes) {
    var ru = i18n && i18n.getLocale() === 'ru';
    var lines = (changes || []).map(function (change) {
      return change.type === 'changed' ? change.name + ': ' + change.details.join(', ')
        : (ru ? 'Снято: ' : 'Removed: ') + change.name + ' (' +
          (ru ? { missing: 'больше нет в каталоге', incompatible: 'несовместимо', slots: 'меньше слотов душ' }
            : { missing: 'no longer in catalog', incompatible: 'incompatible', slots: 'fewer Soul slots' })[change.reason] + ')';
    });
    return lines.filter(function (line, index) { return lines.indexOf(line) === index; }).join('; ');
  }

  function showMigration(changes) {
    var text = migrationText(changes);
    if (!text) return;
    setCatalogStatus('builds.migrationReport', 'warning', null, text);
    catalogMessage.changes = changes; refreshCatalogControls();
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
    var changes = [];
    try { if (namespace.catalog) { var migration = await namespace.catalog.prepareCurrentPayload(candidate); candidate = migration.payload; changes = migration.changes; } }
    catch (error) {
      return currentLoadIntent(intent, stillWanted) ? { ok: false, error: error, request: intent.request } : cancelledLoad(intent, stillWanted);
    }
    return currentLoadIntent(intent, stillWanted) ? { ok: true, request: intent.request, candidate: candidate, changes: changes } : cancelledLoad(intent, stillWanted);
  }

  function refreshCatalogControls() {
    if (!catalogRevision) return;
    var revision = namespace.catalog.getRevision();
    catalogRevision.textContent = catalogBusy
      ? liveText('catalogCheckingLine', { revision: revision })
      : revision
        ? liveText('catalogLine', { revision: revision })
        : liveText('catalogSourceLine');
    var changes = catalogMessage?.changes;
    catalogStatus.textContent = changes ? changes.length <= 2 ? migrationText(changes) : (i18n?.getLocale() === 'ru' ? 'Изменений в билде: ' : 'Build changes: ') + changes.length : catalogMessage ? t(catalogMessage.key, catalogMessage.values, catalogMessage.fallback) : '';
    if (catalogReport) {
      catalogReport.hidden = !changes || changes.length <= 2;
      catalogReport.querySelector('summary').textContent = i18n?.getLocale() === 'ru' ? 'Показать изменения' : 'Show changes';
      catalogReport.querySelector('p').textContent = changes ? migrationText(changes) : '';
    }
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

  async function updateCurrentCatalog(options) {
    options = options || {};
    var catalog = namespace.catalog, automatic = Boolean(options.automatic);
    if (!catalog || catalogBusy || restorationFailed || catalog.needsRecovery()) return { ok: false, reason: 'unavailable' };
    var before = currentPayload(), request = ++catalogRequest, intent = beginLoadIntent();
    catalogBusy = true;
    try {
      var snapshot = await catalog.fetchSnapshot(null, { networkOnly: true });
      setLatestCatalogRevision(snapshot.revision, snapshot.impactRevision);
      if (!currentLoadIntent(intent)) return { ok: false, reason: 'cancelled' };
      if (snapshot.revision < catalog.getRevision()) throw new Error('Published head predates current revision');
      var listed = store.listBuilds(); if (!listed.ok) return listed;
      if (snapshot.revision === catalog.getRevision() && !listed.builds.some(function (build) { return payloadRevision(build.payload) < snapshot.revision; })) return { ok: true, unchanged: true };
      var revisions = listed.builds.map(function (build) { return payloadRevision(build.payload); }); revisions.push(payloadRevision(before));
      await Promise.all(revisions.filter(function (value, index) { return value !== snapshot.revision && revisions.indexOf(value) === index; }).map(function (value) {
        return catalog.fetchSnapshot(value).catch(function () { /* Optional identity/report metadata only. */ });
      }));
      if (!currentLoadIntent(intent)) return { ok: false, reason: 'cancelled' };
      var journal = store.beginRecovery(before, listed.builds);
      if (!journal.ok) { setAutosaveStatus(t('builds.autosaveWarning', { code: journal.error.code }, journal.error.code), 'warning'); return journal; }
      var migrated = catalog.migratePayload(before, snapshot);
      var loaded = loadPayloadSafely(migrated.payload, { prepared: true });
      if (!loaded.ok) {
        setCatalogStatus('builds.migrationFailed', 'error', null, loaded.restored ? 'Recalculation failed. Previous build and saves kept.' : 'Restoration could not be verified. Autosave paused; reload to retry.');
        return loaded;
      }
      clearScheduledAutosave();
      var saved = persistLoadedPayload(loaded.payload);
      if (!saved.ok) {
        var restored = rollback(before); restorationFailed = !restored.ok;
        return { ok: false, reason: 'autosave-failed', error: saved.error, restored: restored.ok };
      }
      var migratedBuilds = store.migrateBuilds(function (payload) { return catalog.migratePayload(payload, snapshot); });
      if (!migratedBuilds.ok) {
        setCatalogStatus('builds.migrationSaveFailed', 'warning', null, i18n?.getLocale() === 'ru' ? 'Билд обновлён. Сохранённые билды не удалось записать; исходные данные сохранены.' : 'Current build updated. Saved builds could not be written; original data kept.');
        return migratedBuilds;
      }
      store.finishRecovery();
      var detached = detachLoadedShareLink();
      if (shareUrl) { shareUrl.hidden = true; shareUrl.value = ''; }
      if (migrated.changes.length) showMigration(migrated.changes);
      else setCatalogStatus('builds.catalogApplied', 'success', { revision: snapshot.revision }, 'Game data updated.');
      if (managerOverlay?.open) renderBuilds();
      return { ok: true, payload: loaded.payload, autosaved: true, automatic: automatic, detached: detached,
        repaired: migrated.changes.filter(function (change) { return change.type === 'removed'; }).length, changes: migrated.changes };
    } catch (error) {
      setCatalogStatus('builds.catalogUnavailable', 'warning', null, 'Could not check current game data. Saved builds kept; try again online.');
      return { ok: false, error: error };
    } finally {
      if (request === catalogRequest) { catalogBusy = false; refreshCatalogControls(); }
    }
  }

  async function checkCatalogHead() {
    var catalog = namespace.catalog;
    if (!catalog || catalogHeadBusy || document.visibilityState === 'hidden' || navigator.onLine === false) return { ok: false, reason: 'paused' };
    catalogHeadBusy = true;
    try {
      var head = await catalog.fetchHead({ networkOnly: true });
      setLatestCatalogRevision(head, catalog.getHeadImpactRevision());
      var listed = store.listBuilds();
      if (head > catalog.getRevision() || listed.ok && listed.builds.some(function (build) { return payloadRevision(build.payload) < head; })) {
        return await updateCurrentCatalog({ automatic: true });
      }
      return { ok: true, unchanged: true, revision: head };
    } catch (error) {
      return { ok: false, error: error };
    } finally {
      catalogHeadBusy = false;
    }
  }

  function startCatalogPolling() {
    if (!namespace.catalog || catalogPollTimer !== null || location.origin !== 'https://bonaqu.github.io') return;
    catalogPollTimer = window.setInterval(checkCatalogHead, CATALOG_POLL_MS);
    window.addEventListener('online', checkCatalogHead);
    document.addEventListener('visibilitychange', function () {
      if (document.visibilityState === 'visible') checkCatalogHead();
    });
    window.addEventListener('pandora-remaked:cataloghead', function (event) {
      if (event.detail) setLatestCatalogRevision(event.detail.revision, event.detail.impactRevision);
    });
    checkCatalogHead();
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

  function loadPayloadSafely(payload, options) {
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
      var migrated = namespace.catalog && !options?.prepared ? namespace.catalog.migratePayload(payload) : { payload: payload, changes: [] };
      adapter.load(migrated.payload);
      if (!restoredStateIsSane(before, payload)) {
        throw new Error('Invalid Pandora Saga build code.');
      }
      var loaded = currentPayload();
      restorationFailed = false;
      catalogMessage = null;
      if (namespace.catalog) namespace.catalog.clearRecovery();
      refreshCatalogControls();
      return { ok: true, payload: loaded, changes: migrated.changes };
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
      payload = namespace.shareCodec.decode(decodeURIComponent(window.location.hash.slice(7)));
      if (namespace.catalog) { var migrated = await namespace.catalog.prepareCurrentPayload(payload); payload = migrated.payload; }
      if (request !== shareRequest || hash !== window.location.hash || !currentLoadIntent(intent)) return false;
      // Links use plain numeric Legacy CSV, never untrusted compressed input.
      if (payloadLooksLikeCurrentCsv(payload) !== true) throw new Error('Invalid shared CSV');
      var loaded = loadPayloadSafely(payload, { prepared: true });
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
      url.hash = 'build=' + namespace.shareCodec.encode(currentPayload());
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
    // During startup the Legacy engine still contains its defaults until the
    // previous autosave/import has been restored. A pagehide/controllerchange
    // in that window must never overwrite the stored character with defaults.
    if (suppressAutosave) return { ok: true, suppressed: true };
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
  function commitImportedPayload(candidate, options) {
    var loaded = loadPayloadSafely(typeof candidate === 'string' ? candidate.trim() : candidate, options);
    if (!loaded.ok) return loaded;
    var saved = persistLoadedPayload(loaded.payload, t('builds.savedImported', null, 'Saved imported build'));
    var detached = detachLoadedShareLink();
    showMigration(options?.changes || loaded.changes);
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
    var result = commitImportedPayload(prepared.candidate || candidate, { prepared: true, changes: prepared.changes }); result.request = prepared.request;
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
    var recovered = (!read.ok || !read.record) && store.readRecovery();
    if (recovered && !namespace.catalog?.needsRecovery()) {
      // Journal choices pass through the current catalog migration; historical
      // numbers never reach the calculator, even when recovering a failed write.
      read = { ok: true, record: { payload: recovered.payload } };
    }
    if (!read.ok) {
      try { lastSavedPayload = currentPayload(); } catch (error) { lastSavedPayload = null; }
      setAutosaveStatus(t('builds.autosaveIgnored', null, 'Autosave warning: saved data ignored'), 'warning');
      return;
    }
    if (!read.record) {
      try { lastSavedPayload = currentPayload(); } catch (error) { lastSavedPayload = null; }
      setAutosaveStatus(autosaveEnabledLabel(), 'ready');
      return;
    }

    if (namespace.catalog?.needsRecovery()) {
      setAutosaveStatus(i18n?.getLocale() === 'ru' ? 'Текущий каталог недоступен. Билд сохранён; повторите загрузку онлайн.' : 'Current catalog unavailable. Saved build kept; retry online.', 'warning'); return;
    }
    var loaded = loadPayloadSafely(read.record.payload);
    if (!loaded.ok) {
      try { lastSavedPayload = currentPayload(); } catch (error) { lastSavedPayload = null; }
      setAutosaveStatus(t('builds.autosaveIgnored', null, 'Autosave warning: saved data ignored'), 'warning');
      return;
    }
    lastSavedPayload = loaded.payload;
    showRestoredAutosaveStatus();
    if (loaded.changes?.length) showMigration(loaded.changes);
    if (loaded.payload !== read.record.payload) persistLoadedPayload(loaded.payload);
  }

  function button(label, className, key) {
    var node = document.createElement('button');
    node.type = 'button';
    node.className = className || 'remaked-build-button';
    if (key && i18n && typeof i18n.bindText === 'function') i18n.bindText(node, key);
    else node.textContent = label;
    return node;
  }

  async function loadNamedBuildLatest(storedBuild, stillWanted) {
    var intent = beginLoadIntent();
    try {
      var migrated = namespace.catalog ? await namespace.catalog.prepareCurrentPayload(storedBuild.payload) : { payload: storedBuild.payload, changes: [] };
      if (!currentLoadIntent(intent, stillWanted)) return cancelledLoad(intent, stillWanted);
      var journal = store.beginRecovery(storedBuild.payload); if (!journal.ok) return journal;
      var loaded = loadPayloadSafely(migrated.payload, { prepared: true });
      if (!loaded.ok) return loaded;
      var report = migrated.changes.length ? migrated.changes : storedBuild.migrationReport;
      var rewritten = store.updateBuild(storedBuild.id, { payload: loaded.payload, migrationReport: report || [] });
      if (!rewritten.ok) return { ok: true, loaded: loaded, rewriteFailed: true, changes: report };
      var saved = persistLoadedPayload(loaded.payload);
      if (saved.ok) store.finishRecovery();
      showMigration(report);
      return { ok: true, loaded: loaded, upgraded: migrated.payload !== storedBuild.payload, changes: report, autosave: saved };
    } catch (error) { return { ok: false, error: error }; }
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
      if (build.migrationReport?.length) {
        var report = document.createElement('details');
        var caption = document.createElement('summary'); caption.textContent = i18n?.getLocale() === 'ru' ? 'Изменения билда' : 'Build changes';
        report.appendChild(caption);
        var text = document.createElement('p'); text.textContent = migrationText(build.migrationReport); report.appendChild(text);
        name.appendChild(report);
      } else {
        name.textContent = build.name;
        name.title = build.name;
      }
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
        var result = await loadNamedBuildLatest(storedBuild, function () {
          return load.isConnected && managerOverlay.open && store.getBuild(build.id)?.payload === storedBuild.payload;
        });
        if (!result.ok) {
          if (result.reason === 'cancelled') {
            if (!result.silent) setManagerStatus(t('builds.loadCancelled', null, 'Loading cancelled. Current character and saved builds kept.'), 'warning');
          } else setManagerStatus(t('builds.loadUnavailable', null, 'Catalog revision unavailable; current character and saved builds kept.'), 'warning');
          return;
        }
        var saved = result.autosave || persistLoadedPayload(result.loaded.payload, t('builds.savedLoaded', null, 'Saved loaded build'));
        var detached = detachLoadedShareLink();
        renderBuilds();
        var currentBuild = store.getBuild(build.id);
        var loadedMessage = result.upgraded
            ? liveText('loadedUpdated', { name: currentBuild.name })
            : t('builds.loaded', { name: currentBuild.name }, 'Loaded “' + currentBuild.name + '”.');
        setManagerStatus(
          !detached ? t('builds.urlWarning', null, 'Old shared link could not be cleared. Export a new link before reloading.')
            : !saved.ok ? t('builds.loadedNoAutosave', null, 'Build loaded, but autosave is unavailable.')
            : loadedMessage,
          saved.ok && detached ? 'success' : 'warning'
        );
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
      catalogRevision = document.createElement('div');
      catalogRevision.className = 'remaked-build-catalog-line';
      catalogRevision.dataset.remakedCatalogRevision = '';
      catalogRevision.title = liveText('catalogHelp');
      catalogSection.appendChild(catalogRevision);
      catalogReport = document.createElement('details');
      catalogReport.hidden = true; catalogReport.dataset.remakedMigrationReport = '';
      catalogReport.appendChild(document.createElement('summary')); catalogReport.appendChild(document.createElement('p'));
      catalogStatus = document.createElement('p');
      catalogStatus.className = 'remaked-build-status'; catalogStatus.dataset.remakedCatalogStatus = '';
      catalogStatus.setAttribute('role', 'status'); catalogSection.appendChild(catalogStatus); catalogSection.appendChild(catalogReport);
      body.appendChild(catalogSection); refreshCatalogControls();
      window.addEventListener('pandora-remaked:localechange', function () {
        catalogRevision.title = liveText('catalogHelp');
        refreshCatalogControls();
        if (managerOverlay && managerOverlay.open) renderBuilds();
      });
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
    window.addEventListener('pandora-remaked:localechange', function () {
      if (!autosaveStatus) return;
      if (autosaveStatus.dataset.state === 'ready') {
        autosaveStatus.textContent = autosaveEnabledLabel();
      } else if (autosaveStatus.dataset.state === 'restored') {
        autosaveStatus.textContent = t('builds.autosaveRestored', null, 'Restored autosave');
      }
    });
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
    var archived = store.archiveRepairBackups();
    createBuildTools();
    createManager();
    if (!archived.ok) setAutosaveStatus(t('builds.autosaveWarning', { code: archived.error.code }, archived.error.code), 'warning');
    var legacy = document.getElementById('body');
    suppressAutosave = true; if (legacy && namespace.catalog) legacy.inert = true;
    var startupRequest = loadRequest;
    Promise.resolve(namespace.catalog?.ready).then(async function () {
      if (startupRequest === loadRequest) { restoreAutosaveOnce(); await loadSharedBuild(); }
      window.addEventListener('hashchange', loadSharedBuild);
      window.addEventListener('pagehide', flushAutosave);
      document.addEventListener('visibilitychange', function () { if (document.visibilityState === 'hidden') flushAutosave(); });
      bindLegacyChanges();
      window.setTimeout(startCatalogPolling, 0);
    }).finally(function () { suppressAutosave = false; if (legacy) legacy.inert = false; });
  }

  namespace.builds = {
    importPayload: importPayload,
    importPreparedPayload: importPreparedPayload,
    importCodeField: importCodeField,
    updateCurrentCatalog: updateCurrentCatalog,
    checkCatalogHead: checkCatalogHead,
    getLatestCatalogRevision: function () { return latestCatalogRevision; },
    getLatestCatalogImpactRevision: function () { return latestCatalogImpactRevision; },
    scheduleAutosave: scheduleAutosave,
    flushAutosave: flushAutosave,
    openManager: openManager,
    closeManager: closeManager,
    init: init
  };

  init();
})();
