import test from 'node:test';
import assert from 'node:assert/strict';
import { inspectCandidate, mappedWeaponSourceIds } from '../../scripts/audit_pandora_os_candidate_support.mjs';
import { convertedCurrentEffects } from '../../scripts/lib/current-effect-conversion.mjs';

test('inventory preserves unsupported base and refinement effects and does not claim simulator parity', () => {
  const source = { id: 252, kind: '1H_SWORD', slot: 'weapon', name: 'Меч', level: 40, W: 62, soulslot: 2,
    effects: [{ func: 'EP_IMMUNE_BURN', a: 5 }, { func: 'UNKNOWN_EFFECT', a: 7 }], classes: { WARRIOR: 1 } };
  const candidate = { kind: 'equipment', serverId: 252, category: 0, names: { ru: 'Меч', en: 'Sword' } };
  const forth = { 7: [{ func: 'EP_ONHIT_SKILL_EXEC', a: 500000005, b: 2 }] };
  const before = JSON.stringify(source);
  const result = inspectCandidate(candidate, source, { n: 'Sword', d: 'Source description' }, forth);
  assert.equal(result.validationError, null);
  assert.equal(result.conversionComplete, false);
  assert.equal(result.unsupportedEffects[0].func, 'UNKNOWN_EFFECT');
  assert.deepEqual(result.forth, forth);
  assert.deepEqual(result.enhancementFunctions, ['EP_ONHIT_SKILL_EXEC']);
  assert.equal(result.draftPreview.sockets, 2);
  assert.ok(result.warnings.some(text => text.includes('not simulated')));
  assert.ok(result.warnings.some(text => text.includes('Race and gender')));
  assert.equal(JSON.stringify(source), before);
});

test('current disease and madness resistances extend the historical converter without guessing conditions',()=>{
  const source={effects:[{func:'EP_IMMUNE_RAVING',a:5,b:null,dir:'TARGET'},
    {func:'EP_IMMUNE_DISEASE',a:5,b:0,dir:'SELF'}]};
  assert.deepEqual(convertedCurrentEffects(source,false),{complete:true,effects:[
    {stat:157,unit:'flat',value:5},{stat:161,unit:'flat',value:5}]});
  assert.equal(convertedCurrentEffects({effects:[{func:'EP_IMMUNE_DISEASE',a:5,min:7}]},false).complete,false);
  assert.equal(convertedCurrentEffects({effects:[{func:'EP_IMMUNE_RAVING',a:5,b:1}]},false).complete,false);
  assert.equal(convertedCurrentEffects({effects:[{func:'UNKNOWN',a:5}]},false).complete,false);
});

test('aura damage is a distinct flat modifier and rejects unverified conditions',()=>{
  assert.deepEqual(convertedCurrentEffects({effects:[{func:'EP_AURADAMAGE_CONST',a:2,b:null,dir:'TARGET'}]},false),
    {complete:true,effects:[{stat:33,unit:'flat',value:2}]});
  assert.equal(convertedCurrentEffects({effects:[{func:'EP_AURADAMAGE_CONST',a:2,b:1}]},false).complete,false);
});

test('identity drift fails closed and a body soul preserves slot and representable effects', () => {
  const candidate = { kind: 'soul', serverId: 103023, category: null, names: { en: 'Pumpkin Soul' } };
  const source = { id: 103023, name: 'Тыквенная душа', slots: ['body'], effects: [
    { func: 'EP_SPIRITUAL_CONST', a: 1 }, { func: 'EP_DARK_RESISTANCE_CONST', a: 5 }
  ] };
  const result = inspectCandidate(candidate, source, { n: 'Pumpkin Soul', d: 'Description' }, null);
  assert.equal(result.validationError, null);
  assert.equal(result.conversionComplete, true);
  assert.deepEqual(result.draftPreview.slots, [0, 0, 0, 1, 0, 0, 0, 0]);
  assert.deepEqual(result.draftPreview.effects.map(effect => effect.stat), [4, 144]);
  assert.ok(result.equivalentSoulCandidates.some(row=>row.id==='soul.28'));
  assert.ok(result.warnings.some(text=>text.includes('same effects and slots')));
  assert.throws(() => inspectCandidate({ ...candidate, serverId: 103024 }, source, { n: 'Pumpkin Soul' }, null), /mismatch/);
});

test('weapon identity review finds same category, level and attack even when socket counts differ',()=>{
  const candidate={kind:'equipment',serverId:860,category:3,names:{ru:'Фонарь',en:'Lamp'}};
  const source={id:860,kind:'2H_AXE',slot:'weapon',name:'Фонарь',level:38,W:96,range:150,soulslot:1,effects:[],classes:{WARRIOR:1}};
  const result=inspectCandidate(candidate,source,{n:'Lamp',d:'-'},null);
  const same=result.equivalentWeaponCandidates.find(row=>row.id==='equipment.3.6');
  assert.ok(same);assert.equal(same.level,38);assert.equal(same.sockets,3);
  assert.equal(result.draftPreview.baseRange,150);
  assert.ok(result.warnings.some(text=>text.includes('compare source IDs')));
  assert.ok(!result.equivalentWeaponCandidates.some(row=>row.id==='equipment.3.8'));
  assert.deepEqual(mappedWeaponSourceIds(same.id,[{kind:'equipment',projectId:same.id,serverId:831},
    {kind:'soul',projectId:same.id,serverId:999}]),[831]);
  const invalidRange=inspectCandidate(candidate,{...source,range:0},{n:'Lamp',d:'-'},null);
  assert.equal(invalidRange.draftPreview.baseRange,undefined);
  assert.ok(invalidRange.warnings.some(text=>text.includes('base range')));
});
