import nativePassives from '../../data/native-passive-hooks.v1.json' with { type: 'json' };
export const NATIVE_PASSIVES = nativePassives.definitions;
// This is a validated data codec, not a game calculator. IDs and unit suffixes
// come from preserved Name.Option / Calc. Actual formulas stay in js/calc.js.
const BOTH = ['flat', 'percent'];
const FLAT = ['flat'];
export const LANGUAGES = ['en', 'ru', 'jp', 'tw'];
export const EQUIPMENT_CATEGORIES = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 20, 30, 31, 32, 33, 34, 35, 40, 41, 42, 43];
export const EFFECTS = [
  [0, 'STA', FLAT], [1, 'STR', FLAT], [2, 'AGI', FLAT], [3, 'DEX', FLAT], [4, 'SPR', FLAT], [5, 'INT', FLAT],
  [6, 'LP', BOTH], [7, 'MP', BOTH], [8, 'Potion effectiveness (percentage points)', FLAT], [10, 'MP recovery speed bonus (percentage points)', FLAT], [18, 'Physical attack', BOTH], [42, 'Magic attack (percentage points)', FLAT], [49, 'Defense', BOTH],
  [50, 'Front damage resistance', FLAT], [51, 'Back damage resistance', FLAT], [52, 'Physical damage resistance', BOTH],
  [60, 'Magic damage resistance (percentage points)', FLAT], [62, 'Accuracy', BOTH], [65, 'Dodge', BOTH],
  [69, 'Critical chance (percentage points)', FLAT], [70, 'Incoming critical chance (percentage points)', FLAT], [91, 'Stun chance (percentage points)', FLAT],
  [71, 'Critical damage (percentage points)', FLAT], [72, 'Critical damage taken (percentage points)', FLAT],
  [73, 'Attack speed (percentage points)', FLAT], [74, 'Movement speed (percentage points)', FLAT],
  [76, 'MP cost (percentage points)', FLAT], [77, 'Casting speed (percentage points)', FLAT], [79, 'Cooldown (percentage points)', FLAT],
  [21, 'Weapon damage (percentage points)', FLAT], [81, 'Mounted stat release display (percentage points)', FLAT],
  [138, 'Fire resistance', FLAT], [139, 'Ice resistance', FLAT], [140, 'Lightning resistance', FLAT],
  [141, 'Poison resistance', FLAT], [142, 'Charm resistance', FLAT], [143, 'Light resistance', FLAT],
  [144, 'Dark resistance', FLAT], [145, 'Magic resistance', FLAT], [146, 'Physical abnormal status resistance', FLAT], [147, 'Mental abnormal status resistance', FLAT], [148, 'Burn resistance', FLAT],
  [149, 'Stun resistance', FLAT], [150, 'Freeze resistance', FLAT], [151, 'Knockdown resistance', FLAT],
  [153, 'Knockback resistance', FLAT], [154, 'Bleeding resistance', FLAT], [155, 'Immobile resistance', FLAT],
  [156, 'Sleep resistance', FLAT], [157, 'Confusion resistance', FLAT], [158, 'Silence resistance', FLAT],
  [159, 'Curse resistance', FLAT], [160, 'Weakening resistance', FLAT], [161, 'Disease resistance', FLAT]
].map(([id, label, units]) => ({ id, label, units }));
const effectById = new Map(EFFECTS.map(effect => [effect.id, effect]));
const fields = ['id', 'kind', 'category', 'names', 'description', 'notes', 'acquisition', 'modifiers', 'level', 'sockets', 'races', 'classes', 'slots', 'baseAttack', 'effectMode', 'effects', 'disabled'];

