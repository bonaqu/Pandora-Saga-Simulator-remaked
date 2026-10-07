#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { baselineById } from '../admin-api/src/catalog-baseline.mjs';
import { draftFromSource, validateDraft } from '../admin-api/src/catalog-model.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const MIGRATION_NAME = '0006_pandora_os_live_item_sync.sql';
const DATA_DIR = path.join(ROOT, 'admin-api', 'data');
const ITEMS_FILE = 'pandora-os-live-items-20261007.json';
const SOULS_FILE = 'pandora-os-live-souls-20261007.json';
const ENGLISH_FILE = 'pandora-os-live-strings-en-20261007.json';
const MAP_FILE = 'pandora-os-live-map-20261007.json';

function invariant(value, message) {
  if (!value) throw new Error(message);
}
function readJson(name) {
  return JSON.parse(fs.readFileSync(path.join(DATA_DIR, name), 'utf8'));
}
export function stripOuterParentheses(value) {
  let text = String(value || '').trim();
  if (!text) return text;
  let changed = false;
  while (text.length > 2 && text.startsWith('(') && text.endsWith(')')) {
    text = text.slice(1, -1).trim();
    changed = true;
  }
  // A few retained source names have only one surplus edge parenthesis
  // (for example "((Steadfast Soul)" / "(Dimension oul))"). Remove that
  // edge only when the remainder contains no opposite unmatched wrapper.
  if (text.startsWith('(') && !/[()]/.test(text.slice(1))) {
    text = text.slice(1).trim();
    changed = true;
  }
  if (text.endsWith(')') && !/[()]/.test(text.slice(0, -1))) {
    text = text.slice(0, -1).trim();
    changed = true;
  }
  return changed && text ? text : String(value || '').trim();
}
function sourceKind(source) {
  if (source?.id?.startsWith('equipment.')) return 'equipment';
  if (source?.id?.startsWith('soul.')) return 'soul';
  return null;
}
function identityFor(source, kind) {
  return kind === 'equipment'
    ? { id: source.id, kind, category: source.legacy_category_id, index: source.legacy_item_index }
    : { id: source.id, kind, category: null, index: source.legacy_id };
}
function deepMerge(base, patch) {
  if (Array.isArray(patch)) return [...patch];
  if (!patch || typeof patch !== 'object') return patch;
  const result = { ...(base || {}) };
  for (const [key, value] of Object.entries(patch)) {
    result[key] = value && typeof value === 'object' && !Array.isArray(value)
      ? deepMerge(result[key], value)
      : Array.isArray(value) ? [...value] : value;
  }
  return result;
}

const EQUIPMENT_CATEGORY = {
  '1H_SWORD': 0, '2H_SWORD': 1, '1H_AXE': 2, '2H_AXE': 3, LANCE: 4, POLE_ARM: 5,
  '1H_TRUMP_WEAPON': 6, '2H_TRUMP_WEAPON': 7, BOW: 8, CROSSBOW: 9,
  '1H_BLUNT_WEAPON': 10, '2H_BLUNT_WEAPON': 11, WAND: 12, STAFF: 13,
  FOOT_SHIELD: 20, HELMET: 30, TORSO: 31, GLOVES: 32, CUISSES: 33, BOOTS: 34,
  MANTLE: 35, EARRING: 40, NECKLACE: 41, BELT: 42, RING: 43
};
const SLOT_CATEGORY = {
  head: 30, body: 31, gloves: 32, legs: 33, feet: 34, shield: 20,
  cloak: 35, ear: 40, neck: 41, belt: 42, ring: 43
};
const SOUL_SLOT = { weapon: 0, shield: 1, head: 2, body: 3, gloves: 4, legs: 5, feet: 6, belt: 7 };

