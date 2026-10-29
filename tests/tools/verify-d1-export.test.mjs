import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { verifyD1Export } from '../../scripts/verify_d1_export.mjs';

test('private restore validates SQLite, preserves the source and refuses existing artifacts',()=>{
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'pandora-d1-restore-'));
  try {
    const source=path.join(dir,'backup.sql'),destination=path.join(dir,'restored.sqlite'),metadata=path.join(dir,'report.json');
    const sql='CREATE TABLE catalog_head(id INTEGER PRIMARY KEY,version INTEGER,impact_version INTEGER);'+
      'INSERT INTO catalog_head VALUES(1,92,92);CREATE TABLE catalog_revisions(version INTEGER PRIMARY KEY);'+
      'INSERT INTO catalog_revisions VALUES(91),(92);';
    fs.writeFileSync(source,sql);
    const result=verifyD1Export({source,destination,metadata});
    assert.equal(result.integrity,'ok');assert.deepEqual(result.head,{version:92,impact_version:92});
    assert.deepEqual(result.tables,['catalog_head','catalog_revisions']);assert.equal(result.counts.catalog_revisions,2);
    assert.equal(fs.readFileSync(source,'utf8'),sql);
    const db=new DatabaseSync(destination,{readOnly:true});
    assert.equal(db.prepare('SELECT version FROM catalog_head').get().version,92);db.close();
    const original=fs.readFileSync(metadata,'utf8');
    assert.throws(()=>verifyD1Export({source,destination,metadata}),/new and distinct/);
    assert.equal(fs.readFileSync(metadata,'utf8'),original);
    assert.throws(()=>verifyD1Export({source,destination:source,metadata:path.join(dir,'other.json')}),/new and distinct/);
  } finally { fs.rmSync(dir,{recursive:true,force:true}); }
});

test('revision comparison checks every snapshot and metadata without printing contents',()=>{
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'pandora-d1-compare-'));
  try {
    const database=path.join(dir,'backup.sqlite'), db=new DatabaseSync(database);
    db.exec('CREATE TABLE catalog_revisions(version INTEGER PRIMARY KEY,impact_version INTEGER,snapshot_json TEXT,created_at INTEGER,note TEXT)');
    db.prepare('INSERT INTO catalog_revisions VALUES(?,?,?,?,?)').run(1,1,'private-snapshot-one',100,'private-note');
    db.prepare('INSERT INTO catalog_revisions VALUES(?,?,?,?,?)').run(2,2,'private-snapshot-two',200,'private-note');db.close();
    const rows=[{version:1,impact_version:1,snapshot_json:'private-snapshot-one',created_at:100,note:'private-note'},
      {version:2,impact_version:2,snapshot_json:'private-snapshot-two',created_at:200,note:'private-note'}];
    function run(data){return spawnSync(process.execPath,[fileURLToPath(new URL('../../scripts/compare_d1_revisions.mjs',import.meta.url)),database,'1','2'],
      {input:JSON.stringify([{success:true,results:data}]),encoding:'utf8'});}
    const good=run(rows);assert.equal(good.status,0);assert.deepEqual(JSON.parse(good.stdout).differences,[]);
    const wrong=structuredClone(rows);wrong[1].snapshot_json='other-secret';
    const changed=run(wrong);assert.equal(changed.status,1);assert.deepEqual(JSON.parse(changed.stdout).differences,[2]);
    assert.doesNotMatch(changed.stdout+changed.stderr,/private-|other-secret/);
    assert.equal(run(rows.slice(0,1)).status,1);
  } finally {fs.rmSync(dir,{recursive:true,force:true});}
});
