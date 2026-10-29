// Offline, identity-pinned proposals. Publication still requires transaction guards.
import { createHash } from 'node:crypto';
import { isDeepStrictEqual } from 'node:util';
import { baselineById, sourceIdentity } from '../../admin-api/src/catalog-baseline.mjs';
import { validateDraft, compileRecord } from '../../admin-api/src/catalog-model.mjs';

const keys=['slash','thrust','brush','blow','defense','archery','alchemy','assassin','trap','warding',
  'benevolence','blessing','exorcism','hymn','element','embody','darkness','charm','race','riding'];
const hash=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex');

export function previewReviewedCharacter({id,source,catalog,currentEdit,privateState,sourceHashes}) {
  if(!['job.12','racial_skill.1.1'].includes(id)||!catalog?.ok||!Number.isSafeInteger(catalog.revision)||
    !sourceHashes||!Object.values(sourceHashes).length||!Object.values(sourceHashes).every(v=>/^[a-f0-9]{64}$/.test(v)))
    throw Error('Invalid character review input');
  const result={id,revision:catalog.revision,sourceHashes:structuredClone(sourceHashes)};
  const original=baselineById.get(id),identity=sourceIdentity(original);
  if(id==='job.12'){
    const job=source.classes?.ASSASSIN;
    if(job?.id!=='ASSASSIN'||job.parent!=='AGENT'||job.branchCaps?.riding!==10||
      keys.some((key,index)=>job.branchCaps?.[key]!== (index===19?10:original.potentialCaps[index])))
      return {...result,status:'source-identity-review'};
  } else {
    const skill=source.skills?.['900020002'],english=source.english?.['900020002'];
    if(!source.racialPassives?.ELF?.skills?.includes(900020002)||skill?.id!==900020002||
      skill.name!=='Зоркость'||skill.desc!=='Увеличивает дальность стрельбы на 500.'||
      english?.n!=='Eagle Eye'||english.d!=='Increases attack range by 500'||
      !isDeepStrictEqual(skill.weaponUse,['BOW','CROSSBOW'])||
      !isDeepStrictEqual(skill.funcs,[{ep:'EP_RACE_CARRY',dir:'TARGET',fv1:[0,0,0,500],fv2:[0,0,0,0]},
        {ep:'EP_RACE_RANGE',dir:'TARGET',fv1:[0,0,0,500],fv2:[0,0,0,0]}]))
      return {...result,status:'source-identity-review'};
  }
  if(!privateState||privateState.revision!==catalog.revision||typeof privateState.dirtyCatalogDraft!=='boolean'||
    !['localizationDrafts','localizationOverrides','legacyOverrides'].every(k=>Array.isArray(privateState[k])))
    return {...result,status:'private-state-unverified'};
  if(privateState.dirtyCatalogDraft)return {...result,status:'dirty-draft'};
  if(privateState.localizationDrafts.length||privateState.localizationOverrides.length||privateState.legacyOverrides.length)
    return {...result,status:'localization-review'};
  const published=catalog.records.find(row=>row.id===id);
  if(!published||!currentEdit)return {...result,status:'published-edit-required'};
  const current=validateDraft(currentEdit,identity);
  if(!isDeepStrictEqual(current,currentEdit)||!isDeepStrictEqual(compileRecord(current,identity,original),published))
    return {...result,status:'published-snapshot-mismatch'};
  const wanted=id==='job.12'?[...original.potentialCaps.slice(0,19),10]:{amount:500,appliesTo:'ranged'};
  const field=id==='job.12'?'potentialCaps':'rangeBonus';
  if(isDeepStrictEqual(current[field],wanted))return {...result,status:'unchanged'};
  if(current[field]!==undefined)return {...result,status:'existing-field-review'};
  const edit=validateDraft({...structuredClone(current),[field]:wanted},identity);
  compileRecord(edit,identity,original);
  return {...result,status:'ready-for-review',expectedCurrentHash:hash(current),edit};
}
