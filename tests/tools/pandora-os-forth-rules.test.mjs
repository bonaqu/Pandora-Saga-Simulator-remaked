import test from 'node:test';
import assert from 'node:assert/strict';
import { forthToUpgradeRules } from '../../scripts/lib/pandora_os_forth_rules.mjs';

test('full milestone snapshots become deltas, retain intermediate levels, and allow clearing effects', () => {
  const levels = { 2: [{func:'EP_MAXLIFE_CONST',a:20}], 4:[{func:'EP_MAXLIFE_CONST',a:40}], 7:[] };
  const input = JSON.stringify(levels), result = forthToUpgradeRules(levels);
  assert.equal(result.complete, true);
  assert.deepEqual(result.rules.map(rule => [rule.from, rule.value]), [[2,20],[4,20],[7,-40]]);
  for (const [level, expected] of [[0,0],[2,20],[3,20],[4,40],[6,40],[7,0],[10,0]])
    assert.equal(result.rules.filter(rule => level >= rule.from).reduce((sum, rule) => sum + rule.value, 0), expected);
  assert.equal(JSON.stringify(levels), input);
});

test('unknown combat events, zero milestone and excessive rule counts never pass as complete', () => {
  assert.equal(forthToUpgradeRules({ 7: [{func:'EP_ONHIT_SKILL_EXEC',a:1}] }).complete, false);
  assert.equal(forthToUpgradeRules({ 0: [{func:'EP_MAXLIFE_CONST',a:1}] }).complete, false);
  assert.equal(forthToUpgradeRules({ 1: [{func:'EP_MAXLIFE_CONST',a:0.001}] }).complete, false);
  assert.equal(forthToUpgradeRules({ 1: [{func:'EP_MAXLIFE_CONST',a:10001}] }).complete, false);
  assert.equal(forthToUpgradeRules({ 1: [{func:'EP_MAXLIFE_CONST',a:5,dir:'TARGET'}] }).complete, false);
  assert.throws(() => forthToUpgradeRules({ 11: [] }), /milestone/);
  const levels = {}; for (let i=1;i<=10;i++) levels[i] = [{func:'EP_MAXLIFE_CONST',a:i},{func:'EP_MAXMANA_CONST',a:i}];
  assert.equal(forthToUpgradeRules(levels).complete, false);
});

test('fire magic snapshots become percentage-point deltas, distinct from fire aura', () => {
  const result = forthToUpgradeRules({ 7: [{func:'EP_ELEMENT_DAMAGE_SCALE_FIRE',a:1,b:0}],
    8: [{func:'EP_ELEMENT_DAMAGE_SCALE_FIRE',a:2,b:0}] }, {gemElement:'fire'});
  assert.equal(result.complete, true);
  assert.deepEqual(result.rules.map(rule => [rule.stat, rule.unit, rule.value, rule.from]), [[43,'flat',1,7],[43,'flat',1,8]]);
  assert.deepEqual(result.rules.map(rule => rule.gemElement), ['fire','fire']);
  assert.throws(() => forthToUpgradeRules({}, {gemElement:'unknown'}), /options/);
  assert.equal(forthToUpgradeRules({ 7: [{func:'EP_ELEMENT_DAMAGE_SCALE_FIRE',a:1,b:5}] }).complete, false);
});

test('disease and madness snapshots map to their own resistance stats',()=>{
  const result=forthToUpgradeRules({7:[{func:'EP_IMMUNE_DISEASE',a:5,b:0},{func:'EP_IMMUNE_RAVING',a:3,b:0}]});
  assert.equal(result.complete,true);
  assert.deepEqual(result.rules.map(rule=>[rule.stat,rule.value]),[[157,3],[161,5]]);
});
