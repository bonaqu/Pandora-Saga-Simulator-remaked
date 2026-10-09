(function () {
  'use strict';
  var root = document.getElementById('result-label-editor');
  if (!root) return;
  var getCsrf, expired, generation = 0;
  function element(tag, text, className) {
    var node = document.createElement(tag);
    if (text != null) node.textContent = text;
    if (className) node.className = className;
    return node;
  }
  function report(message, error) {
    var status = root.querySelector('[data-result-label-status]');
    if (status) { status.textContent = message; status.dataset.error = error ? 'true' : 'false'; }
  }
  async function api(method, payload) {
    var response = await fetch('/api/admin/result-labels', {
      method: method, credentials: 'same-origin', cache: 'no-store',
      headers: method === 'POST' ? { 'Content-Type': 'application/json', 'X-CSRF-Token': getCsrf() || '' } : {},
      body: method === 'POST' ? JSON.stringify(payload) : undefined,
      signal: AbortSignal.timeout(10000)
    });
    if (response.status === 401 || response.status === 403) { expired(); throw new Error('Сессия завершилась. Войди снова.'); }
    var data = await response.json();
    if (!response.ok || data.ok !== true) throw new Error(data.message || 'Ошибка сохранения (' + response.status + ')');
    return data;
  }
  function clear() {
    generation++;
    root.replaceChildren();
  }
  async function load() {
    var token = ++generation;
    root.replaceChildren();
    var details = element('details');
    details.dataset.resultLabelsPanel = '';
    var summary = element('summary', 'Расчётные характеристики · RU / Excel / админка');
    var intro = element('p',
      '43 русских подписи. База берётся из translations.xlsx. ' +
      'Сохранённая здесь правка публикуется сразу и имеет приоритет над Excel. ' +
      'Изменение текста не влияет на характеристики билдов.', 'result-label-help');
    // Filter before editing: never conflate the Excel baseline with a D1
    // override. Controls are local-only and cannot mutate catalog revisions.
    var filters = element('div', null, 'result-label-filters');
    var search = element('input');
    search.type = 'search'; search.placeholder = 'Поиск по ID или тексту…';
    search.setAttribute('aria-label', 'Найти перевод характеристики');
    search.dataset.resultLabelSearch = '';
    var modifiedLabel = element('label');
    var modified = element('input'); modified.type = 'checkbox';
    modified.dataset.resultLabelOverriddenOnly = '';
    modifiedLabel.append(modified, document.createTextNode(' Только изменения админки'));
    var count = element('output'); count.dataset.resultLabelCount = '';
    filters.append(search, modifiedLabel, count);
    function filterRows() {
      var visible = 0;
      Array.from(body.children).forEach(function (row) {
        var query = search.value.trim().toLocaleLowerCase('ru');
        var matches = !query || row.textContent.toLocaleLowerCase('ru').includes(query) ||
          (row.querySelector('input')?.value || '').toLocaleLowerCase('ru').includes(query);
        var accepted = matches && (!modified.checked || row.dataset.resultLabelOverridden === 'true');
        row.hidden = !accepted;
        if (accepted) visible++;
      });
      count.textContent = 'Показано ' + visible + ' из ' + body.children.length;
    }
    search.addEventListener('input', filterRows);
    modified.addEventListener('change', filterRows);
    var status = element('p', 'Загружаю переводы…', 'result-label-status');
    status.dataset.resultLabelStatus = '';
    status.setAttribute('role', 'status');
    status.setAttribute('aria-live', 'polite');
    var table = element('table');
    table.className = 'result-label-table';
    table.appendChild(element('thead'));
    var headings = element('tr');
    ['ID', 'Excel (основной)', 'Перевод RU', 'Статус', 'Действия'].forEach(label => {
      var cell = element('th', label); headings.appendChild(cell);
    });
    table.tHead.appendChild(headings);
    var body = element('tbody'); table.appendChild(body);
    details.append(summary, intro, filters, status, table); root.appendChild(details);
    try {
      var response = await api('GET');
      if (token !== generation) return;
      response.items.forEach(function (item) {
        var row = element('tr');
        row.dataset.resultLabelId = item.id;
        var id = element('td', item.id);
        var baseline = element('td', item.baseline);
        var editor = element('td');
        var input = element('input');
        input.type = 'text'; input.maxLength = 100;
        input.value = item.value;
        input.setAttribute('aria-label', 'Перевод ' + item.id);
        editor.appendChild(input);
        var state = element('td');
        var saveCell = element('td');
        var save = element('button', 'Сохранить');
        var reset = element('button', 'Вернуть Excel');
        save.type = reset.type = 'button';
        reset.className = 'secondary';
        saveCell.append(save, reset);
        function syncState() {
          state.textContent = item.overridden ? 'Админка · версия ' + item.version : 'Excel';
          row.dataset.resultLabelOverridden = String(item.overridden);
          reset.disabled = !item.overridden;
        }
        syncState();
        async function commit(value) {
          var requestVersion = item.version;
          save.disabled = reset.disabled = true;
          try {
            var answer = await api('POST', { id: item.id, value: value, expectedVersion: requestVersion });
            if (token !== generation) return;
            Object.assign(item, answer);
            input.value = item.value; syncState(); filterRows();
            report(item.id + ' сохранён. На сайте новая подпись появится после обновления страницы.');
          } catch (error) {
            if (token !== generation) return;
            report(error.message + ' Список обновится, чтобы не перезаписывать правку.', true);
            await load();
            root.querySelector('details')?.setAttribute('open', '');
          } finally {
            if (token === generation) { save.disabled = false; syncState(); }
          }
        }
        save.addEventListener('click', function () { commit(input.value); });
        reset.addEventListener('click', function () { commit(item.baseline); });
        input.addEventListener('keydown', function (event) {
          if (event.key === 'Enter') { event.preventDefault(); commit(input.value); }
          if (event.key === 'Escape') { input.value = item.value; }
        });
        row.append(id, baseline, editor, state, saveCell);
        body.appendChild(row);
      });
      filterRows();
      report('Загружено ' + response.items.length + ' подписей. База Excel и опубликованные правки админки показаны отдельно.');
    } catch (error) {
      if (token === generation) report(error.message, true);
    }
  }
  window.PandoraResultLabelConsole = {
    start: function (csrfGetter, onExpired) { getCsrf = csrfGetter; expired = onExpired; return load(); },
    clear: clear
  };
})();
