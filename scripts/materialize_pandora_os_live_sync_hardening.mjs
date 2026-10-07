#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { baselineById } from '../admin-api/src/catalog-baseline.mjs';
import { draftFromSource, validateDraft } from '../admin-api/src/catalog-model.mjs';
import { buildReleaseRows as buildOriginalReleaseRows, loadInputs as loadOriginalInputs } from './materialize_pandora_os_live_sync.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const MIGRATION_NAME = '0007_pandora_os_live_item_sync_hardening.sql';
const DATA_DIR = path.join(ROOT, 'admin-api', 'data');
const ITEMS_FILE = 'pandora-os-live-items-20261007.json';
const SOULS_FILE = 'pandora-os-live-souls-20261007.json';
const ENGLISH_FILE = 'pandora-os-live-strings-en-20261007.json';
const MAP_FILE = 'pandora-os-live-map-20261007-v2.json';

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

export const EQUIPMENT_CATEGORY = {
  '1H_SWORD': 0, '2H_SWORD': 1, '1H_AXE': 2, '2H_AXE': 3, LANCE: 4, POLE_ARM: 5,
  '1H_TRUMP_WEAPON': 6, '2H_TRUMP_WEAPON': 7, BOW: 8, CROSSBOW: 9,
  '1H_BLUNT_WEAPON': 10, '2H_BLUNT_WEAPON': 11, WAND: 12, STAFF: 13,
  FOOT_SHIELD: 20, HELMET: 30, TORSO: 31, GLOVES: 32, CUISSES: 33, BOOTS: 34,
  MANTLE: 35, EARRING: 40, NECKLACE: 41, BELT: 42, RING: 43
};
export const SLOT_CATEGORY = {
  head: 30, body: 31, gloves: 32, legs: 33, feet: 34, shield: 20,
  cloak: 35, ear: 40, neck: 41, belt: 42, ring: 43
};
export const SOUL_SLOT = { weapon: 0, shield: 1, head: 2, body: 3, gloves: 4, legs: 5, feet: 6, belt: 7 };

// Only mechanics that have a verified Modern stat representation are converted.
// Unknown proc/formula effects remain in the frozen server snapshot and description;
// they never cause an existing calculation token to be guessed away.
export const EFFECT_MAP = {
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
  EP_AURADAMAGE_CONST: [33, 'flat'],
  EP_AURADAMAGE_SCALE: [33, 'percent'],
  EP_ARMORCLASS_CONST: [49, 'flat'],
  EP_ARMORCLASS_SCALE: [49, 'percent'],
  EP_ONDAMAGE_FIN_DAMAGE_CONST: [52, 'flat'],
  EP_ONDAMAGE_FIN_DAMAGE_SCALE: [52, 'percent'],
  EP_ONDAMAGE_ELEM_SCALE: [60, 'percent'],
  EP_TOHIT_CONST: [62, 'flat'],
  EP_TOHIT_SCALE: [62, 'percent'],
  EP_AVOIDANCE_CONST: [65, 'flat'],
  EP_CRITICALRATE_CONST: [69, 'flat'],
  EP_CRITICAL_REGIST: [70, 'flat', 'negate'],
  EP_ATTACKINTERVAL_SCALE: [73, 'flat'],
  EP_MOVESPEED_SCALE: [74, 'flat'],
  EP_RESTMAP_MOVESPEED_SCALE: [75, 'flat'],
  EP_RACE_MANA_COSTCUT: [76, 'flat', 'negate'],
  EP_SKILL_DELAY: [77, 'flat', 'negate'],
  EP_SKILL_DELAY_FIN: [77, 'flat'],
  EP_SKILL_BENCH: [79, 'flat'],
  EP_BADEFFECT_TIME_CAST_SCALE: [80, 'flat'],
  EP_VOLUME_EXP: [82, 'flat'],
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
  EP_BADEFFECT_TIME_SCALE: [162, 'flat', 'negate'],
  EP_BUFF_TOHIT_SCALE: [181, 'flat'],
  EP_SPECIAL_WARDING_TYPE2: [182, 'flat']
};

