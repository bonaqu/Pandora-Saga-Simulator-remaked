#!/usr/bin/env node
/**
 * Manual, read-only coefficient comparison against the current Pandora Saga OS
 * class registry. Not a gameplay-parity proof. Never writes to D1 or Legacy.
 *
 * node scripts/audit_pandora_os_class_coefficients.mjs [--source local-classes.json] [--json] [--strict]
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const CLASS_ORDER = Object.freeze([
  'WARRIOR', 'GLADIATOR', 'JUGGERNAUT', 'DRAGOON', 'KNIGHT', 'GENERAL', 'PALADIN',
  'SCOUT', 'ARCHER', 'SNIPER', 'PREDATOR', 'AGENT', 'ASSASSIN', 'DISTURBANCE',
  'ACOLYTE', 'PRIEST', 'CLERIC', 'ENCHANTER', 'ASCETIC', 'MONK', 'EXORCIST',
  'MAGE', 'WIZARD', 'WARLOCK', 'CONJURER', 'DARKROAR', 'JESTER', 'CALAMITY'
]);
export const SOURCE_URL = 'https://pandorasaga-os.com/gamedata/classes.json';
const filePath = fileURLToPath(import.meta.url);
const root = path.resolve(path.dirname(filePath), '..');

export function parseLegacyModifiers(source) {
  const result = new Map();
  for (const match of source.matchAll(/Status\['Mod'\]\[\s*(\d+)\s*\]\s*=\s*new Array\(([^)]+)\)/g)) {
    const numbers = match[2].split(',').map(value => Number(value.trim()));
    if (numbers.length !== 6 || !numbers.every(Number.isFinite))
      throw new Error('Malformed Legacy class coefficients at index ' + match[1]);
    const index = Number(match[1]);
    if (result.has(index)) throw new Error('Duplicate Legacy class index ' + index);
    result.set(index, numbers);
  }
  return result;
}

/** A coefficient comparison, NOT an assertion about the actual HP/MP formula. */
export function compareCoefficients(classes, modifiers, order = CLASS_ORDER) {
  if (modifiers.size !== order.length) throw new Error('Unexpected Legacy class count ' + modifiers.size);
  if (Object.keys(classes).length !== order.length)
    throw new Error('Unexpected server class count ' + Object.keys(classes).length);
  return order.map((name, index) => {
    const current = classes[name];
    const legacy = modifiers.get(index);
    if (!legacy || !current || !current.hp || !current.mp)
      throw new Error('Missing class or coefficients: ' + name + ' / ' + index);
    const comparison = [
      ['hp.base', legacy[0], current.hp.base],
      ['hp.lv', 100 / legacy[2], current.hp.lv],
      ['hp.vit', 100 / legacy[4], current.hp.vit],
      ['mp.base', legacy[1], current.mp.base],
      ['mp.lv', 100 / legacy[3], current.mp.lv],
      ['mp.spi', 100 / legacy[5], current.mp.spi]
    ].map(([field, retained, server]) => {
      if (!Number.isFinite(server)) throw new Error('Non-numeric reference: ' + name + '.' + field);
      return { field, retained, server, delta: server - retained };
    });
    return { name, legacyIndex: index, comparison,
      changed: comparison.some(row => Math.abs(row.delta) > 0.00001),
      baseChanged: comparison.some(row => row.field.endsWith('.base') && Math.abs(row.delta) > 0.00001) };
  });
}

export function summarize(rows) {
  return {
    classes: rows.length,
    classesWithAnyCoefficientDifference: rows.filter(row => row.changed).length,
    classesWithBaseCoefficientDifference: rows.filter(row => row.baseChanged).length,
    largestDifferences: rows.flatMap(row => row.comparison.map(value => ({
      class: row.name, field: value.field, delta: value.delta
    }))).sort((a,b) => Math.abs(b.delta) - Math.abs(a.delta)).slice(0, 12)
  };
}

async function main(args) {
  const known = new Set(['--json', '--strict', '--source']);
  if (args.some(arg => arg.startsWith('--') && !known.has(arg)))
    throw new Error('Unknown argument. Usage: [--source FILE] [--json] [--strict]');
  const sourceIndex = args.indexOf('--source');
  if (sourceIndex >= 0 && (!args[sourceIndex + 1] || args[sourceIndex + 1].startsWith('--')))
    throw new Error('--source requires an existing local JSON path');
  const file = sourceIndex >= 0 ? args[sourceIndex + 1] : null;
  const response = file ? null : await fetch(SOURCE_URL, { signal: AbortSignal.timeout(20000) });
  if (response && !response.ok) throw new Error('Reference unavailable: HTTP ' + response.status);
  const classes = JSON.parse(file ? await fs.readFile(file, 'utf8') : await response.text());
  const ini = await fs.readFile(path.join(root, 'js/ini.js'), 'utf8');
  const rows = compareCoefficients(classes, parseLegacyModifiers(ini));
  const result = { checkedAt: new Date().toISOString(),
    reference: file ? { localSnapshot: file } : { url: SOURCE_URL },
    warning: 'Coefficient drift alone does not establish actual game-stat drift; effective class, passives, equipment and game rounding must be verified separately.',
    summary: summarize(rows), rows };
  if (args.includes('--json')) console.log(JSON.stringify(result, null, 2));
  else {
    console.log('Pandora Saga OS class coefficients: ' + JSON.stringify(result.summary));
    console.log(result.warning);
    for (const row of rows) {
      const diffs = row.comparison.filter(value => Math.abs(value.delta) > 0.00001);
      console.log(row.name + ' (' + row.legacyIndex + '): ' + diffs.map(value =>
        value.field + ' ' + value.retained.toFixed(3) + ' -> ' + value.server.toFixed(3)).join(', '));
    }
  }
  if (args.includes('--strict') && result.summary.classesWithAnyCoefficientDifference)
    process.exitCode = 1;
}
if (process.argv[1] && path.resolve(process.argv[1]) === filePath)
  main(process.argv.slice(2)).catch(error => { console.error(error.message); process.exitCode = 1; });
