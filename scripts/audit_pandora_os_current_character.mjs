#!/usr/bin/env node
// Independent read-only capture and comparison; does not claim game parity.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { isDeepStrictEqual } from 'node:util';
import { currentRacialDrafts } from '../admin-api/src/current-racial-data.mjs';
import { auditCurrentSkills, CLASS_IDS } from './lib/current-skill-audit.mjs';
import { auditCurrentGameReference, loadDatedGameReference } from './audit_pandora_os_gameplay_reference.mjs';
import { baselineById, sourceIdentity } from '../admin-api/src/catalog-baseline.mjs';
import { draftFromSource, compileRecord } from '../admin-api/src/catalog-model.mjs';
import reviewedProfiles from '../data/current-active-profiles.v1.json' with { type: 'json' };

const branchIds = ['martial','slash','thrust','brush','blow','defense',null,'archery','alchemy','assassin','trap','warding',null,'benevolence','blessing','exorcism','hymn',null,'element','embody','darkness','charm',null,null,'riding'];
function customDomain(rule, classes) {
  const chosen = rule.classIds.map(id => CLASS_IDS[Number(id.slice(4))]);
  if (chosen.some(value => !value)) return null;
  const included = CLASS_IDS.filter(id => {
    if (!chosen.length || chosen.includes(id)) return true;
    if (rule.classScope !== 'descendants') return false;
    for (let key = classes[id]?.parent; key; key = classes[key]?.parent) if (chosen.includes(key)) return true;
    return false;
  }).sort();
  const branches = rule.branches.map(gate => ({ branch: branchIds[Number(gate.branchId.slice('skill_category.'.length))], amount: gate.minimumPoints }));
  if (branches.some(gate => !gate.branch)) return null;
  branches.sort((a,b) => a.branch.localeCompare(b.branch) || a.amount - b.amount);
  return { classes: included, level: rule.minimumLevel, branches };
}

