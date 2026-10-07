(function () {
  'use strict';
  var namespace = window.PandoraRemaked = window.PandoraRemaked || {};
  if (namespace.catalog) return;
  var SOURCE_FINGERPRINT = '0f3b15c83d59b8c9c1a47920022895b8db57a526322d9dabea4900fb203518d1';
  var CHARACTER_SOURCE_FINGERPRINT = 'b41f034b9d6e86a14a39f1f040d99d45315002b4709c753effab0a62cf7e8227';
  var allowedCategories = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 20, 30, 31, 32, 33, 34, 35, 40, 41, 42, 43];
  var languages = ['jp', 'en', 'tw'];
  // Typed option IDs/units are a data protocol, not copied game formulas.
  var effectIds = [0, 1, 2, 3, 4, 5, 6, 7, 8, 10, 11, 16, 18, 20, 42, 49, 50, 51, 52, 60, 62, 65, 69, 70, 71, 72, 73, 74, 76, 77, 79, 133, 134, 135, 138, 139, 140, 141, 142, 143, 144, 145, 146, 147, 148, 149, 150, 151, 153, 154, 155, 156, 157, 158, 159, 160, 161, 162];
  var percentEffectIds = [6, 7, 18, 49, 52, 60, 62, 65];
  effectIds.push(21, 81);
  var baselineEquipment, baselineSouls, baselineClassMods, baselineSkills, revision = 0, recordsByTerm = Object.create(null);
  var passiveRecords = [], variantRecords = [], learningRecords = [], customLearningStates = Object.create(null);
  var profileRecords = [], selectedProfiles = Object.create(null);
  var learnedKey = '', learnedEntries = [], potentialEntries = [], learningProbeDepth = 0;
  var snapshots = Object.create(null), recovery = false, headRevision = 0, headImpactRevision = 0;
  var nativePassiveDefinitions = window.PandoraRemakedNativePassives || {};
  var PUBLIC_API = 'https://pandora-saga-simulator-remaked-admin-api.bonaqu.workers.dev/api/catalog';
  var PUBLIC_HEAD_API = PUBLIC_API + '/head';
  var databasePromise;
  function check(condition, message) { if (!condition) throw new Error(message); }
  function escaped(value) { return String(value == null ? '' : value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;'); }
  function normalizeUntranslatedItemName(value) {
    var text = String(value == null ? '' : value).trim();
    if (!text || text.charAt(0) !== '(') return text;
    while (text.length > 2 && text.charAt(0) === '(' && text.charAt(text.length - 1) === ')') text = text.slice(1, -1).trim();
    if (text.charAt(0) === '(' && !/[()]/.test(text.slice(1))) text = text.slice(1).trim();
    if (text.charAt(text.length - 1) === ')' && !/[()]/.test(text.slice(0, -1))) text = text.slice(0, -1).trim();
    return text;
  }
  function cloneEquipment(source) {
    var result = [];
    for (var language = 0; language < 3; language++) {
      result[language] = [];
      for (var category = 0; category < source[language].length; category++) result[language][category] = source[language][category].map(function (row) { return row.slice(); });
    }
    return result;
  }
  function cloneSouls(source) { return source.map(function (rows) { return rows.map(function (row) { return row.slice(); }); }); }
  function cloneSkills(source) { return source.map(function (groups) { return groups.map(function (rows) { return rows.map(function (row) { return row.slice(); }); }); }); }
  function captureBaseline() {
    if (baselineEquipment) return;
    check(window.EquipData && window.SoulData, 'Legacy catalog not initialized');
    baselineEquipment = cloneEquipment(window.EquipData); baselineSouls = cloneSouls(window.SoulData);
    // Legacy EN used outer parentheses as an untranslated-name marker. Keep
    // the identity/index untouched, but remove that presentation marker from
    // the effective Modern catalog.
    for (var category = 0; category < baselineEquipment[1].length; category++) {
      for (var itemIndex = 1; itemIndex < baselineEquipment[1][category].length; itemIndex++) {
        if (!baselineEquipment[1][category][itemIndex]) continue;
        var equipmentName = normalizeUntranslatedItemName(baselineEquipment[1][category][itemIndex][0]);
        baselineEquipment[1][category][itemIndex][0] = equipmentName;
        // Keep the live source array aligned with the captured baseline so a
        // failed catalog adoption can roll back byte-for-byte to the same UI
        // state instead of introducing a cosmetic name-only difference.
        if (window.EquipData[1]?.[category]?.[itemIndex]) window.EquipData[1][category][itemIndex][0] = equipmentName;
      }
    }
    for (var soulIndex = 1; soulIndex < baselineSouls[1].length; soulIndex++) {
      if (!baselineSouls[1][soulIndex]) continue;
      var soulName = normalizeUntranslatedItemName(baselineSouls[1][soulIndex][0]);
      baselineSouls[1][soulIndex][0] = soulName;
      if (window.SoulData[1]?.[soulIndex]) window.SoulData[1][soulIndex][0] = soulName;
    }
    baselineClassMods = window.Status.Mod.map(function (row) { return row.slice(); });
    baselineSkills = cloneSkills(window.Skill.slice(0, 3));
  }
  function sourceRow(record) {
    return record.kind === 'equipment' ? baselineEquipment[0][record.category][record.index] : baselineSouls[0][record.index];
  }
  function termFor(record) { return (record.kind === 'active' || record.kind === 'passive') && record.templateId ? record.id : record.kind === 'active' || record.kind === 'passive' ? 'skill_entry.' + record.category + '.' + record.index : record.kind === 'racial' ? 'racial_skill.' + record.category + '.' + record.index : record.kind === 'class' ? 'job.' + record.index : record.kind === 'equipment' ? 'equipment.' + record.category + '.' + record.index : 'soul.' + record.index; }
  function textMap(value, limit) {
    check(value && typeof value === 'object' && !Array.isArray(value), 'Invalid catalog text');
    Object.keys(value).forEach(function (language) { check(['en', 'ru', 'jp', 'tw'].indexOf(language) !== -1 && typeof value[language] === 'string' && value[language].length <= limit, 'Invalid catalog text'); });
  }
  function typedEffects(effects) {
    check(Array.isArray(effects) && effects.length <= effectIds.length + percentEffectIds.length, 'Invalid effects'); var stats = Object.create(null);
    effects.forEach(function (effect) {
      var pair = effect && effect.stat + ':' + effect.unit;
      check(effect && Object.keys(effect).every(function (key) { return ['stat', 'unit', 'value'].indexOf(key) !== -1; }) && effectIds.indexOf(effect.stat) !== -1 && !stats[pair], 'Unsupported or duplicate effect'); stats[pair] = true;
      check(effect.unit === 'flat' || effect.unit === 'percent' && percentEffectIds.indexOf(effect.stat) !== -1, 'Unsupported effect unit');
      check(typeof effect.value === 'number' && Number.isFinite(effect.value) && Math.abs(effect.value) <= 10000 && Number(effect.value.toFixed(2)) === effect.value, 'Invalid effect value');
    });
  }
  function validateLearning(required) {
    check(required && typeof required === 'object' && !Array.isArray(required) && Object.keys(required).every(function (key) {
      return ['classIds', 'classScope', 'minimumLevel', 'branches'].indexOf(key) !== -1;
    }), 'Invalid learning requirements');
    check(Array.isArray(required.classIds) && required.classIds.length <= 28 && required.classIds.every(function (id, index) {
      return typeof id === 'string' && /^job\.(?:[0-9]|1[0-9]|2[0-7])$/.test(id) && required.classIds.indexOf(id) === index;
    }), 'Invalid learning classes');
    check(['exact', 'descendants'].indexOf(required.classScope) !== -1 && Number.isInteger(required.minimumLevel) && required.minimumLevel >= 1 && required.minimumLevel <= 55, 'Invalid learning class scope/level');
    check(Array.isArray(required.branches) && required.branches.length <= 25, 'Invalid learning branches');
    var seen = Object.create(null);
    required.branches.forEach(function (gate) {
      check(gate && typeof gate === 'object' && !Array.isArray(gate) && Object.keys(gate).every(function (key) { return ['branchId', 'minimumPoints'].indexOf(key) !== -1; }) &&
        typeof gate.branchId === 'string' && /^skill_category\.(?:[0-9]|1[0-9]|2[0-4])$/.test(gate.branchId) && !seen[gate.branchId] &&
        Number.isInteger(gate.minimumPoints) && gate.minimumPoints >= 1 && gate.minimumPoints <= 200, 'Invalid or duplicate learning branch');
      seen[gate.branchId] = true;
    });
  }
  var profileParents = [null, 0, 1, 1, 0, 4, 4, null, 7, 8, 8, 7, 11, 11,
    null, 14, 15, 15, 14, 18, 18, null, 21, 22, 22, 21, 25, 25];
  function profileDomain(required) {
    var selected = required.classIds.map(function (id) { return Number(id.slice(4)); });
    var classes = profileParents.map(function (_, index) { return index; }).filter(function (index) {
      if (!selected.length || selected.indexOf(index) !== -1) return true;
      if (required.classScope === 'exact') return false;
      for (var parent = profileParents[index]; parent !== null; parent = profileParents[parent])
        if (selected.indexOf(parent) !== -1) return true;
      return false;
    });
    return { classes: classes, level: required.minimumLevel,
      branches: Object.fromEntries(required.branches.map(function (gate) { return [gate.branchId, gate.minimumPoints]; })) };
  }
  function containsProfile(outer, inner) {
    return inner.classes.every(function (id) { return outer.classes.indexOf(id) !== -1; }) && inner.level >= outer.level &&
      Object.keys(outer.branches).every(function (id) { return (inner.branches[id] || 0) >= outer.branches[id]; });
  }
  function validateProfiles(record) {
    check(record.active && !record.templateId && Array.isArray(record.profiles) && record.profiles.length >= 1 && record.profiles.length <= 8 &&
      JSON.stringify(record.profiles).length <= 32000, 'Invalid conditional skill profiles');
    var ids = Object.create(null), domains = record.profiles.map(function (profile) {
      check(profile && !Array.isArray(profile) && Object.keys(profile).every(function (key) {
        return ['id', 'names', 'description', 'learningRequirements', 'timing'].indexOf(key) !== -1;
      }), 'Unsupported skill profile field');
      check(typeof profile.id === 'string' && /^[a-z][a-z0-9._-]{0,63}$/.test(profile.id) && !ids[profile.id], 'Invalid or duplicate profile identity');
      ids[profile.id] = true;
      textMap(profile.names, 160); textMap(profile.description, 4000); check(Boolean(profile.names.en?.trim()), 'English profile name required');
      validateLearning(profile.learningRequirements);
      check(Array.isArray(profile.timing) && profile.timing.length === 4 && profile.timing.every(function (value, index) {
        return typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= (index === 0 ? 100000 : 86400) &&
          (index === 0 ? Number.isInteger(value) : Number(value.toFixed(3)) === value);
      }), 'Invalid profile timing');
      return profileDomain(profile.learningRequirements);
    });
    for (var left = 0; left < domains.length; left++) for (var right = left + 1; right < domains.length; right++) {
      var a = domains[left], b = domains[right];
      if (!a.classes.some(function (id) { return b.classes.indexOf(id) !== -1; })) continue;
      check(containsProfile(a, b) !== containsProfile(b, a), 'Conditional profile learning domains overlap ambiguously');
    }
  }
  function validate(snapshot) {
    captureBaseline();
    check(snapshot && snapshot.ok === true && snapshot.schemaVersion === 1 && snapshot.sourceFingerprint === SOURCE_FINGERPRINT, 'Catalog source/version mismatch');
    check(Number.isSafeInteger(snapshot.revision) && snapshot.revision >= 0 && snapshot.revision <= 999999999 && Array.isArray(snapshot.records) && snapshot.records.length <= 4000, 'Invalid catalog snapshot');
    // During a rolling deploy an older Worker can briefly serve a snapshot
    // without impactRevision. Treat that conservatively as build-affecting.
    if (!Number.isSafeInteger(snapshot.impactRevision)) snapshot.impactRevision = snapshot.revision;
    check(snapshot.impactRevision >= 0 && snapshot.impactRevision <= snapshot.revision, 'Invalid catalog impact revision');
    check(snapshot.revision > 0 || snapshot.records.length === 0, 'Source revision must not contain overrides');
    var seen = Object.create(null), variants = 0;
    snapshot.records.forEach(function (record) {
      check(record && ['equipment', 'soul', 'class', 'racial', 'active', 'passive'].indexOf(record.kind) !== -1 && typeof record.id === 'string', 'Invalid item identity');
      if (record.kind === 'active' || record.kind === 'passive') {
        check(snapshot.characterSourceFingerprint === CHARACTER_SOURCE_FINGERPRINT, 'Skill source/version mismatch');
        check(Number.isInteger(record.category) && record.category >= 0 && record.category < 25 && Number.isInteger(record.index) && record.index >= 0 && record.id === termFor(record), 'Invalid skill identity');
        var variant = Object.prototype.hasOwnProperty.call(record, 'templateId');
        if (variant) {
          check(++variants <= 256 && record.templateId === 'skill_entry.' + record.category + '.' + record.index && new RegExp('^modern\\.' + record.kind + '\\.[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$').test(record.id), 'Invalid skill variant identity/template');
        }
        var skill = baselineSkills[0][record.category][record.index];
        check(skill && record.active === Boolean(skill[4]) && record.kind === (record.active ? 'active' : 'passive') && record.prerequisiteCode === skill[9] && record.nativeEffectPolicy === (variant ? 'template-gate-only' : record.intrinsicEffectMode === 'replace' ? 'typed-replacement' : 'retained-plus-bonus'), 'Skill mechanics/source mismatch');
        var skillFields = ['id', 'kind', 'category', 'index', 'names', 'description', 'active', 'prerequisiteCode', 'nativeEffectPolicy', 'timing', 'effects', 'bonusRequirements', 'learningRequirements', 'intrinsicEffectMode'];
        if (!variant && record.active) skillFields.push('profiles');
        if (variant) skillFields.push('templateId');
        check(Object.keys(record).every(function (key) { return skillFields.indexOf(key) !== -1; }), 'Unsupported skill field');
        if (Object.prototype.hasOwnProperty.call(record, 'learningRequirements')) validateLearning(record.learningRequirements);
        if (Object.prototype.hasOwnProperty.call(record, 'profiles')) validateProfiles(record);
        if (Object.prototype.hasOwnProperty.call(record, 'intrinsicEffectMode')) check(!variant && record.kind === 'passive' && Object.prototype.hasOwnProperty.call(nativePassiveDefinitions, record.id) && ['add', 'replace'].indexOf(record.intrinsicEffectMode) !== -1, 'Unsupported intrinsic passive mode or identity');
        check(!seen[record.id], 'Duplicate skill identity'); seen[record.id] = true;
        textMap(record.names, 160); textMap(record.description, 4000); check(Boolean(record.names.en?.trim()), 'English skill name required');
        check(Array.isArray(record.timing) && record.timing.length === 4 && record.timing.every(function (value, index) { return typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= (index === 0 ? 100000 : 86400) && (index === 0 ? Number.isInteger(value) : Number(value.toFixed(3)) === value); }), 'Invalid skill timing');
        typedEffects(record.effects);
        if (record.active) check(record.effects.length === 0 && record.bonusRequirements === null, 'Active combat extensions are not supported');
        else {
          check(record.timing.every(function (value, index) { return value === skill[5 + index]; }), 'Passive timing must preserve source');
          var required = record.bonusRequirements;
          check(required && Object.keys(required).every(function (key) { return ['weaponCategories', 'shieldRequired', 'ridingRequired'].indexOf(key) !== -1; }) && typeof required.shieldRequired === 'boolean' && typeof required.ridingRequired === 'boolean', 'Invalid passive requirements');
          check(Array.isArray(required.weaponCategories) && required.weaponCategories.length <= 15 && required.weaponCategories.every(function (category, index) { return Number.isInteger(category) && category >= -1 && category <= 13 && required.weaponCategories.indexOf(category) === index; }), 'Invalid passive weapon requirements');
        }
        return;
      }
      if (record.kind === 'racial') {
        check(snapshot.characterSourceFingerprint === CHARACTER_SOURCE_FINGERPRINT, 'Racial source/version mismatch');
        check(Number.isInteger(record.category) && record.category >= 0 && record.category < 6 && Number.isInteger(record.index) && record.index >= 0 && record.index < 3 && record.id === termFor(record), 'Invalid racial passive identity');
        check(Object.keys(record).every(function (key) { return ['id', 'kind', 'category', 'index', 'names', 'description', 'effectMode', 'effects', 'bonusRequirements', 'calculationNotes'].indexOf(key) !== -1; }), 'Unsupported racial field');
        check(!seen[record.id], 'Duplicate racial identity'); seen[record.id] = true;
        textMap(record.names, 160); textMap(record.description, 4000); check(Boolean(record.names.en?.trim()), 'English racial name required');
        check(['preserve', 'add', 'replace'].indexOf(record.effectMode) !== -1 && Array.isArray(record.effects), 'Invalid racial effect mode');
        check(record.effectMode !== 'preserve' || record.effects.length === 0, 'Preserve mode cannot discard effects');
        typedEffects(record.effects);
        if (record.bonusRequirements !== undefined) {
          var required = record.bonusRequirements;
          check(required && Object.keys(required).every(function (key) { return ['weaponCategories', 'shieldRequired', 'ridingRequired'].indexOf(key) !== -1; }) && typeof required.shieldRequired === 'boolean' && typeof required.ridingRequired === 'boolean', 'Invalid racial bonus requirements');
          check(Array.isArray(required.weaponCategories) && required.weaponCategories.length <= 15 && required.weaponCategories.every(function (category, index) { return Number.isInteger(category) && category >= -1 && category <= 13 && required.weaponCategories.indexOf(category) === index; }), 'Invalid racial weapon requirements');
        }
        if (record.calculationNotes !== undefined) textMap(record.calculationNotes, 1600);
        return;
      }
      if (record.kind === 'class') {
        check(snapshot.characterSourceFingerprint === CHARACTER_SOURCE_FINGERPRINT, 'Class source/version mismatch');
        check(Number.isInteger(record.index) && record.index >= 0 && record.index < baselineClassMods.length && record.category === null && record.id === termFor(record), 'Invalid class lineage');
        check(Object.keys(record).every(function (key) { return ['id', 'kind', 'category', 'index', 'names', 'description', 'progression'].indexOf(key) !== -1; }), 'Unsupported class field');
        check(!seen[record.id], 'Duplicate class identity'); seen[record.id] = true;
        textMap(record.names, 160); textMap(record.description, 4000); check(Boolean(record.names.en?.trim()), 'English class name required');
        check(Array.isArray(record.progression) && record.progression.length === 6 && record.progression.every(function (value, index) {
          return typeof value === 'number' && Number.isFinite(value) && value >= (index < 2 ? 0 : 0.0001) && value <= 100000 && (index >= 2 || Number.isInteger(value));
        }), 'Invalid class progression parameters');
        return;
      }
      check(record.kind === 'equipment' ? allowedCategories.indexOf(record.category) !== -1 : record.category === null, 'Unsupported item type');
      check(Number.isInteger(record.index) && record.index > 0 && record.index < 10000, 'Invalid item index');
      check(record.index < (record.kind === 'equipment' ? baselineEquipment[0][record.category].length : baselineSouls[0].length) + 1024, 'Catalog allocation exceeds safe client capacity');
      var term = termFor(record); check(!seen[term], 'Duplicate item identity'); seen[term] = true;
      check(!seen['id:' + record.id], 'Duplicate stable item ID'); seen['id:' + record.id] = true;
      check(record.engineId === (record.kind === 'equipment' ? record.category * 10000 + record.index : record.index), 'Encoded item ID mismatch');
      var original = sourceRow(record);
      check(original ? record.id === term : record.id.indexOf('modern.' + record.kind + '.') === 0 && record.engineKey === 'Modern:' + record.id, 'Item identity does not match source');
      check(Number.isInteger(record.level) && record.level >= 0 && record.level <= 1000 && Number.isInteger(record.sockets) && record.sockets >= 0 && record.sockets <= 3, 'Invalid item requirements');
      check(typeof record.disabled === 'boolean', 'Invalid item availability');
      ['names', 'modifiers'].forEach(function (field) { textMap(record[field], 160); });
      ['description', 'notes', 'acquisition'].forEach(function (field) { textMap(record[field], 4000); });
      check(Boolean(record.names.en?.trim()), 'English item name required');
      check(Array.isArray(record.compatibility) && record.compatibility.length === (record.kind === 'equipment' ? 36 : 8) && record.compatibility.every(function (flag) { return flag === 0 || flag === 1; }), 'Invalid compatibility flags');
      check(typeof record.calculationCode === 'string' && record.calculationCode.length <= 8192, 'Invalid engine data');
      record.calculationCode.split('_').filter(Boolean).forEach(function (token) {
        var match = token.match(/^(\d{1,3})=(-?\d+(?:\.\d{1,2})?%?|W\d+)$/);
        // An existing malformed/unsupported Legacy marker is not rewritten by
        // this codec. It is accepted only if it was already in that exact row.
        check(match ? Number(match[1]) < window.Name.Option.length && Number.isFinite(Number(match[2].replace(/^W/, '').replace(/%$/, ''))) && Math.abs(Number(match[2].replace(/^W/, '').replace(/%$/, ''))) <= 10000 : original && String(original[7]).split('_').indexOf(token) !== -1, 'Unsupported engine effect');
      });
      if (record.kind === 'equipment' && record.category <= 13) check(/^18=W\d+(?:_|$)/.test(record.calculationCode), 'Missing weapon attack');
      [record.parameter6, record.trailing].forEach(function (value) { check(typeof value === 'string' && value.length <= 160 || typeof value === 'number' && Number.isFinite(value), 'Invalid auxiliary engine data'); });
      check(Array.isArray(record.soulParameters) && record.soulParameters.length === 2 && record.soulParameters.every(function (value) { return typeof value === 'string' && value.length <= 160 || typeof value === 'number' && Number.isFinite(value); }), 'Invalid Soul data');
    });
  }
  function placeholder(source) {
    var row = source.slice(); row[0] = '[Unavailable catalog record]'; row[7] = '';
    for (var index = 8; index < row.length; index++) row[index] = 0;
    row._pandoraPlaceholder = true; return row;
  }
  function selectedStateExists(equipment, souls) {
    for (var slot = 0; slot < window.Status.Equip.length; slot++) {
      var state = window.Status.Equip[slot], id = Number(state[0]); var category = Math.floor(id / 10000), index = id % 10000;
      var row = equipment[0]?.[category]?.[index];
      check(row && !row._pandoraPlaceholder, 'Current build needs another catalog revision');
      check(!index || row[10 + window.Status.Job[0]] && row[16 + window.Status.Job[2]], 'Current build is incompatible with this catalog revision');
      for (var socket = 4; socket <= 6; socket++) {
        var soul = Number(state[socket]); if (!soul) continue;
        check(souls[0][soul] && !souls[0][soul]._pandoraPlaceholder && socket - 3 <= row[5], 'Current Soul needs another catalog revision');
        // The eight flags use the original ListCreate('Soul') slot mapping;
        // reject before SoulSelect can silently clear an incompatible Soul.
        var soulSlot = slot <= 6 ? slot : slot === 11 ? 7 : -1;
        check(soulSlot >= 0 && souls[0][soul][8 + soulSlot] === 1, 'Current Soul is incompatible with this catalog revision');
      }
    }
  }
  function refreshAvailability() {
    document.querySelectorAll('select[id^="SelEquip_"]').forEach(function (select) {
      var match = select.id.match(/^SelEquip_\d+_(0|[4-6])$/); if (!match) return;
      var kind = Number(match[1]) === 0 ? 'equipment' : 'soul';
      for (var index = 0; index < select.options.length; index++) {
        var option = select.options[index], id = Number(option.value);
        var term = kind === 'equipment' ? 'equipment.' + Math.floor(id / 10000) + '.' + id % 10000 : 'soul.' + id;
        option.disabled = Boolean(recordsByTerm[term]?.disabled);
      }
    });
  }
  function applySnapshot(snapshot, options) {
    validate(snapshot); snapshot = structuredClone(snapshot); options = options || {};
    var equipment = cloneEquipment(baselineEquipment), souls = cloneSouls(baselineSouls), terms = Object.create(null);
    var classMods = baselineClassMods.map(function (row) { return row.slice(); });
    var skills = cloneSkills(baselineSkills), passives = [], additions = [];
    snapshot.records.forEach(function (record) {
      terms[termFor(record)] = record;
      if (record.kind === 'active' || record.kind === 'passive') {
        // Variants inherit a source learning gate, not its intrinsic mechanics
        // or array slot. Never append/reorder source rows: SkillList's temporary
        // compound prerequisite state is order-dependent. This also avoids
        // sparse indexes, reused IDs and accidental original-skill renaming.
        if (record.templateId) {
          additions.push(record);
          if (record.kind === 'passive' && record.effects.length) passives.push(record);
          return;
        }
        projectSkill(record, record, skills);
        if (record.kind === 'passive' && record.effects.length) passives.push(record);
        return;
      }
      if (record.kind === 'racial') return;
      if (record.kind === 'class') { classMods[record.index] = record.progression.slice(); return; }
      for (var language = 0; language < 3; language++) {
        var code = languages[language], original = sourceRow(record), key = original?.[0] || record.engineKey;
        var name = language === 0 ? key : escaped(record.names[code] || record.names.en);
        var row = record.kind === 'equipment'
          ? [name, escaped(record.description[code] || record.description.en), escaped(record.notes[code] || record.notes.en), escaped(record.acquisition[code] || record.acquisition.en), record.level, record.sockets, record.parameter6, record.calculationCode, ...record.compatibility, record.trailing]
          : [name, escaped(record.modifiers[code] || record.modifiers.en || record.names.en), escaped(record.description[code] || record.description.en), escaped(record.notes[code] || record.notes.en), escaped(record.acquisition[code] || record.acquisition.en), ...record.soulParameters, record.calculationCode, ...record.compatibility, record.trailing];
        var group = record.kind === 'equipment' ? equipment[language][record.category] : souls[language];
        while (group.length < record.index) group.push(placeholder(group[0]));
        group[record.index] = row;
      }
    });
    if (options.rebuild !== false || options.preflightOnly) selectedStateExists(equipment, souls);
    if (options.preflightOnly) return snapshot.revision;
    // A pinned revision switch must not leave explicitly controlled source
    // entries in the retained learned pool after their override is removed.
    var previousCustomKeys = learningRecords.filter(function (record) { return !record.templateId; }).map(function (record) { return record.category + '_' + record.index; });
    if (previousCustomKeys.length) {
      window.Learn[0] = window.Learn[0].filter(function (id) { return previousCustomKeys.indexOf(id) === -1; });
      window.Learn[1] = window.Learn[1].filter(function (id) { return previousCustomKeys.indexOf(id) === -1; });
      window.Learn[2] = window.Learn[1].map(function (id) { return id.split('_'); });
      window.Learn[3] = window.Learn[0].map(function (id) { return id.split('_'); });
    }
    // Source files and captured baseline arrays remain immutable. Only the
    // explicitly documented Modern runtime data projection is replaced.
    window.EquipData = equipment; window.SoulData = souls; window.Status.Mod = classMods; recordsByTerm = terms; revision = snapshot.revision;
    for (var language = 0; language < 3; language++) window.Skill[language] = skills[language];
    passiveRecords = passives; variantRecords = additions.sort(function (a, b) { return a.id.localeCompare(b.id); });
    profileRecords = snapshot.records.filter(function (record) { return Boolean(record.profiles); });
    selectedProfiles = Object.create(null);
    learningRecords = snapshot.records.filter(function (record) { return (record.kind === 'active' || record.kind === 'passive') && (record.learningRequirements || record.profiles || record.intrinsicEffectMode === 'replace'); });
    learnedKey = ''; learnedEntries = []; potentialEntries = []; customLearningStates = Object.create(null);
    snapshots[revision] = structuredClone(snapshot);
    if (options.rebuild !== false) {
      window.Status.Equip.forEach(function (state) { state[0] = Number(state[0]); });
      window.ListCreate('Equip'); window.SoulCompare = window.Status.Equip.map(function () { return []; });
      window.ListCreate('Soul'); window.ListCreate('SoulSelect'); window.ListCreate('SoulCheck'); window.CalcSet('Equip'); window.CalcSet('ALL');
      window.SkillList('Create'); window.SkillList('Color');
      if (namespace.gameTermDisplay) namespace.gameTermDisplay.refresh();
      if (namespace.equipmentPicker) namespace.equipmentPicker.refresh();
      refreshAvailability();
    }
    return revision;
  }
  function textFor(term, field) {
    var record = recordsByTerm[term]; if (!record) return '';
    if (record.profiles) { nativeLearnedEntries(); record = selectedProfiles[record.id] || record; }
    var language = namespace.i18n?.getLocale() === 'ru' ? 'ru' : languages[Number(window.Flag[0])];
    return record[field]?.[language] || record[field]?.en || '';
  }
  function learningText(required) {
    var i18n = namespace.i18n, language = Number(window.Flag[0]);
    var classes = required.classIds.map(function (id) {
      return i18n.game(id, window.Name.Job[Number(id.slice(4))][language + 2]);
    });
    var parts = [classes.length ? i18n.t(required.classScope === 'exact' ? 'skills.learningClasses' : 'skills.learningDescendants', { names: classes.join(' / ') }) : i18n.t('skills.learningAnyClass'),
      i18n.t('skills.learningLevel', { level: required.minimumLevel })];
    required.branches.forEach(function (gate) {
      var branch = Number(gate.branchId.slice(15));
      parts.push(i18n.t('skills.learningBranch', { name: i18n.game('skill.' + branch, window.Name.Skill[branch][language + 1]), points: gate.minimumPoints }));
    });
    return parts.join('. ');
  }
  function sourceSnapshot() { return { ok: true, schemaVersion: 1, sourceFingerprint: SOURCE_FINGERPRINT, characterSourceFingerprint: CHARACTER_SOURCE_FINGERPRINT, revision: 0, impactRevision: 0, records: [] }; }
  // Modern build context is data only. Store()/Expand() and the museum CSV stay
  // unchanged. Presentation flags, credentials and arbitrary Flag keys are never
  // included. These are the actual source controls that affect calculations.
  var buffKeys = [], exclusiveBuffs = Object.create(null);
  window.Set.Buff.forEach(function (row) {
    for (var column = 0; column < 9; column += 3) {
      if (!row[column] && !row[column + 1]) continue;
      var key = row[column] + '_' + row[column + 1];
      if (buffKeys.indexOf(key) === -1) buffKeys.push(key);
      var group = row[column + 2];
      if (group >= 2 && group <= 10) exclusiveBuffs[key] = group <= 3 ? 1 : group <= 5 ? 2 : 3;
    }
  });
  var defaultContext = { riding: 0, buffs: [], honor: 0,
    clan: window.Name.Clan.map(function () { return 0; }),
    caster: [0, 1, 2].map(function (index) { return Number(document.getElementById('InBuff_' + index).value); }) };
  function validateContext(context) {
    check(context && typeof context === 'object' && !Array.isArray(context) && Object.keys(context).length === 5 &&
      Object.keys(context).every(function (key) { return ['riding', 'buffs', 'honor', 'clan', 'caster'].indexOf(key) !== -1; }), 'Invalid build context');
    check(context.riding === 0 || context.riding === 1, 'Invalid riding state');
    check(Number.isInteger(context.honor) && context.honor >= 0 && context.honor <= window.Skill.Honor.length, 'Invalid Honor effect');
    check(Array.isArray(context.buffs) && context.buffs.length <= buffKeys.length, 'Invalid effect selection');
    var seen = Object.create(null), groups = Object.create(null);
    context.buffs.forEach(function (key) {
      check(typeof key === 'string' && buffKeys.indexOf(key) !== -1 && !seen[key], 'Unsupported or duplicate effect'); seen[key] = true;
      var group = exclusiveBuffs[key];
      check(!group || !groups[group], 'Mutually exclusive effects'); if (group) groups[group] = true;
    });
    check(Array.isArray(context.clan) && context.clan.length === window.Name.Clan.length && context.clan.every(function (value, index) {
      return Number.isInteger(value) && value >= 0 && value <= window.Name.Clan[index][0];
    }), 'Invalid clan effect');
    check(Array.isArray(context.caster) && context.caster.length === 3 && context.caster.every(function (value) {
      return typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 1000 && Math.abs(value * 100 - Math.round(value * 100)) < 0.000001;
    }), 'Invalid caster attributes');
    return { riding: context.riding, buffs: buffKeys.filter(function (key) { return seen[key]; }), honor: context.honor, clan: context.clan.slice(), caster: context.caster.slice() };
  }
  function captureContext() {
    return validateContext({ riding: Number(window.Flag[7]), buffs: buffKeys.filter(function (key) { return Boolean(window.Flag[key]); }),
      honor: Number(window.Flag.Honor || 0), clan: window.Name.Clan.map(function (_, index) { return document.getElementById('SelBuffClan_' + index).selectedIndex; }),
      caster: [0, 1, 2].map(function (index) {
        var value = document.getElementById('InBuff_' + index).value;
        return value.trim() ? Number(value) : NaN;
      }) });
  }
  function applyContext(context) {
    context = validateContext(context || defaultContext);
    window.Flag[7] = context.riding; window.Flag.Honor = context.honor;
    document.getElementById('SwitchUse_4').className = context.riding ? 'btn2_on' : 'btn2_off';
    buffKeys.forEach(function (key) {
      window.Flag[key] = context.buffs.indexOf(key) !== -1 ? 1 : 0;
      document.getElementById('Buff_' + key).className = window.Flag[key] ? 'btn2_on' : 'btn2_off';
    });
    for (var index = 0; index < window.Skill.Honor.length; index++) document.getElementById('BuffHonor_' + index).className = context.honor === index + 1 ? 'btn2_on' : 'btn2_off';
    context.clan.forEach(function (value, index) { document.getElementById('SelBuffClan_' + index).selectedIndex = value; });
    context.caster.forEach(function (value, index) { document.getElementById('InBuff_' + index).value = String(value); });
  }
  function packWithContext(payload, pinned, context) {
    check(Number.isSafeInteger(pinned) && pinned >= 0 && pinned <= 999999999, 'Invalid catalog revision');
    if (context && JSON.stringify(context) !== JSON.stringify(defaultContext)) {
      var encoded = btoa(JSON.stringify(context)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
      return 'PS3:' + pinned + ':C1:' + encoded + ':' + payload;
    }
    return pinned ? 'PS3:' + pinned + ':' + payload : payload;
  }
  function packPayload(payload, targetRevision) {
    return packWithContext(payload, targetRevision === undefined ? revision : targetRevision, captureContext());
  }
  function unpackPayload(payload) {
    check(typeof payload === 'string' && payload.length > 0 && payload.length <= 20000, 'Invalid build code');
    if (payload.indexOf('PS3:') !== 0) return { revision: 0, payload, context: null };
    var match = payload.match(/^PS3:(\d{1,9}):(?:C1:([A-Za-z0-9_-]{1,2048}):)?([^:]+)$/);
    check(match && (Number(match[1]) > 0 || match[2]) && match[3].indexOf(',') !== -1, 'Invalid versioned build code');
    var context = match[2] ? validateContext(JSON.parse(atob(match[2].replace(/-/g, '+').replace(/_/g, '/')))) : null;
    return { revision: Number(match[1]), payload: match[3], context };
  }
  function database() {
    if (databasePromise) return databasePromise;
    databasePromise = new Promise(function (resolve, reject) {
      var request = indexedDB.open('pandora-remaked-public-catalog', 1);
      request.onupgradeneeded = function () { request.result.createObjectStore('snapshots', { keyPath: 'revision' }); };
      request.onsuccess = function () { request.result.onversionchange = function () { request.result.close(); }; resolve(request.result); };
      request.onerror = function () { reject(new Error('Catalog cache unavailable')); };
      request.onblocked = function () { reject(new Error('Catalog cache unavailable')); };
    });
    return databasePromise;
  }
  async function cached(requested) {
    try {
      var db = await database();
      return await new Promise(function (resolve) { var request = db.transaction('snapshots').objectStore('snapshots').get(requested); request.onsuccess = function () { resolve(request.result || null); }; request.onerror = function () { resolve(null); }; });
    } catch { return null; }
  }
  async function remember(snapshot, latest) {
    try {
      var db = await database();
      await new Promise(function (resolve) {
        var transaction = db.transaction('snapshots', 'readwrite'); var store = transaction.objectStore('snapshots');
        store.put(snapshot); if (latest) store.put({ revision: -1, head: snapshot.revision, impactHead: snapshot.impactRevision });
        transaction.oncomplete = resolve; transaction.onerror = resolve; transaction.onabort = resolve;
      });
    } catch { /* Public cache failure cannot destroy the character or builds. */ }
  }
  function announceHead(next, impact) {
    check(Number.isSafeInteger(next) && next >= 0 && next <= 999999999, 'Invalid catalog head');
    check(Number.isSafeInteger(impact) && impact >= 0 && impact <= next, 'Invalid catalog impact head');
    if (next === headRevision && impact === headImpactRevision) return headRevision;
    var previous = headRevision, previousImpact = headImpactRevision;
    headRevision = next; headImpactRevision = impact;
    window.dispatchEvent(new CustomEvent('pandora-remaked:cataloghead', {
      detail: { revision: next, impactRevision: impact, previousRevision: previous, previousImpactRevision: previousImpact }
    }));
    return headRevision;
  }
  async function fetchHead(options) {
    options = options || {};
    try {
      var response = await fetch(PUBLIC_HEAD_API, { credentials: 'omit', cache: 'no-store', signal: AbortSignal.timeout(3000) });
      check(response.ok, 'Catalog head unavailable');
      var data = await response.json();
      check(data && data.ok === true && data.schemaVersion === 1, 'Invalid catalog head');
      check(data.sourceFingerprint === SOURCE_FINGERPRINT && data.characterSourceFingerprint === CHARACTER_SOURCE_FINGERPRINT, 'Catalog source/version mismatch');
      announceHead(data.revision, Number.isSafeInteger(data.impactRevision) ? data.impactRevision : data.revision);
      return data.revision;
    } catch (error) {
      if (options.networkOnly) throw error;
      var latest = await cached(-1);
      if (latest && Number.isSafeInteger(latest.head)) {
        return announceHead(latest.head, Number.isSafeInteger(latest.impactHead) ? latest.impactHead : latest.head);
      }
      throw error;
    }
  }
  function repinPayload(payload, targetRevision) {
    var parsed = unpackPayload(payload);
    return packWithContext(parsed.payload, targetRevision, parsed.context);
  }
  async function latestPayload(payload, options) {
    options = options || {};
    var parsed = unpackPayload(payload);
    var head = await fetchHead({ networkOnly: options.networkOnly !== false });
    if (head <= parsed.revision) return payload;
    await fetchSnapshot(head, { networkOnly: options.networkOnly !== false });
    return repinPayload(payload, head);
  }

  async function fetchSnapshot(requested, options) {
    options = options || {};
    if (requested === 0) return sourceSnapshot();
    if (requested !== null && snapshots[requested]) return snapshots[requested];
    try {
      var response = await fetch(PUBLIC_API + (requested === null ? '' : '?revision=' + requested), { credentials: 'omit', cache: 'no-store', signal: AbortSignal.timeout(4000) });
      check(response.ok, 'Catalog revision unavailable');
      var snapshot = await response.json(); validate(snapshot);
      check(requested === null || snapshot.revision === requested, 'Catalog revision mismatch');
      snapshots[snapshot.revision] = snapshot;
      if (requested === null) announceHead(snapshot.revision, snapshot.impactRevision);
      await remember(snapshot, requested === null);
      return snapshot;
    } catch (error) {
      // An explicit update must check the actual public head. Cached pinned
      // revisions still work offline, but cannot be advertised as the latest.
      if (options.networkOnly) throw error;
      var target = requested;
      if (target === null) target = (await cached(-1))?.head;
      var offline = target === 0 ? sourceSnapshot() : target !== undefined ? await cached(target) : null;
      if (offline) {
        validate(offline);
        check(requested === null || offline.revision === requested, 'Cached catalog revision mismatch');
        snapshots[offline.revision] = offline;
        if (requested === null) announceHead(offline.revision, offline.impactRevision);
        return offline;
      }
      throw error;
    }
  }
  async function preparePayload(payload) { var parsed = unpackPayload(payload); await fetchSnapshot(parsed.revision); return parsed; }
  function useRevision(requested) {
    if (requested === revision) return;
    var snapshot = requested === 0 ? sourceSnapshot() : snapshots[requested];
    check(snapshot, 'This build needs a catalog revision that is not loaded');
    applySnapshot(snapshot, { rebuild: false });
  }
  async function bootstrap() {
    // Public Pages only. Local development cannot bypass the strict production
    // CORS policy; tests exercise this public loader with explicit mock routes.
    var autosave = namespace.buildStore?.readAutosave();
    if (autosave?.ok && autosave.record) {
      try { await preparePayload(autosave.record.payload); }
      catch { recovery = true; }
    }
    var shared = location.hash.indexOf('#build=') === 0;
    if (shared) {
      try { await preparePayload(decodeURIComponent(location.hash.slice(7))); }
      catch { /* Builds owns the visible error; no partial character load. */ }
    }
    if (!autosave?.record && !shared && location.origin === 'https://bonaqu.github.io') {
      try { applySnapshot(await fetchSnapshot(null)); }
      catch { /* A first visit can always use the preserved source catalog. */ }
    }
  }
  namespace.catalog = { applySnapshot, validateSnapshot: validate, refreshAvailability,
    variantSkills: function () {
      if (!variantRecords.length) return [];
      nativeLearnedEntries();
      return variantRecords.map(function (record) {
        var key = record.category + '_' + record.index;
        var state = record.learningRequirements ? customLearningStates[record.id] : { learned: learnedEntries.indexOf(key) !== -1, potential: potentialEntries.indexOf(key) !== -1 };
        return Object.assign(structuredClone(record), { learned: state.learned, potential: state.potential,
          bonusApplied: record.kind === 'passive' && record.effects.length > 0 && passiveEligible(record, learnedEntries) });
      });
    },
    preflightSnapshot: function (snapshot) { return applySnapshot(snapshot, { preflightOnly: true }); },
    getRevision: function () { return revision; }, hasOverrides: function () { return Object.keys(recordsByTerm).length > 0; },
    racialDetails: function () {
      var term = 'racial_skill.' + window.Status.Job[0] + '.' + window.Status.Job[1];
      if (!recordsByTerm[term]) return null;
      return { name: textFor(term, 'names'), description: textFor(term, 'description'), calculationNotes: textFor(term, 'calculationNotes') };
    },
    learningText: learningText,
    nativePassiveEnabled: function (id) { return recordsByTerm[id]?.intrinsicEffectMode !== 'replace'; },
    gameLabel: function (term) {
      var detail = term.match(/^skill_detail\.(\d+)\.(\d+)\.(1|3)$/);
      if (!detail) return textFor(term, 'names');
      var id = 'skill_entry.' + detail[1] + '.' + detail[2], record = recordsByTerm[id];
      if (record?.profiles) { nativeLearnedEntries(); record = selectedProfiles[id] || record; }
      return detail[3] === '3' ? textFor(id, 'description') : record?.learningRequirements ? learningText(record.learningRequirements) : '';
    },
    item: function (kind, value) { var id = Number(value); return recordsByTerm[kind === 'equipment' ? 'equipment.' + Math.floor(id / 10000) + '.' + id % 10000 : 'soul.' + id] || null; },
    itemText: function (kind, value, field) { var id = Number(value); return textFor(kind === 'equipment' ? 'equipment.' + Math.floor(id / 10000) + '.' + id % 10000 : 'soul.' + id, field); },
    packPayload, repinPayload, latestPayload, captureContext, applyContext,
    unpackPayload, preparePayload, useRevision, fetchSnapshot, fetchHead, bootstrap,
    getHeadRevision: function () { return headRevision; },
    getHeadImpactRevision: function () { return headImpactRevision; },
    validateCurrentState: function () { selectedStateExists(window.EquipData, window.SoulData); },
    needsRecovery: function () { return recovery; }, clearRecovery: function () { recovery = false; }
  };
  function nativeLearnedEntries() {
    var key = window.Status.Job[2] + ':' + window.Status.Lev[0] + ':' + window.Status.Skill.toString();
    if (key === learnedKey) return learnedEntries;
    var originalLearn = window.Learn, originalFlag = window.Flag[3];
    var originalProfiles = selectedProfiles, originalProfileRows = [];
    profileRecords.forEach(function (record) {
      for (var language = 0; language < 3; language++) {
        var row = window.Skill[language][record.category][record.index];
        originalProfileRows.push({ row: row, values: row.slice() });
      }
    });
    window.Learn = [[], [], [], []]; window.Flag[3] = 1; learningProbeDepth++;
    try {
      projectProfiles();
      for (var category = 0; category < window.Name.Skill.length; category++) window.SkillList('Potential', category);
      window.SkillList('Adeptness', 0);
      var learned = window.Learn[0].slice(), potential = window.Learn[1].slice(), states = Object.create(null);
      learningRecords.forEach(function (record) {
        // An opted-in native replacement must not inherit temporary gate state
        // from a preceding SkillList row (notably the paired Jousting entries).
        // Old additive records still use the unchanged retained learned set.
        var effective = selectedProfiles[record.id] || record;
        var state = effective.learningRequirements ? customEligibility(effective.learningRequirements) : nativeGate(record.prerequisiteCode); states[record.id] = state;
        if (!record.templateId) {
          var id = record.category + '_' + record.index;
          learned = learned.filter(function (value) { return value !== id; });
          potential = potential.filter(function (value) { return value !== id; });
          if (state.learned) learned.push(id);
          if (state.potential) potential.push(id);
        }
      });
      learnedEntries = learned; potentialEntries = potential; customLearningStates = states; learnedKey = key; return learnedEntries;
    } catch (error) {
      // Projection is transactional too: an interrupted native probe must not
      // leave half of the skills on the new class/rank and half on the old one.
      selectedProfiles = originalProfiles;
      originalProfileRows.forEach(function (saved) {
        saved.row.length = saved.values.length;
        for (var index = 0; index < saved.values.length; index++) saved.row[index] = saved.values[index];
      });
      throw error;
    } finally { window.Learn = originalLearn; window.Flag[3] = originalFlag; learningProbeDepth--; }
  }
  function projectSkill(identity, values, skills) {
    for (var language = 0; language < 3; language++) {
      var row = skills[language][identity.category][identity.index];
      // Retain the original Japanese engine key and immutable prerequisite code.
      if (language > 0) row[0] = escaped(values.names[languages[language]] || values.names.en);
      row[3] = escaped(values.description[languages[language]] || values.description.en);
      for (var timing = 0; timing < 4; timing++) row[5 + timing] = values.timing[timing];
    }
  }
  function projectProfiles() {
    selectedProfiles = Object.create(null);
    profileRecords.forEach(function (record) {
      var selected, domain;
      record.profiles.forEach(function (profile) {
        if (!customEligibility(profile.learningRequirements).learned) return;
        var candidate = profileDomain(profile.learningRequirements);
        if (!selected || containsProfile(domain, candidate)) { selected = profile; domain = candidate; }
      });
      if (selected) selectedProfiles[record.id] = selected;
      projectSkill(record, selected || record, window.Skill);
    });
  }
  function nativeGate(code) {
    var originalRows = window.Skill[0][0], originalLearn = window.Learn, originalFlag = window.Flag[3];
    var row = baselineSkills[0][0][0].slice(); row[9] = code;
    window.Skill[0][0] = [row]; window.Learn = [[], [], [], []]; window.Flag[3] = 1; learningProbeDepth++;
    try {
      window.SkillList('Potential', 0); window.SkillList('Adeptness', 0);
      return { potential: window.Learn[1].indexOf('0_0') !== -1, learned: window.Learn[0].indexOf('0_0') !== -1 };
    } finally { window.Skill[0][0] = originalRows; window.Learn = originalLearn; window.Flag[3] = originalFlag; learningProbeDepth--; }
  }
  function customEligibility(required) {
    var current = Number(window.Status.Job[2]), classState = { potential: false, learned: false };
    var ids = required.classIds.length ? required.classIds : ['job.' + current];
    ids.forEach(function (id) {
      var index = Number(id.split('.')[1]);
      if (required.classScope === 'exact' && current !== index) return;
      var gate = nativeGate('J=' + index + '=' + required.minimumLevel);
      classState.potential = classState.potential || gate.potential; classState.learned = classState.learned || gate.learned;
    });
    required.branches.forEach(function (branch) {
      var gate = nativeGate('S=' + Number(branch.branchId.split('.')[1]) + '=' + branch.minimumPoints);
      classState.potential = classState.potential && gate.potential; classState.learned = classState.learned && gate.learned;
    });
    classState.learned = classState.learned && classState.potential;
    return classState;
  }
  function synchronizeCustomLearning() {
    if (!window.Flag[3] || learningProbeDepth || !learningRecords.length) return;
    nativeLearnedEntries();
    learningRecords.forEach(function (record) {
      if (record.templateId) return;
      var key = record.category + '_' + record.index, state = customLearningStates[record.id];
      window.Learn[0] = window.Learn[0].filter(function (id) { return id !== key; });
      window.Learn[1] = window.Learn[1].filter(function (id) { return id !== key; });
      if (state.learned) window.Learn[0].push(key);
      if (state.potential) window.Learn[1].push(key);
    });
    window.Learn[2] = window.Learn[1].map(function (id) { return id.split('_'); });
    window.Learn[3] = window.Learn[0].map(function (id) { return id.split('_'); });
  }
  var retainedSkillList = window.SkillList;
  window.SkillList = function (action) {
    if (learningProbeDepth || !learningRecords.length || !window.Flag[3]) return retainedSkillList.apply(this, arguments);
    if (action === 'Create' || action === 'Color') synchronizeCustomLearning();
    var result = retainedSkillList.apply(this, arguments);
    if (action === 'Color') learningRecords.forEach(function (record) {
      if (record.templateId) return;
      var icon = document.getElementById('LearnSkillIcon_' + record.category + '_' + record.index);
      if (icon) icon.style.background = 'url(./image/icon/' + (customLearningStates[record.id].learned ? '' : 'gray/') +
        String(record.category).padStart(2, '0') + String(record.index).padStart(2, '0') + '.png)';
    });
    return result;
  };
  function passiveEligible(record, learned) {
    return (record.learningRequirements || record.intrinsicEffectMode === 'replace' ? customLearningStates[record.id].learned : learned.indexOf(record.category + '_' + record.index) !== -1) && equipmentEligible(record.bonusRequirements);
  }
  function equipmentEligible(required) {
    if (!required) return true;
    var weaponId = Number(window.Status.Equip[0][0]), category = weaponId % 10000 ? Math.floor(weaponId / 10000) : -1;
    var shieldId = Number(window.Status.Equip[1][0]);
    return (!required.weaponCategories.length || required.weaponCategories.indexOf(category) !== -1) &&
      (!required.shieldRequired || Math.floor(shieldId / 10000) === 20 && shieldId % 10000 > 0) && (!required.ridingRequired || Boolean(window.Flag[7]));
  }
  function passiveEffects() {
    // Profile text/timing must stay current even with no numeric passive edit
    // and with the visible Skill List closed.
    if (profileRecords.length) nativeLearnedEntries();
    if (!passiveRecords.length) return [];
    var learned = nativeLearnedEntries(), result = [];
    passiveRecords.forEach(function (record) {
      if (!passiveEligible(record, learned)) return;
      result.push.apply(result, record.effects);
    });
    return result;
  }
  var retainedCalc = window.Calc, calculationDepth = 0;
  window.Calc = function () {
    if (calculationDepth) return retainedCalc.apply(this, arguments);
    var record = recordsByTerm['racial_skill.' + window.Status.Job[0] + '.' + window.Status.Job[1]];
    var effects = passiveEffects();
    if (record && record.effectMode !== 'preserve' && equipmentEligible(record.bonusRequirements)) effects = effects.concat(record.effects);
    if (!effects.length && (!record || record.effectMode !== 'replace')) return retainedCalc.apply(this, arguments);
    var selected = window.Status.Job[1], originalOptions = window.EquipOpt;
    var options = originalOptions.slice();
    effects.forEach(function (effect) {
      options[effect.stat] = (options[effect.stat] || []).slice();
      options[effect.stat].push(String(effect.value) + (effect.unit === 'percent' ? '%' : ''));
    });
    // All 18 native racial conditionals live inside Calc. Slot 3 is outside
    // their 0..2 selection, including the historical <=0 condition. Bypass
    // only for an explicit replacement; let the retained formulas calculate
    // typed options normally. Never leak this sentinel into state/save/UI.
    calculationDepth++; window.EquipOpt = options;
    if (record?.effectMode === 'replace') window.Status.Job[1] = 3;
    try { return retainedCalc.apply(this, arguments); }
    finally { window.Status.Job[1] = selected; window.EquipOpt = originalOptions; calculationDepth--; }
  };
  var retainedCalcSet = window.CalcSet, setDepth = 0;
  window.CalcSet = function () {
    setDepth++;
    try {
      var result = retainedCalcSet.apply(this, arguments);
      // The original level/skill/horse callbacks recalculate only their native
      // dependency subset. A newly learned conditional bonus may affect another
      // stat, so finish through the original ALL calculation, not a new formula.
      if (setDepth === 1 && passiveRecords.length && arguments[0] !== 'ALL') retainedCalcSet('ALL');
      return result;
    } finally { setDepth--; }
  };
  // TextSet rebuilds clan selects and would erase their selected levels during
  // a source-language change. Restore the data after the original renderer;
  // preserve all source callbacks and calculate using the retained engine.
  var retainedTextSet = window.TextSet;
  window.TextSet = function () {
    var clan = window.Name.Clan.map(function (_, index) { return document.getElementById('SelBuffClan_' + index).selectedIndex; });
    var result = retainedTextSet.apply(this, arguments);
    clan.forEach(function (value, index) { document.getElementById('SelBuffClan_' + index).selectedIndex = value; });
    window.CalcSet('ALL'); return result;
  };
  namespace.catalog.ready = bootstrap();
})();
