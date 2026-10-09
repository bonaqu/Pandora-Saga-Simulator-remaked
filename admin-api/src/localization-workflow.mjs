import { CatalogError } from './catalog-model.mjs';
import { jsonResponse } from './auth.mjs';
import { localizationEntry, localizationEffectiveSnapshot } from './localization.mjs';

const fail=(msg,status=400)=>{throw new CatalogError(msg,status);};
const validText=value=>typeof value==='string'&&value.length<=4000&&!/[\x00-\x09\x0b-\x1f\x7f<>]/.test(value);
const validId=value=>typeof value==='string'&&value.length>0&&value.length<=160;
const validVersion=value=>Number.isSafeInteger(value)&&value>=0;
const slots=value=>(value.match(/\{[A-Za-z0-9_]+\}/g)||[]).sort().join('|');
const validIdentity=x=>x&&typeof x==='object'&&!Array.isArray(x)&&
  ['ui','game'].includes(x.scope)&&['ru','en','jp','tw'].includes(x.locale)&&validId(x.id)&&
  /^[a-z][a-z0-9._-]{0,159}$/.test(x.id);
const identityKey=x=>x.scope+'\0'+x.id+'\0'+x.locale;
const SQL_ERROR_GUARD="json_extract('INVALID-OPERATION','$')";
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function inputBody(request){
  if(!(request.headers.get('content-type')||'').startsWith('application/json'))fail('JSON required',415);
  if(Number(request.headers.get('content-length')||0)>65536)fail('Request too large',413);
  const text=await request.text();
  if(new TextEncoder().encode(text).length>65536)fail('Request too large',413);
  try{return JSON.parse(text);}catch{fail('Invalid JSON');}
}
function shape(data,fields){
  if(!data||typeof data!=='object'||Array.isArray(data)||
    Object.keys(data).sort().join(',')!==fields.slice().sort().join(','))fail('Invalid translation workflow request');
}
function textCheck(identity,value,entry){
  if(!validText(value)||!value.trim())fail('Translation must contain safe nonempty text');
  entry=entry||localizationEntry(identity.scope,identity.id);
  if(!entry)fail('Unknown translation ID',404);
  if(identity.scope==='ui'&&slots(value)!==slots(entry.source.en))fail('Template placeholders must match original');
  return value.trim();
}
function handleError(error){
  if(error instanceof CatalogError)throw error;
  // D1 transaction rollback covers the whole statement batch (including
  // operation receipt and history trigger inserts).
  throw new CatalogError('Another editor changed the data during publication; refresh before retrying',409);
}