export class CatalogError extends Error {
  constructor(message, status = 400) { super(message); this.status = status; }
}
function check(condition, message) { if (!condition) throw new CatalogError(message); }
function keys(value, allowed, label) {
  check(value && typeof value === 'object' && !Array.isArray(value), label + ' must be an object');
  check(Object.keys(value).every(key => allowed.includes(key)), label + ' contains an unsupported field');
}
function textMap(input, limit, label) {
  keys(input, LANGUAGES, label);
  const result = {};
  for (const language of LANGUAGES) {
    const text = input[language] ?? '';
    check(typeof text === 'string' && text.length <= limit && !/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(text), label + ' has invalid text');
    result[language] = text.trim();
  }
  return result;
}
function integer(value, min, max, label) {
  check(Number.isInteger(value) && value >= min && value <= max, label + ' is outside its allowed range');
  return value;
}
function flags(value, count, label) {
  check(Array.isArray(value) && value.length === count && value.every(flag => flag === 0 || flag === 1), label + ' requires ' + count + ' binary flags');
  return [...value];
}
function learningRequirements(input) {
  keys(input, ['classIds', 'classScope', 'minimumLevel', 'branches'], 'Learning requirements');
  const classIds = input.classIds;
  check(Array.isArray(classIds) && classIds.length <= 28 && new Set(classIds).size === classIds.length &&
    classIds.every(id => typeof id === 'string' && /^job\.(?:[0-9]|1[0-9]|2[0-7])$/.test(id)), 'Invalid learning classes');
  check(['exact', 'descendants'].includes(input.classScope), 'Invalid learning class scope');
  const minimumLevel = integer(input.minimumLevel, 1, 55, 'Learning level (1–55)');
  check(Array.isArray(input.branches) && input.branches.length <= 25, 'Invalid learning branches');
  const seen = new Set();
  const branches = input.branches.map(gate => {
    keys(gate, ['branchId', 'minimumPoints'], 'Learning branch');
    check(typeof gate.branchId === 'string' && /^skill_category\.(?:[0-9]|1[0-9]|2[0-4])$/.test(gate.branchId) && !seen.has(gate.branchId), 'Invalid or duplicate learning branch');
    seen.add(gate.branchId);
    return { branchId: gate.branchId, minimumPoints: integer(gate.minimumPoints, 1, 200, 'Learning branch points (1–200)') };
  });
  return { classIds: [...classIds], classScope: input.classScope, minimumLevel, branches };
}
// Canonical retained class ancestry, independently verified by the reference
// audit. Profile precedence is domain inclusion, never array order or an ID.
const CLASS_PARENTS = [null, 0, 1, 1, 0, 4, 4, null, 7, 8, 8, 7, 11, 11,
  null, 14, 15, 15, 14, 18, 18, null, 21, 22, 22, 21, 25, 25];
function profileDomain(required) {
  const selected = required.classIds.map(id => Number(id.slice(4)));
  const classes = CLASS_PARENTS.map((_, index) => index).filter(index => {
    if (!selected.length || selected.includes(index)) return true;
    if (required.classScope === 'exact') return false;
    for (let parent = CLASS_PARENTS[index]; parent !== null; parent = CLASS_PARENTS[parent])
      if (selected.includes(parent)) return true;
    return false;
  });
  return { classes, level: required.minimumLevel,
    branches: Object.fromEntries(required.branches.map(gate => [gate.branchId, gate.minimumPoints])) };
}
function containsProfile(outer, inner) {
  return inner.classes.every(id => outer.classes.includes(id)) && inner.level >= outer.level &&
    Object.entries(outer.branches).every(([id, minimum]) => (inner.branches[id] || 0) >= minimum);
}
function skillTiming(input, result) {
  result.mpCost = integer(input.mpCost, 0, 100000, 'MP cost');
  for (const field of ['castSeconds', 'cooldownSeconds', 'durationSeconds']) {
    const value = input[field];
    check(typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 86400 && Number(value.toFixed(3)) === value,
      'Timing must be bounded seconds with at most three decimals');
    result[field] = value;
  }
}
function skillProfiles(input) {
  check(Array.isArray(input) && input.length >= 1 && input.length <= 8, 'Skill requires 1–8 conditional profiles');
  const ids = new Set();
  const profiles = input.map(profile => {
    keys(profile, ['id', 'names', 'description', 'learningRequirements', 'mpCost', 'castSeconds', 'cooldownSeconds', 'durationSeconds'], 'Skill profile');
    check(typeof profile.id === 'string' && /^[a-z][a-z0-9._-]{0,63}$/.test(profile.id) && !ids.has(profile.id), 'Invalid or duplicate profile identity');
    ids.add(profile.id);
    const names = textMap(profile.names, 160, 'Profile names'); check(names.en.length > 0, 'English profile name is required');
    const result = { id: profile.id, names, description: textMap(profile.description, 4000, 'Profile description'),
      learningRequirements: learningRequirements(profile.learningRequirements) };
    skillTiming(profile, result);
    return result;
  });
  check(JSON.stringify(profiles).length <= 32000, 'Conditional profile data is too large');
  const domains = profiles.map(profile => profileDomain(profile.learningRequirements));
  for (let left = 0; left < domains.length; left++) for (let right = left + 1; right < domains.length; right++) {
    const a = domains[left], b = domains[right];
    if (!a.classes.some(id => b.classes.includes(id))) continue;
    // These conditions are lower bounds, so intersecting class sets always
    // admit an overlapping state. Equal/incomparable selectors are ambiguous.
    const aContainsB = containsProfile(a, b), bContainsA = containsProfile(b, a);
    check(aContainsB !== bContainsA, 'Conditional profile learning domains overlap ambiguously');
  }
  return profiles;
}
const texts = source => Object.fromEntries(LANGUAGES.map(language => [language, source?.[language] || '']));
function effects(input) {
  check(Array.isArray(input) && input.length <= EFFECTS.reduce((count, effect) => count + effect.units.length, 0), 'Too many effects');
  const seen = new Set();
  return input.map(effect => {
    keys(effect, ['stat', 'value', 'unit'], 'Effect');
    const definition = effectById.get(effect.stat);
    check(definition && definition.units.includes(effect.unit), 'Unsupported effect or unit');
    const pair = effect.stat + ':' + effect.unit;
    check(!seen.has(pair), 'Duplicate stat/unit'); seen.add(pair);
    check(typeof effect.value === 'number' && Number.isFinite(effect.value) && Math.abs(effect.value) <= 10000 && Number(effect.value.toFixed(2)) === effect.value, 'Effect must be a bounded number with at most two decimals');
    return { stat: effect.stat, value: effect.value, unit: effect.unit };
  });
}

