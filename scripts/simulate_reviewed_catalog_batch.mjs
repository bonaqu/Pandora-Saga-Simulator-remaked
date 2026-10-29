#!/usr/bin/env node
// Execute the guarded catalog batch API against a NEW local copy of a
// restored D1 export. The private plan and SQLite data never leave this host.
// This is not a deployment or a claim that source/production state is current.
import fs from 'node:fs';
import path from 'node:path';
import { randomUUID, createHash } from 'node:crypto';
import { isDeepStrictEqual } from 'node:util';
import { DatabaseSync } from 'node:sqlite';
import { adminCatalog, publicCatalog } from '../admin-api/src/catalog.mjs';
import { baselineById, sourceIdentity } from '../admin-api/src/catalog-baseline.mjs';
import { draftFromSource, validateDraft } from '../admin-api/src/catalog-model.mjs';

const digest=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
const url='https://offline.invalid/api/admin/';
let phase='arguments';
function dbAdapter(sqlite) {
  return {prepare(sql){let values=[];return {
    bind(...args){values=args;return this;},
    async first(){return sqlite.prepare(sql).get(...values)||null;},
    async all(){return {results:sqlite.prepare(sql).all(...values)};},
    async run(){return {meta:{changes:Number(sqlite.prepare(sql).run(...values).changes)}};}
  };},async batch(statements){
    sqlite.exec('BEGIN IMMEDIATE');try{const result=[];for(const statement of statements)result.push(await statement.run());sqlite.exec('COMMIT');return result;}
    catch(error){sqlite.exec('ROLLBACK');throw error;}
  }};
}
function tableDigest(db,name,filter='') {
  if(!/^[A-Za-z_][A-Za-z0-9_]*$/.test(name))throw Error('Invalid table');
  const info=db.prepare('PRAGMA table_info('+name+')').all();
  if(info.some(column=>!/^[A-Za-z_][A-Za-z0-9_]*$/.test(column.name)))throw Error('Invalid column');
  const primary=info.filter(column=>column.pk).sort((a,b)=>a.pk-b.pk).map(column=>'"'+column.name+'"');
  return digest(db.prepare('SELECT * FROM '+name+filter+' ORDER BY '+(primary.length?primary.join(','):'rowid')).all());
}
async function run({source,planPath,destination}) {
  if(path.resolve(source)===path.resolve(destination)||fs.existsSync(destination))throw Error('A distinct new output file is required');
  const plan=JSON.parse(fs.readFileSync(planPath,'utf8').replace(/^\uFEFF/,''));
  if(!Array.isArray(plan)||!plan.length||plan.some(row=>row.status!=='ready-for-review')||new Set(plan.map(row=>row.id)).size!==plan.length)
    throw Error('Plan is incomplete or ambiguous');
  phase='copy';fs.copyFileSync(source,destination,fs.constants.COPYFILE_EXCL);
  const sqlite=new DatabaseSync(destination),env={DB:dbAdapter(sqlite)};
  try {
    phase='catalog and plan validation';const head=sqlite.prepare('SELECT version,impact_version,snapshot_json FROM catalog_head WHERE id=1').get();
    if(!head||plan.some(row=>row.revision!==head.version))throw Error('Plan does not match copied catalog');
    const before=JSON.parse(head.snapshot_json),beforeById=new Map(before.map(entry=>[entry.identity.id,entry]));
    for(const row of plan){
      const original=baselineById.get(row.id),identity=sourceIdentity(original),entry=beforeById.get(row.id);
      const current=validateDraft(entry?.edit||draftFromSource(original,identity.kind),identity);
      if(digest(current)!==row.expectedCurrentHash||sqlite.prepare('SELECT COUNT(*) AS n FROM catalog_drafts WHERE id=? AND is_dirty=1').get(row.id).n)
        throw Error('Existing edit or draft differs from preview');
    }
    phase='baseline table capture';const tables=sqlite.prepare("SELECT name FROM sqlite_schema WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name").all().map(row=>row.name);
    const untouched=tables.filter(name=>!['catalog_head','catalog_revisions','catalog_drafts'].includes(name));
    const hashes=Object.fromEntries(untouched.map(name=>[name,tableDigest(sqlite,name)]));
    const oldRevisions=tableDigest(sqlite,'catalog_revisions',' WHERE version<=' + head.version);
    const oldRevisionCount=sqlite.prepare('SELECT COUNT(*) AS n FROM catalog_revisions').get().n;
    const oldDrafts=sqlite.prepare('SELECT * FROM catalog_drafts ORDER BY id').all();
    async function call(endpoint,input){
      const response=await adminCatalog(new Request(url+endpoint,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(input)}),env,1000);
      if(!response.ok)throw Error('Offline catalog action failed');return response.json();
    }
    const items=plan.map(row=>({id:row.id,edit:row.edit,expectedCurrentHash:row.expectedCurrentHash}));
    const operationId=randomUUID(),input={items,expectedCatalogRevision:head.version,operationId};
    phase='batch publication';const published=await call('publish-reviewed-catalog-batch',input);
    if(!published.translationsGuarded||!published.reviewedDirect||published.catalogRevision!==head.version+1||published.count!==plan.length)throw Error('Unexpected batch receipt');
    phase='batch retry';const retry=await call('publish-reviewed-catalog-batch',input);
    if(!retry.recovered||!retry.translationsGuarded||!retry.reviewedDirect||retry.catalogRevision!==published.catalogRevision)throw Error('Batch retry was not idempotent');
    phase='result verification';const after=sqlite.prepare('SELECT version,impact_version,snapshot_json FROM catalog_head WHERE id=1').get();
    const entries=JSON.parse(after.snapshot_json),afterById=new Map(entries.map(entry=>[entry.identity.id,entry]));
    const changedIds=new Set(plan.map(row=>row.id));
    if(beforeById.size!==before.length||afterById.size!==entries.length||
       entries.length!==before.length+plan.filter(row=>!beforeById.has(row.id)).length)throw Error('Duplicate or missing catalog identities');
    for(const entry of before)if(!changedIds.has(entry.identity.id)&&!isDeepStrictEqual(entry,afterById.get(entry.identity.id)))throw Error('Unrelated catalog record changed');
    for(const row of plan){const entry=afterById.get(row.id),original=baselineById.get(row.id);
      if(!entry||!isDeepStrictEqual(entry.identity,sourceIdentity(original))||!isDeepStrictEqual(entry.edit,row.edit))throw Error('Published skill differs from preview');}
    for(const row of oldDrafts){const actual=sqlite.prepare('SELECT * FROM catalog_drafts WHERE id=?').get(row.id);if(!isDeepStrictEqual(actual,row))throw Error('Existing draft changed');}
    if(sqlite.prepare('SELECT COUNT(*) AS n FROM catalog_drafts').get().n!==oldDrafts.length)throw Error('Draft count changed');
    if(sqlite.prepare('SELECT COUNT(*) AS n FROM catalog_revisions').get().n!==oldRevisionCount+1)throw Error('Unexpected revision count');
    if(oldRevisions!==tableDigest(sqlite,'catalog_revisions',' WHERE version<='+head.version))throw Error('Historical revisions changed');
    for(const name of untouched)if(hashes[name]!==tableDigest(sqlite,name))throw Error('Unrelated table changed');
    const publicResponse=await publicCatalog(new Request('https://offline.invalid/api/catalog'),env),publishedData=await publicResponse.json();
    if(publishedData.revision!==after.version||plan.some(row=>!publishedData.records.some(record=>record.id===row.id)))throw Error('Public catalog missing reviewed records');
    const oldResponse=await publicCatalog(new Request('https://offline.invalid/api/catalog?revision='+head.version),env),oldData=await oldResponse.json();
    if(oldData.revision!==head.version)throw Error('Historical public catalog unavailable');
    return {beforeRevision:head.version,simulatedRevision:after.version,impactRevision:after.impact_version,
      records:plan.length,skills:plan.filter(row=>row.id.startsWith('skill_entry.')).length,
      equipment:plan.filter(row=>row.id.startsWith('equipment.')).length,
      souls:plan.filter(row=>row.id.startsWith('soul.')).length,
      classes:plan.filter(row=>row.id.startsWith('job.')).length,
      racialPassives:plan.filter(row=>row.id.startsWith('racial_skill.')).length,
      variants:plan.reduce((n,row)=>n+(row.addedVariantIds?.length||0),0),existingDraftsPreserved:oldDrafts.length,
      historicalRevisionsPreserved:head.version,unchangedTables:untouched.length,retry:'unchanged',productionWrites:0};
  } finally {sqlite.close();}
}

try {
  if(process.argv.length!==5)throw Error('Expected restored SQLite, private plan and a new simulation database');
  console.log(JSON.stringify(await run({source:process.argv[2],planPath:process.argv[3],destination:process.argv[4]})));
} catch {
  // Private catalog payloads or SQL errors must never be copied to logs.
  console.error('Offline simulation stopped at '+phase+'; preserve the private artifacts for diagnosis.');process.exitCode=1;
}
