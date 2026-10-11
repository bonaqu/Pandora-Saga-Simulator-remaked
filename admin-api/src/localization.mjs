import english from '../../localization/ui.en.json' with { type: 'json' };
import sourceTerms from '../../localization/game-terms.ru.json' with { type: 'json' };
import approved from '../../localization/approved-translations.v1.json' with { type: 'json' };
import curated from '../../localization/curated-runtime-defaults.ru.v1.json' with { type: 'json' };
import guildSkills from '../../localization/guild-skills.v1.json' with { type: 'json' };
import { baselineRecords, baselineById } from './catalog-baseline.mjs';
import { CatalogError } from './catalog-model.mjs';
import { jsonResponse } from './auth.mjs';

const LOCALES = ['ru','en','jp','tw'];
const fail = (message,status=400) => {throw new CatalogError(message,status);};
const registry = new Map();
// Distinguish a real localized baseline from an English fallback. Never label
// source-language text as an approved translation on an untranslated locale.
const originOf=(source,approvedValue={})=>Object.fromEntries(LOCALES.map(locale=>[
  locale,(approvedValue[locale] || source[locale]) ? 'import' : 'fallback'
]));
// The public Modern client already displays these curated Russian fallbacks.
// Include their existing wording in the admin baseline without modifying the
// immutable historical approved JSON or shadowing any published D1 value.
function migratedBaseline(scope,id) {
  const values=Object.fromEntries(LOCALES.map(locale=>[locale,approved[scope][locale]?.[id]]));
  const approvedCorrection=curated.ru[scope]?.[id]||'';
  // This historical mixed RU/EN help was already corrected in Modern. Make
  // the approved baseline identical in Admin; D1 remains authoritative.
  if(approvedCorrection && (!values.ru || (scope==='ui' && id==='skills.help')))
    values.ru=approvedCorrection;
  return values;
}
const keyOf=(scope,id)=>scope+'\0'+id;
const src=(source,approvedValue={})=>Object.fromEntries(LOCALES.map(locale=>[
  locale,approvedValue[locale] || source[locale] || (locale==='ru'?source.en:'') || ''
]));
for (const [id,en] of Object.entries(english)) {
  const migrated=migratedBaseline('ui',id);
  registry.set(keyOf('ui',id),{scope:'ui',id,kind:'interface',source:{en},
    baseline:src({en},migrated),baselineOrigin:originOf({en},migrated)});
}
for (const term of sourceTerms.terms) {
  const original={en:term.source_en,jp:term.source_jp,tw:term.source_tw};
  const migrated=migratedBaseline('game',term.id);
  registry.set(keyOf('game',term.id),{scope:'game',id:term.id,kind:term.category,source:original,
    baseline:src(original,migrated),baselineOrigin:originOf(original,migrated)});
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
      baseline:src(values),baselineOrigin:originOf(values)});
  }
}
// Per-level descriptions are the same approved EN/RU texts shown in Modern.
// D1 edits remain canonical overrides; adding registry rows does not publish
// a second copy or rewrite unrelated translations.
for (const [index,skill] of guildSkills.skills.entries()) for (const [offset,description] of skill.levels.entries()) {
  const id='calculator.clan.'+index+'.level.'+(offset+1)+'.hint';
  registry.set(keyOf('game',id),{
    scope:'game',id,kind:'calculator_hint',
    source:{en:description.en},
    baseline:{en:description.en,ru:description.ru,jp:'',tw:''},
    baselineOrigin:{en:'import',ru:'import',jp:'fallback',tw:'fallback'}
  });
}
const RECORDS=[...registry.values()].sort((a,b)=>a.scope.localeCompare(b.scope)||a.id.localeCompare(b.id));

