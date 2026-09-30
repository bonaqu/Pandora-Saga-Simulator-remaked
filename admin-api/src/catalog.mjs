import { randomUUID } from 'node:crypto';
import { CatalogError, draftFromSource, validateDraft, compileRecord, EFFECTS, EQUIPMENT_CATEGORIES } from './catalog-model.mjs';
import { baselineById, baselineRecords, categories, compatibilityLabels, sourceFingerprint, characterSourceFingerprint, sourceIdentity, firstNewIndex } from './catalog-baseline.mjs';
import { jsonResponse } from './auth.mjs';

const MAX_SNAPSHOT_BYTES = 900000;
const encoder = new TextEncoder();
const fail = (message, status = 400) => { throw new CatalogError(message, status); };
const normalizeIdentity = row => ({ id: row.id, kind: row.kind, category: row.kind === 'soul' ? null : row.category, index: row.item_index });
async function identityFor(env, id) {
  const source = baselineById.get(id);
  if (source) return sourceIdentity(source);
  const row = await env.DB.prepare('SELECT id, kind, category, item_index FROM catalog_allocations WHERE id = ?').bind(id).first();
  if (!row) fail('Item not found', 404);
  return normalizeIdentity(row);
}
async function head(env) {
  const row = await env.DB.prepare('SELECT version, snapshot_json FROM catalog_head WHERE id = ?').bind(1).first();
  if (!row) fail('Catalog is not initialized', 503);
  return { version: row.version, entries: JSON.parse(row.snapshot_json) };
}
async function draftRow(env, id) { return env.DB.prepare('SELECT payload_json, version, is_dirty, updated_at FROM catalog_drafts WHERE id = ?').bind(id).first(); }
function compileEntry(entry) {
  return compileRecord(validateDraft(entry.edit, entry.identity), entry.identity, baselineById.get(entry.identity.id));
}
function version(value, label) {
  if (!Number.isSafeInteger(value) || value < 0) fail(label + ' must be a non-negative integer');
  return value;
}
function schema(object, names) {
  if (!object || typeof object !== 'object' || Array.isArray(object) || Object.keys(object).some(key => !names.includes(key))) fail('Unsupported request fields');
}
async function body(request) {
  if ((request.headers.get('Content-Type') || '').split(';')[0].trim() !== 'application/json') fail('JSON body required', 415);
  if (Number(request.headers.get('Content-Length') || 0) > 65536) fail('Request too large', 413);
  const reader = request.body?.getReader();
  if (!reader) fail('Request body required');
  let size = 0; const chunks = [];
  for (;;) {
    const { value, done } = await reader.read(); if (done) break;
    size += value.byteLength;
    if (size > 65536) { await reader.cancel(); fail('Request too large', 413); }
    chunks.push(value);
  }
  const bytes = new Uint8Array(size); let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
  try { return JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes)); }
  catch { fail('Invalid JSON'); }
}

export async function publicCatalog(request, env) {
  const url = new URL(request.url);
  const requested = url.searchParams.get('revision');
  let snapshot;
  if (requested === null) snapshot = await head(env);
  else {
    if (!/^\d{1,9}$/.test(requested)) fail('Invalid revision');
    const revision = Number(requested);
    if (revision === 0) snapshot = { version: 0, entries: [] };
    else {
      const row = await env.DB.prepare('SELECT snapshot_json FROM catalog_revisions WHERE version = ?').bind(revision).first();
      if (!row) fail('Catalog revision not found', 404);
      snapshot = { version: revision, entries: JSON.parse(row.snapshot_json) };
    }
  }
  return jsonResponse({ ok: true, schemaVersion: 1, sourceFingerprint, characterSourceFingerprint, revision: snapshot.version, records: snapshot.entries.map(compileEntry) });
}

async function detail(env, id) {
  const identity = await identityFor(env, id);
  const source = baselineById.get(id);
  const [snapshot, draft] = await Promise.all([head(env), draftRow(env, id)]);
  const published = snapshot.entries.find(entry => entry.identity.id === id);
  const edit = draft?.is_dirty || (!published && !source && draft) ? JSON.parse(draft.payload_json) : published?.edit || draftFromSource(source, identity.kind);
  edit.id = id; edit.category = identity.category;
  return { ok: true, identity, edit, draftVersion: draft?.version || 0, hasDraft: Boolean(draft?.is_dirty), catalogRevision: snapshot.version, published: Boolean(published), sourceCode: source?.calculation_code || '', engineKey: source?.name.jp || 'Modern:' + id };
}

