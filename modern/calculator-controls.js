(function () {
  'use strict';

  var namespace = window.PandoraRemaked = window.PandoraRemaked || {};
  var observer, timer;
  function byId(id) { return document.getElementById(id); }
  function mark(node, name) { if (node) node.setAttribute('data-remaked-calculator-' + name, ''); return node; }

  function codeStatus(key, state, fallback) {
    var status = byId('remaked-code-status');
    if (namespace.i18n) namespace.i18n.bindText(status, key);
    else status.textContent = fallback;
    status.dataset.state = state;
  }

  function clearCodeStatus() {
    var status = byId('remaked-code-status');
    delete status.dataset.remakedI18n;
    delete status.dataset.state;
    status.textContent = '';
  }

  function codeActions(code) {
    if (byId('remaked-code-status')) return;
    var label = code.closest('li').previousElementSibling;
    label.id = 'remaked-code-label';
    code.setAttribute('aria-labelledby', label.id);
    code.setAttribute('aria-describedby', 'remaked-code-status');
    code.spellcheck = false; code.autocomplete = 'off';
    var actions = code.closest('li').parentElement.nextElementSibling;
    var list = mark(actions.querySelector('ul'), 'code-buttons');
    var status = document.createElement('li');
    status.id = 'remaked-code-status'; status.dataset.remakedCodeStatus = '';
    status.setAttribute('role', 'status'); actions.appendChild(status);
    var sources = [
      ['create', 'li[onclick*="Base64.toBase64"]'],
      ['load', 'li[onclick="File(\'CodeLoad\');"]'],
      ['delete', 'li[onclick="$(\'InCode\').value=\'\';"]']
    ];
    sources.forEach(function (entry) {
      var source = list.querySelector(entry[1]), text = source.firstElementChild;
      text.id = 'remaked-code-' + entry[0] + '-label'; text.hidden = true;
      mark(source, 'code-source');
      if (entry[0] === 'load') {
        // Replace only this Modern DOM handler, not File(), Expand() or any
        // museum source. Keep its attribute as the translation-map anchor.
        source.onclick = async function () {
          if (!namespace.builds || !namespace.builds.importPayload) {
            codeStatus('builds.autosaveUnavailable', 'warning', 'Autosave unavailable'); return;
          }
          var result = await namespace.builds.importPreparedPayload(code.value);
          if (!result.ok) {
            code.setAttribute('aria-invalid', 'true');
            codeStatus('builds.invalidCode', 'error', 'Invalid build code; current build was not changed.');
            code.focus(); return;
          }
          code.removeAttribute('aria-invalid');
          codeStatus(result.autosaved ? 'builds.imported' : 'builds.importedNoAutosave', result.autosaved ? 'success' : 'warning', 'Build code imported.');
        };
      }
      var button = document.createElement('button');
      button.type = 'button'; button.className = 'remaked-calculator-action';
      button.dataset.remakedCodeAction = entry[0];
      button.addEventListener('click', async function (event) {
        event.stopPropagation();
        try {
          // Invoke the retained DOM callback directly so a codec failure is
          // catchable here; click() reports listener errors to the global page
          // instead of throwing to its caller. No callback/formula is copied.
          await source.onclick.call(source, event);
          if (entry[0] === 'create' && namespace.catalog) {
            var payload = namespace.adapter.serialize();
            if (payload.indexOf('PS3:') === 0) code.value = payload;
          }
          if (entry[0] !== 'load') {
            code.removeAttribute('aria-invalid');
            if (entry[0] === 'create') codeStatus('builds.exported', 'success', 'Current build code exported.');
            else clearCodeStatus();
          }
        } catch (error) {
          codeStatus('builds.exportFailed', 'error', 'Current build could not be exported.');
        }
        refresh();
      });
      source.appendChild(button);
    });
    code.addEventListener('input', function () { code.removeAttribute('aria-invalid'); clearCodeStatus(); });
    code.addEventListener('keydown', function (event) {
      if (event.key === 'Enter') { event.preventDefault(); list.querySelector('[data-remaked-code-action="load"]').click(); }
    });
  }

  function stepButtons(inputs, label, target, prefix) {
    Array.prototype.forEach.call(inputs, function (source) {
      if (source.dataset.remakedStepSource) return;
      var stem = source.src.match(/\/(up|down)[123]\.png$/)[0].slice(1, -4);
      source.id = 'remaked-' + prefix + '-' + stem;
      source.dataset.remakedStepSource = label.id;
      var button = document.createElement('button');
      button.type = 'button'; button.className = 'remaked-calculator-step';
      button.dataset.remakedStep = source.id;
      button.addEventListener('click', function (event) {
        event.stopPropagation();
        // Delegate to the retained callback: budgets, limits and recalculation
        // stay in the engine, including min/max. Never evaluate copied code.
        source.click(); refresh();
      });
      target.appendChild(button);
      source.hidden = true;
    });
  }

  function pairRows(root, labelSelector) {
    root.querySelectorAll(labelSelector).forEach(function (label) {
      if (label.closest('[data-remaked-calculator-pair]')) return;
      var value = label.nextElementSibling;
      if (!value || !value.classList.contains('input_gt')) return;
      var pair = mark(document.createElement('li'), 'pair');
      var list = document.createElement('ul'); pair.appendChild(list);
      label.before(pair); list.appendChild(label); list.appendChild(value);
    });
  }

  function decorate() {
    var skills = byId('SkillSet'), status = byId('Status');
    if (!skills || !status) return;
    var main = mark(skills.closest('.main'), 'main');
    mark(main.parentElement, 'main-row');
    var columns = mark(skills.parentElement, 'columns');
    var character = mark(columns.firstElementChild, 'character');
    mark(columns.lastElementChild, 'effects');
    mark(main.querySelector(':scope > ul > li[style="position:absolute;"]'), 'overlays');
    mark(character.firstElementChild, 'identity');
    pairRows(character.firstElementChild, '[id^="Text_"]');

    if (!status.hasAttribute('data-remaked-calculator-attributes')) {
      mark(status, 'attributes');
      var originalRows = Array.prototype.slice.call(status.children);
      for (var index = 0; index < 6; index++) {
        var card = mark(document.createElement('div'), 'attribute');
        var start = index * 4;
        for (var part = 0; part < 4; part++) card.appendChild(originalRows[start + part]);
        var label = card.querySelector('[id^="Text_"]');
        var actions = mark(document.createElement('div'), 'steps');
        card.appendChild(actions);
        var code = card.querySelector('[id^="Status"][id$="_0"]').id.slice(6, -2);
        stepButtons(card.querySelectorAll('input[type="image"]'), label, actions, 'attribute-' + code);
        card.querySelector('input[type="image"]').closest('li').parentElement.parentElement.hidden = true;
        status.appendChild(card);
      }
      var attributeColumn = mark(status.parentElement.parentElement, 'attribute-column');
      mark(attributeColumn.parentElement, 'attribute-results');
    }

    var level = byId('StatusLev');
    var levelRow = level.parentElement.parentElement.parentElement;
    if (!levelRow.hasAttribute('data-remaked-calculator-level')) {
      mark(levelRow, 'level');
      var levelLabel = levelRow.firstElementChild;
      levelLabel.id = 'remaked-level-label';
      var actions = mark(document.createElement('li'), 'steps');
      levelRow.appendChild(actions);
      stepButtons(levelRow.querySelectorAll('input[type="image"]'), levelLabel, actions, 'level');
      levelRow.querySelector('input[type="image"]').closest('li').parentElement.parentElement.hidden = true;
      mark(levelRow.parentElement, 'budget');
      mark(levelRow.parentElement.parentElement, 'settings');
    }

    [3, 4, 5, 6, 7, 8, 9, 16].forEach(function (action) {
      var text = byId('Text_' + action), source = text.parentElement;
      if (source.querySelector('[data-remaked-calculator-action]')) return;
      mark(source, 'action-source');
      if (action === 16) {
        var horse = mark(source.closest('table'), 'horse');
        mark(horse.parentElement, 'horse-container');
      } else mark(source.parentElement.parentElement, 'actions');
      var button = document.createElement('button');
      button.type = 'button'; button.className = 'remaked-calculator-action';
      button.dataset.remakedCalculatorAction = text.id;
      button.addEventListener('click', function (event) {
        event.stopPropagation();
        byId(this.dataset.remakedCalculatorAction).parentElement.click(); refresh();
      });
      source.appendChild(button); text.hidden = true;
    });

    mark(byId('StatusView'), 'results');
    pairRows(byId('StatusView'), '[id^="TextStatus_"]');
    var code = byId('InCode');
    mark(code.closest('li').parentElement, 'code');
    mark(code.closest('li').parentElement.nextElementSibling, 'code-actions');
    codeActions(code);
  }

  function refresh() {
    if (observer) observer.disconnect();
    try {
      decorate();
      document.querySelectorAll('[data-remaked-step]').forEach(function (button) {
        var source = byId(button.dataset.remakedStep);
        var label = byId(source.dataset.remakedStepSource).textContent.trim();
        var title = source.title || source.alt;
        if (button.textContent !== title) button.textContent = title;
        if (button.getAttribute('aria-label') !== label + ' ' + title) button.setAttribute('aria-label', label + ' ' + title);
        button.disabled = source.disabled;
      });
      document.querySelectorAll('[data-remaked-calculator-action]').forEach(function (button) {
        var label = byId(button.dataset.remakedCalculatorAction);
        if (button.textContent !== label.textContent) button.textContent = label.textContent;
        if (label.parentElement.id.indexOf('SwitchUse_') === 0) button.setAttribute('aria-pressed', String(label.parentElement.classList.contains('btn2_on')));
      });
      document.querySelectorAll('[data-remaked-code-action]').forEach(function (button) {
        var text = byId('remaked-code-' + button.dataset.remakedCodeAction + '-label').textContent;
        if (button.textContent !== text) button.textContent = text;
      });
    } finally {
      if (observer) observer.observe(byId('body'), { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ['class', 'title', 'disabled'] });
    }
  }
  function schedule() {
    if (timer) return;
    timer = window.setTimeout(function () { timer = null; refresh(); }, 16);
  }
  function init() {
    if (!byId('body')) return;
    observer = new MutationObserver(schedule); refresh();
  }
  namespace.calculatorControls = { refresh: refresh };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
})();