// New catalog entries are not a second translation database. This read-only
// projection points to the same published catalog snapshot that Modern loads.
// Edits always go through the catalog's guarded draft/publish API, never
// localization_overrides. No old/source entries are reinterpreted here.
function catalogManagedRows(snapshot,locale,revision=0){
  const rows=[];
  for(const item of snapshot){
    const identity=item?.identity, edit=item?.edit, id=identity?.id;
    if(typeof id!=='string'||!id||baselineById.has(id)||
       !['equipment','soul','active','passive'].includes(identity.kind)||!edit)continue;
    const fields=['equipment','soul'].includes(identity.kind)
      ? ['names','description','notes','acquisition','modifiers']
      : ['names','description'];
    for(const field of fields){
      const translations=edit[field];
      if(!translations||typeof translations!=='object'||Array.isArray(translations)||
         !LOCALES.some(lang=>isText(translations[lang])&&translations[lang].trim()))continue;
      const term=field==='names'?id:id+'.'+field;
      if(registry.has(keyOf('game',term)))continue;
      const actual=translations[locale];
      const source=Object.fromEntries(LOCALES.map(lang=>[lang,
        isText(translations[lang])?translations[lang]:'']));
      const hasLocale=isText(actual)&&Boolean(actual.trim());
      const baseline=hasLocale?actual:source.en;
      rows.push({id:term,scope:'game',kind:identity.kind+(field==='names'?'':'.'+field),
        locale,source,baseline,baselineOrigin:hasLocale?'catalog':'fallback',
        effective:baseline,legacyValue:'',override:'',version:0,updatedAt:null,
        origin:hasLocale?'catalog':'fallback',managedBy:'catalog',catalogId:id,
        catalogKind:identity.kind,catalogField:field,catalogRevision:revision});
    }
  }
  return rows;
}

const GROUPS=new Set(['all','skills','equipment','souls','classes','races','stats','other']);
function groupOf(kind,id='') {
  if(id.startsWith('calculator.honor.')||id.startsWith('calculator.clan.'))return 'skills';
  if(kind==='skill'||kind==='skill_entry'||kind==='skill_detail'||kind.startsWith('active.')||kind.startsWith('passive.'))return 'skills';
  if(kind==='equipment'||kind.startsWith('equipment.')||kind==='equipment_category')return 'equipment';
  if(kind==='soul'||kind.startsWith('soul.'))return 'souls';
  if(kind==='job'||kind==='class')return 'classes';
  if(kind==='race'||kind==='racial_skill')return 'races';
  if(kind.startsWith('calculator'))return 'stats';
  return 'other';
}
const isText=s=>typeof s==='string' && s.length<=4000 && !/[\x00-\x09\x0b-\x1f\x7f<>]/.test(s);
const slots=s=>(s.match(/\{[A-Za-z0-9_]+\}/g)||[]).sort().join('|');
async function overrides(env,scope=null,locale=null) {
  // The administrator usually edits one locale in one workspace. Fetch only
  // that slice instead of all historical D1 overrides on every search.
  const query=scope&&locale
    ? 'SELECT scope, term_id, locale, text, version, updated_at FROM localization_overrides WHERE scope=? AND locale=?'
    : 'SELECT scope, term_id, locale, text, version, updated_at FROM localization_overrides';
  const statement=env.DB.prepare(query);
  return (await (scope&&locale?statement.bind(scope,locale):statement).all()).results;
}
function overlayMap(rows) {
  return new Map(rows.map(row=>[keyOf(row.scope,row.term_id)+'\0'+row.locale,row]));
}
export const localizationEntry=(scope,id)=>registry.get(keyOf(scope,id))||null;
export async function localizationEffectiveSnapshot(env){
  const [recent,legacy]=await Promise.all([overrides(env),legacyOverrides(env)]);
  return {recent:overlayMap(recent),legacy,
    get(scope,id,locale){
      const entry=localizationEntry(scope,id);
      if(!entry)return null;
      const key=keyOf(scope,id)+'\0'+locale;
      const row=this.recent.get(key);
      const text=row ? row.text || entry.baseline[locale] : this.legacy.get(key)||entry.baseline[locale];
      return {entry,version:row?.version||0,effective:text||'',override:row?.text||''};
    }
  };
}

