import { createHash, createHmac } from 'node:crypto';
import { jsonResponse } from './auth.mjs';

// Public shared builds are intentionally readable by anyone with a link.
// Only a bounded, validated S1 share code is stored. Never persist personal
// information, session cookies, account data, or raw IP addresses.
const TOKEN=/^[A-Za-z0-9_-]{12}$/;
const CODE=/^S1\.[A-Za-z0-9_-]{10,6000}$/;
const MAX_BODY=8200;
const fail=(message,status=400)=>jsonResponse({ok:false,message},status);
const digest=code=>createHash('sha256').update(code,'utf8').digest();
const slugOf=code=>digest(code).subarray(0,9).toString('base64url');
const hashBucket=(pepper,key)=>createHmac('sha256',pepper).update('public-share\0'+key).digest('hex');

function validCode(code){
  if(typeof code!=='string'||!CODE.test(code))return false;
  try{
    const base64=code.slice(3),bytes=Buffer.from(base64,'base64url');
    return bytes.length>3&&bytes.length<=4500&&bytes[0]===1&&
      bytes.toString('base64url')===base64;
  }catch{return false;}
}

async function limitedBody(request){
  if(!(request.headers.get('Content-Type')||'').toLowerCase().startsWith('application/json'))
    return {error:fail('JSON required',415)};
  if(Number(request.headers.get('Content-Length')||0)>MAX_BODY)
    return {error:fail('Share code too long',413)};
  // Byte length limits apply even when Content-Length is absent or forged.
  const reader=request.body?.getReader();
  if(!reader)return {error:fail('Missing share code')};
  let length=0;const chunks=[];
  while(true){
    const {done,value}=await reader.read();if(done)break;
    length+=value.byteLength;
    if(length>MAX_BODY){await reader.cancel();return {error:fail('Share code too long',413)};}
    chunks.push(value);
  }
  try{
    const json=JSON.parse(Buffer.concat(chunks.map(part=>Buffer.from(part))).toString('utf8'));
    if(!json||Array.isArray(json)||Object.keys(json).sort().join(',')!=='code'||
       !validCode(json.code))return {error:fail('Invalid share code')};
    return {code:json.code};
  }catch{return {error:fail('Invalid JSON')};}
}
async function consume(env,key,now,windowSeconds,max){
  const windowStart=Math.floor(now/windowSeconds)*windowSeconds;
  const row=await env.DB.prepare(`INSERT INTO public_share_limits(bucket_id,window_start,hits)
    VALUES(?,?,1) ON CONFLICT(bucket_id) DO UPDATE SET
    hits=CASE WHEN public_share_limits.window_start=excluded.window_start
      THEN public_share_limits.hits+1 ELSE 1 END,
    window_start=excluded.window_start RETURNING hits`)
    .bind(hashBucket(env.AUTH_PEPPER,key),windowStart).first();
  if(row.hits===1&&key==='global')
    await env.DB.prepare('DELETE FROM public_share_limits WHERE window_start < ?')
      .bind(now-86400).run();
  return row.hits<=max;
}

export async function sharedBuild(request,env,now=Math.floor(Date.now()/1000)){
  const path=new URL(request.url).pathname;
  if(path==='/api/share'){
    if(request.method!=='POST')return fail('Method not allowed',405);
    if(request.headers.get('Origin')!==env.PUBLIC_ORIGIN)
      return fail('Sharing is available only from the simulator',403);
    const body=await limitedBody(request);if(body.error)return body.error;
    const code=body.code,slug=slugOf(code);
    const existing=await env.DB.prepare('SELECT code FROM public_build_shares WHERE slug=?')
      .bind(slug).first();
    if(existing){
      if(existing.code!==code)return fail('Share identifier collision; try again',409);
      return jsonResponse({ok:true,slug,reused:true});
    }
    // Anonymous writes are bounded globally and by a privacy-preserving hash.
    // If unavailable, the website offers an offline (longer) S1 link instead.
    const ip=request.headers.get('CF-Connecting-IP');
    if(!ip||typeof env.AUTH_PEPPER!=='string'||env.AUTH_PEPPER.length<32)
      return fail('Short links temporarily unavailable',503);
    if(!(await consume(env,'global',now,600,150))||
       !(await consume(env,'ip:'+ip,now,600,15)))
      return fail('Too many share requests; try again later',429);
    const saved=await env.DB.prepare(
      'INSERT OR IGNORE INTO public_build_shares(slug,code,created_at) VALUES(?,?,?)')
      .bind(slug,code,now).run();
    const found=await env.DB.prepare('SELECT code FROM public_build_shares WHERE slug=?')
      .bind(slug).first();
    if(!found||found.code!==code)return fail('Share could not be saved safely',409);
    return jsonResponse({ok:true,slug,reused:saved.meta.changes===0});
  }
  const match=/^\/api\/share\/([A-Za-z0-9_-]{12})$/.exec(path);
  if(match){
    if(request.method!=='GET')return fail('Method not allowed',405);
    const entry=await env.DB.prepare('SELECT code FROM public_build_shares WHERE slug=?')
      .bind(match[1]).first();
    if(!entry)return fail('Shared build not found',404);
    return jsonResponse({ok:true,code:entry.code});
  }
  return fail('Not found',404);
}
