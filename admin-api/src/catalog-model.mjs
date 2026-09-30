// This is a validated data codec, not a game calculator. IDs and unit suffixes
// come from preserved Name.Option / Calc. Actual formulas stay in js/calc.js.
const BOTH = ['flat', 'percent'];
const FLAT = ['flat'];
export const LANGUAGES = ['en', 'ru', 'jp', 'tw'];
export const EQUIPMENT_CATEGORIES = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 20, 30, 31, 32, 33, 34, 35, 40, 41, 42, 43];
export const EFFECTS = [
  [0, 'STA', FLAT], [1, 'STR', FLAT], [2, 'AGI', FLAT], [3, 'DEX', FLAT], [4, 'SPR', FLAT], [5, 'INT', FLAT],
  [6, 'LP', BOTH], [7, 'MP', BOTH], [42, 'Magic attack (percentage points)', FLAT], [49, 'Defense', BOTH],
  [50, 'Front damage resistance', FLAT], [51, 'Back damage resistance', FLAT], [52, 'Physical damage resistance', BOTH],
  [60, 'Magic damage resistance (percentage points)', BOTH], [62, 'Accuracy', BOTH], [65, 'Dodge', BOTH],
  [69, 'Critical chance (percentage points)', FLAT], [70, 'Critical resistance (percentage points)', FLAT],
  [71, 'Critical damage (percentage points)', FLAT], [72, 'Critical damage resistance (percentage points)', FLAT],
  [73, 'Attack speed (percentage points)', FLAT], [74, 'Movement speed (percentage points)', FLAT],
  [76, 'MP cost (percentage points)', FLAT], [77, 'Casting speed (percentage points)', FLAT], [79, 'Cooldown (percentage points)', FLAT],
  [138, 'Fire resistance', FLAT], [139, 'Ice resistance', FLAT], [140, 'Lightning resistance', FLAT],
  [141, 'Poison resistance', FLAT], [142, 'Charm resistance', FLAT], [143, 'Light resistance', FLAT],
  [144, 'Dark resistance', FLAT], [145, 'Magic resistance', FLAT], [148, 'Burn resistance', FLAT],
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
const texts = source => Object.fromEntries(LANGUAGES.map(language => [language, source?.[language] || '']));

export function draftFromSource(source, kind) {
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
  check(Array.isArray(input.effects) && input.effects.length <= EFFECTS.length, 'Too many effects');
  const seen = new Set();
  result.effects = input.effects.map(effect => {
    keys(effect, ['stat', 'value', 'unit'], 'Effect');
    const definition = effectById.get(effect.stat);
    check(definition && definition.units.includes(effect.unit), 'Unsupported effect or unit');
    check(!seen.has(effect.stat), 'Duplicate stat'); seen.add(effect.stat);
    check(typeof effect.value === 'number' && Number.isFinite(effect.value) && Math.abs(effect.value) <= 10000 && Number.isInteger(effect.value * 100), 'Effect must be a bounded number with at most two decimals');
    return { stat: effect.stat, value: effect.value, unit: effect.unit };
  });
  check(result.effectMode !== 'preserve' || (result.effects.length === 0 && result.baseAttack === null), 'Preserve mode must not discard submitted effects');
  return result;
}

export function compileRecord(edit, identity, source) {
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
