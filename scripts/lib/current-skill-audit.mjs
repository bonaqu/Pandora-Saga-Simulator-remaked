// Reference reconciliation only: no draft creation, publication or formula import.
export const CLASS_IDS = Object.freeze([
  'WARRIOR', 'GLADIATOR', 'JUGGERNAUT', 'DRAGOON', 'KNIGHT', 'GENERAL', 'PALADIN',
  'SCOUT', 'ARCHER', 'SNIPER', 'PREDATOR', 'AGENT', 'ASSASSIN', 'DISTURBANCE',
  'ACOLYTE', 'PRIEST', 'CLERIC', 'ENCHANTER', 'ASCETIC', 'MONK', 'EXORCIST',
  'MAGE', 'WIZARD', 'WARLOCK', 'CONJURER', 'DARKROAR', 'JESTER', 'CALAMITY'
]);
const BRANCH_IDS = ['martial', 'slash', 'thrust', 'brush', 'blow', 'defense', null,
  'archery', 'alchemy', 'assassin', 'trap', 'warding', null, 'benevolence',
  'blessing', 'exorcism', 'hymn', null, 'element', 'embody', 'darkness', 'charm',
  null, null, 'riding'];
const NATIVE_PARENT_INDEX = [null, 0, 1, 1, 0, 4, 4, null, 7, 8, 8, 7, 11, 11,
  null, 14, 15, 15, 14, 18, 18, null, 21, 22, 22, 21, 25, 25];
const NATIVE_ENGINE_CODES = ['Wa', 'W2g', 'W3j', 'W3d', 'W2k', 'W3g', 'W3p',
  'Sc', 'S2a', 'S3s', 'S3p', 'S2g', 'S3a', 'S3d', 'Ac', 'A2p', 'A3c',
  'A3e', 'A2a', 'A3m', 'A3x', 'Ma', 'M2w', 'M3w', 'M3c', 'M2d', 'M3j', 'M3l'];
// Reviewed identity candidates, not approval of their current mechanics.
// Pin both names so a later server rename cannot silently retarget an alias.
const ALIASES = {
  100053001: ['Shieldbearer', 'Phalanx', 'skill.0.10'],
  100091001: ['Brewer', 'Recovery Effects increased', 'skill.0.1'],
  220006001: ['Confound', 'Befuddle', 'skill.8.4'],
  230001001: ['Hiding', 'Hide', 'skill.9.0'],
  230002001: ['Cloaking', 'Cloak', 'skill.9.1'],
  230002004: ['Cloaking', 'Cloak', 'skill.9.1'],
  230002005: ['Cloaking', 'Cloak', 'skill.9.1'],
  330101001: ['Devotion', 'Devotions', 'skill.15.12'],
  410015001: ['Resist Ice', 'Resist Cold', 'skill.18.9'],
  420001001: ['Soul Bright', 'Soul Blight', 'skill.19.4'],
  420001002: ['Soul Bright', 'Soul Blight', 'skill.19.4'],
  440001001: ['Weakness', 'Enfeeble', 'skill.21.2'],
  520000001: ['Summon Mount', 'Summon Vehicle', 'skill.24.4'],
  920120001: ['Shifty', 'Quick Step', 'skill.6.1']
};
const normalized = value => String(value || '').normalize('NFKC').toLowerCase().replace(/[^\p{L}\p{N}]/gu, '');
const sorted = values => [...values].sort();
const equal = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const orderedRequirements = rows => [...rows].sort((a, b) => a.branch.localeCompare(b.branch) || a.amount - b.amount);

function lineage(key, classes) {
  const result = [];
  while (key != null) {
    if (!classes[key] || result.includes(key)) throw new Error('Unknown/cyclic reference class: ' + key);
    result.push(key); key = classes[key].parent;
  }
  return result;
}

