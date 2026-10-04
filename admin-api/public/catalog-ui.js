(function () {
  'use strict';
  var host = document.getElementById('catalog-console');
  var status = document.getElementById('catalog-state');
  var meta, getCsrf, expired, current, editor, listHost, listStatus, search, kind, newButton, page = 0;
  var generation = 0, pending = 0, editorRequest = 0, searchTimer, dirty = false, catalogRevision = 0, selectedKind = 'equipment';
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
  function changing() {
    dirty = true; if (editor) {
      editor.dataset.unsaved = 'true';
      var preview = editor.querySelector('[data-preview-record]');
      if (preview) preview.replaceChildren(node('h4', 'После публикации'), node('p', 'Изменения ещё не проверены. Нажмите «Проверить изменения».', 'help-text'));
    }
  }
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
  function checkboxField(label, value, field, parent) {
    var wrap = node('label', undefined, 'flag-label'), input = node('input'); input.type = 'checkbox'; input.checked = value; input.dataset.field = field;
    input.addEventListener('change', changing); wrap.append(input, document.createTextNode(label)); parent.appendChild(wrap); return input;
  }
  function multilingual(label, field, values, parent, multiline) {
    var section = node('fieldset', undefined, 'translation-fields'); section.appendChild(node('legend', label));
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
    52: 'Получаемый физический урон', 60: 'Получаемый магический урон', 62: 'Точность', 65: 'Уклонение', 69: 'Шанс критического удара',
    70: 'Получаемый шанс крита (минус = защита)', 71: 'Критический урон', 72: 'Получаемый критический урон', 73: 'Скорость атаки', 74: 'Скорость движения', 76: 'Стоимость MP', 77: 'Скорость применения', 79: 'Перезарядка',
    146: 'Сопротивление аномалиям тела', 147: 'Сопротивление аномалиям разума', 149: 'Сопротивление оглушению', 150: 'Сопротивление заморозке', 151: 'Сопротивление падению'
  };
  function effectLabel(id) { var definition = meta.effects.find(function (entry) { return entry.id === Number(id); }); return effectNames[id] || definition?.label || 'Условный эффект Legacy #' + id; }
  function effectText(id, value, unit) {
    var definition = meta.effects.find(function (entry) { return entry.id === Number(id); });
    var number = Number(value), suffix = unit === 'percent' ? Number(id) === 52 ? '% получаемого урона' : '% от базы' : definition && (definition.label.includes('percentage points') || Number(id) >= 138) ? ' п.п.' : '';
    return effectLabel(id) + ': ' + (Number.isFinite(number) ? (number > 0 ? '+' : '') + number : value) + (suffix ? ' ' + suffix : '');
  }
  function recordView(record, target, title) {
    target.replaceChildren(node('h4', title));
    if (!record) { target.appendChild(node('p', 'Запись ещё не опубликована и на сайте не используется.', 'help-text')); return; }
    target.appendChild(node('p', record.names.ru || record.names.en, 'record-name'));
    var description = record.description.ru || record.description.en;
    if (description) target.appendChild(node('p', description, 'record-description'));
    var values = node('ul', undefined, 'record-values');
    if (record.kind === 'equipment') values.appendChild(node('li', 'Уровень: ' + record.level + ' · Слоты душ: ' + record.sockets));
    if (record.kind === 'soul' && !record.compatibility.includes(1)) values.appendChild(node('li', 'Нет допустимого слота для вставки. Эта душа не предлагается для экипировки, пока не заданы ограничения.'));
    if (record.calculationCode !== undefined) {
      record.calculationCode.split('_').filter(Boolean).forEach(function (token) {
        var pair = token.split('='), value = pair.slice(1).join('=');
        if (!/^\d+=(?:[+-]?\d+(?:\.\d+)?%?|W\d+)$/.test(token)) {
          values.appendChild(node('li', 'Исходный маркер: ' + token + '. Числовой эффект не подтверждён.'));
          return;
        }
        values.appendChild(node('li', pair[0] === '18' && /^W\d+$/.test(value) ? 'Базовая атака оружия: ' + value.slice(1) : effectText(pair[0], value.endsWith('%') ? value.slice(0, -1) : value, value.endsWith('%') ? 'percent' : 'flat')));
      });
      if (!record.calculationCode) values.appendChild(node('li', 'Числовых бонусов в расчётной строке нет.'));
    }
    if (record.kind === 'active') ['Стоимость MP', 'Время применения, с', 'Перезарядка, с', 'Длительность, с'].forEach(function (label, index) { values.appendChild(node('li', label + ': ' + record.timing[index])); });
    if (record.kind === 'active' || record.kind === 'passive') {
      var learning = record.learningRequirements;
      if (learning) {
        values.appendChild(node('li', 'Минимальный уровень: ' + learning.minimumLevel));
        var classes = learning.classIds.map(function (id) { return meta.compatibilityLabels.job.find(function (row) { return 'job.' + row.index === id; })?.label || id; });
        values.appendChild(node('li', 'Классы: ' + (classes.length ? classes.join(', ') + (learning.classScope === 'descendants' ? ' и их последующие профессии' : ' — только отмеченные') : 'любой')));
        learning.branches.forEach(function (gate) { values.appendChild(node('li', 'Ветка: ' + (meta.skillCategories.find(function (row) { return row.id === gate.branchId; })?.name.en || gate.branchId) + ' ≥ ' + gate.minimumPoints)); });
        if (!learning.branches.length) values.appendChild(node('li', 'Требований к очкам веток нет.'));
      } else values.appendChild(node('li', 'Исходные условия изучения: ' + (current.nativeSkill?.prerequisites.en || record.prerequisiteCode)));
    }
    if (record.kind === 'class') ['Базовое LP', 'Базовое MP', 'Делитель роста LP от уровня', 'Делитель роста MP от уровня', 'Делитель роста LP от STA', 'Делитель роста MP от SPR'].forEach(function (label, index) { values.appendChild(node('li', label + ': ' + record.progression[index])); });
    if (record.kind === 'racial') {
      values.appendChild(node('li', record.effectMode === 'replace' ? 'Исходная механика отключена. Действуют только числа ниже.' : 'Исходная механика: ' + current.nativeMechanics));
      var required = record.bonusRequirements;
      if (required) {
        var names = required.weaponCategories.map(function (id) { return id === -1 ? 'без оружия' : meta.categories.find(function (entry) { return entry.legacy_id === id; })?.name.en || '#' + id; });
        values.appendChild(node('li', 'Условие оружия: ' + (names.length ? names.join(', ') : 'любое')));
        if (required.shieldRequired) values.appendChild(node('li', 'Требуется щит.'));
        if (required.ridingRequired) values.appendChild(node('li', 'Требуется верховая езда.'));
      }
      if (record.calculationNotes?.ru || record.calculationNotes?.en) target.appendChild(node('p', 'Ограничение расчёта: ' + (record.calculationNotes.ru || record.calculationNotes.en), 'help-text'));
    }
    if (record.kind === 'passive') values.appendChild(node('li', record.templateId ? 'Новый навык: встроенный эффект шаблона не копируется.' : 'Исходная механика сохраняется. Описание — справка; эффект зависит от изучения, класса и снаряжения.'));
    (record.effects || []).forEach(function (effect) { values.appendChild(node('li', effectText(effect.stat, effect.value, effect.unit))); });
    if ((record.kind === 'racial' || record.kind === 'passive') && !record.effects.length) values.appendChild(node('li', record.effectMode === 'replace' ? 'Рассчитываемых числовых бонусов нет. Справочные эффекты см. в описании и ограничениях.' : 'Дополнительных числовых бонусов нет. Это не означает отсутствие исходного эффекта.'));
    target.appendChild(values);
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
      report('Изменения проверены. Чтобы применить: сохраните черновик → опубликуйте.');
    } catch (error) { if (thisGeneration === generation && current === selection) report(error.message + ' Ваши поля не удалены.', true); }
    finally { if (thisGeneration === generation) { host.inert = false; host.removeAttribute('aria-busy'); } }
  }
  function review() {
    var workflow = node('p', '1. Измените поля → 2. Проверьте изменения → 3. Сохраните черновик → 4. Опубликуйте. Черновик виден только вам; публикация меняет Modern, но не музей Legacy и не старые версии билдов.', 'editor-workflow');
    workflow.dataset.editorWorkflow = ''; editor.appendChild(workflow);
    var panels = node('div', undefined, 'record-review');
    var live = node('section', undefined, 'record-panel'), preview = node('section', undefined, 'record-panel');
    live.dataset.currentRecord = ''; preview.dataset.previewRecord = ''; preview.setAttribute('aria-live', 'polite');
    recordView(current.currentRecord, live, 'Сейчас на сайте · версия ' + current.catalogRevision);
    preview.append(node('h4', 'После публикации'), node('p', 'Изменения ещё не проверены. Нажмите «Проверить изменения».', 'help-text'));
    panels.append(live, preview); editor.append(panels, button('Проверить изменения', checkChanges, 'secondary'));
    editor.appendChild(node('h4', 'Редактируемые поля'));
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
    meta.effects.forEach(function (definition) { var option = node('option', effectLabel(definition.id)); option.value = definition.id; stat.appendChild(option); });
    stat.value = effect.stat; var value = node('input'); value.type = 'number'; value.step = '.01'; value.min = '-10000'; value.max = '10000'; value.value = effect.value; value.required = true; value.setAttribute('aria-label', 'Значение');
    var unit = node('select'); unit.setAttribute('aria-label', 'Единица');
    function units() {
      var previous = unit.value || effect.unit; unit.replaceChildren();
      var definition = meta.effects.find(function (definition) { return definition.id === Number(stat.value); });
      definition.units.forEach(function (name) { var option = node('option', name === 'percent' ? definition.id === 52 ? '% получаемого урона' : '% от базы' : definition.label.includes('percentage points') || definition.id >= 138 ? 'Процентные пункты (2 = +2%)' : 'Число (5 = +5)'); option.value = name; unit.appendChild(option); });
      if (definition.units.indexOf(previous) !== -1) unit.value = previous;
    }
    units(); stat.addEventListener('change', function () { units(); changing(); }); value.addEventListener('input', changing); unit.addEventListener('change', changing);
    row.append(stat, value, unit, button('Убрать', function () { row.remove(); changing(); }, 'secondary'));
    parent.appendChild(row);
  }
  function formValue(field) { return editor.querySelector('[data-field="' + field + '"]').value; }
  function learningBranchRow(gate, parent) {
    var row = node('div', undefined, 'basic-fields'); row.dataset.learningBranchRow = '';
    var branch = selectField('Ветка умений', meta.skillCategories.map(function (entry) { return [entry.id, entry.name.en]; }), gate.branchId, 'learningBranch', row);
    branch.dataset.learningBranch = '';
    var points = inputField('Нужно очков · 1–200', 'number', gate.minimumPoints, 'learningPoints', row, 1, 200);
    points.dataset.learningPoints = ''; points.step = '1'; points.required = true;
    row.appendChild(button('Убрать требование', function () { row.remove(); changing(); }, 'secondary'));
    parent.appendChild(row);
  }
  function learningEditor(edit) {
    var fieldset = node('fieldset', undefined, 'numeric-effects'); fieldset.appendChild(node('legend', 'Условия изучения навыка'));
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
    custom.appendChild(node('p', 'Все указанные ниже ветки нужны одновременно. Числа — очки ветки, включая бонусы снаряжения. Доступные очки определяют наличие навыка в списке; вложенные — изучен ли он.', 'help-text'));
    var branches = node('div'); branches.dataset.learningBranches = ''; custom.appendChild(branches);
    required.branches.forEach(function (gate) { learningBranchRow(gate, branches); });
    custom.appendChild(button('Добавить требование ветки', function () { learningBranchRow({ branchId: 'skill_category.1', minimumPoints: 1 }, branches); changing(); }, 'secondary'));
    custom.appendChild(node('p', 'Эти поля управляют изучением и дополнительными бонусами. Они не переписывают встроенные формулы, боевые эффекты или тип исходного навыка.', 'help-text'));
    fieldset.appendChild(custom);
    function visibility() { custom.hidden = mode.value !== 'custom'; custom.disabled = custom.hidden; native.hidden = !custom.hidden; }
    mode.addEventListener('change', visibility); visibility(); editor.appendChild(fieldset);
  }
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
      edit.bonusRequirements = { weaponCategories: [], shieldRequired: editor.querySelector('[data-field="shieldRequired"]').checked, ridingRequired: editor.querySelector('[data-field="ridingRequired"]').checked };
      editor.querySelectorAll('[data-weapon-category]').forEach(function (input) { if (input.checked) edit.bonusRequirements.weaponCategories.push(Number(input.dataset.weaponCategory)); });
      edit.calculationNotes = {};
      editor.querySelectorAll('[data-field="calculationNotes"]').forEach(function (input) { edit.calculationNotes[input.dataset.language] = input.value; });
      return edit;
    }
    if (edit.kind === 'active' || edit.kind === 'passive') {
      if (formValue('learningMode') === 'custom') {
        edit.learningRequirements = { classIds: [], classScope: formValue('learningClassScope'), minimumLevel: Number(formValue('learningLevel')), branches: [] };
        editor.querySelectorAll('[data-learning-class]').forEach(function (input) { if (input.checked) edit.learningRequirements.classIds.push(input.dataset.learningClass); });
        editor.querySelectorAll('[data-learning-branch-row]').forEach(function (row) { edit.learningRequirements.branches.push({ branchId: row.querySelector('[data-learning-branch]').value, minimumPoints: Number(row.querySelector('[data-learning-points]').value) }); });
      } else delete edit.learningRequirements;
      if (edit.kind === 'active') ['mpCost', 'castSeconds', 'cooldownSeconds', 'durationSeconds'].forEach(function (field) { edit[field] = Number(formValue(field)); });
      else {
        edit.effects = []; editor.querySelectorAll('.effect-row').forEach(function (row) { var inputs = row.querySelectorAll('select, input'); edit.effects.push({ stat: Number(inputs[0].value), value: Number(inputs[1].value), unit: inputs[2].value }); });
        edit.bonusRequirements.weaponCategories = []; editor.querySelectorAll('[data-weapon-category]').forEach(function (input) { if (input.checked) edit.bonusRequirements.weaponCategories.push(Number(input.dataset.weaponCategory)); });
        ['shieldRequired', 'ridingRequired'].forEach(function (field) { edit.bonusRequirements[field] = editor.querySelector('[data-field="' + field + '"]').checked; });
      }
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
    editor.appendChild(node('p', (edit.id || 'ID выдаст сервер') + ' · ' + (current.hasDraft ? 'ЧЕРНОВИК ' + current.draftVersion : current.published ? 'ОПУБЛИКОВАНО' : edit.id ? 'LEGACY SOURCE' : 'НОВАЯ НЕСОХРАНЁННАЯ ЗАПИСЬ'), 'item-identity'));
    review();
    if (edit.kind === 'active' || edit.kind === 'passive') {
      multilingual('Название навыка · English обязателен', 'names', edit.names, editor, false);
      multilingual('Описание — текст, не формула', 'description', edit.description, editor, true);
      editor.appendChild(node('p', 'Исходное изучение: ' + current.nativeSkill.prerequisites.en + ' · снаряжение: ' + current.nativeSkill.equipmentRequirements.en, 'help-text'));
      if (edit.templateId) {
        var template = node('p', 'Шаблон изучения: ' + (current.nativeSkill.templateName?.en || '') + ' · ' + edit.templateId, 'help-text');
        template.dataset.skillTemplate = ''; editor.appendChild(template);
        editor.appendChild(node('p', 'Это отдельный новый навык. Тип сохраняется; условия по умолчанию — от шаблона, либо задаются отдельно ниже. Встроенный эффект шаблона не копируется. Для пассивки действуют только явно указанные дополнительные числа.', 'help-text'));
      } else editor.appendChild(node('p', 'Тип и встроенные формулы исходного навыка сохраняются. Условия изучения можно задать отдельно; это не заменяет его встроенный эффект.', 'help-text'));
      learningEditor(edit);
      if (edit.kind === 'active') {
        var timings = node('fieldset', undefined, 'numeric-effects'); timings.appendChild(node('legend', 'Данные активного навыка'));
        var values = node('div', undefined, 'basic-fields');
        [['mpCost', 'Стоимость MP'], ['castSeconds', 'Время применения, секунд'], ['cooldownSeconds', 'Перезарядка, секунд'], ['durationSeconds', 'Длительность, секунд']].forEach(function (field, index) {
          var input = inputField(field[1], 'number', edit[field[0]], field[0], values, 0, index === 0 ? 100000 : 86400); input.step = index === 0 ? '1' : '.001'; input.required = true;
        }); timings.appendChild(values); timings.appendChild(node('p', 'Эти значения отображаются в изученном навыке. Они не создают новую формулу урона или новую боевую симуляцию. Встроенные эффекты и переключатели баффов Legacy сохраняются.', 'help-text')); editor.appendChild(timings);
      } else {
        var bonuses = node('fieldset', undefined, 'numeric-effects'); bonuses.appendChild(node('legend', 'Дополнительные бонусы изученной пассивки'));
        bonuses.appendChild(node('p', edit.templateId
          ? 'У нового навыка действуют только числа ниже: встроенный эффект шаблона не копируется. Изучение определяют условия выше, даже если список умений скрыт. Затем проверяются условия снаряжения и езды.'
          : 'Бонус добавляется к исходной механике, не заменяет её. Изучение проверяет штатный движок, даже если список умений скрыт. Числа применяются только с указанным ниже снаряжением.', 'help-text'));
        var bonusRows = node('div', undefined, 'effect-rows'); bonuses.appendChild(bonusRows); edit.effects.forEach(function (effect) { effectRow(effect, bonusRows); });
        bonuses.appendChild(button('Добавить характеристику', function () { effectRow({ stat: 1, value: 0, unit: 'flat' }, bonusRows); changing(); }, 'secondary')); editor.appendChild(bonuses);
        var requirements = node('fieldset', undefined, 'compatibility-fields'); requirements.appendChild(node('legend', 'Оружие для дополнительного бонуса · пусто = любое'));
        [[-1, 'Без оружия']].concat(meta.categories.filter(function (entry) { return entry.legacy_id <= 13; }).map(function (entry) { return [entry.legacy_id, entry.name.en]; })).forEach(function (entry) {
          var input = checkboxField(entry[1], edit.bonusRequirements.weaponCategories.indexOf(entry[0]) !== -1, 'bonusWeapon', requirements); input.dataset.weaponCategory = entry[0];
        }); editor.appendChild(requirements);
        checkboxField('Дополнительный бонус требует надетый щит', edit.bonusRequirements.shieldRequired, 'shieldRequired', editor);
        checkboxField('Дополнительный бонус требует включённую верховую езду', edit.bonusRequirements.ridingRequired, 'ridingRequired', editor);
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
      editor.appendChild(node('p', 'ID и родство класса сохраняются для совместимости с билдом. Лимиты веток и встроенные пассивки здесь пока не редактируются. Новый класс нельзя создать копированием названия — для него потребуется поддержка движка.', 'help-text'));
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
    editor.appendChild(effects);
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
      current = result; renderEditor();
      listHost.querySelectorAll('.catalog-entry').forEach(function (entry) { if (entry.dataset.recordId === id) entry.setAttribute('aria-current', 'true'); else entry.removeAttribute('aria-current'); });
      report('Выбрано: ' + current.edit.names.en + '. Изменения пока не опубликованы.');
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
        select.dataset.recordId = item.id;
        if (current?.edit.id === item.id) select.setAttribute('aria-current', 'true');
        var race = kind.value === 'racial' && meta.compatibilityLabels.race.find(function (entry) { return entry.index === item.category; });
        select.appendChild(node('span', (item.draftVersion ? 'Черновик · ' : '') + item.names.en + (race ? ' · ' + race.label : '') + (kind.value === 'equipment' ? ' · Lv ' + item.level + ' · ○ ' + item.sockets : ''), 'catalog-entry-meta')); listHost.appendChild(select);
      });
      if (!result.items.length) listHost.appendChild(node('p', 'Ничего не найдено.'));
      var pagination = node('div', undefined, 'pagination'); var back = button('← Назад', function () { page--; loadList(); }, 'secondary'); back.disabled = page === 0;
      var next = button('Далее →', function () { page++; loadList(); }, 'secondary'); next.disabled = (page + 1) * result.pageSize >= result.count; pagination.append(back, next); listHost.appendChild(pagination);
    } catch (error) { if (thisGeneration === generation && sequence === pending) { listHost.removeAttribute('aria-busy'); listStatus.textContent = 'Список не загружен'; report(error.message, true); } }
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
    editorRequest++;
    current = { identity: { id: '', kind: edit.kind, category: edit.category, index: source.identity.index, templateId: edit.templateId },
      draftVersion: 0, catalogRevision: source.catalogRevision, hasDraft: false, published: false, edit: edit, nativeSkill: source.nativeSkill };
    // Preserve the current fields as a new unsaved entry, including any typing.
    // No request, source edit, allocation or publication occurs on duplication.
    dirty = true; renderEditor();
    editor.querySelector('[data-field="names"][data-language="en"]').focus();
    report('Исходный навык не изменён. Укажите название нового навыка, сохраните черновик, затем опубликуйте его отдельно.');
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
      kind = node('select'); kind.setAttribute('aria-label', 'Каталог'); [['equipment', 'Экипировка / оружие'], ['soul', 'Souls / души'], ['class', 'Классы персонажей'], ['racial', 'Расовые пассивки'], ['active', 'Активные навыки'], ['passive', 'Пассивные навыки']].forEach(function (entry) { var option = node('option', entry[1]); option.value = entry[0]; kind.appendChild(option); });
      search = node('input'); search.type = 'search'; search.placeholder = 'Поиск по названию или ID'; search.setAttribute('aria-label', 'Поиск в каталоге');
      search.addEventListener('input', function () {
        clearTimeout(searchTimer); pending++; listHost.replaceChildren(); listHost.setAttribute('aria-busy', 'true'); listStatus.textContent = 'Поиск…';
        searchTimer = setTimeout(function () { if (thisGeneration === generation) { page = 0; loadList(); } }, 300);
      }); selectedKind = kind.value; kind.addEventListener('change', function () {
        if (!canLeave()) { kind.value = selectedKind; return; }
        selectedKind = kind.value; clearTimeout(searchTimer); editorRequest++; current = null; dirty = false;
        editor.replaceChildren(node('p', 'Выберите запись в списке. Здесь будут её текущие характеристики и поля для редактирования.'));
        newButton.disabled = kind.value !== 'equipment' && kind.value !== 'soul'; page = 0; loadList();
      });
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
