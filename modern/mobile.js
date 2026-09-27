(function () {
  'use strict';

  var namespace = window.PandoraRemaked = window.PandoraRemaked || {};
  var adapter = namespace.adapter;
  var summary = null;
  var observer = null;
  var refreshTimer = null;
  var initialized = false;

  function findSummaryField(fields, key) {
    for (var index = 0; index < fields.length; index += 1) {
      if (fields[index].key === key) return fields[index];
    }
    return null;
  }

  function textNode(tag, className, dataName) {
    var node = document.createElement(tag);
    node.className = className;
    node.setAttribute(dataName, '');
    return node;
  }

  function createSummary() {
    if (summary) return summary;
    var shell = document.querySelector('[data-remaked-shell]');
    var frame = shell && shell.querySelector('.remaked-app-frame');
    if (!shell || !frame) return null;

    summary = document.createElement('section');
    summary.className = 'remaked-mobile-summary';
    summary.dataset.remakedMobileSummary = '';
    summary.setAttribute('aria-label', 'Current character summary');

    var identity = document.createElement('div');
    identity.className = 'remaked-mobile-summary-identity';
    identity.appendChild(textNode('strong', 'remaked-mobile-summary-race', 'data-remaked-summary-race'));
    identity.appendChild(textNode('span', 'remaked-mobile-summary-job', 'data-remaked-summary-job'));
    identity.appendChild(textNode('span', 'remaked-mobile-summary-level', 'data-remaked-summary-level'));
    summary.appendChild(identity);

    var stats = document.createElement('div');
    stats.className = 'remaked-mobile-summary-stats';

    function addStat(label, dataName) {
      var card = document.createElement('div');
      card.className = 'remaked-mobile-summary-stat';
      var name = document.createElement('span');
      name.textContent = label;
      var value = textNode('strong', 'remaked-mobile-summary-value', dataName);
      card.appendChild(name);
      card.appendChild(value);
      stats.appendChild(card);
    }

    addStat('LP / HP', 'data-remaked-summary-lp');
    addStat('ATK', 'data-remaked-summary-atk');
    addStat('DEF', 'data-remaked-summary-def');
    summary.appendChild(stats);

    shell.insertBefore(summary, frame);
    return summary;
  }

  function setText(selector, value) {
    if (!summary) return;
    var node = summary.querySelector(selector);
    if (node) node.textContent = value == null || value === '' ? '—' : String(value);
  }

  function refreshSummary() {
    if (!adapter || typeof adapter.readCharacterMetadata !== 'function' || typeof adapter.readCalculatedSummary !== 'function') return;
    if (!createSummary()) return;
    try {
      var metadata = adapter.readCharacterMetadata();
      var fields = adapter.readCalculatedSummary();
      var lp = findSummaryField(fields, 'lp');
      var attack = findSummaryField(fields, 'physicalAttack');
      var defense = findSummaryField(fields, 'defense');
      setText('[data-remaked-summary-race]', metadata.race);
      setText('[data-remaked-summary-job]', metadata.job);
      setText('[data-remaked-summary-level]', metadata.level == null ? 'Lv. —' : 'Lv. ' + metadata.level);
      setText('[data-remaked-summary-lp]', lp ? lp.display : '—');
      setText('[data-remaked-summary-atk]', attack ? attack.display : '—');
      setText('[data-remaked-summary-def]', defense ? defense.display : '—');
    } catch (error) {
      // Mobile presentation must never block the preserved calculator.
    }
  }

  function scheduleRefresh() {
    if (refreshTimer !== null) window.clearTimeout(refreshTimer);
    refreshTimer = window.setTimeout(function () {
      refreshTimer = null;
      refreshSummary();
    }, 40);
  }

  function directHead(card) {
    for (var index = 0; index < card.children.length; index += 1) {
      var child = card.children[index];
      if (child.classList && child.classList.contains('head')) return child;
    }
    return null;
  }

  function decorateCollapsibles() {
    var cards = document.querySelectorAll('#body .sub_win');
    for (var index = 0; index < cards.length; index += 1) {
      var card = cards[index];
      var head = directHead(card);
      if (!head || head.querySelector('[data-remaked-collapse-toggle]')) continue;

      var toggle = document.createElement('button');
      toggle.type = 'button';
      toggle.className = 'remaked-collapse-toggle';
      toggle.dataset.remakedCollapseToggle = '';
      toggle.setAttribute('aria-expanded', 'true');
      toggle.setAttribute('aria-label', 'Collapse section');
      toggle.textContent = '⌃';
      toggle.addEventListener('click', (function (targetCard, targetToggle) {
        return function () {
          var collapsed = targetCard.dataset.remakedCollapsed === 'true';
          var nextCollapsed = !collapsed;
          targetCard.dataset.remakedCollapsed = nextCollapsed ? 'true' : 'false';
          targetToggle.setAttribute('aria-expanded', nextCollapsed ? 'false' : 'true');
          targetToggle.setAttribute('aria-label', nextCollapsed ? 'Expand section' : 'Collapse section');
          targetToggle.textContent = nextCollapsed ? '⌄' : '⌃';
        };
      })(card, toggle));
      head.appendChild(toggle);
    }
  }

  function classifyEquipmentField(select) {
    var match = String(select.id || '').match(/^SelEquip_(\d+)_(\d+)$/);
    if (!match) return null;
    var fieldIndex = Number(match[2]);
    if (fieldIndex === 0) return 'main';
    if (fieldIndex >= 4 && fieldIndex <= 6) return 'soul';
    return 'modifier';
  }

  function decorateEquipmentRows() {
    var selects = document.querySelectorAll('#body select[id^="SelEquip_"]');
    for (var index = 0; index < selects.length; index += 1) {
      var select = selects[index];
      var kind = classifyEquipmentField(select);
      if (!kind) continue;

      var row = select.closest('li') || select.parentElement;
      if (!row) continue;
      row.dataset.remakedEquipmentRow = '';
      row.dataset.remakedEquipmentKind = kind;

      var line = row.parentElement;
      while (line && line !== document.body && line.tagName !== 'UL') line = line.parentElement;
      if (line && line.tagName === 'UL') line.dataset.remakedEquipmentLine = '';
    }
  }

  function observeLegacyBody() {
    var body = document.getElementById('body');
    if (!body || typeof MutationObserver !== 'function') return;
    if (observer) observer.disconnect();
    observer = new MutationObserver(scheduleRefresh);
    observer.observe(body, {
      subtree: true,
      childList: true,
      characterData: true,
      attributes: true,
      attributeFilter: ['value', 'selected']
    });
    body.addEventListener('change', scheduleRefresh, true);
    body.addEventListener('input', scheduleRefresh, true);
  }

  function init() {
    if (initialized) {
      refreshSummary();
      decorateCollapsibles();
      decorateEquipmentRows();
      return;
    }
    if (!adapter) return;
    initialized = true;
    createSummary();
    decorateCollapsibles();
    decorateEquipmentRows();
    refreshSummary();
    observeLegacyBody();
  }

  namespace.mobile = {
    init: init,
    refreshSummary: refreshSummary,
    decorateCollapsibles: decorateCollapsibles,
    decorateEquipmentRows: decorateEquipmentRows
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})();