export function nativeLearningDefinition(code, classes) {
  // This describes the code, not the stateful SkillList parser's runtime result.
  const gates = String(code).split('_').map(value => value.split('='));
  if (!gates.length || gates.length > 2 || gates.some(([type, id, amount, extra]) =>
    extra !== undefined || !['J', 'S'].includes(type) || !/^\d+$/.test(id || '') || !/^\d+$/.test(amount || '')))
    return { supported: false, code };
  const jobs = gates.filter(gate => gate[0] === 'J');
  if (jobs.length > 1 || (jobs.length && gates[0][0] !== 'J')) return { supported: false, code };
  const branches = gates.filter(gate => gate[0] === 'S').map(([, id, amount]) => ({ branch: BRANCH_IDS[Number(id)], amount: Number(amount) }));
  if (branches.some(row => !row.branch) || (jobs.length && !CLASS_IDS[Number(jobs[0][1])])) return { supported: false, code };
  const job = jobs[0], target = job && CLASS_IDS[Number(job[1])];
  const classKeys = !job ? CLASS_IDS : gates.length === 1
    ? CLASS_IDS.filter(key => lineage(key, classes).includes(target)) : [target];
  return { supported: true, classes: sorted(classKeys), level: job ? Number(job[2]) : 0,
    branches: orderedRequirements(branches), classScope: !job ? 'all' : gates.length === 1 ? 'descendants' : 'exact' };
}

function compare(source, native, classes) {
  const definition = nativeLearningDefinition(native.prerequisite_code, classes);
  const current = { classes: sorted(Object.keys(source.classes).filter(key => source.classes[key])),
    level: source.charLevel || 0, branches: orderedRequirements(source.reqs || []) };
  const timings = ['mana', 'cast', 'cooldown'].map((key, i) => ({ field: key,
    native: [native.mp_cost, native.cast_seconds, native.cooldown_seconds][i], current: source[key] }));
  return { simulatorId: native.id, nativeName: native.name.en,
    typeMatches: native.is_active === (source.skillType !== 'PASSIVE'),
    learningDefinition: { native: definition, current,
      matches: definition.supported && equal(definition.classes, current.classes) && definition.level === current.level && equal(definition.branches, current.branches),
      runtimeVerified: false },
    timingDifferences: timings.filter(row => row.native !== row.current),
    nativeDuration: native.duration_seconds,
    durationPolicy: 'Not inferred from arbitrary fv arrays or cast motion',
    effectsVerified: false };
}