async function getDrafts(env){
  const rows=(await env.DB.prepare("SELECT scope,term_id AS id,locale,text,version,source_version AS sourceVersion,source_text AS sourceText,updated_at AS updatedAt FROM localization_drafts ORDER BY updated_at DESC,scope,term_id,locale LIMIT 501").all()).results;
  if(rows.length>500)fail('More than 500 drafts; narrow the queue before publishing',413);
  return jsonResponse({ok:true,count:rows.length,maxBatch:50,items:rows});
}
async function saveDraft(request,env){
  const body=await inputBody(request);
  shape(body,['scope','id','locale','value','expectedVersion','expectedEffective','expectedDraftVersion']);
  if(!validIdentity(body)||!validVersion(body.expectedVersion)||
     !validVersion(body.expectedDraftVersion)||!validText(body.expectedEffective))fail('Invalid translation draft');
  const state=(await localizationEffectiveSnapshot(env)).get(body.scope,body.id,body.locale);
  const value=textCheck(body,body.value,state?.entry);
  if(!state||state.version!==body.expectedVersion||state.effective!==body.expectedEffective)
    fail('Translation changed elsewhere; refresh before saving draft',409);
  const prior=await env.DB.prepare('SELECT version,source_version,source_text FROM localization_drafts WHERE scope=? AND term_id=? AND locale=?')
    .bind(body.scope,body.id,body.locale).first();
  if((prior?.version||0)!==body.expectedDraftVersion)fail('Draft changed in another tab',409);
  const stamp=Math.floor(Date.now()/1000);
  let result;
  if(prior){
    if(prior.source_version!==body.expectedVersion||prior.source_text!==body.expectedEffective)
      fail('Draft is based on an older published value; refresh before continuing',409);
    result=await env.DB.prepare('UPDATE localization_drafts SET text=?,version=version+1,updated_at=? WHERE scope=? AND term_id=? AND locale=? AND version=? AND source_version=?')
      .bind(value,stamp,body.scope,body.id,body.locale,body.expectedDraftVersion,body.expectedVersion).run();
  }else{
    result=await env.DB.prepare('INSERT OR IGNORE INTO localization_drafts(scope,term_id,locale,text,version,source_version,source_text,updated_at) VALUES(?,?,?,?,1,?,?,?)')
      .bind(body.scope,body.id,body.locale,value,body.expectedVersion,body.expectedEffective,stamp).run();
  }
  if(result.meta.changes!==1)fail('Draft changed during save; refresh',409);
  return jsonResponse({ok:true,id:body.id,scope:body.scope,locale:body.locale,version:body.expectedDraftVersion+1,text:value});
}
async function discardDraft(request,env){
  const body=await inputBody(request);shape(body,['scope','id','locale','expectedDraftVersion']);
  if(!validIdentity(body)||!validVersion(body.expectedDraftVersion)||body.expectedDraftVersion===0)fail('Invalid draft reset');
  const result=await env.DB.prepare('DELETE FROM localization_drafts WHERE scope=? AND term_id=? AND locale=? AND version=?')
    .bind(body.scope,body.id,body.locale,body.expectedDraftVersion).run();
  if(result.meta.changes!==1)fail('Draft changed; refresh before resetting',409);
  return jsonResponse({ok:true,removed:1});
}
async function history(request,env){
  const p=new URL(request.url).searchParams,
    scope=p.get('scope'),id=p.get('id'),locale=p.get('locale'),page=p.get('page')||'0';
  if(!validIdentity({scope,id,locale})||!/^\d{1,3}$/.test(page)||Number(page)>100)fail('Invalid history filters');
  const rows=(await env.DB.prepare('SELECT sequence,previous_text AS before,published_text AS after,version,published_at AS publishedAt FROM localization_history WHERE scope=? AND term_id=? AND locale=? ORDER BY sequence DESC LIMIT 50 OFFSET ?')
    .bind(scope,id,locale,Number(page)*50).all()).results;
  return jsonResponse({ok:true,scope,id,locale,page:Number(page),items:rows,historyStartsAtMigration:true});
}
async function operation(request,env){
  const operationId=new URL(request.url).searchParams.get('operationId');
  if(!uuid.test(operationId||''))fail('Invalid publication ID');
  const row=await env.DB.prepare('SELECT receipt_json FROM localization_operations WHERE operation_id=?').bind(operationId).first();
  return jsonResponse({ok:true,found:Boolean(row),receipt:row?JSON.parse(row.receipt_json):null});
}
async function publishBatch(request,env){
  const body=await inputBody(request);shape(body,['operationId','items']);
  if(!uuid.test(body.operationId)||!Array.isArray(body.items)||
     !body.items.length||body.items.length>50)fail('Select 1–50 translations');
  const previous=await env.DB.prepare('SELECT receipt_json FROM localization_operations WHERE operation_id=?')
    .bind(body.operationId).first();
  if(previous)return jsonResponse(JSON.parse(previous.receipt_json));
  const seen=new Set(),validated=[];
  const snapshot=await localizationEffectiveSnapshot(env);
  const catalogRevision=(await env.DB.prepare('SELECT version FROM catalog_head WHERE id=1').first())?.version;
  for(const requestItem of body.items){
    if(!validIdentity(requestItem))fail('Invalid translation identity');
    const key=identityKey(requestItem);
    if(seen.has(key))fail('Duplicate translation identity');seen.add(key);
    const draftMode=Object.hasOwn(requestItem,'expectedDraftVersion');
    if(draftMode)shape(requestItem,['scope','id','locale','expectedDraftVersion']);
    else shape(requestItem,['scope','id','locale','expectedVersion','expectedEffective','value']);
    const state=snapshot.get(requestItem.scope,requestItem.id,requestItem.locale);
    if(!state)fail('Unknown translation',404);
    let value,draftVersion=null;
    if(draftMode){
      if(!validVersion(requestItem.expectedDraftVersion)||requestItem.expectedDraftVersion===0)
        fail('Invalid draft version');
      const saved=await env.DB.prepare('SELECT text,version,source_version,source_text FROM localization_drafts WHERE scope=? AND term_id=? AND locale=?')
        .bind(requestItem.scope,requestItem.id,requestItem.locale).first();
      if(!saved||saved.version!==requestItem.expectedDraftVersion||
        saved.source_version!==state.version||saved.source_text!==state.effective)
        fail('Draft changed or published value is newer: '+requestItem.id,409);
      value=textCheck(requestItem,saved.text,state.entry);draftVersion=saved.version;
    }else{
      if(!validVersion(requestItem.expectedVersion)||!validText(requestItem.expectedEffective)||
        state.version!==requestItem.expectedVersion||state.effective!==requestItem.expectedEffective)
        fail('Translation changed: '+requestItem.id,409);
      const pending=await env.DB.prepare('SELECT version FROM localization_drafts WHERE scope=? AND term_id=? AND locale=?')
        .bind(requestItem.scope,requestItem.id,requestItem.locale).first();
      if(pending)fail('Stored draft exists for '+requestItem.id+'; review the draft first',409);
      value=textCheck(requestItem,requestItem.value,state.entry);
    }
    if(value===state.effective)fail('Translation already matches published text: '+requestItem.id);
    validated.push({scope:requestItem.scope,id:requestItem.id,locale:requestItem.locale,
      value,sourceVersion:state.version,draftVersion});
  }
  const now=Math.floor(Date.now()/1000);
  const receipt={ok:true,operationId:body.operationId,count:validated.length,
    items:validated.map(x=>({scope:x.scope,id:x.id,locale:x.locale,version:x.sourceVersion+1}))};
  const statements=[env.DB.prepare('INSERT INTO localization_operations(operation_id,receipt_json,created_at) VALUES(?,?,?)')
    .bind(body.operationId,JSON.stringify(receipt),now)];
  for(const row of validated){
    if(row.sourceVersion===0){
      statements.push(env.DB.prepare('INSERT INTO localization_overrides(scope,term_id,locale,text,version,updated_at,last_operation) VALUES(?,?,?,?,1,?,?)')
        .bind(row.scope,row.id,row.locale,row.value,now,body.operationId));
    }else{
      statements.push(env.DB.prepare('UPDATE localization_overrides SET text=?,version=version+1,updated_at=?,last_operation=? WHERE scope=? AND term_id=? AND locale=? AND version=?')
        .bind(row.value,now,body.operationId,row.scope,row.id,row.locale,row.sourceVersion));
    }
    if(row.draftVersion!==null){
      statements.push(env.DB.prepare('DELETE FROM localization_drafts WHERE scope=? AND term_id=? AND locale=? AND version=? AND source_version=?')
        .bind(row.scope,row.id,row.locale,row.draftVersion,row.sourceVersion));
    }
    const goneDraft=row.draftVersion!==null
      ? ' AND NOT EXISTS(SELECT 1 FROM localization_drafts WHERE scope=? AND term_id=? AND locale=?)'
      : ' AND NOT EXISTS(SELECT 1 FROM localization_drafts WHERE scope=? AND term_id=? AND locale=?)';
    // sqlite's conditional malformed-json guard raises an actual statement
    // error. D1 batch then rolls back ALL writes, receipts and history rows.
    const guard='SELECT CASE WHEN EXISTS(SELECT 1 FROM localization_overrides WHERE scope=? AND term_id=? AND locale=? AND version=? AND text=? AND last_operation=?)'+goneDraft+
      ' AND (SELECT version FROM catalog_head WHERE id=1)=? THEN 1 ELSE '+SQL_ERROR_GUARD+' END';
    statements.push(env.DB.prepare(guard).bind(row.scope,row.id,row.locale,row.sourceVersion+1,row.value,body.operationId,
      row.scope,row.id,row.locale,catalogRevision));
  }
  try{await env.DB.batch(statements);}catch(error){
    const recovered=await env.DB.prepare('SELECT receipt_json FROM localization_operations WHERE operation_id=?')
      .bind(body.operationId).first();
    if(recovered)return jsonResponse(JSON.parse(recovered.receipt_json));
    handleError(error);
  }
  return jsonResponse(receipt);
}

export async function adminLocalizationWorkflow(request,env){
  const path=new URL(request.url).pathname;
  if(path==='/api/admin/localization/drafts'&&request.method==='GET')return getDrafts(env);
  if(path==='/api/admin/localization/draft'&&request.method==='POST')return saveDraft(request,env);
  if(path==='/api/admin/localization/draft'&&request.method==='DELETE')return discardDraft(request,env);
  if(path==='/api/admin/localization/history'&&request.method==='GET')return history(request,env);
  if(path==='/api/admin/localization/operations'&&request.method==='GET')return operation(request,env);
  if(path==='/api/admin/localization/publish-batch'&&request.method==='POST')return publishBatch(request,env);
  return jsonResponse({ok:false,message:'Not found'},404);
}
