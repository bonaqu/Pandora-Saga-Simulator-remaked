import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {auditBilingual,readRegistry,VERIFIED_POTION_SLOTS,NON_CHARACTER_SKILL_IDS,RETAINED_QUADRUPLE_STAB,playerCharacterSkill} from '../../scripts/audit_pandora_os_bilingual_current.mjs';
import skillsCatalog from '../../data/generated/skills.v1.json' with {type:'json'};
import approved from '../../localization/approved-translations.v1.json' with {type:'json'};

const itemsAll=JSON.parse(readFileSync(new URL('../../admin-api/data/pandora-os-live-items-20261007.json',import.meta.url),'utf8'));
const soulsAll=JSON.parse(readFileSync(new URL('../../admin-api/data/pandora-os-live-souls-20261007.json',import.meta.url),'utf8'));
const englishAll=JSON.parse(readFileSync(new URL('../../admin-api/data/pandora-os-live-strings-en-20261007.json',import.meta.url),'utf8'));
const ids=VERIFIED_POTION_SLOTS.map(row=>String(row[1]));
const make=()=>{
  const items=Object.fromEntries(ids.map(id=>[id,structuredClone(itemsAll[id])]));
  const englishItems=Object.fromEntries(ids.map(id=>[id,englishAll.items[id]]));
  return {
    'items.json':items,
    'souls.json':{'103018':structuredClone(soulsAll['103018'])},
    'skills.json':{'100091001':{id:100091001,name:'Улучшение лечения',desc:'Повышает эффективность зелий',learnable:true,classes:{WARRIOR:1}},
      '121703511':{id:121703511,name:'Четверной укол',desc:null,learnable:false,classes:{}},
      ...Object.fromEntries(NON_CHARACTER_SKILL_IDS.map(id=>[String(id),{id,name:'Служебное действие',desc:'Не умение персонажа',learnable:false,classes:{}}]))},
    'strings.en.json':{locale:'en',items:englishItems,
      souls:{'103018':{n:'Potion Soul',d:'Improves potion effectiveness'}},
      skills:{'100091001':{n:'Brewer',d:'Potion recovery effectiveness'}}},
    'strings.ru.json':{locale:'ru',items:{},souls:{},skills:{}}
  };
};

