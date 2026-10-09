import english from '../../localization/ui.en.json' with { type: 'json' };
import sourceTerms from '../../localization/game-terms.ru.json' with { type: 'json' };
import approved from '../../localization/approved-translations.v1.json' with { type: 'json' };
import { baselineRecords } from './catalog-baseline.mjs';
import { CatalogError } from './catalog-model.mjs';
import { jsonResponse } from './auth.mjs';

const LOCALES = ['ru','en','jp','tw'];
const fail = (message,status=400) => {throw new CatalogError(message,status);};
const registry = new Map();
const keyOf=(scope,id)=>scope+'\0'+id;
const src=(source,approvedValue={})=>Object.fromEntries(LOCALES.map(locale=>[
  locale,approvedValue[locale] || source[locale] || (locale==='ru'?source.en:'') || ''
]));
for (const [id,en] of Object.entries(english))
  registry.set(keyOf('ui',id),{scope:'ui',id,kind:'interface',source:{en},baseline:src({en},Object.fromEntries(LOCALES.map(locale=>[locale,approved.ui[locale]?.[id]])))});
for (const term of sourceTerms.terms) {
  const original={en:term.source_en,jp:term.source_jp,tw:term.source_tw};
  const migrated=Object.fromEntries(LOCALES.map(locale=>[locale,approved.game[locale]?.[term.id]]));
  registry.set(keyOf('game',term.id),{scope:'game',id:term.id,kind:term.category,source:original,baseline:src(original,migrated)});
}
// Structured catalog descriptions were not exposed as workbook rows. Give them
// stable editable IDs without treating numeric stats as translations.
for (const record of baselineRecords) {
  if (!['equipment','soul','class','racial','active','passive'].includes(record.kind))continue;
  const fields=record.kind==='equipment'||record.kind==='soul'
    ? {description:'option',notes:'special_option',acquisition:'acquisition',modifiers:'modifier'}
    : {};
  for (const [field,sourceField] of Object.entries(fields)) {
    const id=record.id+'.'+field,k=keyOf('game',id),values=record[sourceField];
    if (registry.has(k)||!values||!Object.values(values).some(Boolean))continue;
    registry.set(k,{scope:'game',id,kind:record.kind+'.'+field,
      source:{en:values.en||'',jp:values.jp||'',tw:values.tw||''},
      baseline:src(values)});
  }
}
const RECORDS=[...registry.values()].sort((a,b)=>a.scope.localeCompare(b.scope)||a.id.localeCompare(b.id));
const isText=s=>typeof s==='string' && s.length<=4000 && !/[\x00-\x09\x0b-\x1f\x7f<>]/.test(s);
const slots=s=>(s.match(/\{[A-Za-z0-9_]+\}/g)||[]).sort().join('|');
async function overrides(env) {
  return (await env.DB.prepare('SELECT scope, term_id, locale, text, version, updated_at FROM localization_overrides').all()).results;
}
function overlayMap(rows) {
  return new Map(rows.map(row=>[keyOf(row.scope,row.term_id)+'\0'+row.locale,row]));
}
async function legacyOverrides(env) {
  const [ui,result,head]=await Promise.all([
    env.DB.prepare('SELECT locale,id,text FROM ui_translation_overrides WHERE text <> ?').bind('').all(),
    env.DB.prepare('SELECT id,ru FROM result_label_overrides').all(),
    env.DB.prepare('SELECT snapshot_json FROM catalog_head WHERE id=1').first()
  ]);
  const values=new Map();
  for(const row of ui.results) values.set(keyOf('ui',row.id)+'\0'+row.locale,row.text);
  for(const row of result.results) values.set(keyOf('game',row.id)+'\0ru',row.ru);
  for(const entry of JSON.parse(head?.snapshot_json||'[]')) {
    const edit=entry.edit||{},id=entry.identity?.id;
    if (!id)continue;
    const add=(term,fields)=> {
      for(const locale of LOCALES) if(fields?.[locale])
        values.set(keyOf('game',term)+'\0'+locale,fields[locale]);
    };
    add(id,edit.names);
    if (entry.identity.kind==='active'||entry.identity.kind==='passive')
      add('skill_detail.'+entry.identity.category+'.'+entry.identity.index+'.3',edit.description);
    else if(entry.identity.kind==='equipment'||entry.identity.kind==='soul') {
      for(const field of ['description','notes','acquisition','modifiers'])
        add(id+'.'+field,edit[field]);
    }
  }
  return values;
}

