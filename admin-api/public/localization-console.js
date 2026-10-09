(function () {
  'use strict';
  const host=document.getElementById('localization-console');
  if(!host)return;
  let csrf,expired,generation=0,page=0,total=0,rows=[],query='',locale='ru',scope='game',group='all',translationStatus='all';
  const drafts=new Map();
  const key=row=>row.scope+'\0'+row.id+'\0'+row.locale;
  function tag(name,content,className){
    const node=document.createElement(name);
    if(content!==undefined&&content!==null)node.textContent=content;
    if(className)node.className=className;
    return node;
  }
  let status,items,count,draftCount,prev,next,scopeInput,localeInput,searchInput,groupInput,translationStatusInput;
  async function api(method,payload,url='/api/admin/localization'){
    const headers=method==='POST'?{'Content-Type':'application/json','X-CSRF-Token':csrf()||''}:{};
    const reply=await fetch(url,{method,credentials:'same-origin',cache:'no-store',headers,
      body:payload?JSON.stringify(payload):undefined,signal:AbortSignal.timeout(12000)});
    if(reply.status===401||reply.status===403){expired();throw Error('Сеанс завершён. Войди снова.');}
    const result=await reply.json();
    if(!reply.ok||result.ok!==true)throw Error(result.message||'Сбой запроса ('+reply.status+')');
    return result;
  }
  function report(text,bad=false){if(status){status.textContent=text;status.dataset.error=String(bad);}}
  function updateDrafts(){if(draftCount)draftCount.textContent='Черновики: '+drafts.size;}
  function newPage(){
    host.replaceChildren();
    const panel=tag('section',null,'localization-panel');
    const head=tag('div',null,'localization-head');
    head.append(tag('h3','Переводы · единый центр'),
      tag('p','Интерфейс, навыки, предметы, расы и классы · RU / EN / 日本語 / 繁體中文'));
    const info=tag('p','Изменения переводов отделены от игровой механики. Исходные тексты и утверждённый импорт сохраняются. Уже опубликованные правки прежней админки имеют приоритет до переноса и явно отмечены.','localization-help');
    const filters=tag('div',null,'localization-filters');
    scopeInput=tag('select');scopeInput.setAttribute('aria-label','Раздел');
    [['game','Игровые термины и предметы'],['ui','Интерфейс']].forEach(([id,name])=>{
      const o=tag('option',name);o.value=id;scopeInput.append(o);
    });
    groupInput=tag('select');groupInput.setAttribute('aria-label','Категория переводов');
    [['all','Все категории'],['skills','Навыки и умения'],['equipment','Снаряжение'],['souls','Души'],
      ['classes','Классы'],['races','Расы и пассивки'],['stats','Характеристики'],['other','Прочее']]
      .forEach(([id,name])=>{const option=tag('option',name);option.value=id;groupInput.append(option);});
    translationStatusInput=tag('select');translationStatusInput.setAttribute('aria-label','Статус перевода');
    [['all','Все строки'],['missing','Не переведено'],['published','Правки из админки']]
      .forEach(([id,name])=>{const option=tag('option',name);option.value=id;translationStatusInput.append(option);});
    localeInput=tag('select');localeInput.setAttribute('aria-label','Язык перевода');
    [['ru','Русский'],['en','English'],['jp','日本語'],['tw','繁體中文']].forEach(([id,name])=>{
      const o=tag('option',name);o.value=id;localeInput.append(o);
    });
    searchInput=tag('input');searchInput.type='search';searchInput.placeholder='Название, ID, описание…';searchInput.setAttribute('aria-label','Поиск переводов');
    const resetDrafts=tag('button','Отменить черновики');resetDrafts.type='button';resetDrafts.className='secondary';
    resetDrafts.addEventListener('click',()=>{
      if(!drafts.size||!confirm('Отменить '+drafts.size+' несохранённых переводов?'))return;
      drafts.clear();updateDrafts();render();
    });
    draftCount=tag('output','Черновики: 0');
    filters.append(scopeInput,localeInput,groupInput,translationStatusInput,searchInput,draftCount,resetDrafts);
    status=tag('p','Загрузка…','localization-status');status.setAttribute('role','status');status.setAttribute('aria-live','polite');
    count=tag('output','');
    items=tag('div',null,'localization-items');
    const nav=tag('div',null,'localization-pagination');
    prev=tag('button','← Назад');prev.type='button';
    next=tag('button','Вперёд →');next.type='button';
    prev.addEventListener('click',()=>{page=Math.max(0,page-1);load();});
    next.addEventListener('click',()=>{page++;load();});
    nav.append(prev,count,next);panel.append(head,info,filters,status,items,nav);host.append(panel);
    scopeInput.value=scope;localeInput.value=locale;groupInput.value=group;
    translationStatusInput.value=translationStatus;searchInput.value=query;
    scopeInput.addEventListener('change',()=>{
      scope=scopeInput.value;group='all';groupInput.value='all';groupInput.disabled=scope==='ui';page=0;load();
    });
    groupInput.disabled=scope==='ui';
    groupInput.addEventListener('change',()=>{group=groupInput.value;page=0;load();});
    translationStatusInput.addEventListener('change',()=>{translationStatus=translationStatusInput.value;page=0;load();});
    localeInput.addEventListener('change',()=>{locale=localeInput.value;page=0;load();});
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
      identity.append(tag('strong',record.id),tag('small',category));
      const badge=tag('span','', 'localization-origin');
      const description={admin:'Админка · новая','previous-admin':'Админка · ранее',
        import:'Утверждённый перевод',fallback:'Нет перевода · исходный текст'};
      badge.textContent=description[record.origin]||record.origin;
      header.append(identity,badge);
      const preview=tag('div',null,'localization-preview');
      const original=record.source.en||'';
      preview.append(tag('small','Оригинал (EN)'),tag('p',original||'—'));
      const baseline=tag('div',null,'localization-baseline');
      baseline.append(tag('small','Перевод, используемый сайтом'),tag('p',record.effective||'—'));
      const input=tag('textarea');input.rows=record.kind.includes('description')?4:2;
      input.maxLength=4000;input.value=drafts.has(id)?drafts.get(id):record.effective||'';
      input.placeholder='Введите перевод или оставьте пустым для возврата к существующей версии';
      input.setAttribute('aria-label',record.locale.toUpperCase()+' '+record.id);
      const foot=tag('div',null,'localization-item-foot');
      const dirty=tag('span','', 'localization-dirty');
      const save=tag('button','Опубликовать');save.type='button';
      const reset=tag('button','Вернуть базовый текст');reset.type='button';reset.className='secondary';
      const length=tag('small');
      function sync(){
        const isDirty=input.value!==(record.effective||'');
        if(isDirty)drafts.set(id,input.value);else drafts.delete(id);
        card.dataset.dirty=String(isDirty);dirty.textContent=isDirty?'Не опубликовано':'Сохранено';
        save.disabled=!isDirty;reset.disabled=record.origin==='import';
        length.textContent=input.value.length+' / 4000';
        updateDrafts();
      }
      input.addEventListener('input',sync);
      async function commit(value){
        if(value===record.effective)return;
        save.disabled=true;reset.disabled=true;
        const requestVersion=record.version, viewToken=generation;
        try{
          const result=await api('POST',{scope:record.scope,id:record.id,locale:record.locale,
            value,expectedVersion:requestVersion});
          if(viewToken!==generation)return;
          record.version=result.version;record.override=result.override;
          record.origin=result.override?'admin':(record.baselineOrigin||'import');
          record.effective=result.override||record.baseline;
          drafts.delete(id);
          report('Перевод '+record.id+' сохранён. Проверь его после обновления страницы симулятора.');
          render();
        }catch(error){
          if(viewToken===generation){report(error.message+'. Черновик сохранён здесь; не закрывай вкладку до разрешения конфликта.',true);
          sync();}
        }finally{if(viewToken===generation){save.disabled=false;sync();}}
      }
      save.addEventListener('click',()=>commit(input.value));
      reset.addEventListener('click',()=>commit(''));
      input.addEventListener('keydown',event=>{
        if(event.key==='Escape'){input.value=record.effective||'';sync();}
        if(event.key==='Enter'&&(event.ctrlKey||event.metaKey)){event.preventDefault();commit(input.value);}
      });
      foot.append(dirty,length,save,reset);card.append(header,preview,baseline,input,foot);items.append(card);
      sync();
    }
    const start=page*40;count.textContent=(total?start+1:0)+'–'+Math.min(total,start+rows.length)+' из '+total;
    prev.disabled=page<=0;next.disabled=(page+1)*40>=total;
  }
  async function load(){
    const token=++generation;
    report('Загружаю переводы…');
    const params=new URLSearchParams({scope,locale,group,status:translationStatus,page:String(page),q:query});
    try{
      const result=await api('GET',null,'/api/admin/localization?'+params);
      if(token!==generation)return;
      rows=result.items;total=result.total;
      render();
      report('Раздел: '+result.counts[scope]+' ключей. В этой странице: '+rows.length+'.');
    }catch(error){if(token===generation)report(error.message,true);}
  }
  function clear(){generation++;drafts.clear();host.replaceChildren();status=items=null;}
  window.addEventListener('beforeunload',event=>{
    if(!drafts.size)return;event.preventDefault();event.returnValue='';
  });
  window.PandoraLocalizationConsole={
    start:function(getCsrf,onExpired){csrf=getCsrf;expired=onExpired;newPage();return load();},
    clear
  };
})();