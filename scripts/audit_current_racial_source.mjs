// Read-only source reconciliation. This never edits drafts or publishes data.
// Run manually, not as a network-dependent CI test.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import fs from 'node:fs/promises';
import { currentRacialDrafts } from '../admin-api/src/current-racial-data.mjs';

const origin = 'https://pandorasaga-os.com/gamedata/';
const resources = await Promise.all(['skills.json', 'strings.en.json', 'racialPassives.json'].map(async file => {
  const response = await fetch(origin + file, { signal: AbortSignal.timeout(20000) });
  assert.equal(response.status, 200, file);
  const text = await response.text();
  return { file, sha256: createHash('sha256').update(text).digest('hex'), data: JSON.parse(text) };
}));
const [skills, english, races] = resources.map(resource => resource.data);
const keys = ['HUMAN', 'ELF', 'DWARF', 'MYLIN', 'ENKIDU', 'RAPIN'];
const flat = (stat, value) => ({ stat, value, unit: 'flat' });
const percent = (stat, value) => ({ stat, value, unit: 'percent' });
const checks = [];
for (const draft of currentRacialDrafts()) {
  const [, race, passive] = draft.id.split('.').map((value, index) => index ? Number(value) : value);
  const id = 900000000 + (race + 1) * 10000 + passive + 1;
  assert.ok(races[keys[race]].skills.includes(id), `race identity ${id}`);
  const source = skills[id], en = english.skills[id];
  assert.equal(draft.names.en, en.n);
  // The owner explicitly prefers ё; the public source spells this one with е.
  assert.equal(draft.names.ru, id === 900040001 ? 'Охотничье чутьё' : source.name);
  assert.equal(draft.description.ru, source.desc);
  assert.equal(draft.description.en, en.d);
  const expected = [], referenceOnly = [];
  for (const func of source.funcs) {
    const a = func.fv1[3], b = func.fv2[3];
    assert.equal(func.dir, 'TARGET');
    switch (func.ep) {
      case 'EP_SKILL_EQUIP_DAMAGERATE':
        if (a) expected.push(flat(18, a));
        if (b) expected.push(percent(18, b));
        break;
      case 'EP_IMMUNE_VIT_TYPE': expected.push(flat(146, a)); break;
      case 'EP_MASTERY_POTION': expected.push(flat(8, a)); break;
      case 'EP_RACE_MANA_COSTCUT': expected.push(flat(76, -a)); break;
      case 'EP_CHARM_RESISTANCE_CONST': expected.push(flat(142, a)); break;
      case 'EP_IMMUNE_TUMBLE': expected.push(flat(151, a)); break;
      case 'EP_IMMUNE_STUN': expected.push(flat(149, a)); break;
      case 'EP_IMMUNE_NUMB': expected.push(flat(150, a)); break;
      case 'EP_CRITICAL_REGIST':
        if (a) expected.push(flat(70, -a));
        if (b) expected.push(flat(72, -b));
        break;
      case 'EP_CRITICALRATE_CONST': expected.push(flat(69, a)); break;
      case 'EP_TOHIT_SCALE': expected.push(percent(62, a)); break;
      case 'EP_AVOIDANCE_SCALE': expected.push(percent(65, a)); break;
      case 'EP_ONDAMAGE_FIN_DAMAGE_SCALE': expected.push(percent(52, a)); break;
      case 'EP_ONHIT_CRITICAL_DAMAGERATE': expected.push(flat(71, a)); break;
      case 'EP_ONDAMAGE_ELEM_SCALE': expected.push(flat(60, a)); break;
      case 'EP_HEAL_TIME_SCALE': expected.push(flat(10, a)); break;
      case 'EP_RACE_RANGE': case 'EP_RACE_CARRY': case 'EP_RACE_TOUGH_HEART':
        referenceOnly.push({ ep: func.ep, value: a }); break;
      default: throw new Error(`Unmapped source function ${id}: ${func.ep}`);
    }
  }
  const order = effects => [...effects].sort((a, b) => a.stat - b.stat || a.unit.localeCompare(b.unit));
  assert.deepEqual(order(draft.effects), order(expected), `numeric effects ${id}`);
  checks.push({ id, simulatorId: draft.id, namesAndDescriptions: 'exact', effects: expected, referenceOnly });
}
const report = { checkedAt: new Date().toISOString(), records: checks.length,
  sourceHashes: resources.map(({ file, sha256 }) => ({ url: origin + file, sha256 })),
  spellingException: 'Acute Senses RU: owner-approved ё instead of public е', checks };
if (process.argv[2]) await fs.writeFile(process.argv[2], JSON.stringify(report, null, 2) + '\n');
console.log(`Verified ${checks.length} current racial records: exact RU/EN text and native effect values; source-only combat/range fields are reported, not invented.`);
