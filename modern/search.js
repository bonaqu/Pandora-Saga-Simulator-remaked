(function () {
  'use strict';

  var namespace = window.PandoraRemaked = window.PandoraRemaked || {};
  var adapter = namespace.adapter;
  var active = null;

  function normalizeQuery(value) {
    return String(value == null ? '' : value).normalize('NFKC').trim().toLowerCase();
  }

  function parseOptionalLevel(value) {
    var text = String(value == null ? '' : value).trim();
    if (!text) return null;
    var parsed = Number(text);
    return Number.isFinite(parsed) ? parsed : null;
  }

  function filterEquipment(options, filters) {
    var query = normalizeQuery(filters && filters.query);
    var minLevel = parseOptionalLevel(filters && filters.minLevel);
    var maxLevel = parseOptionalLevel(filters && filters.maxLevel);
    return (options || []).filter(function (option) {
      if (query && normalizeQuery(option.name).indexOf(query) === -1) return false;
      if (minLevel != null || maxLevel != null) {
        if (option.level == null) return false;
        if (minLevel != null && option.level < minLevel) return false;
        if (maxLevel != null && option.level > maxLevel) return false;
      }
      return true;
    });
  }

  function element(tag, className, text) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (typeof text === 'string') node.textContent = text;
    return node;
  }

  function closePanel(options) {
    if (!active) return;
    var current = active;
    active = null;
    document.removeEventListener('keydown', current.onKeydown, true);
    current.backdrop.remove();
    if (!options || options.restoreFocus !== false) {
      if (current.returnFocus && document.contains(current.returnFocus) && typeof current.returnFocus.focus === 'function') {
        current.returnFocus.focus();
      }
    }
  }

  function onEscape(event) {
    if (event.key !== 'Escape' || !active) return;
    event.preventDefault();
    closePanel();
  }

  function createShell(kind, title, trigger) {
    closePanel({ restoreFocus: false });

    var backdrop = element('div', 'remaked-search-backdrop');
    backdrop.dataset.remakedSearchBackdrop = '';

    var panel = element('section', 'remaked-search-panel');
    panel.dataset.remakedSearchPanel = '';
    panel.dataset.searchKind = kind;
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-modal', 'true');
    panel.setAttribute('aria-labelledby', 'remaked-search-title');

    var header = element('div', 'remaked-search-header');
    var headingWrap = element('div', 'remaked-search-heading');
    var eyebrow = element('span', 'remaked-search-eyebrow', kind === 'equipment' ? 'Equipment' : 'Soul');
    var heading = element('h2', '', title);
    heading.id = 'remaked-search-title';
    headingWrap.appendChild(eyebrow);
    headingWrap.appendChild(heading);

    var close = element('button', 'remaked-search-close', 'Close search');
    close.type = 'button';
    close.setAttribute('aria-label', 'Close search');
    close.addEventListener('click', function () { closePanel(); });

    header.appendChild(headingWrap);
    header.appendChild(close);
    panel.appendChild(header);

    var body = element('div', 'remaked-search-body');
    panel.appendChild(body);
    backdrop.appendChild(panel);
    document.body.appendChild(backdrop);

    backdrop.addEventListener('mousedown', function (event) {
      if (event.target === backdrop) closePanel();
    });

    var returnFocus = trigger && typeof trigger.focus === 'function' ? trigger : document.activeElement;
    active = { backdrop: backdrop, panel: panel, returnFocus: returnFocus, onKeydown: onEscape };
    document.addEventListener('keydown', onEscape, true);
    return { backdrop: backdrop, panel: panel, body: body };
  }

  function field(labelText, control) {
    var wrapper = element('label', 'remaked-search-field');
    wrapper.appendChild(element('span', 'remaked-search-label', labelText));
    wrapper.appendChild(control);
    return wrapper;
  }

  function targetSelect(targets, kind, preferred) {
    var select = element('select', 'remaked-search-select');
    select.dataset.remakedSearchTarget = '';
    targets.forEach(function (target) {
      var option = document.createElement('option');
      option.value = kind === 'equipment'
        ? String(target.slotIndex)
        : String(target.slotIndex) + ':' + String(target.socketIndex);
      option.textContent = target.label;
      select.appendChild(option);
    });

    if (preferred != null) {
      var preferredValue = kind === 'equipment'
        ? String(preferred)
        : String(preferred.slotIndex) + ':' + String(preferred.socketIndex);
      for (var index = 0; index < select.options.length; index += 1) {
        if (select.options[index].value === preferredValue) {
          select.value = preferredValue;
          break;
        }
      }
    }
    return select;
  }

  function queryInput(placeholder) {
    var input = element('input', 'remaked-search-input');
    input.type = 'search';
    input.autocomplete = 'off';
    input.spellcheck = false;
    input.placeholder = placeholder;
    input.dataset.remakedSearchQuery = '';
    return input;
  }

  function resultButton(option, detail) {
    var button = element('button', 'remaked-search-result');
    button.type = 'button';
    button.dataset.remakedSearchResult = '';
    button.dataset.value = String(option.value);

    var name = element('span', 'remaked-search-result-name', option.name || '—');
    button.appendChild(name);
    if (detail) button.appendChild(element('span', 'remaked-search-result-detail', detail));
    return button;
  }

  function renderEmpty(container, message) {
    container.replaceChildren(element('div', 'remaked-search-empty', message));
  }

  function openEquipmentSearch(slotIndex, trigger) {
    if (!adapter) return null;
    var targets = adapter.listEquipmentTargets();
    var shell = createShell('equipment', 'Find equipment', trigger);
    var body = shell.body;

    if (!targets.length) {
      renderEmpty(body, 'No equipment slots available');
      return shell.panel;
    }

    var controls = element('div', 'remaked-search-controls');
    var targetsControl = targetSelect(targets, 'equipment', slotIndex);
    var query = queryInput('Search equipment…');
    var minLevel = element('input', 'remaked-search-input remaked-search-level');
    minLevel.type = 'number';
    minLevel.min = '0';
    minLevel.inputMode = 'numeric';
    minLevel.placeholder = 'Min';
    minLevel.dataset.remakedMinLevel = '';
    var maxLevel = element('input', 'remaked-search-input remaked-search-level');
    maxLevel.type = 'number';
    maxLevel.min = '0';
    maxLevel.inputMode = 'numeric';
    maxLevel.placeholder = 'Max';
    maxLevel.dataset.remakedMaxLevel = '';

    var levels = element('div', 'remaked-search-levels');
    levels.appendChild(field('Min level', minLevel));
    levels.appendChild(field('Max level', maxLevel));

    var reset = element('button', 'remaked-search-reset', 'Reset filters');
    reset.type = 'button';

    controls.appendChild(field('Slot', targetsControl));
    controls.appendChild(field('Name', query));
    controls.appendChild(levels);
    controls.appendChild(reset);
    body.appendChild(controls);

    var summary = element('div', 'remaked-search-summary');
    body.appendChild(summary);
    var results = element('div', 'remaked-search-results');
    results.dataset.remakedSearchResults = '';
    body.appendChild(results);

    function render() {
      var target = Number(targetsControl.value);
      var options = adapter.listEquipmentOptions(target);
      var filtered = filterEquipment(options, {
        query: query.value,
        minLevel: minLevel.value,
        maxLevel: maxLevel.value
      });
      summary.textContent = filtered.length + ' of ' + options.length + ' compatible items';
      if (!filtered.length) {
        renderEmpty(results, 'No matching equipment');
        return;
      }
      var fragment = document.createDocumentFragment();
      filtered.forEach(function (option) {
        var detail = option.level == null ? 'Current slot option' : 'Lv ' + option.level;
        var button = resultButton(option, detail);
        button.addEventListener('click', function () {
          if (adapter.selectEquipment(target, option.value)) closePanel();
        });
        fragment.appendChild(button);
      });
      results.replaceChildren(fragment);
    }

    targetsControl.addEventListener('change', render);
    query.addEventListener('input', render);
    minLevel.addEventListener('input', render);
    maxLevel.addEventListener('input', render);
    reset.addEventListener('click', function () {
      query.value = '';
      minLevel.value = '';
      maxLevel.value = '';
      render();
      query.focus();
    });

    render();
    window.setTimeout(function () { query.focus(); }, 0);
    return shell.panel;
  }

  function soulKey(target) {
    return String(target.slotIndex) + ':' + String(target.socketIndex);
  }

  function findSoulTarget(targets, key) {
    for (var index = 0; index < targets.length; index += 1) {
      if (soulKey(targets[index]) === key) return targets[index];
    }
    return null;
  }

  function openSoulSearch(preferredTarget, trigger) {
    if (!adapter) return null;
    var targets = adapter.listSoulTargets();
    var shell = createShell('soul', 'Find Soul', trigger);
    var body = shell.body;

    if (!targets.length) {
      renderEmpty(body, 'No available Soul sockets');
      return shell.panel;
    }

    var controls = element('div', 'remaked-search-controls remaked-search-controls-soul');
    var targetsControl = targetSelect(targets, 'soul', preferredTarget);
    var query = queryInput('Search Souls…');
    controls.appendChild(field('Socket', targetsControl));
    controls.appendChild(field('Name', query));
    body.appendChild(controls);

    var summary = element('div', 'remaked-search-summary');
    body.appendChild(summary);
    var results = element('div', 'remaked-search-results');
    results.dataset.remakedSearchResults = '';
    body.appendChild(results);

    function render() {
      var currentTargets = adapter.listSoulTargets();
      var selected = findSoulTarget(currentTargets, targetsControl.value);
      if (!selected) {
        renderEmpty(results, 'No available Soul sockets');
        summary.textContent = '0 compatible Souls';
        return;
      }
      var needle = normalizeQuery(query.value);
      var options = adapter.listSoulOptions(selected).filter(function (option) {
        return !needle || normalizeQuery(option.name).indexOf(needle) !== -1;
      });
      summary.textContent = options.length + ' compatible Souls';
      if (!options.length) {
        renderEmpty(results, 'No matching Souls');
        return;
      }
      var fragment = document.createDocumentFragment();
      options.forEach(function (option) {
        var button = resultButton(option, 'Compatible with this socket');
        button.addEventListener('click', function () {
          if (adapter.selectSoul(selected, option.value)) closePanel();
        });
        fragment.appendChild(button);
      });
      results.replaceChildren(fragment);
    }

    targetsControl.addEventListener('change', render);
    query.addEventListener('input', render);
    render();
    window.setTimeout(function () { query.focus(); }, 0);
    return shell.panel;
  }

  namespace.search = {
    normalizeQuery: normalizeQuery,
    filterEquipment: filterEquipment,
    openEquipmentSearch: openEquipmentSearch,
    openSoulSearch: openSoulSearch,
    close: closePanel
  };
})();
