(function () {
  'use strict';
  var root = document.getElementById('ui-translation-editor');
  if (!root) return;
  var csrf, expired, generation = 0;
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
  function clear() { generation++; root.replaceChildren(); }
  async function load() {
    var token = ++generation;
    root.replaceChildren();
    var panel = element('details'); panel.dataset.uiTranslationPanel = '';
    panel.appendChild(element('summary','Тексты Modern UI · RU / EN · 242 ключа'));
    panel.appendChild(element('p',
      'Основной перевод хранится в translations.xlsx. Здесь публикуются только отличия от Excel; ' +
      'пустое поле — использовать Excel. Изменения текста не меняют игровые характеристики. ' +
      'Предусмотрены проверка плейсхолдеров и защита от перезаписи изменений в другой вкладке.',
      'result-label-help'));
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
    toolbar.append(search,locale,changedWrap,count);
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
      function render() {
        if (token !== generation) return;
        var found=visibleRecords(); page=Math.min(page,Math.max(0,Math.ceil(found.length/pageSize)-1));
        records.replaceChildren();
        var start=page*pageSize;
        found.slice(start,start+pageSize).forEach(function(item){
          var row=element('div',null,'ui-translation-row');
          var identity=element('div',null,'ui-translation-identity');
          identity.append(element('strong',item.id),element('small','EN: '+item.source));
          var editor=element('input'); editor.type='text'; editor.maxLength=300;
          editor.value=item.value; editor.placeholder=item.locale==='ru'?'Перевод RU из Excel (оставь пустым)':'Оригинал EN из Excel';
          editor.setAttribute('aria-label',item.locale.toUpperCase()+' '+item.id);
          var status=element('span',item.overridden?'Админка · v'+item.version:'Excel','ui-translation-status');
          var save=element('button','Сохранить'); save.type='button';
          var reset=element('button','Вернуть Excel'); reset.type='button';reset.className='secondary';
          reset.disabled=!item.overridden;
          var controls=element('div',null,'ui-translation-actions');
          controls.append(save,reset);
          async function commit(value) {
            save.disabled=reset.disabled=true;
            try {
              var answer=await api('POST',{id:item.id,locale:item.locale,value,expectedVersion:item.version});
              if(token !== generation)return;
              Object.assign(item,answer);
              notify('Сохранено: '+item.locale.toUpperCase()+' / '+item.id+'. Обнови страницу симулятора для проверки.');
              render();
            } catch(error) {
              if(token !== generation)return;
              notify(error.message+' Обновляю список без перезаписи чужих изменений.',true);
              var open=panel.open;
              await load(); root.querySelector('details').open=open;
            } finally {if(token===generation)save.disabled=false;}
          }
          save.addEventListener('click',function(){commit(editor.value);});
          reset.addEventListener('click',function(){commit('');});
          editor.addEventListener('keydown',function(event){
            if(event.key==='Enter'){event.preventDefault();commit(editor.value);}
            if(event.key==='Escape')editor.value=item.value;
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
      }
      search.addEventListener('input',function(){page=0;render();});
      locale.addEventListener('change',function(){page=0;render();});
      changed.addEventListener('change',function(){page=0;render();});
      render();
      notify('Доступно '+(items.length/2)+' ключа для RU и EN. Опубликованные изменения имеют приоритет над Excel.');
    } catch(error) {if(token===generation)state.textContent=error.message;}
  }
  window.PandoraUiTranslationConsole={
    start:function(csrfGetter,onExpired){csrf=csrfGetter;expired=onExpired;return load();},
    clear
  };
})();