test('empty RU translation file does not discard native Russian client item, Soul and skill text',()=>{
  const report=auditBilingual(make());
  assert.equal(report.localeSections.ru.items,0);
  assert.equal(report.localeSections.ru.skills,0);
  assert.equal(report.summary.items.effectiveRussianNames,10);
  assert.equal(report.summary.items.effectiveEnglishNames,10);
  assert.equal(report.summary.items.effectiveRussianDescriptions,10);
  assert.equal(report.summary.items.effectiveEnglishDescriptions,10);
  assert.equal(report.summary.skills.effectiveRussianDescriptions,6);
  assert.equal(report.summary.skills.effectiveRussianNames,7);
  assert.equal(report.characterSkillCoverage.learnablePlayerRecords,1);
  assert.equal(report.characterSkillCoverage.enNames,1);
  assert.equal(report.characterSkillCoverage.ruNames,1);
  assert.deepEqual(report.characterSkillCoverage.excludedTechnicalIds,NON_CHARACTER_SKILL_IDS);
  assert.equal(report.characterSkillCoverage.internalNonLearnableQuadrupleVariant,true);
  assert.equal(report.summary.souls.effectiveRussianNames,1);
  assert.equal(report.verifiedPotions.length,10);
  assert.equal(report.independentlyVerifiedFullGameParity,false);
  assert.deepEqual(report.notConfirmedLegacyPotionRows,[4,7,12,13]);
});
test('15 percent potion and Hepatica 20 HP independently pinned to current source',()=>{
  const report=auditBilingual(make());
  const potion=report.verifiedPotions.find(x=>x.slot===11);
  assert.deepEqual([potion.id,potion.func,potion.base,potion.name,potion.englishName],
    [50004,'EP_HEAL_LIFE_RATE',15,'Сильное исцеляющее зелье','Restoration Potion']);
  const hepatica=report.verifiedPotions.find(x=>x.slot===6);
  assert.deepEqual([hepatica.id,hepatica.func,hepatica.base,hepatica.name,hepatica.englishName],
    [50023,'EP_HEAL_LIFE',20,'Подснежник','Hepatica']);
  const native=readFileSync(new URL('../../modern/calculator-controls.js',import.meta.url),'utf8');
  assert.match(native,/potionFixedRecovery=\[20,60,120,180,450,145,20,25,200,150\]/);
  assert.ok(native.includes("[50023,'Подснежник','Hepatica']"));
});
test('missing English entries reported, never inferred or invented from Russian names',()=>{
  const snapshot=make();
  delete snapshot['strings.en.json'].items['50023'];
  assert.throws(()=>auditBilingual(snapshot),/Current bilingual potion identity\/healing drift: 6\/50023/);
  delete snapshot['items.json']['50023'];
  assert.throws(()=>auditBilingual(snapshot),/Current bilingual potion identity\/healing drift/);
});
test('numerical gameplay drift cannot be mistaken for a language-only change',()=>{
  const snap=make();snap['items.json']['50004'].effects[0].a=18;
  assert.throws(()=>auditBilingual(snap),/Current bilingual potion identity\/healing drift: 11\/50004/);
});
test('no stale snapshot silently replaces network failures',async()=>{
  await assert.rejects(()=>readRegistry({fetchReference:async()=>({ok:false,status:403})}),/no dated fallback.*items.json HTTP 403/);
  const snap=make();snap['strings.en.json'].locale='ru';
  assert.throws(()=>auditBilingual(snap),/Unexpected language registry identity/);
});

test('the five siege/zone actions are never learnable character skills, even if their classes are nonempty',()=>{
  const snap=make();
  for(const id of NON_CHARACTER_SKILL_IDS){
    const native=snap['skills.json'][String(id)];
    native.classes={WARRIOR:1};
    assert.equal(playerCharacterSkill(native),false,'technical '+id);
  }
  const report=auditBilingual(snap);
  assert.equal(report.characterSkillCoverage.learnablePlayerRecords,1);
  assert.deepEqual(report.characterSkillCoverage.excludedTechnicalIds,NON_CHARACTER_SKILL_IDS);
  const source=skillsCatalog.records;
  for(const id of NON_CHARACTER_SKILL_IDS){
    assert.equal(source.some(row=>row.sourceId===id||row.sourceServerId===id||
      row.serverId===id||row.engineId===id||row.id===String(id)),false,
      'not in native character-skill source '+id);
  }
});
test('do not silently exclude an action if game server changes it into a learnable skill',()=>{
  const snap=make();
  snap['skills.json']['620002071'].learnable=true;
  assert.throws(()=>auditBilingual(snap),/Technical skill unexpectedly became learnable: 620002071/);
});
test('real Quadruple Stab is retained as native skill.2.6 with both languages and combo description',()=>{
  assert.equal(RETAINED_QUADRUPLE_STAB.simulatorId,'skill_entry.2.6');
  assert.equal(RETAINED_QUADRUPLE_STAB.serverInternalVariantId,121703511);
  const skill=skillsCatalog.records.find(row=>row.id===RETAINED_QUADRUPLE_STAB.sourceLegacyId);
  assert.ok(skill,'Quadruple Stab must not be purged with unrelated technical source ID');
  assert.equal(skill.name.en,'Quadruple Stab');
  assert.equal(skill.is_active,true);
  assert.equal(approved.game.ru['skill_entry.2.6'],'Четверной укол');
  assert.equal(approved.game.ru['skill_detail.2.6.3'],
    'Четверная колющая атака. В сочетании с Тройным уколом урон увеличивается.');
  assert.match(skill.description.en,/Triple Stab/);
  assert.equal(playerCharacterSkill(make()['skills.json']['121703511']),false);
});
