// Offline preview of identity-pinned, source-described equipment upgrades.
// It cannot allocate records, edit D1, or authorize production publication.
import { createHash } from 'node:crypto';
import { isDeepStrictEqual } from 'node:util';
import { baselineById, sourceIdentity } from '../../admin-api/src/catalog-baseline.mjs';
import { validateDraft, compileRecord } from '../../admin-api/src/catalog-model.mjs';
import { forthToUpgradeRules } from './pandora_os_forth_rules.mjs';

const specs={
  'equipment.11.14':{serverId:1232,engineId:110014,engineKey:'モール',ru:'Прочный клиновидный молот',en:'Maul D',stat:62,step:2,str:1,
    ruDesc:'Молот с длинной рукоятью.<br><br>СИЛ +1<br>За каждые 2 единицы улучшения:<br>Точность +2<br>При улучшении на +7 и выше: СИЛ +1',
    enDesc:'A hammer with a long handle.<br><br>STR +1<br>Per every 2 enhancement levels:<br>Accuracy +2<br>At +7 and above: STR +1'},
  'equipment.5.27':{serverId:1484,engineId:50027,engineKey:'ゼピュロスＲ',ru:'Разящее копье Зефира',en:'Zephyrus A',stat:7,step:15,str:1,
    ruDesc:'Копье найденное среди поселений Мирин. <br><br>СИЛ +1<br>За каждые 2 единицы улучшения:<br>ОМ +15<br>При улучшении на +7 и выше: СИЛ +1',
    enDesc:'A spear found among the Mirin settlements.<br><br>STR +1<br>Per every 2 enhancement levels:<br>MP +15<br>At +7 and above: STR +1'},
  'equipment.5.28':{serverId:1485,engineId:50028,engineKey:'ゼピュロスＳＲ',ru:'Сильное копье Зефира',en:'Zephyrus S',stat:7,step:15,str:2,
    ruDesc:'Копье найденное среди поселений Мирин. <br><br>СИЛ +1<br>За каждые 2 единицы улучшения:<br>ОМ +15<br>При улучшении на +7 и выше: СИЛ +2',
    enDesc:'A spear found among the Mirin settlements.<br><br>STR +1<br>Per every 2 enhancement levels:<br>MP +15<br>At +7 and above: STR +2'},
  'equipment.31.64':{serverId:12103,engineId:310064,engineKey:'ゴールドプレート',ru:'Золотой нагрудник',en:'Gold Plate',policy:'replace-legacy-gold-plate-upgrade',
    rules:[{stat:52,unit:'percent',value:-2,from:5,every:1,to:10}],
    ruDesc:'Древние доспехи, ничуть не потерявшие былого блеска. Эту броню издавна носили великие герои и победители.<br><br>ВЫН +1,  СИЛ +1<br><br>При усовершенствовании до +5 и выше снижает получаемый физический урон на 2%. Также дополнительно снижает получаемый физический урон на 2% за каждую единицу усовершенствования после этого.<br><br>Если доспехи усовершенствованы до +7 или выше, и экипированы вместе с Золотым шлемом, Золотым набедренником, Золотыми рукавицами и Золотыми перчатками, активируется эффект<br>Сопротивляемость падению +100%',
    enDesc:'Ancient armor that has not lost a shred of its former luster. This armor has long been worn by great heroes and champions.<br><br>Sta +1,  STR +1<br><br>When enhanced to +5 or higher, reduces physical damage taken by 2%. It also further reduces physical damage taken by an additional 2% for each level of enhancement beyond that.<br><br>If the armor is enhanced to +7 or higher and equipped together with the Gold Helm, Gold Tasset, Gold Gauntlets, and Gold Gloves, the following effect is activated<br>Knockdown Resistance +100%'},
  'equipment.32.82':{serverId:14007,engineId:320082,engineKey:'ルーナグローブ',ru:'Лунные перчатки',en:'Lunar Gloves',policy:'replace-legacy-lunar-gloves-upgrade',
    rules:[{stat:5,unit:'flat',value:1,from:7,every:1,to:7},{stat:42,unit:'flat',value:2,from:7,every:1,to:7}],
    ruDesc:'Перчатки, заряженные энергией лунного света.<br><br>Магическая атака +1%<br>При улучшении на +7 и выше:<br>ИНТ +1<br>Магическая атака +2%',
    enDesc:'Gloves charged with the energy of moonlight.<br><br>Magic Attack +1%<br>At +7 and above:<br>INT +1<br>Magic Attack +2%'},
  'equipment.32.61':{serverId:14074,engineId:320061,engineKey:'マナブレスレット',ru:'Магический браслет',en:'Mana Bracelets',policy:'replace-legacy-mana-bracelets-upgrade',
    rules:[{stat:2,unit:'flat',value:1,from:7,every:1,to:7}],
    ruDesc:'Эти изящные браслеты популярны против адептов магии. <br><br>Снижение расхода ОМ +4%<br>Сопротивляемость магии +3<br>При улучшении на +7 и выше: ПРВ +1',
    enDesc:'These elegant bracelets are popular among adepts of magic. <br><br>MP Cost Reduction +4%<br>Magic Resistance +3<br>At +7 and above: AGI +1'}
};
const digest=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
function total(rules,stat,unit,level) {
  return rules.filter(rule=>rule.stat===stat&&rule.unit===unit&&level>=rule.from).reduce((sum,rule)=>
    sum+rule.value*(1+Math.floor((Math.min(level,rule.to)-rule.from)/rule.every)),0);
}

