(function () {
  'use strict';

  // Only visible, localized text is editable here. Source EN/JP/TW values,
  // game mechanics, legacy catalog snapshots and existing drafts stay intact.
  const MAX_MATCHES=100, MAX_SCAN=3500;
  const cleanWord=value=>typeof value==='string' && value.length>0 && value.length<=60 &&
    /^[\p{L}\p{N}_]+$/u.test(value);
  const safeText=value=>typeof value==='string' && value.length>0 && value.length<=80 &&
    !/[\x00-\x1f\x7f<>]/.test(value) && value===value.trim();
  const escapeRegex=value=>value.replace(/[.*+?^\u0024{}()|[\]\\]/g,'\\$&');

  function replaceWholeWord(input,word,replacement){
    if(!cleanWord(word)||!safeText(replacement))throw Error('Неверное слово или перевод');
    // Include letters from any script, digits and underscores in word
    // boundaries. Never touch placeholder names such as {Warrior}.
    const pattern=new RegExp('(^|[^\\p{L}\\p{N}_])('+escapeRegex(word)+')(?=$|[^\\p{L}\\p{N}_])','giu');
    return String(input).split(/(\{[A-Za-z0-9_]+\})/g).map(part=>
      /^\{[A-Za-z0-9_]+\}$/.test(part)?part:part.replace(pattern,(_match,before)=>before+replacement)
    ).join('');
  }

  function node(name,value,css){
    const el=document.createElement(name);
    if(value!==undefined)el.textContent=value;
    if(css)el.className=css;
    return el;
  }

  function mount(host,{api,getContext,hasDraft,onPublished}){
    let active=true,busy=false,epoch=0,proposal=null,selections=new Map();
    const root=node('details',undefined,'localization-bulk');
    const heading=node('summary','Массовая замена слова · предварительный просмотр');
    const intro=node('p','Только отдельные слова в действующих текстах выбранного языка и раздела. Регистр поиска не учитывается; части других слов и плейсхолдеры {name} не меняются. Английский оригинал остаётся нетронутым.','localization-bulk-help');
    const controls=node('div',undefined,'localization-bulk-controls');
    const word=node('input');word.placeholder='Warrior';word.maxLength=60;word.setAttribute('aria-label','Найти целое слово');
    const translated=node('input');translated.placeholder='Воин';translated.maxLength=80;translated.setAttribute('aria-label','Заменить словом');
    const missing=node('input');missing.type='checkbox';missing.checked=true;missing.id='bulk-missing-'+Math.random().toString(36).slice(2);
    const missingLabel=node('label');missingLabel.append(missing,document.createTextNode(' Только без готового перевода'));
    const scan=node('button','Показать предварительный просмотр');scan.type='button';
    controls.append(word,translated,missingLabel,scan);
    const state=node('p','Сначала укажи слово и перевод.','localization-bulk-state');state.setAttribute('role','status');state.setAttribute('aria-live','polite');
    const results=node('div',undefined,'localization-bulk-results');
    const actions=node('div',undefined,'localization-bulk-actions');
    const publish=node('button','Опубликовать выбранные');publish.type='button';publish.disabled=true;
    const cancel=node('button','Очистить предпросмотр');cancel.type='button';cancel.className='secondary';cancel.disabled=true;
    actions.append(publish,cancel);
    root.append(heading,intro,controls,state,results,actions);host.append(root);

    function context(){
      const selected=getContext();
      return {scope:selected.scope,locale:selected.locale,
        group:selected.scope==='ui'?'all':selected.group,
        status:missing.checked?'missing':'all',word:word.value.trim(),replacement:translated.value};
    }
    function fingerprint(value){return JSON.stringify(value);}
    function setBusy(value){
      busy=value;scan.disabled=value;word.disabled=value;translated.disabled=value;missing.disabled=value;
      publish.disabled=value||!proposal||!Array.from(selections.values()).some(Boolean);
      cancel.disabled=value||!proposal;
      for(const checkbox of results.querySelectorAll('input[type="checkbox"]'))checkbox.disabled=value;
    }
    function invalidate(){
      epoch++;proposal=null;selections.clear();results.replaceChildren();
      state.textContent='Предпросмотр сброшен. Проверь слово и параметры, затем выполни поиск.';
      publish.disabled=true;cancel.disabled=true;
    }
    function stillCurrent(current){
      return active && fingerprint(context())===fingerprint(current);
    }
    function searchUrl(current,page){
      const params=new URLSearchParams({scope:current.scope,locale:current.locale,
        group:current.group,status:current.status,q:current.word,page:String(page)});
      return '/api/admin/localization?'+params.toString();
    }
    async function collect(current){
      const found=[],skipped=[];
      let total=Infinity,page=0;
      while(page*40<total){
        if(!active||!stillCurrent(current))throw Error('Параметры изменились. Повтори предпросмотр.');
        const response=await api('GET',null,searchUrl(current,page));
        total=response.total;
        if(total>MAX_SCAN)throw Error('Слишком много строк для безопасного предпросмотра. Выбери более узкую категорию.');
        if(!Array.isArray(response.items)||response.page!==page)throw Error('Неполная страница переводов.');
        for(const row of response.items){
          const before=row.effective||'',after=replaceWholeWord(before,current.word,current.replacement);
          if(before===after)continue;
          if(after.length>4000||after!==after.trim()||/[\x00-\x09\x0b-\x1f\x7f<>]/.test(after)){
            skipped.push(row.id+' (ограничение поля)');continue;
          }
          const item={id:row.id,scope:row.scope,locale:row.locale,version:row.version,
            before,after,origin:row.origin,kind:row.kind,blocked:hasDraft(row)};
          found.push(item);
          if(found.length>MAX_MATCHES)throw Error('Найдено больше '+MAX_MATCHES+' строк. Сузь категорию или слово: частичный пакет не создаётся.');
        }
        page++;
      }
      return {found,skipped};
    }

    function render(){
      results.replaceChildren();selections.clear();
      const {found,skipped}=proposal;
      state.textContent='Совпадений: '+found.length+'. Не обработано: '+skipped.length+
        '. Выбери строки и проверь текст до/после.';
      if(skipped.length)results.append(node('p','Пропущено: '+skipped.slice(0,8).join(', '),'localization-bulk-warning'));
      for(const item of found){
        const card=node('article',undefined,'localization-bulk-row');
        const label=node('label');
        const checkbox=node('input');checkbox.type='checkbox';checkbox.checked=!item.blocked;checkbox.disabled=item.blocked;
        selections.set(item.id,checkbox.checked);
        checkbox.addEventListener('change',()=>{selections.set(item.id,checkbox.checked);publish.disabled=!Array.from(selections.values()).some(Boolean);});
        label.append(checkbox,document.createTextNode(' '+item.id+' · '+item.kind+(item.blocked?' · есть несохранённый черновик':'')));
        card.append(label,node('small','Было'),node('p',item.before,'localization-bulk-before'),
          node('small','Станет'),node('p',item.after,'localization-bulk-after'));
        results.append(card);
      }
      publish.disabled=!Array.from(selections.values()).some(Boolean);
      cancel.disabled=false;
    }

    scan.addEventListener('click',async()=>{
      if(busy)return;
      invalidate();
      const current=context(),requestId=epoch;
      if(!cleanWord(current.word)){state.textContent='Введи одно целое слово (буквы, цифры или _), не фразу.';return;}
      if(!safeText(current.replacement)){state.textContent='Введи безопасный перевод до 80 символов без HTML.';return;}
      setBusy(true);state.textContent='Ищу совпадения во всех страницах выбранной категории…';
      try{
        const data=await collect(current);
        if(requestId!==epoch||!stillCurrent(current))return;
        proposal={...data,current,signature:fingerprint(current)};
        render();
      }catch(error){if(requestId===epoch){proposal=null;state.textContent=error.message;}}
      finally{setBusy(false);}
    });

    async function commit(){
      if(busy||!proposal||!stillCurrent(proposal.current)){invalidate();return;}
      const checked=proposal.found.filter(item=>selections.get(item.id));
      if(!checked.length)return;
      if(checked.some(item=>hasDraft(item))){
        state.textContent='В выбранных строках появились несохранённые черновики. Повтори предпросмотр.';return;
      }
      if(!window.confirm('Опубликовать замену в '+checked.length+' строках языка '+proposal.current.locale.toUpperCase()+
          '? Английский оригинал и остальные языки не изменятся.'))return;
      const current=proposal.current,requestId=epoch;
      setBusy(true);
      let published=0;
      try{
        // Re-read the full matching selection first; never apply a stale
        // preview or save over another published translation.
        state.textContent='Повторно сверяю версии и тексты перед публикацией…';
        const latest=await collect(current);
        const actual=new Map(latest.found.map(item=>[item.id,item]));
        for(const before of checked){
          const now=actual.get(before.id);
          if(!now||now.version!==before.version||now.before!==before.before||now.after!==before.after||now.blocked)
            throw Error('Данные изменились для '+before.id+'. Пересмотри пакет.');
        }
        for(const item of checked){
          if(!active||requestId!==epoch||!stillCurrent(current))throw Error('Контекст редактора изменился.');
          // The server checks both row revision and effective text (including
          // published values from the compatibility editor).
          await api('POST',{scope:item.scope,id:item.id,locale:item.locale,value:item.after,
            expectedVersion:item.version,expectedEffective:item.before});
          published++;
          state.textContent='Опубликовано '+published+' из '+checked.length+'.';
        }
        invalidate();
        state.textContent='Успешно опубликовано '+published+' строк. Проверь переводы на сайте.';
      }catch(error){
        invalidate();
        state.textContent='Остановлено: '+published+' из '+checked.length+' строк опубликовано; остальные не изменены. '+
          error.message+' Составь новый предпросмотр перед повторной попыткой.';
      }finally{
        setBusy(false);
        if(published)onPublished();
      }
    }
    publish.addEventListener('click',commit);
    cancel.addEventListener('click',invalidate);
    for(const input of [word,translated,missing])input.addEventListener('input',()=>{if(!busy)invalidate();});
    return {invalidate,destroy(){active=false;invalidate();root.remove();}};
  }

  window.PandoraBulkLocalization={mount,replaceWholeWord};
})();
