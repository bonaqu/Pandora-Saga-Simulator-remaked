#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { stableCustomId } from './materialize_pandora_os_complete_sync.mjs';
import { loadInputs } from './materialize_pandora_os_live_sync_hardening.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const MIGRATION_NAME = '0010_remove_decorative_equipment.sql';

function invariant(value, message) {
  if (!value) throw new Error(message);
}

function sqlQuote(value) {
  return "'" + String(value).replaceAll("'", "''") + "'";
}

export function buildDecorativeRows(inputs = loadInputs()) {
  const mapped = new Map(
    inputs.mapping.equipment.map(row => [Number(row.serverId), String(row.projectId)])
  );
  const rows = Object.values(inputs.items)
    .filter(item => String(item.kind || '').startsWith('DECO_'))
    .map(item => {
      const serverId = Number(item.id);
      invariant(Number.isSafeInteger(serverId) && serverId > 0, 'Invalid decorative item ID');
      return {
        serverId,
        identityId: mapped.get(serverId) || stableCustomId('equipment', serverId),
        name: String(item.name || ''),
        kind: String(item.kind || '')
      };
    })
    .sort((a, b) => a.serverId - b.serverId);

  invariant(rows.length > 0, 'No decorative equipment found');
  invariant(new Set(rows.map(row => row.serverId)).size === rows.length, 'Duplicate decorative server ID');
  invariant(new Set(rows.map(row => row.identityId)).size === rows.length, 'Duplicate decorative identity');
  return rows;
}

export function buildMigration(rows = buildDecorativeRows()) {
  const targetStatements = rows.map((row, index) =>
    'INSERT INTO _decorative_prune_targets (release_order, identity_id, source_id) VALUES (' +
    index + ', ' + sqlQuote(row.identityId) + ', ' + row.serverId + ');'
  ).join('\n');

  return `-- Generated deterministically by scripts/materialize_decorative_equipment_prune.mjs.
-- Removes cosmetic overlay records from the current playable Modern catalog.
CREATE TABLE _decorative_prune_guard (ok INTEGER NOT NULL CHECK (ok = 1));
INSERT INTO _decorative_prune_guard (ok)
SELECT CASE WHEN COUNT(*) = 1 AND MAX(version) >= 85 THEN 1 ELSE 0 END
FROM catalog_head
WHERE id = 1;

CREATE TABLE _decorative_prune_targets (
  release_order INTEGER PRIMARY KEY,
  identity_id TEXT NOT NULL UNIQUE,
  source_id INTEGER NOT NULL UNIQUE
);
${targetStatements}

CREATE TABLE _decorative_prune_snapshot (
  payload_json TEXT NOT NULL CHECK (json_valid(payload_json))
);
INSERT INTO _decorative_prune_snapshot (payload_json)
SELECT COALESCE(json_group_array(json(entry)), '[]')
FROM (
  SELECT existing.value AS entry, CAST(existing.key AS INTEGER) AS release_order
  FROM catalog_head AS head
  JOIN json_each(head.snapshot_json) AS existing
  WHERE head.id = 1
    AND NOT EXISTS (
      SELECT 1
      FROM _decorative_prune_targets AS target
      WHERE target.identity_id = json_extract(existing.value, '$.identity.id')
    )
  ORDER BY release_order
);

CREATE TABLE _decorative_prune_next (
  version INTEGER NOT NULL CHECK (version > 85)
);
INSERT INTO _decorative_prune_next (version)
SELECT version + 1 FROM catalog_head WHERE id = 1;

DELETE FROM catalog_drafts
WHERE id IN (SELECT identity_id FROM _decorative_prune_targets);

DELETE FROM catalog_allocations
WHERE id IN (SELECT identity_id FROM _decorative_prune_targets);

INSERT INTO catalog_revisions (version, impact_version, snapshot_json, created_at, note)
SELECT version, version,
       (SELECT payload_json FROM _decorative_prune_snapshot),
       CAST(strftime('%s', 'now') AS INTEGER),
       'Remove decorative-only equipment from playable catalog'
FROM _decorative_prune_next;

UPDATE catalog_head
SET version = (SELECT version FROM _decorative_prune_next),
    impact_version = (SELECT version FROM _decorative_prune_next),
    snapshot_json = (SELECT payload_json FROM _decorative_prune_snapshot),
    updated_at = CAST(strftime('%s', 'now') AS INTEGER)
WHERE id = 1;

DROP TABLE _decorative_prune_next;
DROP TABLE _decorative_prune_snapshot;
DROP TABLE _decorative_prune_targets;
DROP TABLE _decorative_prune_guard;
`;
}

export function materializeMigration(root = ROOT) {
  const rows = buildDecorativeRows(loadInputs(root));
  const content = buildMigration(rows);
  const destination = path.join(root, 'admin-api', 'migrations', MIGRATION_NAME);
  fs.writeFileSync(destination, content, 'utf8');
  return {
    destination,
    bytes: Buffer.byteLength(content),
    removed: rows.length
  };
}

const invoked = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (invoked) {
  const result = materializeMigration();
  console.log(
    `Materialized ${MIGRATION_NAME}: ${result.removed} decorative identities removed, ${result.bytes} bytes`
  );
}
