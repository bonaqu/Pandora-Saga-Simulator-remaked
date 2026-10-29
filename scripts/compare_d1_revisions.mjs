#!/usr/bin/env node
// Compare a read-only Wrangler JSON response on stdin with restored SQLite.
// Never print snapshots, SQL contents, tokens or private revision notes.
import fs from 'node:fs';
import { createHash } from 'node:crypto';
import { DatabaseSync } from 'node:sqlite';

try {
  const [database,firstText,lastText]=process.argv.slice(2);
  const first=Number(firstText),last=Number(lastText);
  if (!database || !Number.isSafeInteger(first) || !Number.isSafeInteger(last) || first<1 || last<first)
    throw Error('Invalid comparison arguments');
  const response=JSON.parse(fs.readFileSync(0,'utf8').replace(/^\uFEFF/,''));
  if (!Array.isArray(response) || response.length!==1 || !response[0].success || !Array.isArray(response[0].results))
    throw Error('Invalid read-only response');
  const rows=response[0].results;
  if (rows.length!==last-first+1 || rows.some((row,index)=>row.version!==first+index))
    throw Error('Incomplete or unordered revision response');
  const db=new DatabaseSync(database,{readOnly:true});
  try {
    const query=db.prepare('SELECT version,impact_version,snapshot_json,created_at,note FROM catalog_revisions WHERE version=?');
    const hash=text=>createHash('sha256').update(text).digest('hex'),differences=[];
    for(const live of rows){
      const restored=query.get(live.version);
      if (!restored || restored.impact_version!==live.impact_version || restored.created_at!==live.created_at ||
          restored.note!==live.note || hash(restored.snapshot_json)!==hash(live.snapshot_json)) differences.push(live.version);
    }
    console.log(JSON.stringify({first,last,compared:rows.length,differences}));
    if(differences.length)process.exitCode=1;
  } finally { db.close(); }
} catch {
  console.error('Revision comparison failed or the response was incomplete; no private data printed.');
  process.exitCode=1;
}