export async function publicLocalization(env) {
  const published=await overrides(env);
  const data={ui:{ru:{},en:{},jp:{},tw:{}},game:{ru:{},en:{},jp:{},tw:{}}};
  for(const row of published) {
    if(row.text && registry.has(keyOf(row.scope,row.term_id)) &&
       LOCALES.includes(row.locale) && isText(row.text))
      data[row.scope][row.locale][row.term_id]=row.text;
  }
  return jsonResponse({ok:true,schemaVersion:1,overrides:data});
}

async function parseInput(request) {
  if(!(request.headers.get('content-type')||'').startsWith('application/json'))fail('JSON required',415);
  if(Number(request.headers.get('content-length')||0)>10000)fail('Request too large',413);
  const raw=await request.text();
  if(new TextEncoder().encode(raw).length>10000)fail('Request too large',413);
  try {return JSON.parse(raw);}catch{fail('Invalid JSON');}
}
export async function adminLocalization(request,env) {
  if(request.method==='GET'){
    const url=new URL(request.url),scope=url.searchParams.get('scope')||'game',
      locale=url.searchParams.get('locale')||'ru',q=(url.searchParams.get('q')||'').trim().toLocaleLowerCase(),
      pageText=url.searchParams.get('page')||'0';
    if(!['game','ui'].includes(scope)||!LOCALES.includes(locale)||q.length>120||
       !/^\d{1,5}$/.test(pageText))fail('Invalid search filters');
    const page=Number(pageText),pageSize=40;
    const [newRows,legacy]=await Promise.all([overrides(env),legacyOverrides(env)]);
    const index=overlayMap(newRows);
    const matched=RECORDS.filter(row=>row.scope===scope && (
      !q || [row.id,row.kind,row.source.en,row.baseline[locale]].some(value=>String(value||'').toLocaleLowerCase().includes(q))));
    const items=matched.slice(page*pageSize,(page+1)*pageSize).map(row=>{
      const key=keyOf(scope,row.id)+'\0'+locale, override=index.get(key),older=legacy.get(key)||'';
      return {id:row.id,scope,kind:row.kind,locale,source:row.source,baseline:row.baseline[locale],
        effective:override?.text || older || row.baseline[locale],
        legacyValue:older,override:override?.text||'',version:override?.version||0,
        updatedAt:override?.updated_at||null,
        origin:override?.text?'admin':older?'previous-admin':'import'};
    });
    return jsonResponse({ok:true,schemaVersion:1,locale,scope,page,pageSize,total:matched.length,
      counts:{ui:RECORDS.filter(r=>r.scope==='ui').length,game:RECORDS.filter(r=>r.scope==='game').length},
      items});
  }
  if(request.method!=='POST')return jsonResponse({ok:false,message:'Method not allowed'},405);
  const input=await parseInput(request);
  if(!input || Array.isArray(input) || typeof input!=='object'||
    Object.keys(input).sort().join(',')!=='expectedVersion,id,locale,scope,value'||
    !['ui','game'].includes(input.scope)||!LOCALES.includes(input.locale)||
    !registry.has(keyOf(input.scope,input.id))||!isText(input.value)||
    !Number.isSafeInteger(input.expectedVersion)||input.expectedVersion<0||input.expectedVersion>1000000000)
    fail('Invalid translation edit');
  const entry=registry.get(keyOf(input.scope,input.id)),value=input.value.trim();
  if(input.scope==='ui' && value && slots(value)!==slots(entry.source.en))
    fail('Template placeholders must match the source');
  const existing=await env.DB.prepare('SELECT text,version FROM localization_overrides WHERE scope=? AND term_id=? AND locale=?')
    .bind(input.scope,input.id,input.locale).first();
  const version=existing?.version||0;
  if(version!==input.expectedVersion)fail('Translation changed elsewhere; refresh before saving',409);
  if(existing?.text===value||(!existing&&!value))
    return jsonResponse({ok:true,scope:input.scope,id:input.id,locale:input.locale,version,override:value});
  const stamp=Math.floor(Date.now()/1000);
  if(existing){
    const update=await env.DB.prepare(
      'UPDATE localization_overrides SET text=?,version=version+1,updated_at=? WHERE scope=? AND term_id=? AND locale=? AND version=?'
    ).bind(value,stamp,input.scope,input.id,input.locale,version).run();
    if(update.meta.changes!==1)fail('Concurrent edit',409);
  }else{
    const insert=await env.DB.prepare(
      'INSERT OR IGNORE INTO localization_overrides(scope,term_id,locale,text,version,updated_at) VALUES (?,?,?,?,1,?)'
    ).bind(input.scope,input.id,input.locale,value,stamp).run();
    if(insert.meta.changes!==1)fail('Concurrent edit',409);
  }
  return jsonResponse({ok:true,scope:input.scope,id:input.id,locale:input.locale,version:version+1,override:value});
}