// Only mechanics that have a verified Modern stat representation are converted.
// Unknown proc/formula effects remain in the frozen server snapshot and description;
// they never cause an existing calculation token to be guessed away.
const EFFECT_MAP = {
  EP_VITARITY_CONST: [0, 'flat'],
  EP_STRENGTH_CONST: [1, 'flat'],
  EP_AGILITY_CONST: [2, 'flat'],
  EP_DEXTERITY_CONST: [3, 'flat'],
  EP_SPIRITUAL_CONST: [4, 'flat'],
  EP_INTELIGENCE_CONST: [5, 'flat'],
  EP_MAXLIFE_CONST: [6, 'flat'],
  EP_MAXLIFE_SCALE: [6, 'percent'],
  EP_MAXMANA_CONST: [7, 'flat'],
  EP_MAXMANA_SCALE: [7, 'percent'],
  EP_MASTERY_POTION: [8, 'flat'],
  EP_HEAL_TIME_SCALE: [10, 'flat'],
  EP_CAST_HEAL_LIFE_SCALE: [11, 'flat'],
  EP_HEAL_LIFE_REGENERATOR: [16, 'flat'],
  EP_DAMAGERATE_CONST: [18, 'flat'],
  EP_ATTACK_BACKATK_RATE: [20, 'flat'],
  EP_DAMAGERATE_SCALE: [18, 'percent'],
  EP_SKILL_EQUIP_DAMAGERATE: [18, 'flat'],
  EP_ELEMENT_DAMAGE_SCALE: [42, 'flat'],
  EP_ARMORCLASS_CONST: [49, 'flat'],
  EP_ONDAMAGE_FIN_DAMAGE_CONST: [52, 'flat'],
  EP_ONDAMAGE_FIN_DAMAGE_SCALE: [52, 'percent'],
  EP_ONDAMAGE_ELEM_SCALE: [60, 'percent'],
  EP_TOHIT_CONST: [62, 'flat'],
  EP_AVOIDANCE_CONST: [65, 'flat'],
  EP_CRITICALRATE_CONST: [69, 'flat'],
  EP_ATTACKINTERVAL_SCALE: [73, 'flat'],
  EP_MOVESPEED_SCALE: [74, 'flat'],
  EP_RACE_MANA_COSTCUT: [76, 'flat', 'negate'],
  EP_SKILL_DELAY: [77, 'flat', 'negate'],
  EP_SKILL_DELAY_FIN: [77, 'flat'],
  EP_SKILL_BENCH: [79, 'flat'],
  EP_ONHIT_STUN: [91, 'flat', 'chanceB'],
  EP_BLOCK_BREAK_RESIST: [133, 'flat'],
  EP_CASTINGCANCEL_RESISTANCE_CONST: [134, 'flat'],
  EP_ONDAMAGE_REFLECTION: [135, 'flat'],
  EP_FIRE_RESISTANCE_CONST: [138, 'flat'],
  EP_COLD_RESISTANCE_CONST: [139, 'flat'],
  EP_LIGHTNING_RESISTANCE_CONST: [140, 'flat'],
  EP_POISON_RESISTANCE_CONST: [141, 'flat'],
  EP_CHARM_RESISTANCE_CONST: [142, 'flat'],
  EP_HOLY_RESISTANCE_CONST: [143, 'flat'],
  EP_DARK_RESISTANCE_CONST: [144, 'flat'],
  EP_MAGIC_RESISTANCE_CONST: [145, 'flat'],
  EP_IMMUNE_VIT_TYPE: [146, 'flat'],
  EP_IMMUNE_SPI_TYPE: [147, 'flat'],
  EP_IMMUNE_BURN: [148, 'flat'],
  EP_IMMUNE_STUN: [149, 'flat'],
  EP_IMMUNE_NUMB: [150, 'flat'],
  EP_IMMUNE_TUMBLE: [151, 'flat'],
  EP_IMMUNE_KNOCKBACK: [153, 'flat'],
  EP_IMMUNE_SLEEP: [156, 'flat'],
  EP_IMMUNE_SILENCE: [158, 'flat'],
  EP_IMMUNE_EVIL: [159, 'flat'],
  EP_IMMUNE_CURSE: [160, 'flat'],
  EP_BADEFFECT_TIME_SCALE: [162, 'flat', 'negate']
};

