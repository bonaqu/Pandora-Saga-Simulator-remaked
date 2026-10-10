import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import rules from '../../data/modern-astir-rules.json' with { type: 'json' };
import { baselineById, sourceIdentity } from '../../admin-api/src/catalog-baseline.mjs';
import { draftFromSource } from '../../admin-api/src/catalog-model.mjs';
import { astirIds, planAstirCleanup } from '../../admin-api/src/astir-cleanup.mjs';
import { adminCatalog, publicCatalog } from '../../admin-api/src/catalog.mjs';

const origin = 'https://pandora-saga-simulator-remaked-admin-api.bonaqu.workers.dev';
function fixture() {
  const sqlite = new DatabaseSync(':memory:');
  for (const filename of ['0002_catalog.sql', '0003_skill_variants.sql', '0004_catalog_impact_revision.sql'])
    sqlite.exec(fs.readFileSync(new URL('../../admin-api/migrations/' + filename, import.meta.url), 'utf8'));
  const DB = {
    prepare(sql) {
      let values = [];
      return {
        bind(...args) { values = args; return this; },
        async first() { return sqlite.prepare(sql).get(...values) || null; },
        async run() { return { success: true, meta: { changes: Number(sqlite.prepare(sql).run(...values).changes) } }; },
        async all() { return { success: true, results: sqlite.prepare(sql).all(...values) }; }
      };
    },
    async batch(stmts) {
      sqlite.exec('BEGIN');
      try {
        const rows = [];
        for (const s of stmts) rows.push(await s.run());
        sqlite.exec('COMMIT'); return rows;
      } catch (error) { sqlite.exec('ROLLBACK'); throw error; }
    }
  };
  // A fully controlled test head avoids relying on historical source strings
  // that were deliberately retained in Legacy for museum compatibility.
  const entries = astirIds.map(id => {
    const source = baselineById.get(id);
    const edit = draftFromSource(source, 'equipment');
    edit.notes = { en: '', ru: '', jp: '', tw: '' };
    return { identity: sourceIdentity(source), edit };
  });
  entries[0].edit.notes.en = rules.historicalNotes[astirIds[0]].en;
  entries[1].edit.notes.jp = rules.historicalNotes[astirIds[1]].jp;
  entries[0].edit.notes.tw = '此設備可以配備護符，並提高恢復力。';
  const json = JSON.stringify(entries);
  sqlite.prepare('UPDATE catalog_head SET version = 2, impact_version = 2, snapshot_json = ? WHERE id = 1').run(json);
  sqlite.prepare('INSERT INTO catalog_revisions(version,impact_version,snapshot_json,created_at,note) VALUES (2,2,?,1000,?)')
    .run(json,'Seed test catalog');
  return { sqlite, env: { DB }, entries };
}
const request = (path, input) => new Request(origin + path, {
  method: input === undefined ? 'GET' : 'POST',
  headers: input === undefined ? {} : { 'Content-Type': 'application/json' },
  body: input === undefined ? undefined : JSON.stringify(input)
});
const call = async (env, path, data) => {
  try {
    const response = await adminCatalog(request('/api/admin/' + path, data), env, 1001);
    return { status: response.status, ...await response.json() };
  } catch (error) {
    return { status: error.status || 503, ok: false, message: error.message };
  }
};
const published = async (env, revision) => {
  const response = await publicCatalog(request('/api/catalog' + (revision ? '?revision=' + revision : '')), env);
  return response.json();
};
test('single Astir registry has 16 unique roots and a precise archived note manifest', () => {
  assert.equal(rules.currentGameFullOutfitBonus, false);
  assert.equal(astirIds.length, 16);
  assert.equal(new Set(astirIds).size, 16);
  assert.equal(rules.legacySetSection.blockCount, 16);
  assert.equal(Object.keys(rules.historicalNotes).length, 16);
  const { entries } = fixture();
  const plan = planAstirCleanup(entries, baselineById, draftFromSource);
  assert.equal(plan.fields.length, 2);
  assert.equal(plan.warnings.length, 0);
  assert.deepEqual(plan.fields.map(x => x.locale), ['en', 'jp']);
});
test('admin previews, atomically cleans and individually restores archival notes while retaining other catalog content and impact revision', async () => {
  const { env, sqlite } = fixture();
  const preview = await call(env, 'astir-notes');
  assert.equal(preview.ready, true);
  assert.equal(preview.fields.length, 2);
  assert.equal(preview.catalogRevision, 2);
  assert.equal(preview.impactRevision, 2);
  assert.equal(sqlite.prepare('SELECT version FROM catalog_head').get().version, 2);
  const input = { expectedCatalogRevision: 2, expectedFields: preview.fields.map(x => x.id + ':' + x.locale).sort() };
  const stale = await call(env, 'astir-notes/clean', { ...input, expectedFields: [] });
  assert.equal(stale.status, 409);
  const clean = await call(env, 'astir-notes/clean', input);
  assert.equal(clean.status, 200);
  assert.equal(clean.catalogRevision, 3);
  assert.equal(clean.impactRevision, 2);
  const current = await published(env), older = await published(env, 2);
  assert.equal(current.revision, 3);
  assert.equal(current.records.find(x => x.id === astirIds[0]).notes.en, '');
  assert.equal(current.records.find(x => x.id === astirIds[1]).notes.jp, '');
  assert.equal(current.records.find(x => x.id === astirIds[0]).notes.tw, '此設備可以配備護符，並提高恢復力。');
  assert.equal(older.records.find(x => x.id === astirIds[0]).notes.en, rules.historicalNotes[astirIds[0]].en);
  assert.equal((await call(env, 'astir-notes')).ready, false);
  const again = await call(env, 'astir-notes/clean', { ...input, expectedCatalogRevision: 3 });
  assert.equal(again.status, 409);
  const restored = await call(env, 'astir-notes/restore', { cleanupRevision: 3, expectedCatalogRevision: 3 });
  assert.equal(restored.status, 200);
  assert.equal(restored.restoredCount, 2);
  assert.equal(restored.catalogRevision, 4);
  assert.equal(restored.impactRevision, 2);
  const after = await published(env);
  assert.equal(after.records.find(x => x.id === astirIds[0]).notes.en, rules.historicalNotes[astirIds[0]].en);
  assert.equal(after.records.find(x => x.id === astirIds[0]).notes.tw, '此設備可以配備護符，並提高恢復力。');
  assert.equal(sqlite.prepare('SELECT COUNT(*) AS n FROM catalog_revisions').get().n, 3);
});
test('unknown translations, dirty drafts and intervening edits fail closed without touching D1', async () => {
  const { env, sqlite } = fixture();
  const original = JSON.parse(sqlite.prepare('SELECT snapshot_json FROM catalog_head').get().snapshot_json);
  original[2].edit.notes.en = 'When equipped with a full set, defense +10.';
  sqlite.prepare('UPDATE catalog_head SET snapshot_json = ? WHERE id = 1').run(JSON.stringify(original));
  let overview = await call(env, 'astir-notes');
  assert.equal(overview.ready, false);
  assert.equal(overview.warnings.length, 1);
  assert.equal((await call(env, 'astir-notes/clean', {
    expectedCatalogRevision: 2, expectedFields: overview.fields.map(x => x.id + ':' + x.locale).sort()
  })).status, 409);
  original[2].edit.notes.en = '';
  sqlite.prepare('UPDATE catalog_head SET snapshot_json = ? WHERE id = 1').run(JSON.stringify(original));
  sqlite.prepare('INSERT INTO catalog_drafts (id,payload_json,version,is_dirty,updated_at) VALUES (?,?,1,1,1001)')
    .run(astirIds[0],JSON.stringify(original[0].edit));
  overview = await call(env, 'astir-notes');
  assert.equal(overview.dirtyDraftIds.length, 1);
  assert.equal(overview.ready, false);
  assert.equal((await call(env, 'astir-notes/clean', {
    expectedCatalogRevision: 2, expectedFields: overview.fields.map(x => x.id + ':' + x.locale).sort()
  })).status, 409);
  assert.equal(sqlite.prepare('SELECT version FROM catalog_head').get().version, 2);
});
