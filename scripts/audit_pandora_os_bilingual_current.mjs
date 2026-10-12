#!/usr/bin/env node
/**
 * Read-only bilingual registry reconciliation. The English client strings live
 * in strings.en.json; RU can be stored in items/skills/souls native entries
 * even when strings.ru.json exists but its sections are empty.
 * No automatic translation publication, D1 writes, or formula updates.
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const FILES=['items.json','souls.json','skills.json','strings.en.json','strings.ru.json'];
const BASE='https://pandorasaga-os.com/gamedata/';
export const VERIFIED_POTION_SLOTS=Object.freeze([
  [0,50060,'EP_HEAL_LIFE',20],[1,50001,'EP_HEAL_LIFE',60],
  [2,50002,'EP_HEAL_LIFE',120],[3,50003,'EP_HEAL_LIFE',180],
  [5,50061,'EP_HEAL_LIFE',145],[6,50023,'EP_HEAL_LIFE',20],
  [8,50062,'EP_HEAL_LIFE',200],[9,50065,'EP_HEAL_LIFE',150],
  [10,50063,'EP_HEAL_LIFE_RATE',5],[11,50004,'EP_HEAL_LIFE_RATE',15]
]);
// These five external game-engine records are siege/zone infrastructure, NOT
// character skills. Never offer them for D1 character-skill imports or treat
// them as untranslated player abilities. Leave the external server untouched.
export const NON_CHARACTER_SKILL_IDS=Object.freeze([
  620002071,620002072,700000021,700000023,700000024
]);
const nonCharacterIds=new Set(NON_CHARACTER_SKILL_IDS);
export const RETAINED_QUADRUPLE_STAB=Object.freeze({
  simulatorId:'skill_entry.2.6',sourceLegacyId:'skill.2.6',serverInternalVariantId:121703511,
  ru:'Четверной укол',en:'Quadruple Stab'
});
export function playerCharacterSkill(source){
  return !!source&&source.learnable===true&&source.classes&&
    typeof source.classes==='object'&&!Array.isArray(source.classes)&&
    Object.values(source.classes).some(Boolean);
}
const validText=t=>typeof t==='string'&&t.trim().length>0;
const table=x=>x&&!Array.isArray(x)&&typeof x==='object'?x:null;
const names=(data,kind,id)=>data?.[kind]?.[String(id)]??null;
function entry(id,source,en,ru,kind){
  const english=names(en,kind,id),russian=names(ru,kind,id);
  const enName=english?.n,ruName=validText(russian?.n)?russian.n:source?.name;
  const enDesc=english?.d,ruDesc=validText(russian?.d)?russian.d:source?.desc;
  return {id,ru:{name:validText(ruName)?ruName:null,description:validText(ruDesc)?ruDesc:null},
    en:{name:validText(enName)?enName:null,description:validText(enDesc)?enDesc:null},
    hasDedicatedRussianName:validText(russian?.n)};
}
export function auditBilingual(snapshot,{limit=20}={}){
  if(!Number.isSafeInteger(limit)||limit<0||limit>100)throw Error('Invalid example limit');
  for(const file of FILES)if(!table(snapshot[file]))throw Error('Missing complete registry '+file);
  const en=snapshot['strings.en.json'],ru=snapshot['strings.ru.json'];
  if(en.locale!=='en'||ru.locale!=='ru')throw Error('Unexpected language registry identity');
  for(const locale of [en,ru])
    for(const kind of ['items','skills','souls'])
      if(!table(locale[kind]))throw Error('Invalid '+locale.locale+' '+kind+' translation registry');
  const categories=['items','skills','souls'];
  const rows={},summary={};
  const sourceKinds={items:'items.json',skills:'skills.json',souls:'souls.json'};
  for(const kind of categories){
    const source=snapshot[sourceKinds[kind]];
    const values=Object.entries(source).map(([id,value])=>{
      if(!/^\d+$/.test(id)||!table(value)||Number(value.id)!==Number(id))
        throw Error('Invalid '+kind+' source identity '+id);
      return entry(Number(id),value,en,ru,kind);
    });
    rows[kind]=values;
    const lack=label=>values.filter(row=>!row[label].name);
    summary[kind]={
      sourceRecords:values.length,englishEntries:Object.keys(en[kind]).length,
      dedicatedRussianEntries:Object.keys(ru[kind]).length,
      effectiveRussianNames:values.filter(row=>!!row.ru.name).length,
      effectiveEnglishNames:values.filter(row=>!!row.en.name).length,
      effectiveRussianDescriptions:values.filter(row=>!!row.ru.description).length,
      effectiveEnglishDescriptions:values.filter(row=>!!row.en.description).length,
      missingRussianNames:lack('ru').length,missingEnglishNames:lack('en').length,
      missingRussianDescriptions:values.filter(row=>!row.ru.description).length,
      missingEnglishDescriptions:values.filter(row=>!row.en.description).length,
      missingRUExamples:lack('ru').slice(0,limit).map(row=>row.id),
      missingENExamples:lack('en').slice(0,limit).map(row=>row.id),
      missingRUDescriptionExamples:values.filter(row=>!row.ru.description).slice(0,limit).map(row=>row.id),
      missingENDescriptionExamples:values.filter(row=>!row.en.description).slice(0,limit).map(row=>row.id)
    };
  }
  // Public client skills.json is a superset of real character abilities.
  // Keep a full-source coverage report for diagnostics, but expose a separate,
  // correctly scoped report for learnable abilities. Do not alter the source.
  const sourceSkills=snapshot['skills.json'];
  const forbidden=NON_CHARACTER_SKILL_IDS.filter(id=>sourceSkills[String(id)]);
  for(const id of forbidden)
    if(sourceSkills[String(id)].learnable!==false)
      throw Error('Technical skill unexpectedly became learnable: '+id);
  const characterRows=rows.skills.filter(row=>playerCharacterSkill(sourceSkills[String(row.id)]));
  const missing=(language,field)=>characterRows.filter(row=>!row[language][field]);
  const characterSkillCoverage={
    sourceRecords:rows.skills.length,
    learnablePlayerRecords:characterRows.length,
    excludedTechnicalIds:forbidden,
    excludedTechnicalNames:forbidden.map(id=>({id,name:sourceSkills[String(id)].name})),
    internalNonLearnableQuadrupleVariant:
      sourceSkills[String(RETAINED_QUADRUPLE_STAB.serverInternalVariantId)]?.learnable===false,
    ruNames:characterRows.length-missing('ru','name').length,
    enNames:characterRows.length-missing('en','name').length,
    ruDescriptions:characterRows.length-missing('ru','description').length,
    enDescriptions:characterRows.length-missing('en','description').length,
    missingRuNameIds:missing('ru','name').slice(0,limit).map(row=>row.id),
    missingEnNameIds:missing('en','name').slice(0,limit).map(row=>row.id),
    missingRuDescriptionIds:missing('ru','description').slice(0,limit).map(row=>row.id),
    missingEnDescriptionIds:missing('en','description').slice(0,limit).map(row=>row.id)
  };
  const currentItems=snapshot['items.json'];
  const confirmed=VERIFIED_POTION_SLOTS.map(([slot,id,func,base])=>{
    const item=currentItems[String(id)];
    const localization=rows.items.find(row=>row.id===id);
    const actual=item?.effects?.filter(effect=>effect.func===func)||[];
    if(!item||item.kind!=='POTION'||!localization?.ru.name||!localization?.en.name||
       actual.length!==1||actual[0].a!==base)
      throw Error('Current bilingual potion identity/healing drift: '+slot+'/'+id);
    return {slot,id,func,base,name:localization.ru.name,englishName:localization.en.name,
      localizedDescription:{ru:localization.ru.description,en:localization.en.description}};
  });
  return {checkedScope:'Public current client registries; no runtime formula, equipment legality or D1 parity claim',
    sourceOrigins:FILES.map(file=>BASE+file),
    localeSections:{ru:Object.fromEntries(categories.map(kind=>[kind,Object.keys(ru[kind]).length])),
      en:Object.fromEntries(categories.map(kind=>[kind,Object.keys(en[kind]).length]))},
    summary,characterSkillCoverage,verifiedPotions:confirmed,
    notConfirmedLegacyPotionRows:[4,7,12,13],
    independentlyVerifiedFullGameParity:false};
}
export async function readRegistry({sourceDir=null,fetchReference=fetch}={}){
  const snapshot={};
  for(const name of FILES){
    if(sourceDir){snapshot[name]=JSON.parse(await fs.readFile(path.join(sourceDir,name),'utf8'));continue;}
    const response=await fetchReference(BASE+name,{signal:AbortSignal.timeout(20000),headers:{accept:'application/json'}});
    if(!response?.ok)throw Error('Current language source unavailable (no dated fallback): '+name+' HTTP '+(response?.status??'unknown'));
    snapshot[name]=JSON.parse(await response.text());
  }
  return {snapshot,origin:sourceDir?{localDirectory:sourceDir,live:false}:{urls:FILES.map(file=>BASE+file),live:true}};
}
async function main(args){
  let sourceDir=null,output=null,json=false,strict=false;
  for(let i=0;i<args.length;i++){
    if(args[i]==='--source-dir'&&sourceDir===null&&args[i+1]&&!args[i+1].startsWith('--'))
      sourceDir=args[++i];
    else if(args[i]==='--output'&&output===null&&args[i+1]&&!args[i+1].startsWith('--'))
      output=args[++i];
    else if(args[i]==='--json'&&!json)json=true;
    else if(args[i]==='--strict'&&!strict)strict=true;
    else throw Error('Unknown or repeated option: '+args[i]);
  }
  const {snapshot,origin}=await readRegistry({sourceDir});
  const report={checkedAt:new Date().toISOString(),origin,...auditBilingual(snapshot)};
  if(output)await fs.writeFile(output,JSON.stringify(report,null,2)+'\n');
  if(json)console.log(JSON.stringify(report,null,2));
  else console.log('BILINGUAL_AUDIT='+JSON.stringify({origin,summary:report.summary,localeSections:report.localeSections,
    characterSkillCoverage:report.characterSkillCoverage,
    verifiedPotions:report.verifiedPotions.map(({slot,id,base,name,englishName})=>({slot,id,base,name,englishName}))}));
  if(strict&&Object.values(report.summary).some(v=>v.missingRussianNames||v.missingEnglishNames||v.missingRussianDescriptions||v.missingEnglishDescriptions))process.exitCode=1;
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))
  main(process.argv.slice(2)).catch(error=>{console.error(error.message);process.exitCode=1});
