(function () {
  'use strict';
  var root = document.getElementById('ui-translation-editor');
  if (!root) return;
  var csrf, expired, generation = 0;
  // Unsaved drafts stay local; never sent until explicitly saved.
  var drafts = new Map();
  window.addEventListener('beforeunload',function(event){
    if(!drafts.size)return;
    event.preventDefault(); event.returnValue='';
  });
  function element(tag, text, cls) {
    var e = document.createElement(tag);
    if (text != null) e.textContent = text;
    if (cls) e.className = cls;
    return e;
  }
  async function api(method, payload) {
    var response = await fetch('/api/admin/ui-translations', {
      method, credentials: 'same-origin', cache: 'no-store',
      headers: method === 'POST' ? {'Content-Type':'application/json','X-CSRF-Token':csrf() || ''} : {},
      body: method === 'POST' ? JSON.stringify(payload) : undefined,
      signal: AbortSignal.timeout(10000)
    });
    if (response.status === 401 || response.status === 403) {
      expired(); throw new Error('Сессия завершилась. Войди снова.');
    }
    var data = await response.json();
    if (!response.ok || data.ok !== true) throw new Error(data.message || 'Ошибка сохранения');
    return data;
  }
  function clear() { generation++; drafts.clear(); root.replaceChildren(); }
  async function load() {
    var token = ++generation;
    root.replaceChildren();
    var panel = element('details'); panel.dataset.uiTranslationPanel = '';
    panel.appendChild(element('summary','Тексты Modern UI · RU / EN · 242 ключа'));
    panel.appendChild(element('p',
      'Основной перевод сохранён в утверждённом каталоге. Здесь доступны прежние правки; ' +
      'пустое поле — использовать базовый текст. Изменения текста не меняют игровые характеристики. ' +
      'Предусмотрены проверка плейсхолдеров и защита от перезаписи изменений в другой вкладке.',
      'result-label-help'));
    var render;
    var toolbar = element('div',null,'ui-translation-filters');
    var search = element('input');
    search.type='search'; search.placeholder='Поиск ID или исходного текста…';
    search.setAttribute('aria-label','Поиск перевода интерфейса');
    var locale=element('select'); locale.setAttribute('aria-label','Язык перевода');
    [['ru','Русский'],['en','English']].forEach(function(entry){
      var option=element('option',entry[1]); option.value=entry[0]; locale.appendChild(option);
    });
    var changedWrap=element('label');
    var changed=element('input'); changed.type='checkbox';
    changedWrap.append(changed,document.createTextNode(' Только правки админки'));
    var count=element('output'); count.setAttribute('aria-live','polite');
    var draftStatus=element('output'); draftStatus.dataset.uiDraftCount='';
    var discard=element('button','Отменить черновики'); discard.type='button';
    discard.className='secondary'; discard.disabled=true; discard.dataset.uiDiscardDrafts='';
    var reload=element('button','Обновить с сервера'); reload.type='button';
    reload.className='secondary'; reload.dataset.uiReload='';
    toolbar.append(search,locale,changedWrap,count,draftStatus,discard,reload);
    function updateDraftStatus(){
      draftStatus.textContent='Несохранённые: '+drafts.size;
      discard.disabled=!drafts.size;
    }
    discard.addEventListener('click',function(){
      if(!drafts.size || !window.confirm('Отменить все '+drafts.size+' несохранённые правки?'))return;
      drafts.clear(); updateDraftStatus();
      if(typeof render==='function')render();
    });
    reload.addEventListener('click',function(){
      if(drafts.size && !window.confirm('Есть несохранённые правки. Отменить их и обновить данные?'))return;
      drafts.clear();
      var expanded=panel.open;
      load().then(function(){if(root.querySelector('details'))root.querySelector('details').open=expanded;});
    });
    updateDraftStatus();
    var state=element('p','Загружаю интерфейсные переводы…','result-label-status');
    state.setAttribute('role','status'); state.setAttribute('aria-live','polite');
    var records=element('div',null,'ui-translation-list');
    panel.append(toolbar,state,records); root.appendChild(panel);
    try {
      var payload=await api('GET');
      if (token !== generation) return;
      var items=payload.items, page=0, pageSize=40;
      function notify(message,error) {state.textContent=message; state.dataset.error=error?'true':'false';}
      function visibleRecords() {
        var q=search.value.trim().toLocaleLowerCase('ru');
        return items.filter(function(item) {
          return item.locale === locale.value && (!changed.checked || item.overridden) &&
            (!q || item.id.toLocaleLowerCase('ru').includes(q) ||
              item.source.toLocaleLowerCase('ru').includes(q) ||
              item.value.toLocaleLowerCase('ru').includes(q));
        });
      }
      render = function render() {
        if (token !== generation) return;
        var found=visibleRecords(); page=Math.min(page,Math.max(0,Math.ceil(found.length/pageSize)-1));
        records.replaceChildren();
        var start=page*pageSize;
        found.slice(start,start+pageSize).forEach(function(item){
          var row=element('div',null,'ui-translation-row');
          row.dataset.uiTranslationId=item.id; row.dataset.uiLocale=item.locale;
          var identity=element('div',null,'ui-translation-identity');
          identity.append(element('strong',item.id),element('small','EN: '+item.source));
          var editor=element('input'); editor.type='text'; editor.maxLength=300;
          var key=item.locale+'\u0000'+item.id;
          editor.value=drafts.has(key)?drafts.get(key):item.value;
          editor.placeholder=item.locale==='ru'?'Базовый текст RU (оставь пустым)':'Базовый текст EN';
          editor.setAttribute('aria-label',item.locale.toUpperCase()+' '+item.id);
          var status=element('span',item.overridden?'Админка · v'+item.version :'Базовый текст','ui-translation-status');
          var save=element('button','Сохранить'); save.type='button';
          var reset=element('button','Вернуть базовый текст'); reset.type='button';reset.className='secondary';
          reset.disabled=!item.overridden;
          var controls=element('div',null,'ui-translation-actions');
          controls.append(save,reset);
          function updateDraft(){
            var changed=editor.value!==item.value;
            if(changed) drafts.set(key,editor.value); else drafts.delete(key);
            row.dataset.uiUnsaved=String(changed);
            status.textContent=changed?'Не сохранено':item.overridden?'Админка · v'+item.version :'Базовый текст';
            save.disabled=!changed;
            updateDraftStatus();
          }
          editor.addEventListener('input',updateDraft);
          updateDraft();
          async function commit(value) {
            if(value===item.value)return;
            save.disabled=reset.disabled=true;
            try {
              var answer=await api('POST',{id:item.id,locale:item.locale,value,expectedVersion:item.version});
              if(token !== generation)return;
              Object.assign(item,answer);
              drafts.delete(key);
              updateDraftStatus();
              notify('Сохранено: '+item.locale.toUpperCase()+' / '+item.id+'. Обнови страницу симулятора для проверки.');
              render();
            } catch(error) {
              if(token !== generation)return;
              // Keep the entered text on a network error or concurrent edit.
              notify(error.message+' Черновик сохранён в этой вкладке. Скопируй текст перед обновлением с сервера.',true);
            } finally {if(token===generation)save.disabled=(editor.value===item.value);}
          }
          save.addEventListener('click',function(){commit(editor.value);});
          reset.addEventListener('click',function(){commit('');});
          editor.addEventListener('keydown',function(event){
            if(event.key==='Enter' && !event.shiftKey){event.preventDefault();commit(editor.value);}
            if(event.key==='Escape'){editor.value=item.value;updateDraft();}
          });
          row.append(identity,editor,status,controls); records.appendChild(row);
        });
        var paging=element('div',null,'ui-translation-pagination');
        var previous=element('button','← Назад');previous.type='button';previous.disabled=!page;
        var next=element('button','Вперёд →');next.type='button';next.disabled=(page+1)*pageSize>=found.length;
        previous.addEventListener('click',function(){page--;render();});
        next.addEventListener('click',function(){page++;render();});
        paging.append(previous,element('span',Math.min(start+1,found.length)+'–'+Math.min(start+pageSize,found.length)+' из '+found.length),next);
        records.appendChild(paging);
        count.textContent='Найдено '+found.length+' из '+items.filter(item=>item.locale===locale.value).length;
      };
      search.addEventListener('input',function(){page=0;render();});
      locale.addEventListener('change',function(){page=0;render();});
      changed.addEventListener('change',function(){page=0;render();});
      render();
      notify('Доступно '+(items.length/2)+' ключа для RU и EN. Опубликованные изменения имеют приоритет над базовым переводом.');
    } catch(error) {if(token===generation)state.textContent=error.message;}
  }
  window.PandoraUiTranslationConsole={
    start:function(csrfGetter,onExpired){csrf=csrfGetter;expired=onExpired;return load();},
    clear
  };
})();
