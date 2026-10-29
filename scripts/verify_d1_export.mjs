#!/usr/bin/env node
// Restore an existing D1 SQL export into a NEW local SQLite file. Never reads
// credentials separately, writes to Cloudflare, prints table contents, or
// replaces any existing backup/database/metadata artifact.
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { DatabaseSync } from 'node:sqlite';
import { fileURLToPath } from 'node:url';

export function verifyD1Export({source,destination,metadata}) {
  const paths=[source,destination,metadata].map(value=>path.resolve(value));
  if (new Set(paths).size!==3 || fs.existsSync(destination) || fs.existsSync(metadata))
    throw Error('Restore and metadata paths must be new and distinct');
  const bytes=fs.readFileSync(source);
  if (!bytes.length) throw Error('Export is empty');
  // Exclusive creation preserves preexisting files even if another process
  // creates the destination between the preliminary check and this call.
  fs.closeSync(fs.openSync(destination,'wx',0o600));
  let db;
  try {
    db=new DatabaseSync(destination);db.exec(bytes.toString('utf8'));
    if (Object.values(db.prepare('PRAGMA integrity_check').get())[0]!=='ok') throw Error('SQLite integrity check failed');
    if (db.prepare('PRAGMA foreign_key_check').all().length) throw Error('SQLite foreign key check failed');
    const tables=db.prepare("SELECT name FROM sqlite_schema WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name").all().map(row=>row.name);
    const counts={};
    for(const name of tables) {
      if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(name)) throw Error('Unexpected database table name');
      counts[name]=db.prepare('SELECT COUNT(*) AS n FROM '+name).get().n;
    }
    const head=db.prepare('SELECT version, impact_version FROM catalog_head WHERE id=1').get();
    if (!head || !Number.isSafeInteger(head.version) || !Number.isSafeInteger(head.impact_version)) throw Error('Missing catalog head');
    const result={sha256:createHash('sha256').update(bytes).digest('hex'),bytes:bytes.length,integrity:'ok',tables,counts,head:{...head}};
    fs.writeFileSync(metadata,JSON.stringify(result,null,2)+'\n',{flag:'wx',mode:0o600});
    return result;
  } finally { db?.close(); }
}

if(process.argv[1] && path.resolve(process.argv[1])===fileURLToPath(import.meta.url)) {
  try {
    if(process.argv.length!==5) throw Error('Usage: node scripts/verify_d1_export.mjs EXPORT.sql NEW.sqlite NEW.json');
    const result=verifyD1Export({source:process.argv[2],destination:process.argv[3],metadata:process.argv[4]});
    console.log(JSON.stringify({integrity:result.integrity,tableCount:result.tables.length,head:result.head,bytes:result.bytes}));
  } catch(error) {
    // SQLite messages can contain SQL text and private rows; don't print them.
    console.error('D1 export restore/verification failed. Preserve the artifacts and inspect them privately.');process.exitCode=1;
  }
}
