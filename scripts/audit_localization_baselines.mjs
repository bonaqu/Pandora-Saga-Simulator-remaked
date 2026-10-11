#!/usr/bin/env node
/**
 * Read-only source coverage inventory. This intentionally does not read D1,
 * and MUST NOT be interpreted as effective production translation coverage.
 * Run: node scripts/audit_localization_baselines.mjs --json [--check]
 */
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const read=file=>JSON.parse(fs.readFileSync(path.join(root,file),'utf8'));
const terms=read('localization/game-terms.ru.json').terms;
const approved=read('localization/approved-translations.v1.json');
const english=read('localization/ui.en.json');
const locales=['ru','jp','tw'];
const count=(items,predicate)=>items.reduce((n,v)=>n+(predicate(v)?1:0),0);
const present=text=>typeof text==='string'&&text.trim().length>0;
const ids=new Set(),duplicateIds=[],emptyEnglish=[];
const byCategory={};
for(const term of terms){
  if(ids.has(term.id))duplicateIds.push(term.id);
  ids.add(term.id);
  if(!present(term.source_en))emptyEnglish.push(term.id);
  const category=term.category||'other';
  const bucket=byCategory[category]??={total:0,ruApproved:0,jpSource:0,twSource:0};
  bucket.total++;
  if(present(approved.game?.ru?.[term.id]))bucket.ruApproved++;
  if(present(term.source_jp))bucket.jpSource++;
  if(present(term.source_tw))bucket.twSource++;
}
const uiKeys=Object.keys(english);
const uiCoverage={};
for(const locale of locales){
  const map=approved.ui?.[locale]||{};
  const missing=uiKeys.filter(key=>!present(map[key]));
  uiCoverage[locale]={approved:uiKeys.length-missing.length,total:uiKeys.length,missingIds:missing};
}
const legacySource={
  en:count(terms,t=>present(t.source_en)),
  jp:count(terms,t=>present(t.source_jp)),
  tw:count(terms,t=>present(t.source_tw)),
  ruApproved:count(terms,t=>present(approved.game?.ru?.[t.id]))
};
const report={basis:'source snapshot only; no live D1 overrides or catalog effective rows',
  effectiveProductionCoverageKnown:false,
  metadata:{legacyTermCount:terms.length,uiKeyCount:uiKeys.length,
    duplicateIds,emptyEnglish},
  legacySource,uiCoverage,byCategory};
if(process.argv.includes('--check')&&(duplicateIds.length||emptyEnglish.length))
  throw Error('Duplicate game identities or missing English source terms');
if(process.argv.includes('--json'))console.log(JSON.stringify(report,null,2));
else console.log('Read-only localization baseline audit: '+JSON.stringify({
  legacyTermCount:report.metadata.legacyTermCount,source:legacySource,
  ui:Object.fromEntries(locales.map(lang=>[lang,{
    approved:uiCoverage[lang].approved,total:uiCoverage[lang].total,
    missing:uiCoverage[lang].missingIds.length
  }])),effectiveProductionCoverageKnown:false
}));
