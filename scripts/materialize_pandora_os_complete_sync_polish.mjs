#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildNewRows } from './materialize_pandora_os_complete_sync.mjs';
import { loadInputs } from './materialize_pandora_os_live_sync_hardening.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const MIGRATION_NAME = '0009_pandora_os_complete_item_sync_polish.sql';

function invariant(value, message) {
  if (!value) throw new Error(message);
}
function sqlQuote(value) {
  return "'" + String(value).replaceAll("'", "''") + "'";
}

export function buildSoulModifierRows(inputs = loadInputs()) {
  const rows = [];
  for (const row of buildNewRows(inputs)) {
    if (row.kind !== 'soul') continue;
    const server = inputs.souls[String(row.serverId)] || inputs.souls[row.serverId];
    const english = inputs.english.souls?.[String(row.serverId)] || inputs.english.souls?.[row.serverId];
    invariant(server && english?.n, 'Missing new Soul text for ' + row.serverId);
    rows.push({
      identityId: row.id,
      serverId: row.serverId,
      expectedEn: english.n,
      expectedRu: server.name || ''
    });
  }
  return rows.sort((a, b) => a.serverId - b.serverId);
}

export function buildInsertStatements(rows = buildSoulModifierRows()) {
  return rows.map((row, index) => {
    const statement =
      'INSERT INTO _pso_soul_modifier_cleanup (release_order, identity_id, expected_en, expected_ru) VALUES (' +
      index + ', ' + sqlQuote(row.identityId) + ', ' + sqlQuote(row.expectedEn) + ', ' + sqlQuote(row.expectedRu) + ');';
    invariant(Buffer.byteLength(statement) < 16384, 'Soul modifier cleanup row exceeds safe D1 statement size: ' + row.identityId);
    return statement;
  });
}

export function buildMigration(rows = buildSoulModifierRows()) {
  const statements = buildInsertStatements(rows).join('\n');
  return `-- Generated deterministically by scripts/materialize_pandora_os_complete_sync_polish.mjs.
-- Revision 85 removes an inferred display-only Soul modifier from the 14 newly
-- allocated Souls. Mechanical catalog impact remains revision 84.
CREATE TABLE _pso_soul_modifier_guard (ok INTEGER NOT NULL CHECK (ok = 1));
INSERT INTO _pso_soul_modifier_guard (ok)
SELECT CASE WHEN (SELECT version FROM catalog_head WHERE id = 1) = 84 THEN 1 ELSE 0 END;

CREATE TABLE _pso_soul_modifier_cleanup (
  release_order INTEGER PRIMARY KEY,
  identity_id TEXT NOT NULL UNIQUE,
  expected_en TEXT NOT NULL,
  expected_ru TEXT NOT NULL
);
${statements}

CREATE TABLE _pso_soul_modifier_snapshot (
  payload_json TEXT NOT NULL CHECK (json_valid(payload_json))
);

INSERT INTO _pso_soul_modifier_snapshot (payload_json)
SELECT COALESCE(json_group_array(json(entry)), '[]')
FROM (
  SELECT
    CASE
      WHEN cleanup.identity_id IS NOT NULL
       AND COALESCE(json_extract(existing.value, '$.edit.modifiers.en'), '') = cleanup.expected_en
       AND COALESCE(json_extract(existing.value, '$.edit.modifiers.ru'), '') = cleanup.expected_ru
       AND COALESCE(json_extract(existing.value, '$.edit.modifiers.jp'), '') = ''
       AND COALESCE(json_extract(existing.value, '$.edit.modifiers.tw'), '') = ''
      THEN json_set(
        existing.value,
        '$.edit.modifiers.en', '',
        '$.edit.modifiers.ru', '',
        '$.edit.modifiers.jp', '',
        '$.edit.modifiers.tw', ''
      )
      ELSE existing.value
    END AS entry,
    CAST(existing.key AS INTEGER) AS release_order
  FROM catalog_head AS head
  JOIN json_each(head.snapshot_json) AS existing
  LEFT JOIN _pso_soul_modifier_cleanup AS cleanup
    ON cleanup.identity_id = json_extract(existing.value, '$.identity.id')
  WHERE head.id = 1
  ORDER BY release_order
);

INSERT INTO catalog_revisions (version, impact_version, snapshot_json, created_at, note)
SELECT 85, 84, payload_json, CAST(strftime('%s', 'now') AS INTEGER),
  'Remove inferred modifiers from newly added Souls'
FROM _pso_soul_modifier_snapshot;

UPDATE catalog_head
SET version = 85,
    impact_version = 84,
    snapshot_json = (SELECT payload_json FROM _pso_soul_modifier_snapshot),
    updated_at = CAST(strftime('%s', 'now') AS INTEGER)
WHERE id = 1;

DROP TABLE _pso_soul_modifier_snapshot;
DROP TABLE _pso_soul_modifier_cleanup;
DROP TABLE _pso_soul_modifier_guard;
`;
}

export function materializeMigration(root = ROOT) {
  const rows = buildSoulModifierRows(loadInputs(root));
  const content = buildMigration(rows);
  const destination = path.join(root, 'admin-api', 'migrations', MIGRATION_NAME);
  fs.writeFileSync(destination, content, 'utf8');
  return { destination, bytes: Buffer.byteLength(content), souls: rows.length };
}

const invoked = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (invoked) {
  const result = materializeMigration();
  console.log(`Materialized ${MIGRATION_NAME}: ${result.souls} new Souls cleaned, ${result.bytes} bytes`);
}
