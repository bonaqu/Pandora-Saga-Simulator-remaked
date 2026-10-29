#!/usr/bin/env node
// Offline, non-publishable candidate preview based on a recorded public snapshot.
// It does not inspect private drafts or localizations, and makes no identity claim.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { CANDIDATES, inspectFireWeapon } from './audit_pandora_os_fire_weapon_candidates.mjs';
import { baselineById, baselineRecords, sourceIdentity } from '../admin-api/src/catalog-baseline.mjs';
import { draftFromSource, validateDraft, compileRecord } from '../admin-api/src/catalog-model.mjs';
import { convertedEffects } from './materialize_pandora_os_live_sync_hardening.mjs';

const CLASS_ORDER = ['WARRIOR','GLADIATOR','JUGGERNAUT','DRAGOON','KNIGHT','GENERAL','PALADIN','SCOUT','ARCHER','SNIPER','PREDATOR','AGENT','ASSASSIN','DISTURBANCE','ACOLYTE','PRIEST','CLERIC','ENCHANTER','ASCETIC','MONK','EXORCIST','MAGE','WIZARD','WARLOCK','CONJURER','DARKROAR','JESTER','CALAMITY'];

export function previewFireProcs(row) {
  const ru=String(row.descriptionRu||''),en=String(row.descriptionEn||'');
  const hasAny=/Пламя феникса|шанс наложить Ожог/i.test(ru)||/Phoenix Flame|chance to inflict Burn/i.test(en);
  if (!hasAny) return [];
  if (!ru.includes('Закалка самоцветом огня, начиная с +7 и за каждый уровень:') ||
      !en.includes('When enhanced with a Fire Gem, starting at +7, per enhancement level:'))
    throw new Error('Fire weapon proc condition needs review');
  const rules=[];
  const burnRu=ru.match(/\+(\d+)% шанс наложить Ожог/),burnEn=en.match(/\+(\d+)% chance to inflict Burn/);
  if (Boolean(burnRu)!==Boolean(burnEn) || burnRu && burnRu[1]!==burnEn[1]) throw new Error('Burn chance localizations disagree');
  if (burnRu) rules.push({kind:'burn',chance:Number(burnRu[1]),from:7,every:1,to:10,gemElement:'fire'});
  const chanceRu=ru.match(/\+(\d+)% шанс призвать Пламя феникса/),chanceEn=en.match(/\+(\d+)% chance to summon Phoenix Flame/);
  if (Boolean(chanceRu)!==Boolean(chanceEn) || chanceRu && chanceRu[1]!==chanceEn[1]) throw new Error('Phoenix chance localizations disagree');
  if (/Пламя феникса|Phoenix Flame/i.test(ru+' '+en) && !chanceRu) throw new Error('Phoenix description needs review');
  if (chanceRu) {
    const a=ru.match(/Пламя феникса: 25 урона \+ 25% от (СИЛ|ИНТ), не чаще 1 раза в 5 секунд\./);
    const b=en.match(/Phoenix Flame: 25 damage \+ 25% of (STR|INT), at most 1 activation every 5 seconds\./);
    if (!a || !b || (a[1]==='СИЛ'?'STR':'INT')!==b[1] ||
        !ru.includes('Каждое следующее улучшение +25 и 25% от '+a[1]+' и сокращает откат на 1 секунду.') ||
        !en.includes('Each further enhancement adds +25 damage and 25% of '+b[1]+' and reduces the cooldown by 1 second.'))
      throw new Error('Phoenix formula localizations need review');
    rules.push({kind:'special_magic_damage',names:{en:'Phoenix Flame',ru:'Пламя феникса',jp:'',tw:''},
      chance:Number(chanceRu[1]),chanceStep:Number(chanceRu[1]),from:7,every:1,to:10,gemElement:'fire',
      damageStat:b[1],baseDamage:25,damageStep:25,statPercent:25,statPercentStep:25,cooldownSeconds:5,cooldownReduction:1});
  }
  return rules;
}

function confirmedFireRefinement(candidate) {
  const defs={
    1652:{func:'EP_FIRE_RESISTANCE_CONST',stat:138,value:3,ru:'Сопротивляемость магии огня +3',en:'Fire magic resistance +3'},
    1862:{func:'EP_ELEMENT_DAMAGE_SCALE_FIRE',stat:43,value:1,ru:'Магическая атака огнем +1%',en:'Fire magic attack +1%'},
    2652:{func:'EP_FIRE_RESISTANCE_CONST',stat:138,value:4,ru:'Сопротивляемость магии огня +4',en:'Fire magic resistance +4'},
    2852:{func:'EP_INTELIGENCE_CONST',stat:5,value:1,ru:'ИНТ +1',en:'INT +1'}
  };
  const def=defs[candidate.serverId];if(!def)return [];
  const source=candidate.source;
  if (!source.descriptionRu.includes('Закалка самоцветом огня, начиная с +7 и за каждый уровень:') ||
      !source.descriptionEn.includes('When enhanced with a Fire Gem, starting at +7, per enhancement level:') ||
      !source.descriptionRu.includes(def.ru) || !source.descriptionEn.includes(def.en))
    throw new Error('Fire refinement descriptions changed: '+candidate.serverId);
  for(let plus=7;plus<=10;plus++) {
    const values=(candidate.forth?.[plus]||[]).filter(effect=>effect.func===def.func);
    if(values.length!==1 || values[0].a!==def.value*(plus-6) || values[0].b!==0)
      throw new Error('Fire refinement snapshots changed: '+candidate.serverId+' +'+plus);
  }
  return [{stat:def.stat,unit:'flat',value:def.value,from:7,every:1,to:10,gemElement:'fire'}];
}

