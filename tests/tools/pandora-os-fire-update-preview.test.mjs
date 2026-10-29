import test from 'node:test';
import assert from 'node:assert/strict';
import { baselineById } from '../../admin-api/src/catalog-baseline.mjs';
import { previewCandidate, checkPublicPair, previewFireProcs } from '../../scripts/audit_pandora_os_fire_update_preview.mjs';

const candidate = { kind: 'equipment', serverId: 2652, category: 12, names: { en: 'Spark Wand', ru: 'Огненный жезл искр' },
  forth: Object.fromEntries([7,8,9,10].map(level=>[level,[{func:'EP_FIRE_RESISTANCE_CONST',a:(level-6)*4,b:0}]])), source: {
  itemKind: 'WAND', level: 40, sockets: 2, W: 36, range: 120,
  descriptionEn: 'When enhanced with a Fire Gem, starting at +7, per enhancement level:<br>SPI +1<br>Fire magic resistance +4',
  descriptionRu: 'Закалка самоцветом огня, начиная с +7 и за каждый уровень:<br>СД +1<br>Сопротивляемость магии огня +4',
  effects: [{func:'EP_INTELIGENCE_CONST',a:4},{func:'EP_SPIRITUAL_CONST',a:3},{func:'EP_IMMUNE_BURN',a:5},{func:'EP_VITARITY_CONST',a:2}],
  classes: { WARRIOR: 1 }
} };

test('synthetic replacement preserves retained identity, sex/race, JP and acquisition without stacking old stat tokens', () => {
  const source = baselineById.get('equipment.12.12'), initial = JSON.stringify(source), input = JSON.stringify(candidate);
  const result = previewCandidate(candidate, source);
  assert.equal(result.identity.id, 'equipment.12.12');
  assert.equal(result.syntheticCandidate.engineId, 120012);
  assert.equal(result.syntheticCandidate.baseRange, 120);
  assert.equal(result.syntheticCandidate.engineKey, source.name.jp);
  assert.deepEqual(result.syntheticCandidate.compatibility.slice(0,8), source.compatibility_flags.slice(0,8));
  assert.equal(result.syntheticCandidate.names.jp, result.oldRecord.names.jp);
  assert.deepEqual(result.syntheticCandidate.acquisition, result.oldRecord.acquisition);
  assert.match(result.oldRecord.calculationCode, /0=1/);
  assert.doesNotMatch(result.syntheticCandidate.calculationCode, /(?:^|_)0=1(?:_|$)/);
  assert.match(result.syntheticCandidate.calculationCode, /(?:^|_)0=2(?:_|$)/);
  assert.deepEqual(result.syntheticCandidate.upgradeBonuses,
    [{stat:4,unit:'flat',value:1,from:7,every:1,to:10,gemElement:'fire'},
     {stat:138,unit:'flat',value:4,from:7,every:1,to:10,gemElement:'fire'}]);
  assert.equal(result.syntheticCandidate.nativeUpgradePolicy,'replace-legacy-fire-wand');
  assert.doesNotMatch(result.syntheticCandidate.calculationCode, /(?:^|_)5=8(?:_|$)/);
  assert.ok(result.notes.some(line => line.includes('private drafts') || line.includes('Private drafts')));
  assert.equal(JSON.stringify(source), initial); assert.equal(JSON.stringify(candidate), input);
});

test('Phoenix preview requires matching RU/EN conditions, attributes and numbers',()=>{
  const descriptionRu='Закалка самоцветом огня, начиная с +7 и за каждый уровень:<br>+2% шанс наложить Ожог<br>+5% шанс призвать Пламя феникса<br>Пламя феникса: 25 урона + 25% от СИЛ, не чаще 1 раза в 5 секунд.<br>Каждое следующее улучшение +25 и 25% от СИЛ и сокращает откат на 1 секунду.';
  const descriptionEn='When enhanced with a Fire Gem, starting at +7, per enhancement level:<br>+2% chance to inflict Burn<br>+5% chance to summon Phoenix Flame<br>Phoenix Flame: 25 damage + 25% of STR, at most 1 activation every 5 seconds.<br>Each further enhancement adds +25 damage and 25% of STR and reduces the cooldown by 1 second.';
  const rules=previewFireProcs({descriptionRu,descriptionEn});
  assert.equal(rules.length,2);assert.equal(rules[0].kind,'burn');assert.equal(rules[1].damageStat,'STR');
  assert.equal(rules[1].chanceStep,5);assert.equal(rules[1].statPercentStep,25);
  assert.throws(()=>previewFireProcs({descriptionRu,descriptionEn:descriptionEn.replace('5% chance to summon','3% chance to summon')}),/disagree/);
  assert.throws(()=>previewFireProcs({descriptionRu,descriptionEn:descriptionEn.replace(/STR/g,'INT')}),/formula/);
  assert.throws(()=>previewFireProcs({descriptionRu,descriptionEn:descriptionEn.replace('Fire Gem','Ice Gem')}),/condition/);
  assert.deepEqual(previewFireProcs({descriptionRu:'без особых эффектов',descriptionEn:'no special effects'}),[]);
});
test('unknown class and unsupported effect cannot be silently converted into a synthetic update', () => {
  const source = baselineById.get('equipment.12.12');
  assert.throws(() => previewCandidate({...candidate, source:{...candidate.source,classes:{UNKNOWN:1}}},source),/Unknown class/);
  assert.throws(() => previewCandidate({...candidate, source:{...candidate.source,effects:[{func:'UNKNOWN',a:1}]}},source),/Unmapped effect/);
  assert.throws(() => previewCandidate({...candidate, source:{...candidate.source,descriptionRu:candidate.source.descriptionRu.replace('СД +1','СД +2')}},source),/changed/);
  assert.throws(() => previewCandidate({...candidate,forth:{}},source),/snapshots changed/);
});
test('public evidence refuses already published or separately mapped targets', () => {
  const report = { matched: [], catalogOnly: [{ id:'equipment.12.12',source:'baseline' }], missing: [{kind:'equipment',serverId:2652}] };
  assert.doesNotThrow(() => checkPublicPair(report,2652,'equipment.12.12'));
  assert.throws(() => checkPublicPair({...report,catalogOnly:[{id:'equipment.12.12',source:'published'}]},2652,'equipment.12.12'),/conflicts/);
  assert.throws(() => checkPublicPair({...report,matched:[{projectId:'equipment.12.12'}]},2652,'equipment.12.12'),/conflicts/);
});
