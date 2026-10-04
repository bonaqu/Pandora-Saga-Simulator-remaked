import test from 'node:test';
import assert from 'node:assert/strict';
import nativeSkills from '../../data/generated/skills.v1.json' with { type: 'json' };
import nativeCharacters from '../../data/generated/character.v1.json' with { type: 'json' };
import { auditCurrentSkills, CLASS_IDS, nativeLearningDefinition } from '../../scripts/lib/current-skill-audit.mjs';
const parents = [null, 0, 1, 1, 0, 4, 4, null, 7, 8, 8, 7, 11, 11, null, 14, 15, 15, 14, 18, 18, null, 21, 22, 22, 21, 25, 25];
const classes = Object.fromEntries(CLASS_IDS.map((key, i) => [key, { parent: parents[i] == null ? null : CLASS_IDS[parents[i]], name: key }]));
const nativeClasses = nativeCharacters.records.filter(row => row.kind === 'class');
const englishClasses = Object.fromEntries(CLASS_IDS.map(key => [key, { n: key }]));
const all = Object.fromEntries(CLASS_IDS.map(key => [key, 1]));
const row = (id, overrides = {}) => ({ id, name: 'fixture RU', desc: 'fixture description', learnable: true,
  skillType: 'ENEMY', mana: 10, cast: 0, cooldown: 15, charLevel: 5, reqs: [],
  classes: { WARRIOR: 1, GLADIATOR: 1, JUGGERNAUT: 1, DRAGOON: 1, KNIGHT: 1, GENERAL: 1, PALADIN: 1 },
  funcs: [], ...overrides });
const audit = (rows, strings, classRows = classes) => auditCurrentSkills({
  skills: Object.fromEntries(rows.map(value => [value.id, value])),
  english: { classes: englishClasses, skills: strings }, classes: classRows
}, nativeSkills.records, nativeClasses);
const en = name => ({ n: name, d: 'fixture EN' });

test('28 identities verify exact engine code, family and parent; source classes cannot drift silently', () => {
  assert.equal(audit([], {}).classChecks.length, 28);
  const wrongParent = structuredClone(classes); wrongParent.DRAGOON.parent = 'KNIGHT';
  assert.throws(() => audit([], {}, wrongParent), /identity mismatch/);
  const extra = { ...classes, UNKNOWN: { parent: null } };
  assert.throws(() => audit([], {}, extra), /class set/);
  const swapped = structuredClone(nativeClasses); swapped[3].engineCode = 'W3p';
  assert.throws(() => auditCurrentSkills({ skills: {}, english: {}, classes }, [], swapped), /identity mismatch/);
});

test('native single class includes descendants, paired class uses exact class; aggregate branches are unresolved, not invented', () => {
  assert.deepEqual(nativeLearningDefinition('J=4=35', classes).classes, ['GENERAL', 'KNIGHT', 'PALADIN']);
  assert.deepEqual(nativeLearningDefinition('J=4=35_S=5=8', classes).classes, ['KNIGHT']);
  assert.deepEqual(nativeLearningDefinition('S=4=41_S=15=21', classes).branches,
    [{ branch: 'blow', amount: 41 }, { branch: 'exorcism', amount: 21 }]);
  for (const code of ['S=12=102', 'S=6=3', 'J=28=1', 'S=24=31_exec()', 'J=0=1_J=1=2'])
    assert.equal(nativeLearningDefinition(code, classes).supported, false, code);
});

test('a complete textual/threshold match remains a candidate, never mechanics/runtime acceptance; inputs stay intact', () => {
  const values = [row(100000501)]; const original = JSON.stringify(values);
  const report = audit(values, { 100000501: en('Provoke') });
  assert.equal(report.rows[0].comparisons[0].learningDefinition.matches, true);
  assert.equal(report.rows[0].comparisons[0].learningDefinition.runtimeVerified, false);
  assert.equal(report.rows[0].comparisons[0].effectsVerified, false);
  assert.equal(report.rows[0].status, 'candidate-not-mechanics-verified');
  assert.equal(JSON.stringify(values), original);
  assert.equal(report.maximumSimulatorLevel, 55);
  assert.equal(report.nativeCount, 211);
});