export function checkPublicPair(identities, serverId, projectId) {
  if (identities.matched.some(row => row.projectId === projectId) ||
      identities.catalogOnly.some(row => row.id === projectId && row.source === 'published') ||
      !identities.missing.some(row => row.kind === 'equipment' && row.serverId === serverId))
    throw new Error('Identity report conflicts with review pair: ' + serverId);
}

export function previewCandidate(candidate, source, baseline = baselineRecords) {
  const evidence = inspectFireWeapon(candidate, source, baseline);
  const identity = sourceIdentity(source), initial = draftFromSource(source, 'equipment');
  const sourceRow = candidate.source, classNames = Object.keys(sourceRow.classes || {});
  const unknownClasses = classNames.filter(name => !CLASS_ORDER.includes(name));
  if (unknownClasses.length) throw new Error('Unknown class mapping: ' + unknownClasses.join(','));
  const conversion = convertedEffects({ effects: sourceRow.effects }, false);
  if (!conversion.complete) throw new Error('Unmapped effect; no synthetic replacement: ' + candidate.serverId);
  const trial = structuredClone(initial);
  trial.names = { ...trial.names, en: candidate.names.en, ru: candidate.names.ru };
  trial.description = { ...trial.description, en: sourceRow.descriptionEn, ru: sourceRow.descriptionRu };
  trial.level = sourceRow.level; trial.sockets = sourceRow.sockets; trial.baseAttack = sourceRow.W;
  if (Number.isInteger(sourceRow.range) && sourceRow.range > 0 && sourceRow.range <= 10000) trial.baseRange = sourceRow.range;
  trial.classes = classNames.length ? CLASS_ORDER.map(name => sourceRow.classes[name] ? 1 : 0) : [...initial.classes];
  trial.effectMode = 'replace'; trial.effects = conversion.effects;
  trial.procEffects = previewFireProcs(sourceRow);
  trial.nativeUpgradePolicy = ['equipment.12.12','equipment.13.9'].includes(identity.id)
    ? 'replace-legacy-fire-wand' : 'replace-legacy-fire-weapon';
  trial.upgradeBonuses = confirmedFireRefinement(candidate);
  // Direct observation in the current game client resolves a conflict with
  // itemForth for this item only: its fire-gem upgrade increases SPR, not INT.
  // This remains an offline proposal until identity and private edits are reviewed.
  if (candidate.serverId === 2652) {
    const actual=Object.fromEntries(sourceRow.effects.filter(effect => ['EP_VITARITY_CONST','EP_INTELIGENCE_CONST','EP_SPIRITUAL_CONST'].includes(effect.func)).map(effect=>[effect.func,effect.a]));
    if (actual.EP_VITARITY_CONST!==2 || actual.EP_INTELIGENCE_CONST!==4 || actual.EP_SPIRITUAL_CONST!==3 ||
        !sourceRow.descriptionRu.includes('СД +1') || !sourceRow.descriptionEn.includes('SPI +1'))
      throw new Error('Spark Wand source changed since client observation; review required');
    trial.upgradeBonuses.unshift({stat:4,unit:'flat',value:1,from:7,every:1,to:10,gemElement:'fire'});
  }
  const validated = validateDraft(trial, identity);
  const oldRecord = compileRecord(validateDraft(initial, identity), identity, source);
  const newRecord = compileRecord(validated, identity, source);
  return { serverId: candidate.serverId, identity, evidence,
    oldRecord, syntheticCandidate: newRecord,
    syntheticEdit: validated,
    notes: ['Synthetic preview only; never apply without confirming identity and the current D1 state.',
      'Forth effects are not imported automatically; the Spark Wand SPR rule is based on an in-game observation, and other elemental and proc semantics require separate validation.',
      'RU/EN names and descriptions here are proposals, not permission to overwrite manually managed translations.',
      'Private drafts, publication history and separately versioned localizations are not visible to this offline report.',
      'Replacement changes calculation code; verify user-selected effects, references and old builds before publication.'] };
}

function main() {
  if (process.argv.length !== 4) throw new Error('Usage: node scripts/audit_pandora_os_fire_update_preview.mjs <candidate-report.json> <identity-report.json>');
  const candidates = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
  const identities = JSON.parse(fs.readFileSync(process.argv[3], 'utf8'));
  if (!Array.isArray(candidates.candidates) || !Array.isArray(identities.matched) || !Array.isArray(identities.catalogOnly) || candidates.catalogRevision !== identities.revision)
    throw new Error('Candidate and identity reports do not share a catalog revision');
  for (const resource of candidates.sources.filter(row => !row.url.endsWith('itemForth.json'))) {
    const previous = identities.sources.find(row => row.url === resource.url);
    if (!previous || previous.sha256 !== resource.sha256) throw new Error('Candidate and identity source hashes differ: ' + resource.url);
  }
  const rows = CANDIDATES.map(([serverId, projectId]) => {
    checkPublicPair(identities, serverId, projectId);
    return previewCandidate(candidates.candidates.find(row => row.kind === 'equipment' && row.serverId === serverId), baselineById.get(projectId));
  });
  process.stdout.write(JSON.stringify({ createdAt: new Date().toISOString(), catalogRevision: identities.revision,
    sourceHashes: candidates.sources, mode: 'offline-synthetic-preview-not-for-publication',
    limitations: ['A public snapshot does not reveal private drafts or D1 localization overrides.',
      'No authoritative server-ID to legacy-ID mapping has been established.'], rows }, null, 2) + '\n');
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) try { main(); } catch(error) { console.error(error.message); process.exitCode = 1; }
