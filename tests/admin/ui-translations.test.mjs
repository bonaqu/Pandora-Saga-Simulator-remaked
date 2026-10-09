import test from 'node:test';
import assert from 'node:assert/strict';
import ui from '../../localization/ui.en.json' with { type: 'json' };
import { adminUiTranslations, publicUiTranslations } from '../../admin-api/src/ui-translations.mjs';

function environment() {
  const rows = new Map();
  const db = {
    prepare(sql) {
      let params = [];
      return {
        bind(...args) { params = args; return this; },
        async all() {
          assert.match(sql, /^SELECT locale, id, text, version, updated_at/);
          return { results: [...rows.values()] };
        },
        async first() {
          assert.match(sql, /^SELECT text, version/);
          return rows.get(params[0] + '\0' + params[1]) || null;
        },
        async run() {
          if (sql.startsWith('INSERT OR IGNORE')) {
            const [locale, id, text, updated_at] = params;
            const key = locale + '\0' + id;
            if (rows.has(key)) return { meta: { changes: 0 } };
            rows.set(key, { locale, id, text, version: 1, updated_at });
            return { meta: { changes: 1 } };
          }
          if (sql.startsWith('UPDATE ui_translation_overrides')) {
            const [text, updated_at, locale, id, expected] = params;
            const key = locale + '\0' + id;
            const prev = rows.get(key);
            if (!prev || prev.version !== expected) return { meta: { changes: 0 } };
            rows.set(key, { ...prev, text, updated_at, version: prev.version + 1 });
            return { meta: { changes: 1 } };
          }
          throw Error('Unrecognized database query: '+sql);
        }
      };
    }
  };
  return { DB: db, rows };
}
function post(payload) {
  return new Request('https://admin.example/api/admin/ui-translations', {
    method:'POST', headers:{'Content-Type':'application/json'},
    body:JSON.stringify(payload)
  });
}
test('UI translation catalog lists all RU and EN IDs; empty public overrides', async () => {
  const env = environment();
  const result = await (await adminUiTranslations(new Request('https://admin.example/api/admin/ui-translations'), env)).json();
  assert.equal(result.schemaVersion,1);
  assert.equal(result.source,'translations.xlsx');
  assert.equal(result.items.length,Object.keys(ui).length * 2);
  assert.equal(result.items.filter(row=>row.locale==='ru').length,Object.keys(ui).length);
  assert.equal(result.items.find(row=>row.locale==='en'&&row.id==='header.updates').source,ui['header.updates']);
  assert.deepEqual((await (await publicUiTranslations(env)).json()).overrides, {ru:{},en:{}});
});
test('RU/EN text is published without modifying Excel or revision; reset is concurrency-safe', async () => {
  const env=environment(), id='header.updates';
  const save=await adminUiTranslations(post({id,locale:'ru',value:'Изменения',expectedVersion:0}),env);
  assert.equal(save.status,200);
  const changed=await save.json(); assert.equal(changed.version,1);
  assert.equal(changed.overridden,true);
  const live=await (await publicUiTranslations(env)).json();
  assert.deepEqual(live.overrides.ru,{[id]:'Изменения'});
  assert.deepEqual(live.overrides.en,{});
  assert.equal(ui[id],'Updates');
  await assert.rejects(()=>adminUiTranslations(post({id,locale:'ru',value:'Несохранённое',expectedVersion:0}),env),/changed in another session/);
  const reset=await adminUiTranslations(post({id,locale:'ru',value:'',expectedVersion:1}),env);
  assert.equal((await reset.json()).overridden,false);
  const after=await (await publicUiTranslations(env)).json();
  assert.deepEqual(after.overrides.ru,{});
  await assert.rejects(()=>adminUiTranslations(post({id,locale:'ru',value:'Старое',expectedVersion:1}),env),/changed in another session/);
  const en=await adminUiTranslations(post({id,locale:'en',value:'Latest updates',expectedVersion:0}),env);
  assert.equal((await en.json()).overridden,true);
  assert.deepEqual((await (await publicUiTranslations(env)).json()).overrides.en,{[id]:'Latest updates'});
});
test('placeholder, unsafe markup and unrelated keys are rejected', async () => {
  const env=environment();
  for (const [id,value] of [
    ['hero.version','UI {ui}'],
    ['header.updates','<script>'],
    ['header.updates','Good\nbad']
  ]) {
    await assert.rejects(()=>adminUiTranslations(post({id,locale:'ru',value,expectedVersion:0}),env));
  }
  await assert.rejects(()=>adminUiTranslations(post({id:'not.a.real.key',locale:'ru',value:'x',expectedVersion:0}),env));
  await assert.rejects(()=>adminUiTranslations(post({id:'header.updates',locale:'jp',value:'x',expectedVersion:0}),env));
});
