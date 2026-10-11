(function () {
  'use strict';
  const LANGUAGES = Object.freeze([
    ['ru', 'Русский'], ['en', 'English'],
    ['jp', '日本語'], ['tw', '繁體中文']
  ]);
  const localeTag = {ru:'ru',en:'en',jp:'ja',tw:'zh-Hant'};
  const origins = {
    admin:'Опубликовано в D1', 'previous-admin':'Ранее опубликовано',
    import:'Утверждённый текст', fallback:'Нужен перевод'
  };
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
    publishAll.type='button';publishAll.dataset.publishAllLanguages='';
    const hint=element('small','Изменённые языки публикуются одним действием; остальные сохраняются без изменений.');
    const controls=[];
    let busy=false;
    const identity=entry=>record.scope+'\0'+record.id+'\0'+entry.locale;
    const saved=entry=>queued?.get(record.scope,record.id,entry.locale)||null;
    function states() {
      return controls.filter(entry=>entry.textarea.value.trim()!==entry.data.effective);
    }
    function validate(entry,text) {
      if(!safe(text)||!text.trim())return 'Для публикации нужен непустой текст (до 4000 символов).';
      if(record.scope==='ui' && placeholders(text)!==placeholders(record.source.en||''))
        return 'Набор {плейсхолдеров} должен совпадать с английским оригиналом.';
      return '';
    }
    function synchronize() {
      for(const entry of controls){
        const {data,textarea,dirt,saveButton,stageButton,resetButton,size}=entry;
        const changed=textarea.value!==data.effective;
        const cloud=saved(data);
        if(changed)drafts.set(identity(data),textarea.value);
        else drafts.delete(identity(data));
        dirt.textContent=cloud?'Черновик в D1':changed?'Изменено · не опубликовано':
          data.origin==='fallback'?'Нет перевода':origins[data.origin]||'Без изменений';
        textarea.disabled=busy;
        saveButton.disabled=busy || Boolean(cloud) || !changed || !textarea.value.trim();
        stageButton.disabled=busy || !changed || !textarea.value.trim();
        resetButton.disabled=busy || Boolean(cloud) || !(changed || ['admin','previous-admin'].includes(data.origin));
        size.textContent=textarea.value.length+' / 4000';
        entry.container.dataset.dirty=String(changed);
      }
      const modified=states();
      publishAll.disabled=busy || modified.length===0 ||
        modified.some(e=>Boolean(saved(e.data))||Boolean(validate(e,e.textarea.value)));
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
      if(saved(data)){report('Сначала обработай уже сохранённый черновик для '+data.locale.toUpperCase()+'.',true);return;}
      if(reset && !['admin','previous-admin'].includes(data.origin)) {
        entry.textarea.value=data.effective;
        drafts.delete(identity(data));
        synchronize();
        report('Неопубликованное изменение отменено.');
        return;
      }
      busy=true;synchronize();
      try {
        const result=await api('POST',{scope:record.scope,id:record.id,locale:data.locale,
          value:reset?'':value,expectedVersion:data.version,expectedEffective:data.effective});
        complete(entry,result.version,reset?'':value,reset);
        report('Сохранено: '+record.id+' · '+data.locale.toUpperCase()+'.');
        if(card.isConnected)onPublished();
      } catch (error) {
        report('Изменение не подтверждено: '+error.message+
          '. Перепроверь запись перед повторной отправкой.',true);
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
        report('Черновик '+data.locale.toUpperCase()+' сохранён в D1. Ещё не опубликован.');
        if(card.isConnected)onPublished();
      } catch(error){report('Не удалось сохранить черновик: '+error.message,true);}
      finally {busy=false;if(card.isConnected)synchronize();}
    }
    for(const [locale,name] of LANGUAGES){
      const data=record.translations.find(entry=>entry.locale===locale);
      const section=element('section',null,'localization-inline-language');
      section.dataset.translationLocale=locale;
      const label=element('label',null,'localization-inline-label');
      const heading=element('strong',name+' · '+locale.toUpperCase());
      const state=element('small',origins[data.origin]||data.origin,'localization-inline-origin');
      label.append(heading,state);
      const textarea=element('textarea');
      textarea.rows=record.kind.includes('description')||record.kind.includes('hint')?4:2;
      textarea.maxLength=4000;textarea.lang=localeTag[locale];
      textarea.dataset.translationInput=locale;
      textarea.value=drafts.has(identity(data))?drafts.get(identity(data)):saved(data)?.text??data.effective??'';
      textarea.placeholder='Перевод на '+name;
      textarea.setAttribute('aria-label',name+' · '+record.id);
      label.append(textarea);
      const buttons=element('div',null,'localization-inline-actions');
      const dirt=element('small','');const size=element('small','');
      const stageButton=element('button','В черновики');stageButton.type='button';stageButton.className='secondary';
      const saveButton=element('button','Опубликовать '+locale.toUpperCase());saveButton.type='button';
      const resetButton=element('button','Вернуть базовый');resetButton.type='button';resetButton.className='secondary';
      resetButton.title='Базовый текст: '+(data.baseline||'—');
      const entry={data,textarea,dirt,size,stageButton,saveButton,resetButton,container:section};
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
      const changed=controls.filter(e=>e.textarea.value!==e.data.effective);
      if(!changed.length)return;
      if(changed.some(e=>Boolean(saved(e.data)))) {
        report('В одном из языков есть черновик D1. Опубликуй или отмени его в очереди.',true);return;
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
        if(!result.ok || result.count!==items.length)throw Error('Неожиданный ответ публикации');
        for(const e of changed)complete(e,e.data.version+1,e.textarea.value.trim(),false);
        report('Опубликовано '+changed.length+' языковых вариантов для '+record.id+'.');
        if(card.isConnected)onPublished();
      } catch(error) {
        // A dropped HTTP response may happen AFTER commit. Avoid false rollback claims.
        try {
          const receipt=await api('GET',null,
            '/api/admin/localization/operations?operationId='+encodeURIComponent(operationId));
          if(receipt.found && receipt.receipt?.count===items.length){
            for(const e of changed)complete(e,e.data.version+1,e.textarea.value.trim(),false);
            report('Публикация '+changed.length+' языков подтверждена по квитанции D1.');
            if(card.isConnected)onPublished();
          } else report('Публикация не подтверждена: '+error.message+
            '. Обнови карточку и сравни версии перед повтором.',true);
        } catch(recoveryError){
          report('Неизвестный результат публикации: '+error.message+
            '. Не отправляй повторно без проверки истории D1.',true);
        }
      } finally {busy=false;if(card.isConnected)synchronize();}
    }
    publishAll.addEventListener('click',publishChanged);
    foot.append(publishAll,hint);
    card.append(grid,foot);
    synchronize();
    return true;
  }
  window.PandoraFourLanguageEditor=Object.freeze({mount});
})();
