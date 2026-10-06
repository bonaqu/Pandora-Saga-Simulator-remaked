#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DATA_PREFIX = 'pandora-os-item-sync-20261006.b64.';
const EXPECTED_PARTS = 5;
const EXPECTED_BASE64_LENGTH = 32548;
const EXPECTED_JSON_SHA256 = '602764e6fc3ddc86c49b8d15a89572d63d5807d09de04bc92d320c523a94f380';
export const MIGRATION_NAME = '0005_pandora_os_item_sync.sql';

function invariant(condition, message) {
  if (!condition) throw new Error(message);
}

export function loadReleaseEntries(root = ROOT) {
  const dataDir = path.join(root, 'admin-api', 'data');
  const parts = [];
  for (let index = 0; index < EXPECTED_PARTS; index += 1) {
    const suffix = String(index).padStart(2, '0');
    const file = path.join(dataDir, DATA_PREFIX + suffix);
    invariant(fs.existsSync(file), 'Missing Pandora Saga OS release payload part: ' + file);
    parts.push(fs.readFileSync(file, 'utf8').trim());
  }
  const encoded = parts.join('');
  invariant(encoded.length === EXPECTED_BASE64_LENGTH, 'Pandora Saga OS release payload length mismatch');
  const json = zlib.gunzipSync(Buffer.from(encoded, 'base64'));
  const digest = crypto.createHash('sha256').update(json).digest('hex');
  invariant(digest === EXPECTED_JSON_SHA256, 'Pandora Saga OS release payload checksum mismatch');
  const entries = JSON.parse(json.toString('utf8'));
  validateReleaseEntries(entries);
  return entries;
}

export function validateReleaseEntries(entries) {
  invariant(Array.isArray(entries) && entries.length === 180, 'Expected exactly 180 matched catalog records');
  const ids = new Set();
  let equipment = 0, souls = 0;
  for (const entry of entries) {
    const identity = entry?.identity;
    const edit = entry?.edit;
    invariant(identity && edit && identity.id === edit.id, 'Catalog release identity/edit mismatch');
    invariant(!ids.has(identity.id), 'Duplicate catalog release ID: ' + identity.id);
    ids.add(identity.id);
    invariant(identity.kind === edit.kind && identity.category === edit.category, 'Catalog release type mismatch: ' + identity.id);
    invariant(['equipment', 'soul'].includes(identity.kind), 'Unexpected release record kind: ' + identity.kind);
    if (identity.kind === 'equipment') equipment += 1;
    else souls += 1;
    invariant(typeof edit.names?.en === 'string' && edit.names.en.length > 0, 'Missing English name: ' + identity.id);
    invariant(typeof edit.names?.ru === 'string' && edit.names.ru.length > 0, 'Missing Russian name: ' + identity.id);
    invariant(edit.names.en !== 'Healer Soul', 'Unmatched Healer Soul must not be published');
  }
  invariant(equipment === 111 && souls === 69, 'Expected 111 equipment records and 69 Souls');

  const byId = new Map(entries.map(entry => [entry.identity.id, entry.edit]));
  const heavy = byId.get('equipment.9.3');
  invariant(heavy?.names.en === 'Heavy Crossbow' && heavy.level === 38 && heavy.sockets === 1 &&
    heavy.baseAttack === 67 && heavy.effectMode === 'replace', 'Heavy Crossbow release data mismatch');
  const bounty = byId.get('equipment.4.4');
  invariant(bounty?.baseAttack === 50 && bounty.effects?.some(effect => effect.stat === 1 && effect.value === 1) &&
    !bounty.effects?.some(effect => effect.stat === 0), 'Bounty Lance STR correction is missing');
  const iron = byId.get('equipment.13.3');
  invariant(iron?.effects?.some(effect => effect.stat === 91 && effect.value === 4), 'Iron Staff stun correction is missing');
  const cerberus = byId.get('soul.102');
  invariant(cerberus?.description?.ru === 'Уклонение +1.' &&
    cerberus.effects?.some(effect => effect.stat === 65 && effect.value === 1), 'Soul of Cerberus Dodge correction is missing');
}

