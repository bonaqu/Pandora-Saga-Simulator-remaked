(function () {
  'use strict';
  var namespace = window.PandoraRemaked = window.PandoraRemaked || {};
  var i18n = namespace.i18n, observer, timer, catalogKey = '', catalogSection;
  function byId(id) { return document.getElementById(id); }
  function text(node, value) { if (node.textContent !== value) node.textContent = value; }

  function plain(value) { return namespace.calculatorLabels.plain(value); }
  function game(key, source) { return i18n.game(key, plain(source)); }
  function catalogSkills() {
    if (!namespace.catalog || !byId('LearnView')) return;
    var records = namespace.catalog.variantSkills(), language = Number(window.Flag[0]);
    var key = i18n.getLocale() + ':' + language + ':' + namespace.catalog.getRevision() + ':' + JSON.stringify(records);
    if (key === catalogKey) return;
    catalogKey = key;
    if (!catalogSection) {
      catalogSection = document.createElement('section'); catalogSection.dataset.remakedCatalogSkills = '';
      catalogSection.setAttribute('aria-labelledby', 'remaked-catalog-skills-title');
      var title = document.createElement('h3'); title.id = 'remaked-catalog-skills-title';
      i18n.bindText(title, 'skills.catalog'); catalogSection.appendChild(title);
      var skillCard = byId('LearnView').closest('.sub_win');
      (skillCard.querySelector('.remaked-native-panel-content') || skillCard).appendChild(catalogSection);
    }
    catalogSection.hidden = !records.length;
    var ids = records.map(function (record) { return record.id; });
    catalogSection.querySelectorAll('[data-remaked-skill-variant]').forEach(function (card) { if (ids.indexOf(card.dataset.remakedSkillVariant) === -1) card.remove(); });
    var labels = namespace.calculatorLabels.collect();
    records.forEach(function (record) {
      var card = Array.from(catalogSection.querySelectorAll('[data-remaked-skill-variant]')).find(function (node) { return node.dataset.remakedSkillVariant === record.id; });
      if (!card) {
        card = document.createElement('details'); card.dataset.remakedSkillVariant = record.id;
        var summary = document.createElement('summary'); summary.appendChild(document.createElement('strong')); summary.appendChild(document.createElement('span'));
        card.appendChild(summary); card.appendChild(document.createElement('div')); catalogSection.appendChild(card);
      }
      text(card.querySelector('summary strong'), namespace.catalog.gameLabel(record.id));
      text(card.querySelector('summary span'), i18n.t(record.learned ? 'skills.learned' : 'skills.notLearned'));
      card.dataset.learned = String(record.learned);
      var body = card.lastElementChild; body.replaceChildren();
      function paragraph(value, attribute) {
        var node = document.createElement('p'); node.textContent = value;
        if (attribute) node.setAttribute(attribute, ''); body.appendChild(node); return node;
      }
      var source = window.Skill[language][record.category][record.index], term = 'skill_detail.' + record.category + '.' + record.index;
      if (record.learningRequirements) {
        paragraph(i18n.t('skills.customLearning'));
        paragraph(namespace.catalog.learningText(record.learningRequirements), 'data-remaked-variant-learning');
      } else {
        paragraph(i18n.t('skills.template', { name: game(record.templateId, source[0]) }));
        paragraph(game('calculator.learn.6', window.Name.Learn[6][language]) + ': ' + game(term + '.1', source[1]));
      }
      if (record.active) {
        paragraph(game('calculator.learn.7', window.Name.Learn[7][language]) + ': ' + game(term + '.2', source[2]));
        var timings = document.createElement('dl'); body.appendChild(timings);
        [1, 2, 3, 5].forEach(function (caption, index) {
          var label = document.createElement('dt'); label.textContent = game('calculator.learn.' + caption, window.Name.Learn[caption][language]);
          var value = document.createElement('dd'); value.dataset.remakedVariantTiming = String(index);
          value.textContent = String(record.timing[index]) + (index ? ' ' + game('calculator.learn.4', window.Name.Learn[4][language]) : '');
          timings.appendChild(label); timings.appendChild(value);
        });
        paragraph(i18n.t('skills.metadataOnly'));
      } else {
        paragraph(i18n.t(record.bonusApplied ? 'skills.bonusApplied' : 'skills.bonusInactive'), 'data-remaked-variant-bonus');
        var weapons = record.bonusRequirements.weaponCategories.map(function (category) {
          return category === -1 ? i18n.t('skills.unarmed') : game('equipment_category.' + category, window.EquipData[language][category][0][0]).replace(/^[+\-\s]+/, '');
        });
        var requirements = weapons.length ? [weapons.join(' / ')] : [];
        if (record.bonusRequirements.shieldRequired) requirements.push(game('equipment_category.20', window.EquipData[language][20][0][0]).replace(/^[+\-\s]+/, ''));
        if (record.bonusRequirements.ridingRequired) requirements.push(i18n.t('skills.ridingRequired'));
        if (requirements.length) paragraph(i18n.t('skills.bonusRequirements') + ': ' + requirements.join(' · '), 'data-remaked-variant-requirements');
        record.effects.forEach(function (effect) {
          var sourceName = window.Name.Option[effect.stat][language + 3];
          var known = labels.find(function (row) { return row.category !== 'skill_detail' && plain(row.values[language]) === plain(sourceName); });
          paragraph((known ? game(known.id, sourceName) : plain(sourceName)) + ': ' + (effect.value >= 0 ? '+' : '') + effect.value + (effect.unit === 'percent' ? '%' : ''));
        });
      }
      var descriptionLanguage = i18n.getLocale() === 'ru' ? 'ru' : ['jp', 'en', 'tw'][language];
      paragraph(record.description[descriptionLanguage] || record.description.en || '', 'data-remaked-variant-description');
    });
  }

  function currentAdeptness(index) {
    var state = window.Status.Skill[index];
    return state[0] + state[1];
  }

  function currentPotential(index) {
    var state = window.Status.Skill[index];
    return state[2] + state[3];
  }

  function syncSkillBounds(input) {
    var index = Number(input.dataset.remakedSkillNumber);
    input.min = String(window.Status.Skill[index][0]);
    input.max = String(currentPotential(index));
  }

  function syncSkillInput(input) {
    var index = Number(input.dataset.remakedSkillNumber);
    syncSkillBounds(input);
    if (document.activeElement !== input) {
      input.value = String(currentAdeptness(index));
      input.removeAttribute('aria-invalid');
    }
  }

  function rebuildLearningList() {
    if (!window.Flag[3]) return;
    // Learn is derived UI state. Rebuild every prerequisite pool from the
    // current class/level/branches so an unrelated catalog projection cannot
    // leave a native icon stale after a direct branch edit.
    window.Learn = [[], [], [], []];
    for (var category = 0; category < window.Name.Skill.length; category++)
      window.SkillList('Potential', category);
    window.SkillList('Adeptness', 0);
    window.SkillList('Create');
    window.SkillList('Color');
  }

  function adeptnessInput(index, value, caption) {
    var input = document.createElement('input');
    input.type = 'number'; input.inputMode = 'numeric'; input.step = '1'; input.required = true;
    input.className = 'remaked-calculator-number remaked-skill-number';
    input.dataset.remakedSkillNumber = String(index);
    input.setAttribute('aria-labelledby', 'TextSkill_' + index + ' ' + caption.id);
    value.hidden = true;

    function cancel() {
      input.value = String(currentAdeptness(index));
      input.removeAttribute('aria-invalid');
    }
    function commit() {
      syncSkillBounds(input);
      if (input.value === '' || input.validity.badInput || !Number.isInteger(input.valueAsNumber) || !input.checkValidity()) {
        input.setAttribute('aria-invalid', 'true');
        input.reportValidity();
        return;
      }
      var requested = input.valueAsNumber, delta = requested - currentAdeptness(index);
      if (delta) window.CalcSet('Skill', index, delta, 'Adeptness');
      rebuildLearningList();
      input.value = String(currentAdeptness(index));
      input.removeAttribute('aria-invalid');
      refresh();
    }
    input.addEventListener('input', function () { input.removeAttribute('aria-invalid'); });
    input.addEventListener('blur', function () { if (input.value !== String(currentAdeptness(index))) commit(); });
    input.addEventListener('keydown', function (event) {
      event.stopPropagation();
      if (event.key === 'Enter') { event.preventDefault(); commit(); }
      else if (event.key === 'Escape') { event.preventDefault(); cancel(); input.blur(); }
    });
    input.addEventListener('keypress', function (event) { event.stopPropagation(); });
    input.addEventListener('keyup', function (event) { event.stopPropagation(); });
    syncSkillInput(input);
    return input;
  }

  function group(row, index, mode, value) {
    var holder = document.createElement('li'); holder.dataset.remakedSkillGroup = mode;
    var list = document.createElement('ul'); holder.appendChild(list);
    list.setAttribute('role', 'group');
    var caption = document.createElement('li'); caption.dataset.remakedSkillCaption = mode;
    caption.id = 'remaked-skill-' + index + '-' + mode.toLowerCase() + '-label';
    list.appendChild(caption);
    if (mode === 'Adeptness') {
      list.appendChild(value);
      list.appendChild(adeptnessInput(index, value, caption));
    } else {
      value.dataset.remakedSkillPotentialValue = String(index);
      value.setAttribute('aria-live', 'polite');
      list.appendChild(value);
    }
    row.appendChild(holder);
  }

  function decorate() {
    var root = byId('SkillSet');
    if (!root || !i18n || !root.closest('[data-remaked-calculator-main]')) return;
    var skillPanel = byId('Tab_1_1'), skillRow = byId('remaked-skill-list-row');
    if (!skillRow && !skillPanel.hasAttribute('data-remaked-native-panel')) {
      skillRow = document.createElement('ul'); skillRow.id = 'remaked-skill-list-row';
      root.parentElement.after(skillRow); skillRow.appendChild(skillPanel);
    }
    if (skillRow) skillRow.hidden = skillPanel.style.display === 'none';
    if (!root.hasAttribute('data-remaked-skill-controls')) {
      root.setAttribute('data-remaked-skill-controls', '');
      var potentialLabel = byId('StatusUnP_0').closest('.input_gt').previousElementSibling;
      potentialLabel.id = 'remaked-potential-budget-label'; i18n.bindText(potentialLabel, 'skills.potential');
      var tools = document.createElement('div'); tools.className = 'remaked-skill-tools';
      var actions = document.createElement('div'); actions.className = 'remaked-skill-tools-actions';
      var title = document.createElement('h2'); title.id = 'remaked-workbench-skills-title';
      title.className = 'remaked-workbench-title'; title.dataset.remakedWorkbenchTitle = 'skills';
      i18n.bindText(title, 'workbench.skills'); actions.appendChild(title);
      root.setAttribute('role', 'group'); root.setAttribute('aria-labelledby', title.id);
      var explanation = document.createElement('details'); explanation.className = 'remaked-skill-help';
      var summary = document.createElement('summary'); summary.textContent = '?';
      i18n.bindAttribute(summary, 'aria-label', 'skills.help'); explanation.appendChild(summary);
      var help = document.createElement('p'); i18n.bindText(help, 'skills.help'); explanation.appendChild(help);
      actions.appendChild(explanation); tools.appendChild(actions); root.prepend(tools);
      var columns = document.createElement('div'); columns.dataset.remakedSkillColumnHeader = '';
      columns.appendChild(document.createElement('span'));
      ['skills.adeptness', 'skills.potential'].forEach(function (key) {
        var caption = document.createElement('span'); i18n.bindText(caption, key); columns.appendChild(caption);
      });
      // A wide desktop workspace has two native branch columns. Repeat only
      // their presentation headings; source rows, callbacks and tab order stay
      // untouched. These cells are hidden in the single-column/mobile layout.
      ['', 'skills.adeptness', 'skills.potential'].forEach(function (key) {
        var caption = document.createElement('span'); caption.dataset.remakedSkillColumnCopy = '';
        if (key) i18n.bindText(caption, key); columns.appendChild(caption);
      }); tools.appendChild(columns);
    }
    for (var index = 0; index < 25; index++) {
      var label = byId('TextSkill_' + index), row = label.closest('#SkillSet > ul');
      if (row.hasAttribute('data-remaked-skill-row')) continue;
      row.dataset.remakedSkillRow = String(index);
      if ([0, 6, 12, 17, 22].indexOf(index) !== -1) {
        row.classList.add('remaked-skill-heading'); continue;
      }
      var source = label.nextElementSibling;
      group(row, index, 'Adeptness', byId('Skill_' + index + '_1'));
      group(row, index, 'Potential', byId('Skill_' + index + '_2'));
      source.hidden = true;
    }
    for (var tab = 0; tab < 2; tab++) {
      var sourceTab = byId('EfTab_' + tab);
      if (sourceTab.querySelector('[data-remaked-effect]')) continue;
      var callback = sourceTab.onmouseover;
      var button = document.createElement('button'); button.type = 'button';
      button.className = 'remaked-calculator-action'; button.dataset.remakedEffect = String(tab);
      // Keep the original function, but require deliberate activation in Modern.
      sourceTab.removeAttribute('onmouseover');
      (function (source, retained, control) {
        control.addEventListener('click', function (event) {
          event.stopPropagation(); retained.call(source, event); refresh();
        });
      })(sourceTab, callback, button);
      sourceTab.firstElementChild.hidden = true; sourceTab.appendChild(button);
      sourceTab.parentElement.parentElement.dataset.remakedEffectTabs = '';
    }
    ['SkillView', 'POTView'].forEach(function (id) {
      byId(id).querySelectorAll(':scope > ul').forEach(function (row) {
        if (row.firstElementChild?.id) row.dataset.remakedEffectRow = '';
      });
    });
  }

  function refresh() {
    if (observer) observer.disconnect();
    try {
      decorate();
      if (namespace.gameTermDisplay) namespace.gameTermDisplay.refresh();
      catalogSkills();
      document.querySelectorAll('[data-remaked-skill-caption]').forEach(function (caption) {
        var mode = caption.dataset.remakedSkillCaption;
        text(caption, i18n.t('skills.' + mode.toLowerCase()));
        var label = caption.closest('[data-remaked-skill-row]').firstElementChild.textContent.trim();
        caption.parentElement.setAttribute('aria-label', label + ' ' + caption.textContent);
      });
      document.querySelectorAll('[data-remaked-skill-number]').forEach(syncSkillInput);
      document.querySelectorAll('[data-remaked-effect]').forEach(function (button) {
        text(button, byId('Text_' + (17 + Number(button.dataset.remakedEffect))).textContent);
        button.setAttribute('aria-pressed', String(Number(button.dataset.remakedEffect) === Number(window.Flag[8])));
      });
    } finally {
      if (observer) observer.observe(byId('body'), { subtree: true, childList: true, characterData: true,
        attributes: true, attributeFilter: ['class', 'title', 'disabled'] });
    }
  }
  function schedule() { if (!timer) timer = setTimeout(function () { timer = null; refresh(); }, 16); }
  function init() {
    // The old fixed float canvas cannot safely contain taller branch rows.
    // If the layout enhancement failed, keep the complete original UI usable.
    if (byId('SkillSet')?.closest('[data-remaked-calculator-main]')) {
      observer = new MutationObserver(schedule); refresh();
    }
  }
  namespace.skillControls = { refresh: refresh };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
})();
