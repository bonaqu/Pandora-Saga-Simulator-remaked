#!/usr/bin/env node
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { baselineById } from '../admin-api/src/catalog-baseline.mjs';
import { draftFromSource, validateDraft } from '../admin-api/src/catalog-model.mjs';
import { serverCategory, serverPatch } from './materialize_pandora_os_live_sync_hardening.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const MIGRATION_NAME = '0009_pandora_os_identity_reconcile.sql';
const DATA_DIR = path.join(ROOT, 'admin-api', 'data');
const ITEMS_FILE = 'pandora-os-live-items-20261007.json';
const SOULS_FILE = 'pandora-os-live-souls-20261007.json';
const ENGLISH_FILE = 'pandora-os-live-strings-en-20261007.json';
const MAP_V2_FILE = 'pandora-os-live-map-20261007-v2.json';
const MAP_V3_FILE = 'pandora-os-live-map-20261007-v3.json';

const CLASS_ORDER = [
  'WARRIOR', 'GLADIATOR', 'JUGGERNAUT', 'DRAGOON', 'KNIGHT', 'GENERAL', 'PALADIN',
  'SCOUT', 'ARCHER', 'SNIPER', 'PREDATOR', 'AGENT', 'ASSASSIN', 'DISTURBANCE',
  'ACOLYTE', 'PRIEST', 'CLERIC', 'ENCHANTER', 'ASCETIC', 'MONK', 'EXORCIST',
  'MAGE', 'WIZARD', 'WARLOCK', 'CONJURER', 'DARKROAR', 'JESTER', 'CALAMITY'
];

