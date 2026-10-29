// Read-only planning for the owner's confirmed source identity. The caller
// supplies current D1 metadata; it is never a write or publication receipt.
import { baselineById, sourceIdentity } from '../../admin-api/src/catalog-baseline.mjs';
import { draftFromSource, validateDraft } from '../../admin-api/src/catalog-model.mjs';
import { serverPatch } from '../materialize_pandora_os_live_sync_hardening.mjs';
import { convertedCurrentEffects } from './current-effect-conversion.mjs';
import { planCatalogMerge } from './catalog-three-way-plan.mjs';
import reviews from '../../data/current-source-identity-reviews.v1.json' with {type:'json'};
import { createHash } from 'node:crypto';

export function previewReviewedPumpkinSoul({source,english,catalog,sourceHashes,privateState,currentEdit}) {
  const review=reviews.reviews.find(row=>row.kind==='soul' && row.serverId===103023);
  const original=baselineById.get(review.projectId),identity=sourceIdentity(original);
  if(!source || Number(source.id)!==review.serverId || source.name!==review.sourceRu || english?.n!==review.sourceEn ||
     original.name.en!==review.legacyEn || !catalog?.ok || !Number.isSafeInteger(catalog.revision) || !Array.isArray(catalog.records))
    throw Error('Reviewed soul identity or catalog changed');
  const converted=convertedCurrentEffects(source,false),patch=serverPatch('soul',source,english);
  if(!converted.complete || JSON.stringify(converted.effects)!==JSON.stringify([
    {stat:4,unit:'flat',value:1},{stat:144,unit:'flat',value:5}]) ||
    JSON.stringify(patch.slots)!==JSON.stringify([0,0,0,1,0,0,0,0]))
    throw Error('Reviewed soul effects or slots changed; review required');
  if(!privateState || privateState.revision!==catalog.revision || typeof privateState.dirtyCatalogDraft!=='boolean' ||
      !['localizationDrafts','localizationOverrides','legacyOverrides'].every(key=>Array.isArray(privateState[key])))
    return {status:'private-state-unverified',revision:catalog.revision,id:identity.id};
  if(privateState.localizationDrafts.length || privateState.localizationOverrides.length || privateState.legacyOverrides.length)
    return {status:'localization-review',revision:catalog.revision,id:identity.id};
  const published=catalog.records.find(record=>record.id===identity.id);
  if(published && !currentEdit) return {status:'published-edit-needs-review',revision:catalog.revision,id:identity.id};
  const originalEdit=validateDraft(draftFromSource(original,'soul'),identity);
  const current=currentEdit || originalEdit;
  const fields=edit=>({names:{en:edit.names.en,ru:edit.names.ru},description:{en:edit.description.en,ru:edit.description.ru}});
  const base=fields(originalEdit),incoming={names:patch.names,description:patch.description};
  const plan=planCatalogMerge({revision:catalog.revision,sourceHashes,candidates:[{identity,serverId:review.serverId,
    identityVerified:true,dirtyDraft:privateState.dirtyCatalogDraft,base,current,incoming}]});
  return {...plan.records[0],revision:plan.revision,sourceHashes:plan.sourceHashes,
    note:'Offline proposal; recheck D1 head, drafts and localization versions transactionally before any publication.'};
}

// Adapt only an unmodified baseline soul to the existing guarded batch API.
// Existing published edits require separate review and are never guessed here.
export function reviewedPumpkinSoulBatchCandidate(input) {
  const plan=previewReviewedPumpkinSoul(input);
  if(plan.status!=='change')return plan;
  if(input.currentEdit || input.catalog.records.some(record=>record.id===plan.id))
    return {...plan,status:'published-edit-needs-review'};
  const original=baselineById.get(plan.id),identity=sourceIdentity(original);
  const current=validateDraft(draftFromSource(original,'soul'),identity);
  const edit=validateDraft(plan.edit,identity);
  return {...plan,status:'ready-for-review',edit,
    expectedCurrentHash:createHash('sha256').update(JSON.stringify(current)).digest('hex')};
}