// Reviewed source IDs describe variants of existing skills, not new skills.
// Compare both the old evidence against the latest source and each selectable
// published variant against that evidence. An absent override is a baseline
// skill, never proof that the skill itself is missing from the simulator.
export function auditReviewedProfileCoverage({ registry, sourceRows, catalog, classes, baseline = baselineById }) {
  if (!Array.isArray(registry?.records) || !Array.isArray(sourceRows) || !Array.isArray(catalog?.records))
    throw Error('Invalid reviewed profile coverage input');
  const bySource = new Map(sourceRows.map(row => [row.sourceId,row]));
  const published = new Map(catalog.records.map(record => [record.id,record]));
  const seenSkills = new Set(), seenSources = new Set(), rows = [];
  for (const reviewed of registry.records) {
    const original = baseline.get(reviewed.id);
    if (!original || original.kind !== 'active' || original.name.en !== reviewed.nativeName ||
        original.prerequisite_code !== reviewed.prerequisiteCode || seenSkills.has(reviewed.id))
      throw Error('Reviewed active skill identity changed: ' + reviewed.id);
    seenSkills.add(reviewed.id);
    const explicit = published.get(reviewed.id);
    const effective = explicit || compileRecord(draftFromSource(original,'active'),sourceIdentity(original),original);
    for (const reference of reviewed.rows) {
      if (!Number.isSafeInteger(reference.sourceId) || seenSources.has(reference.sourceId))
        throw Error('Duplicate reviewed source skill: ' + reference.sourceId);
      seenSources.add(reference.sourceId);
      const latest = bySource.get(reference.sourceId);
      const match = latest?.comparisons?.find(candidate => candidate.simulatorId.replace(/^skill\./,'skill_entry.') === reviewed.id);
      const expectedDomain = customDomain(reference.learningRequirements,classes);
      const sourceDifferences = [], publishedDifferences = [];
      if (!latest || !match || !expectedDomain) {
        rows.push({ id:reviewed.id, sourceId:reference.sourceId, origin:explicit?'published':'baseline',
          status:'source-identity-review', sourceDifferences:['identity-or-domain'], publishedDifferences:[] });
        continue;
      }
      for (const locale of ['ru','en']) for (const field of ['name','description']) {
        const previous = field === 'name' ? reference.names[locale] : reference.description[locale];
        if (previous !== latest.text[locale][field]) sourceDifferences.push(field+'.'+locale);
      }
      ['mana','cast','cooldown'].forEach((field,index)=>{
        if (reference.timing[index] !== latest.current[field]) sourceDifferences.push(field);
      });
      const latestDomain = {...match.learningDefinition.current,level:Math.max(1,match.learningDefinition.current.level)};
      if (!isDeepStrictEqual(expectedDomain,latestDomain)) sourceDifferences.push('learningRequirements');
      const isBase = reference.sourceId === reviewed.baseSourceId;
      const selected = isBase ? effective : effective.profiles?.find(profile => profile.id === 'source-'+reference.sourceId);
      let fallbackBehavior = null, fallbackDifferences = [];
      if (!selected) {
        publishedDifferences.push('missing-variant');
        // An unrepresented source variant can still behave identically via
        // the existing base row. Do not count it as a player-visible error
        // unless the base outputs or learning domain actually differ.
        if (effective.profiles?.length) fallbackBehavior = 'other-profiles-need-review';
        else {
          for (const locale of ['ru','en']) for (const field of ['names','description'])
            if (effective[field]?.[locale] !== reference[field][locale]) fallbackDifferences.push(field+'.'+locale);
          ['mana','cast','cooldown'].forEach((field,index)=>{
            if (effective.timing?.[index] !== reference.timing[index]) fallbackDifferences.push(field);
          });
          const native=match.learningDefinition.native;
          const baseDomain=effective.learningRequirements ? customDomain(effective.learningRequirements,classes) : native.supported
            ? {classes:native.classes,level:Math.max(1,native.level),branches:native.branches} : null;
          if (!baseDomain) fallbackBehavior='learning-domain-unverified';
          else {
            const baseBranches=new Map(baseDomain.branches.map(gate=>[gate.branch,gate.amount]));
            const expectedBranches=new Map(expectedDomain.branches.map(gate=>[gate.branch,gate.amount]));
            const covers=expectedDomain.classes.every(id=>baseDomain.classes.includes(id)) && baseDomain.level<=expectedDomain.level &&
              [...baseBranches].every(([branch,amount])=>amount<=(expectedBranches.get(branch) || 0));
            if (!covers) fallbackDifferences.push('learningRequirements');
            fallbackBehavior=fallbackDifferences.length?'differs':'matches-reviewed';
          }
        }
      }
      else {
        for (const locale of ['ru','en']) for (const field of ['names','description'])
          if (selected[field]?.[locale] !== reference[field][locale]) publishedDifferences.push(field+'.'+locale);
        ['mana','cast','cooldown'].forEach((field,index)=>{
          if (selected.timing?.[index] !== reference.timing[index]) publishedDifferences.push(field);
        });
        const native = match.learningDefinition.native;
        const actualDomain = selected.learningRequirements ? customDomain(selected.learningRequirements,classes) : native.supported
          ? {classes:native.classes,level:Math.max(1,native.level),branches:native.branches} : null;
        if (!isDeepStrictEqual(actualDomain,expectedDomain)) publishedDifferences.push('learningRequirements');
      }
      rows.push({id:reviewed.id,sourceId:reference.sourceId,origin:explicit?'published':'baseline',
        status:sourceDifferences.length?'source-changed':publishedDifferences.length?'catalog-difference':'matches-reviewed',
        sourceDifferences,publishedDifferences,fallbackBehavior,fallbackDifferences});
    }
  }
  return { compared:rows.length, skills:seenSkills.size, sourceChanged:rows.filter(row=>row.sourceDifferences.length).length,
    missingVariant:rows.filter(row=>row.publishedDifferences.includes('missing-variant')).length,
    missingVariantDifferentFallback:rows.filter(row=>row.fallbackBehavior==='differs').length,
    missingVariantMatchingFallback:rows.filter(row=>row.fallbackBehavior==='matches-reviewed').length,
    missingVariantUnverifiedFallback:rows.filter(row=>row.fallbackBehavior && !['differs','matches-reviewed'].includes(row.fallbackBehavior)).length,
    catalogDifferent:rows.filter(row=>row.publishedDifferences.length).length,
    baselineRows:rows.filter(row=>row.origin==='baseline').length, rows,
    caveat:'Reviewed IDs and static learning domains do not establish combat formulas or permit overwriting private edits.' };
}