export function draftFromSource(source, kind) {
  if (kind === 'active' || kind === 'passive') {
    check(source?.kind === kind, 'Only existing skill slots and native skill types are supported');
    const edit = { id: source.id, kind, category: source.legacy_category_id, names: texts(source.name), description: texts(source.description) };
    if (kind === 'active') Object.assign(edit, { mpCost: source.mp_cost, castSeconds: source.cast_seconds, cooldownSeconds: source.cooldown_seconds, durationSeconds: source.duration_seconds });
    else {
      const requirements = source.equipment_requirements.en;
      check(['None', 'Sword, Knife', 'Shield', 'Crossbow', 'Fist'].includes(requirements), 'Unmapped native passive equipment requirements');
      edit.effects = [];
      edit.bonusRequirements = { weaponCategories: requirements === 'Sword, Knife' ? [0, 1, 6] : requirements === 'Crossbow' ? [9] : requirements === 'Fist' ? [7] : [], shieldRequired: requirements === 'Shield', ridingRequired: source.legacy_category_id === 24 };
    }
    return edit;
  }
  if (kind === 'racial') {
    check(source?.kind === 'racial', 'Only existing racial passive slots are supported');
    return { id: source.id, kind, category: source.category, names: texts(source.name), description: texts(null), effectMode: 'preserve', effects: [] };
  }
  if (kind === 'class') {
    check(source?.kind === 'class', 'Only the 28 existing class slots are supported');
    return { id: source.id, kind, category: null, names: texts(source.name), description: texts(null), progression: [...source.progression] };
  }
  return {
    id: source?.id || '', kind, category: kind === 'equipment' ? source?.legacy_category_id ?? 0 : null,
    names: texts(source?.name), description: texts(source?.option), notes: texts(source?.special_option),
    acquisition: texts(source?.acquisition), modifiers: texts(source?.modifier),
    level: source ? Number(source.level_requirement ?? 1) : 1, sockets: Number(source?.soul_socket_count ?? 0),
    races: kind === 'equipment' && source ? source.compatibility_flags.slice(2, 8) : Array(6).fill(1),
    classes: kind === 'equipment' && source ? source.compatibility_flags.slice(8) : Array(28).fill(1),
    slots: kind === 'soul' && source ? [...source.compatibility_flags] : Array(8).fill(1),
    baseAttack: null, effectMode: source ? 'preserve' : 'replace', effects: [], disabled: false
  };
}