async function legacyOverrides(env,scope=null,locale=null) {
  // Historical values are still authoritative when no new override exists,
  // but unrelated scopes/languages need not be scanned for each admin page.
  const needUi=!scope||scope==='ui',needGame=!scope||scope==='game';
  const [ui,result,head]=await Promise.all([
    needUi
      ? (locale
        ? env.DB.prepare('SELECT locale,id,text FROM ui_translation_overrides WHERE locale=? AND text <> ?').bind(locale,'').all()
        : env.DB.prepare('SELECT locale,id,text FROM ui_translation_overrides WHERE text <> ?').bind('').all())
      : Promise.resolve({results:[]}),
    needGame&&(!locale||locale==='ru')
      ? env.DB.prepare('SELECT id,ru FROM result_label_overrides').all()
      : Promise.resolve({results:[]}),
    needGame
      ? env.DB.prepare('SELECT snapshot_json, version FROM catalog_head WHERE id=1').first()
      : Promise.resolve(null)
  ]);
  const values=new Map();
  // Reuse the catalog snapshot already read for legacy overrides. Do not
  // double-fetch the full JSON blob when displaying the unified index.
  values.catalogEntries=JSON.parse(head?.snapshot_json||'[]');
  values.catalogRevision=Number(head?.version)||0;
  for(const row of ui.results)values.set(keyOf('ui',row.id)+'\0'+row.locale,row.text);
  for(const row of result.results) if(row.ru&&row.ru!=='<excel-baseline>')
    values.set(keyOf('game',row.id)+'\0ru',row.ru);
  for(const entry of values.catalogEntries){
    const edit=entry.edit||{},id=entry.identity?.id;
    if(!id)continue;
    const add=(term,fields)=>{
      const locales=locale?[locale]:LOCALES;
      for(const lang of locales)if(fields?.[lang])
        values.set(keyOf('game',term)+'\0'+lang,fields[lang]);
    };
    add(id,edit.names);
    if(entry.identity.kind==='active'||entry.identity.kind==='passive')
      add('skill_detail.'+entry.identity.category+'.'+entry.identity.index+'.3',edit.description);
    else if(entry.identity.kind==='equipment'||entry.identity.kind==='soul')
      for(const field of ['description','notes','acquisition','modifiers'])
        add(id+'.'+field,edit[field]);
  }
  return values;
}
// Public, read-only administrative *chrome* copy. The same D1 precedence
// (including reset tombstones and historical UI overrides) powers the editor.
// No authentication state, drafts, session identifiers or hidden records
// leave this endpoint. The admin login page can translate before signing in.
export async function publicAdminShellLocalization(env) {
  const snapshot = await localizationEffectiveSnapshot(env);
  const locales = Object.fromEntries(LOCALES.map(locale => [locale, {}]));
  for (const [id,englishText] of Object.entries(english)) {
    if (!id.startsWith('adminShell.')) continue;
    for (const locale of LOCALES)
      locales[locale][id] = snapshot.get('ui',id,locale)?.effective || englishText;
  }
  return jsonResponse({ok:true,schemaVersion:1,locales});
}

export async function publicLocalization(env) {
  const [published,legacy]=await Promise.all([overrides(env),legacyOverrides(env)]);
  const data={ui:{ru:{},en:{},jp:{},tw:{}},game:{ru:{},en:{},jp:{},tw:{}}};
  // The player reads the same effective values as the editor. Older D1
  // publications are folded into one read-only API response, with a new
  // localization override (including reset tombstones) taking precedence.
  for(const [key,text] of legacy){
    const parts=key.split('\0'),scope=parts[0],locale=parts.at(-1),id=parts.slice(1,-1).join('\0');
    if(['ui','game'].includes(scope)&&LOCALES.includes(locale)&&
       registry.has(keyOf(scope,id))&&isText(text)&&text)
      data[scope][locale][id]=text;
  }
  for(const row of published) {
    const term=registry.get(keyOf(row.scope,row.term_id));
    if(!term || !LOCALES.includes(row.locale) || !isText(row.text))continue;
    // Versioned reset must suppress old public UI/catalog overrides too.
    // Publishing the approved baseline preserves that precedence without
    // deleting historical D1 rows or changing any calculation revision.
    const effective=row.text || term.baseline[row.locale];
    if(effective)data[row.scope][row.locale][row.term_id]=effective;
  }
  return jsonResponse({ok:true,schemaVersion:1,overrides:data});
}

