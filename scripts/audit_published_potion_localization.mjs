#!/usr/bin/env node
/**
 * GET-only post-deploy audit of the 14 Potion Effects labels + 14 hints.
 *
 * A successful D1 migration is not proof that every row was published:
 * an owner's draft can intentionally prevent seeding, an owner's reset can
 * preserve a tombstone, and an already-published custom text must win.
 *
 * Do not modify D1 or pretend that a missing public override is a published
 * translation. The approved local RU fallback is checked independently.
 */
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';

export const PUBLIC_LOCALIZATION_URL =
  'https://pandora-saga-simulator-remaked-admin-api.bonaqu.workers.dev/api/localization';

const hasOwn = (object, key) => Object.prototype.hasOwnProperty.call(object, key);
export const POTION_KEYS = Object.freeze(Array.from({length: 14}, (_, index) =>
  ['calculator.potion.' + index, 'calculator.potion.' + index + '.hint']).flat());

export function inspectPotionLocalization(payload, approved) {
  const published = payload?.overrides?.game?.ru;
  const fallback = approved?.game?.ru;
  if (payload?.ok !== true || payload?.schemaVersion !== 1 ||
      !published || Array.isArray(published) || typeof published !== 'object')
    throw new Error('Unexpected public D1 localization response');
  if (!fallback || Array.isArray(fallback) || typeof fallback !== 'object')
    throw new Error('Approved RU fallback is missing');

  const summary = {total: POTION_KEYS.length, published: 0,
    seededOrEquivalent: 0, custom: 0, resets: 0, absent: 0};
  const rows = POTION_KEYS.map((key) => {
    if (typeof fallback[key] !== 'string' || !fallback[key].trim())
      throw new Error('Missing approved RU potion fallback: ' + key);
    const present = hasOwn(published, key);
    const text = present ? published[key] : undefined;
    if (present && typeof text !== 'string')
      throw new Error('Invalid public D1 potion value: ' + key);
    let status;
    if (!present) { status = 'absent'; summary.absent++; }
    else if (text === '') { status = 'reset'; summary.resets++; }
    else if (text === fallback[key]) {
      status = 'seeded-or-equivalent'; summary.seededOrEquivalent++;
      summary.published++;
    } else { status = 'custom'; summary.custom++; summary.published++; }
    // Deliberately omit all owner-edited contents from CI logs.
    return {key, status, fallbackAvailable: true};
  });
  return {
    source: 'public D1 localization GET',
    checked: '14 Potion Effects labels and 14 hint keys',
    ownerEditsPreserved: true,
    isCompletePublicPublication: summary.published === summary.total,
    disclaimer: 'absent may be an intentional unpublished draft; reset is an intentional tombstone; approved fallback does not imply D1 publication',
    summary, rows
  };
}

async function main(args) {
  if (args.some(arg => !['--json', '--require-all-published'].includes(arg)))
    throw new Error('Usage: node scripts/audit_published_potion_localization.mjs [--json] [--require-all-published]');
  const approved = JSON.parse(await readFile(
    new URL('../localization/approved-translations.v1.json', import.meta.url), 'utf8'));
  const response = await fetch(PUBLIC_LOCALIZATION_URL, {
    signal: AbortSignal.timeout(20000),
    headers: {accept: 'application/json', 'cache-control': 'no-cache'}
  });
  if (!response.ok) throw new Error('Public D1 localization unavailable: HTTP ' + response.status);
  const audit = inspectPotionLocalization(await response.json(), approved);
  if (args.includes('--json')) console.log(JSON.stringify(audit, null, 2));
  else {
    console.log('Potion RU D1 publication:', JSON.stringify(audit.summary));
    for (const row of audit.rows.filter(row => row.status !== 'seeded-or-equivalent'))
      console.log(row.key + ': ' + row.status);
  }
  if (args.includes('--require-all-published') && !audit.isCompletePublicPublication) {
    console.error('Not all 28 RU keys are currently published in D1; see protected draft/reset statuses.');
    process.exitCode = 1;
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]))
  main(process.argv.slice(2)).catch(error => {
    console.error('Potion D1 audit failed: ' + error.message);
    process.exitCode = 1;
  });
