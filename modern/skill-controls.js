(function () {
  'use strict';
  var namespace = window.PandoraRemaked = window.PandoraRemaked || {};
  var i18n = namespace.i18n, observer, timer;
  function byId(id) { return document.getElementById(id); }
  function text(node, value) { if (node.textContent !== value) node.textContent = value; }

  function group(row, index, mode, value) {
    var holder = document.createElement('li'); holder.dataset.remakedSkillGroup = mode;
    var list = document.createElement('ul'); holder.appendChild(list);
    list.setAttribute('role', 'group');
    var caption = document.createElement('li'); caption.dataset.remakedSkillCaption = mode;
    list.appendChild(caption); list.appendChild(value);
    var steps = document.createElement('li'); steps.className = 'remaked-skill-primary';
    var bulk = document.createElement('li'); bulk.className = 'remaked-skill-bulk';
    list.appendChild(steps); list.appendChild(bulk);
    var inputs = row.querySelectorAll('input[type="image"]');
    Array.prototype.forEach.call(inputs, function (source) {
      if (source.getAttribute('onclick').indexOf("'" + mode + "'") === -1) return;
      var stem = source.src.match(/\/(left|right)[123]\.png$/)[0].slice(1, -4);
      source.id = 'remaked-skill-' + index + '-' + mode + '-' + stem;
      var button = document.createElement('button'); button.type = 'button';
      button.className = 'remaked-calculator-step'; button.dataset.remakedSkillStep = source.id;
      button.addEventListener('click', function (event) {
        event.stopPropagation();
        // The retained callback owns costs, class defaults, limits, skill
        // unlocks and recalculation. No copied inline code or new formula.
        source.click(); refresh();
      });
      (stem.endsWith('1') ? steps : bulk).appendChild(button);
    });
    if (mode === 'Potential') {
      var indicator = document.createElement('li'); indicator.className = 'remaked-skill-indicator remaked-skill-bulk';
      var indicatorList = document.createElement('ul'); indicator.appendChild(indicatorList);
      var label = document.createElement('li'); i18n.bindText(label, 'skills.indicator');
      indicatorList.appendChild(label); indicatorList.appendChild(byId('Skill_' + index + '_3'));
      list.appendChild(indicator);
    }
    row.appendChild(holder);
  }

  function decorate() {
    var root = byId('SkillSet');
    if (!root || !i18n || !root.closest('[data-remaked-calculator-main]')) return;
    if (!root.hasAttribute('data-remaked-skill-controls')) {
      root.setAttribute('data-remaked-skill-controls', '');
      var potentialLabel = byId('StatusUnP_0').closest('.input_gt').previousElementSibling;
      potentialLabel.id = 'remaked-potential-budget-label'; i18n.bindText(potentialLabel, 'skills.potential');
      var tools = document.createElement('div'); tools.className = 'remaked-skill-tools';
      var toggle = document.createElement('button'); toggle.type = 'button';
      toggle.className = 'remaked-calculator-action'; toggle.dataset.remakedSkillBulk = '';
      toggle.setAttribute('aria-pressed', 'false'); i18n.bindText(toggle, 'skills.largerSteps');
      toggle.addEventListener('click', function () {
        var show = this.getAttribute('aria-pressed') !== 'true';
        this.setAttribute('aria-pressed', String(show)); root.dataset.remakedSkillExpanded = String(show);
      });
      var help = document.createElement('p'); i18n.bindText(help, 'skills.help');
      tools.appendChild(toggle); tools.appendChild(help); root.prepend(tools);
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
      document.querySelectorAll('[data-remaked-skill-caption]').forEach(function (caption) {
        var mode = caption.dataset.remakedSkillCaption;
        text(caption, i18n.t('skills.' + mode.toLowerCase()));
        var label = caption.closest('[data-remaked-skill-row]').firstElementChild.textContent.trim();
        caption.parentElement.setAttribute('aria-label', label + ' ' + caption.textContent);
      });
      document.querySelectorAll('[data-remaked-skill-step]').forEach(function (button) {
        var source = byId(button.dataset.remakedSkillStep), title = source.title || source.alt;
        text(button, title);
        button.setAttribute('aria-label', button.closest('[role="group"]').getAttribute('aria-label') + ' ' + title);
        button.disabled = source.disabled;
      });
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
