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
  // Dynamic messages are projected into existing nodes on locale changes.
  // Never remount filters, selections, drafts or optimistic D1 publication.
  const dynamic=new Map();
  function tr(key,fallback,values){
    const template=window.PandoraAdminI18n?.t?.('adminShell.'+key,fallback)||fallback;
    return String(template).replace(/\{([A-Za-z0-9_]+)\}/g,(_match,name)=>
      Object.prototype.hasOwnProperty.call(values||{},name)?String(values[name]):_match);
  }
  function localized(node,key,fallback){
    node.setAttribute('data-admin-i18n','adminShell.'+key);
    node.textContent=tr(key,fallback);
    return node;
  }
  function attribute(node,kind,key,fallback){
    const field=kind==='aria'?'aria-label':kind;
    node.setAttribute('data-admin-i18n-'+kind,'adminShell.'+key);
    node.setAttribute(field,tr(key,fallback));
    return node;
  }
  function messageNode(node,key,fallback,getValues){
    dynamic.set(node,{key,fallback,getValues});
    node.textContent=tr(key,fallback,getValues());
    return node;
  }
  function switchLanguage(){
    for(const [node,msg] of dynamic){
      if(!node.isConnected){dynamic.delete(node);continue;}
      node.textContent=tr(msg.key,msg.fallback,msg.getValues());
    }
  }
  window.addEventListener('pandora-admin:localechange',switchLanguage);
  const wrapper=el('details',undefined,'localization-queue');
  const summary=localized(el('summary'),'draftQueueLoading','Cloud translation drafts · loading…');
  const status=el('p','', 'localization-queue-status');status.setAttribute('role','status');status.setAttribute('aria-live','polite');
  const content=el('div',undefined,'localization-queue-content');
  // Keep the filters mounted during queue refreshes. Replacing a focused
  // searchbox on every keystroke makes large editorial lists unusable.
  const filters=el('div',undefined,'localization-queue-filters');
  const search=el('input');search.type='search';
  attribute(search,'placeholder','draftQueueSearchPlaceholder','Search draft ID or text…');
  attribute(search,'aria','draftQueueSearchAria','Search saved draft translations');
  const localeFilter=el('select');attribute(localeFilter,'aria','draftQueueLocaleFilter','Draft language');
  [['all','draftQueueAllLocales','All languages'],['ru','languageRu','Russian'],
   ['en','languageEn','English'],['jp','languageJp','Japanese'],['tw','languageTw','Traditional Chinese']]
    .forEach(function(option){const elOption=localized(el('option'),option[1],option[2]);elOption.value=option[0];localeFilter.append(elOption);});
  const scopeFilter=el('select');attribute(scopeFilter,'aria','draftQueueScopeFilter','Draft section');
  [['all','draftQueueAllScopes','All sections'],['game','draftQueueGameScope','Game terms'],['ui','draftQueueUiScope','Interface']]
    .forEach(function(option){const elOption=localized(el('option'),option[1],option[2]);elOption.value=option[0];scopeFilter.append(elOption);});
  filters.append(search,localeFilter,scopeFilter);
  search.addEventListener('input',()=>render());
  localeFilter.addEventListener('change',()=>render());
  scopeFilter.addEventListener('change',()=>render());
  wrapper.append(summary,status,filters,content);host.append(wrapper);
  function message(value,failed=false){
    dynamic.delete(status);status.textContent=value;status.dataset.error=String(failed);
  }
  function notify(key,fallback,values={},failed=false){
    const snapshot={...values};
    messageNode(status,key,fallback,()=>snapshot);
    status.dataset.error=String(failed);
  }
  function get(scope,id,locale){return drafts.get(key({scope,id,locale}))||null;}
  async function refresh(){
    if(!active)return;
    try{
      const reply=await api('GET',null,'/api/admin/localization/drafts');
      if(!active)return;
      drafts=new Map(reply.items.map(item=>[key(item),item]));
      selected=new Set([...selected].filter(x=>drafts.has(x)));
      messageNode(summary,'draftQueueCount','Saved translation drafts: {count}',()=>({count:drafts.size}));
      render();onQueueChanged?.();
    }catch(error){if(active)notify('draftQueueRefreshError','Could not refresh drafts: {error}',{error:error.message},true);}
  }
  function render(){
    content.replaceChildren();
    for(const node of dynamic.keys())if(!node.isConnected)dynamic.delete(node);
    if(!drafts.size){content.append(localized(el('p',undefined,'help-text'),'draftQueueEmpty','No saved translation drafts.'));return;}
    const q=search.value.trim().toLocaleLowerCase();
    const visible=[...drafts.entries()].filter(([,entry])=>
      (localeFilter.value==='all'||entry.locale===localeFilter.value)&&
      (scopeFilter.value==='all'||entry.scope===scopeFilter.value)&&
      (!q||[entry.id,entry.text,entry.locale,entry.scope].some(text=>String(text||'').toLocaleLowerCase().includes(q))));
    const bar=el('div',undefined,'localization-queue-toolbar');
    const output=el('output');
    const selectAll=localized(el('button'),'draftQueueSelectFirst','Select first 50');selectAll.type='button';selectAll.className='secondary';
    selectAll.onclick=()=>{for(const [id] of visible.slice(0,50))selected.add(id);render();};
    const clear=localized(el('button'),'draftQueueClearSelected','Clear selection');clear.type='button';clear.className='secondary';
    clear.onclick=()=>{selected.clear();render();};
    const publish=localized(el('button'),'draftQueuePublishSelected','Publish selected');publish.type='button';
    function updateSelection(){
      messageNode(output,'draftQueueSelectedCount','Selected: {selected} of {total} · found: {found}',
        ()=>({selected:selected.size,total:drafts.size,found:visible.length}));
      publish.disabled=busy||!selected.size||selected.size>50;
    }
    updateSelection();
    publish.onclick=()=>publishSelected();
    bar.append(output,selectAll,clear,publish);
    content.append(bar);
    const items=el('div',undefined,'localization-queue-items');
    for(const [id,draft] of visible){
      const row=el('div',undefined,'localization-queue-row');
      const label=el('label'),check=el('input');check.type='checkbox';check.checked=selected.has(id);check.disabled=busy;
      check.onchange=()=>{if(check.checked)selected.add(id);else selected.delete(id);updateSelection();};
      const details=el('span',undefined,'localization-queue-row-text');
      details.append(el('strong',draft.id+' · '+draft.locale.toUpperCase()),
        messageNode(el('small'),'draftQueueDraftVersion','{scope} · draft version {version}',
          ()=>({scope:draft.scope,version:draft.version})),
        el('p',draft.text));
      label.append(check,details);
      const actions=el('div',undefined,'localization-queue-row-actions');
      const open=localized(el('button'),'draftQueueOpen','Open');open.type='button';open.className='secondary';
      open.onclick=()=>onJump(draft);
      const remove=localized(el('button'),'draftQueueRemove','Delete draft');remove.type='button';remove.className='secondary';
      remove.onclick=async()=>{
        if(busy||!window.confirm(tr('draftQueueConfirmRemove',
          'Delete saved draft {id}? Published translation will not change.',{id:draft.id})))return;
        busy=true;render();
        try{await api('DELETE',{scope:draft.scope,id:draft.id,locale:draft.locale,
          expectedDraftVersion:draft.version},'/api/admin/localization/draft');
          selected.delete(id);await refresh();notify('draftQueueRemoved','Draft deleted. Published translation unchanged.');
        }catch(error){message(error.message,true);}finally{busy=false;render();}
      };
      actions.append(open,remove);row.append(label,actions);items.append(row);
    }
    if(!visible.length)items.append(localized(el('p',undefined,'help-text'),'draftQueueNoResults','No saved drafts match these filters.'));
    content.append(items);
  }
  async function publishSelected(){
    if(busy||!selected.size||selected.size>50)return;
    const items=[...selected].map(id=>drafts.get(id)).filter(Boolean);
    if(!items.length)return;
    if(!window.confirm(tr('draftQueueConfirmPublish',
      'Publish {count} saved translations in ONE atomic operation?',{count:items.length})))return;
    const operationId=window.crypto.randomUUID();
    busy=true;render();notify('draftQueuePublishing','Publishing selected drafts…');
    let receipt=null;
    try{
      receipt=await api('POST',{operationId,items:items.map(item=>({
        scope:item.scope,id:item.id,locale:item.locale,expectedDraftVersion:item.version
      }))},'/api/admin/localization/publish-batch');
    }catch(error){
      notify('draftQueueCheckingReceipt','Checking publication after an unexpected server response…');
      try{
        const check=await api('GET',null,'/api/admin/localization/operations?operationId='+encodeURIComponent(operationId));
        if(check.found)receipt=check.receipt;
        else notify('draftQueueUnconfirmed',
          'Publication could not be confirmed. Keep drafts and review history before retrying. {error}',{error:error.message},true);
      }catch(second){
        notify('draftQueueCheckFailed',
          'Could not check publication. Reconnect and verify before retrying. {error}',{error:second.message},true);
      }
    }finally{
      busy=false;
      if(receipt){
        selected.clear();notify('draftQueuePublished','Published {count} translations in one operation.',{count:receipt.count});
        await refresh();onPublished();
      }else await refresh();
      render();
    }
  }
  function history(target,record,onRestore){
    const button=localized(el('button'),'draftQueueHistory','History');button.type='button';button.className='secondary';
    const holder=el('div',undefined,'localization-history');
    button.onclick=async()=>{
      if(holder.childElementCount){holder.replaceChildren();return;}
      holder.append(localized(el('p'),'draftQueueLoadingHistory','Loading history…'));
      try{
        const params=new URLSearchParams({scope:record.scope,id:record.id,locale:record.locale});
        const result=await api('GET',null,'/api/admin/localization/history?'+params);
        holder.replaceChildren();
        if(!result.items.length){holder.append(localized(el('p'),'draftQueueNoHistory','No saved history yet. Tracking began when version history was introduced.'));return;}
        for(const item of result.items){
          const article=el('div',undefined,'localization-history-entry');
          article.append(messageNode(el('small'),'draftQueueVersion','Version {version} · {date}',
            ()=>({version:item.version,date:new Date(item.publishedAt*1000).toLocaleString()})),
            el('p',item.after||record.baseline||'—'));
          const restore=localized(el('button'),'draftQueueRestoreVersion','Restore this version');restore.type='button';restore.className='secondary';
          restore.onclick=async()=>{
            if(!window.confirm(tr('draftQueueConfirmRestore','Restore this wording as a NEW translation version?')))return;
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
  return {get,refresh,history,destroy(){
    active=false;window.removeEventListener('pandora-admin:localechange',switchLanguage);
    dynamic.clear();wrapper.remove();
  }};
}
window.PandoraLocalizationDrafts={mount};
})();
