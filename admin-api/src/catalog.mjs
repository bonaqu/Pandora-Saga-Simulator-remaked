import { randomUUID } from 'node:crypto';
import { CatalogError, draftFromSource, validateDraft, compileRecord, showApprovedTranslations, EFFECTS, EQUIPMENT_CATEGORIES, NATIVE_PASSIVES } from './catalog-model.mjs';
import { baselineById, baselineRecords, categories, skillCategories, compatibilityLabels, sourceFingerprint, characterSourceFingerprint, sourceIdentity, firstNewIndex } from './catalog-baseline.mjs';
import { jsonResponse } from './auth.mjs';

const MAX_SNAPSHOT_BYTES = 900000;
const encoder = new TextEncoder();
const fail = (message, status = 400) => { throw new CatalogError(message, status); };
const normalizeIdentity = row => ({ id: row.id, kind: row.kind, category: row.kind === 'soul' ? null : row.category, index: row.item_index });
const normalizeSkillIdentity = row => ({ ...normalizeIdentity(row), templateId: row.template_id });
const sourceFor = identity => baselineById.get(identity.templateId || identity.id);
// Read-only annotations of the retained js/calc.js branches, NOT formulas or
// editable bonuses. Absence means the engine does not model that game mechanic.
const racialReference = {
  'racial_skill.0.0': 'Legacy не рассчитывает бонус: условие оружия в Fighting Spirit недостижимо. Игровой эффект здесь не подтверждён.',
  'racial_skill.0.1': 'Сопротивление физическим негативным эффектам +15 процентных пунктов.',
  'racial_skill.0.2': 'Эффективность зелий +15 процентных пунктов.',
  'racial_skill.1.0': 'Стоимость MP −15 процентных пунктов.',
  'racial_skill.1.1': 'Дальность: эффект помечен в Legacy как нереализованный (0).',
  'racial_skill.1.2': 'Сопротивление чарам +20 процентных пунктов.',
  'racial_skill.2.1': 'Dwarf Spirit помечен в Legacy как нереализованный (0).',
  'racial_skill.3.0': 'Шанс критического удара +2 процентных пункта.',
  'racial_skill.3.2': 'Уклонение +2.',
  'racial_skill.4.0': 'Получаемый физический урон −10%. В исходном Legacy также ошибочно добавляется +2 пункта шанса крита. Modern-коррекция −2 пункта убирает только эту ошибку.',
  'racial_skill.4.1': 'Legacy не рассчитывает бонус: условие оружия в Strong Arm недостижимо. Игровой эффект здесь не подтверждён.',
  'racial_skill.5.0': 'Получаемый магический урон −10%. В исходном Legacy также ошибочно добавляется +2 пункта шанса крита. Modern-коррекция −2 пункта убирает только эту ошибку.'
};
async function identityFor(env, id) {
  const source = baselineById.get(id);
  if (source) return sourceIdentity(source);
  const row = await env.DB.prepare('SELECT id, kind, category, item_index FROM catalog_allocations WHERE id = ?').bind(id).first();
  if (row) return normalizeIdentity(row);
  const skill = await env.DB.prepare('SELECT id, kind, category, item_index, template_id FROM catalog_skill_allocations WHERE id = ?').bind(id).first();
  if (skill) return normalizeSkillIdentity(skill);
  fail('Item not found', 404);
}
async function headMeta(env) {
  const row = await env.DB.prepare('SELECT version, impact_version FROM catalog_head WHERE id = ?').bind(1).first();
  if (!row) fail('Catalog is not initialized', 503);
  return { version: row.version, impactVersion: row.impact_version };
}
async function head(env) {
  const row = await env.DB.prepare('SELECT version, impact_version, snapshot_json FROM catalog_head WHERE id = ?').bind(1).first();
  if (!row) fail('Catalog is not initialized', 503);
  return { version: row.version, impactVersion: row.impact_version, entries: JSON.parse(row.snapshot_json) };
}
async function draftRow(env, id) { return env.DB.prepare('SELECT payload_json, version, is_dirty, updated_at FROM catalog_drafts WHERE id = ?').bind(id).first(); }
function compileEntry(entry) {
  return compileRecord(validateDraft(entry.edit, entry.identity), entry.identity, sourceFor(entry.identity));
}
function buildImpactRecord(record) {
  const result = structuredClone(record);
  // Display-only/catalog-documentation fields must never make a saved build
  // stale. They still publish in the normal catalog revision so the UI updates.
  for (const key of ['names', 'description', 'notes', 'acquisition', 'modifiers', 'calculationNotes']) delete result[key];
  if (Array.isArray(result.profiles)) {
    result.profiles = result.profiles.map(profile => {
      const copy = structuredClone(profile);
      delete copy.names;
      delete copy.description;
      return copy;
    });
  }
  return result;
}
function impactProjection(entries) {
  const effective = new Map();
  for (const source of baselineRecords) {
    const identity = sourceIdentity(source);
    effective.set(identity.id, buildImpactRecord(compileRecord(draftFromSource(source, identity.kind), identity, source)));
  }
  for (const entry of entries) effective.set(entry.identity.id, buildImpactRecord(compileEntry(entry)));
  return JSON.stringify([...effective.entries()].sort((a, b) => a[0].localeCompare(b[0])));
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

export async function publicCatalogHead(env) {
  const meta = await headMeta(env);
  return jsonResponse({
    ok: true,
    schemaVersion: 1,
    sourceFingerprint,
    characterSourceFingerprint,
    revision: meta.version,
    impactRevision: meta.impactVersion
  });
}

export async function publicCatalog(request, env) {
  const url = new URL(request.url);
  const requested = url.searchParams.get('revision');
  let snapshot;
  if (requested === null) snapshot = await head(env);
  else {
    if (!/^\d{1,9}$/.test(requested)) fail('Invalid revision');
    const revision = Number(requested);
    if (revision === 0) snapshot = { version: 0, impactVersion: 0, entries: [] };
    else {
      const row = await env.DB.prepare('SELECT impact_version, snapshot_json FROM catalog_revisions WHERE version = ?').bind(revision).first();
      if (!row) fail('Catalog revision not found', 404);
      snapshot = { version: revision, impactVersion: row.impact_version, entries: JSON.parse(row.snapshot_json) };
    }
  }
  return jsonResponse({ ok: true, schemaVersion: 1, sourceFingerprint, characterSourceFingerprint, revision: snapshot.version, impactRevision: snapshot.impactVersion, records: snapshot.entries.map(compileEntry) });
}

async function detail(env, id) {
  const identity = await identityFor(env, id);
  const source = sourceFor(identity);
  const [snapshot, draft] = await Promise.all([head(env), draftRow(env, id)]);
  const published = snapshot.entries.find(entry => entry.identity.id === id);
  const edit = draft?.is_dirty || (!published && (!source || identity.templateId) && draft) ? JSON.parse(draft.payload_json) : published?.edit || draftFromSource(source, identity.kind);
  const displayEdit = showApprovedTranslations(edit, source, identity.kind);
  displayEdit.id = id; displayEdit.category = identity.category;
  const currentRecord = published ? compileEntry(published) : source && !identity.templateId ? compileRecord(draftFromSource(source, identity.kind), identity, source) : null;
  return { ok: true, identity, edit: displayEdit, currentRecord, nativeMechanics: identity.kind === 'racial' ? racialReference[id] || 'Эта расовая механика не моделируется в исходном калькуляторе. Описание из игры не создаёт числовой эффект автоматически.' : null,
    draftVersion: draft?.version || 0, hasDraft: Boolean(draft?.is_dirty), catalogRevision: snapshot.version, published: Boolean(published), sourceCode: source?.calculation_code || '', engineKey: source?.name.jp || 'Modern:' + id,
    nativeSkill: source?.prerequisite_code ? { templateName: source.name, prerequisites: source.prerequisites, equipmentRequirements: source.equipment_requirements, prerequisiteCode: source.prerequisite_code,
      intrinsicEffect: !identity.templateId && NATIVE_PASSIVES[identity.id] ? structuredClone(NATIVE_PASSIVES[identity.id]) : null } : null };
}

async function preview(request, env) {
  const input = await body(request); schema(input, ['edit', 'expectedCatalogRevision']);
  const expected = version(input.expectedCatalogRevision, 'Catalog revision');
  if ((await head(env)).version !== expected) fail('Catalog changed in another tab; reload before previewing', 409);
  if (!input.edit?.id) fail('Сначала сохраните новую запись как черновик; сайт при этом не меняется');
  const identity = await identityFor(env, input.edit.id);
  const record = compileRecord(validateDraft(input.edit, identity), identity, sourceFor(identity));
  return jsonResponse({ ok: true, record, catalogRevision: expected });
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
    if (kind === 'active' || kind === 'passive') {
      const template = baselineById.get(input.edit.templateId);
      if (!template || template.kind !== kind || template.legacy_category_id !== category) fail('Choose an existing source skill of the same type and branch');
      const id = 'modern.' + kind + '.' + randomUUID();
      identity = { id, kind, category, index: template.legacy_entry_index, templateId: template.id };
      const edit = validateDraft({ ...input.edit, id }, identity); compileRecord(edit, identity, template);
      const allocated = await env.DB.batch([
        env.DB.prepare('INSERT INTO catalog_skill_allocations (id, kind, category, item_index, template_id, created_at) SELECT ?, ?, ?, ?, ?, ? WHERE EXISTS (SELECT 1 FROM catalog_head WHERE id = 1 AND version = ?) AND (SELECT COUNT(*) FROM catalog_skill_allocations) < 256').bind(id, kind, category, identity.index, template.id, now, expectedCatalog),
        env.DB.prepare('INSERT INTO catalog_drafts (id, payload_json, version, updated_at) SELECT ?, ?, 1, ? WHERE EXISTS (SELECT 1 FROM catalog_skill_allocations WHERE id = ?)').bind(id, JSON.stringify(edit), now, id)
      ]);
      if (allocated[0].meta.changes !== 1) {
        if ((await head(env)).version !== expectedCatalog) fail('Catalog changed in another tab; reload before saving', 409);
        fail('Skill variants reached their safe capacity (256 additions)', 413);
      }
      return jsonResponse(await detail(env, id), 201);
    }
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
  compileRecord(edit, identity, sourceFor(identity));
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
  const current = await head(env);
  if (current.version !== previous) fail('Catalog changed in another tab; reload before publishing', 409);
  const token = randomUUID(); const next = previous + 1;
  const impactVersion = impactProjection(current.entries) === impactProjection(entries) ? current.impactVersion : next;
  // A batch is one immutable snapshot and one D1 transaction. All draft
  // versions must still match before the head can be updated.
  const selectedDrafts = draft ? Array.isArray(draft) ? draft : [draft] : [];
  const guard=selectedDrafts.map(()=>' AND EXISTS (SELECT 1 FROM catalog_drafts WHERE id = ? AND version = ? AND is_dirty = 1)').join('');
  const update = env.DB.prepare('UPDATE catalog_head SET version = ?, impact_version = ?, snapshot_json = ?, write_token = ?, updated_at = ? WHERE id = 1 AND version = ?' + guard)
    .bind(next, impactVersion, json, token, now, previous, ...selectedDrafts.flatMap(item=>[item.id,item.version]));
  const statements = [update,
    env.DB.prepare('INSERT INTO catalog_revisions (version, impact_version, snapshot_json, created_at, note) SELECT ?, ?, ?, ?, ? WHERE EXISTS (SELECT 1 FROM catalog_head WHERE id = 1 AND write_token = ?)').bind(next, impactVersion, json, now, note, token)
  ];
  for(const item of selectedDrafts)
    statements.push(env.DB.prepare('UPDATE catalog_drafts SET is_dirty = 0, version = version + 1 WHERE id = ? AND version = ? AND is_dirty = 1 AND EXISTS (SELECT 1 FROM catalog_head WHERE id = 1 AND write_token = ?)').bind(item.id,item.version,token));
  const result = await env.DB.batch(statements);
  if(result[0].meta.changes!==1 || result[1].meta.changes!==1 ||
     result.slice(2).some(row=>row.meta.changes!==1))
    fail('Catalog or draft changed in another tab; reload before publishing',409);
  return jsonResponse({ ok: true, catalogRevision: next, impactRevision: impactVersion, message: 'Catalog published' });
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


const MAX_BATCH_DRAFTS=50;
async function listDrafts(env) {
  const [snapshot,rows]=await Promise.all([
    headMeta(env),
    env.DB.prepare(
      "SELECT id, version, updated_at, json_extract(payload_json, '$.kind') AS kind, " +
      "json_extract(payload_json, '$.names.en') AS name_en, json_extract(payload_json, '$.names.ru') AS name_ru " +
      "FROM catalog_drafts WHERE is_dirty = 1 ORDER BY updated_at DESC, id LIMIT 501"
    ).all()
  ]);
  if(rows.results.length>500)fail('More than 500 drafts; narrow the list before publishing',413);
  return jsonResponse({ok:true,catalogRevision:snapshot.version,count:rows.results.length,
    maxBatch:MAX_BATCH_DRAFTS,items:rows.results.map(row=>({
      id:row.id,kind:row.kind,name:row.name_ru||row.name_en||row.id,
      englishName:row.name_en||'',version:row.version,updatedAt:row.updated_at
    }))});
}

async function publishBatch(request,env,now) {
  const input=await body(request);
  schema(input,['items','expectedCatalogRevision']);
  const expectedCatalog=version(input.expectedCatalogRevision,'Catalog revision');
  if(!Array.isArray(input.items)||input.items.length<1||input.items.length>MAX_BATCH_DRAFTS)
    fail('Select between 1 and '+MAX_BATCH_DRAFTS+' saved drafts');
  const requested=new Map();
  for(const item of input.items) {
    if(!item || typeof item!=='object'||Array.isArray(item)||
       Object.keys(item).sort().join(',')!=='expectedDraftVersion,id'||
       typeof item.id!=='string'||item.id.length>160||!item.id||
       requested.has(item.id))
      fail('Invalid or duplicate draft identity');
    requested.set(item.id,version(item.expectedDraftVersion,'Draft version'));
  }
  const snapshot=await head(env);
  if(snapshot.version!==expectedCatalog)fail('Catalog changed since draft selection; reload before publishing',409);
  const chosen=[];
  for(const [id,expectedVersion] of requested) {
    const identity=await identityFor(env,id);
    const draft=await draftRow(env,id);
    if(!draft?.is_dirty||draft.version!==expectedVersion)
      fail('Draft changed or was published elsewhere: '+id,409);
    const edit=validateDraft(JSON.parse(draft.payload_json),identity);
    compileRecord(edit,identity,sourceFor(identity));
    chosen.push({identity,edit,version:expectedVersion,id});
  }
  const ids=new Set(chosen.map(row=>row.id));
  const entries=snapshot.entries.filter(entry=>!ids.has(entry.identity.id));
  for(const {identity,edit} of chosen)entries.push({identity,edit});
  const result=await commitSnapshot(env,expectedCatalog,entries,now,
    'Publish '+chosen.length+' selected catalog drafts',
    chosen.map(({id,version})=>({id,version})));
  const payload=await result.json();
  return jsonResponse({...payload,count:chosen.length,publishedIds:chosen.map(row=>row.id)});
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
  if (!['equipment', 'soul', 'class', 'racial', 'active', 'passive'].includes(kind)) fail('Unknown catalog');
  const q = (url.searchParams.get('q') || '').trim().toLowerCase(); if (q.length > 160) fail('Search too long');
  const pageText = url.searchParams.get('page') || '0'; if (!/^\d{1,5}$/.test(pageText)) fail('Invalid page');
  const page = Number(pageText);
  const skillKind = kind === 'active' || kind === 'passive';
  const allocationQuery = skillKind ? 'SELECT id, kind, category, item_index, template_id FROM catalog_skill_allocations WHERE kind = ? ORDER BY category, item_index, id' : 'SELECT id, kind, category, item_index FROM catalog_allocations WHERE kind = ? ORDER BY category, item_index';
  const [snapshot, allocations, drafts] = await Promise.all([head(env), env.DB.prepare(allocationQuery).bind(kind).all(), env.DB.prepare('SELECT id, payload_json, version, is_dirty FROM catalog_drafts').all()]);
  const edits = new Map(snapshot.entries.map(entry => [entry.identity.id, entry.edit]));
  const draftMap = new Map(drafts.results.map(row => [row.id, row]));
  const identities = baselineRecords.filter(source => sourceIdentity(source).kind === kind).map(sourceIdentity).concat(allocations.results.map(skillKind ? normalizeSkillIdentity : normalizeIdentity));
  const results = [];
  for (const identity of identities) {
    const draft = draftMap.get(identity.id);
    const source = sourceFor(identity);
    const edit = draft?.is_dirty || (!edits.has(identity.id) && (!source || identity.templateId) && draft) ? JSON.parse(draft.payload_json) : edits.get(identity.id) || draftFromSource(source, kind);
    const displayEdit = showApprovedTranslations(edit, source, kind);
    if (q && !Object.values(displayEdit.names).some(name => name.toLowerCase().includes(q)) && !identity.id.includes(q)) continue;
    results.push({ id: identity.id, names: displayEdit.names, category: identity.category, ...(identity.templateId ? { templateId: identity.templateId } : {}), level: edit.level, sockets: edit.sockets, progression: edit.progression, disabled: edit.disabled, draftVersion: draft?.is_dirty ? draft.version : 0, published: edits.has(identity.id), custom: identity.id.startsWith('modern.') });
  }
  return jsonResponse({ ok: true, catalogRevision: snapshot.version, count: results.length, page, pageSize: 40, items: results.slice(page * 40, (page + 1) * 40) });
}

export async function adminCatalog(request, env, now = Math.floor(Date.now() / 1000)) {
  const path = new URL(request.url).pathname;
  if (path === '/api/admin/meta' && request.method === 'GET') return jsonResponse({ ok: true, effects: EFFECTS, categories: categories.filter(category => EQUIPMENT_CATEGORIES.includes(category.legacy_id)), skillCategories, compatibilityLabels, sourceFingerprint, characterSourceFingerprint, sourceCount: baselineRecords.length });
  if (path === '/api/admin/catalog' && request.method === 'GET') return list(request, env);
  if (path === '/api/admin/drafts' && request.method === 'GET') return listDrafts(env);
  if (path === '/api/admin/item' && request.method === 'GET') return jsonResponse(await detail(env, new URL(request.url).searchParams.get('id') || ''));
  if (path === '/api/admin/revisions' && request.method === 'GET') {
    const rows = await env.DB.prepare('SELECT version, impact_version AS impactRevision, created_at, note FROM catalog_revisions ORDER BY version DESC LIMIT 50').all();
    const current = await head(env);
    return jsonResponse({ ok: true, revisions: rows.results, catalogRevision: current.version, impactRevision: current.impactVersion });
  }
  if (path === '/api/admin/draft' && request.method === 'POST') return saveDraft(request, env, now);
  if (path === '/api/admin/preview' && request.method === 'POST') return preview(request, env);
  if (path === '/api/admin/publish' && request.method === 'POST') return publish(request, env, now);
  if (path === '/api/admin/publish-batch' && request.method === 'POST') return publishBatch(request, env, now);
  if (path === '/api/admin/rollback' && request.method === 'POST') return rollback(request, env, now);
  return jsonResponse({ ok: false, message: 'Unknown admin operation' }, 404);
}
