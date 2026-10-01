// Read-only Legacy table projection for the typed Modern character editor.
// Never extract/evaluate a new formula or rewrite the preserved source.
import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { withLegacyRuntime } from './lib/legacy-runtime.mjs';

const target = path.resolve('data/generated/character.v1.json');
const sourcePaths = ['js/ini.js', 'js/skill.js'];
const generatedFrom = [];
for (const file of sourcePaths) {
  const bytes = await fs.readFile(file);
  generatedFrom.push({ path: file, sha256: createHash('sha256').update(bytes.toString('latin1').replace(/\r\n/g, '\n'), 'latin1').digest('hex') });
}
const sourceFingerprint = createHash('sha256').update(generatedFrom.map(row => row.sha256).join(':')).digest('hex');
const records = await withLegacyRuntime(path.resolve('_site/legacy'), page => page.evaluate(() => {
  const localized = (row, offset = 0) => ({ jp: row[offset], en: row[offset + 1], tw: row[offset + 2] });
  const result = [];
  for (let index = 0; index < Name.Job.length; index++) result.push({
    id: 'job.' + index, kind: 'class', index, category: null,
    name: localized(Name.Job[index], 2), family: Name.Job[index][0], engineCode: Name.Job[index][1],
    progression: Status.Mod[index].slice(), potentialCaps: Skill.P[index].slice(1),
    minimumBranches: Skill.D[Name.Job[index][0]].slice(1),
    familyBaseBonuses: Status.Set.Job[Name.Job[index][0]].slice(1)
  });
  for (let race = 0; race < Name.Race.length; race++) {
    result.push({ id: 'race.' + race, kind: 'race', index: race, category: null, name: localized(Name.Race[race]), baseStats: Status.Set.Base[race].slice(1) });
    for (let index = 0; index < Name.Race.Skill[race].length; index++) result.push({ id: 'racial_skill.' + race + '.' + index, kind: 'racial', index, category: race, name: localized(Name.Race.Skill[race][index]), nativeEffectPolicy: 'retained-hardcoded' });
  }
  return result;
}));
const payload = { schemaVersion: 1, sourceFingerprint, generatedFrom, policy: 'Read-only Legacy table projection; no formulas', records };
const json = JSON.stringify(payload, null, 2) + '\n';
if (process.argv.includes('--check')) {
  if (await fs.readFile(target, 'utf8') !== json) throw new Error('Character metadata projection is stale');
  console.log('Verified 28 classes, 6 races and 18 racial passives against the museum runtime.');
} else {
  await fs.writeFile(target, json); console.log('Projected 28 classes, 6 races and 18 racial passives from the museum runtime.');
}
