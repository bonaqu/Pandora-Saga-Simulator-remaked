(function () {
  'use strict';
  const LANGUAGES = Object.freeze([
    ['ru', 'Русский'], ['en', 'English'],
    ['jp', '日本語'], ['tw', '繁體中文']
  ]);
  const localeTag = {ru:'ru',en:'en',jp:'ja',tw:'zh-Hant'};
  const origins = {admin:'fourOriginAdmin','previous-admin':'fourOriginPrevious',import:'fourOriginImport',fallback:'fourOriginFallback'};
  // All labels use the same versioned D1-backed admin-shell locale source.
  // String interpolation is text-only, never HTML or executable markup.
  function tx(id,fallback,values){
    const source=window.PandoraAdminI18n?.t?.('adminShell.'+id,fallback) || fallback;
    return String(source).replace(/\{([A-Za-z0-9_]+)\}/g,(match,key)=>
      values && Object.prototype.hasOwnProperty.call(values,key)?String(values[key]):match);
  }
  function element(tag, text, css) {
    const node=document.createElement(tag);
    if(text!==undefined&&text!==null)node.textContent=text;
    if(css)node.className=css;
    return node;
  }
  const safe = text => typeof text==='string' && text.length<=4000 &&
    !/[\x00-\x09\x0b-\x1f\x7f<>]/.test(text);
  const placeholders = value => (String(value).match(/\{[A-Za-z0-9_]+\}/g)||[]).sort().join('|');
  function mount(card, record, {api, queued, drafts, onPublished, onDirtyChanged, report}) {
    if(!Array.isArray(record.translations) || record.translations.length!==4 ||
       LANGUAGES.some(([language],i)=>record.translations[i].locale!==language))return false;
    const grid=element('div',null,'localization-inline-languages');
    grid.dataset.fourLanguages='';
    const foot=element('div',null,'localization-item-foot');
    const publishAll=element('button','Опубликовать изменения во всех языках');
    publishAll.dataset.adminI18n='adminShell.fourPublishAll';
    publishAll.type='button';publishAll.dataset.publishAllLanguages='';
    const hint=element('small','Изменённые языки публикуются одним действием; остальные сохраняются без изменений.');
    hint.dataset.adminI18n='adminShell.fourPublishHint';
    const controls=[];
    let busy=false;
    const identity=entry=>record.scope+'\0'+record.id+'\0'+entry.locale;
    const saved=entry=>queued?.get(record.scope,record.id,entry.locale)||null;
    // The D1 editor normalizes surrounding whitespace on save. Match this
    // client-side so a trailing space never produces an unnecessary write.
    const modified=entry=>entry.textarea.value.trim()!==String(entry.data.effective||'').trim();
    function states() {
      return controls.filter(modified);
    }
    function validate(entry,text) {
      if(!safe(text)||!text.trim())return tx('fourRequired','Для публикации нужен непустой текст (до 4000 символов).');
      if(record.scope==='ui' && placeholders(text)!==placeholders(record.source.en||''))
        return tx('fourPlaceholderGuard','Плейсхолдеры должны совпадать с английским оригиналом.');
      return '';
    }
    function synchronize() {
      for(const entry of controls){
        const {data,textarea,dirt,saveButton,stageButton,resetButton,size,originLabel}=entry;
        originLabel.textContent=origins[data.origin]?tx(origins[data.origin],data.origin):data.origin;
        const changed=modified(entry);
        const cloud=saved(data);
        // A draft already persisted in D1 must not be duplicated as an
        // unsaved browser draft merely because it differs from publication.
        if(changed && (!cloud || textarea.value!==cloud.text))
          drafts.set(identity(data),textarea.value);
        else drafts.delete(identity(data));
        dirt.textContent=cloud?tx('fourDraftStatus','Черновик в D1'):changed?tx('fourUnsavedStatus','Изменено · не опубликовано'):
          data.origin==='fallback'?tx('fourMissingStatus','Нет перевода'):
          origins[data.origin]?tx(origins[data.origin],data.origin):data.origin;
        textarea.disabled=busy;
        saveButton.disabled=busy || Boolean(cloud) || !changed || !textarea.value.trim();
        stageButton.disabled=busy || !changed || !textarea.value.trim();
        resetButton.disabled=busy || Boolean(cloud) || !(changed || ['admin','previous-admin'].includes(data.origin));
        size.textContent=textarea.value.length+' / 4000';
        stageButton.textContent=tx('fourStage','В черновики');
        resetButton.textContent=tx('fourReset','Вернуть базовый');
        saveButton.textContent=tx('fourPublishLocale','Опубликовать {locale}',{locale:data.locale.toUpperCase()});
        textarea.placeholder=tx('fourLanguagePlaceholder','Перевод на {language}',{language:entry.languageName});
        textarea.setAttribute('aria-label',tx('fourEditorAria','Редактор {language} · {id}',{language:entry.languageName,id:record.id}));
        resetButton.title=tx('fourBaselineTitle','Базовый текст: {value}',{value:data.baseline||'—'});
        entry.container.dataset.dirty=String(changed);
      }
      publishAll.textContent=tx('fourPublishAll','Опубликовать изменения во всех языках');
      hint.textContent=tx('fourPublishHint','Изменённые языки публикуются одним действием; остальные сохраняются без изменений.');
      const changedEntries=states();
      card.dataset.dirty=String(changedEntries.length>0);
      publishAll.disabled=busy || changedEntries.length===0 ||
        changedEntries.some(e=>Boolean(saved(e.data))||Boolean(validate(e,e.textarea.value)));
      onDirtyChanged();
    }
    function complete(entry,version,value,reset) {
      const data=entry.data;
      data.version=version;
      data.effective=reset?data.baseline:value;
      data.override=reset?'':value;
      data.origin=reset?data.baselineOrigin:'admin';
      entry.textarea.value=data.effective||'';
      drafts.delete(identity(data));
    }
    async function saveOne(entry,reset=false) {
      if(busy)return;
      const data=entry.data;
      const value=entry.textarea.value.trim();
      if(!reset){
        const error=validate(entry,value);
        if(error){report(data.locale.toUpperCase()+': '+error,true);return;}
        if(value===data.effective)return;
      }
      if(saved(data)){report(tx('fourDraftBlock','Сначала обработай уже сохранённый черновик для {locale}.',{locale:data.locale.toUpperCase()}),true);return;}
      if(reset && !['admin','previous-admin'].includes(data.origin)) {
        entry.textarea.value=data.effective;
        drafts.delete(identity(data));
        synchronize();
        report(tx('fourCancelled','Неопубликованное изменение отменено.'));
        return;
      }
      busy=true;synchronize();
      try {
        const result=await api('POST',{scope:record.scope,id:record.id,locale:data.locale,
          value:reset?'':value,expectedVersion:data.version,expectedEffective:data.effective});
        complete(entry,result.version,reset?'':value,reset);
        report(tx('fourSaved','Сохранено: {id} · {locale}.',{id:record.id,locale:data.locale.toUpperCase()}));
        if(card.isConnected)onPublished();
      } catch (error) {
        report(tx('fourWriteUnconfirmed','Изменение не подтверждено: {error}. Перепроверь запись перед повторной отправкой.',{error:error.message}),true);
      } finally {busy=false;if(card.isConnected)synchronize();}
    }
    async function stageOne(entry) {
      if(busy)return;
      const value=entry.textarea.value.trim(),data=entry.data;
      const error=validate(entry,value);
      if(error){report(data.locale.toUpperCase()+': '+error,true);return;}
      busy=true;synchronize();
      try {
        await api('POST',{scope:record.scope,id:record.id,locale:data.locale,
          value,expectedVersion:data.version,expectedEffective:data.effective,
          expectedDraftVersion:saved(data)?.version||0},'/api/admin/localization/draft');
        drafts.delete(identity(data));
        if(queued)await queued.refresh();
        report(tx('fourDraftSaved','Черновик {locale} сохранён в D1. Ещё не опубликован.',{locale:data.locale.toUpperCase()}));
        if(card.isConnected)onPublished();
      } catch(error){report(tx('fourDraftError','Не удалось сохранить черновик: {error}',{error:error.message}),true);}
      finally {busy=false;if(card.isConnected)synchronize();}
    }
    for(const [locale,name] of LANGUAGES){
      const data=record.translations.find(entry=>entry.locale===locale);
      const section=element('section',null,'localization-inline-language');
      section.dataset.translationLocale=locale;
      const label=element('label',null,'localization-inline-label');
      const heading=element('strong',name+' · '+locale.toUpperCase());
      const state=element('small',origins[data.origin]?tx(origins[data.origin],data.origin):data.origin,'localization-inline-origin');
      label.append(heading,state);
      const textarea=element('textarea');
      textarea.rows=record.kind.includes('description')||record.kind.includes('hint')?4:2;
      textarea.maxLength=4000;textarea.lang=localeTag[locale];
      textarea.dataset.translationInput=locale;
      textarea.value=drafts.has(identity(data))?drafts.get(identity(data)):saved(data)?.text??data.effective??'';
      textarea.placeholder='Перевод на '+name;
      textarea.setAttribute('aria-label',tx('fourEditorAria','Редактор {language} · {id}',{language:name,id:record.id}));
      label.append(textarea);
      const buttons=element('div',null,'localization-inline-actions');
      const dirt=element('small','');const size=element('small','');
      const stageButton=element('button','В черновики');stageButton.type='button';stageButton.className='secondary';
      stageButton.dataset.adminI18n='adminShell.fourStage';
      const saveButton=element('button','Опубликовать '+locale.toUpperCase());saveButton.type='button';
      const resetButton=element('button','Вернуть базовый');resetButton.type='button';resetButton.className='secondary';
      resetButton.dataset.adminI18n='adminShell.fourReset';
      resetButton.title='Базовый текст: '+(data.baseline||'—');
      const entry={data,textarea,dirt,size,stageButton,saveButton,resetButton,container:section,languageName:name,originLabel:state};
      controls.push(entry);
      textarea.addEventListener('input',synchronize);
      textarea.addEventListener('keydown',e=>{
        if(e.key==='Escape'){textarea.value=data.effective||'';synchronize();}
        if(e.key==='Enter'&&(e.ctrlKey||e.metaKey)){e.preventDefault();saveOne(entry);}
      });
      stageButton.addEventListener('click',()=>stageOne(entry));
      saveButton.addEventListener('click',()=>saveOne(entry));
      resetButton.addEventListener('click',()=>saveOne(entry,true));
      buttons.append(dirt,size,stageButton,saveButton,resetButton);
      section.append(label,buttons);
      queued?.history(section,{...record,...data,scope:record.scope,id:record.id},()=>{
        queued.refresh();onPublished();
      });
      grid.append(section);
    }
    async function publishChanged() {
      if(busy)return;
      const changed=states();
      if(!changed.length)return;
      if(changed.some(e=>Boolean(saved(e.data)))) {
        report(tx('fourBatchDraftBlock','В одном из языков есть черновик D1. Опубликуй или отмени его в очереди.'),true);return;
      }
      for(const e of changed) {
        const error=validate(e,e.textarea.value.trim());
        if(error){report(e.data.locale.toUpperCase()+': '+error,true);return;}
      }
      const operationId=crypto.randomUUID();
      const items=changed.map(e=>({scope:record.scope,id:record.id,locale:e.data.locale,
        expectedVersion:e.data.version,expectedEffective:e.data.effective,value:e.textarea.value.trim()}));
      busy=true;synchronize();
      try {
        // One D1 transaction; stale versions or drafts reject all four languages.
        const result=await api('POST',{operationId,items},'/api/admin/localization/publish-batch');
        if(!result.ok || result.count!==items.length)throw Error(tx('fourBatchUnexpected','Неожиданный ответ публикации'));
        for(const e of changed)complete(e,e.data.version+1,e.textarea.value.trim(),false);
        report(tx('fourBatchPublished','Опубликовано {count} языковых вариантов для {id}.',{count:changed.length,id:record.id}));
        if(card.isConnected)onPublished();
      } catch(error) {
        // A dropped HTTP response may happen AFTER commit. Avoid false rollback claims.
        try {
          const receipt=await api('GET',null,
            '/api/admin/localization/operations?operationId='+encodeURIComponent(operationId));
          if(receipt.found && receipt.receipt?.count===items.length){
            for(const e of changed)complete(e,e.data.version+1,e.textarea.value.trim(),false);
            report(tx('fourBatchReceipt','Публикация {count} языков подтверждена по квитанции D1.',{count:changed.length}));
            if(card.isConnected)onPublished();
          } else report(tx('fourBatchUnconfirmed','Публикация не подтверждена: {error}. Обнови карточку и сравни версии перед повтором.',{error:error.message}),true);
        } catch(recoveryError){
          report(tx('fourBatchUnknown','Результат публикации неизвестен: {error}. Проверь историю D1 перед повтором.',{error:error.message}),true);
        }
      } finally {busy=false;if(card.isConnected)synchronize();}
    }
    publishAll.addEventListener('click',publishChanged);
    foot.append(publishAll,hint);
    card.append(grid,foot);
    // The admin locale switch keeps all editors and their unsaved text intact.
    // Release the listener once a detached card is observed on the next switch.
    const updateLocale=()=>{
      if(!card.isConnected){window.removeEventListener('pandora-admin:localechange',updateLocale);return;}
      synchronize();
    };
    window.addEventListener('pandora-admin:localechange',updateLocale);
    synchronize();
    return true;
  }
  window.PandoraFourLanguageEditor=Object.freeze({mount});
})();
