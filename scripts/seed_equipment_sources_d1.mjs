#!/usr/bin/env node
// Idempotent Cloudflare D1 source-inventory import. The 0017 migration creates
// the table; this tool persists ALL equipment baselines as individual D1 rows.
// Existing catalog_head publications, draft edits, revisions and login data are
// NEVER modified. Only the approved CI deployment environment runs --remote.
import { baselineRecords, sourceIdentity } from '../admin-api/src/catalog-baseline.mjs';
import verified from '../data/verified-racial-gear.v1.json' with { type: 'json' };
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const database = 'pandora-saga-simulator-remaked-admin-db';
const fingerprint = text => createHash('sha256').update(text, 'utf8').digest('hex');
const escapeSql = text => "'" + String(text).replaceAll("'", "''") + "'";

export function equipmentSourceRows() {
  // Every reviewed OS game ID has exactly one published D1 identity. The
  // archived Japanese source (or the older Modern-only female projection) is
  // kept as a historical source row, not a second editable game item.
  const published = verified.entries.filter(row => row.publishedId);
  if (published.length !== 41 || new Set(published.map(row => row.publishedId)).size !== 41)
    throw Error('Expected 41 verified published racial/Dawn canonical identities');
  const oldToCanonical = new Map(published.map(row => {
    const old = row.recordId.startsWith('modern.equipment.') &&
      !row.recordId.includes('-os-')
      ? 'equipment.' + row.category + '.' + row.templateIndex
      : row.recordId;
    return [old, row.publishedId];
  }));
  if (oldToCanonical.size !== 41) throw Error('Duplicate archived equipment aliases');
  const originals = baselineRecords.filter(row => row.id.startsWith('equipment.') || row.kind === 'equipment');
  if (originals.length < 100) throw Error('Incomplete source equipment registry');
  const ids = new Set(), slots = new Set();
  const rows = originals.map(source => {
    const identity = sourceIdentity(source);
    const slot = identity.category + '.' + identity.index;
    if (!identity.id || ids.has(identity.id) || slots.has(slot))
      throw Error('Duplicate source identity or slot: ' + identity.id);
    ids.add(identity.id); slots.add(slot);
    const json = JSON.stringify(source);
    if (json.length > 16384) throw Error('Oversized equipment source: ' + identity.id);
    return { id:identity.id, category:identity.category, index:identity.index,
      hash:fingerprint(json), json, canonicalId:oldToCanonical.get(identity.id) || null };
  });
  for (const alias of oldToCanonical.keys()) {
    if (!ids.has(alias)) throw Error('Missing archived Dawn alias source: ' + alias);
  }
  return rows.sort((a,b)=>a.id.localeCompare(b.id,'en'));
}

export function equipmentSourceStatements(rows, batchSize=60, stamp=0) {
  if (!Number.isInteger(batchSize) || batchSize < 1 || batchSize > 100 ||
      !Number.isSafeInteger(stamp) || stamp < 0) throw Error('Invalid seed parameters');
  const batches=[];
  for(let i=0;i<rows.length;i+=batchSize){
    const batch=rows.slice(i,i+batchSize);
    const values=batch.map(row=>'('+
      [escapeSql(row.id),String(row.category),String(row.index),
        escapeSql(row.hash),escapeSql(row.json),
        row.canonicalId?escapeSql(row.canonicalId):'NULL',String(stamp)].join(',')+')').join(',\n');
    batches.push('INSERT INTO catalog_equipment_sources '+
      '(id,category,item_index,source_sha256,source_json,canonical_id,imported_at) VALUES\n'+values+
      '\nON CONFLICT(id) DO UPDATE SET category=excluded.category,item_index=excluded.item_index,'+
      'source_sha256=excluded.source_sha256,source_json=excluded.source_json,'+
      'canonical_id=excluded.canonical_id,imported_at=excluded.imported_at '+
      'WHERE catalog_equipment_sources.source_sha256<>excluded.source_sha256 '+
      'OR catalog_equipment_sources.canonical_id IS NOT excluded.canonical_id;\n');
  }
  return batches;
}

export function sourceManifest(){
  const rows=equipmentSourceRows();
  return { rows, count:rows.length, aliases:rows.filter(row=>row.canonicalId).length,
    fingerprint:fingerprint(rows.map(row=>row.id+'|'+row.hash+'|'+(row.canonicalId||'')).join('\n')) };
}

function main(){
  const flag=process.argv[2];
  if(!['--plan','--remote'].includes(flag))throw Error('Use --plan or --remote (production)');
  const manifest=sourceManifest();
  const batches=equipmentSourceStatements(manifest.rows,60,Math.floor(Date.now()/1000));
  if(flag==='--plan'){
    process.stdout.write(JSON.stringify({count:manifest.count,aliases:manifest.aliases,
      batches:batches.length,fingerprint:manifest.fingerprint})+'\n');
    return;
  }
  if(!process.env.CLOUDFLARE_API_TOKEN||!process.env.CLOUDFLARE_ACCOUNT_ID)
    throw Error('Cloudflare deployment credentials are required');
  const temp=mkdtempSync(join(tmpdir(),'pandora-d1-equipment-'));
  try{
    for(let i=0;i<batches.length;i++){
      const file=join(temp,'equipment-'+String(i).padStart(3,'0')+'.sql');
      writeFileSync(file,batches[i],{encoding:'utf8',mode:0o600});
      const result=spawnSync('npx',['--no-install','wrangler','d1','execute',database,
        '--config','admin-api/wrangler.jsonc','--remote','--file',file],
        {cwd:resolve(fileURLToPath(new URL('..',import.meta.url))),
          encoding:'utf8',timeout:180000,maxBuffer:1024*1024*2});
      if(result.status!==0){
        // Do not echo Cloudflare stderr: deployment logs must not disclose
        // SQL statements with unreleased catalog content or credentials.
        throw Error('D1 equipment source import failed at batch '+(i+1)+'/'+batches.length+
          ' (exit '+result.status+'). Deployment safely stopped.');
      }
      process.stdout.write('Source D1 batch '+(i+1)+'/'+batches.length+' stored\n');
    }
    process.stdout.write('Cloudflare equipment source inventory complete: '+
      manifest.count+' equipment rows, '+manifest.aliases+' archived alias links.\n');
  }finally{rmSync(temp,{recursive:true,force:true});}
}
if(process.argv[1] && resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  try{main();}catch(e){process.stderr.write(String(e.message||e)+'\n');process.exitCode=1;}
}