// A guarded bulk write carries both old and new text; each may be up to
// 4000 Unicode characters (up to four UTF-8 bytes each), plus JSON overhead.
async function parseInput(request) {
  if(!(request.headers.get('content-type')||'').startsWith('application/json'))fail('JSON required',415);
  if(Number(request.headers.get('content-length')||0)>40000)fail('Request too large',413);
  const raw=await request.text();
  if(new TextEncoder().encode(raw).length>40000)fail('Request too large',413);
  try {return JSON.parse(raw);}catch{fail('Invalid JSON');}
}
export async function adminLocalization(request,env) {
  if(request.method==='GET'){
    const url=new URL(request.url),scope=url.searchParams.get('scope')||'game',
      locale=url.searchParams.get('locale')||'ru',q=(url.searchParams.get('q')||'').trim().toLocaleLowerCase(),
      pageText=url.searchParams.get('page')||'0',group=url.searchParams.get('group')||'all',
      status=url.searchParams.get('status')||'all';
    if(!['game','ui'].includes(scope)||!LOCALES.includes(locale)||q.length>120||!GROUPS.has(group)||
       !/^\d{1,5}$/.test(pageText)||!['all','missing','published'].includes(status))fail('Invalid search filters');
    // Read-only four-language comparison for one editable identity. Fetch it
    // only on demand; do not rescan every D1 language on normal pagination.
    const compareId=url.searchParams.get('compareId');
    if(compareId!==null){
      if(!/^[a-z][a-z0-9._-]{0,120}$/.test(compareId))fail('Invalid comparison ID');
      const entry=localizationEntry(scope,compareId);
      if(!entry)fail('Translation entry not found',404);
      const [matching,legacy]=await Promise.all([
        env.DB.prepare(
          'SELECT scope,term_id,locale,text,version,updated_at FROM localization_overrides WHERE scope=? AND term_id=?'
        ).bind(scope,compareId).all(),
        legacyOverrides(env,scope)
      ]);
      const latest=new Map(matching.results.filter(row=>row.scope===scope&&row.term_id===compareId)
        .map(row=>[row.locale,row]));
      const translations=LOCALES.map(lang=>{
        const row=latest.get(lang),older=legacy.get(keyOf(scope,compareId)+'\0'+lang)||'';
        const baseline=entry.baseline[lang],baselineOrigin=entry.baselineOrigin[lang];
        const effective=row ? row.text||baseline : older||baseline;
        const origin=row ? row.text?'admin':baselineOrigin : older?'previous-admin':baselineOrigin;
        return {locale:lang,effective,baseline,baselineOrigin,origin,version:row?.version||0,
          updatedAt:row?.updated_at||null,hasDraft:false};
      });
      return jsonResponse({ok:true,schemaVersion:1,scope,id:compareId,
        kind:entry.kind,source:entry.source,translations});
    }
    const page=Number(pageText),pageSize=40;
    // The four-language editor requests one guarded read for the whole page,
    // instead of triggering four separate requests per editable identity.
    // Single-language consumers retain the existing smaller response.
    const multilingual=url.searchParams.get('multilingual');
    if(multilingual!==null&&multilingual!=='1')fail('Invalid multilingual mode');
    const allLanguages=multilingual==='1';
    const [newRows,legacy]=await Promise.all([
      overrides(env,scope,allLanguages?null:locale),
      legacyOverrides(env,scope,allLanguages?null:locale)
    ]);
    const index=overlayMap(newRows);
    const displayRow=(row,language=locale)=>{
      const key=keyOf(scope,row.id)+'\0'+language,override=index.get(key),older=legacy.get(key)||'';
      // A reset tombstone must override older D1 values in every language.
      const effective=override ? override.text || row.baseline[language] : older || row.baseline[language];
      const baselineOrigin=row.baselineOrigin[language];
      const origin=override ? override.text ? 'admin' : baselineOrigin : older ? 'previous-admin' : baselineOrigin;
      return {id:row.id,scope,kind:row.kind,locale:language,source:row.source,baseline:row.baseline[language],baselineOrigin,
        effective,legacyValue:older,override:override?.text||'',version:override?.version||0,
        updatedAt:override?.updated_at||null,origin};
    };
    const managed=scope==='game'
      ? catalogManagedRows(legacy.catalogEntries,locale,legacy.catalogRevision) : [];
    const scoped=RECORDS.filter(row=>row.scope===scope&&(group==='all'||groupOf(row.kind,row.id)===group))
      // Array.map passes its numeric index as a second argument. Do not
      // accidentally treat it as a language code in displayRow.
      .map(row=>displayRow(row));
    scoped.push(...managed.filter(row=>group==='all'||groupOf(row.kind,row.id)===group));
    const coverage={total:scoped.length,translated:scoped.filter(row=>row.origin!=='fallback').length};
    // The exact same effective rows back both the totals and the breakdown.
    // No extra queries, D1 mutations, drafts or publication state changes.
    const byGroup=new Map();
    for(const row of scoped){
      const id=scope==='ui'?'other':groupOf(row.kind,row.id);
      let bucket=byGroup.get(id);
      if(!bucket){bucket={id,total:0,translated:0,missing:0};byGroup.set(id,bucket);}
      bucket.total++;
      if(row.origin==='fallback')bucket.missing++;
      else bucket.translated++;
    }
    const coverageByGroup=[...byGroup.values()].sort((a,b)=>
      [...GROUPS].indexOf(a.id)-[...GROUPS].indexOf(b.id));
    const otherLanguageTexts=row=>{
      if(!allLanguages)return [];
      if(row.managedBy==='catalog')return Object.values(row.source||{});
      const entry=registry.get(keyOf(scope,row.id));
      return entry?LOCALES.map(language=>displayRow(entry,language).effective):[];
    };
    const matched=scoped.filter(row=>
      (status==='all'||status==='missing'&&row.origin==='fallback'||
        status==='published'&&['admin','previous-admin','catalog'].includes(row.origin)) &&
      (!q || [row.id,row.kind,row.source.en,row.effective,row.legacyValue,
        ...otherLanguageTexts(row)].some(value=>
        String(value||'').toLocaleLowerCase().includes(q))));
    const items=matched.slice(page*pageSize,(page+1)*pageSize);
    if(allLanguages){
      // Page-sized, identity-stable translations; no duplicate mutable source
      // for catalog-managed records. Catalog editing keeps its own revision.
      const catalogRows=new Map();
      for(const language of LOCALES){
        const candidates=scope==='game'?catalogManagedRows(legacy.catalogEntries,language,legacy.catalogRevision):[];
        catalogRows.set(language,new Map(candidates.map(row=>[row.id,row])));
      }
      for(const row of items){
        row.translations=LOCALES.map(language=>{
          if(row.managedBy==='catalog'){
            const managedRow=catalogRows.get(language).get(row.id);
            if(!managedRow)throw new Error('Missing catalog translation '+row.id+'/'+language);
            return {locale:language,effective:managedRow.effective,baseline:managedRow.baseline,
              origin:managedRow.origin,baselineOrigin:managedRow.baselineOrigin,managedBy:'catalog'};
          }
          const entry=registry.get(keyOf(scope,row.id));
          if(!entry)throw new Error('Missing registered translation '+row.id);
          const state=displayRow(entry,language);
          return {locale:language,effective:state.effective,baseline:state.baseline,
            baselineOrigin:state.baselineOrigin,origin:state.origin,
            version:state.version,updatedAt:state.updatedAt,override:state.override};
        });
      }
    }
    return jsonResponse({ok:true,schemaVersion:1,locale,scope,group,status,coverage,coverageByGroup,page,pageSize,total:matched.length,
      counts:{ui:RECORDS.filter(r=>r.scope==='ui').length,game:RECORDS.filter(r=>r.scope==='game').length+managed.length},
      items});
  }
  if(request.method!=='POST')return jsonResponse({ok:false,message:'Method not allowed'},405);
  const input=await parseInput(request);
  if(!input || Array.isArray(input) || typeof input!=='object'||
     !['expectedVersion,id,locale,scope,value',
      'expectedEffective,expectedVersion,id,locale,scope,value'].includes(Object.keys(input).sort().join(','))||
    !['ui','game'].includes(input.scope)||!LOCALES.includes(input.locale)||
    !registry.has(keyOf(input.scope,input.id))||!isText(input.value)||
    (Object.hasOwn(input,'expectedEffective')&&!isText(input.expectedEffective))||
    !Number.isSafeInteger(input.expectedVersion)||input.expectedVersion<0||input.expectedVersion>1000000000)
    fail('Invalid translation edit');
  const entry=registry.get(keyOf(input.scope,input.id)),value=input.value.trim();
  if(input.scope==='ui' && value && slots(value)!==slots(entry.source.en))
    fail('Template placeholders must match the source');
  const existing=await env.DB.prepare('SELECT text,version FROM localization_overrides WHERE scope=? AND term_id=? AND locale=?')
    .bind(input.scope,input.id,input.locale).first();
  const version=existing?.version||0;
  if(version!==input.expectedVersion)fail('Translation changed elsewhere; refresh before saving',409);
  // A bulk preview uses an exact effective-text lease in addition to the
  // version. Protect previously published legacy overrides that have no new
  // localization_overrides version of their own.
  if(Object.hasOwn(input,'expectedEffective')){
    const oldText=existing
      ? existing.text || entry.baseline[input.locale]
      : (await legacyOverrides(env,input.scope,input.locale)).get(keyOf(input.scope,input.id)+'\0'+input.locale)||entry.baseline[input.locale];
    if(oldText!==input.expectedEffective)fail('Translation changed since preview; review before saving',409);
  }
  if(existing?.text===value)
    return jsonResponse({ok:true,scope:input.scope,id:input.id,locale:input.locale,version,override:value});
  // An empty value on top of a previous editor publication is a real reset.
  // Persist a tombstone; otherwise the legacy override would reappear.
  if(!existing&&!value){
    const previous=(await legacyOverrides(env)).get(keyOf(input.scope,input.id)+'\0'+input.locale);
    if(!previous)return jsonResponse({ok:true,scope:input.scope,id:input.id,locale:input.locale,version,override:value});
  }
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
