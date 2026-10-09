(function(){
'use strict';
function el(tag,text,klass){
  const e=document.createElement(tag);
  if(text!==undefined)e.textContent=text;
  if(klass)e.className=klass;
  return e;
}
function mount(host,{api,onPublished,onJump,onQueueChanged}){
  let drafts=new Map(),selected=new Set(),busy=false,active=true;
  const key=item=>item.scope+'\0'+item.id+'\0'+item.locale;
  const wrapper=el('details',undefined,'localization-queue');
  const summary=el('summary','Облачные черновики переводов · загрузка…');
  const status=el('p','', 'localization-queue-status');status.setAttribute('role','status');status.setAttribute('aria-live','polite');
  const content=el('div',undefined,'localization-queue-content');
  wrapper.append(summary,status,content);host.append(wrapper);
  function message(value,failed=false){status.textContent=value;status.dataset.error=String(failed);}
  function get(scope,id,locale){return drafts.get(key({scope,id,locale}))||null;}
  async function refresh(){
    if(!active)return;
    try{
      const reply=await api('GET',null,'/api/admin/localization/drafts');
      if(!active)return;
      drafts=new Map(reply.items.map(item=>[key(item),item]));
      selected=new Set([...selected].filter(x=>drafts.has(x)));
      summary.textContent='Сохранённые черновики переводов: '+reply.count;
      render();onQueueChanged?.();
    }catch(error){if(active)message('Не удалось перечитать черновики: '+error.message,true);}
  }
  function render(){
    content.replaceChildren();
    if(!drafts.size){content.append(el('p','Сохранённых черновиков переводов нет.','help-text'));return;}
    const bar=el('div',undefined,'localization-queue-toolbar');
    const output=el('output','Выбрано: '+selected.size+' из '+drafts.size);
    const selectAll=el('button','Выбрать первые 50');selectAll.type='button';selectAll.className='secondary';
    selectAll.onclick=()=>{selected=new Set([...drafts.keys()].slice(0,50));render();};
    const clear=el('button','Снять выделение');clear.type='button';clear.className='secondary';
    clear.onclick=()=>{selected.clear();render();};
    const publish=el('button','Опубликовать выбранные');publish.type='button';
    publish.disabled=busy||!selected.size||selected.size>50;
    publish.onclick=()=>publishSelected();
    bar.append(output,selectAll,clear,publish);
    content.append(bar);
    const items=el('div',undefined,'localization-queue-items');
    for(const [id,draft] of drafts){
      const row=el('div',undefined,'localization-queue-row');
      const label=el('label'),check=el('input');check.type='checkbox';check.checked=selected.has(id);check.disabled=busy;
      check.onchange=()=>{if(check.checked)selected.add(id);else selected.delete(id);render();};
      const details=el('span',undefined,'localization-queue-row-text');
      details.append(el('strong',draft.id+' · '+draft.locale.toUpperCase()),
        el('small',draft.scope+' · версия черновика '+draft.version),
        el('p',draft.text));
      label.append(check,details);
      const actions=el('div',undefined,'localization-queue-row-actions');
      const open=el('button','Открыть');open.type='button';open.className='secondary';
      open.onclick=()=>onJump(draft);
      const remove=el('button','Удалить черновик');remove.type='button';remove.className='secondary';
      remove.onclick=async()=>{
        if(busy||!window.confirm('Удалить сохранённый черновик '+draft.id+'? Публикация не изменится.'))return;
        busy=true;render();
        try{await api('DELETE',{scope:draft.scope,id:draft.id,locale:draft.locale,
          expectedDraftVersion:draft.version},'/api/admin/localization/draft');
          selected.delete(id);await refresh();message('Черновик удалён. Опубликованный перевод не изменён.');
        }catch(error){message(error.message,true);}finally{busy=false;render();}
      };
      actions.append(open,remove);row.append(label,actions);items.append(row);
    }
    content.append(items);
  }
  async function publishSelected(){
    if(busy||!selected.size||selected.size>50)return;
    const items=[...selected].map(id=>drafts.get(id)).filter(Boolean);
    if(!items.length)return;
    if(!window.confirm('Опубликовать '+items.length+' сохранённых переводов ОДНОЙ атомарной операцией?'))return;
    const operationId=window.crypto.randomUUID();
    busy=true;render();message('Публикую выбранные черновики…');
    let receipt=null;
    try{
      receipt=await api('POST',{operationId,items:items.map(item=>({
        scope:item.scope,id:item.id,locale:item.locale,expectedDraftVersion:item.version
      }))},'/api/admin/localization/publish-batch');
    }catch(error){
      message('Проверяю результат после ошибки ответа сервера…');
      try{
        const check=await api('GET',null,'/api/admin/localization/operations?operationId='+encodeURIComponent(operationId));
        if(check.found)receipt=check.receipt;
        else message('Подтверждение публикации не получено. Черновики не удаляй; обнови список и проверь состояние. '+error.message,true);
      }catch(second){
        message('Не удалось проверить результат. Повтори проверку после восстановления соединения; не публикуй вслепую. '+second.message,true);
      }
    }finally{
      busy=false;
      if(receipt){
        selected.clear();message('Опубликовано '+receipt.count+' переводов в одной операции.');
        await refresh();onPublished();
      }else await refresh();
      render();
    }
  }
  function history(target,record,onRestore){
    const button=el('button','История');button.type='button';button.className='secondary';
    const holder=el('div',undefined,'localization-history');
    button.onclick=async()=>{
      if(holder.childElementCount){holder.replaceChildren();return;}
      holder.append(el('p','Загружаю историю…'));
      try{
        const params=new URLSearchParams({scope:record.scope,id:record.id,locale:record.locale});
        const result=await api('GET',null,'/api/admin/localization/history?'+params);
        holder.replaceChildren();
        if(!result.items.length){holder.append(el('p','Новые версии пока не зафиксированы; история начинается с установки нового журнала.'));return;}
        for(const item of result.items){
          const article=el('div',undefined,'localization-history-entry');
          article.append(el('small','Версия '+item.version+' · '+new Date(item.publishedAt*1000).toLocaleString()),
            el('p',item.after||record.baseline||'—'));
          const restore=el('button','Вернуть эту версию');restore.type='button';restore.className='secondary';
          restore.onclick=async()=>{
            if(!window.confirm('Восстановить эту формулировку как НОВУЮ версию перевода?'))return;
            restore.disabled=true;
            try{
              await api('POST',{scope:record.scope,id:record.id,locale:record.locale,value:item.after,
                expectedVersion:record.version,expectedEffective:record.effective});
              holder.replaceChildren();
              await refresh();onRestore();
            }catch(error){holder.append(el('p',error.message));restore.disabled=false;}
          };
          article.append(restore);holder.append(article);
        }
      }catch(error){holder.replaceChildren(el('p',error.message));}
    };
    target.append(button,holder);
  }
  refresh();
  return {get,refresh,history,destroy(){active=false;wrapper.remove();}};
}
window.PandoraLocalizationDrafts={mount};
})();