function sqlQuote(value) {
  return "'" + String(value).replaceAll("'", "''") + "'";
}

export function buildReleaseInsertStatements(entries = loadReleaseEntries()) {
  validateReleaseEntries(entries);
  return entries.map((entry, index) => {
    const statement = `INSERT INTO _pandora_os_sync_release (release_order, identity_id, payload_json) VALUES (${index}, ${sqlQuote(entry.identity.id)}, ${sqlQuote(JSON.stringify(entry))});`;
    invariant(Buffer.byteLength(statement) < 16384, 'Pandora Saga OS release row exceeds safe D1 statement size: ' + entry.identity.id);
    return statement;
  });
}

export function buildMigration(entries = loadReleaseEntries()) {
  validateReleaseEntries(entries);
  const releaseStatements = buildReleaseInsertStatements(entries).join('\n');
  return `-- Generated deterministically by scripts/materialize_pandora_os_sync.mjs.
-- Source: Pandora Saga OS EN/RU weapon, equipment and Soul workbook supplied 2026-10-06.
-- The preserved Legacy runtime is intentionally not edited. Production revision 78 remains historical.
-- Release rows are intentionally inserted one per statement: Cloudflare D1 rejects oversized single statements.
CREATE TABLE _pandora_os_sync_guard (ok INTEGER NOT NULL CHECK (ok = 1));
INSERT INTO _pandora_os_sync_guard (ok)
SELECT CASE WHEN (SELECT version FROM catalog_head WHERE id = 1) IN (0, 78) THEN 1 ELSE 0 END;

CREATE TABLE _pandora_os_sync_release (
  release_order INTEGER PRIMARY KEY,
  identity_id TEXT NOT NULL UNIQUE,
  payload_json TEXT NOT NULL CHECK (json_valid(payload_json))
);
${releaseStatements}

CREATE TABLE _pandora_os_sync_snapshot (
  payload_json TEXT NOT NULL CHECK (json_valid(payload_json))
);
INSERT INTO _pandora_os_sync_snapshot (payload_json)
SELECT COALESCE(json_group_array(json(entry)), '[]')
FROM (
  SELECT existing.value AS entry, 0 AS release_group, CAST(existing.key AS INTEGER) AS release_order
  FROM catalog_head AS head, json_each(head.snapshot_json) AS existing
  WHERE head.id = 1
    AND NOT EXISTS (
      SELECT 1
      FROM _pandora_os_sync_release AS incoming
      WHERE incoming.identity_id = json_extract(existing.value, '$.identity.id')
    )
  UNION ALL
  SELECT incoming.payload_json AS entry, 1 AS release_group, incoming.release_order
  FROM _pandora_os_sync_release AS incoming
  ORDER BY release_group, release_order
);

INSERT INTO catalog_revisions (version, impact_version, snapshot_json, created_at, note)
SELECT 79, 79, payload_json, CAST(strftime('%s', 'now') AS INTEGER), 'Pandora Saga OS RU/EN item data sync'
FROM _pandora_os_sync_snapshot;

UPDATE catalog_head
SET version = 79,
    impact_version = 79,
    snapshot_json = (SELECT payload_json FROM _pandora_os_sync_snapshot),
    updated_at = CAST(strftime('%s', 'now') AS INTEGER)
WHERE id = 1;

DROP TABLE _pandora_os_sync_snapshot;
DROP TABLE _pandora_os_sync_release;
DROP TABLE _pandora_os_sync_guard;
`;
}

export function materializeMigration(root = ROOT) {
  const destination = path.join(root, 'admin-api', 'migrations', MIGRATION_NAME);
  const content = buildMigration(loadReleaseEntries(root));
  fs.writeFileSync(destination, content, 'utf8');
  return { destination, bytes: Buffer.byteLength(content), entries: 180 };
}

const invoked = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (invoked) {
  const result = materializeMigration();
  console.log(`Materialized ${MIGRATION_NAME}: ${result.entries} records, ${result.bytes} bytes`);
}