export function auditCurrentSkills({ skills, english, classes }, nativeSkills, nativeClasses) {
  if (CLASS_IDS.length !== Object.keys(classes).length || CLASS_IDS.some(key => !classes[key]))
    throw new Error('Reference class set differs from the retained 28 identities');
  const classChecks = CLASS_IDS.map((key, index) => {
    const native = nativeClasses.find(row => row.id === 'job.' + index);
    const chain = lineage(key, classes), root = CLASS_IDS.indexOf(chain.at(-1));
    const parentIndex = NATIVE_PARENT_INDEX[index];
    const expectedParent = parentIndex == null ? null : CLASS_IDS[parentIndex];
    if (!native || native.index !== index || native.family !== Math.floor(root / 7) ||
      native.engineCode !== NATIVE_ENGINE_CODES[index] || classes[key].parent !== expectedParent)
      throw new Error('Class ancestry/engine identity mismatch: ' + key);
    return { sourceId: key, simulatorId: native.id, parent: classes[key].parent,
      nativeName: native.name.en, ru: classes[key].name, en: english.classes?.[key]?.n || null,
      identityPolicy: 'fixed native index and verified source family ancestry; not HP/MP formula parity' };
  });
  const rows = Object.values(skills).filter(row => row.learnable && Object.keys(row.classes || {}).some(key => row.classes[key]))
    .sort((a, b) => a.id - b.id).map(source => {
      if (Object.keys(source.classes).some(key => !classes[key])) throw new Error('Unknown skill class: ' + source.id);
      const en = english.skills?.[source.id], alias = ALIASES[source.id];
      let candidates = nativeSkills.filter(row => normalized(row.name.en) === normalized(en?.n));
      let basis = 'normalized EN name candidate';
      if (alias) {
        candidates = nativeSkills.filter(row => row.id === alias[2] && row.name.en === alias[1] && en?.n === alias[0]);
        basis = 'reviewed rename candidate, pinned source/native names';
      }
      // Quick Step is both a passive and an active native name: retain only the
      // compatible type, but never make this a mechanics-verified match.
      const typeCandidates = candidates.filter(row => row.is_active === (source.skillType !== 'PASSIVE'));
      if (typeCandidates.length) candidates = typeCandidates;
      const comparisons = candidates.map(row => compare(source, row, classes));
      const definitions = comparisons.map(row => row.learningDefinition.native);
      const current = comparisons[0]?.learningDefinition.current;
      const combinedIdentityDefinitionMatches = definitions.length > 1 && definitions.every(value => value.supported &&
        value.level === current.level && equal(value.branches, current.branches)) &&
        equal(sorted(new Set(definitions.flatMap(value => value.classes))), current.classes);
      return { sourceId: source.id, text: { ru: { name: source.name, description: source.desc },
        en: { name: en?.n || null, description: en?.d ?? null } },
        status: !en?.n || en.d == null ? 'missing-EN-reference' : comparisons.length === 0 ? 'unresolved-identity'
          : comparisons.length > 1 ? 'multiple-native-identities' : 'candidate-not-mechanics-verified',
        candidateBasis: basis, comparisons, combinedIdentityDefinitionMatches,
        current: { skillType: source.skillType, branch: source.branch, charLevel: source.charLevel,
          reqLevel: source.reqLevel, reqs: source.reqs, prereq: source.prereq, mana: source.mana,
          cast: source.cast, cooldown: source.cooldown, funcs: source.funcs, damage: source.damage,
          weaponUse: source.weaponUse, range: source.range, motion: source.motion },
        mechanicsPolicy: 'Reference only; no effects or learning changes are auto-approved' };
    });
  const groups = new Map();
  for (const row of rows) for (const candidate of row.comparisons) {
    if (!groups.has(candidate.simulatorId)) groups.set(candidate.simulatorId, []);
    groups.get(candidate.simulatorId).push(row);
  }
  const variantGroups = [...groups].filter(([, variants]) => variants.length > 1).map(([simulatorId, variants]) => ({
    simulatorId, sourceIds: variants.map(row => row.sourceId),
    distinctDefinitions: new Set(variants.map(row => JSON.stringify({ text: row.text, current: row.current }))).size,
    policy: 'Do not collapse differing source variants into one published record' }));
  const matched = new Set(groups.keys());
  return { policy: 'Read-only audit; candidates and matching definitions are not runtime/mechanics acceptance',
    maximumSimulatorLevel: 55, currentServerCapIsNotAFilter: true, nativeCount: nativeSkills.length,
    classChecks, rowCount: rows.length, rows, variantGroups,
    retainedNativeWithoutCandidate: nativeSkills.filter(row => !matched.has(row.id)).map(row => ({
      id: row.id, name: row.name.en, prerequisiteCode: row.prerequisite_code, policy: 'Retain, never delete for absence on current server' })),
    counts: { unresolved: rows.filter(row => row.status === 'unresolved-identity').length,
      multiple: rows.filter(row => row.comparisons.length > 1).length,
      missingEnglish: rows.filter(row => row.status === 'missing-EN-reference').length,
      definitionDifferences: rows.filter(row => !row.combinedIdentityDefinitionMatches && row.comparisons.some(candidate => candidate.learningDefinition.native.supported && !candidate.learningDefinition.matches)).length,
      unsupportedNativeDefinitions: rows.filter(row => row.comparisons.some(candidate => !candidate.learningDefinition.native.supported)).length,
      timingDifferences: rows.filter(row => row.comparisons.some(candidate => candidate.timingDifferences.length)).length,
      typeDifferences: rows.filter(row => row.comparisons.some(candidate => !candidate.typeMatches)).length,
      variantGroups: variantGroups.length } };
}
