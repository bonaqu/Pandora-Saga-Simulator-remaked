import {test,expect} from '@playwright/test';
import fs from 'node:fs';

const origin='https://pandora-saga-simulator-remaked-admin-api.bonaqu.workers.dev';
const sourceText='Warrior fights Warriors, SwordWarrior, Warrior_2; {Warrior} and warrior.';
function fixture(index){
  return {scope:'game',id:'skill_detail.7.'+(index+1)+'.3',kind:'skill_detail',
    source:{en:sourceText},baseline:{ru:index<40?'Воин уже переведён':index===40?sourceText:'Warrior\nWARRIOR',
      en:sourceText,jp:'戦士',tw:'戰士'},baselineOrigin:{ru:index<40?'import':'fallback',en:'import',jp:'import',tw:'import'}};
}

test('reviewed whole-word replacement scans all pages and preserves English, substrings and placeholders',async({page})=>{
  const texts=Array.from({length:42},(_,i)=>fixture(i));
  const stored=new Map(),posts=[];
  page.on('dialog',dialog=>dialog.accept());
  await page.route(origin+'/**',async route=>{
    const request=route.request(),url=new URL(request.url()),path=url.pathname;
    if(path==='/api/session')return route.fulfill({json:{ok:true,csrfToken:'test-csrf',username:'admin',expiresAt:9999999999}});
    if(path==='/api/admin/localization/drafts')return route.fulfill({json:{ok:true,count:0,maxBatch:50,items:[]}});
    if(path==='/api/admin/localization/publish-batch'){
      const body=request.postDataJSON();
      expect(request.headers()['x-csrf-token']).toBe('test-csrf');
      expect(body.operationId).toMatch(/^[0-9a-f-]{36}$/i);
      expect(body.items.length).toBeGreaterThan(0);
      const violations=body.items.some(input=>{
        const prev=stored.get(input.id);
        const current=prev?.value||texts.find(x=>x.id===input.id)?.baseline.ru;
        return input.expectedVersion!==(prev?.version||0)||input.expectedEffective!==current;
      });
      if(violations)return route.fulfill({status:409,json:{ok:false,message:'Conflict'}});
      for(const item of body.items){
        const prior=stored.get(item.id);
        posts.push(item);
        stored.set(item.id,{value:item.value,version:(prior?.version||0)+1});
      }
      return route.fulfill({json:{ok:true,operationId:body.operationId,count:body.items.length,
        items:body.items.map(item=>({id:item.id,scope:item.scope,locale:item.locale,version:stored.get(item.id).version}))}});
    }
    if(path==='/api/admin/localization'){
      if(request.method()==='POST'){
        expect(request.headers()['x-csrf-token']).toBe('test-csrf');
        const input=request.postDataJSON(),prior=stored.get(input.id);
        posts.push(input);
        const current=prior?.value||texts.find(x=>x.id===input.id)?.baseline.ru;
        if(input.expectedVersion!==(prior?.version||0)||input.expectedEffective!==current)
          return route.fulfill({status:409,json:{ok:false,message:'Conflict with another translator'}});
        stored.set(input.id,{value:input.value,version:(prior?.version||0)+1});
        return route.fulfill({json:{ok:true,id:input.id,scope:input.scope,locale:input.locale,
          override:input.value,version:(prior?.version||0)+1}});
      }
      const scope=url.searchParams.get('scope')||'game',locale=url.searchParams.get('locale')||'ru',
        group=url.searchParams.get('group')||'all',status=url.searchParams.get('status')||'all',
        query=(url.searchParams.get('q')||'').toLowerCase(),pageNumber=Number(url.searchParams.get('page')||0);
      const matching=texts.filter(item=>item.scope===scope&&(group==='all'||group==='skills')).map(item=>{
        const saved=stored.get(item.id),effective=saved?.value||item.baseline[locale],
          origin=saved?'admin':item.baselineOrigin[locale];
        return {...item,locale,baseline:item.baseline[locale],effective,origin,
          version:saved?.version||0,override:saved?.value||'',legacyValue:''};
      }).filter(item=>(status==='all'||status==='missing'&&item.origin==='fallback')&&
        (!query||[item.id,item.source.en,item.effective].some(value=>String(value).toLowerCase().includes(query))));
      return route.fulfill({json:{ok:true,schemaVersion:1,scope,locale,group,status,
        page:pageNumber,pageSize:40,total:matching.length,counts:{ui:242,game:2900},
        items:matching.slice(pageNumber*40,(pageNumber+1)*40)}});
    }
    const file=(path==='/admin'||path==='/admin/')?'admin.html':path.slice(1);
    if(['catalog-ui.js','result-labels.js','ui-translations.js'].includes(file))
      return route.fulfill({contentType:'text/javascript',body:''});
    if(['admin.html','admin.css','admin.js','localization-console.js','localization-bulk.js','localization-drafts.js'].includes(file)){
      const body=fs.readFileSync(new URL('../../admin-api/public/'+file,import.meta.url),'utf8');
      return route.fulfill({contentType:file.endsWith('.css')?'text/css':file.endsWith('.js')?'text/javascript':'text/html',body});
    }
    return route.fulfill({status:404});
  });
  await page.goto(origin+'/admin');
  await expect(page.locator('#admin-workspace')).toBeVisible();
  const bulk=page.locator('.localization-bulk');
  await bulk.locator('summary').click();
  await bulk.getByRole('textbox',{name:'Найти целое слово'}).fill('Warrior');
  await bulk.getByRole('textbox',{name:'Заменить словом'}).fill('Воин');
  // Include already translated rows in the server scan; only the two matching
  // effective texts should enter the preview, including one on page two.
  await bulk.getByRole('checkbox',{name:/Только без готового перевода/}).uncheck();
  await bulk.getByRole('button',{name:'Показать предварительный просмотр'}).click();
  await expect(bulk.locator('.localization-bulk-row')).toHaveCount(2);
  const first=bulk.locator('.localization-bulk-row').first();
  const suggested='Воин fights Warriors, SwordWarrior, Warrior_2; {Warrior} and Воин.';
  await expect(first.locator('.localization-bulk-after')).toHaveText(suggested);
  await expect(bulk.locator('.localization-bulk-selection')).toContainText('Выбрано: 2 / 2');

  // Every manually reviewed proposal stays in preview until the operator
  // explicitly confirms publication. Neither English nor another locale changes.
  const pencil=first.getByRole('button',{name:'Редактировать «Станет» для '+texts[40].id});
  const revert=first.getByRole('button',{name:'Вернуть автоматический вариант для '+texts[40].id});
  await pencil.click();
  const editor=first.getByRole('textbox',{name:'Итоговый перевод '+texts[40].id});
  await expect(editor).toHaveValue(suggested);
  await expect(bulk.getByRole('button',{name:'Опубликовать выбранные'})).toBeDisabled();
  await editor.fill('<script>bad</script>');
  await first.getByRole('button',{name:'Применить в предпросмотре'}).click();
  await expect(first.getByRole('alert')).toContainText('недопустимые символы');
  await expect(editor).toBeVisible();
  await editor.fill('Проверенный перевод');
  await editor.press('Control+Enter');
  await expect(first.locator('.localization-bulk-after')).toHaveText('Проверенный перевод');
  await expect(bulk.locator('.localization-bulk-selection')).toContainText('Исправлено вручную: 1');
  await revert.click();
  await expect(first.locator('.localization-bulk-after')).toHaveText(suggested);
  await expect(bulk.locator('.localization-bulk-selection')).toContainText('Исправлено вручную: 0');

  await pencil.click();
  await editor.fill('Шляпа рыцаря');
  await first.getByRole('button',{name:'Применить в предпросмотре'}).click();
  await expect(first.locator('.localization-bulk-after')).toHaveText('Шляпа рыцаря');
  await bulk.getByRole('button',{name:'Снять выделение'}).click();
  await expect(bulk.getByRole('button',{name:'Опубликовать выбранные'})).toBeDisabled();
  await expect(bulk.locator('.localization-bulk-selection')).toContainText('Выбрано: 0 / 2');
  await bulk.getByRole('button',{name:'Выбрать все'}).click();
  await expect(first.locator('.localization-bulk-after')).toHaveText('Шляпа рыцаря');
  await expect(bulk.locator('.localization-bulk-selection')).toContainText('Выбрано: 2 / 2');
  await bulk.locator('.localization-bulk-row').nth(1).locator('input[type="checkbox"]').uncheck();
  await expect(bulk.locator('.localization-bulk-selection')).toContainText('Выбрано: 1 / 2');
  await bulk.getByRole('button',{name:'Опубликовать выбранные'}).click();
  await expect(bulk.locator('.localization-bulk-state')).toContainText('Успешно опубликовано 1 перевод');
  expect(posts).toHaveLength(1);
  expect(posts.every(x=>x.scope==='game'&&x.locale==='ru'&&x.expectedEffective)).toBe(true);
  expect(posts.map(x=>x.id)).toEqual([texts[40].id]);
  expect(posts[0].value).toBe('Шляпа рыцаря');
  expect(stored.has(texts[41].id)).toBe(false);
  expect(texts[40].source.en).toBe(sourceText);
  expect(texts[40].baseline.en).toBe(sourceText);
  expect(texts[40].baseline.jp).toBe('戦士');
  expect(stored.size).toBe(1);
});

test('whole-word helper retains multiline formatting and escapes punctuation safely',async({page})=>{
  await page.addInitScript(()=>{window.PandoraBulkLocalization=undefined;});
  // Pure UI behavior runs in the same strict DOM context as the admin page.
  await page.goto('about:blank');
  const source=fs.readFileSync(new URL('../../admin-api/public/localization-bulk.js',import.meta.url),'utf8');
  const output=await page.evaluate(script=>{
    const old=document.createElement('div');old.id='localization-console';document.body.append(old);
    const run=document.createElement('script');run.textContent=script;document.body.append(run);
    const translate=window.PandoraBulkLocalization.replaceWholeWord;
    return {
      example:translate('Warrior,warrior: Warriors. (WARRIOR)\n{Warrior} Warrior_9','Warrior','Воин'),
      unicode:translate('前Warrior後 Warrior','Warrior','Воин')
    };
  },source);
  expect(output.example).toBe('Воин,Воин: Warriors. (Воин)\n{Warrior} Warrior_9');
  expect(output.unicode).toBe('前Warrior後 Воин');
});