export function previewReviewedNativeForth({id,source,english,levels,catalog,currentEdit,privateState,sourceHashes}) {
  const spec=specs[id],original=baselineById.get(id);
  if(!spec||!original||!catalog?.ok||!Number.isSafeInteger(catalog.revision)||!Array.isArray(catalog.records)||
     !sourceHashes||!Object.keys(sourceHashes).length||!Object.values(sourceHashes).every(hash=>typeof hash==='string'&&/^[a-f0-9]{64}$/.test(hash)))
    throw Error('Invalid reviewed native enhancement input');
  const result={id,serverId:spec.serverId,revision:catalog.revision,sourceHashes:structuredClone(sourceHashes)};
  if(Number(source?.id)!==spec.serverId||source?.name!==spec.ru||source?.desc!==spec.ruDesc||english?.n!==spec.en||english?.d!==spec.enDesc||
     original.name.jp!==spec.engineKey) return {...result,status:'source-identity-review'};
  const converted=forthToUpgradeRules(levels);
  const rules=spec.rules?structuredClone(spec.rules):[{stat:spec.stat,value:spec.step,unit:'flat',from:2,every:2,to:10},
    {stat:1,value:spec.str,unit:'flat',from:7,every:1,to:7}];
  const keys=new Set(rules.map(rule=>rule.stat+':'+rule.unit));
  if(!converted.complete||converted.rules.some(rule=>!keys.has(rule.stat+':'+rule.unit))||
     rules.some(rule=>Array.from({length:11},(_,level)=>level).some(level=>total(converted.rules,rule.stat,rule.unit,level)!==total(rules,rule.stat,rule.unit,level))))
    return {...result,status:'source-enhancement-review'};
  if(!privateState||privateState.revision!==catalog.revision||typeof privateState.dirtyCatalogDraft!=='boolean'||
     !['localizationDrafts','localizationOverrides','legacyOverrides'].every(key=>Array.isArray(privateState[key])))
    return {...result,status:'private-state-unverified'};
  if(privateState.dirtyCatalogDraft)return {...result,status:'dirty-draft'};
  if(privateState.localizationDrafts.length||privateState.localizationOverrides.length||privateState.legacyOverrides.length)
    return {...result,status:'localization-review'};
  const published=catalog.records.find(record=>record.id===id),identity=sourceIdentity(original);
  if(!published||published.engineId!==spec.engineId||published.engineKey!==spec.engineKey||!currentEdit)
    return {...result,status:'published-edit-required'};
  const current=validateDraft(currentEdit,identity);
  if(!isDeepStrictEqual(current,currentEdit))return {...result,status:'current-normalization-review'};
  if(!isDeepStrictEqual(compileRecord(current,identity,original),published))return {...result,status:'published-snapshot-mismatch'};
  const policy=spec.policy||(spec.stat===7?'replace-legacy-zephyrus-upgrade':undefined);
  if(isDeepStrictEqual(current.upgradeBonuses,rules)&&current.nativeUpgradePolicy===policy)return {...result,status:'unchanged'};
  if(current.upgradeBonuses?.length||current.nativeUpgradePolicy!==undefined)return {...result,status:'existing-upgrade-review'};
  const edit={...structuredClone(current),upgradeBonuses:rules,...(policy?{nativeUpgradePolicy:policy}:{})};
  const valid=validateDraft(edit,identity);compileRecord(valid,identity,original);
  return {...result,status:'ready-for-review',expectedCurrentHash:digest(current),expectedPublicHash:digest(published),edit:valid,
    note:'Offline preview only; guard the current revision, drafts and translations transactionally before any publication.'};
}
