(function () {
  'use strict';

  var namespace = window.PandoraRemaked = window.PandoraRemaked || {};
  var adapter = namespace.adapter;
  var i18n = namespace.i18n;
  var summary = null;
  var observer = null;
  var refreshTimer = null;
  var initialized = false;

  function t(key, values, fallback) {
    return i18n && typeof i18n.t === 'function' ? i18n.t(key, values) : fallback;
  }

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
    if (i18n && typeof i18n.bindAttribute === 'function') i18n.bindAttribute(summary, 'aria-label', 'mobile.summary');
    else summary.setAttribute('aria-label', 'Current character summary');

    var identity = document.createElement('div');
    identity.className = 'remaked-mobile-summary-identity';
    identity.appendChild(textNode('strong', 'remaked-mobile-summary-race', 'data-remaked-summary-race'));
    identity.appendChild(textNode('span', 'remaked-mobile-summary-job', 'data-remaked-summary-job'));
    identity.appendChild(textNode('span', 'remaked-mobile-summary-level', 'data-remaked-summary-level'));
    summary.appendChild(identity);

    var stats = document.createElement('div');
    stats.className = 'remaked-mobile-summary-stats';

    function addStat(label, dataName, key) {
      var card = document.createElement('div');
      card.className = 'remaked-mobile-summary-stat';
      var name = document.createElement('span');
      if (i18n && typeof i18n.bindText === 'function') i18n.bindText(name, key);
      else name.textContent = label;
      var value = textNode('strong', 'remaked-mobile-summary-value', dataName);
      card.appendChild(name);
      card.appendChild(value);
      stats.appendChild(card);
    }

    addStat('LP / HP', 'data-remaked-summary-lp', 'mobile.stat.lp');
    addStat('ATK', 'data-remaked-summary-atk', 'mobile.stat.atk');
    addStat('DEF', 'data-remaked-summary-def', 'mobile.stat.def');
    summary.appendChild(stats);

    shell.insertBefore(summary, frame);
    return summary;
  }

  function setText(selector, value) {
    if (!summary) return;
    var node = summary.querySelector(selector);
    if (node) {
      node.textContent = value == null || value === '' ? '—' : String(value);
      if (selector === '[data-remaked-summary-race]' || selector === '[data-remaked-summary-job]') node.title = node.textContent;
    }
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
      setText('[data-remaked-summary-level]', metadata.level == null ? t('mobile.level', { level: '—' }, 'Lv. —') : t('mobile.level', { level: metadata.level }, 'Lv. ' + metadata.level));
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

  function firstLegacyHead(card) {
    return card.querySelector('.head');
  }

  function createMobileCardBar(card, legacyHead) {
    var existing = null;
    for (var childIndex = 0; childIndex < card.children.length; childIndex += 1) {
      var child = card.children[childIndex];
      if (child.classList && child.classList.contains('remaked-mobile-card-bar')) {
        existing = child;
        break;
      }
    }
    if (existing) return existing;

    var bar = document.createElement('div');
    bar.className = 'remaked-mobile-card-bar';
    bar.dataset.remakedMobileCardBar = '';

    var label = document.createElement('span');
    label.className = 'remaked-mobile-card-label';
    label.textContent = (legacyHead.textContent || '').trim() || t('mobile.section', null, 'Section');
    bar.appendChild(label);

    var toggle = document.createElement('button');
    toggle.type = 'button';
    toggle.className = 'remaked-collapse-toggle';
    toggle.dataset.remakedCollapseToggle = '';
    toggle.setAttribute('aria-expanded', 'true');
    if (i18n && typeof i18n.bindAttribute === 'function') i18n.bindAttribute(toggle, 'aria-label', 'mobile.collapse');
    else toggle.setAttribute('aria-label', 'Collapse section');
    toggle.textContent = '⌃';
    toggle.addEventListener('click', function () {
      var nextCollapsed = card.dataset.remakedCollapsed !== 'true';
      card.dataset.remakedCollapsed = nextCollapsed ? 'true' : 'false';
      toggle.setAttribute('aria-expanded', nextCollapsed ? 'false' : 'true');
      if (i18n && typeof i18n.bindAttribute === 'function') {
        i18n.bindAttribute(toggle, 'aria-label', nextCollapsed ? 'mobile.expand' : 'mobile.collapse');
      } else {
        toggle.setAttribute('aria-label', nextCollapsed ? 'Expand section' : 'Collapse section');
      }
      toggle.textContent = nextCollapsed ? '⌄' : '⌃';
    });
    bar.appendChild(toggle);
    card.insertBefore(bar, card.firstChild);
    return bar;
  }

  function decorateCollapsibles() {
    var cards = document.querySelectorAll('#body .sub_win');
    for (var index = 0; index < cards.length; index += 1) {
      var card = cards[index];
      var head = firstLegacyHead(card);
      if (!head) continue;
      createMobileCardBar(card, head);
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

  window.addEventListener('pandora-remaked:localechange', function () {
    if (summary && i18n && typeof i18n.apply === 'function') i18n.apply(summary);
    refreshSummary();
  });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})();