export function compareBranchCaps(ini, classes, expertise) {
  const keys = ['slash','thrust','brush','blow','defense','archery','alchemy','assassin','trap','warding',
    'benevolence','blessing','exorcism','hymn','element','embody','darkness','charm','race','riding'];
  const rows = [...ini.matchAll(/Skill\['P'\]\[\s*(\d+)\]\s*=\s*new Array\('[^']*'\s*,([^;]+)\);/g)]
    .map(match => ({ index: Number(match[1]), values: match[2].split(',').map(Number) }));
  if (rows.length !== 28 || new Set(rows.map(row => row.index)).size !== 28 || rows.some(row => row.index < 0 || row.index >= 28 || row.values.length !== 20 || row.values.some(value => !Number.isFinite(value)))) throw Error('Invalid native branch cap table');
  const differences = [];
  for (const row of rows) keys.forEach((key, index) => {
    const expected = classes[CLASS_IDS[row.index]]?.branchCaps?.[key];
    if (typeof expected !== 'number' || !Number.isFinite(expected)) throw Error('Missing source branch cap');
    if (row.values[index] !== expected) differences.push({ classId: CLASS_IDS[row.index], branch: key, retained: row.values[index], source: expected });
  });
  return { compared: rows.length * keys.length, differences,
    sourceBranchesWithoutDirectColumn: expertise.branchNames.filter(key => !keys.includes(key)),
    caveat: 'Static retained Skill.P table compared with class.branchCaps; does not establish actual Modern runtime cap or whether a source branch is supported elsewhere.' };
}

export function compareCharacter({ source, catalog, nativeSkills, nativeClasses, dated, nativeIni }) {
  if (!catalog?.ok || !Number.isSafeInteger(catalog.revision) || !Array.isArray(catalog.records)) throw Error('Invalid public catalog');
  const sourceAudit = auditCurrentSkills({ skills: source.skills, english: source['strings.en'], classes: source.classes }, nativeSkills, nativeClasses);
  const published = new Map(catalog.records.map(record => [record.id, record]));
  const raceRows = currentRacialDrafts().map(draft => {
    const actual = published.get(draft.id), differences = [];
    for (const field of ['names', 'description']) for (const locale of ['ru', 'en']) {
      if (actual?.[field]?.[locale] !== draft[field]?.[locale]) differences.push({ field: field + '.' + locale, actual: actual?.[field]?.[locale], expected: draft[field]?.[locale] });
    }
    const order = value => [...(value || [])].sort((a, b) => a.stat - b.stat || a.unit.localeCompare(b.unit));
    if (!isDeepStrictEqual(order(actual?.effects), order(draft.effects))) differences.push({ field: 'effects', actual: actual?.effects, expected: draft.effects });
    if (actual?.effectMode !== draft.effectMode) differences.push({ field: 'effectMode', actual: actual?.effectMode, expected: draft.effectMode });
    if (!isDeepStrictEqual(actual?.bonusRequirements, draft.bonusRequirements)) differences.push({ field: 'bonusRequirements', actual: actual?.bonusRequirements, expected: draft.bonusRequirements });
    if (!isDeepStrictEqual(actual?.rangeBonus, draft.rangeBonus)) differences.push({ field: 'rangeBonus', actual: actual?.rangeBonus, expected: draft.rangeBonus });
    return { id: draft.id, present: Boolean(actual), differences };
  });
  const groups = new Map();
  for (const row of sourceAudit.rows) if (row.comparisons.length === 1) {
    const id = row.comparisons[0].simulatorId.replace(/^skill\./, 'skill_entry.');
    if (!groups.has(id)) groups.set(id, []); groups.get(id).push(row);
  }
  const skillRows = [], unresolved = [];
  for (const [id, rows] of groups) {
    let record = published.get(id), origin = record ? 'published' : 'baseline';
    const baseline = baselineById.get(id);
    if (!record && baseline) {
      try { record = compileRecord(draftFromSource(baseline, baseline.kind), sourceIdentity(baseline), baseline); }
      catch (error) { unresolved.push({ id, sourceIds: rows.map(row => row.sourceId), reason: 'baseline cannot be projected: ' + error.message }); continue; }
    }
    if (!record) { unresolved.push({ id, sourceIds: rows.map(row => row.sourceId), reason: 'baseline and public override unavailable' }); continue; }
    const reviewed = reviewedProfiles.records.find(entry => entry.id === id && entry.nativeName === baseline?.name?.en && entry.prerequisiteCode === baseline?.prerequisite_code);
    for (const row of rows) {
      const variant = record.profiles?.find(profile => profile.id === 'source-' + row.sourceId);
      const reviewedBase = reviewed?.baseSourceId === row.sourceId;
      if (!variant && rows.length > 1 && !reviewedBase) { unresolved.push({ id, sourceId: row.sourceId, reason: 'multiple source definitions; unverified or unpublished variant selection' }); continue; }
      const selected = variant || record, differences = [];
      for (const locale of ['ru', 'en']) for (const field of ['name', 'description']) {
        const actual = selected[field === 'name' ? 'names' : 'description']?.[locale], expected = row.text[locale][field];
        if (actual !== expected) differences.push({ field: field + '.' + locale, actual, expected });
      }
      if (record.active) [row.current.mana, row.current.cast, row.current.cooldown].forEach((value, index) => {
        if (selected.timing?.[index] !== value) differences.push({ field: ['mana', 'cast', 'cooldown'][index], actual: selected.timing?.[index], expected: value });
      });
      const learning = row.comparisons[0].learningDefinition;
      const actualDomain = selected.learningRequirements ? customDomain(selected.learningRequirements, source.classes) : learning.native.supported
        ? { classes: learning.native.classes, level: Math.max(1, learning.native.level), branches: learning.native.branches } : null;
      const expectedDomain = { ...learning.current, level: Math.max(1, learning.current.level) };
      const learningComparison = actualDomain ? isDeepStrictEqual(actualDomain, expectedDomain) ? 'matching-static-domain' : 'different-static-domain' : 'unsupported';
      skillRows.push({ id, sourceId: row.sourceId, origin, profile: variant?.id || null, identityBasis: row.candidateBasis,
        learningComparison, actualDomain, expectedDomain,
        missingRussian: { name: !selected.names?.ru, description: !selected.description?.ru }, typeMatches: row.comparisons[0].typeMatches,
        caveat: 'name-based candidate, not a verified source identity or combat formula', differences });
    }
  }
  return { revision: catalog.revision, sourceAudit, gameplay: auditCurrentGameReference(source, dated),
    reviewedProfileCoverage: auditReviewedProfileCoverage({registry:reviewedProfiles,sourceRows:sourceAudit.rows,catalog,classes:source.classes}),
    racial: { compared: raceRows.length, different: raceRows.filter(row => row.differences.length).length, rows: raceRows },
    publishedSkillCandidates: { compared: skillRows.length, different: skillRows.filter(row => row.differences.length).length,
      baseline: skillRows.filter(row => row.origin === 'baseline').length, missingRussianName: skillRows.filter(row => row.missingRussian.name).length,
      missingRussianDescription: skillRows.filter(row => row.missingRussian.description).length,
      differentLearning: skillRows.filter(row => row.learningComparison === 'different-static-domain').length,
      unsupportedLearning: skillRows.filter(row => row.learningComparison === 'unsupported').length, rows: skillRows, unresolved },
    expertise: nativeIni ? compareBranchCaps(nativeIni, source.classes, source.expertise) : { note: 'Static branch table not supplied.' },
    caveat: 'No D1 private drafts/history, runtime calculations, in-game proof or guaranteed identity from names.' };
}

async function main() {
  const args = process.argv.slice(2);
  if (args.length === 4 && args[0] === '--bundle' && args[2] === '--output') {
    const { source, catalog, metadata } = JSON.parse(fs.readFileSync(args[1], 'utf8'));
    const nativeSkills = JSON.parse(fs.readFileSync('data/generated/skills.v1.json', 'utf8')).records;
    const nativeClasses = JSON.parse(fs.readFileSync('data/generated/character.v1.json', 'utf8')).records.filter(row => row.kind === 'class');
    const dated = await loadDatedGameReference();
    const nativeIni = fs.readFileSync('js/ini.js', 'utf8');
    const result = { ...compareCharacter({ source, catalog, nativeSkills, nativeClasses, dated, nativeIni }), metadata };
    fs.writeFileSync(args[3], JSON.stringify(result, null, 2) + '\n', { flag: 'wx' });
    console.log(JSON.stringify({ output: args[3], revision: catalog.revision,
      counts: Object.fromEntries(Object.entries(result.publishedSkillCandidates).filter(([key]) => !['rows','unresolved'].includes(key))),
      unresolved: result.publishedSkillCandidates.unresolved.length }));
    return;
  }
  if (args.length !== 2 || args[0] !== '--output-dir') throw Error('Usage: node scripts/audit_pandora_os_current_character.mjs --output-dir NEW_DIRECTORY');
  const dir = args[1]; fs.mkdirSync(dir, { recursive: false });
  const api = 'https://pandora-saga-simulator-remaked-admin-api.bonaqu.workers.dev/api/catalog';
  async function read(url) {
    const response = await fetch(url, { cache: 'no-store', signal: AbortSignal.timeout(30000) });
    if (!response.ok) throw Error('Cannot fetch ' + url + ': HTTP ' + response.status);
    const bytes = Buffer.from(await response.arrayBuffer());
    return { url, sha256: createHash('sha256').update(bytes).digest('hex'), data: JSON.parse(bytes.toString('utf8')) };
  }
  const headBefore = await read(api + '/head');
  const names = ['classes', 'items', 'souls', 'skills', 'racialPassives', 'strings.en', 'strings.ru', 'expertise'];
  const captures = await Promise.all([...names.map(name => read('https://pandorasaga-os.com/gamedata/' + name + '.json')), read(api)]);
  const headAfter = await read(api + '/head'), catalog = captures.at(-1).data;
  if (headBefore.data.revision !== catalog.revision || headAfter.data.revision !== catalog.revision) throw Error('Catalog revision changed during capture');
  const source = Object.fromEntries(names.map((name, index) => [name, captures[index].data]));
  const nativeSkills = JSON.parse(fs.readFileSync('data/generated/skills.v1.json', 'utf8')).records;
  const nativeClasses = JSON.parse(fs.readFileSync('data/generated/character.v1.json', 'utf8')).records.filter(row => row.kind === 'class');
  const dated = await loadDatedGameReference();
  const metadata = { checkedAt: new Date().toISOString(), revision: catalog.revision,
    sources: captures.map(({ url, sha256 }) => ({ url, sha256 })) };
  const bundle = { source, catalog, metadata };
  const nativeIni = fs.readFileSync('js/ini.js', 'utf8');
  const result = { ...compareCharacter({ source, catalog, nativeSkills, nativeClasses, dated, nativeIni }), metadata };
  for (const [name, value] of [['bundle.json', bundle], ['report.json', result]]) fs.writeFileSync(path.join(dir, name), JSON.stringify(value, null, 2) + '\n', { flag: 'wx' });
  console.log(JSON.stringify({ dir, revision: catalog.revision, racial: { compared: result.racial.compared, different: result.racial.different },
    publishedSkillCandidates: { compared: result.publishedSkillCandidates.compared, different: result.publishedSkillCandidates.different, unresolved: result.publishedSkillCandidates.unresolved.length },
    sourceCounts: sourceAuditSummary(result.sourceAudit), gameplay: result.gameplay.skills }));
}
function sourceAuditSummary(audit) { return { rows: audit.rowCount, native: audit.nativeCount, ...audit.counts }; }
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main().catch(error => { console.error(error.message); process.exitCode = 1; });
