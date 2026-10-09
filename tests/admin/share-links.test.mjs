import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import worker from '../../admin-api/src/worker.mjs';
const origin='https://pandora-saga-simulator-remaked-admin-api.bonaqu.workers.dev';
const pages='https://bonaqu.github.io';
const pepper='synthetic-test-pepper-do-not-use-in-production-123456';
function fixture(){
  const sqlite=new DatabaseSync(':memory:');
  sqlite.exec(fs.readFileSync(new URL('../../admin-api/migrations/0010_public_share_links.sql',import.meta.url),'utf8'));
  const DB={prepare(sql){
    let args=[];
    return {bind(...v){args=v;return this;},
      async first(){return sqlite.prepare(sql).get(...args)||null;},
      async run(){return {meta:{changes:Number(sqlite.prepare(sql).run(...args).changes)}};}
    };
  }};
  return {sqlite,env:{DB,PUBLIC_ORIGIN:pages,ADMIN_ORIGIN:origin,AUTH_PEPPER:pepper}};
}
const validCode='S1.'+Buffer.from([1,0,1,2,123,125,0,1]).toString('base64url');
function request(code=validCode,options={}){
  return new Request(origin+'/api/share',{
    method:'POST',headers:{Origin:pages,'Content-Type':'application/json','CF-Connecting-IP':'192.0.2.17',...options.headers},
    body:options.raw||JSON.stringify({code})
  });
}
test('short code resolves across anonymous sessions and is idempotent',async()=>{
  const {sqlite,env}=fixture();
  const first=await worker.fetch(request(),env);
  assert.equal(first.status,200);
  const created=await first.json();
  assert.match(created.slug,/^[A-Za-z0-9_-]{12}$/);
  assert.equal(created.reused,false);
  const again=await (await worker.fetch(request(),env)).json();
  assert.equal(again.slug,created.slug);
  assert.equal(again.reused,true);
  assert.equal(sqlite.prepare('SELECT count(*) AS n FROM public_build_shares').get().n,1);
  const resolved=await worker.fetch(new Request(origin+'/api/share/'+created.slug,{headers:{Origin:pages}}),env);
  assert.equal(resolved.status,200);
  assert.equal(resolved.headers.get('Access-Control-Allow-Origin'),pages);
  assert.equal((await resolved.json()).code,validCode);
  assert.equal((await worker.fetch(new Request(origin+'/api/share/ABCDEFGHIJKL'),env)).status,404);
});
test('only exact Pages origin may create links and CORS remains narrow',async()=>{
  const {env,sqlite}=fixture();
  for(const bad of ['https://evil.example',pages+'.evil.example','null','']){
    const result=await worker.fetch(request(validCode,{headers:{Origin:bad}}),env);
    assert.equal(result.status,403);
  }
  assert.equal(sqlite.prepare('SELECT count(*) AS n FROM public_build_shares').get().n,0);
  for(const path of ['/api/share','/api/share/ABCDEFGHIJKL']){
    const allow=await worker.fetch(new Request(origin+path,{method:'OPTIONS',
      headers:{Origin:pages,'Access-Control-Request-Method':path==='/api/share'?'POST':'GET',
        'Access-Control-Request-Headers':'Content-Type'}}),env);
    assert.equal(allow.status,204);
    const blocked=await worker.fetch(new Request(origin+path,{method:'OPTIONS',
      headers:{Origin:'https://evil.example','Access-Control-Request-Method':'POST'}}),env);
    assert.equal(blocked.status,403);
  }
});
test('invalid, oversized and malicious anonymous codes never reach storage',async()=>{
  const {env,sqlite}=fixture();
  const invalid=['S1.%%%%','S1.'+'A'.repeat(6200),'PS3:123:1,2,3','S1.AAAAAAAA',''];
  for(const code of invalid){
    const result=await worker.fetch(request(code),env);
    assert.ok([400,413].includes(result.status),'bad code '+code.slice(0,16));
  }
  const huge=await worker.fetch(request(undefined,{raw:JSON.stringify({code:'x'.repeat(9000)})}),env);
  assert.equal(huge.status,413);
  assert.equal(sqlite.prepare('SELECT count(*) AS n FROM public_build_shares').get().n,0);
});
test('per-IP public share write limit is enforced, with no raw IP stored',async()=>{
  const {env,sqlite}=fixture();
  for(let n=0;n<15;n++){
    const code='S1.'+Buffer.from([1,n,1,2,123,125,0,1]).toString('base64url');
    const resp=await worker.fetch(request(code),env);
    assert.equal(resp.status,200,'index '+n);
  }
  const extra='S1.'+Buffer.from([1,99,1,2,123,125,0,1]).toString('base64url');
  const denied=await worker.fetch(request(extra),env);
  assert.equal(denied.status,429);
  assert.equal(sqlite.prepare('SELECT count(*) AS n FROM public_build_shares').get().n,15);
  assert.ok(sqlite.prepare('SELECT bucket_id FROM public_share_limits').all()
    .every(({bucket_id})=>/^[a-f0-9]{64}$/.test(bucket_id)));
});
