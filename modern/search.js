(function () {
  'use strict';

  var namespace = window.PandoraRemaked = window.PandoraRemaked || {};
  var adapter = namespace.adapter;
  var i18n = namespace.i18n;
  var active = null;
  var keyboardInput = true;
  var previewSequence = 0;
  document.addEventListener('keydown', function () { keyboardInput = true; }, true);
  document.addEventListener('pointerdown', function () { keyboardInput = false; }, true);

  function cancelPreviews(keepInline) {
    if (!active) return;
    active.hoverPausedUntil = Date.now() + 450;
    active.cancelPreviews.forEach(function (cancel) { cancel(keepInline === true); });
  }

  function t(key, values, fallback) {
    return i18n && typeof i18n.t === 'function' ? i18n.t(key, values) : fallback;
  }

  function normalizeQuery(value) {
    return String(value == null ? '' : value).normalize('NFKC').trim().toLowerCase();
  }

  function parseOptionalLevel(value) {
    var text = String(value == null ? '' : value).trim();
    if (!text) return null;
    var parsed = Number(text);
    return Number.isFinite(parsed) ? parsed : null;
  }

  function gameName(identifier, fallback) {
    return i18n && typeof i18n.game === 'function' ? i18n.game(identifier, fallback) : fallback;
  }

  function equipmentTermId(value) {
    var legacyId = Number(value);
    if (!Number.isInteger(legacyId) || legacyId <= 0) return '';
    return 'equipment.' + String(Math.floor(legacyId / 10000)) + '.' + String(legacyId % 10000);
  }

  function soulTermId(value) {
    var legacyId = Number(value);
    return Number.isInteger(legacyId) && legacyId > 0 ? 'soul.' + String(legacyId) : '';
  }

  function filterEquipment(options, filters) {
    var query = normalizeQuery(filters && filters.query);
    var minLevel = parseOptionalLevel(filters && filters.minLevel);
    var maxLevel = parseOptionalLevel(filters && filters.maxLevel);
    return (options || []).filter(function (option) {
      var localized = gameName(equipmentTermId(option.value), option.name);
      var searchable = normalizeQuery(option.name + ' ' + localized);
      if (query && searchable.indexOf(query) === -1) return false;
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

  function translatedElement(tag, className, key, fallback, values) {
    var node = element(tag, className);
    if (i18n && typeof i18n.bindText === 'function') i18n.bindText(node, key, values);
    else node.textContent = fallback;
    return node;
  }

  function closePanel(options) {
    if (!active) return;
    var current = active;
    cancelPreviews();
    active = null;
    current.backdrop.close();
    current.backdrop.remove();
    if (!options || options.restoreFocus !== false) {
      if (current.returnFocus && document.contains(current.returnFocus) && typeof current.returnFocus.focus === 'function') {
        current.returnFocus.focus();
      }
    }
  }

  function createShell(kind, titleKey, titleFallback, trigger) {
    closePanel({ restoreFocus: false });

    var backdrop = element('dialog', 'remaked-search-backdrop remaked-modal');
    backdrop.dataset.remakedSearchBackdrop = '';

    var panel = element('section', 'remaked-search-panel');
    panel.dataset.remakedSearchPanel = '';
    panel.dataset.searchKind = kind;
    backdrop.setAttribute('aria-labelledby', 'remaked-search-title');

    var header = element('div', 'remaked-search-header');
    var headingWrap = element('div', 'remaked-search-heading');
    var eyebrowKey = kind === 'equipment' ? 'search.eyebrow.equipment' : 'search.eyebrow.soul';
    var eyebrow = translatedElement('span', 'remaked-search-eyebrow', eyebrowKey, kind === 'equipment' ? 'Equipment' : 'Soul');
    var heading = translatedElement('h2', '', titleKey, titleFallback);
    heading.id = 'remaked-search-title';
    headingWrap.appendChild(eyebrow);
    headingWrap.appendChild(heading);

    var close = translatedElement('button', 'remaked-search-close', 'search.close', 'Close search');
    close.type = 'button';
    if (i18n && typeof i18n.bindAttribute === 'function') i18n.bindAttribute(close, 'aria-label', 'search.close');
    else close.setAttribute('aria-label', 'Close search');
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
    active = { backdrop: backdrop, panel: panel, returnFocus: returnFocus, cancelPreviews: [], hoverPausedUntil: 0 };
    backdrop.addEventListener('cancel', function (event) { event.preventDefault(); closePanel(); });
    panel.addEventListener('keydown', function (event) {
      // Chromium/Firefox otherwise consume Escape to clear a type=search input
      // before the native dialog can cancel. Keep the established one-key close.
      if (event.key === 'Escape') {
        event.preventDefault();
        var previews = panel.querySelectorAll('details[open]');
        if (previews.length) previews.forEach(function (preview) { preview.open = false; });
        else closePanel();
      }
    });
    panel.addEventListener('scroll', function (event) {
      if (event.target.closest && event.target.closest('.remaked-item-description')) return;
      cancelPreviews(true);
    }, true);
    panel.addEventListener('wheel', function (event) {
      if (!event.target.closest('.remaked-item-description')) cancelPreviews(true);
    }, { passive: true });
    panel.addEventListener('touchstart', function () { cancelPreviews(true); }, { passive: true });
    backdrop.showModal();
    return { backdrop: backdrop, panel: panel, body: body };
  }

  function field(labelKey, labelText, control) {
    var wrapper = element('label', 'remaked-search-field');
    wrapper.appendChild(translatedElement('span', 'remaked-search-label', labelKey, labelText));
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

  function queryInput(placeholderKey, placeholder) {
    var input = element('input', 'remaked-search-input');
    input.type = 'search';
    input.autocomplete = 'off';
    input.spellcheck = false;
    if (i18n && typeof i18n.bindAttribute === 'function') i18n.bindAttribute(input, 'placeholder', placeholderKey);
    else input.placeholder = placeholder;
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

  function resultRow(button, kind, value, targetSlot) {
    var row = element('div', 'remaked-search-row');
    row.dataset.remakedSearchRow = ''; row.dataset.value = String(value);
    row.appendChild(button);
    var item = kind === 'equipment' && Number(value) % 10000 === 0 ? null : adapter.readItemDetails(kind, value, targetSlot);
    if (!item) return row;
    var details = element('details', 'remaked-item-preview');
    var summary = translatedElement('summary', '', 'search.details', 'Details');
    details.appendChild(summary);
    var description = element('div', 'remaked-item-description');
    description.dataset.remakedItemDescription = '';
    description.id = 'remaked-item-detail-' + (++previewSequence);
    summary.setAttribute('aria-controls', description.id);
    var name = button.querySelector('.remaked-search-result-name').textContent;
    description.appendChild(element('strong', '', item.equippedName ? item.equippedName.replace(item.name, name) : name));
    if (item.category) description.appendChild(element('p', '', item.category));
    item.baseStats.forEach(function (stat) { description.appendChild(element('p', '', stat.label + ': ' + stat.value)); });
    if (item.level != null) description.appendChild(element('p', '', t('search.level', { level: item.level }, 'Lv ' + item.level)));
    if (item.sockets != null) description.appendChild(element('p', '', t('search.sockets', { count: item.sockets }, 'Soul sockets: ' + item.sockets)));
    if (item.souls.length) {
      var sockets = element('div', 'remaked-item-sockets');
      item.souls.forEach(function (soul, index) {
        var socket = element('span', 'remaked-item-socket');
        socket.dataset.remakedSocket = ''; socket.dataset.filled = soul.id > 0 ? 'true' : 'false';
        var label = soul.id > 0 ? gameName(soulTermId(soul.id), soul.name) : '—';
        socket.setAttribute('aria-label', 'Soul ' + (index + 1) + ': ' + label);
        socket.setAttribute('role', 'img'); socket.title = label;
        sockets.appendChild(socket);
        if (soul.id > 0) description.appendChild(element('p', '', 'Soul ' + (index + 1) + ': ' + label));
      });
      description.insertBefore(sockets, description.children[1]);
    }
    if (item.gem) description.appendChild(element('p', '', item.gem));
    if (item.classes.length) description.appendChild(element('p', 'remaked-item-classes', item.classes.join(' · ')));
    item.descriptions.forEach(function (text) { description.appendChild(element('p', '', text)); });
    description.appendChild(translatedElement('small', '', 'search.itemSource', 'Item descriptions from Legacy 2.00; not calculated build deltas.'));
    details.appendChild(description); row.appendChild(details);
    var pinned = false;
    var hoverTimer = null;
    function cancelHover() { window.clearTimeout(hoverTimer); hoverTimer = null; }
    var floating = window.matchMedia('(min-width: 701px) and (hover: hover)').matches && typeof description.showPopover === 'function';
    if (active) active.cancelPreviews.push(function (keepInline) {
      cancelHover();
      // A deliberately expanded phone card is document content, not a hover
      // overlay. Keep it while reading/scrolling or tapping its summary closed.
      if (keepInline && !floating && pinned) return;
      details.open = false; pinned = false;
    });
    if (floating) description.setAttribute('popover', 'manual');
    details.addEventListener('toggle', function () {
      if (!details.open) pinned = false;
      summary.setAttribute('aria-expanded', details.open ? 'true' : 'false');
      if (!floating || !description.isConnected) return;
      if (!details.open) { description.hidePopover(); return; }
      row.closest('[data-remaked-search-results]').querySelectorAll('details[open]').forEach(function (other) { if (other !== details) other.open = false; });
      description.showPopover();
      var rect = row.getBoundingClientRect(), width = description.getBoundingClientRect().width;
      var left = rect.right + 8;
      if (left + width > innerWidth - 12) left = rect.left - width - 8;
      description.style.left = Math.max(12, Math.min(left, innerWidth - width - 12)) + 'px';
      description.style.top = Math.max(12, Math.min(rect.top, innerHeight - description.getBoundingClientRect().height - 12)) + 'px';
    });
    summary.addEventListener('click', function () { pinned = !details.open; });
    button.addEventListener('mouseenter', function () {
      cancelHover();
      if (!window.matchMedia('(min-width: 701px) and (hover: hover)').matches || !active) return;
      hoverTimer = window.setTimeout(function () {
        hoverTimer = null;
        if (row.isConnected && button.matches(':hover') && active && Date.now() >= active.hoverPausedUntil) details.open = true;
      }, 450);
    });
    button.addEventListener('pointerdown', cancelHover);
    button.addEventListener('focus', function () { if (keyboardInput && button.matches(':focus-visible')) details.open = true; });
    row.addEventListener('mouseleave', function () {
      cancelHover();
      window.setTimeout(function () {
        if (!pinned && !(keyboardInput && row.contains(document.activeElement)) && !row.matches(':hover') && !description.matches(':hover')) details.open = false;
      }, 100);
    });
    description.addEventListener('mouseleave', function () {
      if (!pinned && !(keyboardInput && row.contains(document.activeElement)) && !row.matches(':hover')) details.open = false;
    });
    row.addEventListener('focusout', function (event) { if (!pinned && !row.contains(event.relatedTarget)) details.open = false; });
    row.addEventListener('keydown', function (event) {
      if (event.key === 'Escape' && details.open) {
        event.preventDefault(); event.stopPropagation(); cancelHover(); details.open = false; pinned = false;
      }
    });
    return row;
  }

  // Equipment controls use the same read-only source cards, but a locked
  // simulation target: no target switching or Soul insertion in an item list.
  function openEquipmentPicker(selectId, trigger) {
    var select = document.getElementById(selectId);
    var match = String(selectId).match(/^SelEquip_(\d+)_(0|[4-6])$/);
    if (!select || !match || select.style.display === 'none') return null;
    var slot = Number(match[1]), fieldIndex = Number(match[2]);
    var kind = fieldIndex === 0 ? 'equipment' : 'soul';
    var shell = createShell(kind, kind === 'equipment' ? 'search.equipment.title' : 'search.soul.title', 'Equipment', trigger);
    shell.panel.dataset.remakedPickerPanel = selectId;
    shell.panel.querySelector('h2').removeAttribute('data-remaked-i18n');
    shell.panel.querySelector('h2').textContent = adapter.listEquipmentTargets().find(function (target) { return target.slotIndex === slot; }).label + (fieldIndex ? ' · Soul ' + (fieldIndex - 3) : '');
    var query = queryInput(kind === 'equipment' ? 'search.equipment.placeholder' : 'search.soul.placeholder', 'Search…');
    shell.body.appendChild(field('search.name', 'Name', query));
    var results = element('div', 'remaked-search-results remaked-picker-results');
    results.dataset.remakedSearchResults = '';
    shell.body.appendChild(results);
    function render() {
      cancelPreviews();
      active.cancelPreviews = [];
      var current = document.getElementById(selectId);
      if (!current || current.style.display === 'none') { closePanel(); return; }
      var options = kind === 'equipment' ? adapter.listEquipmentOptions(slot) : adapter.listSoulOptions({ slotIndex: slot, socketIndex: fieldIndex });
      var filtered = options.filter(function (option) {
        var id = kind === 'equipment' ? equipmentTermId(option.value) : soulTermId(option.value);
        return normalizeQuery(option.name + ' ' + gameName(id, option.name)).indexOf(normalizeQuery(query.value)) !== -1;
      });
      var fragment = document.createDocumentFragment();
      filtered.forEach(function (option) {
        var id = kind === 'equipment' ? equipmentTermId(option.value) : soulTermId(option.value);
        var button = resultButton({ value: option.value, name: gameName(id, option.name) }, option.level == null ? '' : t('search.level', { level: option.level }, 'Lv ' + option.level));
        button.dataset.selected = current.value === String(option.value) ? 'true' : 'false';
        button.setAttribute('aria-pressed', button.dataset.selected);
        button.addEventListener('click', function () {
          var changed = kind === 'equipment' ? adapter.selectEquipment(slot, option.value) : adapter.selectSoul({ slotIndex: slot, socketIndex: fieldIndex }, option.value);
          if (changed) closePanel();
        });
        fragment.appendChild(resultRow(button, kind, option.value, slot));
      });
      results.replaceChildren(fragment);
      if (!filtered.length) renderEmpty(results, t(kind === 'equipment' ? 'search.noEquipmentMatches' : 'search.noSoulMatches', null, 'No matches'));
    }
    // Native buttons + disclosures, not a fake listbox containing interactive
    // children. Tab traverses actions; arrows provide an additional shortcut.
    results.addEventListener('keydown', function (event) {
      if (['ArrowDown', 'ArrowUp', 'Home', 'End'].indexOf(event.key) === -1 || event.target.tagName !== 'BUTTON') return;
      var buttons = Array.from(results.querySelectorAll('[data-remaked-search-result]'));
      var index = buttons.indexOf(event.target);
      if (event.key === 'Home') index = 0;
      else if (event.key === 'End') index = buttons.length - 1;
      else index = Math.max(0, Math.min(buttons.length - 1, index + (event.key === 'ArrowDown' ? 1 : -1)));
      event.preventDefault(); buttons[index]?.focus();
    });
    active.render = render;
    query.addEventListener('input', render);
    render();
    query.focus();
    return shell.panel;
  }

  function openEquipmentSearch(slotIndex, trigger) {
    if (!adapter) return null;
    var targets = adapter.listEquipmentTargets();
    var shell = createShell('equipment', 'search.equipment.title', 'Find equipment', trigger);
    var body = shell.body;

    if (!targets.length) {
      renderEmpty(body, t('search.noEquipmentSlots', null, 'No equipment slots available'));
      return shell.panel;
    }

    var controls = element('div', 'remaked-search-controls');
    var targetsControl = targetSelect(targets, 'equipment', slotIndex);
    var query = queryInput('search.equipment.placeholder', 'Search equipment…');
    var minLevel = element('input', 'remaked-search-input remaked-search-level');
    minLevel.type = 'number';
    minLevel.min = '0';
    minLevel.inputMode = 'numeric';
    if (i18n && typeof i18n.bindAttribute === 'function') i18n.bindAttribute(minLevel, 'placeholder', 'search.min');
    else minLevel.placeholder = 'Min';
    minLevel.dataset.remakedMinLevel = '';
    var maxLevel = element('input', 'remaked-search-input remaked-search-level');
    maxLevel.type = 'number';
    maxLevel.min = '0';
    maxLevel.inputMode = 'numeric';
    if (i18n && typeof i18n.bindAttribute === 'function') i18n.bindAttribute(maxLevel, 'placeholder', 'search.max');
    else maxLevel.placeholder = 'Max';
    maxLevel.dataset.remakedMaxLevel = '';

    var levels = element('div', 'remaked-search-levels');
    levels.appendChild(field('search.minLevel', 'Min level', minLevel));
    levels.appendChild(field('search.maxLevel', 'Max level', maxLevel));

    var reset = translatedElement('button', 'remaked-search-reset', 'search.reset', 'Reset filters');
    reset.type = 'button';

    controls.appendChild(field('search.slot', 'Slot', targetsControl));
    controls.appendChild(field('search.name', 'Name', query));
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
      cancelPreviews(); active.cancelPreviews = [];
      var options = adapter.listEquipmentOptions(target);
      var filtered = filterEquipment(options, {
        query: query.value,
        minLevel: minLevel.value,
        maxLevel: maxLevel.value
      });
      summary.textContent = t('search.equipmentSummary', { shown: filtered.length, total: options.length }, filtered.length + ' of ' + options.length + ' compatible items');
      if (!filtered.length) {
        renderEmpty(results, t('search.noEquipmentMatches', null, 'No matching equipment'));
        return;
      }
      var fragment = document.createDocumentFragment();
      filtered.forEach(function (option) {
        var detail = option.level == null
          ? t('search.currentSlotOption', null, 'Current slot option')
          : t('search.level', { level: option.level }, 'Lv ' + option.level);
        var displayed = Object.assign({}, option, {
          name: gameName(equipmentTermId(option.value), option.name)
        });
        var button = resultButton(displayed, detail);
        button.addEventListener('click', function () {
          if (adapter.selectEquipment(target, option.value)) closePanel();
        });
        fragment.appendChild(resultRow(button, 'equipment', option.value, target));
      });
      results.replaceChildren(fragment);
    }

    active.render = render;
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
    var shell = createShell('soul', 'search.soul.title', 'Find Soul', trigger);
    var body = shell.body;

    if (!targets.length) {
      renderEmpty(body, t('search.noSoulSockets', null, 'No available Soul sockets'));
      return shell.panel;
    }

    var controls = element('div', 'remaked-search-controls remaked-search-controls-soul');
    var targetsControl = targetSelect(targets, 'soul', preferredTarget);
    var query = queryInput('search.soul.placeholder', 'Search Souls…');
    controls.appendChild(field('search.socket', 'Socket', targetsControl));
    controls.appendChild(field('search.name', 'Name', query));
    body.appendChild(controls);

    var summary = element('div', 'remaked-search-summary');
    body.appendChild(summary);
    var results = element('div', 'remaked-search-results');
    results.dataset.remakedSearchResults = '';
    body.appendChild(results);

    function render() {
      var currentTargets = adapter.listSoulTargets();
      cancelPreviews(); active.cancelPreviews = [];
      var selected = findSoulTarget(currentTargets, targetsControl.value);
      if (!selected) {
        renderEmpty(results, t('search.noSoulSockets', null, 'No available Soul sockets'));
        summary.textContent = t('search.soulSummary', { total: 0 }, '0 compatible Souls');
        return;
      }
      var needle = normalizeQuery(query.value);
      var options = adapter.listSoulOptions(selected).filter(function (option) {
        var localized = gameName(soulTermId(option.value), option.name);
        return !needle || normalizeQuery(option.name + ' ' + localized).indexOf(needle) !== -1;
      });
      summary.textContent = t('search.soulSummary', { total: options.length }, options.length + ' compatible Souls');
      if (!options.length) {
        renderEmpty(results, t('search.noSoulMatches', null, 'No matching Souls'));
        return;
      }
      var fragment = document.createDocumentFragment();
      options.forEach(function (option) {
        var displayed = Object.assign({}, option, {
          name: gameName(soulTermId(option.value), option.name)
        });
        var button = resultButton(displayed, t('search.soulCompatible', null, 'Compatible with this socket'));
        button.addEventListener('click', function () {
          if (adapter.selectSoul(selected, option.value)) closePanel();
        });
        fragment.appendChild(resultRow(button, 'soul', option.value));
      });
      results.replaceChildren(fragment);
    }

    active.render = render;
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
    openEquipmentPicker: openEquipmentPicker,
    close: closePanel
  };

  window.addEventListener('pandora-remaked:localechange', function () {
    if (active && typeof active.render === 'function') active.render();
  });
  window.addEventListener('resize', function () {
    cancelPreviews();
  });
})();
