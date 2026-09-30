(function () {
  'use strict';

  var namespace = window.PandoraRemaked = window.PandoraRemaked || {};
  var i18n = namespace.i18n;
  var observer, body, timer;
  var hasDecorated = false;
  var labels;

  function byId(id) { return document.getElementById(id); }

  // Translate display leaves only. Source arrays, selected values and Legacy
  // handlers are never replaced. Workbook input is always literal text, not HTML.
  function decorate(node, id, sourceHtml, prefixHtml, suffixHtml, alwaysSource) {
    if (!node) return;
    var translated = i18n.game(id, '');
    if (!translated && !node._remakedGameDisplay && !alwaysSource) return;
    var source = document.createElement('span');
    source.innerHTML = String(sourceHtml == null ? '' : sourceHtml);
    var previous = node._remakedGameDisplay;
    if (translated) {
      if (!previous) {
        previous = { title: node.getAttribute('title'), implicitValue: node.tagName === 'OPTION' && !node.hasAttribute('value') };
        // An option without a value attribute derives its value from its text.
        // Preserve that value while changing only the displayed translation.
        if (previous.implicitValue) node.setAttribute('value', node.value);
      }
      previous.sourceText = source.textContent.trim();
      var label = source.querySelector('.help') || source;
      var hint = label.getAttribute('title');
      var prefix = document.createElement('span');
      prefix.innerHTML = prefixHtml || '';
      var suffix = document.createElement('span'); suffix.innerHTML = suffixHtml || '';
      label.textContent = prefix.textContent + translated + suffix.textContent;
      if (hint) label.title = translated + '\n' + hint;
      node._remakedGameDisplay = previous;
      node.dataset.remakedGameName = id;
      if (node.title !== translated) node.title = translated;
      hasDecorated = true;
    } else if (previous) {
      if (previous.title == null) node.removeAttribute('title');
      else node.setAttribute('title', previous.title);
      if (previous.implicitValue) node.removeAttribute('value');
      delete node._remakedGameDisplay;
      delete node.dataset.remakedGameName;
    }
    var sourceHelp = source.childNodes.length === 1 && source.firstElementChild;
    var currentHelp = node.childNodes.length === 1 && node.firstElementChild;
    if (sourceHelp && currentHelp && sourceHelp.matches('.help') && currentHelp.matches('.help') && sourceHelp.tagName === currentHelp.tagName) {
      // Keep focus, listeners and attributes installed by other Modern adapters.
      if (currentHelp.textContent !== sourceHelp.textContent) currentHelp.textContent = sourceHelp.textContent;
      if (sourceHelp.hasAttribute('title')) currentHelp.title = sourceHelp.title;
      else currentHelp.removeAttribute('title');
    } else if (node.innerHTML !== source.innerHTML) node.innerHTML = source.innerHTML;
  }

  function options(select, map) {
    if (!select) return;
    Array.prototype.forEach.call(select.options, function (option, index) {
      var term = map(option, index);
      if (term) decorate(option, term.id, term.source, term.prefix);
    });
  }

  function shortSkill(name) {
    if (name.length < 5) return name;
    var span = document.createElement('span');
    span.className = 'help'; span.title = name; span.textContent = name.slice(0, 4);
    return span.outerHTML;
  }

  function observe() {
    if (observer && body) observer.observe(body, { subtree: true, childList: true, characterData: true });
  }

  function refresh() {
    if (!i18n || !window.Name || !window.Status || !window.Flag) return;
    if (observer) observer.disconnect();
    try {
      var language = Number(window.Flag[0]);
      var race = Number(window.Status.Job[0]);
      var racialSkill = Number(window.Status.Job[1]);
      var job = Number(window.Status.Job[2]);
      var names = window.Name;
      if (!labels && namespace.calculatorLabels) labels = namespace.calculatorLabels.collect();
      var gameCatalogs = window.PandoraRemakedGameTerms || {};
      var inactive = !hasDecorated && !Object.keys(gameCatalogs[i18n.getLocale()] || {}).length
        && !(language === 1 && Object.keys(gameCatalogs.en || {}).length) && !namespace.catalog?.hasOverrides();
      (labels || []).forEach(function (row) {
        row.targets.forEach(function (target) {
          if (inactive && !target.alwaysSource) return;
          document.querySelectorAll(target.selector).forEach(function (node) {
            if (target.previousLabel) node = node.closest('li')?.previousElementSibling;
            if (target.priorHeader) node = node.closest('ul')?.previousElementSibling?.querySelector(target.priorHeader);
            if (!node) return;
            var sourceHtml = (target.sourceValues || row.values)[language] || (target.fallbackEnglish ? row.values[1] : '');
            if (target.attribute) {
              var approved = i18n.game(row.id, '');
              if (approved || node._remakedGameAttribute) {
                node.setAttribute(target.attribute, approved || sourceHtml);
                if (target.extraAttribute) node.setAttribute(target.extraAttribute, approved || sourceHtml);
                node._remakedGameAttribute = Boolean(approved);
                if (approved) hasDecorated = true;
              }
              return;
            }
            if (target.dynamicSuffix) {
              var source = document.createElement('span'); source.innerHTML = sourceHtml;
              var record = node._remakedUnitDisplay;
              if (!record || node.textContent !== record.rendered) {
                if (!node.textContent.endsWith(source.textContent)) return;
                record = { prefix: node.textContent.slice(0, -source.textContent.length) };
              }
              decorate(node, row.id, record.prefix + sourceHtml, record.prefix);
              record.rendered = node.textContent;
              node._remakedUnitDisplay = record;
              return;
            }
            if (row.hint) {
              var help = node.querySelector('[title]') || node;
              var translated = i18n.game(row.id, '');
              if (translated || help._remakedGameHint) {
                help.title = translated || sourceHtml;
                help._remakedGameHint = Boolean(translated);
                if (translated) hasDecorated = true;
              }
            } else decorate(node, row.id, (target.prefix || '') + sourceHtml + (target.suffix || ''), target.prefix, target.suffix, target.alwaysSource);
          });
        });
      });
      names.Skill.forEach(function (entry, index) {
        var node = byId('TextSkill_' + index), full = entry[language + 1];
        var expanded = Boolean(node?.closest('[data-remaked-skill-controls]'));
        var heading = !expanded && language === 1 && [0, 6, 12, 17, 22].indexOf(index) === -1 ? shortSkill(full) : full;
        if (!inactive || expanded) decorate(node, 'skill.' + index, heading, '', '', expanded);
        if (!inactive) decorate(byId('TextFile_' + (index + 9)), 'skill.' + index, shortSkill(full));
      });
      if (inactive) return;
      decorate(byId('StatusRace'), 'race.' + race, names.Race[race][language]);
      decorate(byId('StatusRSkill'), 'racial_skill.' + race + '.' + racialSkill, names.Race.Skill[race][racialSkill][language]);
      decorate(byId('StatusJob'), 'job.' + job, names.Job[job][language + 2]);
      options(byId('SelRace'), function (option) {
        return { id: 'race.' + option.value, source: names.Race[option.value][language] };
      });
      options(byId('SelRSkill'), function (option) {
        return { id: 'racial_skill.' + race + '.' + option.value, source: names.Race.Skill[race][option.value][language] };
      });
      options(byId('SelJob'), function (option) {
        var index = Number(option.value);
        var id = 'job.' + index;
        var prefix = names.Job.Sel[index][language];
        decorate(option, id, prefix + names.Job[index][language + 2], prefix);
        return null;
      });
      document.querySelectorAll('select[id^="SelEquip_"]').forEach(function (select) {
        var match = select.id.match(/^SelEquip_(\d+)_(\d+)$/);
        if (!match) return;
        var field = Number(match[2]);
        if (field === 0) options(select, function (option) {
          var category = Math.floor(Number(option.value) / 10000);
          var index = Number(option.value) % 10000;
          var entry = window.EquipData[language][category][index];
          var id = index ? 'equipment.' + category + '.' + index : 'equipment_category.' + category;
          var prefix = index ? 'Lv:' + window.zeroPadding(2, 1, window.EquipData[0][category][index][4]) + ' '
            : entry[0].replace(/[^+\-\s].*$/, '');
          decorate(option, id, index ? prefix + entry[0] : entry[0], prefix);
          return null;
        });
        else if (field >= 4 && field <= 6) options(select, function (option) {
          var source = window.SoulData[language][option.value][0];
          return { id: 'soul.' + option.value, source: source,
            prefix: Number(option.value) === 0 ? source.replace(/[^+\-\s].*$/, '') : '' };
        });
      });
      document.querySelectorAll('[id^="LearnSkill_"]').forEach(function (popup) {
        var match = popup.id.match(/^LearnSkill_(\d+)_(\d+)$/);
        if (!match) return;
        var category = Number(match[1]), entry = Number(match[2]);
        decorate(popup.querySelector('ul:first-child > li'), 'skill_entry.' + category + '.' + entry, window.Skill[language][category][entry][0]);
        decorate(popup.querySelector('ul:nth-child(2) > li:first-child'), 'skill.' + category, names.Skill[category][language + 1]);
      });
      [5, 0, 10, 2, 9].forEach(function (entry, index) {
        decorate(byId('ViewHeal_' + index + '_0'), 'skill_entry.13.' + entry, names.Text.Skill.Heal[index][language]);
      });
      [[14, 3], [14, 4], [14, 6], [15, 8], [20, 3], null, null, [16, 0], [16, 2]].forEach(function (term, index) {
        if (term) decorate(byId('ViewBuff_' + index + '_0'), 'skill_entry.' + term[0] + '.' + term[1], names.Text.Skill.Buff[index][language + 1]);
      });
      [[8, 1], [8, 5]].forEach(function (term, index) {
        decorate(byId('ViewOther_' + index + '_0'), 'skill_entry.' + term[0] + '.' + term[1], names.Text.Skill.Other[index][language + 1]);
      });
      document.querySelectorAll('[id^="Buff_"] [id^="TextBuff_"]').forEach(function (label) {
        var match = label.parentElement.id.match(/^Buff_(\d+)_(\d+)$/);
        if (!match || Number(match[1]) === 30) return; // Rune names belong to interface export.
        var index = Number(label.id.split('_')[1]);
        decorate(label, 'skill_entry.' + match[1] + '.' + match[2], names.Text.Buff[index][language]);
      });
      document.querySelectorAll('.remaked-mobile-card-label').forEach(function (label) {
        var head = label.closest('.sub_win')?.querySelector('.head');
        if (head && label.textContent !== head.textContent) label.textContent = head.textContent;
        if (head && label.title !== head.textContent) label.title = head.textContent;
      });
      if (i18n.getLocale() !== 'ru') hasDecorated = false;
    } finally {
      observe();
    }
  }

  function schedule() {
    if (timer) return;
    timer = window.setTimeout(function () { timer = null; refresh(); }, 16);
  }

  function init() {
    body = byId('body');
    if (!body) return;
    observer = new MutationObserver(schedule);
    observe();
    body.addEventListener('change', schedule, true);
    body.addEventListener('input', schedule, true);
    refresh();
  }

  namespace.gameTermDisplay = { refresh: refresh };
  // i18n.setLocale refreshes this projection before notifying DOM consumers.
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
})();