function serverCategory(item) {
  return EQUIPMENT_CATEGORY[item.kind] ?? SLOT_CATEGORY[item.slot] ?? null;
}
function convertedEffects(server, includeArmorClass) {
  const values = new Map();
  let complete = true;
  for (const effect of server.effects || []) {
    const mapped = EFFECT_MAP[effect.func];
    if (!mapped) {
      complete = false;
      continue;
    }
    // Higher-enhancement variants cannot be represented by the current flat
    // catalog row. Patch the base (min=0) effect and preserve the retained
    // conditional mechanic rather than summing mutually exclusive tiers.
    if (Number(effect.min || 0) > 0) {
      complete = false;
      continue;
    }
    const [stat, unit, transform] = mapped;
    let value = transform === 'chanceB' ? effect.b : effect.a;
    if (typeof value !== 'number' || !Number.isFinite(value)) {
      complete = false;
      continue;
    }
    // These zero-valued server rows mean "derived from enhancement", not zero.
    // Keep their native Legacy mechanic instead of replacing it with a fake 0.
    if (value === 0 && (effect.func === 'EP_RACE_MANA_COSTCUT' || effect.func === 'EP_SKILL_EQUIP_DAMAGERATE')) {
      complete = false;
      continue;
    }
    if (transform === 'negate') value = -value;
    const key = stat + ':' + unit;
    values.set(key, (values.get(key) || 0) + value);
  }
  if (includeArmorClass && server.AC !== null && server.AC !== undefined) {
    const key = '49:flat';
    values.set(key, (values.get(key) || 0) + Number(server.AC));
  }
  return {
    complete,
    effects: [...values.entries()].map(([key, value]) => {
      const [stat, unit] = key.split(':');
      return { stat: Number(stat), unit, value };
    }).sort((a, b) => a.stat - b.stat || a.unit.localeCompare(b.unit))
  };
}
function soulSlots(server) {
  const result = Array(8).fill(0);
  for (const slot of server.slots || []) {
    invariant(Object.hasOwn(SOUL_SLOT, slot), 'Unknown Pandora OS Soul slot: ' + slot);
    result[SOUL_SLOT[slot]] = 1;
  }
  return result;
}
function serverPatch(kind, server, english) {
  const englishText = english?.n || '';
  invariant(englishText, 'Missing Pandora OS English name for ' + server.id);
  const patch = {
    names: { en: englishText, ru: server.name || '' },
    description: { en: english?.d || '', ru: server.desc || '' }
  };
  if (kind === 'equipment') {
    patch.level = Number(server.level ?? 0);
    patch.sockets = Number(server.soulslot ?? 0);
    if (serverCategory(server) <= 13 && server.W !== null && server.W !== undefined)
      patch.baseAttack = Number(server.W);
    const converted = convertedEffects(server, true);
    patch.effectMode = converted.complete ? 'replace' : 'patch';
    patch.effects = converted.effects;
    if (serverCategory(server) <= 13 && patch.baseAttack === undefined)
      throw new Error('Mapped weapon lacks W: ' + server.id);
  } else {
    patch.slots = soulSlots(server);
    const converted = convertedEffects(server, false);
    patch.effectMode = converted.complete ? 'replace' : 'patch';
    patch.effects = converted.effects;
  }
  return patch;
}

export function loadInputs(root = ROOT) {
  const dataDir = path.join(root, 'admin-api', 'data');
  const read = name => JSON.parse(fs.readFileSync(path.join(dataDir, name), 'utf8'));
  return { items: read(ITEMS_FILE), souls: read(SOULS_FILE), english: read(ENGLISH_FILE), mapping: read(MAP_FILE) };
}
function addPatch(rows, source, kind, editPatch, mode, expectedEnglish = null, metadata = {}) {
  const identity = identityFor(source, kind);
  const current = rows.get(identity.id);
  const mergedPatch = deepMerge(current?.patch?.edit || {}, editPatch);
  const finalMode = mode === 'server' ? 'server' : current?.mode || mode;
  const fullEdit = validateDraft(deepMerge(draftFromSource(source, kind), mergedPatch), identity);
  rows.set(identity.id, {
    identity,
    mode: finalMode,
    expectedEnglish: finalMode === 'normalize' ? expectedEnglish : null,
    patch: { edit: mergedPatch },
    fallback: { identity, edit: fullEdit },
    metadata: { ...(current?.metadata || {}), ...metadata }
  });
}

