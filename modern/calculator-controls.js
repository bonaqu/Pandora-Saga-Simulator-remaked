(function () {
  'use strict';

  var namespace = window.PandoraRemaked = window.PandoraRemaked || {};
  var observer, timer, numberFeedback;
  function byId(id) { return document.getElementById(id); }
  function mark(node, name) { if (node) node.setAttribute('data-remaked-calculator-' + name, ''); return node; }
  function sectionTitle(root, name, key, level) {
    var id = 'remaked-workbench-' + name + '-title';
    if (byId(id) || !namespace.i18n) return;
    var title = document.createElement(level === 3 ? 'h3' : 'h2');
    title.id = id; title.className = 'remaked-workbench-title';
    if (level !== 3) title.dataset.remakedWorkbenchTitle = name;
    namespace.i18n.bindText(title, key); root.prepend(title);
    root.setAttribute('role', 'group'); root.setAttribute('aria-labelledby', id);
  }

  function decorateInspectorContents() {
    var jobContent = byId('InRace')?.closest('.col_bg2');
    if (jobContent && !jobContent.querySelector('[data-remaked-job-layout]')) {
      var raceColumn = byId('InRace').parentElement.parentElement;
      var jobRow = byId('InJob').parentElement, jobHeading = jobRow.previousElementSibling.lastElementChild;
      var columns = document.createElement('ul'); columns.dataset.remakedJobLayout = '';
      jobContent.dataset.remakedJobContent = '';
      var jobColumn = document.createElement('li'), headingRow = document.createElement('ul');
      headingRow.appendChild(jobHeading); jobColumn.append(headingRow, jobRow);
      columns.append(raceColumn, jobColumn); jobContent.replaceChildren(columns);
    }
    var skillCard = byId('LearnView')?.closest('.sub_win');
    if (skillCard && !skillCard.querySelector('[data-remaked-skill-list-prompt]')) {
      var prompt = document.createElement('section'); prompt.dataset.remakedSkillListPrompt = '';
      var hint = document.createElement('p'); namespace.i18n.bindText(hint, 'skills.listDisabled');
      var enable = document.createElement('button'); enable.type = 'button'; enable.className = 'remaked-calculator-action';
      enable.addEventListener('click', function () {
        if (!window.Flag[3]) byId('Text_3').parentElement.click();
        refresh();
      });
      prompt.append(hint, enable); skillCard.querySelector('.remaked-native-panel-content').prepend(prompt);
    }
    if (skillCard) {
      var skillPrompt = skillCard.querySelector('[data-remaked-skill-list-prompt]');
      skillPrompt.hidden = Boolean(window.Flag[3]);
      var enableButton = skillPrompt.querySelector('button'), sourceLabel = byId('Text_3').textContent;
      if (enableButton.textContent !== sourceLabel) enableButton.textContent = sourceLabel;
    }
    ['ATK', 'RES'].forEach(function (kind) {
      var view = byId(kind + 'View'); if (!view) return;
      view.querySelectorAll('[id^="Text' + kind + '_"]').forEach(function (label) {
        if (label.closest('[data-remaked-inspector-stat]')) return;
        var value = label.nextElementSibling; if (!value || !value.classList.contains('input_gt')) return;
        var pair = document.createElement('li'); pair.dataset.remakedInspectorStat = ''; pair.setAttribute('role', 'group'); pair.setAttribute('aria-labelledby', label.id);
        var content = document.createElement('ul'); label.before(pair); content.append(label, value); pair.appendChild(content);
      });
      view.querySelectorAll(':scope > ul > li:not([data-remaked-inspector-stat])').forEach(function (spacer) { if (!spacer.textContent.trim()) spacer.hidden = true; });
    });
    var buffs = byId('BUFFView'); if (!buffs) return;
    if (!buffs.querySelector('[data-remaked-buff-column]')) {
      // Source create.js nests five columns inside several width:100% list
      // wrappers. Move the actual columns, not those wrappers, into one grid.
      var columns = [0, 1, 2].map(function (index) { return byId('InBuff_' + index).parentElement.parentElement.parentElement; });
      columns.push(byId('Text_24').parentElement.parentElement, byId('Text_25').parentElement.parentElement);
      var list = document.createElement('ul'), heading = byId('Text_20');
      heading.hidden = true; list.appendChild(heading);
      columns.forEach(function (column) { column.dataset.remakedBuffColumn = ''; list.appendChild(column); });
      buffs.replaceChildren(list);
      columns.forEach(function (column) {
        column.querySelectorAll('li').forEach(function (item) { if (!item.textContent.trim() && !item.querySelector('input, select, button')) item.hidden = true; });
      });
    }
    [0, 1, 2].forEach(function (index) {
      var input = byId('InBuff_' + index), label = byId('Text_' + (21 + index));
      input.parentElement.parentElement.dataset.remakedBuffParameter = '';
      input.setAttribute('aria-labelledby', label.id);
    });
    buffs.querySelectorAll('[id^="Buff_"], [id^="BuffHonor_"]').forEach(function (source) {
      if (!source.onclick) return;
      var key = source.id.replace('Buff_', '').replace('BuffHonor_', 'Honor_'), button = source.querySelector(':scope > button');
      if (!button) {
        button = document.createElement('button'); button.type = 'button'; button.dataset.remakedBuff = key;
        // The click bubbles once to the retained LI callback. Language changes
        // rewrite its original TextBuff node, not the button or the callback.
        while (source.firstChild) button.appendChild(source.firstChild);
        source.appendChild(button);
      }
      var enabled = key.indexOf('Honor_') === 0 ? Number(window.Flag.Honor) === Number(key.slice(6)) : Boolean(window.Flag[key]);
      button.setAttribute('aria-pressed', String(enabled));
    });
  }

  function refreshPanels() {
    var main = document.querySelector('[data-remaked-calculator-main]'), row = byId('remaked-native-panels');
    if (!main) return;
    if (!row) { row = document.createElement('ul'); row.id = 'remaked-native-panels'; main.prepend(row); }
    var anyExpanded = false;
    for (var tab = 0; tab < 5; tab++) {
      var panel = byId('Tab_' + tab + '_1'), opener = document.querySelector('[data-remaked-tab="' + tab + '"]');
      if (!panel || !opener) continue;
      var card = panel.querySelector('.sub_win');
      if (!panel.hasAttribute('data-remaked-native-panel')) {
        row.appendChild(panel);
        panel.dataset.remakedNativePanel = String(tab);
        panel.setAttribute('role', 'dialog');
        panel.dataset.remakedFloatingPanel = '';
        panel.setAttribute('aria-modal', 'false');
        panel.addEventListener('keydown', function (event) {
          if (event.key === 'Escape' && !event.defaultPrevented) {
            event.preventDefault(); event.stopPropagation();
            this.querySelector('[data-remaked-panel-close]').click();
          }
        });
        var mobileBar = card.querySelector(':scope > .remaked-mobile-card-bar'); if (mobileBar) mobileBar.remove();
        card.style.setProperty('--rm-native-panel-width', card.style.width);
        panel.style.setProperty('--rm-native-panel-width', tab === 0 ? '400px' : card.style.width);
        var bar = document.createElement('div'); bar.className = 'remaked-native-panel-bar';
        var title = document.createElement('strong'); title.id = 'remaked-native-panel-title-' + tab;
        panel.setAttribute('aria-labelledby', title.id);
        var close = document.createElement('button'); close.type = 'button'; close.textContent = '×'; close.dataset.remakedPanelClose = String(tab);
        close.addEventListener('click', function () {
          var index = this.dataset.remakedPanelClose, source = byId('Tab_' + index + '_0');
          if (Number(window.Flag[2]) === Number(index) + 1) source.click();
          document.querySelector('[data-remaked-tab="' + index + '"]').focus({ preventScroll: true }); refresh();
        });
        var content = card.firstElementChild; content.classList.add('remaked-native-panel-content');
        bar.append(title, close); card.insertBefore(bar, content);
        opener.addEventListener('keydown', function (event) {
          if (event.key === 'Escape' && Number(window.Flag[2]) === Number(this.dataset.remakedTab) + 1) {
            event.preventDefault(); event.stopPropagation();
            byId(this.getAttribute('aria-controls')).querySelector('[data-remaked-panel-close]').click();
          }
        });
      }
      var label = opener.textContent, expanded = Number(window.Flag[2]) === tab + 1;
      var heading = byId('remaked-native-panel-title-' + tab); if (heading.textContent !== label) heading.textContent = label;
      panel.querySelector('[data-remaked-panel-close]').setAttribute('aria-label', (namespace.i18n ? namespace.i18n.t('mobile.collapse') : 'Collapse section') + ': ' + label);
      opener.setAttribute('aria-controls', panel.id); opener.setAttribute('aria-expanded', String(expanded)); panel.hidden = !expanded;
      if (expanded) positionFloatingPanel(panel);
      anyExpanded = anyExpanded || expanded;
    }
    row.hidden = !anyExpanded;
    decorateInspectorContents();
  }

  function positionFloatingPanel(panel) {
    var header = document.querySelector('[data-remaked-header]').getBoundingClientRect();
    var top = Math.min(Math.max(8, header.bottom + 6), Math.max(8, window.innerHeight - 180));
    panel.style.setProperty('--rm-popup-top', top + 'px');
    panel.style.setProperty('--rm-popup-left', Math.max(8, header.left) + 'px');
  }

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
    if (code.hasAttribute('data-remaked-code-decorated')) return;
    code.dataset.remakedCodeDecorated = '';
    var label = code.closest('li').previousElementSibling;
    label.id = 'remaked-code-label';
    code.setAttribute('aria-labelledby', label.id);
    code.setAttribute('aria-describedby', 'remaked-code-status');
    code.spellcheck = false; code.autocomplete = 'off';
    var actions = code.closest('li').parentElement.nextElementSibling;
    var list = mark(actions.querySelector('ul'), 'code-buttons');
    var status = document.createElement('li');
    status.id = 'remaked-code-status'; status.dataset.remakedCodeStatus = '';
    status.setAttribute('role', 'status');
    actions.appendChild(status);
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
          if (!namespace.builds || !namespace.builds.importCodeField) {
            codeStatus('builds.autosaveUnavailable', 'warning', 'Autosave unavailable'); return;
          }
          return namespace.builds.importCodeField(code, codeStatus);
        };
      }
      var button = document.createElement('button');
      button.type = 'button'; button.className = 'remaked-calculator-action remaked-build-button';
      button.dataset.remakedCodeAction = entry[0];
      if (entry[0] === 'create') button.dataset.remakedExportBuild = '';
      if (entry[0] === 'load') {
        button.dataset.remakedImportBuild = '';
        button.classList.add('remaked-build-button-primary');
      }
      button.addEventListener('click', async function (event) {
        event.stopPropagation();
        var prior = code.value;
        try {
          // Invoke the retained DOM callback directly so a codec failure is
          // catchable here; click() reports listener errors to the global page
          // instead of throwing to its caller. No callback/formula is copied.
          await source.onclick.call(source, event);
          if (entry[0] === 'create' && namespace.catalog && !source.hasAttribute('data-remaked-complete-export')) {
            var payload = namespace.adapter.serialize();
            if (payload.indexOf('PS3:') === 0) code.value = payload;
          }
          if (entry[0] !== 'load') {
            code.removeAttribute('aria-invalid');
            if (entry[0] === 'create') codeStatus('builds.exported', 'success', 'Current build code exported.');
            else clearCodeStatus();
          }
        } catch (error) {
          if (entry[0] === 'create') code.value = prior;
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

  function clearNumberFeedback() {
    numberFeedback = null;
    var message = byId('remaked-number-status');
    if (!message) return;
    delete message.dataset.remakedI18n; delete message.dataset.remakedI18nValues;
    if (message.textContent) message.textContent = '';
  }

  function numberIssue(input) {
    if (input.validity.badInput) return 'wholeNumber';
    if (input.value === '') return 'required';
    if (input.valueAsNumber > Number(input.max)) return 'maximum';
    if (input.valueAsNumber < Number(input.min)) return 'minimum';
    if (!input.checkValidity() || !Number.isInteger(input.valueAsNumber)) return 'wholeNumber';
    return null;
  }

  function refreshNumberFeedback() {
    if (!numberFeedback || !namespace.i18n) return;
    var input = numberFeedback.input, kind = numberFeedback.kind;
    if (kind !== 'budget') {
      kind = numberIssue(input);
      if (!kind) { input.removeAttribute('aria-invalid'); clearNumberFeedback(); return; }
    }
    var label = byId(input.getAttribute('aria-labelledby'));
    var values = { field: label.textContent.trim(), min: input.min, max: input.max, value: input._remakedValue() };
    var key = kind === 'budget' ? 'calculator.inputBudgetForField' : 'calculator.input' + kind.charAt(0).toUpperCase() + kind.slice(1);
    var message = byId('remaked-number-status');
    // Avoid a self-triggering MutationObserver loop. Rebind only if the
    // current field, race minimum, language or editable translation changed.
    if (message.dataset.remakedI18n !== key || message.dataset.remakedI18nValues !== JSON.stringify(values) || message.textContent !== namespace.i18n.t(key, values)) {
      namespace.i18n.bindText(message, key, values);
    }
  }

  function refreshBudgetWarning() {
    if (!window.Status) return;
    var definitions = [
      { key: 'StP', id: 'StatusStP_0' },
      { key: 'SkP', id: 'StatusSkP_0' }
    ];
    var deficits = [];
    definitions.forEach(function (definition) {
      var value = byId(definition.id);
      if (!value) return;
      var row = value.closest('.input_gt')?.parentElement;
      var remaining = Number(window.Status[definition.key]?.[0]);
      var deficit = Number.isFinite(remaining) && remaining < 0;
      row?.toggleAttribute('data-remaked-budget-deficit', deficit);
      if (deficit) {
        var label = row?.querySelector('.input_lt')?.textContent.trim() || definition.key;
        deficits.push({ row: row, label: label, value: remaining });
      } else if (row) {
        row.removeAttribute('aria-describedby');
        row.removeAttribute('title');
      }
    });

    var warning = byId('remaked-budget-warning');
    if (!warning) {
      warning = document.createElement('p');
      warning.id = 'remaked-budget-warning';
      warning.setAttribute('role', 'status');
      warning.setAttribute('aria-live', 'polite');
      var numberStatus = byId('remaked-number-status');
      if (numberStatus) numberStatus.after(warning);
      else document.querySelector('[data-remaked-calculator-settings]')?.after(warning);
    }
    if (!deficits.length) {
      warning.textContent = '';
      return;
    }

    var russian = namespace.i18n?.getLocale() === 'ru';
    var details = deficits.map(function (entry) { return entry.label + ' ' + entry.value; }).join(' · ');
    var message = (russian
      ? 'Текущее распределение превышает доступные очки: '
      : 'Current allocation exceeds the available points: ') + details + '.';
    warning.textContent = message;
    deficits.forEach(function (entry) {
      if (!entry.row) return;
      entry.row.setAttribute('aria-describedby', warning.id);
      entry.row.title = message;
    });
  }

  function numberControl(key, label, source, host) {
    var input = document.createElement('input');
    input.type = 'number'; input.inputMode = 'numeric'; input.step = '1'; input.required = true;
    input.className = 'remaked-calculator-number'; input.dataset.remakedNumber = key;
    input.setAttribute('aria-labelledby', label.id);
    input.setAttribute('aria-describedby', 'remaked-number-status');
    host.appendChild(input);
    var total = document.createElement('output');
    total.dataset.remakedNumberTotal = key; host.appendChild(total);
    function current() { return key === 'Lev' ? window.Status.Lev[0] : window.Status[key][0] + window.Status[key][1]; }
    function cancel() {
      input.value = current(); input.removeAttribute('aria-invalid');
      if (numberFeedback?.input === input) clearNumberFeedback();
      refresh();
    }
    function commit() {
      var issue = numberIssue(input);
      if (issue === 'minimum' || issue === 'maximum') {
        // Clamp on commit, not on every keystroke: typing remains uninterrupted.
        input.value = issue === 'minimum' ? input.min : input.max;
        issue = null;
      }
      if (issue) {
        input.setAttribute('aria-invalid', 'true');
        numberFeedback = { input: input, kind: issue }; refreshNumberFeedback();
        return;
      }
      var requested = input.valueAsNumber, delta = requested - current();
      if (delta) {
        if (key === 'Lev') {
          window.StatusMove('Lev', delta);
          // Level gates both native passives and skill availability. The
          // retained Lev-only pass skips skill-effect values such as Heal, so
          // use the complete calculation pass in Modern after a level edit.
          window.CalcSet('ALL');
          if (window.Flag[3] && namespace.skillControls?.rebuildLearningList)
            namespace.skillControls.rebuildLearningList();
        } else {
          window.StatusMove('Status', key, delta);
          window.CalcSet(key);
        }
      }
      input.value = current(); input.removeAttribute('aria-invalid');
      if (current() !== requested) numberFeedback = { input: input, kind: 'budget' };
      else clearNumberFeedback();
      refresh();
    }
    input.addEventListener('input', function () {
      input.removeAttribute('aria-invalid');
      if (numberFeedback?.input === input) clearNumberFeedback();
    });
    input.addEventListener('blur', function () { if (input.value !== String(current())) commit(); });
    input.addEventListener('keydown', function (event) {
      // Keep the retained global calculator hotkeys out of editable controls.
      event.stopPropagation();
      if (event.key === 'Enter') { event.preventDefault(); commit(); }
      if (event.key === 'Escape') { event.preventDefault(); cancel(); }
    });
    input.addEventListener('keypress', function (event) { event.stopPropagation(); });
    input._remakedValue = current;
    source.dataset.remakedNumberSource = key;
    return input;
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
    // The presentation heading is not a source identity row. Reuse the marked
    // original node on every refresh, including after a language/build change.
    var identity = character.querySelector('[data-remaked-calculator-identity]') || character.firstElementChild;
    mark(identity, 'identity');
    pairRows(identity, '[id^="Text_"]');

    if (!status.hasAttribute('data-remaked-calculator-attributes')) {
      mark(status, 'attributes');
      var originalRows = Array.prototype.slice.call(status.children);
      for (var index = 0; index < 6; index++) {
        var card = mark(document.createElement('div'), 'attribute');
        var start = index * 4;
        for (var part = 0; part < 4; part++) card.appendChild(originalRows[start + part]);
        var label = card.querySelector('[id^="Text_"]');
        var source = card.querySelector('[id^="Status"][id$="_0"]');
        var code = source.id.slice(6, -2);
        source.parentElement.hidden = true;
        numberControl(code, label, source, source.parentElement.parentElement);
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
      namespace.i18n.bindText(levelLabel, 'character.level');
      [['StatusStP_0', 'character.status'], ['StatusSkP_0', 'character.skill']].forEach(function (entry) {
        var label = byId(entry[0]).closest('.input_gt').previousElementSibling;
        namespace.i18n.bindText(label, entry[1]);
      });
      level.parentElement.hidden = true;
      numberControl('Lev', levelLabel, level, level.parentElement.parentElement);
      levelRow.querySelector('input[type="image"]').closest('li').parentElement.parentElement.hidden = true;
      mark(levelRow.parentElement, 'budget');
      mark(levelRow.parentElement.parentElement, 'settings');
    }

    if (!byId('remaked-number-status')) {
      var numberStatus = document.createElement('p'); numberStatus.id = 'remaked-number-status';
      numberStatus.setAttribute('role', 'status');
      character.querySelector('[data-remaked-calculator-settings]').after(numberStatus);
    }

    [3, 4, 5, 6, 7, 8, 9, 16].forEach(function (action) {
      var text = byId('Text_' + action), source = text.parentElement;
      if (source.querySelector('[data-remaked-calculator-action]')) return;
      mark(source, 'action-source');
      if (action === 16) {
        var horse = mark(source.closest('table'), 'horse');
        var horseContainer = mark(horse.parentElement, 'horse-container');
        // Riding belongs with the existing simulation switches, not underneath
        // six attribute cards. Move the original row once, retaining every node
        // and native callback; no clone, new state or formula is introduced.
        var horseRow = mark(horseContainer.parentElement, 'riding-row');
        byId('Text_3').closest('[data-remaked-calculator-actions]').appendChild(horseRow);
      } else mark(source.parentElement.parentElement, 'actions');
      var button = document.createElement('button');
      button.type = 'button'; button.className = 'remaked-calculator-action';
      button.dataset.remakedCalculatorAction = text.id;
      button.addEventListener('click', function (event) {
        event.stopPropagation();
        var actionId = this.dataset.remakedCalculatorAction;
        byId(actionId).parentElement.click();
        // The retained toggle appends to derived Learn arrays. Rebuilding from
        // current state on enable prevents a stale all-gray skill panel.
        if (actionId === 'Text_3' && window.Flag[3] && namespace.skillControls?.rebuildLearningList)
          namespace.skillControls.rebuildLearningList();
        refresh();
      });
      source.appendChild(button); text.hidden = true;
    });

    mark(byId('StatusView'), 'results');
    pairRows(byId('StatusView'), '[id^="TextStatus_"]');
    sectionTitle(character, 'character', 'workbench.character');
    sectionTitle(columns.lastElementChild, 'effects', 'workbench.effects');
    sectionTitle(status, 'base', 'workbench.baseStats', 3);
    sectionTitle(byId('StatusView'), 'results', 'workbench.results', 3);
    var code = byId('InCode');
    mark(code.closest('li').parentElement, 'code');
    mark(code.closest('li').parentElement.nextElementSibling, 'code-actions');
    codeActions(code);
  }

  function refresh(options) {
    if (observer) observer.disconnect();
    try {
      var title = byId('Title'), version = window.PandoraRemakedVersion?.ui;
      if (title && version && window.Name?.Title) {
        // Modern presentation only. Ver/Name.Title stay source-owned, and
        // TextSet may rewrite this node whenever source language changes.
        var heading = window.Name.Title[Number(window.Flag[0]) + 1] + ' ' + version;
        if (title.textContent !== heading) title.textContent = heading;
      }
      decorate();
      refreshPanels();
      if (options?.resetInputs) clearNumberFeedback();
      document.querySelectorAll('[data-remaked-number]').forEach(function (input) {
        var key = input.dataset.remakedNumber;
        input.min = key === 'Lev' ? '1' : String(window.Status[key][0]);
        input.max = String(key === 'Lev' ? window.MaxLv : window.MaxSt);
        // A refresh while typing must never erase an unfinished edit. External
        // An explicit build load replaces the edit too, even if this input
        // still has focus. Ordinary calculation/language refreshes do not.
        if (options?.resetInputs) { input.value = input._remakedValue(); input.removeAttribute('aria-invalid'); }
        else if (document.activeElement !== input && !input.hasAttribute('aria-invalid')) input.value = input._remakedValue();
        if (namespace.i18n) input.title = namespace.i18n.t(key === 'Lev' ? 'calculator.levelInputHelp' : 'calculator.attributeInputHelp');
        var total = input.nextElementSibling, source = document.querySelector('[data-remaked-number-source="' + key + '"]');
        total.hidden = key === 'Lev' || window.Status[key][2] === 0;
        total.textContent = '→ ' + source.textContent.trim();
        if (namespace.i18n) total.title = namespace.i18n.t('calculator.totalWithBonuses');
      });
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
        var action = button.dataset.remakedCodeAction;
        var key = { create: 'builds.exportCurrent', load: 'builds.importCode', delete: 'builds.clearCode' }[action];
        var source = byId('remaked-code-' + action + '-label').textContent;
        var text = namespace.i18n ? namespace.i18n.game('calculator.literal.' + (action === 'load' ? 'code_load' : action), '') || namespace.i18n.t(key) : source;
        if (button.textContent !== text) button.textContent = text;
      });
      refreshNumberFeedback();
      refreshBudgetWarning();
    } finally {
      if (observer) observer.observe(byId('body'), { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ['class', 'title', 'disabled'] });
    }
  }
  function schedule() {
    if (timer) return;
    timer = window.setTimeout(function () { timer = null; refresh(); }, 16);
  }
  // Repair two rendering/calculation defects only for the Modern adapter.
  // The archived Legacy engine must remain byte-for-byte unchanged.
  function installCalculatorCorrections() {
    if (typeof window.Calc !== 'function' || window.Calc._remakedCorrected) return;
    var sourceCalc = window.Calc;
    function correctedCalc(code, mode) {
      if ((code === 'LPRec' || code === 'MPRec') && !mode && Number(window.Flag[2]) === 4 && window.EquipOpt) {
        var ids = code === 'LPRec' ? [12, 14] : [13, 15];
        var entries = ids.map(function (id) {
          return { id: id, present: Object.prototype.hasOwnProperty.call(window.EquipOpt, id), items: window.EquipOpt[id] };
        });
        var bonus = 0;
        entries.forEach(function (entry) {
          (entry.items || []).forEach(function (modifier) {
            var value = Number(modifier);
            if (Number.isFinite(value)) bonus += value;
          });
          // Native recovery calculation reads an array key formed by [12,14]
          // instead of each individual ID when a modifier is present.
          window.EquipOpt[entry.id] = [];
        });
        var result;
        try { result = sourceCalc.apply(this, arguments); }
        finally {
          entries.forEach(function (entry) {
            if (entry.present) window.EquipOpt[entry.id] = entry.items;
            else delete window.EquipOpt[entry.id];
          });
        }
        var output = byId(code === 'LPRec' ? 'Status_12' : 'Status_13');
        if (output && bonus) {
          var current = Number(output.textContent.replace(/,/g, ''));
          if (Number.isFinite(current)) output.textContent = String(current + bonus);
        }
        return result;
      }
      var response = sourceCalc.apply(this, arguments);
      if (code === 'ATKSPD' && window.Flag[7]) {
        var speed = byId('Status_73');
        if (speed) speed.textContent = '---';
      }
      return response;
    }
    correctedCalc._remakedCorrected = true;
    window.Calc = correctedCalc;
  }

  function init() {
    if (!byId('body')) return;
    installCalculatorCorrections();
    observer = new MutationObserver(schedule); refresh();
    window.addEventListener('resize', schedule);
  }
  namespace.calculatorControls = { refresh: refresh };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
})();
