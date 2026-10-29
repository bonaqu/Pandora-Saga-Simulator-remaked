#!/usr/bin/env node
// Read-only comparison; discrepancies are review candidates, not write commands.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { isDeepStrictEqual } from 'node:util';
import { baselineById, sourceIdentity } from '../admin-api/src/catalog-baseline.mjs';
import { compileRecord, draftFromSource } from '../admin-api/src/catalog-model.mjs';
import { auditIdentities } from './audit_pandora_os_catalog_identity.mjs';
import { serverPatch } from './materialize_pandora_os_live_sync_hardening.mjs';
import { convertedCurrentEffects, CURRENT_EFFECT_MAP } from './lib/current-effect-conversion.mjs';
import reviews from '../data/current-source-identity-reviews.v1.json' with { type: 'json' };

const classOrder = ['WARRIOR','GLADIATOR','JUGGERNAUT','DRAGOON','KNIGHT','GENERAL','PALADIN',
  'SCOUT','ARCHER','SNIPER','PREDATOR','AGENT','ASSASSIN','DISTURBANCE',
  'ACOLYTE','PRIEST','CLERIC','ENCHANTER','ASCETIC','MONK','EXORCIST',
  'MAGE','WIZARD','WARLOCK','CONJURER','DARKROAR','JESTER','CALAMITY'];

// Classify only known presentation-only markup and outer whitespace; do not
// erase internal spaces, text, other markup, or differences in translations.
export function sameIgnoringPresentation(actual, expected) {
  const strip = value => String(value).replace(/<br\s*\/?>|<\/?b>/gi, '').trim();
  return strip(actual) === strip(expected);
}

// Unknown tokens remain unknown, never interpreted as zero or removed.
export function parseTokens(code) {
  const effects = new Map(), unknown = []; let weapon = null;
  for (const token of String(code || '').split('_').filter(Boolean)) {
    const w = /^18=W(\d+)$/.exec(token);
    if (w) { if (weapon !== null) unknown.push(token); else weapon = Number(w[1]); continue; }
    const match = /^(\d+)=(-?\d+(?:\.\d+)?)(%)?$/.exec(token);
    if (!match) { unknown.push(token); continue; }
    const key = match[1] + ':' + (match[3] ? 'percent' : 'flat');
    effects.set(key, (effects.get(key) || 0) + Number(match[2]));
  }
  return { weapon, effects, unknown };
}

function effectiveRecord(id, publicRecords, baseline) {
  if (publicRecords.has(id)) return { record: publicRecords.get(id), origin: 'published' };
  const source = baseline.get(id);
  if (!source) return null;
  const identity = sourceIdentity(source);
  try { return { record: compileRecord(draftFromSource(source, identity.kind), identity, source), origin: 'baseline' }; }
  catch (error) { return { error: error.message, origin: 'baseline' }; }
}

function missingMechanics(server) {
  return (server.effects || []).filter(effect => {
    const mapping = CURRENT_EFFECT_MAP[effect.func];
    const value = mapping?.[2] === 'chanceB' ? effect.b : effect.a;
    return !mapping || Number(effect.min || 0) > 0 || Boolean(effect.exclusive) ||
      effect.dir && !['SELF','TARGET'].includes(effect.dir) ||
      ['EP_IMMUNE_DISEASE','EP_IMMUNE_RAVING','EP_AURADAMAGE_CONST'].includes(effect.func) && effect.b != null && effect.b !== 0 ||
      typeof value !== 'number' || !Number.isFinite(value) ||
      value === 0 && ['EP_RACE_MANA_COSTCUT', 'EP_SKILL_EQUIP_DAMAGERATE'].includes(effect.func);
  }).map(effect => ({ ...effect }));
}

