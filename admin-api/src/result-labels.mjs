import baseline from '../../localization/calculator-results.ru.json' with { type: 'json' };
import { CatalogError } from './catalog-model.mjs';
import { jsonResponse } from './auth.mjs';

const labels = baseline.labels;
// Reserved value fits the already-deployed 0005 D1 CHECK constraint (length >= 1).
// It cannot be supplied via the admin input because angle brackets are rejected.
const BASELINE_TOMBSTONE = '<excel-baseline>';
const IDS = Array.from({ length: 43 }, (_, index) => 'calculator.status.' + index);
if (baseline.schemaVersion !== 1 || baseline.locale !== 'ru' ||
    Object.keys(labels).length !== 43 || IDS.some(id => typeof labels[id] !== 'string' || !labels[id])) {
  throw new Error('Invalid result label baseline');
}
const fail = (message, status = 400) => { throw new CatalogError(message, status); };

function validId(id) {
  return typeof id === 'string' && Object.hasOwn(labels, id);
}

async function readBody(request) {
  if ((request.headers.get('Content-Type') || '').split(';')[0].trim() !== 'application/json')
    fail('JSON body required', 415);
  const reader = request.body?.getReader();
  if (!reader) fail('JSON body required');
  let text = '', length = 0;
  const decoder = new TextDecoder('utf-8', { fatal: true });
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      length += value.byteLength;
      if (length > 2048) { await reader.cancel(); fail('Payload too large', 413); }
      text += decoder.decode(value, { stream: true });
    }
    text += decoder.decode();
    return JSON.parse(text);
  } catch (error) {
    if (error instanceof CatalogError) throw error;
    fail('Invalid JSON');
  }
}

async function stored(env) {
  const query = await env.DB.prepare('SELECT id, ru, version, updated_at FROM result_label_overrides ORDER BY id').all();
  const result = new Map();
  for (const item of query.results) {
    if (validId(item.id)) result.set(item.id, item);
  }
  return result;
}

// Only customizations are sent to the public simulator. Every other caption
// comes from the versioned translation workbook bundled with the site.
export async function publicResultLabels(env) {
  const overrides = await stored(env);
  return jsonResponse({
    ok: true, schemaVersion: 1,
    overrides: Object.fromEntries([...overrides].filter(([, row]) => row.ru !== BASELINE_TOMBSTONE).map(([id, row]) => [id, row.ru]))
  });
}

export async function adminResultLabels(request, env) {
  if (request.method === 'GET') {
    const overrides = await stored(env);
    return jsonResponse({
      ok: true, schemaVersion: 1, source: 'translations.xlsx',
      items: IDS.map(id => {
        const row = overrides.get(id);
        return {
          id, baseline: labels[id], value: row?.ru && row.ru !== BASELINE_TOMBSTONE ? row.ru : labels[id],
          overridden: Boolean(row?.ru && row.ru !== BASELINE_TOMBSTONE), version: row?.version || 0,
          updatedAt: row?.updated_at || null
        };
      })
    });
  }
  if (request.method !== 'POST') return jsonResponse({ ok: false, message: 'Method not allowed' }, 405);
  const input = await readBody(request);
  if (!input || typeof input !== 'object' || Array.isArray(input) ||
      Object.keys(input).sort().join(',') !== 'expectedVersion,id,value' ||
      !validId(input.id) || !Number.isSafeInteger(input.expectedVersion) ||
      input.expectedVersion < 0 || input.expectedVersion >= 1000000000 ||
      typeof input.value !== 'string') fail('Invalid result translation request');

  const value = input.value.trim();
  if (value.length > 100 || /[\x00-\x1f\x7f<>]/.test(value)) fail('Invalid translation text');
  const row = await env.DB.prepare('SELECT ru, version FROM result_label_overrides WHERE id = ?')
    .bind(input.id).first();
  const version = row?.version || 0;
  if (version !== input.expectedVersion) fail('Translation changed in another session. Reload before saving.', 409);

  if (!value || value === labels[input.id]) {
    if (!row) return jsonResponse({ ok: true, id: input.id, value: labels[input.id], baseline: labels[input.id], version: 0, overridden: false });
    if (row.ru === BASELINE_TOMBSTONE) return jsonResponse({ ok: true, id: input.id, value: labels[input.id], baseline: labels[input.id], version, overridden: false });
    // Keep a versioned empty tombstone to protect against a stale write in
    // another browser tab racing with a reset to the Excel baseline.
    const result = await env.DB.prepare(
      'UPDATE result_label_overrides SET ru = ?, version = version + 1, updated_at = ? WHERE id = ? AND version = ?'
    ).bind(BASELINE_TOMBSTONE, Math.floor(Date.now() / 1000), input.id, version).run();
    if (result.meta.changes !== 1) fail('Translation changed during save', 409);
    return jsonResponse({ ok: true, id: input.id, value: labels[input.id], baseline: labels[input.id], version: version + 1, overridden: false });
  }

  if (row?.ru === value) return jsonResponse({
    ok: true, id: input.id, value, baseline: labels[input.id], version, overridden: true
  });

  const next = version + 1;
  const now = Math.floor(Date.now() / 1000);
  const result = await env.DB.prepare(
    'INSERT INTO result_label_overrides (id, ru, version, updated_at) VALUES (?, ?, 1, ?) ' +
    'ON CONFLICT(id) DO UPDATE SET ru = excluded.ru, version = result_label_overrides.version + 1, ' +
    'updated_at = excluded.updated_at WHERE result_label_overrides.version = ?'
  ).bind(input.id, value, now, version).run();
  if (result.meta.changes !== 1) fail('Translation changed during save', 409);
  return jsonResponse({ ok: true, id: input.id, value, baseline: labels[input.id], version: next, overridden: true });
}