export function buildReleaseRows(inputs = loadInputs()) {
  const rows = new Map();
  // Parenthesized untranslated baseline names are normalized by the shared
  // source/client data layer, not materialized as hundreds of D1 overrides.
  // This keeps the public catalog compact and still makes Admin + Modern UI
  // display the normalized names consistently.
  const seenServerItems = new Set(), seenServerSouls = new Set(), seenProject = new Set();
  for (const match of inputs.mapping.equipment) {
    invariant(!seenServerItems.has(match.serverId), 'Duplicate mapped equipment server ID: ' + match.serverId);
    invariant(!seenProject.has(match.projectId), 'Duplicate mapped project ID: ' + match.projectId);
    seenServerItems.add(match.serverId); seenProject.add(match.projectId);
    const server = inputs.items[String(match.serverId)] || inputs.items[match.serverId];
    const source = baselineById.get(match.projectId);
    invariant(server && sourceKind(source) === 'equipment', 'Invalid equipment mapping: ' + JSON.stringify(match));
    invariant(server.slot && server.slot !== 'arrow', 'Resource/arrow must not enter equipment sync: ' + match.serverId);
    invariant(serverCategory(server) === source.legacy_category_id,
      'Server/project equipment category mismatch for ' + match.projectId);
    addPatch(rows, source, 'equipment', serverPatch('equipment', server, inputs.english.items?.[String(match.serverId)] || inputs.english.items?.[match.serverId]),
      'server', null, { serverId: match.serverId, match: match.match });
  }
  for (const match of inputs.mapping.souls) {
    invariant(!seenServerSouls.has(match.serverId), 'Duplicate mapped Soul server ID: ' + match.serverId);
    invariant(!seenProject.has(match.projectId), 'Duplicate mapped project ID: ' + match.projectId);
    seenServerSouls.add(match.serverId); seenProject.add(match.projectId);
    const server = inputs.souls[String(match.serverId)] || inputs.souls[match.serverId];
    const source = baselineById.get(match.projectId);
    invariant(server && sourceKind(source) === 'soul', 'Invalid Soul mapping: ' + JSON.stringify(match));
    addPatch(rows, source, 'soul', serverPatch('soul', server, inputs.english.souls?.[String(match.serverId)] || inputs.english.souls?.[match.serverId]),
      'server', null, { serverId: match.serverId, match: match.match });
  }
  return [...rows.values()].sort((a, b) => a.identity.id.localeCompare(b.identity.id, 'en', { numeric: true }));
}
function sqlQuote(value) {
  return "'" + String(value).replaceAll("'", "''") + "'";
}
export function buildReleaseInsertStatements(rows = buildReleaseRows()) {
  return rows.map((row, index) => {
    const statement =
      'INSERT INTO _pandora_os_live_release (release_order, identity_id, mode, expected_en, patch_json, fallback_json) VALUES (' +
      index + ', ' + sqlQuote(row.identity.id) + ', ' + sqlQuote(row.mode) + ', ' +
      (row.expectedEnglish === null ? 'NULL' : sqlQuote(row.expectedEnglish)) + ', ' +
      sqlQuote(JSON.stringify(row.patch)) + ', ' + sqlQuote(JSON.stringify(row.fallback)) + ');';
    invariant(Buffer.byteLength(statement) < 16384, 'Pandora OS live sync row exceeds safe D1 statement size: ' + row.identity.id);
    return statement;
  });
}

