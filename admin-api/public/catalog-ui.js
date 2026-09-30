(function () {
  'use strict';
  var host = document.getElementById('catalog-console');
  var status = document.getElementById('catalog-state');
  var meta, getCsrf, expired, current, editor, listHost, listStatus, search, kind, newButton, page = 0;
  var generation = 0, pending = 0, editorRequest = 0, searchTimer, dirty = false, catalogRevision = 0;
  var languages = [['en', 'English'], ['ru', 'Русский'], ['jp', '日本語'], ['tw', '繁體中文']];
  function node(tag, text, className) { var result = document.createElement(tag); if (text !== undefined) result.textContent = text; if (className) result.className = className; return result; }
  function button(text, action, className) { var result = node('button', text, className); result.type = 'button'; result.addEventListener('click', action); return result; }
  function report(text, error) { status.textContent = text; status.classList.toggle('denied', Boolean(error)); }
  async function api(path, input) {
    var response = await fetch('/api/admin/' + path, { method: input ? 'POST' : 'GET', credentials: 'same-origin', cache: 'no-store',
      headers: input ? { 'Content-Type': 'application/json', 'X-CSRF-Token': getCsrf() || '' } : {}, body: input ? JSON.stringify(input) : undefined, signal: AbortSignal.timeout(15000) });
    var result = await response.json();
    if (response.status === 401) expired();
    if (!response.ok || result.ok !== true) throw new Error(result.message || 'Server request failed');
    return result;
  }
  function changing() { dirty = true; if (editor) editor.dataset.unsaved = 'true'; }
  function canLeave() { return !dirty || window.confirm('Есть несохранённые изменения. Перейти без сохранения?'); }
  function inputField(label, type, value, field, parent, min, max) {
    var wrap = node('label', label, 'editor-field'); var input = node('input'); input.type = type; input.value = value; input.dataset.field = field;
    if (min !== undefined) input.min = min; if (max !== undefined) input.max = max;
    input.addEventListener('input', changing); wrap.appendChild(input); parent.appendChild(wrap); return input;
  }
  function selectField(label, choices, value, field, parent) {
    var wrap = node('label', label, 'editor-field'); var select = node('select'); select.dataset.field = field;
    choices.forEach(function (choice) { var option = node('option', choice[1]); option.value = choice[0]; select.appendChild(option); });
    select.value = value; select.addEventListener('change', changing); wrap.appendChild(select); parent.appendChild(wrap); return select;
  }
  function multilingual(label, field, values, parent, multiline) {
    var section = node('fieldset', undefined, 'translation-fields'); section.appendChild(node('legend', label));
    languages.forEach(function (entry) {
      var wrap = node('label', entry[1], 'editor-field'); var input = node(multiline ? 'textarea' : 'input');
      if (!multiline) input.type = 'text'; else input.rows = 3;
      input.value = values[entry[0]] || ''; input.maxLength = multiline ? 4000 : 160;
      input.dataset.field = field; input.dataset.language = entry[0];
      if (field === 'names' && entry[0] === 'en') input.required = true;
      input.addEventListener('input', changing); wrap.appendChild(input); section.appendChild(wrap);
    }); parent.appendChild(section);
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
    var stat = node('select'); stat.setAttribute('aria-label', 'Характеристика');
    meta.effects.forEach(function (definition) { var option = node('option', definition.label); option.value = definition.id; stat.appendChild(option); });
    stat.value = effect.stat; var value = node('input'); value.type = 'number'; value.step = '.01'; value.min = '-10000'; value.max = '10000'; value.value = effect.value; value.required = true; value.setAttribute('aria-label', 'Значение');
    var unit = node('select'); unit.setAttribute('aria-label', 'Единица');
    function units() {
      var previous = unit.value || effect.unit; unit.replaceChildren();
      var definition = meta.effects.find(function (definition) { return definition.id === Number(stat.value); });
      definition.units.forEach(function (name) { var option = node('option', name === 'percent' ? '% от базы' : 'Число / процентные пункты'); option.value = name; unit.appendChild(option); });
      if (definition.units.indexOf(previous) !== -1) unit.value = previous;
    }
    units(); stat.addEventListener('change', function () { units(); changing(); }); value.addEventListener('input', changing); unit.addEventListener('change', changing);
    row.append(stat, value, unit, button('Убрать', function () { row.remove(); changing(); }, 'secondary'));
    parent.appendChild(row);
  }
  function formValue(field) { return editor.querySelector('[data-field="' + field + '"]').value; }
  function collect() {
    var edit = structuredClone(current.edit);
    ['names', 'description', 'notes', 'acquisition', 'modifiers'].forEach(function (field) {
      editor.querySelectorAll('[data-field="' + field + '"][data-language]').forEach(function (input) { edit[field][input.dataset.language] = input.value; });
    });
    if (edit.kind === 'class') {
      edit.progression = edit.progression.map(function (_, index) { return Number(formValue('progression' + index)); });
      return edit;
    }
    if (edit.kind === 'racial') {
      edit.effectMode = formValue('effectMode'); edit.effects = [];
      editor.querySelectorAll('.effect-row').forEach(function (row) { var inputs = row.querySelectorAll('select, input'); edit.effects.push({ stat: Number(inputs[0].value), value: Number(inputs[1].value), unit: inputs[2].value }); });
      return edit;
    }
    if (edit.kind === 'equipment') { edit.category = Number(formValue('category')); edit.level = Number(formValue('level')); edit.sockets = Number(formValue('sockets')); }
    edit.disabled = editor.querySelector('[data-field="disabled"]').checked;
    edit.baseAttack = editor.querySelector('[data-field="baseAttack"]') && formValue('baseAttack') !== '' ? Number(formValue('baseAttack')) : null;
    edit.effectMode = formValue('effectMode');
    edit.effects = [];
    editor.querySelectorAll('.effect-row').forEach(function (row) { var inputs = row.querySelectorAll('select, input'); edit.effects.push({ stat: Number(inputs[0].value), value: Number(inputs[1].value), unit: inputs[2].value }); });
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
      current = result; dirty = false; renderEditor(); report('Черновик сохранён. На сайте он ещё не опубликован.'); await loadList();
    } catch (error) { if (thisGeneration === generation) report(error.message + ' Несохранённые поля оставлены на месте.', true); }
    finally { busy.forEach(function (button) { button.disabled = false; }); if (thisGeneration === generation) { host.inert = false; host.removeAttribute('aria-busy'); } }
  }
  async function publish() {
    if (dirty || !current.hasDraft) { report('Сначала сохраните черновик.'); return; }
    if (!window.confirm('Опубликовать «' + current.edit.names.en + '»? Названия и характеристики изменятся в Modern. Legacy останется неизменным.')) return;
    var thisGeneration = generation, id = current.identity.id;
    host.inert = true; host.setAttribute('aria-busy', 'true');
    try {
      var result = await api('publish', { id: current.identity.id, expectedDraftVersion: current.draftVersion, expectedCatalogRevision: current.catalogRevision });
      if (thisGeneration !== generation) return;
      var refreshed = await api('item?id=' + encodeURIComponent(id)); if (thisGeneration !== generation) return;
      current = refreshed; renderEditor(); await loadList(); if (thisGeneration === generation) report('Опубликована версия каталога ' + result.catalogRevision + '.');
    } catch (error) { if (thisGeneration === generation) report(error.message, true); }
    finally { if (thisGeneration === generation) { host.inert = false; host.removeAttribute('aria-busy'); } }
  }
  function renderEditor() {
    editor.replaceChildren(); var edit = current.edit;
    editor.appendChild(node('h3', edit.id ? edit.names.en : 'Новая запись'));
    editor.appendChild(node('p', (edit.id || 'ID выдаст сервер') + ' · ' + (current.hasDraft ? 'ЧЕРНОВИК ' + current.draftVersion : current.published ? 'ОПУБЛИКОВАНО' : 'LEGACY SOURCE'), 'item-identity'));
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
      var racialActions = node('div', undefined, 'editor-actions'); racialActions.append(button('Сохранить черновик', saveDraft), button('Опубликовать', publish)); editor.appendChild(racialActions);
      editor.dataset.unsaved = dirty ? 'true' : 'false'; return;
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
      editor.appendChild(node('p', 'ID и родство класса сохраняются для совместимости с билдом. Лимиты веток и встроенные пассивки здесь пока не редактируются. Новый класс нельзя создать копированием названия — для него потребуется поддержка движка.', 'help-text'));
      var classActions = node('div', undefined, 'editor-actions'); classActions.append(button('Сохранить черновик', saveDraft), button('Опубликовать', publish)); editor.appendChild(classActions);
      editor.dataset.unsaved = dirty ? 'true' : 'false'; return;
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
    var rows = node('div', undefined, 'effect-rows'); effects.appendChild(rows);
    edit.effects.forEach(function (effect) { effectRow(effect, rows); });
    effects.appendChild(button('Добавить характеристику', function () { effectRow({ stat: 1, value: 0, unit: 'flat' }, rows); var mode = editor.querySelector('[data-field="effectMode"]'); if (mode.value === 'preserve') mode.value = 'patch'; changing(); }, 'secondary'));
    var sourceEffects = node('ul', undefined, 'source-effects');
    (current.sourceCode || '').split('_').filter(Boolean).forEach(function (token) {
      var pair = token.split('='); var definition = meta.effects.find(function (effect) { return effect.id === Number(pair[0]); });
      sourceEffects.appendChild(node('li', pair[0] === '18' && /^W/.test(pair[1]) ? 'Базовая атака оружия: ' + pair[1].slice(1) : (definition ? definition.label : 'Legacy effect ' + pair[0]) + ': ' + pair[1]));
    });
    effects.appendChild(node('p', 'Исходные расчётные бонусы (сохраняются в режиме «Изменить», кроме явно заменённых):', 'help-text'));
    effects.appendChild(sourceEffects); editor.appendChild(effects);
    if (edit.kind === 'equipment') { compatibility('Разрешённые расы', 'races', edit.races, meta.compatibilityLabels.race, editor); compatibility('Разрешённые классы', 'classes', edit.classes, meta.compatibilityLabels.job, editor); }
    else compatibility('Куда вставляется Soul', 'slots', edit.slots, ['Weapon', 'Shield', 'Head', 'Torso', 'Arms', 'Legs', 'Boots', 'Cloak'].map(function (label, index) { return { label, index }; }), editor);
    var actions = node('div', undefined, 'editor-actions');
    actions.append(button('Сохранить черновик', saveDraft), button('Опубликовать', publish), button('Создать вариант', function () { if (!canLeave()) return; var copy = structuredClone(current.edit); copy.id = ''; copy.effectMode = 'replace'; current = { edit: copy, draftVersion: 0, catalogRevision, hasDraft: false }; dirty = true; renderEditor(); report('Новый вариант получит отдельный ID. Перед сохранением явно задайте его числовые эффекты.'); }, 'secondary'));
    editor.appendChild(actions); editor.dataset.unsaved = dirty ? 'true' : 'false';
  }
  async function openItem(id) {
    if (!canLeave()) return;
    var sequence = ++editorRequest, thisGeneration = generation;
    current = null; dirty = false; editor.replaceChildren(node('p', 'Загрузка ' + id + '…'));
    try {
      var result = await api('item?id=' + encodeURIComponent(id)); if (thisGeneration !== generation || sequence !== editorRequest) return;
      current = result; renderEditor(); report('Выбрано: ' + current.edit.names.en + '. Изменения пока не опубликованы.');
    } catch (error) { if (thisGeneration === generation && sequence === editorRequest) report(error.message, true); }
  }
  async function loadList() {
    var sequence = ++pending, thisGeneration = generation;
    listHost.replaceChildren(); listHost.setAttribute('aria-busy', 'true'); listStatus.textContent = 'Поиск…';
    try {
      var result = await api('catalog?kind=' + kind.value + '&q=' + encodeURIComponent(search.value) + '&page=' + page);
      if (sequence !== pending || thisGeneration !== generation) return;
      catalogRevision = result.catalogRevision; listHost.replaceChildren(); listHost.removeAttribute('aria-busy');
      listStatus.textContent = 'Версия ' + catalogRevision + ' · ' + result.count + ' записей · страница ' + (page + 1);
      result.items.forEach(function (item) {
        var select = button(item.names.ru || item.names.en, function () { openItem(item.id); }, 'catalog-entry');
        select.appendChild(node('span', (item.draftVersion ? 'DRAFT · ' : '') + item.names.en + (kind.value === 'equipment' ? ' · Lv ' + item.level + ' · ○ ' + item.sockets : ''), 'catalog-entry-meta')); listHost.appendChild(select);
      });
      if (!result.items.length) listHost.appendChild(node('p', 'Ничего не найдено.'));
      var pagination = node('div', undefined, 'pagination'); var back = button('← Назад', function () { page--; loadList(); }, 'secondary'); back.disabled = page === 0;
      var next = button('Далее →', function () { page++; loadList(); }, 'secondary'); next.disabled = (page + 1) * result.pageSize >= result.count; pagination.append(back, next); listHost.appendChild(pagination);
    } catch (error) { if (thisGeneration === generation && sequence === pending) { listHost.removeAttribute('aria-busy'); listStatus.textContent = 'Список не загружен'; report(error.message, true); } }
  }
  function newItem() {
    if (kind.value === 'class' || kind.value === 'racial') { report('Для этого каталога пока поддерживаются только существующие слоты.'); return; }
    if (!canLeave()) return;
    editorRequest++;
    current = { draftVersion: 0, catalogRevision, hasDraft: false, edit: { id: '', kind: kind.value, category: kind.value === 'equipment' ? 0 : null,
      names: { en: '', ru: '', jp: '', tw: '' }, description: {}, notes: {}, acquisition: {}, modifiers: {}, level: 1, sockets: 0,
      races: Array(6).fill(1), classes: Array(28).fill(1), slots: Array(8).fill(1), baseAttack: kind.value === 'equipment' ? 0 : null,
      effectMode: 'replace', effects: [], disabled: false } }; dirty = false; renderEditor();
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
          if (!window.confirm('Восстановить весь опубликованный каталог из версии ' + revision.version + '? Черновики не удалятся.')) return;
          try { var restored = await api('rollback', { revision: revision.version, expectedCatalogRevision: result.catalogRevision }); await loadList(); await revisions(); report('Восстановлено как новая версия ' + restored.catalogRevision + '.'); } catch (error) { report(error.message, true); }
        }, 'secondary')); editor.appendChild(row);
      });
    } catch (error) { if (thisGeneration === generation && sequence === editorRequest) report(error.message, true); }
  }
  async function start(csrf, onExpired) {
    getCsrf = csrf; expired = onExpired; var thisGeneration = ++generation;
    try { meta = await api('meta'); if (thisGeneration !== generation) return;
      host.replaceChildren(); var controls = node('div', undefined, 'catalog-controls');
      kind = node('select'); kind.setAttribute('aria-label', 'Каталог'); [['equipment', 'Экипировка / оружие'], ['soul', 'Souls / души'], ['class', 'Классы персонажей'], ['racial', 'Расовые пассивки']].forEach(function (entry) { var option = node('option', entry[1]); option.value = entry[0]; kind.appendChild(option); });
      search = node('input'); search.type = 'search'; search.placeholder = 'Поиск по названию или ID'; search.setAttribute('aria-label', 'Поиск в каталоге');
      search.addEventListener('input', function () {
        clearTimeout(searchTimer); pending++; listHost.replaceChildren(); listHost.setAttribute('aria-busy', 'true'); listStatus.textContent = 'Поиск…';
        searchTimer = setTimeout(function () { if (thisGeneration === generation) { page = 0; loadList(); } }, 300);
      }); kind.addEventListener('change', function () { clearTimeout(searchTimer); newButton.disabled = kind.value === 'class' || kind.value === 'racial'; page = 0; loadList(); });
      newButton = button('Новая запись', newItem);
      controls.append(kind, search, newButton, button('История / откат', revisions, 'secondary')); host.appendChild(controls);
      var grid = node('div', undefined, 'catalog-grid'); var sidebar = node('section', undefined, 'catalog-sidebar'); sidebar.setAttribute('aria-label', 'Список записей');
      listStatus = node('p', undefined, 'help-text'); listHost = node('div'); sidebar.append(listStatus, listHost);
      editor = node('form', undefined, 'catalog-editor'); editor.addEventListener('submit', function (event) { event.preventDefault(); saveDraft(); }); editor.appendChild(node('p', 'Выберите существующую запись слева или нажмите «Новая запись».'));
      grid.append(sidebar, editor); host.appendChild(grid); page = 0; await loadList(); report('Каталог загружен. Черновики приватны; публикация выполняется отдельной кнопкой.');
    } catch (error) { report(error.message, true); }
  }
  window.addEventListener('beforeunload', function (event) { if (dirty) { event.preventDefault(); event.returnValue = ''; } });
  window.PandoraCatalogConsole = { start, clear: function () { generation++; pending++; editorRequest++; clearTimeout(searchTimer); dirty = false; current = null; meta = null; host.inert = false; host.removeAttribute('aria-busy'); host.replaceChildren(); } };
})();
