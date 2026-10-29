import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import nativeSkills from '../../data/generated/skills.v1.json' with { type: 'json' };
import nativeCharacter from '../../data/generated/character.v1.json' with { type: 'json' };
import datedClasses from '../fixtures/pandora-os-classes-20261011.json' with { type: 'json' };
import { CLASS_IDS } from '../../scripts/lib/current-skill-audit.mjs';
import { compareCharacter, compareBranchCaps, auditReviewedProfileCoverage } from '../../scripts/audit_pandora_os_current_character.mjs';
import { currentRacialDrafts } from '../../admin-api/src/current-racial-data.mjs';
import { currentActiveProfileDrafts, currentActiveProfileReference } from '../../admin-api/src/current-active-profiles.mjs';
import { baselineById, sourceIdentity } from '../../admin-api/src/catalog-baseline.mjs';
import { compileRecord, validateDraft } from '../../admin-api/src/catalog-model.mjs';

const parents = [null,0,1,1,0,4,4,null,7,8,8,7,11,11,null,14,15,15,14,18,18,null,21,22,22,21,25,25];
const classes = Object.fromEntries(CLASS_IDS.map((key, index) => [key, { ...datedClasses[key],
  parent: parents[index] === null ? null : CLASS_IDS[parents[index]], name: key }]));
const enClasses = Object.fromEntries(CLASS_IDS.map(key => [key, { n: key }]));
const all = Object.fromEntries(CLASS_IDS.map(key => [key, 1]));
function skill(id, classes, level = 0) { return { id, name: 'Русское название', desc: 'Описание', learnable: true,
  skillType: 'MYSELF', mana: 5, cast: 1, cooldown: 2, charLevel: level,
  reqs: [{ branch: 'defense', amount: 8 }], classes, funcs: [] }; }
function fixture() {
  const skills = { 168001001: skill(168001001, all), 168001003: skill(168001003, { GENERAL: 1 }, 45),
    168001004: skill(168001004, { PALADIN: 1 }, 45),
    100000501: { ...skill(100000501, { WARRIOR: 1 }, 5), reqs: [], skillType: 'ENEMY' } };
  const english = { locale: 'en', classes: enClasses, skills: Object.fromEntries(Object.keys(skills).map(id => [id,
    { n: id === '100000501' ? 'Provoke' : 'Blocking', d: 'Description' }])) };
  const source = { classes, skills, items: {}, souls: {}, racialPassives: {}, 'strings.en': english, 'strings.ru': { locale: 'ru' } };
  const base = { id: 'skill_entry.5.3', kind: 'active', active: true, names: { ru: 'base', en: 'Blocking' },
    description: { ru: 'Описание', en: 'Description' }, timing: [5, 1, 2, 0], profiles: [{ id: 'source-168001003',
      names: { ru: 'Русское название', en: 'Blocking' }, description: { ru: 'Описание', en: 'Description' }, timing: [5, 1, 2, 0],
      learningRequirements: { classIds: ['job.5'], classScope: 'exact', minimumLevel: 45,
        branches: [{ branchId: 'skill_category.5', minimumPoints: 8 }] } }] };
  return { source, catalog: { ok: true, revision: 92, records: [base] }, nativeSkills: nativeSkills.records,
    nativeClasses: nativeCharacter.records.filter(row => row.kind === 'class'), dated: { classes: datedClasses, items: {}, souls: {} } };
}

test('racial comparison reports a missing or changed range bonus',()=>{
  const input=fixture(), edit=currentRacialDrafts().find(row=>row.id==='racial_skill.1.1');
  const source=baselineById.get(edit.id),identity=sourceIdentity(source);
  const record=compileRecord(validateDraft(edit,identity),identity,source);
  input.catalog.records.push(record);
  assert.equal(compareCharacter(input).racial.rows.find(row=>row.id===edit.id).differences.length,0);
  delete record.rangeBonus;
  assert.ok(compareCharacter(input).racial.rows.find(row=>row.id===edit.id).differences.some(diff=>diff.field==='rangeBonus'&&diff.expected.amount===500));
});