export function buildMigration(rows = buildReleaseRows()) {
  const statements = buildReleaseInsertStatements(rows).join('\n');
  return `-- Generated deterministically by scripts/materialize_pandora_os_live_sync.mjs.
-- Frozen source: pandorasaga-os.com /gamedata snapshots captured 2026-10-07.
-- Production head was revision 81; revision 79 is accepted for a clean migration chain.
-- Existing override entries are merge-patched so unrelated manual/admin fields survive.
CREATE TABLE _pandora_os_live_guard (ok INTEGER NOT NULL CHECK (ok = 1));
INSERT INTO _pandora_os_live_guard (ok)
SELECT CASE WHEN (SELECT version FROM catalog_head WHERE id = 1) IN (79, 81) THEN 1 ELSE 0 END;

CREATE TABLE _pandora_os_live_release (
  release_order INTEGER PRIMARY KEY,
  identity_id TEXT NOT NULL UNIQUE,
  mode TEXT NOT NULL CHECK (mode IN ('normalize', 'server')),
  expected_en TEXT,
  patch_json TEXT NOT NULL CHECK (json_valid(patch_json)),
  fallback_json TEXT NOT NULL CHECK (json_valid(fallback_json))
);
${statements}

CREATE TABLE _pandora_os_live_snapshot (
  payload_json TEXT NOT NULL CHECK (json_valid(payload_json))
);
INSERT INTO _pandora_os_live_snapshot (payload_json)
SELECT COALESCE(json_group_array(json(entry)), '[]')
FROM (
  SELECT
    CASE
      WHEN incoming.identity_id IS NULL THEN existing.value
      WHEN incoming.mode = 'normalize'
        AND COALESCE(json_extract(existing.value, '$.edit.names.en'), '') <> incoming.expected_en
        THEN existing.value
      ELSE json_patch(existing.value, incoming.patch_json)
    END AS entry,
    0 AS release_group,
    CAST(existing.key AS INTEGER) AS release_order
  FROM catalog_head AS head
  JOIN json_each(head.snapshot_json) AS existing
  LEFT JOIN _pandora_os_live_release AS incoming
    ON incoming.identity_id = json_extract(existing.value, '$.identity.id')
  WHERE head.id = 1

  UNION ALL

  SELECT incoming.fallback_json AS entry, 1 AS release_group, incoming.release_order
  FROM _pandora_os_live_release AS incoming
  WHERE NOT EXISTS (
    SELECT 1
    FROM catalog_head AS head, json_each(head.snapshot_json) AS existing
    WHERE head.id = 1
      AND json_extract(existing.value, '$.identity.id') = incoming.identity_id
  )
  ORDER BY release_group, release_order
);

INSERT INTO catalog_revisions (version, impact_version, snapshot_json, created_at, note)
SELECT 82, 82, payload_json, CAST(strftime('%s', 'now') AS INTEGER),
  'Pandora Saga OS live equipment/Soul sync'
FROM _pandora_os_live_snapshot;

UPDATE catalog_head
SET version = 82,
    impact_version = 82,
    snapshot_json = (SELECT payload_json FROM _pandora_os_live_snapshot),
    updated_at = CAST(strftime('%s', 'now') AS INTEGER)
WHERE id = 1;

DROP TABLE _pandora_os_live_snapshot;
DROP TABLE _pandora_os_live_release;
DROP TABLE _pandora_os_live_guard;
`;
}

export function materializeMigration(root = ROOT) {
  const rows = buildReleaseRows(loadInputs(root));
  const destination = path.join(root, 'admin-api', 'migrations', MIGRATION_NAME);
  const content = buildMigration(rows);
  fs.writeFileSync(destination, content, 'utf8');
  const serverRows = rows.filter(row => row.mode === 'server').length;
  return { destination, bytes: Buffer.byteLength(content), entries: rows.length, serverRows };
}

const invoked = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (invoked) {
  const result = materializeMigration();
  console.log(`Materialized ${MIGRATION_NAME}: ${result.entries} overrides, ${result.serverRows} server-matched, ${result.bytes} bytes`);
}
