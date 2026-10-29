#!/usr/bin/env node
// Report capabilities and unsupported details for identity-audit candidates.
// Reads public JSON only; neither writes a catalog nor publishes data.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { serverCategory, serverPatch } from './materialize_pandora_os_live_sync_hardening.mjs';
import { convertedCurrentEffects, CURRENT_EFFECT_MAP } from './lib/current-effect-conversion.mjs';
import { stableCustomId } from './materialize_pandora_os_identity_reconcile.mjs';
import { draftFromSource, validateDraft, compileRecord } from '../admin-api/src/catalog-model.mjs';
import { baselineRecords } from '../admin-api/src/catalog-baseline.mjs';

const CLASS_ORDER = ['WARRIOR','GLADIATOR','JUGGERNAUT','DRAGOON','KNIGHT','GENERAL','PALADIN','SCOUT','ARCHER','SNIPER','PREDATOR','AGENT','ASSASSIN','DISTURBANCE','ACOLYTE','PRIEST','CLERIC','ENCHANTER','ASCETIC','MONK','EXORCIST','MAGE','WIZARD','WARLOCK','CONJURER','DARKROAR','JESTER','CALAMITY'];
const baseUrl = 'https://pandorasaga-os.com/gamedata/';
async function getJson(url) {
  const response = await fetch(url, { signal: AbortSignal.timeout(30000), cache: 'no-store' });
  if (!response.ok) throw new Error('GET failed: ' + url + ' HTTP ' + response.status);
  const bytes = Buffer.from(await response.arrayBuffer());
  return { url, sha256: createHash('sha256').update(bytes).digest('hex'), data: JSON.parse(bytes.toString('utf8')) };
}
export function mappedWeaponSourceIds(projectId,matched) {
  return (matched||[]).filter(row=>row.kind==='equipment'&&row.projectId===projectId)
    .map(row=>row.serverId).sort((a,b)=>a-b);
}
export function inspectCandidate(candidate, source, english, forth) {
  const kind = candidate.kind, category = kind === 'equipment' && source ? serverCategory(source) : null;
  if (!source || Number(source.id) !== candidate.serverId || category !== candidate.category) throw new Error('Candidate/source identity or category mismatch: ' + candidate.serverId);
  const id = stableCustomId(kind, source.id), identity = { id, kind, category, index: 1 };
  const conversion = convertedCurrentEffects(source, kind === 'equipment');
  const warnings = [], unsupportedEffects = [];
  for (const effect of source.effects || []) {
    if (!CURRENT_EFFECT_MAP[effect.func]) unsupportedEffects.push({ ...effect, reason: 'unmapped effect' });
    else if (Number(effect.min || 0) > 0) unsupportedEffects.push({ ...effect, reason: 'conditional threshold not included by base converter' });
    else if (effect.exclusive || (effect.dir && !['SELF', 'TARGET'].includes(effect.dir))) unsupportedEffects.push({ ...effect, reason: 'condition or direction needs independent verification' });
  }
  const levels = forth && typeof forth === 'object' ? forth : {};
  const enhancementFunctions = [...new Set(Object.values(levels).flatMap(value => Array.isArray(value) ? value.map(effect => effect.func) : []))].sort();
  if (enhancementFunctions.length) warnings.push('Forth levels are full snapshots, not additive rules; new custom IDs are not in the existing static itemForth runtime map. Each effect needs explicit support and verification.');
  if (enhancementFunctions.some(func => !CURRENT_EFFECT_MAP[func])) warnings.push('At least one enhancement effect is not represented by the numeric effect converter; combat proc is not simulated.');
  if (kind === 'equipment') warnings.push('Race and gender restrictions require separate identity evidence; new-item factory defaults every race and both gender flags to allowed.');
  if (kind === 'equipment' && category <= 13 && (!Number.isInteger(source.range) || source.range < 1 || source.range > 10000))
    warnings.push('Weapon base range is missing or outside the supported catalog bounds; review before publication.');
  const classNames = Object.keys(source.classes || {}), unknownClasses = classNames.filter(name => !CLASS_ORDER.includes(name));
  if (unknownClasses.length) warnings.push('Source contains unsupported class identifiers.');
  let draftPreview, validationError = null;
  try {
    const patch = serverPatch(kind, source, english);
    const edit = { ...draftFromSource(null, kind), ...patch, id, kind, category, effectMode: 'replace', effects:conversion.effects, disabled: false };
    if (kind === 'equipment') edit.classes = classNames.length ? CLASS_ORDER.map(name => source.classes[name] ? 1 : 0) : Array(28).fill(1);
    if (kind === 'equipment' && category <= 13 && Number.isInteger(source.range) && source.range >= 1 && source.range <= 10000)
      edit.baseRange = source.range;
    const draft = validateDraft(edit, identity), record = compileRecord(draft, identity, null);
    draftPreview = { names: draft.names, description: draft.description, level: draft.level, sockets: draft.sockets,
      races: draft.races, classes: draft.classes, slots: draft.slots, effects: draft.effects, baseAttack: draft.baseAttack, baseRange: draft.baseRange,
      calculationCode: record.calculationCode, compatibility: record.compatibility };
  } catch (error) { validationError = error.message; }
  // Matching stats/slot are useful evidence, but distinct souls can share
  // those values. Keep every result as an unverified candidate.
  const signature=code=>String(code||'').split('_').filter(Boolean).sort().join('_');
  const equivalentSoulCandidates=kind==='soul' && conversion.complete && draftPreview
    ? baselineRecords.filter(row=>row.id.startsWith('soul.') && signature(row.calculation_code)===signature(draftPreview.calculationCode) &&
        JSON.stringify(row.compatibility_flags)===JSON.stringify(draftPreview.compatibility))
      .map(row=>({id:row.id,names:row.name,calculationCode:row.calculation_code,slots:row.compatibility_flags})) : [];
  if(equivalentSoulCandidates.length) warnings.push('Historical Soul with the same effects and slots exists; verify identity before allocating another ID.');
  // Socket counts can be changed by later editorial revisions. Match the
  // stable weapon category, level and native attack first; report the socket
  // count separately rather than excluding a plausible historical candidate.
  // A matching signature is evidence for review, not an identity decision.
  const equivalentWeaponCandidates=kind==='equipment' && Number.isInteger(source.W) && Number.isInteger(source.level)
    ? baselineRecords.filter(row=>row.id.startsWith('equipment.') && row.legacy_category_id===category &&
        row.level_requirement===source.level && String(row.calculation_code||'').split('_').includes('18=W'+source.W))
      .map(row=>({id:row.id,names:row.name,level:row.level_requirement,sockets:row.soul_socket_count,
        calculationCode:row.calculation_code})) : [];
  if(equivalentWeaponCandidates.length) warnings.push('Historical weapon with the same category, level and attack exists; compare source IDs and other evidence before allocating.');
  return { serverId: source.id, kind, projectIdCandidate: id, category, names: candidate.names,
    source: { slot: source.slot || null, itemKind: source.kind || null, twoHanded: source.twoHanded ?? null,
      level: source.level ?? null, sockets: source.soulslot ?? null, soulSlots: source.slots ?? null,
      classes: source.classes ?? null, W: source.W ?? null, PEN: source.PEN ?? null, range: source.range ?? null,
      atkspeed: source.atkspeed ?? null, AC: source.AC ?? null, block: source.block ?? null,
      effects: source.effects || [], descriptionRu: source.desc || '', descriptionEn: english?.d || '' },
    conversionComplete: conversion.complete, unsupportedEffects, forth: levels, enhancementFunctions, unknownClasses,
    draftPreview, validationError, equivalentSoulCandidates, equivalentWeaponCandidates, warnings };
}
async function main() {
  if (process.argv.length !== 3 && !(process.argv.length === 5 && process.argv[3] === '--output')) throw new Error('Usage: node scripts/audit_pandora_os_candidate_support.mjs <identity-report.json> [--output NEW_FILE]');
  const report = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
  if (!Number.isSafeInteger(report.revision) || !Array.isArray(report.missing) || !Array.isArray(report.sources)) throw new Error('Invalid identity audit');
  const files = await Promise.all(['items.json','souls.json','strings.en.json','itemForth.json'].map(name => getJson(baseUrl + name)));
  for (const resource of files.slice(0, 3)) {
    const old = report.sources.find(source => source.url === resource.url);
    if (!old || old.sha256 !== resource.sha256) throw new Error('Source changed since identity audit: ' + resource.url);
  }
  const [items, souls, english, forth] = files.map(file => file.data);
  const candidates = report.missing.map(entry => {
    const result=inspectCandidate(entry,(entry.kind === 'equipment' ? items : souls)[entry.serverId],
      english?.[entry.kind === 'equipment' ? 'items' : 'souls']?.[entry.serverId], forth[entry.serverId]);
    for(const related of result.equivalentWeaponCandidates)
      related.mappedSourceIds=mappedWeaponSourceIds(related.id,report.matched);
    return result;
  });
  const result = { checkedAt: new Date().toISOString(), catalogRevision: report.revision,
    sources: files.map(({url,sha256}) => ({url,sha256})), candidates,
    counts: { total: candidates.length, equipment: candidates.filter(row => row.kind === 'equipment').length,
      souls: candidates.filter(row => row.kind === 'soul').length, invalidPreview: candidates.filter(row => row.validationError).length,
      unsupportedBase: candidates.filter(row => !row.conversionComplete || row.unsupportedEffects.length).length,
      withForth: candidates.filter(row => Object.keys(row.forth).length).length },
    note: 'Identity is not confirmed by a name; preview is not published. Source restrictions and combat effects are not inferred from names or descriptions.' };
  const output = JSON.stringify(result, null, 2) + '\n';
  if (process.argv.length === 5) {
    fs.writeFileSync(process.argv[4], output, { flag: 'wx' });
    console.log(JSON.stringify({ revision: result.catalogRevision, counts: result.counts, output: process.argv[4] }));
  } else process.stdout.write(output);
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main().catch(error => { console.error(error.message); process.exitCode = 1; });