export function validateDraft(input, identity) {
  if (identity.kind === 'active' || identity.kind === 'passive') {
    const variant = Boolean(identity.templateId);
    const common = ['id', 'kind', 'category', 'names', 'description', 'learningRequirements', ...(!variant && identity.kind === 'active' ? ['profiles'] : []), ...(variant ? ['templateId'] : [])];
    keys(input, [...common, ...(identity.kind === 'active' ? ['mpCost', 'castSeconds', 'cooldownSeconds', 'durationSeconds'] : ['effects', 'bonusRequirements', 'intrinsicEffectMode'])], 'Skill');
    check(input.id === identity.id && input.kind === identity.kind && input.category === identity.category && Number.isInteger(identity.category) && identity.category >= 0 && identity.category < 25 && Number.isInteger(identity.index) && identity.index >= 0 && identity.index < 1000, 'Skill identity/type cannot be changed');
    if (variant) {
      check(input.templateId === identity.templateId && identity.templateId === 'skill_entry.' + identity.category + '.' + identity.index && new RegExp('^modern\\.' + identity.kind + '\\.[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$').test(input.id), 'Skill variant template/identity cannot be changed');
    } else check(input.id === 'skill_entry.' + identity.category + '.' + identity.index, 'Skill identity/type cannot be changed');
    const names = textMap(input.names, 160, 'Names'); check(names.en.length > 0, 'English name is required');
    const result = { id: input.id, kind: identity.kind, category: identity.category, names, description: textMap(input.description, 4000, 'Description') };
    if (input.learningRequirements !== undefined) result.learningRequirements = learningRequirements(input.learningRequirements);
    if (variant) result.templateId = identity.templateId;
    if (identity.kind === 'active') {
      skillTiming(input, result);
      if (input.profiles !== undefined) result.profiles = skillProfiles(input.profiles);
    } else {
      if (input.intrinsicEffectMode !== undefined) {
        check(!variant && Object.hasOwn(NATIVE_PASSIVES, identity.id) && ['add', 'replace'].includes(input.intrinsicEffectMode), 'Unsupported intrinsic passive mode or identity');
        result.intrinsicEffectMode = input.intrinsicEffectMode;
      }
      result.effects = effects(input.effects);
      keys(input.bonusRequirements, ['weaponCategories', 'shieldRequired', 'ridingRequired'], 'Bonus requirements');
      const categories = input.bonusRequirements.weaponCategories;
      check(Array.isArray(categories) && categories.length <= 15 && new Set(categories).size === categories.length && categories.every(value => Number.isInteger(value) && value >= -1 && value <= 13), 'Invalid bonus weapon categories');
      check(typeof input.bonusRequirements.shieldRequired === 'boolean' && typeof input.bonusRequirements.ridingRequired === 'boolean', 'Bonus requirements must be boolean');
      result.bonusRequirements = { weaponCategories: [...categories], shieldRequired: input.bonusRequirements.shieldRequired, ridingRequired: input.bonusRequirements.ridingRequired };
    }
    return result;
  }
  if (identity.kind === 'racial') {
    keys(input, ['id', 'kind', 'category', 'names', 'description', 'effectMode', 'effects', 'bonusRequirements', 'calculationNotes'], 'Racial passive');
    check(input.id === identity.id && input.kind === 'racial' && input.category === identity.category && Number.isInteger(identity.category) && identity.category >= 0 && identity.category < 6 && Number.isInteger(identity.index) && identity.index >= 0 && identity.index < 3 && input.id === 'racial_skill.' + identity.category + '.' + identity.index, 'Racial passive identity cannot be changed');
    const names = textMap(input.names, 160, 'Names'); check(names.en.length > 0, 'English name is required');
    check(['preserve', 'add', 'replace'].includes(input.effectMode), 'Unknown racial effect mode');
    const typed = effects(input.effects); check(input.effectMode !== 'preserve' || typed.length === 0, 'Preserve mode must not discard submitted effects');
    const result = { id: input.id, kind: 'racial', category: identity.category, names, description: textMap(input.description, 4000, 'Description'), effectMode: input.effectMode, effects: typed };
    if (input.bonusRequirements !== undefined) {
      keys(input.bonusRequirements, ['weaponCategories', 'shieldRequired', 'ridingRequired'], 'Bonus requirements');
      const required = input.bonusRequirements, categories = required.weaponCategories;
      check(Array.isArray(categories) && categories.length <= 15 && new Set(categories).size === categories.length && categories.every(value => Number.isInteger(value) && value >= -1 && value <= 13), 'Invalid racial weapon categories');
      check(typeof required.shieldRequired === 'boolean' && typeof required.ridingRequired === 'boolean', 'Bonus requirements must be boolean');
      result.bonusRequirements = { ...required, weaponCategories: [...categories] };
    }
    if (input.calculationNotes !== undefined) result.calculationNotes = textMap(input.calculationNotes, 1600, 'Calculation notes');
    return result;
  }
  if (identity.kind === 'class') {
    keys(input, ['id', 'kind', 'category', 'names', 'description', 'progression'], 'Class');
    check(input.id === identity.id && input.kind === 'class' && input.category === null && identity.category === null && Number.isInteger(identity.index) && identity.index >= 0 && identity.index < 28 && input.id === 'job.' + identity.index, 'Class identity cannot be changed');
    const names = textMap(input.names, 160, 'Names'); check(names.en.length > 0, 'English name is required');
    check(Array.isArray(input.progression) && input.progression.length === 6, 'Class needs six engine progression parameters');
    const progression = input.progression.map((value, index) => {
      check(typeof value === 'number' && Number.isFinite(value) && value >= (index < 2 ? 0 : 0.0001) && value <= 100000 && (index >= 2 || Number.isInteger(value)), 'Invalid class progression parameter');
      return value;
    });
    return { id: input.id, kind: 'class', category: null, names, description: textMap(input.description, 4000, 'Description'), progression };
  }
  keys(input, fields, 'Item');
  check(input.id === identity.id && input.kind === identity.kind, 'Item identity cannot be changed');
  check(['equipment', 'soul'].includes(input.kind), 'Unknown item kind');
  // Category is part of existing save-code identity. Changing it requires a new
  // variant, not silently reinterpreting every saved/shared encoded item ID.
  check(input.category === identity.category, 'Saved item type is stable; create a variant for a different type');
  check(input.kind === 'soul' ? input.category === null : EQUIPMENT_CATEGORIES.includes(input.category), 'Unsupported equipment category');
  const result = { id: input.id, kind: input.kind, category: input.category };
  for (const field of ['names', 'modifiers']) result[field] = textMap(input[field], 160, field);
  for (const field of ['description', 'notes', 'acquisition']) result[field] = textMap(input[field], 4000, field);
  check(result.names.en.length > 0, 'English name is required');
  result.level = integer(input.level, 0, 1000, 'Required level');
  result.sockets = integer(input.sockets, 0, 3, 'Soul sockets');
  result.races = flags(input.races, 6, 'Races'); result.classes = flags(input.classes, 28, 'Classes'); result.slots = flags(input.slots, 8, 'Soul slots');
  check(typeof input.disabled === 'boolean', 'Availability must be boolean'); result.disabled = input.disabled;
  check(['preserve', 'patch', 'replace'].includes(input.effectMode), 'Unknown effect mode'); result.effectMode = input.effectMode;
  check(input.baseAttack === null || (input.kind === 'equipment' && input.category <= 13), 'Weapon attack only applies to weapons');
  result.baseAttack = input.baseAttack === null ? null : integer(input.baseAttack, 0, 10000, 'Weapon attack');
  result.effects = effects(input.effects);
  check(result.effectMode !== 'preserve' || (result.effects.length === 0 && result.baseAttack === null), 'Preserve mode must not discard submitted effects');
  return result;
}

