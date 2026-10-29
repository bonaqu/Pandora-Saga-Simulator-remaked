// Offline preview only. No network, allocation, D1 writes or publication.
// Callers must supply freshly checked private draft/translation metadata and,
// for published records, the exact editable catalog entry.
import { createHash } from 'node:crypto';
import { isDeepStrictEqual } from 'node:util';
import { baselineById, sourceIdentity } from '../../admin-api/src/catalog-baseline.mjs';
import { draftFromSource, validateDraft, compileRecord } from '../../admin-api/src/catalog-model.mjs';
import { currentActiveProfileReference as reference } from '../../admin-api/src/current-active-profiles.mjs';

const digest = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');

export function previewReviewedSkillProfiles({catalog, coverage, privateState, currentEdits, sourceHashes}) {
  if (!catalog?.ok || !Number.isSafeInteger(catalog.revision) || !Array.isArray(catalog.records) ||
      !Array.isArray(coverage?.rows) || !sourceHashes || !Object.keys(sourceHashes).length ||
      !Object.values(sourceHashes).every(value=>typeof value==='string' && /^[a-f0-9]{64}$/.test(value)))
    throw Error('Invalid reviewed profile preview input');
  const publicRecords=new Map(catalog.records.map(record=>[record.id,record]));
  return reference.records.map(reviewed=>{
    const id=reviewed.id, original=baselineById.get(id), identity=original && sourceIdentity(original);
    const base={id,revision:catalog.revision,sourceHashes:structuredClone(sourceHashes)};
    if (!original || original.name.en!==reviewed.nativeName || original.prerequisite_code!==reviewed.prerequisiteCode)
      throw Error('Reviewed skill identity changed: '+id);
    const rows=coverage.rows.filter(row=>row.id===id);
    if (rows.length!==reviewed.rows.length || reviewed.rows.some(ref=>!rows.some(row=>row.sourceId===ref.sourceId)) ||
        rows.some(row=>row.sourceDifferences.length || row.status==='source-identity-review'))
      return {...base,status:'source-review'};
    const state=privateState?.[id];
    if (!state || state.revision!==catalog.revision || typeof state.dirtyCatalogDraft!=='boolean' ||
        !['localizationDrafts','localizationOverrides','legacyOverrides'].every(key=>Array.isArray(state[key])))
      return {...base,status:'private-state-unverified'};
    if (state.dirtyCatalogDraft) return {...base,status:'dirty-draft'};
    if (state.localizationDrafts.length || state.localizationOverrides.length || state.legacyOverrides.length)
      return {...base,status:'localization-review'};
    const published=publicRecords.get(id);
    if (published && !currentEdits?.[id]) return {...base,status:'published-edit-required'};
    const current=published ? currentEdits[id] : draftFromSource(original,'active');
    const valid=validateDraft(current,identity);
    if (!isDeepStrictEqual(valid,current)) return {...base,status:'current-normalization-review'};
    const effective=compileRecord(valid,identity,original);
    if (published && !isDeepStrictEqual(effective,published)) return {...base,status:'published-snapshot-mismatch'};
    const sourceBase=rows.find(row=>row.sourceId===reviewed.baseSourceId);
    const baseReference=reviewed.rows.find(row=>row.sourceId===reviewed.baseSourceId);
    if (!sourceBase || !baseReference) return {...base,status:'source-review'};
    const onlyOriginalEnglishName=!published && sourceBase.publishedDifferences.length===1 &&
      sourceBase.publishedDifferences[0]==='names.en' && valid.names.en===original.name.en &&
      typeof baseReference.names.en==='string' && baseReference.names.en.length>0;
    if (sourceBase.publishedDifferences.length && !onlyOriginalEnglishName)
      return {...base,status:'base-value-review',differences:sourceBase.publishedDifferences};
    const proposed=structuredClone(valid);
    const baseChanges=[];
    if (onlyOriginalEnglishName) {
      baseChanges.push({field:'names.en',before:valid.names.en,after:baseReference.names.en});
      proposed.names.en=baseReference.names.en;
    }
    const variants=reviewed.rows.filter(row=>row.sourceId!==reviewed.baseSourceId).map(row=>({
      id:'source-'+row.sourceId,
      names:{...proposed.names,...row.names},description:{...proposed.description,...row.description},
      learningRequirements:structuredClone(row.learningRequirements),
      mpCost:row.timing[0],castSeconds:row.timing[1],cooldownSeconds:row.timing[2],durationSeconds:valid.durationSeconds
    }));
    if (valid.profiles?.length) {
      if (isDeepStrictEqual(valid.profiles,variants)) return {...base,status:'unchanged'};
      return {...base,status:'existing-profiles-review'};
    }
    proposed.profiles=variants;
    const next=validateDraft(proposed,identity);
    compileRecord(next,identity,original);
    return {...base,status:'ready-for-review',expectedCurrentHash:digest(valid),expectedPublicHash:published?digest(published):null,
      baseChanges,addedVariantIds:variants.map(variant=>variant.id),edit:next,
      note:'Offline preview only. Recheck head, drafts, translations and hashes atomically before any publication.'};
  });
}