async function saveDraft(request, env, now) {
  const input = await body(request); schema(input, ['edit', 'expectedDraftVersion', 'expectedCatalogRevision']);
  const expected = version(input.expectedDraftVersion, 'Draft version');
  const expectedCatalog = version(input.expectedCatalogRevision, 'Catalog revision');
  if ((await head(env)).version !== expectedCatalog) fail('Catalog changed in another tab; reload before saving', 409);
  let identity;
  if (input.edit?.id === '') {
    if (expected !== 0) fail('New draft version must be zero');
    const kind = input.edit.kind; const category = input.edit.category;
    if (!(kind === 'soul' ? category === null : kind === 'equipment' && EQUIPMENT_CATEGORIES.includes(category))) fail('Unsupported item type');
    const id = 'modern.' + kind + '.' + randomUUID();
    identity = { id, kind, category, index: firstNewIndex(kind, category) };
    const edit = validateDraft({ ...input.edit, id }, identity);
    compileRecord(edit, identity, null);
    const counterCategory = category ?? -1;
    await env.DB.prepare('INSERT INTO catalog_sequences (kind, category, next_index) VALUES (?, ?, ?) ON CONFLICT DO NOTHING').bind(kind, counterCategory, identity.index).run();
    // D1 batch is one transaction. Allocate + insert + save either all commit or
    // all roll back; concurrent creation cannot reuse an encoded item ID.
    const allocated = await env.DB.batch([
      env.DB.prepare('UPDATE catalog_sequences SET next_index = next_index + 1 WHERE kind = ? AND category = ? AND next_index < ?').bind(kind, counterCategory, identity.index + 1024),
      env.DB.prepare('INSERT INTO catalog_allocations (id, kind, category, item_index, created_at) SELECT ?, ?, ?, next_index - 1, ? FROM catalog_sequences WHERE kind = ? AND category = ? AND changes() = 1').bind(id, kind, counterCategory, now, kind, counterCategory),
      env.DB.prepare('INSERT INTO catalog_drafts (id, payload_json, version, updated_at) SELECT ?, ?, 1, ? WHERE EXISTS (SELECT 1 FROM catalog_allocations WHERE id = ?)').bind(id, JSON.stringify(edit), now, id)
    ]);
    if (allocated[0].meta.changes !== 1) fail('This item type reached its safe capacity (1024 additions)', 413);
    return jsonResponse(await detail(env, id), 201);
  }
  identity = await identityFor(env, input.edit?.id || '');
  const edit = validateDraft(input.edit, identity);
  compileRecord(edit, identity, baselineById.get(identity.id));
  const result = expected === 0
    ? await env.DB.prepare('INSERT INTO catalog_drafts (id, payload_json, version, updated_at) SELECT ?, ?, 1, ? WHERE EXISTS (SELECT 1 FROM catalog_head WHERE id = 1 AND version = ?) ON CONFLICT DO NOTHING').bind(identity.id, JSON.stringify(edit), now, expectedCatalog).run()
    : await env.DB.prepare('UPDATE catalog_drafts SET payload_json = ?, version = version + 1, is_dirty = 1, updated_at = ? WHERE id = ? AND version = ? AND EXISTS (SELECT 1 FROM catalog_head WHERE id = 1 AND version = ?)').bind(JSON.stringify(edit), now, identity.id, expected, expectedCatalog).run();
  if (result.meta.changes !== 1) fail('Draft changed in another tab; reload before saving', 409);
  return jsonResponse(await detail(env, identity.id));
}

async function commitSnapshot(env, previous, entries, now, note, draft = null) {
  const json = JSON.stringify(entries);
  if (encoder.encode(json).length > MAX_SNAPSHOT_BYTES) fail('Catalog exceeds the safe snapshot size', 413);
  for (const entry of entries) compileEntry(entry);
  const token = randomUUID(); const next = previous + 1;
  const guard = draft ? ' AND EXISTS (SELECT 1 FROM catalog_drafts WHERE id = ? AND version = ? AND is_dirty = 1)' : '';
  const update = env.DB.prepare('UPDATE catalog_head SET version = ?, snapshot_json = ?, write_token = ?, updated_at = ? WHERE id = 1 AND version = ?' + guard)
    .bind(next, json, token, now, previous, ...(draft ? [draft.id, draft.version] : []));
  const statements = [update,
    env.DB.prepare('INSERT INTO catalog_revisions (version, snapshot_json, created_at, note) SELECT ?, ?, ?, ? WHERE EXISTS (SELECT 1 FROM catalog_head WHERE id = 1 AND write_token = ?)').bind(next, json, now, note, token)
  ];
  if (draft) statements.push(env.DB.prepare('UPDATE catalog_drafts SET is_dirty = 0, version = version + 1 WHERE id = ? AND version = ? AND EXISTS (SELECT 1 FROM catalog_head WHERE id = 1 AND write_token = ?)').bind(draft.id, draft.version, token));
  const result = await env.DB.batch(statements);
  if (result[0].meta.changes !== 1) fail('Catalog or draft changed in another tab; reload before publishing', 409);
  return jsonResponse({ ok: true, catalogRevision: next, message: 'Catalog published' });
}
async function publish(request, env, now) {
  const input = await body(request); schema(input, ['id', 'expectedDraftVersion', 'expectedCatalogRevision']);
  const expectedDraft = version(input.expectedDraftVersion, 'Draft version');
  const expectedCatalog = version(input.expectedCatalogRevision, 'Catalog revision');
  const identity = await identityFor(env, input.id);
  const [snapshot, draft] = await Promise.all([head(env), draftRow(env, identity.id)]);
  if (!draft?.is_dirty || draft.version !== expectedDraft || snapshot.version !== expectedCatalog) fail('Catalog or draft changed; reload before publishing', 409);
  const edit = validateDraft(JSON.parse(draft.payload_json), identity);
  const entries = snapshot.entries.filter(entry => entry.identity.id !== identity.id);
  entries.push({ identity, edit });
  return commitSnapshot(env, expectedCatalog, entries, now, 'Publish ' + identity.id, { id: identity.id, version: expectedDraft });
}

