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
      // BuffHonor_0 maps to Flag.Honor=1. Zero means NONE selected.
      // Refresh aria-pressed on every calculation/change (not only on mount).
      var enabled = key.indexOf('Honor_') === 0
        ? Number(window.Flag.Honor) === Number(key.slice(6)) + 1
        : Boolean(window.Flag[key]);
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
        panel.style.setProperty('--rm-native-panel-width', tab === 0 ? '400px' : tab === 4 ? '880px' : card.style.width);
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

  function refreshMountedDefenseNote() {
    var holder=byId('StatusView'),value=byId('Status_49');
    if (!holder || !value) return;
    // The original engine computes tmp[1] but renders '---' while riding.
    // Explain this intentionally unavailable display; never invent a DEF
    // value, mutate Flag[7] or tamper with other derived calculations.
    var note=holder.querySelector('[data-remaked-mounted-defense-note]');
    if (!note) {
      note=document.createElement('p');
      note.dataset.remakedMountedDefenseNote='';
      note.setAttribute('role','note');
      holder.appendChild(note);
    }
    var unavailable=Boolean(window.Flag?.[7]) && value.textContent.trim()==='---';
    if (note.hidden !== !unavailable) note.hidden=!unavailable;
    if (unavailable) {
      var text=namespace.i18n?.t?.('workbench.mountedDefenseNote') ||
        'Riding hides the legacy DEF value. Disable Riding to see numeric defense.';
      if (note.textContent!==text) note.textContent=text;
    }
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
        var finalStat = source.textContent.trim();
        total.textContent = '→ ' + finalStat;
        // A three-digit total needs more room than the old 32px output track.
        // Only affected attribute rows widen; two-digit builds stay compact.
        var attributeRow = input.closest('[data-remaked-calculator-attribute]');
        if (attributeRow) {
          if (!total.hidden && /^[-+]?\d{3,}$/.test(finalStat))
            attributeRow.setAttribute('data-remaked-wide-total', '');
          else attributeRow.removeAttribute('data-remaked-wide-total');
        }
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
      refreshMountedDefenseNote();
      refreshWeaponRangeProvenance();
      refreshPotionEffectsPreview();
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
  // Frozen 2026-10-11 Pandora Saga OS item-range snapshot (164 exact RU-name
  // matches, pinned by the canonical source engine name). Distance values are
  // RAW GAME UNITS, not meters. This is the weapon's base reach only: do NOT
  // add unverified legacy 40/41 modifiers or infer from weapon category.
  var currentWeaponRanges = {"0.1":[110,"トリートブリンガー",0],"0.2":[110,"ショートソード",0],"0.3":[130,"ファルシオン",0],"0.4":[125,"レイピア",0],"0.5":[135,"ロングソード",0],"0.6":[110,"アイスソード",0],"0.7":[100,"ブロンズソード",0],"0.8":[110,"カトラス",0],"0.9":[140,"サーベル",0],"0.10":[115,"クリスタルソード",0],"0.11":[135,"ミスリルソード",0],"0.12":[100,"グラディウス",0],"0.19":[100,"グラディウス",0],"0.20":[110,"グラディウスＳ",0],"0.21":[100,"グラディウスＡ",0],"0.29":[135,"グロッセスメッサー",0],"0.30":[100,"Modern:modern.equipment.6acbe08a-0356-4625-a9ac-af9240766657",0],"0.31":[100,"Modern:modern.equipment.61fdd82e-9aef-48af-a502-48c19e1c885f",0],"0.32":[100,"Modern:modern.equipment.e589e66f-6a3e-4526-a550-085b6e6625a7",0],"0.33":[100,"Modern:modern.equipment.d6361439-fa5f-48f1-ab50-a4cb17b4810e",0],"0.34":[100,"Modern:modern.equipment.330d3768-2145-4b5e-aa93-7979f7367cc9",0],"1.2":[160,"クレイモア",0],"1.3":[200,"斬馬刀",0],"1.4":[220,"フランメンシュヴェルト",0],"1.5":[220,"バスタードソード",0],"1.6":[170,"ブラッドソード",0],"1.7":[220,"ツヴァイハンダー",0],"1.8":[170,"ブロードソード",0],"1.16":[170,"ブロードソード",0],"1.17":[180,"ブロードソードＳ",0],"1.18":[170,"ブロードソードＡ",0],"1.25":[220,"ハウリングソード",0],"1.26":[220,"Modern:modern.equipment.410f3943-0a61-4811-ab65-bdb71d10e8a6",0],"2.1":[95,"アックス",0],"2.2":[95,"ハンドアックス",0],"2.3":[95,"フランキスカ",0],"2.4":[95,"ブロンズアックス",0],"2.5":[95,"クロウビル",0],"2.6":[100,"ブロードアックス",0],"2.19":[105,"バトルアックス",0],"3.2":[180,"ウォーサイス",0],"3.3":[140,"ネックスライサー",0],"3.4":[140,"ビークドアックス",0],"3.5":[200,"ポールアックス",0],"3.6":[150,"ターミネイター",0],"3.7":[150,"デーンアックス",0],"3.14":[150,"デーンアックス",0],"3.15":[160,"デーンアックスＳ",0],"3.16":[150,"デーンアックスＡ",0],"3.26":[150,"Modern:modern.equipment.9edb0261-00f0-4e87-ab90-4df7316a7f8c",0],"4.1":[300,"ウッドランス",0],"4.2":[300,"トーナメントランス",0],"4.4":[300,"バウンティランス",0],"4.5":[300,"ライトランス",0],"4.6":[300,"ヘビーランス",0],"4.20":[300,"ナイトランス",0],"4.21":[300,"Modern:modern.equipment.31f5a30e-8125-41c7-a034-f70f04cc97c9",0],"4.22":[300,"Modern:modern.equipment.86ba8a23-d24b-49be-afe1-6556c823e946",0],"4.23":[300,"Modern:modern.equipment.6a9c6b1f-820f-4bca-a2e1-9c7f8bb3ed2f",0],"5.2":[160,"スピア",0],"5.3":[180,"トライデント",0],"5.4":[220,"ロコバーアックス",0],"5.5":[200,"ブランディストック",0],"5.6":[240,"スペタム",0],"5.8":[280,"パイク",0],"5.26":[250,"ゼピュロス",0],"5.27":[250,"ゼピュロスＲ",0],"5.28":[250,"ゼピュロスＳＲ",0],"5.29":[250,"Modern:modern.equipment.b4fcaf6d-e6d6-4b6b-a7aa-c2ccd8eb0c19",0],"5.30":[250,"Modern:modern.equipment.38f38d1d-7a5d-4fab-a7f5-1d14593b71af",0],"5.31":[290,"Modern:modern.equipment.da076bd2-bd8a-49fd-a198-9f9e7fbc734b",0],"6.2":[185,"ナイフ",0],"6.4":[185,"ダガー",0],"6.5":[185,"スティレット",0],"6.6":[185,"ククリ",0],"6.7":[185,"キンドジャール",0],"6.8":[190,"クリスナイフ",0],"6.9":[190,"ロンデル",0],"6.10":[90,"マンゴーシュ",0],"6.11":[90,"ダーク",0],"6.25":[90,"スクラマサックス",0],"6.26":[185,"Modern:modern.equipment.4d91c54b-80cd-4bc1-aac0-b0c3171be600",0],"6.27":[185,"Modern:modern.equipment.971649ba-172f-4bd3-a7cd-2306111904ff",0],"6.28":[185,"Modern:modern.equipment.cab5b643-1ad1-4186-a108-622c0115e9b8",0],"6.29":[200,"Modern:modern.equipment.7c5fd1b1-9541-4a92-a3bc-0105eeda4867",0],"7.1":[150,"ナックル",0],"7.2":[150,"セスタス",0],"7.4":[150,"ベアナックル",0],"7.5":[150,"バグナグ",0],"7.6":[150,"ナックルダスター",0],"7.7":[150,"クロー",0],"7.8":[150,"ミスリルクロー",0],"7.16":[150,"ミスリルクロー",0],"7.17":[165,"ミスリルクローＳ",0],"7.18":[150,"ミスリルクローＡ",0],"7.27":[150,"Modern:modern.equipment.d41d1404-b4c8-4b4a-a376-ce3d068a1530",0],"8.3":[2800,"ボウ",1],"8.4":[2800,"ショートボウ",1],"8.5":[2800,"グレートボウ",1],"8.6":[3500,"ロングボウ",1],"8.7":[3200,"サンライトボウ",1],"8.8":[3200,"ハンターボウ",1],"8.9":[2900,"コンポジットボウ",1],"8.10":[3200,"ルナティックボウ",1],"8.11":[3500,"ガーディアンボウ",1],"8.18":[3500,"ガーディアンボウ",1],"8.19":[3700,"ガーディアンボウＳ",1],"8.20":[3500,"ガーディアンボウＡ",1],"9.1":[1250,"クロスボウ",1],"9.2":[1250,"ライトクロスボウ",1],"9.3":[1250,"ヘビークロスボウ",1],"9.4":[1250,"ウォークロスボウ",1],"9.17":[2500,"アーバレスト",1],"9.19":[1250,"Modern:modern.equipment.4003e468-d332-424e-aa1e-3d72c336c1c6",1],"9.20":[1250,"Modern:modern.equipment.8c875bf5-7266-4cdd-a845-1ec0bf1132fb",1],"9.21":[1250,"Modern:modern.equipment.6d300e76-18d1-446e-a300-a57b964b9939",1],"10.1":[100,"クラブ",0],"10.4":[100,"ブラジオン",0],"10.5":[120,"メイス",0],"10.6":[120,"アイアンポール",0],"10.7":[130,"フレイル",0],"10.9":[130,"ウォーハンマー",0],"10.10":[120,"デーンハンマー",0],"10.17":[120,"デーンハンマー",0],"10.18":[130,"デーンハンマーＳ",0],"10.19":[120,"デーンハンマーＡ",0],"10.27":[120,"モーニングスター",0],"10.28":[120,"Modern:modern.equipment.b2495c0e-0026-4061-afdb-8d6db58ee14e",0],"11.2":[190,"クォータースタッフ",0],"11.4":[190,"カジェル",0],"11.5":[190,"セプター",0],"11.6":[190,"ミスリルスタッフ",0],"11.13":[190,"モール",0],"11.14":[190,"モール",0],"11.15":[200,"モールＳ",0],"11.16":[190,"モールＡ",0],"11.24":[190,"ルーサーンハンマー",0],"12.2":[100,"ワンド",0],"12.4":[100,"ツイストワンド",0],"12.5":[110,"ブラストワンド",0],"12.6":[110,"スワールワンド",0],"12.7":[120,"クレセントワンド",0],"12.8":[120,"フェアリーワンド",0],"12.10":[120,"スターワンド",0],"12.13":[120,"氷杖フロストワンド",0],"12.15":[120,"邪杖ペリッシュワンド",0],"12.17":[120,"魔杖クルーエルワンド",0],"12.18":[120,"セラフィックワンド",0],"12.19":[120,"セラフィックワンド",0],"12.20":[120,"セラフィックワンドＳ",0],"12.21":[120,"セラフィックワンドＡ",0],"13.2":[150,"言霊の杖",0],"13.3":[150,"アイアンスタッフ",0],"13.4":[150,"レッドクリスタルロッド",0],"13.5":[150,"ワイズマンロッド",0],"13.6":[150,"マイトスタッフ",0],"13.7":[150,"スケルトンロッド",0],"13.8":[150,"アイ・オブ・オラクル",0],"13.15":[150,"スケルトンロッド",0],"13.16":[150,"スケルトンロッドＳ",0],"13.17":[150,"スケルトンロッドＡ",0],"13.19":[150,"宝杖セレスティアルロッド",0],"13.24":[150,"カースドロッド",0],"13.26":[150,"Modern:modern.equipment.fdd12152-2924-4a88-a824-b9ee8842eb46",0]};
  function currentWeaponBaseRange(code) {
    if (code !== 'RangeMelee' && code !== 'RangeRange') return null;
    var numericId = Number(window.Status?.Equip?.[0]?.[0]);
    if (!Number.isInteger(numericId) || numericId <= 0) return null;
    var category = Math.floor(numericId / 10000), index = numericId % 10000;
    var record = currentWeaponRanges[category + '.' + index];
    if (!record || Boolean(record[2]) !== (code === 'RangeRange')) return null;
    var row = window.EquipData?.[0]?.[category]?.[index];
    // Fail closed on a changed mechanic/identity; player-entered names can
    // change freely in D1 without changing this original Japanese engine key.
    if (!row || row[0] !== record[1]) return null;
    return record[0];
  }
  // Modern-only preview. The preserved native potion renderer is gated by
  // Flag[6] ("use potion effects"), although that toggle is unrelated to the
  // read-only Effects > Potions panel. Match its existing fixed/percentage
  // formulas without changing Flag[6], the archived engine or build state.
  var potionFixedRecovery=[20,60,120,180,450,145,10,25,200,150];
  var potionPercentRecovery=[5,15,30,18];
  function refreshPotionEffectsPreview() {
    var panel=byId('POTView'),status=window.Status;
    if (!panel || !status || !window.Name?.POT) return;
    var potionBonus=Number(status.POT),maxLife=Number(status.LP);
    if (!Number.isFinite(potionBonus) || !Number.isFinite(maxLife) ||
        potionBonus<0 || maxLife<0) return;
    var totals=potionFixedRecovery.map(function(amount){
      return Math.floor(amount*potionBonus/100);
    }).concat(potionPercentRecovery.map(function(percent){
      return Math.floor(maxLife*Math.ceil(percent*potionBonus)/10000);
    }));
    totals.forEach(function(value,index) {
      var output=byId('ViewPOT_'+index+'_1');
      if (output && output.textContent!==String(value))output.textContent=String(value);
    });
    ['EfTab_0','EfTab_1'].forEach(function(id,index){
      var tab=byId(id);
      if(tab)tab.setAttribute('aria-selected',String(Number(window.Flag?.[8])===index));
    });
  }
  function installPotionTabAccessibility(){
    ['EfTab_0','EfTab_1'].forEach(function(id,index){
      var tab=byId(id);
      if(!tab || tab.hasAttribute('data-remaked-potion-tab'))return;
      tab.dataset.remakedPotionTab='';
      tab.setAttribute('role','tab');
      tab.setAttribute('tabindex','0');
      tab.setAttribute('aria-controls',index===0?'SkillView':'POTView');
      // Keep the archived hover action, but add mouse-click/touch/keyboard.
      var activate=function(){
        if (typeof tab.onmouseover==='function')tab.onmouseover();
        refreshPotionEffectsPreview();
        schedule();
      };
      tab.addEventListener('click',activate);
      tab.addEventListener('keydown',function(event){
        if(event.key==='Enter'||event.key===' '){
          event.preventDefault();activate();
        }
        if(event.key==='ArrowLeft'||event.key==='ArrowRight'){
          event.preventDefault();
          var other=byId(index===0?'EfTab_1':'EfTab_0');
          if(other){other.focus();other.click();}
        }
      });
    });
  }
  function refreshWeaponRangeProvenance() {
    ['RangeMelee','RangeRange'].forEach(function(code){
      var number=byId(code==='RangeMelee'?'Status_40':'Status_41');
      if(!number)return;
      var verified=currentWeaponBaseRange(code)!==null;
      var key=verified?'calculator.weaponBaseRangeVerified':'calculator.weaponBaseRangeUnverified';
      var fallback=verified
        ? 'Only the equipped weapon’s base range is shown (raw game units). Riding, skill and equipment modifiers are not yet verified.'
        : 'Effective attack range is not verified for this weapon. An unavailable value is not zero.';
      var notice=namespace.i18n?.t?.(key)||fallback;
      if(number.title!==notice)number.title=notice;
      if(number.getAttribute('aria-description')!==notice)
        number.setAttribute('aria-description',notice);
      number.dataset.remakedRangeEvidence=verified?'base':'unverified';
    });
  }
  function projectWeaponBaseRange(code) {
    var output = byId(code === 'RangeMelee' ? 'Status_40' : 'Status_41');
    if (!output) return;
    var base = currentWeaponBaseRange(code);
    if (base === null) return; // preserve the original --- on unknown items
    output.textContent = String(base);
  }

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
      if (code === 'RESMagic' && !mode && window.Flag?.['0_8']) {
        // Knight's Providence (skill 0.8) adds 25 magic resistance.
        // Legacy records the toggle but Calc('RESMagic') never reads it.
        // Calculate from the freshly regenerated source output each time:
        // this never accumulates across CalcSet('ALL') or changes a build.
        // Only the Modern renderer applies this verified historical bonus.
        var resistance = byId('Status_145');
        if (resistance) {
          var base = Number(String(resistance.textContent).replace(/,/g, '').trim());
          if (Number.isFinite(base)) resistance.textContent = String(base + 25);
        }
      }
      if (!mode && (code === 'RangeMelee' || code === 'RangeRange')) {
        projectWeaponBaseRange(code);
      }
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
    installPotionTabAccessibility();
    observer = new MutationObserver(schedule); refresh();
    window.addEventListener('resize', schedule);
    window.addEventListener('pandora-remaked:localechange', schedule);
  }
  namespace.calculatorControls = { refresh: refresh };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
})();