function invariant(value, message) {
  if (!value) throw new Error(message);
}
function readJson(root, name) {
  return JSON.parse(fs.readFileSync(path.join(root, 'admin-api', 'data', name), 'utf8'));
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
function identityFor(source) {
  return {
    id: source.id,
    kind: 'equipment',
    category: source.legacy_category_id,
    index: source.legacy_item_index
  };
}
function classFlags(server) {
  const classes = server?.classes && typeof server.classes === 'object' ? server.classes : {};
  const keys = Object.keys(classes);
  if (!keys.length) return Array(28).fill(1);
  return CLASS_ORDER.map(key => classes[key] ? 1 : 0);
}
export function stableCustomId(kind, serverId) {
  const hex = crypto.createHash('sha256')
    .update('pandora-remaked-complete-item-sync:' + kind + ':' + String(serverId))
    .digest('hex');
  const uuid = [
    hex.slice(0, 8),
    hex.slice(8, 12),
    '4' + hex.slice(13, 16),
    'a' + hex.slice(17, 20),
    hex.slice(20, 32)
  ].join('-');
  return 'modern.' + kind + '.' + uuid;
}
function englishFor(inputs, kind, id) {
  const bucket = kind === 'equipment' ? inputs.english.items : inputs.english.souls;
  return bucket?.[String(id)] || bucket?.[id] || null;
}
export function loadInputs(root = ROOT) {
  return {
    items: readJson(root, ITEMS_FILE),
    souls: readJson(root, SOULS_FILE),
    english: readJson(root, ENGLISH_FILE),
    v2: readJson(root, MAP_V2_FILE),
    v3: readJson(root, MAP_V3_FILE)
  };
}
function expectedRevision84CustomEdit(kind, server, english) {
  const category = kind === 'equipment' ? serverCategory(server) : null;
  const id = stableCustomId(kind, server.id);
  const identity = { id, kind, category, index: 1 };
  const patch = serverPatch(kind, server, english);
  patch.effectMode = 'replace';
  patch.disabled = false;
  if (kind === 'equipment') {
    patch.races = Array(6).fill(1);
    patch.classes = classFlags(server);
  } else {
    patch.modifiers = { en: english?.n || '', ru: server.name || '' };
  }
  const base = draftFromSource(null, kind);
  base.id = id;
  base.kind = kind;
  base.category = category;
  return validateDraft(deepMerge(base, patch), identity);
}

export function buildIdentityRows(inputs = loadInputs()) {
  const oldServerIds = new Set(inputs.v2.equipment.map(row => Number(row.serverId)));
  const oldProjectIds = new Set(inputs.v2.equipment.map(row => row.projectId));
  const added = inputs.v3.equipment.filter(row => !oldServerIds.has(Number(row.serverId)));
  invariant(added.length === 54, 'Expected exactly 54 newly reconciled equipment identities');

  const seenServer = new Set();
  const seenProject = new Set();
  return added.map(row => {
    const serverId = Number(row.serverId);
    invariant(!seenServer.has(serverId), 'Duplicate reconciliation server ID: ' + serverId);
    invariant(!seenProject.has(row.projectId), 'Duplicate reconciliation project ID: ' + row.projectId);
    invariant(!oldProjectIds.has(row.projectId), 'Reconciliation target was already mapped: ' + row.projectId);
    seenServer.add(serverId);
    seenProject.add(row.projectId);

    const server = inputs.items[String(serverId)] || inputs.items[serverId];
    const source = baselineById.get(row.projectId);
    invariant(server && source?.id?.startsWith('equipment.'), 'Invalid reconciliation row: ' + JSON.stringify(row));
    invariant(serverCategory(server) === source.legacy_category_id,
      'Reconciliation category mismatch for ' + row.projectId);

    const english = englishFor(inputs, 'equipment', serverId);
    const identity = identityFor(source);
    const patch = serverPatch('equipment', server, english);
    patch.disabled = false;
    patch.classes = classFlags(server);
    const fullEdit = validateDraft(deepMerge(draftFromSource(source, 'equipment'), patch), identity);

    return {
      serverId,
      projectId: row.projectId,
      customId: stableCustomId('equipment', serverId),
      patch: { edit: patch },
      fallback: { identity, edit: fullEdit },
      expectedCustomEdit: expectedRevision84CustomEdit('equipment', server, english)
    };
  }).sort((a, b) => a.serverId - b.serverId);
}

export function buildSoulModifierRows(inputs = loadInputs()) {
  const mapped = new Set(inputs.v2.souls.map(row => Number(row.serverId)));
  return Object.values(inputs.souls)
    .filter(server => !mapped.has(Number(server.id)))
    .map(server => {
      const english = englishFor(inputs, 'soul', server.id);
      invariant(english?.n && server.name, 'Missing bilingual Soul name for ' + server.id);
      return {
        serverId: Number(server.id),
        customId: stableCustomId('soul', server.id),
        oldEnglishModifier: english.n,
        oldRussianModifier: server.name
      };
    })
    .sort((a, b) => a.serverId - b.serverId);
}

function sqlQuote(value) {
  return "'" + String(value).replaceAll("'", "''") + "'";
}
export function buildIdentityInsertStatements(rows = buildIdentityRows()) {
  return rows.map((row, index) => {
    const statement =
      'INSERT INTO _pso_identity_reconcile (release_order, identity_id, custom_id, patch_json, fallback_json, expected_custom_edit_json) VALUES (' +
      index + ', ' + sqlQuote(row.projectId) + ', ' + sqlQuote(row.customId) + ', ' +
      sqlQuote(JSON.stringify(row.patch)) + ', ' + sqlQuote(JSON.stringify(row.fallback)) + ', ' +
      sqlQuote(JSON.stringify(row.expectedCustomEdit)) + ');';
    invariant(Buffer.byteLength(statement) < 16384,
      'Identity reconciliation row exceeds safe D1 statement size: ' + row.projectId);
    return statement;
  });
}
export function buildSoulModifierInsertStatements(rows = buildSoulModifierRows()) {
  return rows.map((row, index) => {
    const statement =
      'INSERT INTO _pso_soul_modifier_fix (release_order, custom_id, expected_en, expected_ru) VALUES (' +
      index + ', ' + sqlQuote(row.customId) + ', ' + sqlQuote(row.oldEnglishModifier) + ', ' +
      sqlQuote(row.oldRussianModifier) + ');';
    invariant(Buffer.byteLength(statement) < 16384,
      'Soul modifier reconciliation row exceeds safe D1 statement size: ' + row.customId);
    return statement;
  });
}

export function buildMigration(identityRows = buildIdentityRows(), soulRows = buildSoulModifierRows()) {
  const identityStatements = buildIdentityInsertStatements(identityRows).join('\n');
  const soulStatements = buildSoulModifierInsertStatements(soulRows).join('\n');
  return `-- Generated deterministically by scripts/materialize_pandora_os_identity_reconcile.mjs.
-- Revision 85 reconciles verified retained item identities after revision 84 expanded coverage.
-- Historical revision 84 remains immutable for pinned builds.
CREATE TABLE _pso_identity_guard (ok INTEGER NOT NULL CHECK (ok = 1));
INSERT INTO _pso_identity_guard (ok)
SELECT CASE WHEN (SELECT version FROM catalog_head WHERE id = 1) = 84 THEN 1 ELSE 0 END;

CREATE TABLE _pso_identity_reconcile (
  release_order INTEGER PRIMARY KEY,
  identity_id TEXT NOT NULL UNIQUE,
  custom_id TEXT NOT NULL UNIQUE,
  patch_json TEXT NOT NULL CHECK (json_valid(patch_json)),
  fallback_json TEXT NOT NULL CHECK (json_valid(fallback_json)),
  expected_custom_edit_json TEXT NOT NULL CHECK (json_valid(expected_custom_edit_json))
);
${identityStatements}

CREATE TABLE _pso_soul_modifier_fix (
  release_order INTEGER PRIMARY KEY,
  custom_id TEXT NOT NULL UNIQUE,
  expected_en TEXT NOT NULL,
  expected_ru TEXT NOT NULL
);
${soulStatements}

CREATE TABLE _pso_removable_custom (
  custom_id TEXT PRIMARY KEY
);
INSERT INTO _pso_removable_custom (custom_id)
SELECT reconcile.custom_id
FROM _pso_identity_reconcile AS reconcile
JOIN catalog_head AS head ON head.id = 1
JOIN json_each(head.snapshot_json) AS existing
  ON json_extract(existing.value, '$.identity.id') = reconcile.custom_id
LEFT JOIN catalog_drafts AS draft ON draft.id = reconcile.custom_id
WHERE json(json_extract(existing.value, '$.edit')) = json(reconcile.expected_custom_edit_json)
  AND COALESCE(draft.is_dirty, 0) = 0;

CREATE TABLE _pso_identity_snapshot (
  payload_json TEXT NOT NULL CHECK (json_valid(payload_json))
);

INSERT INTO _pso_identity_snapshot (payload_json)
SELECT COALESCE(json_group_array(json(entry)), '[]')
FROM (
  SELECT
    CASE
      WHEN incoming.identity_id IS NOT NULL
        THEN json_patch(existing.value, incoming.patch_json)
      WHEN soulfix.custom_id IS NOT NULL
       AND COALESCE(json_extract(existing.value, '$.edit.modifiers.en'), '') = soulfix.expected_en
       AND COALESCE(json_extract(existing.value, '$.edit.modifiers.ru'), '') = soulfix.expected_ru
        THEN json_set(existing.value, '$.edit.modifiers', json('{"jp":"","en":"","tw":"","ru":""}'))
      ELSE existing.value
    END AS entry,
    0 AS release_group,
    CAST(existing.key AS INTEGER) AS release_order
  FROM catalog_head AS head
  JOIN json_each(head.snapshot_json) AS existing
  LEFT JOIN _pso_identity_reconcile AS incoming
    ON incoming.identity_id = json_extract(existing.value, '$.identity.id')
  LEFT JOIN _pso_soul_modifier_fix AS soulfix
    ON soulfix.custom_id = json_extract(existing.value, '$.identity.id')
  WHERE head.id = 1
    AND NOT EXISTS (
      SELECT 1 FROM _pso_removable_custom AS removable
      WHERE removable.custom_id = json_extract(existing.value, '$.identity.id')
    )

  UNION ALL

  SELECT incoming.fallback_json AS entry, 1 AS release_group, incoming.release_order
  FROM _pso_identity_reconcile AS incoming
  WHERE NOT EXISTS (
    SELECT 1
    FROM catalog_head AS head, json_each(head.snapshot_json) AS existing
    WHERE head.id = 1
      AND json_extract(existing.value, '$.identity.id') = incoming.identity_id
  )

  ORDER BY release_group, release_order
);

DELETE FROM catalog_drafts
WHERE id IN (SELECT custom_id FROM _pso_removable_custom)
  AND is_dirty = 0;

DELETE FROM catalog_allocations
WHERE id IN (SELECT custom_id FROM _pso_removable_custom);

INSERT INTO catalog_revisions (version, impact_version, snapshot_json, created_at, note)
SELECT 85, 85, payload_json, CAST(strftime('%s', 'now') AS INTEGER),
  'Reconcile verified Modern item identities'
FROM _pso_identity_snapshot;

UPDATE catalog_head
SET version = 85,
    impact_version = 85,
    snapshot_json = (SELECT payload_json FROM _pso_identity_snapshot),
    updated_at = CAST(strftime('%s', 'now') AS INTEGER)
WHERE id = 1;

DROP TABLE _pso_identity_snapshot;
DROP TABLE _pso_removable_custom;
DROP TABLE _pso_soul_modifier_fix;
DROP TABLE _pso_identity_reconcile;
DROP TABLE _pso_identity_guard;
`;
}

export function materializeMigration(root = ROOT) {
  const inputs = loadInputs(root);
  const identityRows = buildIdentityRows(inputs);
  const soulRows = buildSoulModifierRows(inputs);
  const content = buildMigration(identityRows, soulRows);
  const destination = path.join(root, 'admin-api', 'migrations', MIGRATION_NAME);
  fs.writeFileSync(destination, content, 'utf8');
  return {
    destination,
    bytes: Buffer.byteLength(content),
    identities: identityRows.length,
    soulModifiers: soulRows.length
  };
}

const invoked = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (invoked) {
  const result = materializeMigration();
  console.log(`Materialized ${MIGRATION_NAME}: ${result.identities} reconciled item identities, ${result.soulModifiers} Soul modifier fixes, ${result.bytes} bytes`);
}