async function rollback(request, env, now) {
  const input = await body(request); schema(input, ['revision', 'expectedCatalogRevision']);
  const revision = version(input.revision, 'Revision'); const expected = version(input.expectedCatalogRevision, 'Catalog revision');
  let entries = [];
  if (revision > 0) {
    const target = await env.DB.prepare('SELECT snapshot_json FROM catalog_revisions WHERE version = ?').bind(revision).first();
    if (!target) fail('Revision not found', 404);
    entries = JSON.parse(target.snapshot_json);
  }
  // Undo produces a new immutable revision. Old shared builds can still request
  // their previous revision. Drafts and allocated IDs are never destroyed.
  return commitSnapshot(env, expected, entries, now, 'Restore revision ' + revision);
}

async function list(request, env) {
  const url = new URL(request.url);
  const kind = url.searchParams.get('kind') || 'equipment';
  if (!['equipment', 'soul', 'class', 'racial'].includes(kind)) fail('Unknown catalog');
  const q = (url.searchParams.get('q') || '').trim().toLowerCase(); if (q.length > 160) fail('Search too long');
  const pageText = url.searchParams.get('page') || '0'; if (!/^\d{1,5}$/.test(pageText)) fail('Invalid page');
  const page = Number(pageText);
  const [snapshot, allocations, drafts] = await Promise.all([head(env), env.DB.prepare('SELECT id, kind, category, item_index FROM catalog_allocations WHERE kind = ? ORDER BY category, item_index').bind(kind).all(), env.DB.prepare('SELECT id, payload_json, version, is_dirty FROM catalog_drafts').all()]);
  const edits = new Map(snapshot.entries.map(entry => [entry.identity.id, entry.edit]));
  const draftMap = new Map(drafts.results.map(row => [row.id, row]));
  const identities = baselineRecords.filter(source => sourceIdentity(source).kind === kind).map(sourceIdentity).concat(allocations.results.map(normalizeIdentity));
  const results = [];
  for (const identity of identities) {
    const draft = draftMap.get(identity.id);
    const source = baselineById.get(identity.id);
    const edit = draft?.is_dirty || (!edits.has(identity.id) && !source && draft) ? JSON.parse(draft.payload_json) : edits.get(identity.id) || draftFromSource(source, kind);
    if (q && !Object.values(edit.names).some(name => name.toLowerCase().includes(q)) && !identity.id.includes(q)) continue;
    results.push({ id: identity.id, names: edit.names, category: identity.category, level: edit.level, sockets: edit.sockets, progression: edit.progression, disabled: edit.disabled, draftVersion: draft?.is_dirty ? draft.version : 0, published: edits.has(identity.id), custom: identity.id.startsWith('modern.') });
  }
  return jsonResponse({ ok: true, catalogRevision: snapshot.version, count: results.length, page, pageSize: 40, items: results.slice(page * 40, (page + 1) * 40) });
}

export async function adminCatalog(request, env, now = Math.floor(Date.now() / 1000)) {
  const path = new URL(request.url).pathname;
  if (path === '/api/admin/meta' && request.method === 'GET') return jsonResponse({ ok: true, effects: EFFECTS, categories: categories.filter(category => EQUIPMENT_CATEGORIES.includes(category.legacy_id)), compatibilityLabels, sourceFingerprint, characterSourceFingerprint, sourceCount: baselineRecords.length });
  if (path === '/api/admin/catalog' && request.method === 'GET') return list(request, env);
  if (path === '/api/admin/item' && request.method === 'GET') return jsonResponse(await detail(env, new URL(request.url).searchParams.get('id') || ''));
  if (path === '/api/admin/revisions' && request.method === 'GET') {
    const rows = await env.DB.prepare('SELECT version, created_at, note FROM catalog_revisions ORDER BY version DESC LIMIT 50').all();
    return jsonResponse({ ok: true, revisions: rows.results, catalogRevision: (await head(env)).version });
  }
  if (path === '/api/admin/draft' && request.method === 'POST') return saveDraft(request, env, now);
  if (path === '/api/admin/publish' && request.method === 'POST') return publish(request, env, now);
  if (path === '/api/admin/rollback' && request.method === 'POST') return rollback(request, env, now);
  return jsonResponse({ ok: false, message: 'Unknown admin operation' }, 404);
}