export function serverCategory(item) {
  return EQUIPMENT_CATEGORY[item.kind] ?? SLOT_CATEGORY[item.slot] ?? null;
}
export function convertedEffects(server, includeArmorClass) {
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
export function soulSlots(server) {
  const result = Array(8).fill(0);
  for (const slot of server.slots || []) {
    invariant(Object.hasOwn(SOUL_SLOT, slot), 'Unknown Pandora OS Soul slot: ' + slot);
    result[SOUL_SLOT[slot]] = 1;
  }
  return result;
}
export function serverPatch(kind, server, english) {
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
    // Calculator/Wiki data contains historical rows flagged unavailable. They
    // stay frozen in the audit snapshots but must not override the current
    // playable catalog until the server exposes them as obtainable.
    if (server.unobtainable || server.npcOnly || String(server.kind || '').startsWith('DECO_')) continue;
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
export function buildUnavailableRows(originalInputs = loadOriginalInputs()) {
  const rows = [];
  for (const row of buildOriginalReleaseRows(originalInputs)) {
    if (row.mode !== 'server' || row.identity.kind !== 'equipment') continue;
    const serverId = row.metadata?.serverId;
    const server = originalInputs.items[String(serverId)] || originalInputs.items[serverId];
    if (!server || !(server.unobtainable || server.npcOnly || String(server.kind || '').startsWith('DECO_'))) continue;
    rows.push({ identity: row.identity, serverId, patch: row.patch, fallback: row.fallback });
  }
  return rows.sort((a, b) => a.identity.id.localeCompare(b.identity.id, 'en', { numeric: true }));
}

export function buildCosmeticPruneRows(releaseRows = buildReleaseRows()) {
  const releaseIds = new Set(releaseRows.map(row => row.identity.id));
  const originalServerIds = new Set(
    buildOriginalReleaseRows(loadOriginalInputs()).filter(row => row.mode === 'server').map(row => row.identity.id)
  );
  const rows = [];
  for (const source of baselineById.values()) {
    const kind = sourceKind(source);
    if (!kind || releaseIds.has(source.id) || originalServerIds.has(source.id)) continue;
    const raw = String(source.name?.en || '').trim();
    const normalized = stripOuterParentheses(raw);
    if (!normalized || normalized === raw) continue;
    const identity = identityFor(source, kind);
    const edit = validateDraft(draftFromSource(source, kind), identity);
    rows.push({ identity, expected: { identity, edit } });
  }
  return rows.sort((a, b) => a.identity.id.localeCompare(b.identity.id, 'en', { numeric: true }));
}

export function buildCosmeticPruneInsertStatements(rows = buildCosmeticPruneRows()) {
  return rows.map((row, index) => {
    const statement =
      'INSERT INTO _pandora_os_live_cosmetic_prune (release_order, identity_id, expected_json) VALUES (' +
      index + ', ' + sqlQuote(row.identity.id) + ', ' + sqlQuote(JSON.stringify(row.expected)) + ');';
    invariant(Buffer.byteLength(statement) < 16384, 'Pandora OS cosmetic prune row exceeds safe D1 statement size: ' + row.identity.id);
    return statement;
  });
}

export function buildUnavailableInsertStatements(rows = buildUnavailableRows()) {
  return rows.map((row, index) => {
    const statement =
      'INSERT INTO _pandora_os_live_unavailable (release_order, identity_id, patch_json, fallback_json) VALUES (' +
      index + ', ' + sqlQuote(row.identity.id) + ', ' + sqlQuote(JSON.stringify(row.patch)) + ', ' +
      sqlQuote(JSON.stringify(row.fallback)) + ');';
    invariant(Buffer.byteLength(statement) < 16384, 'Pandora OS unavailable revert row exceeds safe D1 statement size: ' + row.identity.id);
    return statement;
  });
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

export function buildMigration(
  rows = buildReleaseRows(),
  cosmeticRows = buildCosmeticPruneRows(rows),
  unavailableRows = buildUnavailableRows()
) {
  const releaseStatements = buildReleaseInsertStatements(rows).join('\n');
  const cosmeticStatements = buildCosmeticPruneInsertStatements(cosmeticRows).join('\n');
  const unavailableStatements = buildUnavailableInsertStatements(unavailableRows).join('\n');
  return `-- Generated deterministically by scripts/materialize_pandora_os_live_sync_hardening.mjs.
-- Frozen source: pandorasaga-os.com /gamedata snapshots captured 2026-10-07.
-- Revision 83 hardens the already deployed revision 82:
--  * applies only current/obtainable one-to-one server matches;
--  * safely reverts unchanged revision-82 overrides for unavailable equipment to revision 79/baseline;
--  * removes unchanged cosmetic-only parenthesis overrides now handled by the shared baseline layer.
-- Any entry edited after revision 82 is retained unless it is an intentional current-server field patch.
CREATE TABLE _pandora_os_live_guard (ok INTEGER NOT NULL CHECK (ok = 1));
INSERT INTO _pandora_os_live_guard (ok)
SELECT CASE
  WHEN (SELECT version FROM catalog_head WHERE id = 1) = 82
   AND EXISTS (SELECT 1 FROM catalog_revisions WHERE version = 79)
  THEN 1 ELSE 0 END;

CREATE TABLE _pandora_os_live_release (
  release_order INTEGER PRIMARY KEY,
  identity_id TEXT NOT NULL UNIQUE,
  mode TEXT NOT NULL CHECK (mode IN ('normalize', 'server')),
  expected_en TEXT,
  patch_json TEXT NOT NULL CHECK (json_valid(patch_json)),
  fallback_json TEXT NOT NULL CHECK (json_valid(fallback_json))
);
${releaseStatements}

CREATE TABLE _pandora_os_live_cosmetic_prune (
  release_order INTEGER PRIMARY KEY,
  identity_id TEXT NOT NULL UNIQUE,
  expected_json TEXT NOT NULL CHECK (json_valid(expected_json))
);
${cosmeticStatements}

CREATE TABLE _pandora_os_live_unavailable (
  release_order INTEGER PRIMARY KEY,
  identity_id TEXT NOT NULL UNIQUE,
  patch_json TEXT NOT NULL CHECK (json_valid(patch_json)),
  fallback_json TEXT NOT NULL CHECK (json_valid(fallback_json))
);
${unavailableStatements}

CREATE TABLE _pandora_os_live_snapshot (
  payload_json TEXT NOT NULL CHECK (json_valid(payload_json))
);

INSERT INTO _pandora_os_live_snapshot (payload_json)
SELECT COALESCE(json_group_array(json(entry)), '[]')
FROM (
  SELECT
    CASE
      WHEN incoming.identity_id IS NOT NULL
        THEN json_patch(existing.value, incoming.patch_json)
      WHEN unavailable.identity_id IS NOT NULL
       AND previous.value IS NOT NULL
       AND json(existing.value) = json(json_patch(previous.value, unavailable.patch_json))
        THEN previous.value
      ELSE existing.value
    END AS entry,
    0 AS release_group,
    CAST(existing.key AS INTEGER) AS release_order
  FROM catalog_head AS head
  JOIN json_each(head.snapshot_json) AS existing
  LEFT JOIN _pandora_os_live_release AS incoming
    ON incoming.identity_id = json_extract(existing.value, '$.identity.id')
  LEFT JOIN _pandora_os_live_cosmetic_prune AS cosmetic
    ON cosmetic.identity_id = json_extract(existing.value, '$.identity.id')
  LEFT JOIN _pandora_os_live_unavailable AS unavailable
    ON unavailable.identity_id = json_extract(existing.value, '$.identity.id')
  LEFT JOIN json_each((SELECT snapshot_json FROM catalog_revisions WHERE version = 79)) AS previous
    ON json_extract(previous.value, '$.identity.id') = json_extract(existing.value, '$.identity.id')
  WHERE head.id = 1
    AND NOT (
      incoming.identity_id IS NULL
      AND unavailable.identity_id IS NOT NULL
      AND previous.value IS NULL
      AND json(existing.value) = json(unavailable.fallback_json)
    )
    AND NOT (
      incoming.identity_id IS NULL
      AND unavailable.identity_id IS NULL
      AND cosmetic.identity_id IS NOT NULL
      AND json(existing.value) = json(cosmetic.expected_json)
    )

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
SELECT 83, 83, payload_json, CAST(strftime('%s', 'now') AS INTEGER),
  'Pandora Saga OS live sync hardening'
FROM _pandora_os_live_snapshot;

UPDATE catalog_head
SET version = 83,
    impact_version = 83,
    snapshot_json = (SELECT payload_json FROM _pandora_os_live_snapshot),
    updated_at = CAST(strftime('%s', 'now') AS INTEGER)
WHERE id = 1;

DROP TABLE _pandora_os_live_snapshot;
DROP TABLE _pandora_os_live_unavailable;
DROP TABLE _pandora_os_live_cosmetic_prune;
DROP TABLE _pandora_os_live_release;
DROP TABLE _pandora_os_live_guard;
`;
}

export function materializeMigration(root = ROOT) {
  const rows = buildReleaseRows(loadInputs(root));
  const cosmeticRows = buildCosmeticPruneRows(rows);
  const unavailableRows = buildUnavailableRows();
  const destination = path.join(root, 'admin-api', 'migrations', MIGRATION_NAME);
  const content = buildMigration(rows, cosmeticRows, unavailableRows);
  fs.writeFileSync(destination, content, 'utf8');
  return {
    destination,
    bytes: Buffer.byteLength(content),
    entries: rows.length,
    cosmeticPrunes: cosmeticRows.length,
    unavailableReverts: unavailableRows.length
  };
}
const invoked = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (invoked) {
  const result = materializeMigration();
  console.log(`Materialized ${MIGRATION_NAME}: ${result.entries} current server overrides, ${result.cosmeticPrunes} cosmetic prune candidates, ${result.unavailableReverts} unavailable revert candidates, ${result.bytes} bytes`);
}
