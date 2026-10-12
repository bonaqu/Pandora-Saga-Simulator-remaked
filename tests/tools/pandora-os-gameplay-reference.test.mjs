import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {
  compareCompleteGameplayRegistry,compareClassCoefficients,
  auditSkillSources,auditCurrentGameReference,getCurrentGameReference
} from '../../scripts/audit_pandora_os_gameplay_reference.mjs';
const load=path=>JSON.parse(readFileSync(new URL('../../'+path,import.meta.url),'utf8'));
const originals={
  classes:load('tests/fixtures/pandora-os-classes-20261011.json'),
  items:load('admin-api/data/pandora-os-live-items-20261007.json'),
  souls:load('admin-api/data/pandora-os-live-souls-20261007.json')
};
const base=()=>structuredClone(originals);
const fresh=()=>{
  const r=base();
  r.skills={
    '100':{id:100,name:'Правильный навык',desc:'Описание',learnable:true,classes:{WARRIOR:1},funcs:[{ep:'EP_MAXLIFE_CONST',fv1:[0,0,0,250]}]},
    '121703511':{id:121703511,name:'Четверной укол',desc:null,learnable:false,classes:{}},
    '620002071':{id:620002071,name:'Баллиста',desc:'Использовать баллисту',learnable:false,classes:{WARRIOR:1}}
  };
  r.racialPassives={HUMAN:{skills:[100]}};
  r['strings.en']={locale:'en',skills:{100:{n:'True Skill',d:'Description'}}};
  r['strings.ru']={locale:'ru',skills:{}};
  return r;
};
test('all 1033 items and 111 souls: exact gameplay fields match themselves even with different insertion order',()=>{
  for(const [name,source] of [['items',originals.items],['souls',originals.souls]]){
    const reinserted=Object.fromEntries(Object.entries(source).reverse());
    const report=compareCompleteGameplayRegistry(reinserted,source,name);
    assert.equal(report.summary.matchesDatedSource,true);
    assert.equal(report.summary.changed,0);
    assert.equal(report.summary.added,0);
  }
});
test('gameplay effects, item class eligibility, weapon range and socket counts are reported as drift',()=>{
  const newer=base();
  const sample=newer.items['1'];
  sample.W+=5;sample.range+=10;sample.soulslot+=1;
  sample.effects[0].a+=1;sample.classes.WARRIOR=0;
  const report=compareCompleteGameplayRegistry(newer.items,originals.items,'items');
  assert.equal(report.summary.changed,1);
  assert.deepEqual(report.examples.changed[0].fields,['W','classes','effects','range','soulslot']);
});
test('Russian/English names, descriptions, icons and object key ordering do not masquerade as mechanics drift',()=>{
  const newer=base();
  newer.souls['101000'].name='Иное имя';newer.souls['101000'].desc='Новый перевод';
  newer.souls['101000'].icon='I_REPLACED';
  newer.souls['101000'].effects[0]=Object.fromEntries(
    Object.entries(newer.souls['101000'].effects[0]).reverse());
  const result=compareCompleteGameplayRegistry(newer.souls,originals.souls,'souls');
  assert.equal(result.summary.changed,0);
  newer.souls['101000'].effects[0].a+=3;
  assert.equal(compareCompleteGameplayRegistry(newer.souls,originals.souls,'souls').summary.changed,1);
});
test('new, missing and malformed source IDs are never silently collapsed',()=>{
  const newer=base();
  delete newer.souls['101000'];
  newer.souls['999999999']={id:999999999,slots:['weapon'],effects:[]};
  const result=compareCompleteGameplayRegistry(newer.souls,originals.souls,'souls');
  assert.equal(result.summary.added,1);
  assert.equal(result.summary.removed,1);
  assert.throws(()=>compareCompleteGameplayRegistry(
    {'100':{id:101}},originals.souls,'souls'),/Bad source identity/);
});
test('all 28 class base HP/MP references are checked independently of archive Legacy',()=>{
  const newer=base();
  assert.equal(compareClassCoefficients(newer.classes,originals.classes).changed,0);
  newer.classes.WARRIOR.hp.vit+=0.1;
  newer.classes.CLERIC.mp.base+=10;
  const result=compareClassCoefficients(newer.classes,originals.classes);
  assert.equal(result.classes,28);
  assert.equal(result.changed,2);
  assert.deepEqual(result.examples.map(row=>row.coefficient),['hp.vit','mp.base']);
});
test('safely excludes siege actions and nonlearnable quadruple internal ID, without losing real character skills',()=>{
  const report=auditCurrentGameReference(fresh(),base());
  assert.equal(report.hasSourceDrift,false);
  assert.equal(report.skills.learnableClassSkills,1);
  assert.deepEqual(report.skills.excludedSiegeAndZoneIds,[620002071]);
  assert.equal(report.skills.quadrupleStabInternalVariant,true);
  assert.deepEqual(report.skills.racialReferences,{HUMAN:1});
  const altered=fresh();
  altered.skills['620002071'].learnable=true;
  assert.throws(()=>auditCurrentGameReference(altered,base()),/unexpectedly learnable/);
});
test('new scanner never treats an inaccessible current server as an unchanged dated snapshot',async()=>{
  await assert.rejects(()=>getCurrentGameReference({
    fetchReference:async()=>({ok:false,status:503})
  }),/Current server not accessible/);
  const broken=fresh();
  broken['strings.en'].locale='ru';
  assert.throws(()=>auditCurrentGameReference(broken,base()),/Wrong language/);
});