test('reviewed profile coverage distinguishes missing variants, source drift and manual catalog changes',()=>{
  const input=fixture(), reviewed=structuredClone(currentActiveProfileReference.records.find(row=>row.id==='skill_entry.5.3'));
  const rows=compareCharacter(input).sourceAudit.rows.filter(row=>reviewed.rows.some(ref=>ref.sourceId===row.sourceId));
  for(const row of rows) {
    const ref=reviewed.rows.find(value=>value.sourceId===row.sourceId);
    row.text={ru:{name:ref.names.ru,description:ref.description.ru},en:{name:ref.names.en,description:ref.description.en}};
    [row.current.mana,row.current.cast,row.current.cooldown]=ref.timing;
  }
  const edit=currentActiveProfileDrafts().find(row=>row.id===reviewed.id),source=baselineById.get(edit.id),identity=sourceIdentity(source);
  const record=compileRecord(validateDraft(edit,identity),identity,source);
  const options={registry:{records:[reviewed]},sourceRows:rows,catalog:{records:[record]},classes:input.source.classes};
  const before=JSON.stringify(options),all=auditReviewedProfileCoverage(options);
  assert.equal(all.compared,3);assert.equal(all.sourceChanged,0);assert.equal(all.catalogDifferent,0);
  assert.equal(JSON.stringify(options),before);
  record.profiles.pop();
  const missing=auditReviewedProfileCoverage(options);
  assert.equal(missing.missingVariant,1);assert.equal(missing.rows.find(row=>row.sourceId===168001004).status,'catalog-difference');
  assert.equal(missing.missingVariantUnverifiedFallback,1);
  record.profiles=[];
  assert.equal(auditReviewedProfileCoverage(options).missingVariantMatchingFallback,2);
  reviewed.rows.find(row=>row.sourceId===168001004).timing[2]=9;
  rows.find(row=>row.sourceId===168001004).current.cooldown=9;
  const differentFallback=auditReviewedProfileCoverage(options);
  assert.equal(differentFallback.missingVariantDifferentFallback,1);
  assert.deepEqual(differentFallback.rows.find(row=>row.sourceId===168001004).fallbackDifferences,['cooldown']);
  rows.find(row=>row.sourceId===168001003).current.cooldown=7;
  record.names.ru='Ручная правка';
  const changed=auditReviewedProfileCoverage(options);
  assert.deepEqual(changed.rows.find(row=>row.sourceId===168001003).sourceDifferences,['cooldown']);
  assert.ok(changed.rows.find(row=>row.sourceId===168001001).publishedDifferences.includes('names.ru'));
  assert.equal(record.names.ru,'Ручная правка');
});

test('unpublished skill uses retained baseline; known profile and ambiguity remain separate without mutations', () => {
  const input = fixture(), before = JSON.stringify(input);
  const result = compareCharacter(input);
  assert.ok(result.publishedSkillCandidates.rows.some(row => row.id === 'skill_entry.0.0' && row.origin === 'baseline' && row.learningComparison));
  assert.ok(result.publishedSkillCandidates.unresolved.some(row => row.id === 'skill_entry.5.3' && row.sourceId === 168001004));
  assert.ok(result.publishedSkillCandidates.rows.some(row => row.id === 'skill_entry.5.3' && row.sourceId === 168001003 && row.profile === 'source-168001003' && row.differences.length === 0));
  assert.equal(JSON.stringify(input), before);
});

test('effective localized baseline and source-specific timing are inspected without assuming matching mechanics', () => {
  const input = fixture();
  const result = compareCharacter(input);
  const row = result.publishedSkillCandidates.rows.find(row => row.sourceId === 168001003);
  assert.equal(row.learningComparison, 'matching-static-domain');
  assert.equal(row.missingRussian.name, false);
  input.catalog.records[0].profiles[0].learningRequirements.minimumLevel = 46;
  input.catalog.records[0].profiles[0].timing[0] = 42;
  input.catalog.records[0].profiles[0].description.ru = '';
  const changed = compareCharacter(input).publishedSkillCandidates.rows.find(entry => entry.sourceId === 168001003);
  assert.equal(changed.learningComparison, 'different-static-domain');
  assert.equal(changed.missingRussian.description, true);
  assert.ok(changed.differences.some(entry => entry.field === 'mana' && entry.actual === 42));
  assert.match(changed.caveat, /not a verified source identity or combat formula/);
});

test('static branch cap comparison detects drift but does not claim runtime behavior', () => {
  const ini = readFileSync(new URL('../../js/ini.js', import.meta.url), 'utf8');
  const keys = ['slash','thrust','brush','blow','defense','archery','alchemy','assassin','trap','warding',
    'benevolence','blessing','exorcism','hymn','element','embody','darkness','charm','race','riding'];
  const source = Object.fromEntries(CLASS_IDS.map(key => [key, { branchCaps: Object.fromEntries(keys.map(k => [k, 0])) }]));
  const expertise = { branchNames: [...keys, 'summon'] };
  const result = compareBranchCaps(ini, source, expertise);
  assert.equal(result.compared, 560); assert.ok(result.differences.length > 0);
  assert.deepEqual(result.sourceBranchesWithoutDirectColumn, ['summon']);
  assert.match(result.caveat, /does not establish/);
  assert.throws(() => compareBranchCaps('broken', source, expertise), /table/);
});