test('renames are pinned; Weakness is attack Enfeeble, not defense Weaken', () => {
  const report = audit([row(440001001, { charLevel: 0, reqs: [{ branch: 'charm', amount: 8 }], classes: all })], { 440001001: en('Weakness') });
  assert.equal(report.rows[0].comparisons[0].simulatorId, 'skill.21.2');
  assert.equal(report.rows[0].comparisons[0].learningDefinition.matches, true);
  assert.equal(audit([row(440001001)], { 440001001: en('A changed server identity') }).counts.unresolved, 1);
  assert.equal(audit([row(100053001, { charLevel: 35, mana: 35, cooldown: 60, classes: { KNIGHT: 1, GENERAL: 1, PALADIN: 1 } })],
    { 100053001: en('Shieldbearer') }).rows[0].comparisons[0].simulatorId, 'skill.0.10');
});

test('Quick Step active/passive homonyms resolve by type, while Jousting preserves both native class identities', () => {
  const quick = audit([row(260005001, { charLevel: 0, reqs: [{ branch: 'warding', amount: 16 }], classes: all })], { 260005001: en('Quick Step') });
  assert.deepEqual(quick.rows[0].comparisons.map(value => value.simulatorId), ['skill.11.3']);
  const shifty = audit([row(920120001, { skillType: 'PASSIVE', charLevel: 20, classes: { AGENT: 1, ASSASSIN: 1, DISTURBANCE: 1 } })], { 920120001: en('Shifty') });
  assert.equal(shifty.rows[0].comparisons[0].simulatorId, 'skill.6.1');
  const riding = audit([row(520001001, { skillType: 'PASSIVE', charLevel: 45, classes: { DRAGOON: 1, PALADIN: 1 } })], { 520001001: en('Jousting') });
  assert.deepEqual(riding.rows[0].comparisons.map(value => value.simulatorId), ['skill.24.0', 'skill.24.1']);
  assert.equal(riding.rows[0].status, 'multiple-native-identities');
  assert.equal(riding.rows[0].combinedIdentityDefinitionMatches, true);
  assert.equal(riding.counts.definitionDifferences, 0);
});

test('server variants and future levels survive; duration and function arrays are not guessed or collapsed', () => {
  const report = audit([row(230002001, { charLevel: 20 }), row(230002004, { charLevel: 55, funcs: [{ ep: 'EP_CUSTOM', fv1: [9, 8, 7, 6] }] })],
    { 230002001: en('Cloaking'), 230002004: en('Cloaking') });
  assert.deepEqual(report.variantGroups[0].sourceIds, [230002001, 230002004]);
  assert.equal(report.variantGroups[0].distinctDefinitions, 2);
  assert.equal(report.rows[1].current.charLevel, 55);
  assert.deepEqual(report.rows[1].current.funcs[0].fv1, [9, 8, 7, 6]);
  assert.ok(report.retainedNativeWithoutCandidate.some(value => value.prerequisiteCode === 'J=2=50'));
});

test('missing English, type/MP/timing changes and unknown identity remain visible', () => {
  const report = audit([row(1, { skillType: 'PASSIVE', mana: 54, cast: 1, cooldown: 90 }), row(2), row(3, { learnable: false })],
    { 1: en('Provoke'), 2: { n: 'Unknown name' }, 3: en('Provoke') });
  assert.equal(report.rowCount, 2);
  assert.equal(report.counts.typeDifferences, 1);
  assert.equal(report.counts.timingDifferences, 1);
  assert.equal(report.counts.missingEnglish, 1);
  assert.deepEqual(report.rows[0].comparisons[0].timingDifferences.map(value => value.field), ['mana', 'cast', 'cooldown']);
  assert.deepEqual(report.rows[1].comparisons, []);
});
