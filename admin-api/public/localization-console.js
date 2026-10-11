(function () {
  'use strict';
  const host=document.getElementById('localization-console');
  if(!host)return;
  let csrf,expired,generation=0,page=0,total=0,rows=[],query='',locale='ru',scope='game',group='all',translationStatus='all';
  const drafts=new Map();
  let bulk,queued,auditRequest=0;
  const key=row=>row.scope+'\0'+row.id+'\0'+row.locale;
  function tag(name,content,className){
    const node=document.createElement(name);
    if(content!==undefined&&content!==null)node.textContent=content;
    if(className)node.className=className;
    return node;
  }
  function localized(name,key,english,className) {
    const node=tag(name,window.PandoraAdminI18n?.t?.('adminShell.'+key,english)||english,className);
    node.dataset.adminI18n='adminShell.'+key;
    return node;
  }

  // Dynamic localization never attaches data-admin-i18n to a parent containing
  // textareas, inputs, or response-owned children. It only mutates leaf text.
  const liveValues=new WeakMap();
  function translated(key,fallback,values={}) {
    const template=window.PandoraAdminI18n?.t?.('adminShell.'+key,fallback)||fallback;
    return template.replace(/\{([A-Za-z0-9_]+)\}/g,(match,name)=>
      Object.hasOwn(values,name)?String(values[name]):match);
  }
  function liveText(element,key,fallback,values={}) {
    liveValues.set(element,{key,fallback,values});
    element.dataset.adminLiveI18n=key;
    element.textContent=translated(key,fallback,values);
    return element;
  }
  window.addEventListener('pandora-admin:localechange',()=>{
    host.querySelectorAll('[data-admin-live-i18n]').forEach(element=>{
      const entry=liveValues.get(element);
      if(entry)element.textContent=translated(entry.key,entry.fallback,entry.values);
    });
  });
  function aria(node,key,english) {
    node.dataset.adminI18nAria='adminShell.'+key;
    node.setAttribute('aria-label',english);
  }
  function localizedOption(id,name,prefix) {
    const key=prefix+id[0].toUpperCase()+id.slice(1);
    const option=localized('option',key,name);
    option.value=id;
    return option;
  }
  // Whitelisted UI metadata only. IDs, source strings and editable values
  // are never translated through these display captions.
  const kindKeys={"interface":"locKindInterface","skill":"locKindSkillMastery","skill_entry":"locKindSkillName","skill_detail":"locKindSkillDetails","equipment":"locKindEquipment","soul":"locKindSoul","job":"locKindClass","class":"locKindClass","race":"locKindRace","racial_skill":"locKindRacialPassive","calculator_label":"locKindStat","calculator_hint":"locKindHint","equipment_category":"locKindEquipmentCategory"};
  const originKeys={"admin":"locOriginAdmin","previous-admin":"locOriginPrevious","catalog":"locOriginCatalog","import":"locOriginImport","fallback":"locOriginFallback"};
  let status,items,count,draftCount,progress,progressLabel,prev,next,scopeInput,localeInput,searchInput,groupInput,translationStatusInput;
  async function api(method,payload,url='/api/admin/localization'){
    const headers=method!=='GET'?{'Content-Type':'application/json','X-CSRF-Token':csrf()||''}:{};
    const reply=await fetch(url,{method,credentials:'same-origin',cache:'no-store',headers,
      body:payload?JSON.stringify(payload):undefined,signal:AbortSignal.timeout(12000)});
    if(reply.status===401||reply.status===403){expired();throw Error('Сеанс завершён. Войди снова.');}
    const result=await reply.json();
    if(!reply.ok||result.ok!==true)throw Error(result.message||'Сбой запроса ('+reply.status+')');
    return result;
  }
  function report(text,bad=false){if(status){liveValues.delete(status);delete status.dataset.adminLiveI18n;status.textContent=text;status.dataset.error=String(bad);}}
  function reportLive(key,fallback,values={},bad=false){if(status){liveText(status,key,fallback,values);status.dataset.error=String(bad);}}
  function updateDrafts(){if(draftCount)liveText(draftCount,'locUnsavedCount','Не сохранено: {count}',{count:drafts.size});}
  function newPage(){
    host.replaceChildren();
    const panel=tag('section',null,'localization-panel');
    const head=tag('div',null,'localization-head');
    head.append(localized('h3','localizationHeading','Переводы · единый центр'),
      localized('p','localizationSubtitle','Интерфейс, навыки, предметы, расы и классы · RU / EN / 日本語 / 繁體中文'));
    const info=localized('p','localizationHelp','Все четыре языка открыты одновременно в каждой карточке. Поиск работает по всем четырём языкам. Фильтр языка влияет только на статус переводов и статистику; для редактирования переключать его не нужно. Можно опубликовать изменённые языки одной транзакцией D1. Новые предметы и навыки по-прежнему редактируются в каталоге, без второй копии данных. Названия и описания не влияют на расчёты.','localization-help');
    const filters=tag('div',null,'localization-filters');
    scopeInput=tag('select');aria(scopeInput,'filterScope','Раздел');
    [['game','Игровые термины и предметы'],['ui','Интерфейс']].forEach(([id,name])=>{
      scopeInput.append(localizedOption(id,name,'scope'));
    });
    groupInput=tag('select');aria(groupInput,'filterCategory','Категория переводов');
    [['all','Все категории'],['skills','Навыки и умения'],['equipment','Снаряжение'],['souls','Души'],
      ['classes','Классы'],['races','Расы и пассивки'],['stats','Характеристики'],['other','Прочее']]
      .forEach(([id,name])=>groupInput.append(localizedOption(id,name,'category')));
    translationStatusInput=tag('select');aria(translationStatusInput,'filterStatus','Статус перевода');
    [['all','Все строки'],['missing','Не переведено'],['published','Правки из админки']]
      .forEach(([id,name])=>translationStatusInput.append(localizedOption(id,name,'status')));
    localeInput=tag('select');aria(localeInput,'filterCoverageLanguage','Язык статуса и покрытия');
    [['ru','Русский'],['en','English'],['jp','日本語'],['tw','繁體中文']].forEach(([id,name])=>{
      localeInput.append(localizedOption(id,name,'language'));
    });
    searchInput=tag('input');searchInput.type='search';searchInput.placeholder='Название, ID, описание…';searchInput.dataset.adminI18nPlaceholder='adminShell.localizationSearchPlaceholder';aria(searchInput,'localizationSearchLabel','Поиск переводов');
    const resetDrafts=localized('button','localizationDiscardDrafts','Отменить черновики');resetDrafts.type='button';resetDrafts.className='secondary';
    resetDrafts.addEventListener('click',()=>{
      if(!drafts.size||!confirm(translated('locDiscardConfirm','Отменить {count} несохранённых переводов?',{count:drafts.size})))return;
      drafts.clear();updateDrafts();render();
    });
    draftCount=liveText(tag('output'),'locUnsavedCount','Не сохранено: {count}',{count:0});
    filters.append(scopeInput,localeInput,groupInput,translationStatusInput,searchInput,draftCount,resetDrafts);
    // Read the effective, currently published server state only when the
    // administrator asks. Never enumerate private values or change D1 here.
    const auditButton=localized('button','locAuditAction','Проверить опубликованные переводы');
    auditButton.type='button';auditButton.className='secondary';
    filters.append(auditButton);
    const auditPanel=tag('section',null,'localization-audit');auditPanel.hidden=true;
    auditButton.addEventListener('click',async()=>{
      const token=++auditRequest;
      auditButton.disabled=true;
      auditPanel.hidden=false;
      const heading=localized('h4','locAuditTitle','Фактическое покрытие · D1 и каталог');
      const disclaimer=localized('p','locAuditDescription',
        'Восемь авторизованных запросов только на чтение. Учитываются опубликованные D1 и каталог, но не неопубликованные черновики. Это не атомарный снимок.');
      const auditStatus=tag('p');
      const results=tag('div',null,'localization-audit-results');
      auditPanel.replaceChildren(heading,disclaimer,auditStatus,results);
      liveText(auditStatus,'locAuditLoading','Проверено {done} из {total} языковых групп…',{done:0,total:8});
      try{
        const coverage=[];
        for(const selectedScope of ['game','ui'])for(const selectedLocale of ['ru','en','jp','tw']){
          const params=new URLSearchParams({scope:selectedScope,locale:selectedLocale,
            group:'all',status:'missing',page:'0'});
          const data=await api('GET',null,'/api/admin/localization?'+params);
          if(token!==auditRequest||!auditPanel.isConnected)return;
          const values=data.coverage;
          if(!values||![values.total,values.translated,data.total].every(Number.isSafeInteger)||
              values.total<0||values.translated<0||values.translated>values.total||
              data.total!==values.total-values.translated)
            throw new Error('Invalid coverage response; no data was changed');
          // Older mocked/rolling server responses may have no breakdown.
          // If present, reject inconsistent statistics rather than present
          // false translations. The report is read-only in either case.
          const categories=data.coverageByGroup;
          if(categories!==undefined){
            const allowed=new Set(['skills','equipment','souls','classes','races','stats','other']);
            if(!Array.isArray(categories)||!categories.length||
                categories.some(entry=>!entry||!allowed.has(entry.id)||
                  ![entry.total,entry.translated,entry.missing].every(Number.isSafeInteger)||
                  entry.total<0||entry.translated<0||entry.missing<0||
                  entry.translated+entry.missing!==entry.total)||
                new Set(categories.map(entry=>entry.id)).size!==categories.length||
                categories.reduce((sum,entry)=>sum+entry.total,0)!==values.total||
                categories.reduce((sum,entry)=>sum+entry.translated,0)!==values.translated||
                categories.reduce((sum,entry)=>sum+entry.missing,0)!==data.total)
              throw Error('Invalid category coverage response; no data was changed');
          }
          coverage.push({scope:selectedScope,locale:selectedLocale,
            translated:values.translated,total:values.total,missing:data.total,
            categories:categories||[]});
          liveText(auditStatus,'locAuditLoading','Проверено {done} из {total} языковых групп…',
            {done:coverage.length,total:8});
        }
        results.replaceChildren();
        const openMissing=(selectedScope,selectedLocale,selectedGroup)=>{
          bulk?.invalidate();scope=selectedScope;locale=selectedLocale;group=selectedGroup;
          translationStatus='missing';query='';page=0;
          scopeInput.value=scope;localeInput.value=locale;
          groupInput.value=group;groupInput.disabled=scope==='ui';
          translationStatusInput.value='missing';searchInput.value='';load();
        };
        const categoryMeta={
          skills:['categorySkills','Навыки и умения'],equipment:['categoryEquipment','Снаряжение'],
          souls:['categorySouls','Души'],classes:['categoryClasses','Классы'],
          races:['categoryRaces','Расы и пассивки'],stats:['categoryStats','Характеристики'],
          other:['categoryOther','Прочее']
        };
        for(const entry of coverage){
          const row=tag('div',null,'localization-audit-row');
          const label=localized('strong',entry.scope==='game'?'locAuditScopeGame':'locAuditScopeUi',
            entry.scope==='game'?'Игровые данные и каталог':'Интерфейс');
          const language=tag('span',entry.locale.toUpperCase());
          const numbers=liveText(tag('span'),'locAuditNumbers',
            'Переведено {translated} из {total} · отсутствует {missing}',entry);
          const browse=localized('button','locAuditBrowseMissing','Показать непереведённые записи');
          browse.type='button';browse.className='secondary';
          browse.addEventListener('click',()=>openMissing(entry.scope,entry.locale,'all'));
          row.append(label,language,numbers,browse);results.append(row);
          if(entry.scope==='game'&&entry.categories.length){
            const detail=tag('details',null,'localization-audit-breakdown');
            detail.append(localized('summary','locAuditCategoryBreakdown','Покрытие по категориям'));
            const detailRows=tag('div');
            for(const category of entry.categories){
              const categoryRow=tag('div',null,'localization-audit-breakdown-row');
              const [key,fallback]=categoryMeta[category.id];
              const categoryLabel=localized('strong',key,fallback);
              const counts=liveText(tag('span'),'locAuditNumbers',
                'Переведено {translated} из {total} · отсутствует {missing}',category);
              const view=localized('button','locAuditBrowseMissing','Показать непереведённые записи');
              view.type='button';view.className='secondary';
              view.disabled=category.missing===0;
              view.addEventListener('click',()=>openMissing(entry.scope,entry.locale,category.id));
              categoryRow.append(categoryLabel,counts,view);detailRows.append(categoryRow);
            }
            detail.append(detailRows);results.append(detail);
          }
        }
        liveText(auditStatus,'locAuditCompleted','Проверка покрытия завершена. Изменения не публиковались.');
      }catch(error){
        if(token===auditRequest&&auditPanel.isConnected){
          results.replaceChildren();
          liveText(auditStatus,'locAuditError','Не удалось проверить покрытие: {error}',{error:error.message});
        }
      }finally{if(auditButton.isConnected)auditButton.disabled=false;}
    });
    const coverage=tag('div',null,'localization-progress');
    progressLabel=liveText(tag('output'),'locCoverageLoading','Покрытие выбранного для фильтра языка · загрузка…');
    progress=tag('progress');progress.max=1;progress.value=0;
    aria(progress,'coverageProgressAria','Доля имеющихся переводов в выбранной категории');
    coverage.append(progressLabel,progress);
    status=liveText(tag('p',null,'localization-status'),'locLoading','Загрузка…');status.setAttribute('role','status');status.setAttribute('aria-live','polite');
    count=tag('output','');
    items=tag('div',null,'localization-items');
    const bulkHost=tag('div');
    const queueHost=tag('div');
    const nav=tag('div',null,'localization-pagination');
    prev=localized('button','paginationPrevious','← Назад');prev.type='button';
    next=localized('button','paginationNext','Вперёд →');next.type='button';
    prev.addEventListener('click',()=>{page=Math.max(0,page-1);load();});
    next.addEventListener('click',()=>{page++;load();});
    nav.append(prev,count,next);panel.append(head,info,filters,coverage,auditPanel,queueHost,bulkHost,status,items,nav);host.append(panel);
    // A D1 localization response may already have arrived before the user
    // signs in and creates this protected workbench. Apply it in place:
    // never rebuild the form or clear unsaved translation text on switching.
    window.PandoraAdminI18n?.apply?.();
    queued=window.PandoraLocalizationDrafts?.mount(queueHost,{
      api,
      onPublished:()=>load(),
      onQueueChanged:()=>render(),
      onJump:record=>{
        scope=record.scope;locale=record.locale;group='all';translationStatus='all';
        query=record.id;page=0;scopeInput.value=scope;localeInput.value=locale;
        groupInput.value='all';groupInput.disabled=scope==='ui';
        translationStatusInput.value='all';searchInput.value=query;
        bulk?.invalidate();load();
      }
    });
    bulk=window.PandoraBulkLocalization.mount(bulkHost,{
      api,
      getContext:()=>({scope,locale,group}),
      hasDraft:record=>drafts.has(key(record))||Boolean(queued?.get(record.scope,record.id,record.locale)),
      onPublished:()=>load()
    });
    scopeInput.value=scope;localeInput.value=locale;groupInput.value=group;
    translationStatusInput.value=translationStatus;searchInput.value=query;
    scopeInput.addEventListener('change',()=>{
      bulk.invalidate();scope=scopeInput.value;group='all';groupInput.value='all';groupInput.disabled=scope==='ui';page=0;load();
    });
    groupInput.disabled=scope==='ui';
    groupInput.addEventListener('change',()=>{bulk.invalidate();group=groupInput.value;page=0;load();});
    translationStatusInput.addEventListener('change',()=>{bulk.invalidate();translationStatus=translationStatusInput.value;page=0;load();});
    localeInput.addEventListener('change',()=>{bulk.invalidate();locale=localeInput.value;page=0;load();});
    let searchDebounce;
    searchInput.addEventListener('input',()=>{
      clearTimeout(searchDebounce);searchDebounce=setTimeout(()=>{query=searchInput.value.trim();page=0;load();},240);
    });
  }
  function render(){
    if(!items)return;
    items.replaceChildren();
    for(const record of rows){
      const id=key(record),card=tag('article',null,'localization-item');
      card.dataset.localizationId=record.id;
      const header=tag('div',null,'localization-item-head');
      const identity=tag('div',null,'localization-identity');
      const labels={interface:'Интерфейс',skill:'Мастерство',skill_entry:'Название умения',
        skill_detail:'Описание / условия изучения',equipment:'Снаряжение',soul:'Душа',job:'Класс',
        class:'Класс',race:'Раса',racial_skill:'Расовая пассивка',
        calculator_label:'Характеристика',calculator_hint:'Подсказка',equipment_category:'Категория снаряжения'};
      const category=labels[record.kind]||record.kind.replaceAll('.',' · ');
      identity.append(tag('strong',record.id),kindKeys[record.kind]
        ?localized('small',kindKeys[record.kind],category):tag('small',category));
      const originKey=originKeys[record.origin];
      const description={admin:'Админка · новая','previous-admin':'Админка · ранее',
        catalog:'Опубликовано в каталоге',import:'Утверждённый перевод',
        fallback:'Нет перевода · исходный текст'};
      const badge=originKey
        ?localized('span',originKey,description[record.origin],'localization-origin')
        :tag('span',record.origin,'localization-origin');
      header.append(identity,badge);
      const preview=tag('div',null,'localization-preview');
      const original=record.source.en||'';
      preview.append(localized('small','locSourceEnglish','Оригинал (EN)'),tag('p',original||'—'));
      const baseline=tag('div',null,'localization-baseline');
      baseline.append(localized('small','locEffectiveText','Перевод, используемый сайтом'),tag('p',record.effective||'—'));
      if(record.translations && record.managedBy!=='catalog'){
        // Four languages share this identity without switching search filters.
        // Catalog-managed records instead use their existing revisioned editor.
        const mounted=window.PandoraFourLanguageEditor?.mount(card,record,{
          api,queued,drafts,onDirtyChanged:updateDrafts,
          onPublished:()=>load(),report
        });
        if(mounted){card.prepend(header,preview,baseline);items.append(card);continue;}
      }
      // Legacy single-language fallback supports older worker responses.
      // Four-language comparison is fetched lazily and read-only; edits keep
      // the existing guarded versioned D1 editor and cloud draft queue.
      let compare=null;
      if(record.managedBy!=='catalog'){
        compare=tag('details',null,'localization-language-compare');
        const toggle=localized('summary','locCompareLanguages','Сравнить RU / EN / JP / TW');
        const matrix=tag('div',null,'localization-language-grid');
        matrix.append(localized('p','locCompareIntro','Открой сравнение, чтобы увидеть опубликованные значения на всех языках.'));
        let requestNumber=0;
        function jumpTo(language){
          bulk?.invalidate();
          locale=language;localeInput.value=language;
          group='all';groupInput.value='all';groupInput.disabled=scope==='ui';
          translationStatus='all';translationStatusInput.value='all';
          query=record.id;searchInput.value=query;page=0;load();
        }
        compare.addEventListener('toggle',async()=>{
          if(!compare.open)return;
          const token=++requestNumber;
          matrix.replaceChildren(localized('p','locCompareLoading','Загружаю четыре языка…'));
          try{
            const params=new URLSearchParams({scope:record.scope,compareId:record.id});
            const response=await api('GET',null,'/api/admin/localization?'+params);
            if(token!==requestNumber||!compare.isConnected||!compare.open)return;
            matrix.replaceChildren();
            for(const language of response.translations){
              const cell=tag('section',null,'localization-language-cell');
              const identity=tag('div',null,'localization-language-head');
              const compareLabels={admin:['locCompareOriginAdmin','D1 · опубликовано'],
                'previous-admin':['locCompareOriginPrevious','D1 · ранее'],
                import:['locCompareOriginImport','Исходный утверждённый'],
                catalog:['locCompareOriginCatalog','Каталог D1'],
                fallback:['locCompareOriginFallback','Не переведено · резерв']};
              const originLabel=compareLabels[language.origin];
              identity.append(tag('strong',language.locale.toUpperCase()),
                originLabel?localized('small',originLabel[0],originLabel[1]):tag('small',language.origin));
              const value=tag('p',language.effective||'—');
              value.lang=language.locale==='jp'?'ja':language.locale==='tw'?'zh-Hant':language.locale;
              const action=liveText(tag('button'),'locOpenLocale','Открыть редактор {locale}',{locale:language.locale.toUpperCase()});
              action.type='button';action.className='secondary';
              action.addEventListener('click',()=>jumpTo(language.locale));
              cell.append(identity,value,action);matrix.append(cell);
            }
          }catch(error){
            if(token===requestNumber&&compare.isConnected)
              matrix.replaceChildren(liveText(tag('p'),'locCompareFailed','Не удалось сравнить: {error}',{error:error.message}));
          }
        });
        compare.append(toggle,matrix);
      }
      if(record.managedBy==='catalog'){
        // Canonical item text belongs to the catalog's draft/publish revision,
        // not to localization_overrides. Show it in unified search without a
        // second writable field, and open the exact catalog editor on demand.
        const note=liveText(tag('p',null,'catalog-managed-note'),'locCatalogSourceNote',
          'Источник: опубликованный каталог (версия {revision}). Правки всех четырёх языков выполняются в карточке предмета или навыка; отдельная публикация перевода здесь не создаётся.',
          {revision:record.catalogRevision});
        if(Array.isArray(record.translations)){
          const matrix=tag('div',null,'localization-inline-languages');
          for(const entry of record.translations){
            const cell=tag('section',null,'localization-inline-language');
            cell.dataset.translationLocale=entry.locale;
            const title=liveText(tag('strong'),'locCatalogTag','{locale} · каталог',{locale:entry.locale.toUpperCase()});
            const value=tag('p',entry.effective||'—');
            value.lang=entry.locale==='jp'?'ja':entry.locale==='tw'?'zh-Hant':entry.locale;
            cell.append(title,value);matrix.append(cell);
          }
          card.append(matrix);
        }
        const actions=tag('div',null,'localization-item-foot');
        const open=localized('button','locEditInCatalog','Редактировать в каталоге');open.type='button';open.className='secondary';
        open.dataset.openCatalog=record.catalogId;
        open.addEventListener('click',async()=>{
          if(open.disabled)return;
          open.disabled=true;
          try{
            const editor=window.PandoraCatalogConsole;
            if(!editor?.openFromLocalization)throw Error('Редактор каталога недоступен.');
            const opened=await editor.openFromLocalization(record.catalogId,record.catalogKind);
            if(opened)reportLive('locOpenCatalogSuccess','Открыта карточка «{id}». Изменения будут опубликованы только через каталог.',{id:record.catalogId});
            else reportLive('locOpenCatalogCancelled','Переход отменён; несохранённые изменения оставлены на месте.');
          }catch(error){reportLive('locOpenCatalogFailed','Не удалось открыть запись: {error}',{error:error.message},true);}
          finally{if(card.isConnected)open.disabled=false;}
        });
        actions.append(open);
        card.dataset.managedBy='catalog';
        card.prepend(header,preview,baseline);
        card.append(note,actions);
        items.append(card);
        continue;
      }
      const savedDraft=()=>queued?.get(record.scope,record.id,record.locale);
      const input=tag('textarea');input.rows=record.kind.includes('description')?4:2;
      input.maxLength=4000;input.value=drafts.has(id)?drafts.get(id):savedDraft()?.text??record.effective??'';
      input.dataset.adminI18nPlaceholder='adminShell.locInputPlaceholder';
      input.placeholder=translated('locInputPlaceholder','Введите перевод или оставьте пустым для возврата к существующей версии');
      input.setAttribute('aria-label',record.locale.toUpperCase()+' '+record.id);
      const foot=tag('div',null,'localization-item-foot');
      const dirty=tag('span','', 'localization-dirty');
      const save=localized('button','locLegacyPublish','Опубликовать');save.type='button';
      const stage=localized('button','locLegacyStage','Сохранить черновик');stage.type='button';stage.className='secondary';
      const reset=localized('button','locLegacyReset','Вернуть базовый текст');reset.type='button';reset.className='secondary';
      const length=tag('small');
      reset.title='Восстановить базовый текст и сохранить: '+(record.baseline||'—');
      function sync(){
        const isDirty=input.value!==(savedDraft()?.text??record.effective??'');
        if(isDirty)record.justReset=false;
        if(isDirty)drafts.set(id,input.value);else drafts.delete(id);
        const published=record.origin==='admin'||record.origin==='previous-admin';
        card.dataset.dirty=String(isDirty);
        if(isDirty)liveText(dirty,'locDirtyLocal','Изменено локально');
        else if(savedDraft())liveText(dirty,'locDirtySaved','Черновик сохранён в D1');
        else if(record.justReset)liveText(dirty,'locDirtyRestored','Базовый текст восстановлен · сохранено');
        else liveText(dirty,'locDirtyPublished','Опубликовано / без изменений');
        // Even an untranslated fallback may have an unsaved draft that can
        // be discarded locally; resetting a published value needs a D1 write.
        save.disabled=Boolean(record.pending)||Boolean(savedDraft())||!isDirty;
        stage.disabled=Boolean(record.pending)||!isDirty||!input.value.trim();
        reset.disabled=Boolean(record.pending)||Boolean(savedDraft())||(!published&&!isDirty);
        if(savedDraft())reset.title='Сначала отмени облачный черновик в очереди выше';
        input.disabled=Boolean(record.pending);
        length.textContent=input.value.length+' / 4000';
        updateDrafts();
      }
      input.addEventListener('input',sync);
      stage.addEventListener('click',async()=>{
        if(record.pending||!input.value.trim())return;
        record.pending=true;sync();const token=generation;
        try{
          const draft=savedDraft();
          await api('POST',{scope:record.scope,id:record.id,locale:record.locale,value:input.value,
            expectedVersion:record.version,expectedEffective:record.effective,
            expectedDraftVersion:draft?.version||0},'/api/admin/localization/draft');
          drafts.delete(id);
          if(queued)await queued.refresh();
          if(token===generation){render();reportLive('locDraftSavedReport','Черновик {id} сохранён в Cloudflare D1. Публикации пока нет.',{id:record.id});}
        }catch(error){if(token===generation)reportLive('locDraftSaveFailed','Не удалось сохранить черновик: {error}',{error:error.message},true);}
        finally{record.pending=false;if(token===generation&&card.isConnected)sync();}
      });
      async function commit(value,resetToBaseline=false){
        if(record.pending || (!resetToBaseline&&value===record.effective))return;
        const published=record.origin==='admin'||record.origin==='previous-admin';
        if(resetToBaseline&&!published&&record.effective===record.baseline){
          // Nothing has been published over this baseline. A reset just
          // discards the local draft, without writing an unnecessary D1 row.
          drafts.delete(id);
          input.value=record.effective||'';
          record.justReset=true;
          render();
          reportLive('locResetLocalReport','Базовый текст для {id} восстановлен. Неопубликованный черновик отменён.',{id:record.id});
          return;
        }
        record.pending=true;sync();
        const requestVersion=record.version, viewToken=generation;
        let saved=false;
        try{
          const result=await api('POST',{scope:record.scope,id:record.id,locale:record.locale,
            value:resetToBaseline?'':value,expectedVersion:requestVersion,expectedEffective:record.effective});
          if(viewToken!==generation)return;
          record.version=result.version;record.override=result.override;
          record.origin=result.override?'admin':(record.baselineOrigin||'import');
          record.effective=result.override||record.baseline;
          record.justReset=resetToBaseline;
          input.value=record.effective||'';
          drafts.delete(id);
          saved=true;
          if(resetToBaseline)reportLive('locResetSavedReport','Базовый текст для {id} восстановлен и сохранён: {value}',
            {id:record.id,value:record.effective||'—'});
          else reportLive('locTranslationPublished','Перевод {id} опубликован и сохранён.',{id:record.id});
        }catch(error){
          if(viewToken===generation)
            reportLive('locWriteNotConfirmed','{error}. Изменение не подтверждено; проверь строку перед повторной попыткой.',{error:error.message},true);
        }finally{
          record.pending=false;
          if(viewToken===generation){
            // Do not call sync() on a detached textarea: it may still contain
            // the OLD published value and resurrect a draft after a reset.
            if(saved || !card.isConnected)render();
            else sync();
          }
        }
      }
      save.addEventListener('click',()=>commit(input.value));
      reset.addEventListener('click',()=>commit('',true));
      input.addEventListener('keydown',event=>{
        if(event.key==='Escape'){input.value=record.effective||'';sync();}
        if(event.key==='Enter'&&(event.ctrlKey||event.metaKey)){event.preventDefault();commit(input.value);}
      });
      foot.append(dirty,length,stage,save,reset);
      queued?.history(foot,record,()=>{queued.refresh();load();});
      card.append(header,preview,baseline,compare,input,foot);items.append(card);
      sync();
    }
    const start=page*40;liveText(count,'locPageCount','{first}–{last} из {total}',
      {first:total?start+1:0,last:Math.min(total,start+rows.length),total});
    prev.disabled=page<=0;next.disabled=(page+1)*40>=total;
  }
  async function load(){
    const token=++generation;
    reportLive('locLoadingTranslations','Загружаю переводы…');
    const params=new URLSearchParams({scope,locale,group,status:translationStatus,page:String(page),q:query,multilingual:'1'});
    try{
      const result=await api('GET',null,'/api/admin/localization?'+params);
      if(token!==generation)return;
      rows=result.items;total=result.total;
      if(result.coverage){
        progress.max=Math.max(1,result.coverage.total);
        progress.value=result.coverage.translated;
        const percent=result.coverage.total?Math.round(100*result.coverage.translated/result.coverage.total):100;
        liveText(progressLabel,'locCoverageCount','Переведено: {translated} / {total} · {percent}% ({locale})',
          {translated:result.coverage.translated,total:result.coverage.total,percent,locale:locale.toUpperCase()});
      }
      render();
      reportLive('locSectionSummary','Раздел: {count} ключей. В этой странице: {pageCount}.',
        {count:result.counts[scope],pageCount:rows.length});
    }catch(error){if(token===generation)report(error.message,true);}
  }
  function catalogPublished(){
    if(status&&scope==='game')load();
  }
  function clear(){
    window.removeEventListener('pandora:catalog-published',catalogPublished);
    generation++;auditRequest++;bulk?.destroy();bulk=null;queued?.destroy();queued=null;
    drafts.clear();host.replaceChildren();status=items=null;
  }
  window.addEventListener('beforeunload',event=>{
    if(!drafts.size)return;event.preventDefault();event.returnValue='';
  });
  window.PandoraLocalizationConsole={
    start:function(getCsrf,onExpired){
      csrf=getCsrf;expired=onExpired;newPage();
      window.removeEventListener('pandora:catalog-published',catalogPublished);
      window.addEventListener('pandora:catalog-published',catalogPublished);
      return load();
    },
    clear
  };
})();