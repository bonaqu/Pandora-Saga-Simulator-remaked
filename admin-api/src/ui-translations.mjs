import english from '../../localization/ui.en.json' with { type: 'json' };
import { CatalogError } from './catalog-model.mjs';
import { jsonResponse } from './auth.mjs';

const LOCALES = ['ru', 'en'];
const KEY_LIST = Object.keys(english).sort();
const KEY_SET = new Set(KEY_LIST);
const fail = (message, status = 400) => { throw new CatalogError(message, status); };
const templateSlots = text => (text.match(/\{[A-Za-z0-9_]+\}/g) || []).sort().join('|');
const safeValue = text => typeof text === 'string' && text.length <= 300 && !/[\x00-\x1f\x7f<>]/.test(text);
const rows = async env => (await env.DB.prepare(
  'SELECT locale, id, text, version, updated_at FROM ui_translation_overrides ORDER BY locale, id'
).all()).results;

async function readBody(request) {
  if ((request.headers.get('Content-Type') || '').split(';')[0].trim() !== 'application/json')
    fail('JSON body required', 415);
  const length = Number(request.headers.get('Content-Length') || '0');
  if (length > 1536) fail('Payload too large', 413);
  const reader = request.body?.getReader();
  if (!reader) fail('JSON body required');
  const decoder = new TextDecoder('utf-8', { fatal: true });
  let payload = '', bytes = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      bytes += value.byteLength;
      if (bytes > 1536) { await reader.cancel(); fail('Payload too large', 413); }
      payload += decoder.decode(value, { stream: true });
    }
    payload += decoder.decode();
    return JSON.parse(payload);
  } catch (error) {
    if (error instanceof CatalogError) throw error;
    fail('Invalid JSON');
  }
}

export async function publicUiTranslations(env) {
  const selected = await rows(env);
  const overrides = { ru: {}, en: {} };
  for (const row of selected) {
    if (LOCALES.includes(row.locale) && KEY_SET.has(row.id) && safeValue(row.text) && row.text.trim())
      overrides[row.locale][row.id] = row.text;
  }
  return jsonResponse({ ok: true, schemaVersion: 1, overrides });
}

export async function adminUiTranslations(request, env) {
  if (request.method === 'GET') {
    const selected = await rows(env);
    const known = new Map(selected.map(row => [row.locale + '\0' + row.id, row]));
    return jsonResponse({
      ok: true, schemaVersion: 1, source: 'approved-translations.v1.json',
      items: LOCALES.flatMap(locale => KEY_LIST.map(id => {
        const row = known.get(locale + '\0' + id);
        const overridden = Boolean(row?.text);
        return { id, locale, source: english[id], overridden,
          value: overridden ? row.text : '', version: row?.version || 0,
          updatedAt: row?.updated_at || null };
      }))
    });
  }
  if (request.method !== 'POST') return jsonResponse({ ok: false, message: 'Method not allowed' }, 405);
  const input = await readBody(request);
  if (!input || typeof input !== 'object' || Array.isArray(input) ||
      Object.keys(input).sort().join(',') !== 'expectedVersion,id,locale,value' ||
      !KEY_SET.has(input.id) || !LOCALES.includes(input.locale) ||
      !Number.isSafeInteger(input.expectedVersion) || input.expectedVersion < 0 ||
      input.expectedVersion > 1e9 || !safeValue(input.value)) fail('Invalid UI translation request');
  const value = input.value.trim();
  if (value && templateSlots(value) !== templateSlots(english[input.id]))
    fail('Translation placeholders must match the source');
  // English source text is a reset to the workbook baseline, never a new override.
  const wanted = input.locale === 'en' && value === english[input.id] ? '' : value;
  const found = await env.DB.prepare('SELECT text, version FROM ui_translation_overrides WHERE locale = ? AND id = ?')
    .bind(input.locale, input.id).first();
  const version = found?.version || 0;
  if (version !== input.expectedVersion) fail('Translation changed in another session. Reload before saving.', 409);
  if (found?.text === wanted || (!found && !wanted))
    return jsonResponse({ ok: true, id: input.id, locale: input.locale, value: wanted,
      version, overridden: Boolean(wanted) });
  const timestamp = Math.floor(Date.now() / 1000);
  if (found) {
    const result = await env.DB.prepare(
      'UPDATE ui_translation_overrides SET text = ?, version = version + 1, updated_at = ? ' +
      'WHERE locale = ? AND id = ? AND version = ?'
    ).bind(wanted, timestamp, input.locale, input.id, version).run();
    if (result.meta.changes !== 1) fail('Translation changed during save', 409);
  } else {
    const result = await env.DB.prepare(
      'INSERT OR IGNORE INTO ui_translation_overrides (locale, id, text, version, updated_at) VALUES (?, ?, ?, 1, ?)'
    ).bind(input.locale, input.id, wanted, timestamp).run();
    if (result.meta.changes !== 1) fail('Translation changed during save', 409);
  }
  return jsonResponse({ ok: true, id: input.id, locale: input.locale,
    value: wanted, version: version + 1, overridden: Boolean(wanted) });
}
