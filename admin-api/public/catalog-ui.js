(function () {
  'use strict';
  var host = document.getElementById('catalog-console');
  var status = document.getElementById('catalog-state');
  var meta, getCsrf, expired, current, editor, listHost, listStatus, search, kind, newButton, page = 0;
  var generation = 0, pending = 0, editorRequest = 0, searchTimer, dirty = false, catalogRevision = 0, selectedKind = 'equipment';
  var readProfiles;
  var draftPanel, draftSummary, draftBoard, draftSearchInput, draftKindInput, selectedDrafts=new Map(), knownDrafts=[];
  var draftRequest=0, batchPending=false;
  var listLoadFailed=false, draftLoadFailed=false;
  var languages = [['en', 'English'], ['ru', 'Русский'], ['jp', '日本語'], ['tw', '繁體中文']];
  // Explicit, approved editor chrome only. Never translate catalog names,
  // descriptions, typed values, D1 payloads or arbitrary source strings.
  var catalogChromeKeys = {
    "После публикации": "adminShell.catalogAfterPublishing",
    "Изменения ещё не проверены. Нажмите «Проверить изменения».": "adminShell.catalogChangesNotReviewed",
    "Японский и китайский переводы": "adminShell.catalogExtraLanguages",
    "Запись ещё не опубликована и на сайте не используется.": "adminShell.catalogRecordNotPublished",
    "Проверено сервером. Это ещё не сохранено и не опубликовано. Здесь показаны данные записи, а не результат полного билда.": "adminShell.catalogReviewConfirmed",
    "Редактируемые поля": "adminShell.catalogEditableFields",
    "Душа · пригодность к слотам задаётся в карточке": "adminShell.catalogSoulCompatibility",
    "Описание пока не заполнено.": "adminShell.catalogDescriptionMissing",
    "Как карточка будет выглядеть на сайте": "adminShell.catalogSitePreview",
    "Особые эффекты и где получить · только описание": "adminShell.catalogSpecialEffects",
    "Бонус усиления": "adminShell.catalogEnhancementBonus",
    "Условия изучения навыка": "adminShell.catalogSkillLearningConditions",
    "Свои условия": "adminShell.catalogCustomConditions",
    "Разрешённые классы · ничего не отмечено = любой": "adminShell.catalogAllowedClasses",
    "Эти поля управляют изучением и дополнительными бонусами. Они не переписывают встроенные формулы, боевые эффекты или тип исходного навыка.": "adminShell.catalogLearningHelp",
    "Варианты этого навыка для разных классов и уровней": "adminShell.catalogSkillProfiles",
    "Вариантов нет — основные поля выше": "adminShell.catalogNoProfiles",
    "Условия изучения и числовой эффект редактируются отдельно. Изменение названия или описания само по себе не меняет расчёт.": "adminShell.catalogLearningNumericHelp",
    "Данные активного навыка": "adminShell.catalogActiveDetails",
    "Эффект изученной пассивки": "adminShell.catalogPassiveEffect",
    "Оружие для числового эффекта · пусто = любое": "adminShell.catalogWeaponsAny",
    "Эффект выбранной расовой пассивки": "adminShell.catalogRacialPassiveEffect",
    "Оружие для этих бонусов · пусто = любое": "adminShell.catalogWeaponsBonusAny",
    "LP / MP — параметры исходного движка": "adminShell.catalogSourceHpMp",
    "Расчётные характеристики": "adminShell.catalogNumericStats",
    "Бонусы от заточки (+1…+10)": "adminShell.catalogUpgradeBonuses",
    "Ничего не найдено.": "adminShell.catalogNothingFound",
    "Сохранённые черновики всех категорий. Отмечай нужные записи и публикуй одним выпуском. Ничего не изменится до подтверждения.": "adminShell.catalogDraftQueueHelp",
    "За одну публикацию допускается не более 50 записей. Отметь до 50 нужных черновиков.": "adminShell.catalogBatchCap",
    "Нет черновиков по заданному фильтру.": "adminShell.catalogNoFilteredDrafts",
    "Проверяем опубликованные примечания Astir…": "adminShell.catalogCheckingAstir",
    "Архивные примечания Astir": "adminShell.catalogAstirArchives",
    "Очистка только действующего каталога Modern. Legacy и старые версии не изменяются. До подтверждения ничего не записывается в D1.": "adminShell.catalogCleanupHelp",
    "Требуют ручной проверки": "adminShell.catalogManualReview",
    "Предпросмотр удаления: исходный текст → пустое поле": "adminShell.catalogCleanupPreview",
    "После публикации: примечание пустое": "adminShell.catalogCleanupEmpty",
    "Совпадений с известными архивными примечаниями нет.": "adminShell.catalogNoKnownArchives",
    "История очисток и восстановление": "adminShell.catalogCleanupHistory",
    "Восстановление возвращает только удалённые примечания из предыдущей неизменяемой ревизии. Остальные данные каталога остаются текущими.": "adminShell.catalogRestoreHelp",
    "Истории очисток пока нет.": "adminShell.catalogNoCleanupHistory",
    "Не удалось загрузить примечания Astir": "adminShell.catalogAstirLoadError",
    "Загрузка истории…": "adminShell.catalogHistoryLoading",
    "История публикаций": "adminShell.catalogPublicationHistory",
    "Откат создаёт новую версию. Старые версии и черновики сохраняются.": "adminShell.catalogRollbackHelp",
    "Выберите запись в списке. Здесь будут её текущие характеристики и поля для редактирования.": "adminShell.catalogChooseRecord",
    "Сохранённые черновики каталога · загрузка…": "adminShell.catalogDraftsLoading",
    "Выберите существующую запись слева или нажмите «Новая запись».": "adminShell.catalogChooseExisting"
  };
  // Display-only metadata, never draft or form values. Weak references avoid
  // leaking discarded list rows across catalog refreshes and locale changes.
  var catalogLiveValues = new WeakMap(),catalogRecordValues=new WeakMap(),catalogLiveAttributes=new WeakMap();
  var upgradeGemLabels = {
    '':{ru:'Любой самоцвет',en:'Any gem'},fire:{ru:'Огонь',en:'Fire'},ice:{ru:'Лёд',en:'Ice'},
    lightning:{ru:'Молния',en:'Lightning'},poison:{ru:'Яд',en:'Poison'},light:{ru:'Свет',en:'Light'},
    dark:{ru:'Тьма',en:'Dark'},rainbow:{ru:'Радужный',en:'Rainbow'}
  };
  function catalogTranslate(key, fallback, values) {
    var template=window.PandoraAdminI18n?.t?.('adminShell.'+key,fallback)||fallback;
    var slots=function(value){return (String(value).match(/\{[A-Za-z0-9_]+\}/g)||[]).sort().join('|');};
    if(slots(template)!==slots(fallback))template=fallback;
    return String(template).replace(/\{([A-Za-z0-9_]+)\}/g,function(original,name){
      return values&&Object.hasOwn(values,name)?String(values[name]):original;
    });
  }
  function catalogRecordLocale(names) {
    if(!names || typeof names!=='object')return '';
    var locale=window.PandoraAdminI18n?.getLocale?.()||'ru';
    // Read current, versioned catalog API fields; never write between locales.
    return names[locale]||names.en||names.ru||names.jp||names.tw||'';
  }
  function catalogRecordText(node,names) {
    node.dataset.catalogRecordLocale='true';
    catalogRecordValues.set(node,names);
    node.textContent=catalogRecordLocale(names);
    return node;
  }
  function catalogLiveName(node,key,fallback,values,names){
    node.removeAttribute('data-admin-i18n');
    node.dataset.catalogLiveI18n=key;
    catalogLiveValues.set(node,{key:key,fallback:fallback,values:values||{},names:names});
    node.textContent=catalogTranslate(key,fallback,{...values,name:catalogRecordLocale(names)});
    return node;
  }
  function catalogLiveComputed(node,key,fallback,compute){
    node.removeAttribute('data-admin-i18n');
    node.dataset.catalogLiveI18n=key;
    catalogLiveValues.set(node,{key:key,fallback:fallback,compute:compute});
    node.textContent=catalogTranslate(key,fallback,compute());
    return node;
  }
  function catalogLive(node,key,fallback,values) {
    // Dynamic state has one owner. Otherwise a later shell localization
    // refresh can put the initial "loading" translation back over real data.
    node.removeAttribute('data-admin-i18n');
    node.dataset.catalogLiveI18n=key;
    catalogLiveValues.set(node,{key:key,fallback:fallback,values:values||{}});
    node.textContent=catalogTranslate(key,fallback,values);
    return node;
  }
  function catalogRaw(node,text) {
    node.removeAttribute('data-admin-i18n');
    catalogLiveValues.delete(node);
    delete node.dataset.catalogLiveI18n;
    node.textContent=text;
    return node;
  }
  function catalogLiveAttribute(node,attribute,key,fallback,values) {
    node.dataset.catalogLiveAttribute=key;
    catalogLiveAttributes.set(node,{attribute,key,fallback,values:values||{}});
    node.setAttribute(attribute,catalogTranslate(key,fallback,values));
    return node;
  }
  function catalogAttribute(node,attribute,key,fallback) {
    node.setAttribute('data-admin-i18n-'+(attribute==='aria-label'?'aria':attribute),'adminShell.'+key);
    node.setAttribute(attribute,catalogTranslate(key,fallback));
    return node;
  }
  function catalogStatic(node,key,fallback) {
    node.dataset.adminI18n='adminShell.'+key;
    node.textContent=catalogTranslate(key,fallback);
    return node;
  }
  function node(tag, text, className) {
    var result = document.createElement(tag);
    var key = typeof text === 'string' && ['p','h3','h4','legend','summary','strong','option'].includes(tag)
      ? catalogChromeKeys[text] : null;
    if (key) {
      result.dataset.adminI18n = key;
      result.textContent = window.PandoraAdminI18n?.t?.(key, text) || text;
    } else if (text !== undefined) result.textContent = text;
    if (className) result.className = className;
    return result;
  }
  // Static action captions are D1-localized; catalog record names are not.
  var catalogActionKeys = {
    "Проверить изменения":"catalogReviewChanges",
    "Убрать":"catalogRemove",
    "Удалить правило":"catalogDeleteRule",
    "Убрать требование":"catalogRemoveRequirement",
    "Добавить требование ветки":"catalogAddBranchRequirement",
    "Добавить вариант":"catalogAddVariant",
    "Удалить выбранный вариант":"catalogDeleteSelectedVariant",
    "Добавить характеристику":"catalogAddStat",
    "Сохранить черновик":"catalogSaveDraft",
    "Опубликовать":"catalogPublish",
    "Создать новый навык по этому шаблону":"catalogNewSkillFromTemplate",
    "Добавить бонус заточки":"catalogAddEnhancementBonus",
    "Создать вариант":"catalogCreateVariant",
    "← Назад":"catalogBack",
    "Далее →":"catalogNext",
    "Выбрать все":"catalogSelectAll",
    "Снять выделение":"catalogClearSelection",
    "Опубликовать выбранные":"catalogPublishSelected",
    "Опубликовать все черновики":"catalogPublishAllDrafts",
    "Обновить список":"catalogRefreshList",
    "Открыть":"catalogOpen",
    "Повторить проверку":"catalogRetryCheck",
    "Повторить загрузку":"catalogRetryCatalogList",
    "Повторить загрузку черновиков":"catalogRetryDrafts",
    "Повторить загрузку каталога":"catalogRetryCatalogLoading",
    "Подтвердить очистку Modern":"catalogConfirmModernCleanup",
    "Новая запись":"catalogNewRecord",
    "Очистка примечаний Astir":"catalogAstirCleanup",
    "История / откат":"catalogHistoryRollback"
  };
  // Strictly whitelisted field captions. Record values stay unchanged.
  var catalogFormLabels = {
  "Ветка умений": "catalogFieldSkillBranch",
  "Нужно очков · 1–200": "catalogFieldSkillPoints",
  "Как определяется изучение": "catalogFieldLearningMode",
  "Минимальный уровень · 1–55": "catalogFieldMinimumLevel",
  "Выбранные классы": "catalogFieldSelectedClasses",
  "Редактируемый вариант": "catalogFieldSelectedVariant",
  "Название выбранного варианта": "catalogFieldVariantName",
  "Описание выбранного варианта": "catalogFieldVariantDescription",
  "Название навыка · English обязателен": "catalogFieldSkillName",
  "Описание — текст, не формула": "catalogFieldPlainDescription",
  "Что делать со встроенным эффектом": "catalogFieldIntrinsicEffectMode",
  "Числовой эффект требует надетый щит": "catalogFieldPassiveRequiresShield",
  "Числовой эффект требует включённую верховую езду": "catalogFieldPassiveRequiresRiding",
  "Название расовой пассивки · English обязателен": "catalogFieldRacialName",
  "Как применять числовые бонусы": "catalogFieldRacialEffectMode",
  "Числовые бонусы требуют щит": "catalogFieldRacialRequiresShield",
  "Числовые бонусы требуют верховую езду": "catalogFieldRacialRequiresRiding",
  "Ограничения расчёта · если эффект пока только справочный": "catalogFieldCalculationNotes",
  "Название класса · English обязателен": "catalogFieldClassName",
  "Описание класса — текст, не формула": "catalogFieldClassDescription",
  "Тип": "catalogFieldItemType",
  "Нужный уровень (0 = не указан)": "catalogFieldItemLevel",
  "Слоты для Souls": "catalogFieldItemSockets",
  "Базовая атака оружия (пусто = исходная)": "catalogFieldWeaponAttack",
  "Базовая дальность оружия (пусто = исходная)": "catalogFieldWeaponRange",
  "Название · English обязателен; остальные языки могут быть пустыми": "catalogFieldItemName",
  "Описание / обычные бонусы — текст, не формула": "catalogFieldItemDescription",
  "Дополнительное описание / особые эффекты — текст": "catalogFieldItemNotes",
  "Где получить": "catalogFieldAcquisition",
  "Приставка к названию экипированной вещи": "catalogFieldSoulPrefix",
  "Как менять исходные числовые эффекты": "catalogFieldEquipmentEffectMode",
  "Базовое LP": "catalogProgressionHp",
  "Базовое MP": "catalogProgressionMp",
  "Делитель роста LP от уровня": "catalogProgressionHpLevel",
  "Делитель роста MP от уровня": "catalogProgressionMpLevel",
  "Делитель роста LP от STA": "catalogProgressionHpSta",
  "Делитель роста MP от SPR": "catalogProgressionMpSpr"
};
  function formCaption(text) {
    var caption = node('span', text);
    var id = catalogFormLabels[text];
    if (id) {
      var key = 'adminShell.' + id;
      caption.dataset.adminI18n = key;
      caption.textContent = window.PandoraAdminI18n?.t?.(key, text) || text;
    }
    return caption;
  }
  function button(text, action, className) {
    var translationKey = catalogActionKeys[text] ? 'adminShell.' + catalogActionKeys[text] : '';
    var visible = translationKey ? (window.PandoraAdminI18n?.t?.(translationKey,text) || text) : text;
    var result = node('button', visible, className);
    if (translationKey) result.dataset.adminI18n = translationKey;
    result.type = 'button';
    result.addEventListener('click', action);
    return result;
  }
  // Only known display-only feedback is translated. Raw server errors,
  // identity strings and the editable form data are never rewritten.
  var catalogStatusKeys = {
  "Изменения проверены. Чтобы применить: сохраните черновик → опубликуйте.": "catalogStatusReviewed",
  "Добавлен приватный вариант. Укажите его класс, уровень/очки и значения; перед публикацией сервер проверит, что условия однозначны.": "catalogStatusPrivateVariant",
  "Черновик сохранён. На сайте он ещё не опубликован.": "catalogStatusDraftSaved",
  "Сначала сохраните черновик.": "catalogStatusSaveFirst",
  "Новый вариант получит отдельный ID. Перед сохранением явно задайте его числовые эффекты.": "catalogStatusNewVariant",
  "В текущей записи есть несохранённые изменения. Сохрани или отмени их перед массовой публикацией.": "catalogStatusBatchUnsaved",
  "Выбери от 1 до 50 черновиков.": "catalogStatusBatchLimit",
  "Ответ публикации не получен. Проверяю результат по коду операции…": "catalogStatusBatchChecking",
  "Для этого каталога пока поддерживаются только существующие слоты.": "catalogStatusSlotsOnly",
  "Исходный навык не изменён. Укажите название нового навыка, сохраните черновик, затем опубликуйте его отдельно.": "catalogStatusOriginalUnchanged",
  "Сначала выбери существующий навык как шаблон.": "catalogStatusSelectSkill",
  "Каталог загружен. Черновики приватны; массовая публикация доступна над каталогом.": "catalogStatusLoaded",
  "Загрузка частично не удалась. Используйте «Повторить загрузку» в соответствующем разделе.": "catalogStatusPartialFailure"
};
  var activeCatalogStatus = null;
  function statusTranslation(entry) {
    var value=window.PandoraAdminI18n?.t?.('adminShell.'+entry.key,entry.fallback)||entry.fallback;
    var slots=function(text){return (text.match(/\{[A-Za-z0-9_]+\}/g)||[]).sort().join('|');};
    if(slots(value)!==slots(entry.fallback))value=entry.fallback;
    return value.replace(/\{([A-Za-z0-9_]+)\}/g,function(original,name){
      return Object.hasOwn(entry.values,name)?String(entry.values[name]):original;
    });
  }
  function reportTranslated(key,fallback,values,error) {
    activeCatalogStatus={key:key,fallback:fallback,values:values||{}};
    status.removeAttribute('data-admin-i18n');
    status.textContent=statusTranslation(activeCatalogStatus);
    status.classList.toggle('denied',Boolean(error));
  }
  function report(text,error) {
    var key=catalogStatusKeys[text];
    if(key){reportTranslated(key,text,{},error);return;}
    activeCatalogStatus=null;
    status.removeAttribute('data-admin-i18n');
    status.textContent=text;
    status.classList.toggle('denied',Boolean(error));
  }
  window.addEventListener('pandora-admin:localechange',function(){
    if(activeCatalogStatus && status?.isConnected)
      status.textContent=statusTranslation(activeCatalogStatus);
    if(!host)return;
    host.querySelectorAll('[data-catalog-live-i18n]').forEach(function(node){
      var entry=catalogLiveValues.get(node);
      if(entry)node.textContent=catalogTranslate(entry.key,entry.fallback,
        entry.compute?entry.compute():entry.names?{...entry.values,name:catalogRecordLocale(entry.names)}:entry.values);
    });
    host.querySelectorAll('[data-catalog-live-attribute]').forEach(function(node){
      var entry=catalogLiveAttributes.get(node);
      if(entry)node.setAttribute(entry.attribute,catalogTranslate(entry.key,entry.fallback,entry.values));
    });
    if(current&&editor?.querySelector('[data-catalog-item-live-preview]'))refreshItemPreview();
    host.querySelectorAll('[data-catalog-record-locale]').forEach(function(node){
      var names=catalogRecordValues.get(node);
      if(names)node.textContent=catalogRecordLocale(names);
    });
  });
  async function api(path, input) {
    var response = await fetch('/api/admin/' + path, { method: input ? 'POST' : 'GET', credentials: 'same-origin', cache: 'no-store',
      headers: input ? { 'Content-Type': 'application/json', 'X-CSRF-Token': getCsrf() || '' } : {}, body: input ? JSON.stringify(input) : undefined, signal: AbortSignal.timeout(15000) });
    var result = await response.json();
    if (response.status === 401) expired();
    if (!response.ok || result.ok !== true) {
      var explanations = {
        'Conditional profile learning domains overlap ambiguously': catalogTranslate('catalogErrorOverlappingProfiles','Условия вариантов совпадают или пересекаются неоднозначно. Уточните класс, уровень или очки ветки: один вариант должен быть явно более конкретным, либо предназначаться другим классам.'),
        'Skill requires 1–8 conditional profiles': catalogTranslate('catalogErrorProfileCount','Допускается до 8 вариантов. Если они не нужны, удалите их: будут использоваться основные поля навыка.'),
        'Conditional profile data is too large': catalogTranslate('catalogErrorProfileSize','Слишком большой объём описаний вариантов. Сократите тексты или количество вариантов.')
      };
      throw new Error(explanations[result.message] || result.message || 'Server request failed');
    }
    return result;
  }
  function changing() {
    dirty = true; if (editor) {
      editor.dataset.unsaved = 'true';
      var preview = editor.querySelector('[data-preview-record]');
      if (preview) preview.replaceChildren(node('h4', 'После публикации'), node('p', 'Изменения ещё не проверены. Нажмите «Проверить изменения».', 'help-text'));
      var diff=editor.querySelector('[data-catalog-real-diff]');
      if (diff) renderRealDiff(null,diff);
    }
  }
  // Confirmation copy is D1-editable; the existing action guards remain
  // unchanged. Invalid placeholder overrides fall back to approved wording.
  function confirmCatalog(key, fallback, values) {
    var template=window.PandoraAdminI18n?.t?.('adminShell.'+key,fallback)||fallback;
    var sourceTokens=(fallback.match(/\{[A-Za-z0-9_]+\}/g)||[]).sort().join('|');
    var targetTokens=(template.match(/\{[A-Za-z0-9_]+\}/g)||[]).sort().join('|');
    if (sourceTokens!==targetTokens) template=fallback;
    return window.confirm(template.replace(/\{([A-Za-z0-9_]+)\}/g,function(match,name){
      return values&&Object.hasOwn(values,name)?String(values[name]):match;
    }));
  }
  function canLeave() { return !dirty || confirmCatalog('catalogConfirmLeaveUnsaved','Есть несохранённые изменения. Перейти без сохранения?'); }
  function inputField(label, type, value, field, parent, min, max) {
    var wrap = node('label', undefined, 'editor-field'); wrap.appendChild(formCaption(label)); var input = node('input'); input.type = type; input.value = value; input.dataset.field = field;
    if (min !== undefined) input.min = min; if (max !== undefined) input.max = max;
    input.addEventListener('input', changing); wrap.appendChild(input); parent.appendChild(wrap); return input;
  }
  function selectField(label, choices, value, field, parent) {
    var wrap = node('label', undefined, 'editor-field'); wrap.appendChild(formCaption(label)); var select = node('select'); select.dataset.field = field;
    choices.forEach(function (choice) { var option = node('option', choice[1]); option.value = choice[0]; select.appendChild(option); });
    select.value = value; select.addEventListener('change', changing); wrap.appendChild(select); parent.appendChild(wrap); return select;
  }
  function checkboxField(label, value, field, parent) {
    var wrap = node('label', undefined, 'flag-label'), input = node('input'); input.type = 'checkbox'; input.checked = value; input.dataset.field = field;
    input.addEventListener('change', changing); wrap.append(input, formCaption(label)); parent.appendChild(wrap); return input;
  }
  function multilingual(label, field, values, parent, multiline) {
    var section = node('fieldset', undefined, 'translation-fields'); var legend = node('legend'); legend.appendChild(formCaption(label)); section.appendChild(legend);
    var extra = node('details', undefined, 'extra-languages'); extra.appendChild(node('summary', 'Японский и китайский переводы'));
    var extraFields = node('div', undefined, 'basic-fields'); extra.appendChild(extraFields);
    languages.forEach(function (entry) {
      var wrap = node('label', entry[1], 'editor-field'); var input = node(multiline ? 'textarea' : 'input');
      if (!multiline) input.type = 'text'; else input.rows = 3;
      input.value = values[entry[0]] || ''; input.maxLength = multiline ? 4000 : 160;
      input.dataset.field = field; input.dataset.language = entry[0];
      if (field === 'names' && entry[0] === 'en') input.required = true;
      input.addEventListener('input', changing); wrap.appendChild(input); (entry[0] === 'en' || entry[0] === 'ru' ? section : extraFields).appendChild(wrap);
    }); section.appendChild(extra); parent.appendChild(section);
  }
  var effectNames = {
    0: 'Выносливость (ВЫН / STA)', 1: 'Сила (СИЛ / STR)', 2: 'Проворство (ПРВ / AGI)', 3: 'Ловкость (ЛВК / DEX)', 4: 'Сила духа (СД / SPR)', 5: 'Интеллект (ИНТ / INT)',
    6: 'Здоровье (LP)', 7: 'Мана (MP)', 8: 'Эффективность зелий', 10: 'Бонус скорости восстановления ОМ', 18: 'Физическая атака (ATK)', 42: 'Магическая атака', 49: 'Защита',
    21: 'Урон оружием · процентные пункты', 33: 'Урон ауры', 81: 'Показатель раскрытия статов верхом · только отображение',
    52: 'Получаемый физический урон', 60: 'Получаемый магический урон', 62: 'Точность', 65: 'Уклонение', 69: 'Шанс критического удара',
    70: 'Получаемый шанс крита (минус = защита)', 71: 'Критический урон', 72: 'Получаемый критический урон', 73: 'Скорость атаки', 74: 'Скорость движения', 76: 'Стоимость MP', 77: 'Скорость применения', 79: 'Перезарядка',
    146: 'Сопротивление аномалиям тела', 147: 'Сопротивление аномалиям разума', 149: 'Сопротивление оглушению', 150: 'Сопротивление заморозке', 151: 'Сопротивление падению',
    157: 'Сопротивление безумию', 161: 'Сопротивление болезни'
  };
  // Admin-shell keys deliberately contain letters only: this preserves the
  // strict existing D1 locale schema, while the actual stat IDs remain numeric.
  var effectTranslationKeys = {
    0: 'catalogEffectZero',
    1: 'catalogEffectOne',
    2: 'catalogEffectTwo',
    3: 'catalogEffectThree',
    4: 'catalogEffectFour',
    5: 'catalogEffectFive',
    6: 'catalogEffectSix',
    7: 'catalogEffectSeven',
    8: 'catalogEffectEight',
    10: 'catalogEffectTen',
    18: 'catalogEffectEighteen',
    21: 'catalogEffectTwentyOne',
    33: 'catalogEffectThirtyThree',
    42: 'catalogEffectFortyTwo',
    49: 'catalogEffectFortyNine',
    52: 'catalogEffectFiftyTwo',
    60: 'catalogEffectSixty',
    62: 'catalogEffectSixtyTwo',
    65: 'catalogEffectSixtyFive',
    69: 'catalogEffectSixtyNine',
    70: 'catalogEffectSeventy',
    71: 'catalogEffectSeventyOne',
    72: 'catalogEffectSeventyTwo',
    73: 'catalogEffectSeventyThree',
    74: 'catalogEffectSeventyFour',
    76: 'catalogEffectSeventySix',
    77: 'catalogEffectSeventySeven',
    79: 'catalogEffectSeventyNine',
    81: 'catalogEffectEightyOne',
    146: 'catalogEffectOneHundredFortySix',
    147: 'catalogEffectOneHundredFortySeven',
    149: 'catalogEffectOneHundredFortyNine',
    150: 'catalogEffectOneHundredFifty',
    151: 'catalogEffectOneHundredFiftyOne',
    157: 'catalogEffectOneHundredFiftySeven',
    161: 'catalogEffectOneHundredSixtyOne'
  };
  // Only known engine IDs have manually approved localized names.
  function effectLabel(id) {
    if (Number(id)===43) return catalogRecordLocale({ru:'Магическая атака огнём',en:'Fire magic attack'});
    var definition=meta.effects.find(function(entry){return entry.id===Number(id);});
    if(Object.hasOwn(effectNames,id))
      return catalogTranslate(effectTranslationKeys[id],effectNames[id]);
    return definition?.label||catalogTranslate('catalogUnmappedEffect','Исходный эффект Legacy #{id}',{id});
  }
  function effectOption(definition) {
    if (definition.id===43) return catalogRecordText(node('option'),{ru:'Магическая атака огнём',en:'Fire magic attack'});
    return Object.hasOwn(effectNames,definition.id)
      ? catalogStatic(node('option'),effectTranslationKeys[definition.id],effectNames[definition.id])
      : node('option',definition.label||String(definition.id));
  }
  function effectText(id, value, unit) {
    var definition = meta.effects.find(function (entry) { return entry.id === Number(id); });
    var number = Number(value), suffix = unit === 'percent'
      ? Number(id)===52?catalogTranslate('catalogEffectReceivedPercent','% получаемого урона')
        :catalogTranslate('catalogEffectBasePercent','% от базы')
      :definition&&(definition.label.includes('percentage points')||Number(id)>=138)
        ?catalogTranslate('catalogEffectPercentagePoints','п.п.') : '';
    return effectLabel(id) + ': ' + (Number.isFinite(number) ? (number > 0 ? '+' : '') + number : value) + (suffix ? ' ' + suffix : '');
  }
  function recordView(record, target, title) {
    target.replaceChildren(title.startsWith('Сейчас на сайте · версия ') ? catalogLive(node('h4'),'catalogPublishedVersion','Сейчас на сайте · версия {revision}',{revision:current.catalogRevision}):node('h4',title));
    if (!record) { target.appendChild(node('p', 'Запись ещё не опубликована и на сайте не используется.', 'help-text')); return; }
    target.appendChild(catalogRecordText(node('p',undefined,'record-name'),record.names));
    var description = catalogRecordLocale(record.description);
    if (description) target.appendChild(catalogRecordText(node('p',undefined,'record-description'),record.description));
    var values = node('ul', undefined, 'record-values');
    if (record.kind === 'equipment') values.appendChild(catalogLive(node('li'),'catalogPreviewLevelSockets','Уровень: {level} · Слоты душ: {sockets}',{level:record.level,sockets:record.sockets}));
    if (record.kind === 'equipment' && record.baseRange !== undefined)
      values.appendChild(catalogLive(node('li'),'catalogPreviewBaseRange','Базовая дальность: {value}',{value:record.baseRange}));
    if (record.rangeBonus) {
      var scopeLabels={any:{ru:'любая атака',en:'any attack'},melee:{ru:'ближний бой',en:'melee'},ranged:{ru:'дальний бой',en:'ranged'}};
      var scope=scopeLabels[record.rangeBonus.appliesTo], amount=record.rangeBonus.amount;
      values.appendChild(catalogRecordText(node('li'),{ru:'Бонус дальности: '+(amount>0?'+':'')+amount+' · '+scope.ru,en:'Range bonus: '+(amount>0?'+':'')+amount+' · '+scope.en}));
    }
    if (record.id === 'modern.equipment.ac383fab-00a9-45ff-a09a-b2192c47ef5d')
      values.appendChild(catalogRecordText(node('li'),record.nativeBasePolicy
        ? {ru:'Встроенный бонус ауры заменён указанными характеристиками.',en:'The built-in aura bonus is replaced by the listed effects.'}
        : {ru:'Встроенный бонус активной ауры: +2.',en:'Built-in active aura bonus: +2.'}));
    if (record.nativeUpgradePolicy === 'replace-legacy-zephyrus-upgrade')
      values.appendChild(catalogRecordText(node('li'),{ru:'Старый бонус урона ауры от заточки отключён; действуют правила ниже.',en:'The old refinement aura-damage bonus is disabled; the rules below apply.'}));
    if (['replace-legacy-gold-plate-upgrade','replace-legacy-lunar-gloves-upgrade','replace-legacy-mana-bracelets-upgrade'].includes(record.nativeUpgradePolicy))
      values.appendChild(catalogRecordText(node('li'),{ru:'Старые бонусы заточки отключены; действуют правила ниже. Комплектные эффекты сохраняются.',en:'Old refinement bonuses are disabled; the rules below apply. Set effects are preserved.'}));
    if(record.kind==='equipment'&&record.upgradeBonuses?.length)
      record.upgradeBonuses.forEach(function(rule){
        values.appendChild(catalogLiveComputed(node('li'),'catalogPreviewEnhancement','Заточка: {effect} с +{from} за каждые {every} уровня до +{to}',function(){
           return {effect:effectText(rule.stat,rule.value,rule.unit),from:rule.from,every:rule.every,to:rule.to};
         }));
        if(rule.gemElement) {
          var gemLabel=upgradeGemLabels[rule.gemElement];
          values.appendChild(catalogRecordText(node('li'),{ru:'Самоцвет: '+gemLabel.ru,en:'Gem: '+gemLabel.en}));
        }
      });
    if(record.kind==='equipment'&&record.procEffects?.length) record.procEffects.forEach(function(rule){
      if(rule.kind==='special_magic_damage') {
        values.appendChild(catalogRecordText(node('li'),{
          ru:(rule.names.ru||rule.names.en)+': '+rule.chance+'% с +'+rule.from+', '+rule.baseDamage+' + '+rule.statPercent+'% '+(rule.damageStat==='STR'?'СИЛ':'ИНТ')+'.',
          en:rule.names.en+': '+rule.chance+'% from +'+rule.from+', '+rule.baseDamage+' + '+rule.statPercent+'% '+rule.damageStat+'.'}));
        return;
      }
      values.appendChild(catalogRecordText(node('li'),{
        ru:'Ожог при попадании: '+rule.chance+'%'+(rule.from!==undefined?' за порог заточки':' базовый шанс')+'. Справка, не симуляция боя.',
        en:'Burn on hit: '+rule.chance+'%'+(rule.from!==undefined?' per refinement threshold':' base chance')+'. Informational; no combat simulation.'}));
    });
    if (record.kind === 'soul' && !record.compatibility.includes(1)) values.appendChild(catalogStatic(node('li'),'catalogPreviewNoSoulSlot','Нет допустимого слота для вставки. Эта душа не предлагается для экипировки, пока не заданы ограничения.'));
    if (record.calculationCode !== undefined) {
      record.calculationCode.split('_').filter(Boolean).forEach(function (token) {
        var pair = token.split('='), value = pair.slice(1).join('=');
        if (!/^\d+=(?:[+-]?\d+(?:\.\d+)?%?|W\d+)$/.test(token)) {
          values.appendChild(catalogLive(node('li'),'catalogPreviewInvalidMarker','Исходный маркер: {token}. Числовой эффект не подтверждён.',{token}));
          return;
        }
        values.appendChild(pair[0]==='18' && /^W\d+$/.test(value) ? catalogLive(node('li'),'catalogPreviewBaseAttack','Базовая атака оружия: {value}',{value:value.slice(1)}):catalogLiveComputed(node('li'),'catalogEffectValue','{effect}',function(){
           return {effect:effectText(pair[0],value.endsWith('%')?value.slice(0,-1):value,value.endsWith('%')?'percent':'flat')};
         }));
      });
      if (!record.calculationCode) values.appendChild(catalogStatic(node('li'),'catalogPreviewNoNumericModifiers','Числовых бонусов в расчётной строке нет.'));
    }
    if (record.kind === 'active') ['catalogPreviewActiveMp','catalogPreviewActiveCast','catalogPreviewActiveCooldown','catalogPreviewActiveDuration'].forEach(function (key,index) { var labels=['Стоимость MP: {value}','Время применения, с: {value}','Перезарядка, с: {value}','Длительность, с: {value}']; values.appendChild(catalogLive(node('li'),key,labels[index],{value:record.timing[index]})); });
    if (record.kind === 'active' || record.kind === 'passive') {
      if (record.kind === 'passive' && !record.templateId && current.nativeSkill?.intrinsicEffect) {
        values.appendChild(catalogStatic(node('li'),record.intrinsicEffectMode==='replace'?'catalogPreviewIntrinsicReplaced':'catalogPreviewIntrinsicKept',record.intrinsicEffectMode==='replace'?'Встроенный эффект заменён: работают только числа ниже при выполнении условий.':'Встроенный эффект сохранён; числа ниже добавляются к нему.'));
        values.appendChild(node('li', current.nativeSkill.intrinsicEffect.noteRu));
      }
      var learning = record.learningRequirements;
      if (learning) {
        values.appendChild(catalogLive(node('li'),'catalogPreviewLearningLevel','Минимальный уровень: {level}',{level:learning.minimumLevel}));
        var classes = learning.classIds.map(function (id) { return meta.compatibilityLabels.job.find(function (row) { return 'job.' + row.index === id; })?.label || id; });
        values.appendChild(catalogLiveComputed(node('li'),'catalogPreviewLearningClasses','Классы: {classes}',function(){return {classes:classes.length ? classes.join(', ') + catalogTranslate(learning.classScope==='descendants'?'catalogPreviewDescendants':'catalogPreviewOnlySelected',learning.classScope==='descendants'?' и их последующие профессии':' — только отмеченные') : catalogTranslate('catalogPreviewAnyClass','любой')};}));
        learning.branches.forEach(function (gate) { values.appendChild(catalogLive(node('li'),'catalogPreviewLearningBranch','Ветка: {branch} ≥ {points}',{branch:meta.skillCategories.find(function (row) { return row.id === gate.branchId; })?.name.en || gate.branchId,points:gate.minimumPoints})); });
        if (!learning.branches.length) values.appendChild(catalogStatic(node('li'),'catalogPreviewNoBranchRequirements','Требований к очкам веток нет.'));
      } else values.appendChild(catalogLive(node('li'),'catalogPreviewNativePrerequisites','Исходные условия изучения: {text}',{text:current.nativeSkill?.prerequisites.en || record.prerequisiteCode}));
    }
    if (record.kind === 'class') [
      ['catalogProgressionHp','Базовое LP'],['catalogProgressionMp','Базовое MP'],
      ['catalogProgressionHpLevel','Делитель роста LP от уровня'],['catalogProgressionMpLevel','Делитель роста MP от уровня'],
      ['catalogProgressionHpSta','Делитель роста LP от STA'],['catalogProgressionMpSpr','Делитель роста MP от SPR']
    ].forEach(function(entry,index){
      values.appendChild(catalogLiveComputed(node('li'),'catalogProgressionLine','{name}: {value}',function(){
        return {name:catalogTranslate(entry[0],entry[1]),value:record.progression[index]};
      }));
    });
    if (record.kind === 'racial') {
      values.appendChild(record.effectMode==='replace'?catalogStatic(node('li'),'catalogPreviewRacialReplaced','Исходная механика отключена. Действуют только числа ниже.'):catalogLive(node('li'),'catalogPreviewRacialNative','Исходная механика: {mechanic}',{mechanic:current.nativeMechanics}));
      var required = record.bonusRequirements;
      if (required) {
        var names = required.weaponCategories.map(function (id) { return id === -1 ? 'без оружия' : meta.categories.find(function (entry) { return entry.legacy_id === id; })?.name.en || '#' + id; });
        values.appendChild(catalogLiveComputed(node('li'),'catalogPreviewWeaponCondition','Условие оружия: {weapons}',function(){return {weapons:names.length?names.join(', '):catalogTranslate('catalogPreviewAnyWeapon','любое')};}));
        if (required.shieldRequired) values.appendChild(catalogStatic(node('li'),'catalogPreviewShieldRequired','Требуется щит.'));
        if (required.ridingRequired) values.appendChild(catalogStatic(node('li'),'catalogPreviewRidingRequired','Требуется верховая езда.'));
      }
      if (catalogRecordLocale(record.calculationNotes)) target.appendChild(catalogLiveComputed(node('p',undefined,'help-text'),'catalogPreviewCalculationLimit','Ограничение расчёта: {note}',function(){return {note:catalogRecordLocale(record.calculationNotes)};}));
    }
    if (record.kind === 'passive' && (record.templateId || !current.nativeSkill?.intrinsicEffect)) values.appendChild(catalogStatic(node('li'),record.templateId?'catalogPreviewNewSkill':'catalogPreviewPassiveOriginal',record.templateId?'Новый навык: встроенный эффект шаблона не копируется.':'Исходная механика сохраняется. Описание — справка; эффект зависит от изучения, класса и снаряжения.'));
    (record.effects || []).forEach(function(effect){
      values.appendChild(catalogLiveComputed(node('li'),'catalogEffectValue','{effect}',function(){
        return {effect:effectText(effect.stat,effect.value,effect.unit)};
      }));
    });
    if ((record.kind === 'racial' || record.kind === 'passive') && !record.effects.length && !record.rangeBonus) values.appendChild(catalogStatic(node('li'),record.effectMode==='replace'||record.intrinsicEffectMode==='replace'?'catalogPreviewNoNumericReplace':'catalogPreviewNoNumericExtra',record.effectMode==='replace'||record.intrinsicEffectMode==='replace'?'Рассчитываемых числовых бонусов нет. Справочные эффекты см. в описании и ограничениях.':'Дополнительных числовых бонусов нет. Это не означает отсутствие исходного эффекта.'));
    target.appendChild(values);
    if (record.profiles) {
      var variants = node('details'); variants.dataset.recordProfiles = '';
      variants.appendChild(catalogLive(node('summary'),'catalogProfileCount','Условные варианты: {count}',{count:record.profiles.length}));
      variants.appendChild(catalogStatic(node('p',undefined,'help-text'),'catalogProfileSelectionHelp','Самый конкретный изученный вариант заменяет название, описание и время. Пока его условия не выполнены, действуют основные значения выше. Это не расчёт боевого урона.'));
      var entries = node('ul', undefined, 'record-values');
      record.profiles.forEach(function (profile, position) {
        var entry = node('li'); entry.appendChild(catalogLiveName(node('strong'),'catalogProfileNameColon','Вариант {index}: {name}',{index:position+1},profile.names));
        entry.appendChild(node('p', learningSummary(profile.learningRequirements), 'help-text'));
        entry.appendChild(catalogLive(node('p',undefined,'help-text'),'catalogProfileTiming','MP: {mp} · применение: {cast} с · перезарядка: {cooldown} с · длительность: {duration} с',{mp:profile.timing[0],cast:profile.timing[1],cooldown:profile.timing[2],duration:profile.timing[3]}));
        var description = catalogRecordLocale(profile.description);
        if (description) entry.appendChild(catalogRecordText(node('p',undefined,'record-description'),profile.description));
        entries.appendChild(entry);
      });
      variants.appendChild(entries); target.appendChild(variants);
    }
  }
  function learningSummary(required) {
    var classes = required.classIds.map(function (id) { var index = Number(id.slice(4)); return meta.compatibilityLabels.job.find(function (row) { return row.index === index; })?.label || id; });
    var parts = ['Классы: ' + (classes.length ? classes.join(' / ') + (required.classScope === 'descendants' ? ' и последующие профессии' : ' (только отмеченные)') : 'любые'), 'уровень ≥ ' + required.minimumLevel];
    required.branches.forEach(function (gate) { parts.push((meta.skillCategories.find(function (row) { return row.id === gate.branchId; })?.name.en || gate.branchId) + ' ≥ ' + gate.minimumPoints); });
    return parts.join(' · ');
  }
  function draftCanPublish(item) { return item.diff?.status === 'changed' || item.diff?.status === 'new'; }
  function draftUi(key) {
    var language=window.PandoraAdminI18n?.getLocale?.()||'ru';
    var labels={
      changes:{ru:'Фактические изменения',en:'Actual changes',jp:'実際の変更',tw:'實際變更'},
      unchanged:{ru:'Нет изменений относительно сайта',en:'No changes from published data',jp:'公開版からの変更はありません',tw:'與已發布版本沒有差異'},
      newRecord:{ru:'Новая запись',en:'New record',jp:'新しいレコード',tw:'新增記錄'},
      error:{ru:'Невозможно сравнить; проверьте запись',en:'Unable to compare; inspect the record',jp:'比較できません。レコードを確認してください',tw:'無法比較，請檢查記錄'},
      before:{ru:'Сейчас',en:'Before',jp:'変更前',tw:'變更前'},
      after:{ru:'После',en:'After',jp:'変更後',tw:'變更後'},
      discard:{ru:'Удалить черновик',en:'Discard draft',jp:'下書きを破棄',tw:'捨棄草稿'},
      missing:{ru:'(не задано)',en:'(not set)',jp:'(未設定)',tw:'(未設定)'},
      approveDiscard:{ru:'Удалить только сохранённый черновик «{name}»? Опубликованные данные и история не изменятся.',en:'Discard only the saved draft “{name}”? Published data and history will remain unchanged.',jp:'「{name}」の下書きだけを破棄しますか？公開データと履歴は変更されません。',tw:'僅捨棄「{name}」的草稿？已發布資料與歷史不會變更。'}
    };
    return labels[key]?.[language]||labels[key]?.ru||key;
  }
  function diffFieldName(path) {
    var names={names:'Название',description:'Описание',notes:'Примечания',acquisition:'Получение',
      modifiers:'Модификаторы',calculationNotes:'Ограничения расчёта',mpCost:'Стоимость MP',
      castSeconds:'Время применения (с)',cooldownSeconds:'Перезарядка (с)',durationSeconds:'Длительность (с)',
      effectMode:'Режим эффектов',intrinsicEffectMode:'Встроенный эффект',effects:'Эффекты',
      bonusRequirements:'Условия бонусов',learningRequirements:'Условия изучения',
      profiles:'Варианты навыка',upgradeBonuses:'Бонусы заточки',progression:'Коэффициенты класса',
      races:'Расы',classes:'Классы',slots:'Слоты',disabled:'Недоступен',level:'Уровень',
      sockets:'Количество слотов',baseAttack:'Базовая атака',baseRange:'Базовая дальность',weaponCategories:'Категории оружия',
      classIds:'Классы',classScope:'Область профессий',minimumLevel:'Мин. уровень',
      branches:'Ветки',minimumPoints:'Очки ветки',shieldRequired:'Нужен щит',ridingRequired:'Нужна верховая езда',
      stat:'Характеристика',value:'Значение',unit:'Единица',every:'Шаг',from:'От',to:'До'};
    if(path==='$new')return draftUi('newRecord');
    return path.split(/(\[[0-9]+\]|\.)/).filter(part=>part!=='.'&&part).map(part=>names[part]||part).join(' / ');
  }
  function diffValue(value) {
    if(value===null||value===undefined)return draftUi('missing');
    if(typeof value==='string')return value===''?draftUi('missing'):value;
    if(typeof value==='boolean')return value?'Да':'Нет';
    if(typeof value==='object')return JSON.stringify(value,null,2);
    return String(value);
  }
  function renderRealDiff(diff,target) {
    target.replaceChildren();
    if(!diff){target.appendChild(node('p','Изменения ещё не проверены.','help-text'));return;}
    var heading=node('h4',draftUi('changes')+': '+(diff.count??'—'));
    target.appendChild(heading);
    if(diff.status==='unchanged'||diff.status==='error'){
      target.appendChild(node('p',draftUi(diff.status),'catalog-diff-status'));
      return;
    }
    var entries=node('div',undefined,'catalog-real-diff-list');
    (diff.changes||[]).forEach(function(change){
      var entry=node('div',undefined,'catalog-real-diff-entry');
      entry.appendChild(node('strong',diffFieldName(change.path),'catalog-real-diff-path'));
      var values=node('div',undefined,'catalog-real-diff-values');
      var oldValue=node('div',undefined,'catalog-real-diff-before'),
        newValue=node('div',undefined,'catalog-real-diff-after');
      oldValue.append(node('small',draftUi('before')),node('pre',diffValue(change.before)));
      newValue.append(node('small',draftUi('after')),node('pre',diffValue(change.after)));
      values.append(oldValue,newValue);entry.appendChild(values);entries.appendChild(entry);
    });
    target.appendChild(entries);
  }

  async function checkChanges() {
    if (!editor.reportValidity()) return;
    var thisGeneration = generation, selection = current, preview = editor.querySelector('[data-preview-record]');
    host.inert = true; host.setAttribute('aria-busy', 'true');
    try {
      var result = await api('preview', { edit: collect(), expectedCatalogRevision: current.catalogRevision });
      if (thisGeneration !== generation || current !== selection) return;
      recordView(result.record, preview, 'После публикации');
      preview.appendChild(node('p', 'Проверено сервером. Это ещё не сохранено и не опубликовано. Здесь показаны данные записи, а не результат полного билда.', 'help-text'));
      renderRealDiff(result.diff,editor.querySelector('[data-catalog-real-diff]'));
      report(result.diff.status==='unchanged' ? draftUi('unchanged') : 'Изменения проверены. Чтобы применить: сохраните черновик → опубликуйте.');
    } catch (error) { if (thisGeneration === generation && current === selection) report(error.message + ' Ваши поля не удалены.', true); }
    finally { if (thisGeneration === generation) { host.inert = false; host.removeAttribute('aria-busy'); } }
  }
  function review() {
    var workflow = catalogStatic(node('p',undefined,'editor-workflow'),'catalogReviewWorkflow','1. Измените поля → 2. Проверьте изменения → 3. Сохраните черновик → 4. Опубликуйте. Черновик виден только вам; публикация меняет Modern, но не музей Legacy и не старые версии билдов.');
    workflow.dataset.editorWorkflow = ''; editor.appendChild(workflow);
    var panels = node('div', undefined, 'record-review');
    var live = node('section', undefined, 'record-panel'), preview = node('section', undefined, 'record-panel');
    live.dataset.currentRecord = ''; preview.dataset.previewRecord = ''; preview.setAttribute('aria-live', 'polite');
    recordView(current.currentRecord, live, 'Сейчас на сайте · версия ' + current.catalogRevision);
    preview.append(node('h4', 'После публикации'), node('p', 'Изменения ещё не проверены. Нажмите «Проверить изменения».', 'help-text'));
    panels.append(live, preview);
    var changes=node('section',undefined,'catalog-real-diff');
    changes.dataset.catalogRealDiff='';
    changes.setAttribute('aria-live','polite');
    renderRealDiff(current.draftDiff||null,changes);
    editor.append(panels,button('Проверить изменения', checkChanges, 'secondary'),changes);
    editor.appendChild(node('h4', 'Редактируемые поля'));
  }
  function refreshItemPreview(){
    var panel=editor?.querySelector('[data-catalog-item-live-preview]');
    if(!panel)return;
    var display=panel.querySelector('[data-catalog-preview-content]'),
      locale=panel.querySelector('[data-catalog-preview-locale]')?.value||'ru';
    if(!display)return;
    var value=field=>editor.querySelector('[data-field="'+field+'"][data-language="'+locale+'"]')?.value||'';
    var original=field=>editor.querySelector('[data-field="'+field+'"][data-language="en"]')?.value||'';
    var name=value('names')||original('names')||catalogTranslate('catalogLivePreviewMissingName','Без названия');
    var text=value('description')||original('description');
    var notes=value('notes')||original('notes');
    var n=Math.max(0,Math.min(3,Number(editor.querySelector('[data-field="sockets"]')?.value)||0));
    display.replaceChildren(node('strong',name,'catalog-item-preview-name'));
    if(current.edit.kind==='equipment'){
      var facts=node('div',undefined,'catalog-item-preview-facts');
      var type=editor.querySelector('[data-field="category"]');
      var kind=type?.selectedOptions[0]?.textContent||catalogTranslate('catalogKindEquipment','Снаряжение');
      var level=editor.querySelector('[data-field="level"]')?.value||'0';
      facts.append(node('span',kind),catalogLive(node('span'),'catalogLivePreviewLevel','Уровень: {level}',{level}),
        catalogLive(node('span'),'catalogLivePreviewSockets','Слоты душ: {count}',{count:n}));
      display.append(facts);
      if(n){
        var circles=node('div',undefined,'catalog-item-preview-sockets');
        catalogLiveAttribute(circles,'aria-label','catalogLivePreviewFreeSockets','Свободные слоты душ: {count}',{count:n});
        for(var i=0;i<n;i++)circles.append(node('span',undefined,'catalog-item-preview-socket'));
        display.append(circles);
      }
    } else {
      display.append(node('p','Душа · пригодность к слотам задаётся в карточке','catalog-item-preview-facts'));
    }
    [text,notes].filter(Boolean).forEach(function(t){
      display.append(node('p',t,'catalog-item-preview-description'));
    });
    if(!text&&!notes)display.append(node('p','Описание пока не заполнено.','catalog-item-preview-note'));
  }
  function mountItemPreview(){
    if(!current||!['equipment','soul'].includes(current.edit.kind))return;
    var panel=node('section',undefined,'catalog-item-game-preview');
    panel.dataset.catalogItemLivePreview='';
    var top=node('div',undefined,'catalog-item-preview-header');
    top.append(node('strong','Как карточка будет выглядеть на сайте'));
    var languagesSelect=node('select');
    languagesSelect.dataset.catalogPreviewLocale='';
    catalogAttribute(languagesSelect,'aria-label','catalogLivePreviewLanguageAria','Язык предпросмотра предмета');
    [['ru','RU'],['en','EN'],['jp','JP'],['tw','TW']].forEach(function(pair){
      var option=node('option',pair[1]);option.value=pair[0];languagesSelect.append(option);
    });
    languagesSelect.addEventListener('change',refreshItemPreview);
    top.append(languagesSelect);
    var surface=node('div',undefined,'catalog-item-preview-surface');
    surface.dataset.catalogPreviewContent='';
    panel.append(top,surface,node('p',
      'Предварительный вид текста и слотов обновляется при вводе. Числовые эффекты и совместимость проверяются только кнопкой «Проверить изменения» выше.',
      'catalog-item-preview-note'));
    var actions=editor.querySelector('.editor-actions');
    if(actions)editor.insertBefore(panel,actions);else editor.append(panel);
    refreshItemPreview();
  }
  function finishEditor() {
    // Put the calculation controls before the optional translated prose.
    var calculations = editor.querySelector('.numeric-effects'), translations = editor.querySelector('.translation-fields');
    if (calculations && translations) editor.insertBefore(calculations, translations);
    var optional = Array.from(editor.querySelectorAll('.translation-fields')).filter(function (section) { return section.querySelector('[data-field="notes"], [data-field="acquisition"]'); });
    if (optional.length) {
      var details = node('details', undefined, 'optional-description'); details.appendChild(node('summary', 'Особые эффекты и где получить · только описание'));
      editor.insertBefore(details, optional[0]); optional.forEach(function (section) { details.appendChild(section); });
    }
    var actions = editor.querySelector('.editor-actions'); if (actions) editor.appendChild(actions);
    editor.dataset.unsaved = dirty ? 'true' : 'false';
    mountItemPreview();
    updateLocaleCoverage();
  }
  function compatibility(label, field, values, labels, parent) {
    var group = node('fieldset', undefined, 'compatibility-fields'); group.appendChild(node('legend', label));
    labels.forEach(function (entry) {
      var wrap = node('label', undefined, 'flag-label'); var input = node('input'); input.type = 'checkbox'; input.checked = Boolean(values[entry.index]); input.dataset.flag = field; input.dataset.index = entry.index;
      input.addEventListener('change', changing); wrap.append(input, document.createTextNode(entry.label)); group.appendChild(wrap);
    }); parent.appendChild(group);
  }
  function effectRow(effect, parent) {
    var row = node('div', undefined, 'effect-row');
    var stat = node('select'); catalogAttribute(stat,'aria-label','catalogEffectStatAria','Характеристика');
    meta.effects.forEach(function (definition) { var option = effectOption(definition); option.value = definition.id; stat.appendChild(option); });
    stat.value = effect.stat; var value = node('input'); value.type = 'number'; value.step = '.01'; value.min = '-10000'; value.max = '10000'; value.value = effect.value; value.required = true; catalogAttribute(value,'aria-label','catalogEffectValueAria','Значение');
    var unit = node('select'); catalogAttribute(unit,'aria-label','catalogEffectUnitAria','Единица');
    function units() {
      var previous = unit.value || effect.unit; unit.replaceChildren();
      var definition = meta.effects.find(function (definition) { return definition.id === Number(stat.value); });
      definition.units.forEach(function(name){
        var key=name==='percent'
          ? definition.id===52?'catalogUnitReceivedPercent':'catalogUnitBasePercent'
          : definition.label.includes('percentage points')||definition.id>=138
            ?'catalogUnitPercentagePoints':'catalogUnitFlat';
        var fallback=key==='catalogUnitReceivedPercent'?'% получаемого урона'
          :key==='catalogUnitBasePercent'?'% от базы'
          :key==='catalogUnitPercentagePoints'?'Процентные пункты (2 = +2%)':'Число (5 = +5)';
        var option=catalogStatic(node('option'),key,fallback);
        option.value=name;
        unit.appendChild(option);
      });
      if (definition.units.indexOf(previous) !== -1) unit.value = previous;
    }
    units(); stat.addEventListener('change', function () { units(); changing(); }); value.addEventListener('input', changing); unit.addEventListener('change', changing);
    row.append(stat, value, unit, button('Убрать', function () { row.remove(); changing(); }, 'secondary'));
    parent.appendChild(row);
  }
  function upgradeRuleRow(rule,parent) {
    var row=node('div',undefined,'upgrade-rule-row');
    var heading=node('div',undefined,'upgrade-rule-heading');
    heading.append(node('strong','Бонус усиления'));
    row.append(heading);
    var effects=node('div',undefined,'effect-rows');
    effectRow({stat:rule.stat,value:rule.value,unit:rule.unit},effects);
    // The numeric stat/units are exactly the existing supported calculator
    // controls; additional controls only specify when the bonus applies.
    var statRow=effects.querySelector('.effect-row');
    statRow.lastElementChild.remove();
    row.append(effects);
    var times=node('div',undefined,'basic-fields');
    [['from','Первый порог +',1],['every','Каждые N уровней',2],['to','Учитывать до +',10]].forEach(function(entry){
      var input=inputField(entry[1],'number',rule[entry[0]]??entry[2],
        'upgrade'+entry[0],times,1,10);
      input.dataset.upgrade=entry[0];input.step='1';input.required=true;
      input.addEventListener('input',changing);
    });
    var gem=selectField('Самоцвет для бонуса', [['','Любой самоцвет'],['fire','Огонь'],['ice','Лёд'],['lightning','Молния'],['poison','Яд'],['light','Свет'],['dark','Тьма'],['rainbow','Радужный']], rule.gemElement || '', 'upgradeGemElement', times);
    gem.dataset.upgradeGem = '';
    gem.parentElement.replaceChild(catalogRecordText(node('span'),{ru:'Самоцвет для бонуса',en:'Gem required for bonus'}),gem.parentElement.firstChild);
    Array.from(gem.options).forEach(function(option) { catalogRecordText(option,upgradeGemLabels[option.value]); });
    row.append(times,button('Удалить правило',function(){row.remove();changing();},'secondary'));
    parent.append(row);
  }
  function specialProcRow(rule,parent) {
    var row=node('div',undefined,'upgrade-rule-row'); row.dataset.procRule='';row.dataset.procKind='special_magic_damage';
    row.append(catalogRecordText(node('strong'),{ru:'Особый магический эффект оружия',en:'Special weapon magic effect'}));
    var names=node('div',undefined,'basic-fields');
    [['en','English'],['ru','Русский'],['jp','日本語'],['tw','繁體中文']].forEach(function(entry){
      var input=inputField(entry[1],'text',rule.names?.[entry[0]]||'','procName'+entry[0],names);
      input.dataset.procName=entry[0];input.maxLength=160;if(entry[0]==='en')input.required=true;
    });
    row.append(names);
    var fields=node('div',undefined,'basic-fields');
    var stat=selectField('Характеристика урона',[['STR','СИЛ / STR'],['INT','ИНТ / INT']],rule.damageStat||'STR','procDamageStat',fields);
    stat.dataset.procDamageStat='';stat.parentElement.replaceChild(catalogRecordText(node('span'),{ru:'Характеристика урона',en:'Damage attribute'}),stat.parentElement.firstChild);
    var gem=selectField('Самоцвет для эффекта',[['','Любой самоцвет'],['fire','Огонь'],['ice','Лёд'],['lightning','Молния'],['poison','Яд'],['light','Свет'],['dark','Тьма'],['rainbow','Радужный']],rule.gemElement||'','specialProcGem',fields);
    gem.dataset.procGem='';gem.parentElement.replaceChild(catalogRecordText(node('span'),{ru:'Самоцвет для эффекта',en:'Gem required for effect'}),gem.parentElement.firstChild);
    Array.from(gem.options).forEach(function(option){catalogRecordText(option,upgradeGemLabels[option.value]);});
    var definitions=[
      ['from','Первый порог +','First threshold +',7,1,10,1],['every','Каждые N уровней','Every N levels',1,1,10,1],['to','До уровня +','Through +',10,1,10,1],
      ['chance','Начальный шанс, %','Initial chance, %',5,0.01,100,.01],['chanceStep','Шанс за шаг, п.п.','Chance per step, pp',5,0,100,.01],
      ['baseDamage','Базовый урон','Base damage',25,0,10000,.01],['damageStep','Урон за шаг','Damage per step',25,0,10000,.01],
      ['statPercent','Характеристика, %','Attribute, %',25,0,10000,.01],['statPercentStep','Характеристика за шаг, п.п.','Attribute per step, pp',25,0,10000,.01],
      ['cooldownSeconds','Перезарядка, сек.','Cooldown, sec.',5,0,10000,.01],['cooldownReduction','Сокращение за шаг, сек.','Cooldown reduction per step, sec.',1,0,10000,.01]
    ];
    definitions.forEach(function(entry){
      var input=inputField(entry[1],'number',rule[entry[0]]??entry[3],'special'+entry[0],fields,entry[4],entry[5]);
      input.dataset.specialValue=entry[0];input.step=String(entry[6]);input.required=true;
      input.parentElement.replaceChild(catalogRecordText(node('span'),{ru:entry[1],en:entry[2]}),input.parentElement.firstChild);
    });
    row.append(fields,catalogRecordText(node('p',undefined,'help-text'),{ru:'Шаги начинаются после первого порога. Укажите подтверждённые числа; итоговый боевой урон не моделируется.',en:'Steps start after the first threshold. Enter confirmed values; final combat damage is not simulated.'}),
      catalogRecordText(button('Удалить правило',function(){row.remove();changing();},'secondary'),{ru:'Удалить правило',en:'Remove rule'}));
    parent.append(row);
  }
  function procRuleRow(rule,parent) {
    if(rule.kind==='special_magic_damage'){specialProcRow(rule,parent);return;}
    var row=node('div',undefined,'upgrade-rule-row');row.dataset.procRule='';
    var fields=node('div',undefined,'basic-fields');
    var mode=selectField('Когда действует', [['base','Базовый шанс'],['upgrade','Порог заточки']], rule.from===undefined?'base':'upgrade','procMode',fields);
    mode.dataset.procMode='';
    mode.parentElement.replaceChild(catalogRecordText(node('span'),{ru:'Когда действует',en:'When it applies'}),mode.parentElement.firstChild);
    catalogRecordText(mode.options[0],{ru:'Базовый шанс',en:'Base chance'});
    catalogRecordText(mode.options[1],{ru:'Порог заточки',en:'Refinement threshold'});
    var chance=inputField('Шанс ожога за правило, %','number',rule.chance??2,'procChance',fields,0.01,100);
    chance.dataset.procChance='';chance.step='.01';chance.required=true;
    chance.parentElement.replaceChild(catalogRecordText(node('span'),{ru:'Шанс ожога за правило, %',en:'Burn chance per rule, %'}),chance.parentElement.firstChild);
    var gem=selectField('Самоцвет для эффекта', [['','Любой самоцвет'],['fire','Огонь'],['ice','Лёд'],['lightning','Молния'],['poison','Яд'],['light','Свет'],['dark','Тьма'],['rainbow','Радужный']],rule.gemElement||'','procGem',fields);
    gem.dataset.procGem='';
    gem.parentElement.replaceChild(catalogRecordText(node('span'),{ru:'Самоцвет для эффекта',en:'Gem required for effect'}),gem.parentElement.firstChild);
    Array.from(gem.options).forEach(function(option){catalogRecordText(option,upgradeGemLabels[option.value]);});
    var ranges=node('div',undefined,'basic-fields');
    [['from','Первый порог +',7],['every','Каждые N уровней',1],['to','Учитывать до +',10]].forEach(function(entry){
      var input=inputField(entry[1],'number',rule[entry[0]]??entry[2],'proc'+entry[0],ranges,1,10);
      input.dataset.procRange=entry[0];input.step='1';input.required=true;
      var english={from:'First threshold +',every:'Every N levels',to:'Through +'};
      input.parentElement.replaceChild(catalogRecordText(node('span'),{ru:entry[1],en:english[entry[0]]}),input.parentElement.firstChild);
    });
    function visibility(){ranges.hidden=mode.value!=='upgrade';ranges.querySelectorAll('input').forEach(function(input){input.disabled=ranges.hidden;});}
    mode.addEventListener('change',visibility);visibility();
    row.append(fields,ranges,catalogRecordText(button('Удалить правило',function(){row.remove();changing();},'secondary'),{ru:'Удалить правило',en:'Remove rule'}));parent.append(row);
  }
  function formValue(field) { return editor.querySelector('[data-field="' + field + '"]').value; }
  function rangeBonusEditor(edit) {
    var section=node('fieldset',undefined,'numeric-effects');
    section.appendChild(catalogRecordText(node('legend'),{ru:'Бонус дальности атаки',en:'Attack range bonus'}));
    section.appendChild(catalogRecordText(node('p',undefined,'help-text'),{ru:'Укажите бонус в игровых единицах. Он учитывается в существующих результатах дальности, когда базовая дальность оружия известна. Пустое поле означает отсутствие бонуса.',en:'Enter the bonus in game units. It is included in the existing range results when the weapon base range is known. Leave empty for no bonus.'}));
    var amount=inputField('Бонус дальности','number',edit.rangeBonus?.amount ?? '', 'rangeBonusAmount',section,-10000,10000);
    amount.step='1'; amount.parentElement.replaceChild(catalogRecordText(node('span'),{ru:'Бонус дальности',en:'Range bonus'}),amount.parentElement.firstChild);
    var scope=selectField('Тип атаки',[['any','Любая'],['melee','Ближний бой'],['ranged','Дальний бой']],edit.rangeBonus?.appliesTo || 'any','rangeBonusScope',section);
    scope.parentElement.replaceChild(catalogRecordText(node('span'),{ru:'Тип атаки',en:'Attack type'}),scope.parentElement.firstChild);
    [{ru:'Любая',en:'Any'},{ru:'Ближний бой',en:'Melee'},{ru:'Дальний бой',en:'Ranged'}].forEach(function(label,index){catalogRecordText(scope.options[index],label);});
    editor.appendChild(section);
  }
  function learningBranchRow(gate, parent) {
    var row = node('div', undefined, 'basic-fields'); row.dataset.learningBranchRow = '';
    var branch = selectField('Ветка умений', meta.skillCategories.map(function (entry) { return [entry.id, entry.name.en]; }), gate.branchId, 'learningBranch', row);
    branch.dataset.learningBranch = '';
    var points = inputField('Нужно очков · 1–200', 'number', gate.minimumPoints, 'learningPoints', row, 1, 200);
    points.dataset.learningPoints = ''; points.step = '1'; points.required = true;
    row.appendChild(button('Убрать требование', function () { row.remove(); changing(); }, 'secondary'));
    parent.appendChild(row);
  }
  function learningEditor(edit, parent) {
    parent = parent || editor;
    var fieldset = node('fieldset', undefined, 'numeric-effects'); fieldset.appendChild(node('legend', 'Условия изучения навыка'));
    if (parent === editor) fieldset.dataset.rootLearning = '';
    var mode = selectField('Как определяется изучение', [['native', 'Исходные условия (как раньше)'], ['custom', 'Свои условия: класс, уровень, ветки']], edit.learningRequirements ? 'custom' : 'native', 'learningMode', fieldset);
    var native = node('p', 'Исходное условие: ' + (current.nativeSkill?.prerequisites.en || current.nativeSkill?.prerequisiteCode || 'по шаблону'), 'help-text'); fieldset.appendChild(native);
    var required = edit.learningRequirements || { classIds: [], classScope: 'exact', minimumLevel: 1, branches: [] };
    var custom = node('fieldset', undefined, 'numeric-effects'); custom.dataset.customLearning = '';
    custom.appendChild(node('legend', 'Свои условия'));
    var basic = node('div', undefined, 'basic-fields'); custom.appendChild(basic);
    var level = inputField('Минимальный уровень · 1–55', 'number', required.minimumLevel, 'learningLevel', basic, 1, 55); level.step = '1'; level.required = true;
    selectField('Выбранные классы', [['exact', 'Только отмеченные'], ['descendants', 'Отмеченные и их последующие профессии']], required.classScope, 'learningClassScope', basic);
    var choices = node('details'); choices.appendChild(node('summary', 'Разрешённые классы · ничего не отмечено = любой'));
    var classOptions = node('div', undefined, 'compatibility-fields'); choices.appendChild(classOptions);
    meta.compatibilityLabels.job.forEach(function (entry) {
      var id = 'job.' + entry.index;
      var checkbox = checkboxField(entry.label, required.classIds.indexOf(id) !== -1, 'learningClass', classOptions);
      checkbox.dataset.learningClass = id;
    }); custom.appendChild(choices);
    custom.appendChild(catalogStatic(node('p',undefined,'help-text'),'catalogLearningBranchesHelp','Все указанные ниже ветки нужны одновременно. Числа — очки ветки, включая бонусы снаряжения. Доступные очки определяют наличие навыка в списке; вложенные — изучен ли он.'));
    var branches = node('div'); branches.dataset.learningBranches = ''; custom.appendChild(branches);
    required.branches.forEach(function (gate) { learningBranchRow(gate, branches); });
    custom.appendChild(button('Добавить требование ветки', function () { learningBranchRow({ branchId: 'skill_category.1', minimumPoints: 1 }, branches); changing(); }, 'secondary'));
    custom.appendChild(node('p', 'Эти поля управляют изучением и дополнительными бонусами. Они не переписывают встроенные формулы, боевые эффекты или тип исходного навыка.', 'help-text'));
    fieldset.appendChild(custom);
    function visibility() { custom.hidden = mode.value !== 'custom'; custom.disabled = custom.hidden; native.hidden = !custom.hidden; }
    mode.addEventListener('change', visibility); visibility(); parent.appendChild(fieldset);
  }
  function profilesEditor(edit) {
    var drafts = structuredClone(edit.profiles || []), index = 0, rendering = false;
    var section = node('fieldset', undefined, 'numeric-effects'); section.dataset.skillProfiles = '';
    section.appendChild(node('legend', 'Варианты этого навыка для разных классов и уровней'));
    section.appendChild(catalogStatic(node('p',undefined,'help-text'),'catalogProfileRulesIntro','Это один навык, а не новые копии. Применяется самый конкретный изученный вариант. Если его условия ещё не выполнены, используются основные поля выше. Условия вариантов не должны совпадать или конфликтовать.'));
    var controls = node('div', undefined, 'basic-fields profile-controls'); section.appendChild(controls);
    var choice = selectField('Редактируемый вариант', [], '', 'profileChoice', controls); choice.dataset.profileChoice = '';
    var panel = node('div'); panel.dataset.profileEditor = '';
    var summary = node('p', undefined, 'help-text'); section.appendChild(summary);
    function value(field) { return panel.querySelector('[data-profile-field="' + field + '"]').value; }
    function saveFields() {
      if (!drafts.length) { catalogLive(summary,'catalogProfileEmptySave','Вариантов пока нет. Основная запись остаётся без изменений.'); return; }
      var profile = drafts[index];
      ['names', 'description'].forEach(function (field) {
        panel.querySelectorAll('[data-profile-field="' + field + '"][data-language]').forEach(function (input) { profile[field][input.dataset.language] = input.value; });
      });
      ['mpCost', 'castSeconds', 'cooldownSeconds', 'durationSeconds'].forEach(function (field) { profile[field] = Number(value(field)); });
      profile.learningRequirements = { classIds: [], classScope: value('learningClassScope'), minimumLevel: Number(value('learningLevel')), branches: [] };
      panel.querySelectorAll('[data-learning-class]').forEach(function (input) { if (input.checked) profile.learningRequirements.classIds.push(input.dataset.learningClass); });
      panel.querySelectorAll('[data-learning-branch-row]').forEach(function (row) { profile.learningRequirements.branches.push({ branchId: row.querySelector('[data-learning-branch]').value, minimumPoints: Number(row.querySelector('[data-learning-points]').value) }); });
    }
    function validFields() {
      var invalid = Array.from(panel.querySelectorAll('input, select, textarea')).find(function (input) { return !input.checkValidity(); });
      if (invalid) { invalid.reportValidity(); return false; } return true;
    }
    function renderFields() {
      rendering = true;
      try {
      choice.replaceChildren();
      drafts.forEach(function (profile, position) { var option = catalogLive(node('option'),'catalogProfileOptionName','Вариант {index} · {name}',{index:position+1,name:profile.names.ru||profile.names.en}); option.value = position; choice.appendChild(option); });
      if (!drafts.length) { var empty = node('option', 'Вариантов нет — основные поля выше'); empty.value = ''; choice.appendChild(empty); }
      choice.disabled = !drafts.length; choice.value = drafts.length ? String(index) : '';
      add.disabled = drafts.length >= 8; remove.disabled = !drafts.length; panel.replaceChildren();
      if (!drafts.length) { catalogLive(summary,'catalogProfileEmptyEdit','Вариантов пока нет. Используются основные поля навыка выше.'); return; }
      var profile = drafts[index];
      multilingual('Название выбранного варианта', 'names', profile.names, panel, false);
      multilingual('Описание выбранного варианта', 'description', profile.description, panel, true);
      learningEditor(profile, panel);
      var learningMode = panel.querySelector('[data-field="learningMode"]'); learningMode.closest('label').remove();
      var learning = panel.querySelector('fieldset.numeric-effects'), conditions = learning.querySelector('[data-custom-learning]');
      // Profiles always have explicit conditions; no misleading native fallback
      // selector inside the profile itself. The main record remains the fallback.
      catalogStatic(conditions.querySelector('legend'),'catalogProfileConditions','Когда применяется выбранный вариант');
      learning.replaceWith(conditions);
      var help = conditions.querySelectorAll('p.help-text');
      catalogStatic(help[0],'catalogProfileBranchesHelp','Все отмеченные ветки нужны одновременно. Вариант включается после достижения класса, уровня и вложенных очков, включая бонусы снаряжения.');
      catalogStatic(help[1],'catalogProfileTimingHelp','Название, описание и MP/время меняются вместе. Эти поля не создают новую формулу боевого урона.');
      var timing = node('div', undefined, 'basic-fields'); panel.appendChild(timing);
      [['mpCost', 'MP варианта'], ['castSeconds', 'Применение, секунд'], ['cooldownSeconds', 'Перезарядка, секунд'], ['durationSeconds', 'Длительность, секунд']].forEach(function (field, position) {
        var input = inputField(field[1], 'number', profile[field[0]], field[0], timing, 0, position === 0 ? 100000 : 86400);
        input.step = position === 0 ? '1' : '.001'; input.required = true;
      });
      panel.querySelectorAll('[data-field]').forEach(function (input) { input.dataset.profileField = input.dataset.field; delete input.dataset.field; });
      catalogRaw(summary,learningSummary(profile.learningRequirements));
      } finally { rendering = false; }
    }
    function updateSummary() {
      // Removing focused controls can synchronously commit their old change
      // event. Never collect that DOM into the newly selected profile.
      if (rendering) return;
      saveFields(); if (!drafts.length) return;
      catalogRaw(summary,learningSummary(drafts[index].learningRequirements));
      catalogLive(choice.options[index],'catalogProfileOptionName','Вариант {index} · {name}',{index:index+1,name:drafts[index].names.ru||drafts[index].names.en});
    }
    panel.addEventListener('input', updateSummary); panel.addEventListener('change', updateSummary);
    choice.addEventListener('change', function () {
      var next = Number(choice.value); if (!validFields()) { choice.value = index; return; }
      saveFields(); index = next; renderFields();
    });
    var add = button('Добавить вариант', function () {
      if (drafts.length >= 8 || !validFields()) return;
      var base = collect();
      drafts.push({ id: 'p-' + crypto.randomUUID(), names: structuredClone(base.names), description: structuredClone(base.description),
        learningRequirements: structuredClone(base.learningRequirements || { classIds: [], classScope: 'exact', minimumLevel: 1, branches: [] }),
        mpCost: base.mpCost, castSeconds: base.castSeconds, cooldownSeconds: base.cooldownSeconds, durationSeconds: base.durationSeconds });
      index = drafts.length - 1; changing(); renderFields();
      panel.querySelector('[data-profile-field="names"][data-language="en"]').focus();
      report('Добавлен приватный вариант. Укажите его класс, уровень/очки и значения; перед публикацией сервер проверит, что условия однозначны.');
    }, 'secondary');
    var remove = button('Удалить выбранный вариант', function () {
      if (!drafts.length || !confirmCatalog('catalogConfirmDeleteVariant','Удалить выбранный вариант из черновика? На сайте он останется до отдельной публикации.')) return;
      drafts.splice(index, 1); index = Math.max(0, index - 1); changing(); renderFields();
    }, 'secondary');
    controls.append(add, remove); section.appendChild(panel); editor.appendChild(section);
    readProfiles = function () { saveFields(); return structuredClone(drafts); };
    renderFields();
  }
  function collect() {
    var edit = structuredClone(current.edit);
    ['names', 'description', 'notes', 'acquisition', 'modifiers'].forEach(function (field) {
      editor.querySelectorAll('[data-field="' + field + '"][data-language]').forEach(function (input) { edit[field][input.dataset.language] = input.value; });
    });
    var rangeField=editor.querySelector('[data-field="rangeBonusAmount"]');
    if (rangeField) {
      if (rangeField.value !== '') edit.rangeBonus={amount:Number(rangeField.value),appliesTo:formValue('rangeBonusScope')};
      else delete edit.rangeBonus;
    }
    if (edit.kind === 'class') {
      edit.progression = edit.progression.map(function (_, index) { return Number(formValue('progression' + index)); });
      var capsToggle = editor.querySelector('[data-potential-caps-toggle]');
      if (capsToggle) {
        if (capsToggle.checked) edit.potentialCaps = Array.from(editor.querySelectorAll('[data-potential-cap]')).map(function (input) { return Number(input.value); });
        else delete edit.potentialCaps;
      }
      return edit;
    }
    if (edit.kind === 'racial') {
      edit.effectMode = formValue('effectMode'); edit.effects = [];
      editor.querySelectorAll('.effect-row').forEach(function (row) { var inputs = row.querySelectorAll('select, input'); edit.effects.push({ stat: Number(inputs[0].value), value: Number(inputs[1].value), unit: inputs[2].value }); });
      edit.bonusRequirements = { weaponCategories: [], shieldRequired: editor.querySelector('[data-field="shieldRequired"]').checked, ridingRequired: editor.querySelector('[data-field="ridingRequired"]').checked };
      editor.querySelectorAll('[data-weapon-category]').forEach(function (input) { if (input.checked) edit.bonusRequirements.weaponCategories.push(Number(input.dataset.weaponCategory)); });
      edit.calculationNotes = {};
      editor.querySelectorAll('[data-field="calculationNotes"]').forEach(function (input) { edit.calculationNotes[input.dataset.language] = input.value; });
      return edit;
    }
    if (edit.kind === 'active' || edit.kind === 'passive') {
      if (formValue('learningMode') === 'custom') {
        edit.learningRequirements = { classIds: [], classScope: formValue('learningClassScope'), minimumLevel: Number(formValue('learningLevel')), branches: [] };
        editor.querySelectorAll('[data-root-learning] [data-learning-class]').forEach(function (input) { if (input.checked) edit.learningRequirements.classIds.push(input.dataset.learningClass); });
        editor.querySelectorAll('[data-root-learning] [data-learning-branch-row]').forEach(function (row) { edit.learningRequirements.branches.push({ branchId: row.querySelector('[data-learning-branch]').value, minimumPoints: Number(row.querySelector('[data-learning-points]').value) }); });
      } else delete edit.learningRequirements;
      if (edit.kind === 'active') {
        ['mpCost', 'castSeconds', 'cooldownSeconds', 'durationSeconds'].forEach(function (field) { edit[field] = Number(formValue(field)); });
        if (readProfiles) { var profiles = readProfiles(); if (profiles.length) edit.profiles = profiles; else delete edit.profiles; }
      }
      else {
        if (editor.querySelector('[data-field="intrinsicEffectMode"]')) {
          var mode = formValue('intrinsicEffectMode');
          if (mode === 'add') delete edit.intrinsicEffectMode; else edit.intrinsicEffectMode = mode;
        }
        edit.effects = []; editor.querySelectorAll('.effect-row').forEach(function (row) { var inputs = row.querySelectorAll('select, input'); edit.effects.push({ stat: Number(inputs[0].value), value: Number(inputs[1].value), unit: inputs[2].value }); });
        edit.bonusRequirements.weaponCategories = []; editor.querySelectorAll('[data-weapon-category]').forEach(function (input) { if (input.checked) edit.bonusRequirements.weaponCategories.push(Number(input.dataset.weaponCategory)); });
        ['shieldRequired', 'ridingRequired'].forEach(function (field) { edit.bonusRequirements[field] = editor.querySelector('[data-field="' + field + '"]').checked; });
      }
      return edit;
    }
    if (edit.kind === 'equipment') { edit.category = Number(formValue('category')); edit.level = Number(formValue('level')); edit.sockets = Number(formValue('sockets')); }
    edit.disabled = editor.querySelector('[data-field="disabled"]').checked;
    edit.baseAttack = editor.querySelector('[data-field="baseAttack"]') && formValue('baseAttack') !== '' ? Number(formValue('baseAttack')) : null;
    if (editor.querySelector('[data-field="baseRange"]') && formValue('baseRange') !== '') edit.baseRange = Number(formValue('baseRange'));
    else delete edit.baseRange;
    edit.effectMode = formValue('effectMode');
    edit.effects = [];
    editor.querySelectorAll('.numeric-effects > .effect-rows > .effect-row').forEach(function (row) { var inputs = row.querySelectorAll('select, input'); edit.effects.push({ stat: Number(inputs[0].value), value: Number(inputs[1].value), unit: inputs[2].value }); });
    if(edit.kind==='equipment'){
      edit.upgradeBonuses=[];
      editor.querySelectorAll('.upgrade-editor .upgrade-rule-row').forEach(function(row){
        var inputs=row.querySelectorAll('.effect-row select, .effect-row input'),
          range={};
        row.querySelectorAll('[data-upgrade]').forEach(function(input){range[input.dataset.upgrade]=Number(input.value);});
        var rule={stat:Number(inputs[0].value),value:Number(inputs[1].value),unit:inputs[2].value,
          from:range.from,every:range.every,to:range.to};
        var gem=row.querySelector('[data-upgrade-gem]').value;
        if(gem)rule.gemElement=gem;
        edit.upgradeBonuses.push(rule);
      });
      edit.procEffects=[];
      editor.querySelectorAll('[data-proc-rule]').forEach(function(row){
        if(row.dataset.procKind==='special_magic_damage') {
          var special={kind:'special_magic_damage',names:{},damageStat:row.querySelector('[data-proc-damage-stat]').value};
          row.querySelectorAll('[data-proc-name]').forEach(function(input){special.names[input.dataset.procName]=input.value;});
          row.querySelectorAll('[data-special-value]').forEach(function(input){special[input.dataset.specialValue]=Number(input.value);});
          var specialGem=row.querySelector('[data-proc-gem]').value;if(specialGem)special.gemElement=specialGem;
          edit.procEffects.push(special);return;
        }
        var rule={kind:'burn',chance:Number(row.querySelector('[data-proc-chance]').value)};
        var gem=row.querySelector('[data-proc-gem]').value;if(gem)rule.gemElement=gem;
        if(row.querySelector('[data-proc-mode]').value==='upgrade')row.querySelectorAll('[data-proc-range]').forEach(function(input){rule[input.dataset.procRange]=Number(input.value);});
        edit.procEffects.push(rule);
      });
      var nativeUpgrade=editor.querySelector('[data-native-upgrade-replacement]');
      if (nativeUpgrade && nativeUpgrade.checked) edit.nativeUpgradePolicy=nativeUpgrade.value;
      else delete edit.nativeUpgradePolicy;
      var nativeBase=editor.querySelector('[data-native-base-replacement]');
      if (nativeBase && nativeBase.checked) edit.nativeBasePolicy='replace-priest-earring-aura';
      else delete edit.nativeBasePolicy;
    }
    ['races', 'classes', 'slots'].forEach(function (field) { editor.querySelectorAll('[data-flag="' + field + '"]').forEach(function (input) { edit[field][Number(input.dataset.index)] = input.checked ? 1 : 0; }); });
    return edit;
  }
  async function saveDraft() {
    if (!editor.reportValidity()) return;
    var thisGeneration = generation;
    host.inert = true; host.setAttribute('aria-busy', 'true');
    var busy = editor.querySelectorAll('.editor-actions button'); busy.forEach(function (button) { button.disabled = true; });
    try {
      var result = await api('draft', { edit: collect(), expectedDraftVersion: current.draftVersion, expectedCatalogRevision: current.catalogRevision });
      if (thisGeneration !== generation) return;
      current = result; dirty = false; renderEditor(); report('Черновик сохранён. На сайте он ещё не опубликован.'); await Promise.all([loadList(),refreshDrafts()]);
    } catch (error) { if (thisGeneration === generation) report(error.message + ' Несохранённые поля оставлены на месте.', true); }
    finally { busy.forEach(function (button) { button.disabled = false; }); if (thisGeneration === generation) { host.inert = false; host.removeAttribute('aria-busy'); } }
  }
  async function publish() {
    if (dirty || !current.hasDraft) { report('Сначала сохраните черновик.'); return; }
    if (!confirmCatalog('catalogConfirmPublishSingle','Опубликовать «{name}»? Названия и характеристики изменятся в Modern. Legacy останется неизменным.',{name:current.edit.names.en})) return;
    var thisGeneration = generation, id = current.identity.id;
    host.inert = true; host.setAttribute('aria-busy', 'true');
    try {
      var result = await api('publish', { id: current.identity.id, expectedDraftVersion: current.draftVersion, expectedCatalogRevision: current.catalogRevision });
      if (thisGeneration !== generation) return;
      var refreshed = await api('item?id=' + encodeURIComponent(id)); if (thisGeneration !== generation) return;
      current = refreshed; renderEditor(); await Promise.all([loadList(),refreshDrafts()]);
      if (thisGeneration === generation) {
        window.dispatchEvent(new Event('pandora:catalog-published'));
        reportTranslated('catalogStatusRevisionPublished','Опубликована версия каталога {revision}.',{revision:result.catalogRevision});
      }
    } catch (error) { if (thisGeneration === generation) report(error.message, true); }
    finally { if (thisGeneration === generation) { host.inert = false; host.removeAttribute('aria-busy'); } }
  }
  function syncNewButton() {
    if (!newButton || !kind) return;
    var skill = kind.value === 'active' || kind.value === 'passive';
    catalogStatic(newButton,skill?'catalogNewSkillSelected':'catalogNewRecord',skill?'Новый навык из выбранного':'Новая запись');
    newButton.disabled = skill
      ? !(current?.edit?.id && current.edit.kind === kind.value)
      : kind.value !== 'equipment' && kind.value !== 'soul';
  }
  function updateLocaleCoverage() {
    if (!editor) return;
    var indicator = editor.querySelector('[data-language-coverage]');
    if (!indicator) return;
    var groups = ['names', 'description'].map(function (field) {
      var filled = languages.filter(function (entry) {
        var input = editor.querySelector('[data-field="' + field + '"][data-language="' + entry[0] + '"]');
        return input && input.value.trim().length > 0;
      }).map(function (entry) { return entry[0].toUpperCase(); });
      return (field === 'names' ? 'Название' : 'Описание') + ': ' +
        (filled.length ? filled.join(' / ') : 'нет текста');
    });
    indicator.textContent = groups.join(' · ') +
      ' · Проверяй корректность каждого языка перед публикацией.';
    refreshItemPreview();
  }
  function renderEditor() {
    editor.replaceChildren(); readProfiles = null; var edit = current.edit;
    syncNewButton();
    editor.appendChild(node('h3', edit.id ? edit.names.en : 'Новая запись'));
    var numericId=current.identity&&['equipment','soul'].includes(edit.kind)
      ? (edit.kind==='equipment'?current.identity.category*10000+current.identity.index:current.identity.index) : null;
    var numericLabel=['equipment','soul'].includes(edit.kind)
      ? (numericId===null?'Числовой ID выдаст сервер':'Игровой ID: '+numericId)+' · ' : '';
    editor.appendChild(node('p', numericLabel+(edit.id||'Технический ID ещё не назначен')+' · '+
      (current.hasDraft?'ЧЕРНОВИК '+current.draftVersion:current.published?'ОПУБЛИКОВАНО':edit.id?'ИСТОЧНИК':'НОВАЯ НЕСОХРАНЁННАЯ ЗАПИСЬ'),
      'item-identity'));
    if (['equipment', 'soul', 'active', 'passive'].includes(edit.kind)) {
      var coverage = node('p', '', 'catalog-language-coverage');
      coverage.dataset.languageCoverage = '';
      coverage.setAttribute('role', 'status');
      coverage.setAttribute('aria-live', 'polite');
      editor.appendChild(coverage);
    }
    review();
    if (edit.kind === 'active' || edit.kind === 'passive') {
      multilingual('Название навыка · English обязателен', 'names', edit.names, editor, false);
      multilingual('Описание — текст, не формула', 'description', edit.description, editor, true);
      editor.appendChild(node('p', 'Исходное изучение: ' + current.nativeSkill.prerequisites.en + ' · снаряжение: ' + current.nativeSkill.equipmentRequirements.en, 'help-text'));
      if (edit.templateId) {
        var template = node('p', 'Шаблон изучения: ' + (current.nativeSkill.templateName?.en || '') + ' · ' + edit.templateId, 'help-text');
        template.dataset.skillTemplate = ''; editor.appendChild(template);
        editor.appendChild(node('p', 'Это отдельный новый навык. Тип сохраняется; условия по умолчанию — от шаблона, либо задаются отдельно ниже. Встроенный эффект шаблона не копируется. Для пассивки действуют только явно указанные дополнительные числа.', 'help-text'));
      } else editor.appendChild(node('p', 'Условия изучения и числовой эффект редактируются отдельно. Изменение названия или описания само по себе не меняет расчёт.', 'help-text'));
      learningEditor(edit);
      if (edit.kind === 'active') {
        var timings = node('fieldset', undefined, 'numeric-effects'); timings.appendChild(node('legend', 'Данные активного навыка'));
        var values = node('div', undefined, 'basic-fields');
        [['mpCost', 'Стоимость MP'], ['castSeconds', 'Время применения, секунд'], ['cooldownSeconds', 'Перезарядка, секунд'], ['durationSeconds', 'Длительность, секунд']].forEach(function (field, index) {
          var input = inputField(field[1], 'number', edit[field[0]], field[0], values, 0, index === 0 ? 100000 : 86400); input.step = index === 0 ? '1' : '.001'; input.required = true;
        }); timings.appendChild(values); timings.appendChild(node('p', 'Эти значения отображаются в изученном навыке. Они не создают новую формулу урона или новую боевую симуляцию. Встроенные эффекты и переключатели баффов Legacy сохраняются.', 'help-text')); editor.appendChild(timings);
        if (!edit.templateId) profilesEditor(edit);
      } else {
        var bonuses = node('fieldset', undefined, 'numeric-effects'); bonuses.appendChild(node('legend', 'Эффект изученной пассивки'));
        if (current.nativeSkill.intrinsicEffect && !edit.templateId) {
          selectField('Что делать со встроенным эффектом', [['add', 'Добавить к исходному эффекту'], ['replace', 'Заменить исходный эффект']], edit.intrinsicEffectMode || 'add', 'intrinsicEffectMode', bonuses);
          bonuses.appendChild(node('p', current.nativeSkill.intrinsicEffect.noteRu, 'help-text'));
          bonuses.appendChild(node('p', 'Замена отключает старый вклад. Укажите новые числа ниже; пустой список отключает вклад без новых бонусов. Числа зависят от изучения, оружия, щита и езды. Они не создают боевую механику, которую калькулятор не моделирует.', 'help-text'));
        }
        if (edit.templateId || !current.nativeSkill.intrinsicEffect) bonuses.appendChild(node('p', edit.templateId
          ? 'У нового навыка действуют только числа ниже: встроенный эффект шаблона не копируется. Изучение определяют условия выше, даже если список умений скрыт. Затем проверяются условия снаряжения и езды.'
          : 'Встроенный эффект этого навыка ещё не сопоставлен с расчётами: его замена недоступна. Можно добавить только числа ниже; они не доказывают работу исходной боевой механики.', 'help-text'));
        var bonusRows = node('div', undefined, 'effect-rows'); bonuses.appendChild(bonusRows); edit.effects.forEach(function (effect) { effectRow(effect, bonusRows); });
        bonuses.appendChild(button('Добавить характеристику', function () { effectRow({ stat: 1, value: 0, unit: 'flat' }, bonusRows); changing(); }, 'secondary')); editor.appendChild(bonuses);
        var requirements = node('fieldset', undefined, 'compatibility-fields'); requirements.appendChild(node('legend', 'Оружие для числового эффекта · пусто = любое'));
        [[-1, 'Без оружия']].concat(meta.categories.filter(function (entry) { return entry.legacy_id <= 13; }).map(function (entry) { return [entry.legacy_id, entry.name.en]; })).forEach(function (entry) {
          var input = checkboxField(entry[1], edit.bonusRequirements.weaponCategories.indexOf(entry[0]) !== -1, 'bonusWeapon', requirements); input.dataset.weaponCategory = entry[0];
        }); editor.appendChild(requirements);
        checkboxField('Числовой эффект требует надетый щит', edit.bonusRequirements.shieldRequired, 'shieldRequired', editor);
        checkboxField('Числовой эффект требует включённую верховую езду', edit.bonusRequirements.ridingRequired, 'ridingRequired', editor);
      }
      var skillActions = node('div', undefined, 'editor-actions'); skillActions.append(button('Сохранить черновик', saveDraft), button('Опубликовать', publish));
      if (edit.id) skillActions.append(button('Создать новый навык по этому шаблону', duplicateSkill, 'secondary'));
      editor.appendChild(skillActions);
      finishEditor(); return;
    }
    if (edit.kind === 'racial') {
      var race = meta.compatibilityLabels.race.find(function (entry) { return entry.index === edit.category; });
      editor.appendChild(node('p', 'Раса: ' + race.label + ' · слот ' + (current.identity.index + 1), 'item-identity'));
      multilingual('Название расовой пассивки · English обязателен', 'names', edit.names, editor, false);
      multilingual('Описание — текст, не формула', 'description', edit.description, editor, true);
      var racialEffects = node('fieldset', undefined, 'numeric-effects'); racialEffects.appendChild(node('legend', 'Эффект выбранной расовой пассивки'));
      selectField('Как применять числовые бонусы', [['preserve', 'Сохранить исходную механику (только текст)'], ['add', 'Добавить к исходной механике'], ['replace', 'Заменить исходную механику указанными бонусами']], edit.effectMode, 'effectMode', racialEffects);
      racialEffects.appendChild(node('p', 'Бонус действует только когда персонаж выбрал эту расовую способность. «Заменить» отключает её встроенные эффекты расчёта и применяет только числа ниже. Пустая замена убирает встроенный эффект. Боевые действия, которых нет в Legacy, это не создаёт.', 'help-text'));
      var racialRows = node('div', undefined, 'effect-rows'); racialEffects.appendChild(racialRows); edit.effects.forEach(function (effect) { effectRow(effect, racialRows); });
      racialEffects.appendChild(button('Добавить характеристику', function () { effectRow({ stat: 1, value: 0, unit: 'flat' }, racialRows); var mode = editor.querySelector('[data-field="effectMode"]'); if (mode.value === 'preserve') mode.value = 'add'; changing(); }, 'secondary')); editor.appendChild(racialEffects);
      var required = edit.bonusRequirements || { weaponCategories: [], shieldRequired: false, ridingRequired: false };
      var weaponFields = node('fieldset', undefined, 'compatibility-fields'); weaponFields.appendChild(node('legend', 'Оружие для этих бонусов · пусто = любое'));
      [[-1, 'Без оружия']].concat(meta.categories.filter(function (entry) { return entry.legacy_id <= 13; }).map(function (entry) { return [entry.legacy_id, entry.name.en]; })).forEach(function (entry) {
        var input = checkboxField(entry[1], required.weaponCategories.indexOf(entry[0]) !== -1, 'racialWeapon', weaponFields); input.dataset.weaponCategory = entry[0];
      }); editor.appendChild(weaponFields);
      checkboxField('Числовые бонусы требуют щит', required.shieldRequired, 'shieldRequired', editor);
      checkboxField('Числовые бонусы требуют верховую езду', required.ridingRequired, 'ridingRequired', editor);
      multilingual('Ограничения расчёта · если эффект пока только справочный', 'calculationNotes', edit.calculationNotes || { en: '', ru: '', jp: '', tw: '' }, editor, true);
      rangeBonusEditor(edit);
      var racialActions = node('div', undefined, 'editor-actions'); racialActions.append(button('Сохранить черновик', saveDraft), button('Опубликовать', publish)); editor.appendChild(racialActions);
      finishEditor(); return;
    }
    if (edit.kind === 'class') {
      multilingual('Название класса · English обязателен', 'names', edit.names, editor, false);
      multilingual('Описание класса — текст, не формула', 'description', edit.description, editor, true);
      var progression = node('fieldset', undefined, 'numeric-effects'); progression.appendChild(node('legend', 'LP / MP — параметры исходного движка'));
      progression.appendChild(node('p', 'Первые два числа — базовые LP и MP. Остальные четыре — делители в исходной формуле: меньше делитель → больше рост. Это не прямая прибавка за уровень. Формулы Legacy не меняются.', 'help-text'));
      var parameters = node('div', undefined, 'basic-fields');
      ['Базовое LP', 'Базовое MP', 'Делитель роста LP от уровня', 'Делитель роста MP от уровня', 'Делитель роста LP от STA', 'Делитель роста MP от SPR'].forEach(function (label, index) {
        var input = inputField(label, 'number', edit.progression[index], 'progression' + index, parameters, index < 2 ? 0 : 0.0001, 100000);
        input.required = true; input.step = index < 2 ? '1' : 'any';
      }); progression.appendChild(parameters); editor.appendChild(progression);
      if (current.nativeClass) {
        var branchIndices = [1,2,3,4,5,7,8,9,10,11,13,14,15,16,18,19,20,21,23,24];
        var limits = node('details', undefined, 'numeric-effects'); limits.dataset.potentialCapsEditor = '';
        limits.appendChild(catalogStatic(node('summary'),'catalogBranchLimits','Пределы веток умений'));
        limits.appendChild(catalogStatic(node('p',undefined,'help-text'),'catalogBranchLimitsHelp','Сначала показаны действующие значения. Изменение предела действует после публикации; очки сверх нового предела возвращаются при обновлении билда.'));
        var toggleWrap=node('label',undefined,'flag-label'), toggle=node('input');
        toggle.type='checkbox'; toggle.dataset.potentialCapsToggle=''; toggle.checked=Array.isArray(edit.potentialCaps);
        toggleWrap.append(toggle,catalogStatic(node('span'),'catalogBranchLimitsCustom','Изменить пределы для этого класса')); limits.appendChild(toggleWrap);
        var capFields=node('div',undefined,'basic-fields'), values=edit.potentialCaps||current.nativeClass.potentialCaps;
        branchIndices.forEach(function(branch,index){
          var category=meta.skillCategories.find(function(row){return row.index===branch;});
          var wrap=node('label',undefined,'editor-field');
          wrap.appendChild(catalogRecordText(node('span'),category?.name||{en:String(branch)}));
          var input=node('input');input.type='number';input.step='1';input.required=true;
          input.min=current.nativeClass.minimumBranches[index];input.max=120;input.value=values[index];input.disabled=!toggle.checked;
          input.dataset.potentialCap=String(index);input.addEventListener('input',changing);wrap.appendChild(input);capFields.appendChild(wrap);
        });
        toggle.addEventListener('change',function(){capFields.querySelectorAll('[data-potential-cap]').forEach(function(input){input.disabled=!toggle.checked;});changing();});
        limits.appendChild(capFields);editor.appendChild(limits);
      }
      editor.appendChild(catalogStatic(node('p',undefined,'help-text'),'catalogClassIdentityHelp','ID и родство класса сохраняются для совместимости с билдом. Встроенные пассивки редактируются отдельно. Новый класс требует поддержки движка.'));
      var classActions = node('div', undefined, 'editor-actions'); classActions.append(button('Сохранить черновик', saveDraft), button('Опубликовать', publish)); editor.appendChild(classActions);
      finishEditor(); return;
    }
    var basic = node('div', undefined, 'basic-fields'); editor.appendChild(basic);
    if (edit.kind === 'equipment') {
      var category = selectField('Тип', meta.categories.map(function (item) { return [item.legacy_id, item.name.en]; }), edit.category, 'category', basic);
      category.disabled = Boolean(edit.id);
      category.addEventListener('change', function () { current.edit = collect(); current.edit.baseAttack = current.edit.category <= 13 ? 0 : null; renderEditor(); });
      inputField('Нужный уровень (0 = не указан)', 'number', edit.level, 'level', basic, 0, 1000);
      inputField('Слоты для Souls', 'number', edit.sockets, 'sockets', basic, 0, 3);
      if (edit.category <= 13) inputField('Базовая атака оружия (пусто = исходная)', 'number', edit.baseAttack ?? '', 'baseAttack', basic, 0, 10000).addEventListener('input', function () {
        var mode = editor.querySelector('[data-field="effectMode"]'); if (mode.value === 'preserve') mode.value = 'patch';
      });
      if (edit.category <= 13) {
        var rangeInput=inputField('Базовая дальность оружия (пусто = исходная)', 'number', edit.baseRange ?? '', 'baseRange', basic, 1, 10000);
        rangeInput.step='1';
        basic.appendChild(catalogStatic(node('p',undefined,'help-text'),'catalogFieldWeaponRangeHelp','Укажите базовую дальность в игровых единицах. Если поле пустое, используется подтверждённое исходное значение; для остальных вещей дальность неизвестна. Бонусы от навыков и верховой езды здесь не учитываются.'));
      }
    }
    var unavailable = node('label', undefined, 'flag-label'); var disabled = node('input'); disabled.type = 'checkbox'; disabled.checked = edit.disabled; disabled.dataset.field = 'disabled'; disabled.addEventListener('change', changing); unavailable.append(disabled, document.createTextNode('Не предлагать для новых билдов (старые сохранения не удалять)')); editor.appendChild(unavailable);
    multilingual('Название · English обязателен; остальные языки могут быть пустыми', 'names', edit.names, editor, false);
    multilingual('Описание / обычные бонусы — текст, не формула', 'description', edit.description, editor, true);
    multilingual('Дополнительное описание / особые эффекты — текст', 'notes', edit.notes, editor, true);
    multilingual('Где получить', 'acquisition', edit.acquisition, editor, true);
    if (edit.kind === 'soul') multilingual('Приставка к названию экипированной вещи', 'modifiers', edit.modifiers, editor, false);
    var effects = node('fieldset', undefined, 'numeric-effects'); effects.appendChild(node('legend', 'Расчётные характеристики'));
    selectField('Как менять исходные числовые эффекты', [['preserve', 'Сохранить всё исходное (только текст)'], ['patch', 'Изменить перечисленные характеристики'], ['replace', 'Заменить исходную числовую строку']], edit.effectMode, 'effectMode', effects);
    effects.appendChild(node('p', 'Описание выше само по себе не влияет на расчёт. Числа ниже передаются Legacy engine. В режиме «Изменить» остальные исходные бонусы сохраняются. У специальных предметов остаются исходные условные эффекты движка.', 'help-text'));
    if (edit.id === 'modern.equipment.ac383fab-00a9-45ff-a09a-b2192c47ef5d') {
      effects.appendChild(catalogRecordText(node('p',undefined,'help-text'),{ru:'Встроенный бонус: урон активной ауры +2. Чтобы изменить или убрать его, включите замену и укажите новое значение ниже. Пустой список убирает этот бонус.',en:'Built-in bonus: active aura damage +2. To change or remove it, enable replacement and specify the new value below. An empty list removes the bonus.'}));
      var baseLabel=node('label',undefined,'flag-label'), baseToggle=node('input');
      baseToggle.type='checkbox';baseToggle.dataset.nativeBaseReplacement='';baseToggle.checked=edit.nativeBasePolicy==='replace-priest-earring-aura';baseToggle.addEventListener('change',changing);
      baseLabel.append(baseToggle,catalogRecordText(node('span'),{ru:'Заменить встроенный бонус ауры +2',en:'Replace the built-in +2 aura bonus'}));effects.appendChild(baseLabel);
    }
    var rows = node('div', undefined, 'effect-rows'); effects.appendChild(rows);
    edit.effects.forEach(function (effect) { effectRow(effect, rows); });
    effects.appendChild(button('Добавить характеристику', function () { effectRow({ stat: 1, value: 0, unit: 'flat' }, rows); var mode = editor.querySelector('[data-field="effectMode"]'); if (mode.value === 'preserve') mode.value = 'patch'; changing(); }, 'secondary'));
    editor.appendChild(effects);
    rangeBonusEditor(edit);
    if(edit.kind==='equipment'){
      var upgrades=node('fieldset',undefined,'numeric-effects upgrade-editor');
      upgrades.append(node('legend','Бонусы от заточки (+1…+10)'));
      upgrades.append(node('p','Только расчётные характеристики. Пример: +1 п.п. эффективности лечения при +2, +4, +6, +8 и +10: первый порог 2, шаг 2, до 10, значение 1. Это ДОПОЛНЕНИЕ к исходным эффектам вещи и не симулирует случайные срабатывания при атаке.','help-text'));
      var oldFireWeapons=['equipment.0.13','equipment.1.9','equipment.2.7','equipment.3.8','equipment.4.7','equipment.5.9','equipment.6.12','equipment.7.9','equipment.8.12','equipment.9.5','equipment.10.11','equipment.11.7'];
      var oldFireWands=['equipment.12.12','equipment.13.9'];
      var oldZephyrus=['equipment.5.27','equipment.5.28'];
      var oldArmorPolicies={'equipment.31.64':'replace-legacy-gold-plate-upgrade','equipment.32.82':'replace-legacy-lunar-gloves-upgrade','equipment.32.61':'replace-legacy-mana-bracelets-upgrade'};
      if (oldFireWeapons.includes(edit.id) || oldFireWands.includes(edit.id) || oldZephyrus.includes(edit.id) || oldArmorPolicies[edit.id]) {
        var label=node('label',undefined,'flag-label'), replaceNative=node('input');
        replaceNative.type='checkbox';replaceNative.value=oldArmorPolicies[edit.id]|| (oldZephyrus.includes(edit.id)?'replace-legacy-zephyrus-upgrade':oldFireWands.includes(edit.id)?'replace-legacy-fire-wand':'replace-legacy-fire-weapon');replaceNative.checked=edit.nativeUpgradePolicy===replaceNative.value;
        replaceNative.dataset.nativeUpgradeReplacement='';replaceNative.addEventListener('change',changing);
        label.append(replaceNative,catalogRecordText(node('span'),oldArmorPolicies[edit.id]
          ? {ru:'Заменить старые бонусы заточки этой вещи правилами ниже',en:'Replace this item’s old refinement bonuses with the rules below'}
          : {ru:'Заменить старые бонусы заточки этого оружия правилами ниже',en:'Replace this weapon’s old refinement bonuses with the rules below'}));
        upgrades.append(label);
        if(oldZephyrus.includes(edit.id)) upgrades.appendChild(catalogRecordText(node('p',undefined,'help-text'),{ru:'Старая версия добавляет бонус урона ауры +20% с +5 и ещё +30% с +7. Замена отключает эти значения и использует указанные ниже правила.',en:'The old version adds +20% aura damage from +5 and another +30% from +7. Replacement disables those values and uses the rules below.'}));
        if(oldArmorPolicies[edit.id]) upgrades.appendChild(catalogRecordText(node('p',undefined,'help-text'),{ru:'Замена отключает старые бонусы заточки этой вещи и использует правила ниже. Эффекты комплекта остаются.',en:'Replacement disables this item’s old refinement bonuses and uses the rules below. Set effects remain.'}));
      }
      var upgradeRows=node('div',undefined,'upgrade-rule-list');
      (edit.upgradeBonuses||[]).forEach(function(rule){upgradeRuleRow(rule,upgradeRows);});
      upgrades.append(upgradeRows,button('Добавить бонус заточки',function(){
        upgradeRuleRow({stat:11,value:1,unit:'flat',from:2,every:2,to:10},upgradeRows);changing();
      },'secondary'));
      editor.append(upgrades);
      if(edit.category<=13){
        var procs=node('fieldset',undefined,'numeric-effects');procs.dataset.procEditor='';
        procs.append(catalogRecordText(node('legend'),{ru:'Эффекты оружия при атаке',en:'Weapon effects on attack'}));
        procs.append(catalogRecordText(node('p',undefined,'help-text'),{ru:'Общий ожог и уникальные эффекты оружия показываются отдельно. Указывайте подтверждённые значения; бой, сопротивление цели и объединение вероятностей не рассчитываются.',en:'Common burn and unique weapon effects are shown separately. Enter confirmed values; combat, target resistance and combined probabilities are not calculated.'}));
        var procRows=node('div',undefined,'upgrade-rule-list');
        (edit.procEffects||[]).forEach(function(rule){procRuleRow(rule,procRows);});
        procs.append(procRows,catalogRecordText(button('Добавить шанс ожога',function(){procRuleRow({kind:'burn',chance:2},procRows);changing();},'secondary'),{ru:'Добавить шанс ожога',en:'Add burn chance'}));
        procs.append(catalogRecordText(button('Добавить особый эффект',function(){specialProcRow({kind:'special_magic_damage',names:{en:'New weapon effect'}},procRows);changing();},'secondary'),{ru:'Добавить особый эффект',en:'Add special effect'}));
        editor.append(procs);
      }
    }
    if (edit.kind === 'equipment') { compatibility('Разрешённые расы', 'races', edit.races, meta.compatibilityLabels.race, editor); compatibility('Разрешённые классы', 'classes', edit.classes, meta.compatibilityLabels.job, editor); }
    else compatibility('Куда вставляется Soul', 'slots', edit.slots, ['Weapon', 'Shield', 'Head', 'Torso', 'Arms', 'Legs', 'Boots', 'Cloak'].map(function (label, index) { return { label, index }; }), editor);
    var actions = node('div', undefined, 'editor-actions');
    actions.append(button('Сохранить черновик', saveDraft), button('Опубликовать', publish), button('Создать вариант', function () { if (!canLeave()) return; var copy = structuredClone(current.edit); copy.id = ''; copy.effectMode = 'replace'; current = { edit: copy, draftVersion: 0, catalogRevision, hasDraft: false }; dirty = true; renderEditor(); report('Новый вариант получит отдельный ID. Перед сохранением явно задайте его числовые эффекты.'); }, 'secondary'));
    editor.appendChild(actions); finishEditor();
  }
  async function openItem(id) {
    if (!canLeave()) return;
    var sequence = ++editorRequest, thisGeneration = generation;
    current = null; dirty = false; editor.replaceChildren(node('p', 'Загрузка ' + id + '…'));
    try {
      var result = await api('item?id=' + encodeURIComponent(id)); if (thisGeneration !== generation || sequence !== editorRequest) return;
      current = result; renderEditor(); syncNewButton();
      listHost.querySelectorAll('.catalog-entry').forEach(function (entry) { if (entry.dataset.recordId === id) entry.setAttribute('aria-current', 'true'); else entry.removeAttribute('aria-current'); });
      reportTranslated('catalogStatusRecordSelected','Выбрано: {name}. Изменения пока не опубликованы.',{name:current.edit.names.en});
    } catch (error) { if (thisGeneration === generation && sequence === editorRequest) report(error.message, true); }
  }
  async function loadList() {
    var sequence = ++pending, thisGeneration = generation;
    listHost.replaceChildren(); listHost.setAttribute('aria-busy', 'true'); catalogLive(listStatus,'catalogListLoading','Поиск…');
    try {
      var result = await api('catalog?kind=' + kind.value + '&q=' + encodeURIComponent(search.value) + '&page=' + page);
      if (sequence !== pending || thisGeneration !== generation) return false;
      catalogRevision = result.catalogRevision; listHost.replaceChildren(); listHost.removeAttribute('aria-busy');
      catalogLive(listStatus,'catalogListSummary','Версия {revision} · {count} записей · страница {page}',{revision:catalogRevision,count:result.count,page:page+1});
      if(listLoadFailed){
        listLoadFailed=false;
        if(!draftLoadFailed)report('Каталог загружен. Черновики приватны; массовая публикация доступна над каталогом.');
      }
      result.items.forEach(function (item) {
        var select = button(item.names.ru || item.names.en, function () { openItem(item.id); }, 'catalog-entry');
        select.dataset.recordId = item.id;
        select.dataset.hasDraft=String(Boolean(item.draftVersion));
        if(item.draftVersion)catalogAttribute(select,'title','catalogUnpublishedDraftTitle','Сохранённый неопубликованный черновик');
        if (current?.edit.id === item.id) select.setAttribute('aria-current', 'true');
        var race = kind.value === 'racial' && meta.compatibilityLabels.race.find(function (entry) { return entry.index === item.category; });
        select.appendChild(node('span', (item.draftVersion ? 'Черновик · ' : '') + item.names.en + (race ? ' · ' + race.label : '') + (kind.value === 'equipment' ? ' · Lv ' + item.level + ' · ○ ' + item.sockets : ''), 'catalog-entry-meta')); listHost.appendChild(select);
      });
      if (!result.items.length) listHost.appendChild(node('p', 'Ничего не найдено.'));
      var pagination = node('div', undefined, 'pagination'); var back = button('← Назад', function () { page--; loadList(); }, 'secondary'); back.disabled = page === 0;
      var next = button('Далее →', function () { page++; loadList(); }, 'secondary'); next.disabled = (page + 1) * result.pageSize >= result.count; pagination.append(back, next); listHost.appendChild(pagination);
      return true;
    } catch (error) {
      if (thisGeneration === generation && sequence === pending) {
        listLoadFailed=true;
        listHost.removeAttribute('aria-busy');
        catalogLive(listStatus,'catalogListUnavailable','Список не загружен');
        listHost.replaceChildren(node('p',error.message,'catalog-draft-warning'),
          button('Повторить загрузку',loadList,'secondary'));
        report(error.message, true);
      }
      return false;
    }
  }

  async function refreshDrafts() {
    var token=++draftRequest, thisGeneration=generation;
    if(!draftSummary)return false;
    draftPanel?.setAttribute('aria-busy','true');
    catalogLive(draftSummary,'catalogDraftsLoadingStatus','Сохранённые черновики · загрузка…');
    try{
      var response=await api('drafts');
      if(token!==draftRequest||thisGeneration!==generation)return false;
      knownDrafts=response.items;
      // Keep selections only while both identity and saved version match.
      var present=new Map(knownDrafts.map(function(item){return [item.id,item.version];}));
      for(var [id,version] of selectedDrafts)
        if(present.get(id)!==version || !knownDrafts.some(item=>item.id===id&&draftCanPublish(item)))
          selectedDrafts.delete(id);
      catalogLive(draftSummary,'catalogDraftsCount','Сохранённые черновики каталога: {count}',{count:knownDrafts.length});
      renderDraftBoard();
      if(draftLoadFailed){
        draftLoadFailed=false;
        if(!listLoadFailed)report('Каталог загружен. Черновики приватны; массовая публикация доступна над каталогом.');
      }
      return true;
    }catch(error){
      if(token!==draftRequest||thisGeneration!==generation)return false;
      draftLoadFailed=true;
      // Otherwise the retry control is hidden inside a closed <details>.
      // Open the affected section so an error is immediately actionable.
      if(draftPanel)draftPanel.open=true;
      catalogLive(draftSummary,'catalogDraftsUnavailable','Не удалось загрузить черновики');
      draftBoard.replaceChildren(node('p',error.message,'catalog-draft-warning'),
        button('Повторить загрузку черновиков',refreshDrafts,'secondary'));
      report(error.message,true);
      return false;
    }finally{
      if(token===draftRequest&&thisGeneration===generation)
        draftPanel?.removeAttribute('aria-busy');
    }
  }
  function renderDraftBoard(){
    if(!draftBoard)return;
    draftBoard.replaceChildren();
    var help=node('p','Сохранённые черновики всех категорий. Отмечай нужные записи и публикуй одним выпуском. Ничего не изменится до подтверждения.','help-text');
    draftBoard.appendChild(help);
    if(!knownDrafts.length){
      draftBoard.appendChild(catalogStatic(node('p','Опубликованных не ожидают: сохранённых черновиков нет.','help-text'),'catalogNoSavedDrafts','Опубликованных не ожидают: сохранённых черновиков нет.'));
      return;
    }
    var needle=(draftSearchInput?.value||'').trim().toLocaleLowerCase(),
      wantedKind=draftKindInput?.value||'all';
    var visibleDrafts=knownDrafts.filter(function(item){
      return (wantedKind==='all'||item.kind===wantedKind)&&
        (!needle||[item.id,item.name,item.englishName,item.kind].some(function(value){
          return String(value||'').toLocaleLowerCase().includes(needle);
        }));
    });
    var actions=node('div',undefined,'catalog-draft-actions');
    var selectionStatus=node('output');selectionStatus.setAttribute('aria-live','polite');
    var all=button('Выбрать все',function(){
      visibleDrafts.filter(draftCanPublish).forEach(function(item){selectedDrafts.set(item.id,item.version);});renderDraftBoard();
    },'secondary');
    var none=button('Снять выделение',function(){selectedDrafts.clear();renderDraftBoard();},'secondary');
    var send=button('Опубликовать выбранные',function(){publishDraftBatch(false);});
    var sendAll=button('Опубликовать все черновики',function(){publishDraftBatch(true);},'secondary');
    var refresh=button('Обновить список',refreshDrafts,'secondary');
    function selectionCount(){return [...selectedDrafts].filter(function(pair){return knownDrafts.some(function(item){return item.id===pair[0]&&item.version===pair[1];});}).length;}
    var count=selectionCount();
    catalogLive(selectionStatus,'catalogDraftSelectionCount','Выбрано: {selected} из {total} · показано: {shown}',{selected:count,total:knownDrafts.length,shown:visibleDrafts.length});
    send.disabled=!count||count>50||batchPending;
    sendAll.disabled=knownDrafts.length>50||batchPending||knownDrafts.some(item=>!draftCanPublish(item));
    all.disabled=none.disabled=refresh.disabled=batchPending;
    if(knownDrafts.length>50)
      draftBoard.appendChild(node('p','За одну публикацию допускается не более 50 записей. Отметь до 50 нужных черновиков.','catalog-draft-warning'));
    actions.append(selectionStatus,all,none,send,sendAll,refresh);
    draftBoard.appendChild(actions);
    var entries=node('div',undefined,'catalog-draft-entries');
    visibleDrafts.forEach(function(item){
      var row=node('div',undefined,'catalog-draft-entry');
      var label=node('label',undefined,'catalog-draft-entry-label');
      var box=node('input');box.type='checkbox';box.checked=selectedDrafts.get(item.id)===item.version;box.disabled=batchPending||!draftCanPublish(item);
      box.addEventListener('change',function(){
        if(box.checked)selectedDrafts.set(item.id,item.version);
        else selectedDrafts.delete(item.id);
        var updated=selectionCount();
        catalogLive(selectionStatus,'catalogDraftSelectionCount','Выбрано: {selected} из {total} · показано: {shown}',{selected:updated,total:knownDrafts.length,shown:visibleDrafts.length});
        send.disabled=!updated||updated>50||batchPending;
      });
      var description=node('span',undefined,'catalog-draft-entry-info');
      description.append(node('strong',item.name||item.englishName||item.id),
        catalogLive(node('small'),'catalogDraftRevision','{id} · {kind} · черновик v{version}',{id:item.id,kind:item.kind,version:item.version}));
      description.appendChild(node('small',item.diff?.status==='unchanged'?draftUi('unchanged'):
        item.diff?.status==='new'?draftUi('newRecord'):
        item.diff?.status==='error'?draftUi('error'):
        draftUi('changes')+': '+item.diff?.count,
        item.diff?.status==='unchanged'?'catalog-draft-warning':'catalog-draft-diff-status'));
      label.append(box,description);
      var open=button('Открыть',async function(){
        if(batchPending||!canLeave())return;
        kind.value=item.kind;selectedKind=item.kind;
        newButton.disabled=item.kind!=='equipment'&&item.kind!=='soul';
        search.value=item.id;page=0;
        await loadList();
        await openItem(item.id);
      },'secondary');
      row.append(label,open);
      if(item.canDiscard){
        var discard=button(draftUi('discard'),async function(){
          if(batchPending||host.inert||!canLeave())return;
          if(!confirmCatalog('catalogConfirmDiscardDraft',
            'Удалить только сохранённый черновик «{name}»? Опубликованные данные и история не изменятся.',
            {name:item.name||item.id}))return;
          batchPending=true;host.inert=true;host.setAttribute('aria-busy','true');
          try{
            await api('discard-draft',{id:item.id,expectedDraftVersion:item.version,
              expectedCatalogRevision:catalogRevision});
            selectedDrafts.delete(item.id);
            if(current?.edit.id===item.id){
              current=await api('item?id='+encodeURIComponent(item.id));dirty=false;renderEditor();
            }
            await Promise.all([refreshDrafts(),loadList()]);
            report('Черновик удалён. Опубликованная запись не изменена.');
          }catch(error){report(error.message,true);await refreshDrafts();}
          finally{batchPending=false;host.inert=false;host.removeAttribute('aria-busy');renderDraftBoard();}
        },'secondary');
        discard.classList.add('catalog-discard-draft');
        row.appendChild(discard);
      }
      entries.append(row);
    });
    if(!visibleDrafts.length)entries.appendChild(node('p','Нет черновиков по заданному фильтру.','help-text'));
    draftBoard.appendChild(entries);
  }
  async function publishDraftBatch(all){
    if(batchPending)return;
    if(dirty){report('В текущей записи есть несохранённые изменения. Сохрани или отмени их перед массовой публикацией.',true);return;}
    var targets=knownDrafts.filter(function(item){return all || selectedDrafts.get(item.id)===item.version;});
    if(!targets.length||targets.length>50){report('Выбери от 1 до 50 черновиков.',true);return;}
    if(targets.some(item=>!draftCanPublish(item))){report('В выбранных черновиках есть записи без изменений или с ошибкой сравнения. Разбери их перед публикацией.',true);return;}
    if(!confirmCatalog('catalogConfirmPublishBatch','Опубликовать {count} сохранённых черновиков как ОДНУ версию каталога? Изменения названий, эффектов и характеристик появятся в Modern. Legacy и старые версии останутся неизменными.',{count:targets.length}))return;
    batchPending=true;host.inert=true;host.setAttribute('aria-busy','true');
    var thisGeneration=generation,keepId=current?.edit.id,operationId=crypto.randomUUID(),uncertain=false;
    try{
      var reply;
      try{
        reply=await api('publish-batch',{expectedCatalogRevision:catalogRevision,operationId,
          items:targets.map(function(item){return {id:item.id,expectedDraftVersion:item.version};})});
      }catch(error){
        // A lost HTTP response is not a rollback. The immutable revision note
        // has the operation ID from the same transaction as the catalog head.
        report('Ответ публикации не получен. Проверяю результат по коду операции…',true);
        try{
          var check=await api('publish-batch-status?operationId='+encodeURIComponent(operationId));
          if(check.found)reply=check.receipt;
          else{uncertain=true;throw Error('Нет подтверждённой квитанции операции. '+error.message);}
        }catch(statusError){uncertain=true;throw statusError;}
      }
      if(thisGeneration!==generation)return;
      selectedDrafts.clear();
      // The catalog may change after publication; never keep an old draft
      // version or form in the editor.
      catalogRevision=reply.catalogRevision;
      if(keepId){
        current=await api('item?id='+encodeURIComponent(keepId));
        if(thisGeneration!==generation)return;
        renderEditor();
      }
      await Promise.all([loadList(),refreshDrafts()]);
      if(thisGeneration===generation){
        window.dispatchEvent(new Event('pandora:catalog-published'));
        reportTranslated('catalogStatusBatchPublished','Опубликовано {count} черновиков одной версией #{revision}.',{count:reply.count,revision:reply.catalogRevision});
      }
    }catch(error){
      if(thisGeneration===generation){
        report(uncertain
          ? 'Результат публикации НЕ ПОДТВЕРЖДЁН. Код '+operationId+'. Нельзя утверждать, что изменения отменены. Перечитай очередь и ревизию перед повторной публикацией. '+error.message
          : 'Публикация не состоялась либо отклонена: '+error.message+' Перечитай ревизию и черновики.',
          true);
        await refreshDrafts();
        await loadList();
      }
    }finally{
      if(thisGeneration===generation){batchPending=false;host.inert=false;host.removeAttribute('aria-busy');renderDraftBoard();}
    }
  }

  function newItem() {
    if (kind.value !== 'equipment' && kind.value !== 'soul') { report('Для этого каталога пока поддерживаются только существующие слоты.'); return; }
    if (!canLeave()) return;
    editorRequest++;
    current = { draftVersion: 0, catalogRevision, hasDraft: false, edit: { id: '', kind: kind.value, category: kind.value === 'equipment' ? 0 : null,
      names: { en: '', ru: '', jp: '', tw: '' }, description: {}, notes: {}, acquisition: {}, modifiers: {}, level: 1, sockets: 0,
      races: Array(6).fill(1), classes: Array(28).fill(1), slots: Array(8).fill(1), baseAttack: kind.value === 'equipment' ? 0 : null,
      effectMode: 'replace', effects: [], disabled: false } }; dirty = false; renderEditor();
  }
  function duplicateSkill() {
    if (!current || !['active', 'passive'].includes(current.edit.kind) || !editor.reportValidity()) return;
    var source = current, edit = collect();
    edit.templateId = source.identity.templateId || source.identity.id; edit.id = '';
    delete edit.intrinsicEffectMode;
    delete edit.profiles;
    editorRequest++;
    current = { identity: { id: '', kind: edit.kind, category: edit.category, index: source.identity.index, templateId: edit.templateId },
      draftVersion: 0, catalogRevision: source.catalogRevision, hasDraft: false, published: false, edit: edit, nativeSkill: source.nativeSkill };
    // Preserve the current fields as a new unsaved entry, including any typing.
    // No request, source edit, allocation or publication occurs on duplication.
    dirty = true; renderEditor(); syncNewButton();
    editor.querySelector('[data-field="names"][data-language="en"]').focus();
    report('Исходный навык не изменён. Укажите название нового навыка, сохраните черновик, затем опубликуйте его отдельно.');
  }

  async function astirMaintenance() {
    if (!canLeave() || batchPending || host.inert) return;
    var sequence = ++editorRequest, thisGeneration = generation;
    current = null; dirty = false;
    editor.replaceChildren(node('p', 'Проверяем опубликованные примечания Astir…'));
    try {
      var data = await api('astir-notes');
      if (sequence !== editorRequest || thisGeneration !== generation) return;
      editor.replaceChildren(node('h3', 'Архивные примечания Astir'));
      editor.appendChild(node('p',
        'Очистка только действующего каталога Modern. Legacy и старые версии не изменяются. До подтверждения ничего не записывается в D1.',
        'help-text'));
      editor.appendChild(node('p', 'Текущая версия #' + data.catalogRevision +
        ' · архивных полей: ' + data.fields.length +
        ' · предметов: ' + data.affectedIds.length, 'help-text'));
      if (data.dirtyDraftIds.length) {
        editor.appendChild(node('p',
          'Очистка заблокирована: есть неопубликованные черновики ' + data.dirtyDraftIds.join(', ') +
          '. Сначала опубликуйте или разберите их.', 'catalog-draft-warning'));
      }
      if (data.warnings.length) {
        editor.appendChild(node('h4', 'Требуют ручной проверки'));
        data.warnings.forEach(function (field) {
          var box = node('details');
          box.appendChild(node('summary', field.id + ' · ' + field.locale + ' · неизвестный архивный текст'));
          var contents = node('p', field.before);
          contents.style.whiteSpace = 'pre-wrap'; contents.style.overflowWrap = 'anywhere';
          box.appendChild(contents); editor.appendChild(box);
        });
      }
      if (data.fields.length) {
        editor.appendChild(node('h4', 'Предпросмотр удаления: исходный текст → пустое поле'));
        data.fields.forEach(function (field) {
          var box = node('details');
          box.appendChild(node('summary', field.id + ' · ' + field.locale));
          var contents = node('p', field.before);
          contents.style.whiteSpace = 'pre-wrap'; contents.style.overflowWrap = 'anywhere';
          box.appendChild(contents);
          box.appendChild(node('p', 'После публикации: примечание пустое', 'help-text'));
          editor.appendChild(box);
        });
      } else {
        editor.appendChild(node('p', 'Совпадений с известными архивными примечаниями нет.', 'help-text'));
      }
      var actions = node('div', undefined, 'editor-actions');
      var refresh = button('Повторить проверку', astirMaintenance, 'secondary');
      var cleanup = button('Подтвердить очистку Modern', async function () {
        if (!data.ready || host.inert) return;
        if (!confirmCatalog('catalogConfirmAstirCleanup','Удалить {count} архивных примечаний Astir из текущей версии Modern? Будет создана новая ревизия с возможностью восстановления.',{count:data.fields.length})) return;
        host.inert = true; host.setAttribute('aria-busy', 'true');
        try {
          var result = await api('astir-notes/clean', {
            expectedCatalogRevision: data.catalogRevision,
            expectedFields: data.fields.map(function (field) { return field.id + ':' + field.locale; }).sort()
          });
          window.dispatchEvent(new Event('pandora:catalog-published'));
          reportTranslated('catalogStatusAstirCleaned','Очищено {count} архивных примечаний. Новая версия #{revision}. Бонусы заточки и старые билды не затронуты.',{count:result.cleanedCount,revision:result.catalogRevision});
          catalogRevision = result.catalogRevision;
          await loadList();
        } catch (error) { report(error.message, true); }
        finally { host.inert = false; host.removeAttribute('aria-busy'); }
        if (thisGeneration === generation && sequence === editorRequest) astirMaintenance();
      });
      cleanup.disabled = !data.ready;
      actions.append(cleanup, refresh); editor.appendChild(actions);
      editor.appendChild(node('h4', 'История очисток и восстановление'));
      editor.appendChild(node('p', 'Восстановление возвращает только удалённые примечания из предыдущей неизменяемой ревизии. Остальные данные каталога остаются текущими.', 'help-text'));
      if (!data.cleanupHistory.length) editor.appendChild(node('p', 'Истории очисток пока нет.', 'help-text'));
      for (var revision of data.cleanupHistory) {
        var row = node('div', undefined, 'revision-row');
        row.appendChild(node('span', '#' + revision.version + ' · ' + revision.note));
        let cleanupRevision = revision.version;
        row.appendChild(button('Восстановить примечания #' + cleanupRevision, async function () {
          if (!confirmCatalog('catalogConfirmRestoreAstir','Вернуть только архивные примечания из очистки #{revision}? Это создаст новую версию; опубликованные изменения характеристик не будут отменены.',{revision:cleanupRevision})) return;
          host.inert = true; host.setAttribute('aria-busy', 'true');
          try {
            var result = await api('astir-notes/restore', {
              cleanupRevision: cleanupRevision, expectedCatalogRevision: data.catalogRevision
            });
            window.dispatchEvent(new Event('pandora:catalog-published'));
            reportTranslated('catalogStatusAstirRestored','Примечания восстановлены как версия #{revision}.',{revision:result.catalogRevision});
            catalogRevision = result.catalogRevision;
            await loadList();
          } catch(error) { report(error.message, true); }
          finally { host.inert = false; host.removeAttribute('aria-busy'); }
          if (thisGeneration === generation && sequence === editorRequest) astirMaintenance();
        }, 'secondary'));
        editor.appendChild(row);
      }
    } catch(error) {
      if (thisGeneration === generation && sequence === editorRequest) {
        report(error.message, true);
        editor.replaceChildren(node('h3', 'Не удалось загрузить примечания Astir'),
          node('p', error.message, 'catalog-draft-warning'),
          button('Повторить проверку', astirMaintenance, 'secondary'));
      }
    }
  }

  async function revisions() {
    if (!canLeave()) return;
    var sequence = ++editorRequest, thisGeneration = generation;
    current = null; dirty = false; editor.replaceChildren(node('p', 'Загрузка истории…'));
    try {
      var result = await api('revisions'); if (thisGeneration !== generation || sequence !== editorRequest) return;
      editor.replaceChildren(); current = null; dirty = false;
      editor.appendChild(node('h3', 'История публикаций'));
      editor.appendChild(node('p', 'Откат создаёт новую версию. Старые версии и черновики сохраняются.'));
      [{ version: 0, note: 'Исходный Legacy-каталог', created_at: 0 }].concat(result.revisions).forEach(function (revision) {
        var row = node('div', undefined, 'revision-row'); row.appendChild(node('span', '#' + revision.version + ' · ' + revision.note));
        row.appendChild(button('Восстановить #' + revision.version, async function () {
          if (!confirmCatalog('catalogConfirmRollback','Восстановить весь опубликованный каталог из версии {version}? Черновики не удалятся.',{version:revision.version})) return;
          try { var restored = await api('rollback', { revision: revision.version, expectedCatalogRevision: result.catalogRevision }); await loadList(); await revisions(); reportTranslated('catalogStatusRollback','Восстановлено как новая версия {revision}.',{revision:restored.catalogRevision}); } catch (error) { report(error.message, true); }
        }, 'secondary')); editor.appendChild(row);
      });
    } catch (error) { if (thisGeneration === generation && sequence === editorRequest) report(error.message, true); }
  }
  async function start(csrf, onExpired) {
    getCsrf = csrf; expired = onExpired; var thisGeneration = ++generation;
    listLoadFailed=false;draftLoadFailed=false;
    // A second login must not briefly show the previous session's "loaded"
    // result while the new authenticated catalog request is still pending.
    reportTranslated('catalogLoading','Loading the catalog…');
    try { meta = await api('meta'); if (thisGeneration !== generation) return;
      host.replaceChildren(); var controls = node('div', undefined, 'catalog-controls');
      kind = node('select'); catalogAttribute(kind,'aria-label','catalogKindAria','Каталог'); [['equipment', 'Экипировка / оружие','catalogKindEquipment'], ['soul', 'Souls / души','catalogKindSoul'], ['class', 'Классы персонажей','catalogKindClass'], ['racial', 'Расовые пассивки','catalogKindRacial'], ['active', 'Активные навыки','catalogKindActive'], ['passive', 'Пассивные навыки','catalogKindPassive']].forEach(function (entry) { var option = catalogStatic(node('option'),entry[2],entry[1]); option.value = entry[0]; kind.appendChild(option); });
      search = node('input'); search.type = 'search'; catalogAttribute(search,'placeholder','catalogSearchPlaceholder','Поиск по названию или ID'); catalogAttribute(search,'aria-label','catalogSearchAria','Поиск в каталоге');
      search.addEventListener('input', function () {
        clearTimeout(searchTimer); pending++; listHost.replaceChildren(); listHost.setAttribute('aria-busy', 'true'); catalogLive(listStatus,'catalogListLoading','Поиск…');
        searchTimer = setTimeout(function () { if (thisGeneration === generation) { page = 0; loadList(); } }, 300);
      }); selectedKind = kind.value; kind.addEventListener('change', function () {
        if (!canLeave()) { kind.value = selectedKind; return; }
        selectedKind = kind.value; clearTimeout(searchTimer); editorRequest++; current = null; dirty = false;
        editor.replaceChildren(node('p', 'Выберите запись в списке. Здесь будут её текущие характеристики и поля для редактирования.'));
        syncNewButton(); page = 0; loadList();
      });
      newButton = button('Новая запись', function () {
        if (kind.value === 'active' || kind.value === 'passive') {
          if (!current?.edit?.id || current.edit.kind !== kind.value) {
            report('Сначала выбери существующий навык как шаблон.', true); return;
          }
          duplicateSkill(); return;
        }
        newItem();
      });
      syncNewButton();
      controls.append(kind, search, newButton, button('Очистка примечаний Astir', astirMaintenance, 'secondary'), button('История / откат', revisions, 'secondary')); host.appendChild(controls);
      draftPanel=node('details',undefined,'catalog-draft-board');
      draftSummary=node('summary','Сохранённые черновики каталога · загрузка…');
      draftBoard=node('div',undefined,'catalog-draft-board-content');
      var draftFilters=node('div',undefined,'catalog-draft-filters');
      draftSearchInput=node('input');draftSearchInput.type='search';
      catalogAttribute(draftSearchInput,'placeholder','catalogDraftSearchPlaceholder','Найти черновик по названию или ID…');
      catalogAttribute(draftSearchInput,'aria-label','catalogDraftSearchAria','Поиск сохранённых черновиков каталога');
      draftKindInput=node('select');catalogAttribute(draftKindInput,'aria-label','catalogDraftCategoryAria','Категория черновиков каталога');
      [['all','Все категории','catalogDraftFilterAll'],['equipment','Экипировка','catalogDraftFilterEquipment'],['soul','Души','catalogDraftFilterSoul'],['active','Активные','catalogDraftFilterActive'],['passive','Пассивные','catalogDraftFilterPassive'],['class','Классы','catalogDraftFilterClass'],['racial','Расовые пассивки','catalogDraftFilterRacial']]
        .forEach(function(option){var o=catalogStatic(node('option'),option[2],option[1]);o.value=option[0];draftKindInput.append(o);});
      draftSearchInput.addEventListener('input',renderDraftBoard);
      draftKindInput.addEventListener('change',renderDraftBoard);
      draftFilters.append(draftSearchInput,draftKindInput);
      draftPanel.append(draftSummary,draftFilters,draftBoard);host.appendChild(draftPanel);
      var grid = node('div', undefined, 'catalog-grid'); var sidebar = node('section', undefined, 'catalog-sidebar'); catalogAttribute(sidebar,'aria-label','catalogListAria','Список записей');
      listStatus = node('p', undefined, 'help-text'); listHost = node('div'); sidebar.append(listStatus, listHost);
      editor = node('form', undefined, 'catalog-editor');
      editor.addEventListener('submit', function (event) { event.preventDefault(); saveDraft(); });
      editor.addEventListener('input', updateLocaleCoverage);
      editor.addEventListener('keydown', function (event) {
        if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's') {
          event.preventDefault();
          if (current && !host.inert) saveDraft();
        }
      }); editor.appendChild(node('p', 'Выберите существующую запись слева или нажмите «Новая запись».'));
      grid.append(sidebar, editor); host.appendChild(grid); page = 0;
      const loaded=await Promise.all([loadList(),refreshDrafts()]);
      if(thisGeneration!==generation)return;
      if(loaded.every(value=>value===true))report('Каталог загружен. Черновики приватны; массовая публикация доступна над каталогом.');
      else if(loaded.some(value=>value===false))
        report('Загрузка частично не удалась. Используйте «Повторить загрузку» в соответствующем разделе.',true);
    } catch (error) {
      if(thisGeneration!==generation)return;
      report(error.message, true);
      if(!host.querySelector('.catalog-controls')){
        var failed=catalogLive(node('p',undefined,'catalog-draft-warning'),
          'catalogStatusStartFailed','Не удалось начать работу с каталогом: {error}',{error:error.message});
        host.replaceChildren(failed,
          button('Повторить загрузку каталога',function(){start(getCsrf,expired);},'secondary'));
      }
    }
  }
  async function openFromLocalization(id, targetKind){
    // Navigation is authorized by the already active admin session and uses
    // existing guarded GET endpoints. Cancel without changing any editor state
    // when the current catalog form contains unsaved changes.
    if(!getCsrf||!meta||host.inert||batchPending||
       !['equipment','soul','active','passive'].includes(targetKind)||
       typeof id!=='string'||!id||id.length>160)return false;
    if(!canLeave())return false;
    editorRequest++; current=null; dirty=false;
    clearTimeout(searchTimer);
    kind.value=targetKind;selectedKind=targetKind;
    search.value=id;page=0;syncNewButton();
    await loadList();
    await openItem(id);
    if(current?.identity?.id!==id)return false;
    editor.scrollIntoView({block:'start',behavior:'auto'});
    editor.querySelector('h3')?.setAttribute('tabindex','-1');
    editor.querySelector('h3')?.focus({preventScroll:true});
    return true;
  }
  window.addEventListener('beforeunload', function (event) { if (dirty) { event.preventDefault(); event.returnValue = ''; } });
  window.PandoraCatalogConsole = { start, openFromLocalization, clear: function () { generation++; pending++; editorRequest++; draftRequest++; clearTimeout(searchTimer); dirty = false; current = null; meta = null; listLoadFailed=false;draftLoadFailed=false;selectedDrafts.clear();knownDrafts=[];draftPanel=draftSummary=draftBoard=null; host.inert = false; host.removeAttribute('aria-busy'); host.replaceChildren(); } };
})();
