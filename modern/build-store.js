(function () {
  'use strict';

  var namespace = window.PandoraRemaked = window.PandoraRemaked || {};
  var AUTOSAVE_KEY = 'pandora-remaked.autosave.v1';
  var BUILDS_KEY = 'pandora-remaked.builds.v1';
  var SCHEMA = 1;
  var ENGINE = 'legacy-2.00';
  var MAX_NAME_CODEPOINTS = 60;

  function resultError(code, message, cause, extra) {
    var error = {
      code: code,
      message: message
    };
    if (cause && cause.name) error.causeName = String(cause.name);
    if (extra && typeof extra === 'object') {
      Object.keys(extra).forEach(function (key) {
        error[key] = extra[key];
      });
    }
    return error;
  }

  function classifyStorageError(error) {
    if (error && (error.name === 'QuotaExceededError' || error.name === 'NS_ERROR_DOM_QUOTA_REACHED')) {
      return resultError('quota-exceeded', 'Browser storage quota was exceeded.', error);
    }
    return resultError('storage-unavailable', 'Browser storage is unavailable.', error);
  }

  function storageGet(key) {
    try {
      return { ok: true, value: window.localStorage.getItem(key) };
    } catch (error) {
      return { ok: false, error: classifyStorageError(error) };
    }
  }

  function storageSet(key, value) {
    try {
      window.localStorage.setItem(key, value);
      return { ok: true };
    } catch (error) {
      return { ok: false, error: classifyStorageError(error) };
    }
  }

  function parseStoredJson(raw) {
    try {
      return { ok: true, value: JSON.parse(raw) };
    } catch (error) {
      return {
        ok: false,
        error: resultError('malformed-json', 'Stored data is not valid JSON.', error)
      };
    }
  }

  function safeStringify(value) {
    try {
      return { ok: true, value: JSON.stringify(value) };
    } catch (error) {
      return {
        ok: false,
        error: resultError('serialization-failed', 'Build data could not be serialized.', error)
      };
    }
  }

  function validIso(value) {
    return typeof value === 'string' && value.length > 0 && !Number.isNaN(Date.parse(value));
  }

  function validateEnvelope(envelope) {
    if (!envelope || typeof envelope !== 'object' || Array.isArray(envelope)) {
      return resultError('invalid-record', 'Stored record has an invalid shape.');
    }
    if (envelope.schema !== SCHEMA) {
      return resultError('unsupported-schema', 'Stored record uses an unsupported schema.', null, {
        found: envelope.schema,
        expected: SCHEMA
      });
    }
    if (envelope.engine !== ENGINE) {
      return resultError('engine-mismatch', 'Stored record targets a different simulator engine.', null, {
        found: envelope.engine,
        expected: ENGINE
      });
    }
    return null;
  }

  function validateAutosaveRecord(record) {
    var envelopeError = validateEnvelope(record);
    if (envelopeError) return envelopeError;
    if (typeof record.payload !== 'string' || !record.payload.length || !validIso(record.updatedAt)) {
      return resultError('invalid-record', 'Autosave record is incomplete or invalid.');
    }
    return null;
  }

  function validateBuildRecord(build) {
    return Boolean(
      build &&
      typeof build === 'object' &&
      !Array.isArray(build) &&
      typeof build.id === 'string' && build.id.length > 0 &&
      typeof build.name === 'string' && build.name.length > 0 &&
      validIso(build.createdAt) &&
      validIso(build.updatedAt) &&
      typeof build.payload === 'string' && build.payload.length > 0
    );
  }

  function cloneBuild(build) {
    return {
      id: build.id,
      name: build.name,
      createdAt: build.createdAt,
      updatedAt: build.updatedAt,
      payload: build.payload
    };
  }

  function codePoints(value) {
    var text = String(value);
    var points = [];
    var index = 0;
    while (index < text.length) {
      var first = text.charCodeAt(index);
      if (first >= 0xD800 && first <= 0xDBFF && index + 1 < text.length) {
        var second = text.charCodeAt(index + 1);
        if (second >= 0xDC00 && second <= 0xDFFF) {
          points.push(text.slice(index, index + 2));
          index += 2;
          continue;
        }
      }
      points.push(text.charAt(index));
      index += 1;
    }
    return points;
  }

  function normalizeName(value) {
    var source = value == null ? '' : String(value);
    var trimmed = source.trim();
    return codePoints(trimmed).slice(0, MAX_NAME_CODEPOINTS).join('');
  }

  function truncateForSuffix(base, suffix) {
    var suffixPoints = codePoints(suffix);
    var room = Math.max(0, MAX_NAME_CODEPOINTS - suffixPoints.length);
    return codePoints(base).slice(0, room).join('') + suffix;
  }

  function hasBuildName(builds, name) {
    return builds.some(function (build) { return build.name === name; });
  }

  function hasBuildId(builds, id) {
    return builds.some(function (build) { return build.id === id; });
  }

  function firstFreeBuildName(builds) {
    var index = 1;
    while (hasBuildName(builds, 'Build ' + index)) index += 1;
    return 'Build ' + index;
  }

  function duplicateName(source, builds) {
    var base = normalizeName(source) || 'Build';
    var suffix = ' copy';
    var candidate = truncateForSuffix(base, suffix);
    if (!hasBuildName(builds, candidate)) return candidate;
    var index = 2;
    while (true) {
      suffix = ' copy ' + index;
      candidate = truncateForSuffix(base, suffix);
      if (!hasBuildName(builds, candidate)) return candidate;
      index += 1;
    }
  }

  function createId(builds) {
    if (window.crypto && typeof window.crypto.randomUUID === 'function') {
      var id;
      do {
        id = window.crypto.randomUUID();
      } while (hasBuildId(builds, id));
      return id;
    }
    var index = 1;
    while (hasBuildId(builds, 'local-' + index)) index += 1;
    return 'local-' + index;
  }

  function writeBuildCollection(builds) {
    var serialized = safeStringify({
      schema: SCHEMA,
      engine: ENGINE,
      builds: builds.map(cloneBuild)
    });
    if (!serialized.ok) return serialized;
    return storageSet(BUILDS_KEY, serialized.value);
  }

  function readAutosave() {
    var stored = storageGet(AUTOSAVE_KEY);
    if (!stored.ok) return stored;
    if (stored.value == null) return { ok: true, record: null };

    var parsed = parseStoredJson(stored.value);
    if (!parsed.ok) return parsed;
    var validation = validateAutosaveRecord(parsed.value);
    if (validation) return { ok: false, error: validation };

    return {
      ok: true,
      record: {
        schema: SCHEMA,
        engine: ENGINE,
        updatedAt: parsed.value.updatedAt,
        payload: parsed.value.payload
      }
    };
  }

  function writeAutosave(payload) {
    if (typeof payload !== 'string' || !payload.length) {
      return { ok: false, error: resultError('invalid-payload', 'Autosave payload must be a non-empty string.') };
    }
    var record = {
      schema: SCHEMA,
      engine: ENGINE,
      updatedAt: new Date().toISOString(),
      payload: payload
    };
    var serialized = safeStringify(record);
    if (!serialized.ok) return serialized;
    var written = storageSet(AUTOSAVE_KEY, serialized.value);
    if (!written.ok) return written;
    return { ok: true, record: record };
  }

  function listBuilds() {
    var stored = storageGet(BUILDS_KEY);
    if (!stored.ok) return { ok: false, builds: [], error: stored.error };
    if (stored.value == null) return { ok: true, builds: [] };

    var parsed = parseStoredJson(stored.value);
    if (!parsed.ok) return { ok: false, builds: [], error: parsed.error };
    var envelopeError = validateEnvelope(parsed.value);
    if (envelopeError) return { ok: false, builds: [], error: envelopeError };
    if (!Array.isArray(parsed.value.builds)) {
      return {
        ok: false,
        builds: [],
        error: resultError('invalid-record', 'Named build collection has no builds array.')
      };
    }

    var valid = [];
    var invalidCount = 0;
    parsed.value.builds.forEach(function (build) {
      if (validateBuildRecord(build)) valid.push(cloneBuild(build));
      else invalidCount += 1;
    });

    if (invalidCount) {
      return {
        ok: false,
        builds: valid,
        error: resultError('corrupt-entries', 'Some saved builds are corrupt and were ignored.', null, {
          invalidCount: invalidCount
        })
      };
    }
    return { ok: true, builds: valid };
  }

  function cleanCollectionForMutation() {
    var listed = listBuilds();
    if (!listed.ok) return listed;
    return { ok: true, builds: listed.builds.slice() };
  }

  function saveBuild(name, payload) {
    if (typeof payload !== 'string' || !payload.length) {
      return { ok: false, error: resultError('invalid-payload', 'Build payload must be a non-empty string.') };
    }
    var collection = cleanCollectionForMutation();
    if (!collection.ok) return collection;

    var normalized = normalizeName(name);
    if (!normalized) normalized = firstFreeBuildName(collection.builds);
    var now = new Date().toISOString();
    var build = {
      id: createId(collection.builds),
      name: normalized,
      createdAt: now,
      updatedAt: now,
      payload: payload
    };
    collection.builds.push(build);
    var written = writeBuildCollection(collection.builds);
    if (!written.ok) return written;
    return { ok: true, build: cloneBuild(build) };
  }

  function updateBuild(id, patch) {
    var collection = cleanCollectionForMutation();
    if (!collection.ok) return collection;
    var index = collection.builds.findIndex(function (build) { return build.id === id; });
    if (index < 0) return { ok: false, error: resultError('not-found', 'Saved build was not found.') };

    var current = collection.builds[index];
    var next = cloneBuild(current);
    patch = patch && typeof patch === 'object' ? patch : {};
    if (Object.prototype.hasOwnProperty.call(patch, 'name')) {
      var normalized = normalizeName(patch.name);
      next.name = normalized || current.name;
    }
    if (Object.prototype.hasOwnProperty.call(patch, 'payload')) {
      if (typeof patch.payload !== 'string' || !patch.payload.length) {
        return { ok: false, error: resultError('invalid-payload', 'Build payload must be a non-empty string.') };
      }
      next.payload = patch.payload;
    }
    next.updatedAt = new Date().toISOString();
    collection.builds[index] = next;

    var written = writeBuildCollection(collection.builds);
    if (!written.ok) return written;
    return { ok: true, build: cloneBuild(next) };
  }

  function duplicateBuild(id) {
    var collection = cleanCollectionForMutation();
    if (!collection.ok) return collection;
    var source = collection.builds.find(function (build) { return build.id === id; });
    if (!source) return { ok: false, error: resultError('not-found', 'Saved build was not found.') };

    var now = new Date().toISOString();
    var copy = {
      id: createId(collection.builds),
      name: duplicateName(source.name, collection.builds),
      createdAt: now,
      updatedAt: now,
      payload: source.payload
    };
    collection.builds.push(copy);
    var written = writeBuildCollection(collection.builds);
    if (!written.ok) return written;
    return { ok: true, build: cloneBuild(copy) };
  }

  function deleteBuild(id) {
    var collection = cleanCollectionForMutation();
    if (!collection.ok) return collection;
    var index = collection.builds.findIndex(function (build) { return build.id === id; });
    if (index < 0) return { ok: false, error: resultError('not-found', 'Saved build was not found.') };
    var removed = collection.builds.splice(index, 1)[0];
    var written = writeBuildCollection(collection.builds);
    if (!written.ok) return written;
    return { ok: true, build: cloneBuild(removed) };
  }

  function getBuild(id) {
    var listed = listBuilds();
    var found = listed.builds.find(function (build) { return build.id === id; });
    return found ? cloneBuild(found) : null;
  }

  namespace.buildStore = {
    AUTOSAVE_KEY: AUTOSAVE_KEY,
    BUILDS_KEY: BUILDS_KEY,
    SCHEMA: SCHEMA,
    ENGINE: ENGINE,
    readAutosave: readAutosave,
    writeAutosave: writeAutosave,
    listBuilds: listBuilds,
    saveBuild: saveBuild,
    updateBuild: updateBuild,
    duplicateBuild: duplicateBuild,
    deleteBuild: deleteBuild,
    getBuild: getBuild
  };
})();
