import test from 'node:test';
import assert from 'node:assert/strict';
import { auditGuild, GROUPS } from '../../scripts/audit_pandora_os_guild_effects.mjs';

function fixture() {
  const skills = {}, labels = { skills: Array.from({length: 11}, (_, i) => ({ nameRu: 'Раздел ' + i, sourceNameEn: 'Group ' + i, levels: [{ ru: 'текст', en: 'text' }] })) };
  for (const group of GROUPS) for (let id=group.first; id<=group.last; id++) {
    const target = 610000000 + id - 600000000;
    skills[id] = { id, name: 'Тест', learnable: false, funcs: [{ ep: group.effect, fv1: [0,0,0, group.effect === 'EP_SKILL_EXEC' ? target : 2], fv2: [0,0,0,0] }] };
    if (group.effect === 'EP_SKILL_EXEC') skills[target] = { id: target, funcs: [{ ep: 'TEST_EFFECT', fv1: [0,0,0,2] }] };
  }
  return { skills, english: { skills: {} }, labels, calcText: "$('SelBuffClan_1').selectedIndex", initText: '', vitalsText: '', buildText: '' };
}
test('inventories non-learnable levels, linked effect IDs and evidence without deriving formulas', () => {
  const input = fixture(), original = JSON.stringify(input);
  const result = auditGuild(input), first = result.groups[0], active = result.groups.find(group => group.selector === 8);
  assert.equal(first.records.length, 6); assert.deepEqual(first.sourceOnlyLevels, [2,3,4,5,6]);
  assert.equal(first.records[0].learnable, false); assert.deepEqual(first.records[0].functions[0].fv1, [0,0,0,2]);
  assert.equal(first.calculationEvidence.length, 1);
  assert.equal(active.records[0].linkedEffects[0].id, 610000211);
  assert.equal(JSON.stringify(input), original);
});
test('missing expected source identity or effect fails closed', () => {
  const input = fixture(); delete input.skills[600000001];
  assert.throws(() => auditGuild(input), /Guild source changed/);
  const other = fixture(); delete other.skills[610000211];
  assert.throws(() => auditGuild(other), /Missing linked guild source skill/);
});