export function compileRecord(edit, identity, source) {
  if (identity.kind === 'active' || identity.kind === 'passive') {
    check(source?.kind === identity.kind && source.id === (identity.templateId || identity.id), 'Skill must retain its source type and learning template');
    check(edit.profiles === undefined || (identity.kind === 'active' && !identity.templateId), 'Conditional profiles require an existing active skill');
    return { id: identity.id, kind: identity.kind, category: identity.category, index: identity.index, names: edit.names, description: edit.description,
      ...(identity.templateId ? { templateId: identity.templateId } : {}),
      ...(edit.learningRequirements ? { learningRequirements: learningRequirements(edit.learningRequirements) } : {}),
      ...(edit.intrinsicEffectMode !== undefined ? { intrinsicEffectMode: edit.intrinsicEffectMode } : {}),
      ...(edit.profiles !== undefined ? { profiles: skillProfiles(edit.profiles).map(profile => ({
        id: profile.id, names: profile.names, description: profile.description, learningRequirements: profile.learningRequirements,
        timing: [profile.mpCost, profile.castSeconds, profile.cooldownSeconds, profile.durationSeconds]
      })) } : {}),
      active: source.is_active, prerequisiteCode: source.prerequisite_code, nativeEffectPolicy: identity.templateId ? 'template-gate-only' : edit.intrinsicEffectMode === 'replace' ? 'typed-replacement' : 'retained-plus-bonus',
      timing: identity.kind === 'active' ? [edit.mpCost, edit.castSeconds, edit.cooldownSeconds, edit.durationSeconds] : [source.mp_cost, source.cast_seconds, source.cooldown_seconds, source.duration_seconds],
      effects: (edit.effects || []).map(effect => ({ ...effect })), bonusRequirements: edit.bonusRequirements ? { ...edit.bonusRequirements, weaponCategories: [...edit.bonusRequirements.weaponCategories] } : null };
  }
  if (identity.kind === 'racial') {
    check(source?.kind === 'racial', 'New racial selection slots require a separate engine capability');
    return { id: identity.id, kind: 'racial', category: identity.category, index: identity.index, names: edit.names, description: edit.description, effectMode: edit.effectMode, effects: edit.effects.map(effect => ({ ...effect })),
      ...(edit.bonusRequirements ? { bonusRequirements: { ...edit.bonusRequirements, weaponCategories: [...edit.bonusRequirements.weaponCategories] } } : {}),
      ...(edit.calculationNotes ? { calculationNotes: { ...edit.calculationNotes } } : {}) };
  }
  if (identity.kind === 'class') {
    check(source?.kind === 'class', 'New class mechanics require a separate engine capability');
    return { id: identity.id, kind: 'class', category: null, index: identity.index, names: edit.names, description: edit.description, progression: [...edit.progression] };
  }
  check(source || edit.effectMode === 'replace', 'New items need explicit effects');
  const weapon = edit.kind === 'equipment' && edit.category <= 13;
  let tokens = source?.calculation_code ? source.calculation_code.split('_') : [];
  const weaponToken = tokens.find(token => /^18=W\d+$/.test(token));
  if (edit.effectMode === 'replace') tokens = [];
  if (edit.effectMode === 'patch') {
    const replaced = new Set(edit.effects.map(effect => String(effect.stat)));
    tokens = tokens.filter(token => !replaced.has(token.split('=')[0]));
  }
  if (edit.effectMode !== 'preserve') tokens.push(...edit.effects.map(effect => effect.stat + '=' + effect.value + (effect.unit === 'percent' ? '%' : '')));
  if (weapon) {
    check(edit.baseAttack !== null || weaponToken, 'Weapon attack must be specified');
    tokens = tokens.filter(token => !/^18=W/.test(token));
    tokens.unshift(edit.baseAttack === null ? weaponToken : '18=W' + edit.baseAttack);
  }
  return {
    id: identity.id, kind: identity.kind, category: identity.category, index: identity.index,
    engineId: identity.kind === 'equipment' ? identity.category * 10000 + identity.index : identity.index,
    engineKey: source?.name.jp || 'Modern:' + identity.id,
    names: edit.names, description: edit.description, notes: edit.notes, acquisition: edit.acquisition, modifiers: edit.modifiers,
    level: edit.level, sockets: edit.sockets, disabled: edit.disabled, calculationCode: tokens.join('_'),
    compatibility: edit.kind === 'equipment' ? [...(source?.compatibility_flags.slice(0, 2) || [1, 1]), ...edit.races, ...edit.classes] : edit.slots,
    parameter6: source?.legacy_parameter_6 ?? '', soulParameters: source?.legacy_parameters_5_6 || ['', ''], trailing: source?.legacy_trailing_value ?? ''
  };
}