export function auditCatalogValues({ items, souls, english, itemForth = {}, mapping, catalog, baseline = baselineById, identities, identityReviews = [] }) {
  if (!catalog?.ok || !Array.isArray(catalog.records) || !Number.isSafeInteger(catalog.revision)) throw new Error('Invalid public catalog');
  const relation = identities || auditIdentities({ items, souls, english, mapping, catalog, baseline: [...baseline.values()], identityReviews });
  if (relation.revision !== catalog.revision) throw new Error('Identity report revision does not match catalog');
  const records = new Map(catalog.records.map(record => [record.id, record]));
  const result = { revision: catalog.revision, examined: [], unresolved: [], skipped: [] };
  for (const match of relation.matched) {
    const { kind, serverId, projectId } = match;
    const server = (kind === 'equipment' ? items : souls)[serverId];
    const current = effectiveRecord(projectId, records, baseline);
    if (!server || !current || current.error) { result.skipped.push({ kind, serverId, projectId, reason: current?.error || 'Source or effective record missing' }); continue; }
    const localized = english?.[kind === 'equipment' ? 'items' : 'souls']?.[serverId];
    if (!localized?.n) { result.skipped.push({ kind, serverId, projectId, reason: 'English name missing from source; no inferred replacement' }); continue; }
    let patch;
    try { patch = serverPatch(kind, server, localized); }
    catch (error) { result.skipped.push({ kind, serverId, projectId, reason: error.message }); continue; }
    const record = current.record, differences = [];
    function compare(field, actual, expected) {
      if (!isDeepStrictEqual(actual, expected)) differences.push({ field, actual, expected,
        ...(field.startsWith('description.') && sameIgnoringPresentation(actual, expected) ? { formattingOnly: true } : {}) });
    }
    for (const language of ['ru', 'en']) {
      compare('names.' + language, record.names?.[language] || '', patch.names[language]);
      compare('description.' + language, record.description?.[language] || '', patch.description[language]);
    }
    if (kind === 'equipment') {
      compare('level', record.level, patch.level); compare('sockets', record.sockets, patch.sockets);
      const classes = Object.keys(server.classes || {}).length ? classOrder.map(key => server.classes[key] ? 1 : 0) : Array(28).fill(1);
      compare('classes', record.compatibility?.slice(8, 36), classes);
    } else compare('slots', record.compatibility, patch.slots);
    const parsed = parseTokens(record.calculationCode);
    // Current published Priest's Earring receives this known base supplement
    // in the Modern engine outside the catalog calculation string. Count it
    // exactly once; an explicitly published replacement disables that hook.
    if (record.id === 'modern.equipment.ac383fab-00a9-45ff-a09a-b2192c47ef5d' && record.engineId === 400061 && record.nativeBasePolicy !== 'replace-priest-earring-aura')
      parsed.effects.set('33:flat', (parsed.effects.get('33:flat') || 0) + 2);
    if (patch.baseAttack !== undefined) compare('weaponAttack', parsed.weapon, patch.baseAttack);
    const converted = convertedCurrentEffects(server, kind === 'equipment');
    for (const effect of converted.effects) {
      const key = effect.stat + ':' + effect.unit;
      compare('effect.' + key, parsed.effects.get(key) ?? 0, effect.value);
    }
    const mappedKeys = new Set(converted.effects.map(effect => effect.stat + ':' + effect.unit));
    // Additional retained modifiers may be intentional or model a server EP
    // that this converter cannot express. Report them, never delete or assume.
    const unmatchedCatalogEffects = [...parsed.effects].filter(([key]) => !mappedKeys.has(key))
      .map(([key, value]) => ({ key, value }));
    const unsupported = missingMechanics(server);
    const enhancement = itemForth[serverId] || null;
    const row = { kind, serverId, projectId, origin: current.origin, differences, conversionComplete: converted.complete,
      unsupportedEffects: unsupported, unknownCatalogTokens: parsed.unknown, unmatchedCatalogEffects,
      enhancementSource: enhancement, publishedUpgradeBonuses: record.upgradeBonuses || [] };
    result.examined.push(row);
    if (!converted.complete || parsed.unknown.length || unmatchedCatalogEffects.length || enhancement) result.unresolved.push({ kind, serverId, projectId,
      reason: 'Unsupported source effects, unparsed catalog tokens or enhancement tiers require individual comparison' });
  }
  result.counts = { examined: result.examined.length, different: result.examined.filter(row => row.differences.length).length,
    substantiveOrUnclassified: result.examined.filter(row => row.differences.some(diff => !diff.formattingOnly)).length,
    onlyPresentation: result.examined.filter(row => row.differences.length && row.differences.every(diff => diff.formattingOnly)).length,
    incompleteConversion: result.examined.filter(row => !row.conversionComplete).length,
    enhancementReview: result.examined.filter(row => row.enhancementSource).length,
    unmatchedCatalogEffects: result.examined.filter(row => row.unmatchedCatalogEffects.length).length, skipped: result.skipped.length };
  result.note = 'Comparisons identify differences only; public data cannot establish whether a value is a deliberate editor change. No writes or deletion suggestions.';
  return result;
}

function main() {
  const args = process.argv.slice(2);
  if (args.length !== 4 || args[0] !== '--input' || args[2] !== '--output') throw new Error('Usage: node scripts/audit_pandora_os_catalog_values.mjs --input BUNDLE.json --output NEW_REPORT.json');
  const bundle = JSON.parse(fs.readFileSync(args[1], 'utf8'));
  if (bundle.identityReviews === undefined) bundle.identityReviews = reviews.reviews;
  const result = auditCatalogValues(bundle);
  fs.writeFileSync(args[3], JSON.stringify(result, null, 2) + '\n', { flag: 'wx' });
  console.log(JSON.stringify({ revision: result.revision, counts: result.counts, output: args[3] }));
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { main(); } catch (error) { console.error(error.message); process.exitCode = 1; }
}
