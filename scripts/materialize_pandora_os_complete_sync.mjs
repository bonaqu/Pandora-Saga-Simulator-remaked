#!/usr/bin/env node
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { baselineById, firstNewIndex } from '../admin-api/src/catalog-baseline.mjs';
import { draftFromSource, validateDraft } from '../admin-api/src/catalog-model.mjs';
import { loadInputs, serverCategory, serverPatch } from './materialize_pandora_os_live_sync_hardening.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const MIGRATION_NAME = '0008_pandora_os_complete_item_sync.sql';

const CLASS_ORDER = [
  'WARRIOR', 'GLADIATOR', 'JUGGERNAUT', 'DRAGOON', 'KNIGHT', 'GENERAL', 'PALADIN',
  'SCOUT', 'ARCHER', 'SNIPER', 'PREDATOR', 'AGENT', 'ASSASSIN', 'DISTURBANCE',
  'ACOLYTE', 'PRIEST', 'CLERIC', 'ENCHANTER', 'ASCETIC', 'MONK', 'EXORCIST',
  'MAGE', 'WIZARD', 'WARLOCK', 'CONJURER', 'DARKROAR', 'JESTER', 'CALAMITY'
];

function invariant(value, message) {
  if (!value) throw new Error(message);
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
function englishFor(inputs, kind, id) {
  const bucket = kind === 'equipment' ? inputs.english.items : inputs.english.souls;
  return bucket?.[String(id)] || bucket?.[id] || null;
}
function isEquipmentRecord(server) {
  return Boolean(server?.slot && server.slot !== 'arrow' && serverCategory(server) !== null);
}
function classFlags(server) {
  const classes = server?.classes && typeof server.classes === 'object' ? server.classes : {};
  const keys = Object.keys(classes);
  if (!keys.length) return Array(28).fill(1);
  return CLASS_ORDER.map(key => classes[key] ? 1 : 0);
}
function stableCustomId(kind, serverId) {
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
function existingPatch(source, kind, server, english) {
  const identity = identityFor(source, kind);
  const patch = serverPatch(kind, server, english);
  patch.disabled = false;
  if (kind === 'equipment') patch.classes = classFlags(server);
  const fullEdit = validateDraft(deepMerge(draftFromSource(source, kind), patch), identity);
  return {
    identity,
    patch: { edit: patch },
    fallback: { identity, edit: fullEdit },
    serverId: Number(server.id)
  };
}
function newEdit(kind, server, english) {
  const category = kind === 'equipment' ? serverCategory(server) : null;
  const id = stableCustomId(kind, server.id);
  const identity = {
    id,
    kind,
    category,
    index: firstNewIndex(kind, category)
  };
  const patch = serverPatch(kind, server, english);
  // A new record has no retained Legacy calculation row to preserve. Keep every
  // verified representable effect and the full bilingual description, but never
  // invent calculator tokens for unsupported/conditional mechanics.
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
  const edit = validateDraft(deepMerge(base, patch), identity);
  return {
    id,
    kind,
    category,
    baseIndex: firstNewIndex(kind, category),
    serverId: Number(server.id),
    edit
  };
}

export function buildExistingRows(inputs = loadInputs()) {
  const rows = [];
  const seenServer = new Set();
  const seenProject = new Set();
  for (const match of inputs.mapping.equipment) {
    invariant(!seenServer.has('equipment:' + match.serverId), 'Duplicate equipment server ID: ' + match.serverId);
    invariant(!seenProject.has(match.projectId), 'Duplicate mapped project ID: ' + match.projectId);
    const server = inputs.items[String(match.serverId)] || inputs.items[match.serverId];
    const source = baselineById.get(match.projectId);
    invariant(server && isEquipmentRecord(server), 'Mapped equipment is not equippable: ' + match.serverId);
    invariant(sourceKind(source) === 'equipment', 'Invalid mapped equipment source: ' + match.projectId);
    invariant(serverCategory(server) === source.legacy_category_id, 'Equipment category mismatch: ' + match.projectId);
    rows.push(existingPatch(source, 'equipment', server, englishFor(inputs, 'equipment', match.serverId)));
    seenServer.add('equipment:' + match.serverId);
    seenProject.add(match.projectId);
  }
  for (const match of inputs.mapping.souls) {
    invariant(!seenServer.has('soul:' + match.serverId), 'Duplicate Soul server ID: ' + match.serverId);
    invariant(!seenProject.has(match.projectId), 'Duplicate mapped project ID: ' + match.projectId);
    const server = inputs.souls[String(match.serverId)] || inputs.souls[match.serverId];
    const source = baselineById.get(match.projectId);
    invariant(server && sourceKind(source) === 'soul', 'Invalid mapped Soul source: ' + match.projectId);
    rows.push(existingPatch(source, 'soul', server, englishFor(inputs, 'soul', match.serverId)));
    seenServer.add('soul:' + match.serverId);
    seenProject.add(match.projectId);
  }
  return rows.sort((a, b) => a.identity.id.localeCompare(b.identity.id, 'en', { numeric: true }));
}

export function buildNewRows(inputs = loadInputs()) {
  const mappedEquipment = new Set(inputs.mapping.equipment.map(row => Number(row.serverId)));
  const mappedSouls = new Set(inputs.mapping.souls.map(row => Number(row.serverId)));
  const rows = [];
  for (const server of Object.values(inputs.items)) {
    if (!isEquipmentRecord(server) || mappedEquipment.has(Number(server.id))) continue;
    rows.push(newEdit('equipment', server, englishFor(inputs, 'equipment', server.id)));
  }
  for (const server of Object.values(inputs.souls)) {
    if (mappedSouls.has(Number(server.id))) continue;
    rows.push(newEdit('soul', server, englishFor(inputs, 'soul', server.id)));
  }
  rows.sort((a, b) => a.kind.localeCompare(b.kind) || (a.category ?? -1) - (b.category ?? -1) || a.serverId - b.serverId);
  const offsets = new Map();
  for (const row of rows) {
    const key = row.kind + ':' + (row.category ?? -1);
    row.categoryOffset = offsets.get(key) || 0;
    offsets.set(key, row.categoryOffset + 1);
  }
  return rows;
}

function sqlQuote(value) {
  return "'" + String(value).replaceAll("'", "''") + "'";
}
export function buildExistingInsertStatements(rows = buildExistingRows()) {
  return rows.map((row, index) => {
    const statement =
      'INSERT INTO _pso_complete_existing (release_order, identity_id, patch_json, fallback_json) VALUES (' +
      index + ', ' + sqlQuote(row.identity.id) + ', ' + sqlQuote(JSON.stringify(row.patch)) + ', ' +
      sqlQuote(JSON.stringify(row.fallback)) + ');';
    invariant(Buffer.byteLength(statement) < 16384, 'Existing sync row exceeds safe D1 statement size: ' + row.identity.id);
    return statement;
  });
}
export function buildNewSeedStatements(rows = buildNewRows()) {
  return rows.map((row, index) => {
    const dbCategory = row.kind === 'soul' ? -1 : row.category;
    const statement =
      'INSERT INTO _pso_complete_new_seed (release_order, identity_id, kind, category, base_index, category_offset, edit_json) VALUES (' +
      index + ', ' + sqlQuote(row.id) + ', ' + sqlQuote(row.kind) + ', ' + dbCategory + ', ' +
      row.baseIndex + ', ' + row.categoryOffset + ', ' + sqlQuote(JSON.stringify(row.edit)) + ');';
    invariant(Buffer.byteLength(statement) < 16384, 'New sync row exceeds safe D1 statement size: ' + row.id);
    return statement;
  });
}

export function buildMigration(existingRows = buildExistingRows(), newRows = buildNewRows()) {
  const existingStatements = buildExistingInsertStatements(existingRows).join('\n');
  const newStatements = buildNewSeedStatements(newRows).join('\n');
  return `-- Generated deterministically by scripts/materialize_pandora_os_complete_sync.mjs.
-- Revision 84 completes Modern item/Soul coverage without mutating Legacy source arrays.
-- Existing mapped identities are updated in place. Missing identities receive stable Modern
-- allocations; unsupported conditional mechanics remain descriptive instead of being guessed.
CREATE TABLE _pso_complete_guard (ok INTEGER NOT NULL CHECK (ok = 1));
INSERT INTO _pso_complete_guard (ok)
SELECT CASE WHEN (SELECT version FROM catalog_head WHERE id = 1) = 83 THEN 1 ELSE 0 END;

CREATE TABLE _pso_complete_existing (
  release_order INTEGER PRIMARY KEY,
  identity_id TEXT NOT NULL UNIQUE,
  patch_json TEXT NOT NULL CHECK (json_valid(patch_json)),
  fallback_json TEXT NOT NULL CHECK (json_valid(fallback_json))
);
${existingStatements}

CREATE TABLE _pso_complete_new_seed (
  release_order INTEGER PRIMARY KEY,
  identity_id TEXT NOT NULL UNIQUE,
  kind TEXT NOT NULL CHECK (kind IN ('equipment', 'soul')),
  category INTEGER NOT NULL,
  base_index INTEGER NOT NULL,
  category_offset INTEGER NOT NULL,
  edit_json TEXT NOT NULL CHECK (json_valid(edit_json))
);
${newStatements}

CREATE TABLE _pso_complete_alloc_max AS
SELECT kind, category, MAX(item_index) AS max_index
FROM catalog_allocations
GROUP BY kind, category;

CREATE TABLE _pso_complete_new AS
SELECT
  seed.*,
  MAX(
    seed.base_index,
    COALESCE(seq.next_index, seed.base_index),
    COALESCE(alloc.max_index + 1, seed.base_index)
  ) + seed.category_offset AS item_index
FROM _pso_complete_new_seed AS seed
LEFT JOIN catalog_sequences AS seq
  ON seq.kind = seed.kind AND seq.category = seed.category
LEFT JOIN _pso_complete_alloc_max AS alloc
  ON alloc.kind = seed.kind AND alloc.category = seed.category;

CREATE TABLE _pso_complete_capacity_guard (ok INTEGER NOT NULL CHECK (ok = 1));
INSERT INTO _pso_complete_capacity_guard (ok)
SELECT CASE WHEN
  NOT EXISTS (
    SELECT 1 FROM _pso_complete_new
    WHERE item_index <= 0 OR item_index >= 10000 OR item_index >= base_index + 1024
  )
  AND NOT EXISTS (
    SELECT 1 FROM _pso_complete_new AS incoming
    JOIN catalog_allocations AS existing ON existing.id = incoming.identity_id
  )
  AND NOT EXISTS (
    SELECT 1 FROM catalog_head AS head, json_each(head.snapshot_json) AS existing
    JOIN _pso_complete_new AS incoming
      ON incoming.identity_id = json_extract(existing.value, '$.identity.id')
    WHERE head.id = 1
  )
THEN 1 ELSE 0 END;

INSERT INTO catalog_allocations (id, kind, category, item_index, created_at)
SELECT identity_id, kind, category, item_index, CAST(strftime('%s', 'now') AS INTEGER)
FROM _pso_complete_new
ORDER BY release_order;

INSERT INTO catalog_sequences (kind, category, next_index)
SELECT kind, category, MAX(item_index) + 1
FROM _pso_complete_new
GROUP BY kind, category
ON CONFLICT(kind, category) DO UPDATE SET
  next_index = CASE
    WHEN excluded.next_index > catalog_sequences.next_index THEN excluded.next_index
    ELSE catalog_sequences.next_index
  END;

CREATE TABLE _pso_complete_snapshot (
  payload_json TEXT NOT NULL CHECK (json_valid(payload_json))
);

INSERT INTO _pso_complete_snapshot (payload_json)
SELECT COALESCE(json_group_array(json(entry)), '[]')
FROM (
  SELECT
    CASE
      WHEN incoming.identity_id IS NOT NULL THEN json_patch(existing.value, incoming.patch_json)
      ELSE existing.value
    END AS entry,
    0 AS release_group,
    CAST(existing.key AS INTEGER) AS release_order
  FROM catalog_head AS head
  JOIN json_each(head.snapshot_json) AS existing
  LEFT JOIN _pso_complete_existing AS incoming
    ON incoming.identity_id = json_extract(existing.value, '$.identity.id')
  WHERE head.id = 1

  UNION ALL

  SELECT incoming.fallback_json AS entry, 1 AS release_group, incoming.release_order
  FROM _pso_complete_existing AS incoming
  WHERE NOT EXISTS (
    SELECT 1
    FROM catalog_head AS head, json_each(head.snapshot_json) AS existing
    WHERE head.id = 1
      AND json_extract(existing.value, '$.identity.id') = incoming.identity_id
  )

  UNION ALL

  SELECT
    json_object(
      'identity', json_object(
        'id', incoming.identity_id,
        'kind', incoming.kind,
        'category', CASE WHEN incoming.kind = 'soul' THEN NULL ELSE incoming.category END,
        'index', incoming.item_index
      ),
      'edit', json(incoming.edit_json)
    ) AS entry,
    2 AS release_group,
    incoming.release_order
  FROM _pso_complete_new AS incoming

  ORDER BY release_group, release_order
);

INSERT INTO catalog_revisions (version, impact_version, snapshot_json, created_at, note)
SELECT 84, 84, payload_json, CAST(strftime('%s', 'now') AS INTEGER),
  'Complete Modern item and Soul catalog synchronization'
FROM _pso_complete_snapshot;

UPDATE catalog_head
SET version = 84,
    impact_version = 84,
    snapshot_json = (SELECT payload_json FROM _pso_complete_snapshot),
    updated_at = CAST(strftime('%s', 'now') AS INTEGER)
WHERE id = 1;

DROP TABLE _pso_complete_snapshot;
DROP TABLE _pso_complete_capacity_guard;
DROP TABLE _pso_complete_new;
DROP TABLE _pso_complete_alloc_max;
DROP TABLE _pso_complete_new_seed;
DROP TABLE _pso_complete_existing;
DROP TABLE _pso_complete_guard;
`;
}

export function materializeMigration(root = ROOT) {
  const inputs = loadInputs(root);
  const existingRows = buildExistingRows(inputs);
  const newRows = buildNewRows(inputs);
  const content = buildMigration(existingRows, newRows);
  const destination = path.join(root, 'admin-api', 'migrations', MIGRATION_NAME);
  fs.writeFileSync(destination, content, 'utf8');
  return {
    destination,
    bytes: Buffer.byteLength(content),
    existing: existingRows.length,
    added: newRows.length,
    total: existingRows.length + newRows.length
  };
}

const invoked = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (invoked) {
  const result = materializeMigration();
  console.log(`Materialized ${MIGRATION_NAME}: ${result.existing} existing identities refreshed, ${result.added} new Modern identities allocated, ${result.total} total synchronized records, ${result.bytes} bytes`);
}
