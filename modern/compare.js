(function () {
  'use strict';

  var namespace = window.PandoraRemaked = window.PandoraRemaked || {};
  var adapter = namespace.adapter;
  var store = namespace.buildStore;
  var i18n = namespace.i18n;
  var overlay = null;
  var panel = null;
  var selectA = null;
  var selectB = null;
  var table = null;
  var tableBody = null;
  var emptyState = null;
  var statusNode = null;
  var metaA = null;
  var metaB = null;
  var opener = null;
  var previousBodyOverflow = '';
  var initialized = false;
  var differencesOnly = null, identicalState = null;

  function identicalFields(a, b) {
    if (!a || !b || (a.unit || '') !== (b.unit || '')) return false;
    if (finiteNumber(a.value) && finiteNumber(b.value)) return a.value === b.value;
    // Two unavailable values match only when their exact rendered source
    // representation matches. Never turn missing data into numeric zero.
    return a.value === b.value && a.display === b.display;
  }

  function filterRows() {
    if (!tableBody || !differencesOnly) return;
    var rows = Array.from(tableBody.children), visible = 0;
    rows.forEach(function (row) {
      row.hidden = differencesOnly.checked && row.dataset.equal === 'true';
      if (!row.hidden) visible++;
    });
    identicalState.hidden = table.hidden || !rows.length || !differencesOnly.checked || visible > 0;
  }

  function t(key, values, fallback) {
    return i18n && typeof i18n.t === 'function' ? i18n.t(key, values) : fallback;
  }

  function button(label, className, key) {
    var node = document.createElement('button');
    node.type = 'button';
    node.className = className || 'remaked-compare-button';
    if (key && i18n && typeof i18n.bindText === 'function') i18n.bindText(node, key);
    else node.textContent = label;
    return node;
  }

  function finiteNumber(value) {
    return typeof value === 'number' && Number.isFinite(value);
  }

  function rounded(value) {
    var result = Math.round(value * 10000) / 10000;
    return Object.is(result, -0) ? 0 : result;
  }

  function numberText(value) {
    if (!finiteNumber(value)) return '—';
    var normalized = rounded(value);
    if (Number.isInteger(normalized)) return String(normalized);
    return String(normalized).replace(/(\.\d*?[1-9])0+$|\.0+$/, '$1');
  }

  function computeDelta(a, b) {
    if (!a || !b || !finiteNumber(a.value) || !finiteNumber(b.value)) {
      return { value: null, display: '—', direction: 'unavailable' };
    }
    var unitA = a.unit || '';
    var unitB = b.unit || '';
    if (unitA !== unitB) {
      return { value: null, display: '—', direction: 'unavailable' };
    }
    var value = rounded(b.value - a.value);
    var direction = value > 0 ? 'up' : (value < 0 ? 'down' : 'flat');
    var prefix = value > 0 ? '+' : '';
    return {
      value: value,
      display: prefix + numberText(value) + unitA,
      direction: direction
    };
  }

  function setStatus(message, state) {
    if (!statusNode) return;
    statusNode.textContent = message || '';
    statusNode.dataset.state = state || 'ready';
  }

  function clearNode(node) {
    while (node && node.firstChild) node.removeChild(node.firstChild);
  }

  function option(value, label) {
    var node = document.createElement('option');
    node.value = value;
    node.textContent = label;
    return node;
  }

  function validBuilds() {
    if (!store) return { ok: false, builds: [], error: { code: 'unavailable' } };
    var listed = store.listBuilds();
    return {
      ok: listed.ok || Boolean(listed.builds && listed.builds.length),
      builds: listed.builds || [],
      error: listed.error || null
    };
  }

  function hasBuild(builds, id) {
    for (var index = 0; index < builds.length; index += 1) {
      if (builds[index].id === id) return true;
    }
    return false;
  }

  function populateSelect(select, builds, previous) {
    clearNode(select);
    select.appendChild(option('', t('compare.choose', null, 'Choose a saved build…')));
    for (var index = 0; index < builds.length; index += 1) {
      select.appendChild(option(builds[index].id, builds[index].name));
    }
    if (previous && hasBuild(builds, previous)) select.value = previous;
  }

  function setComparisonVisible(visible) {
    if (table) table.hidden = !visible;
    if (metaA) metaA.hidden = !visible;
    if (metaB) metaB.hidden = !visible;
    if (differencesOnly) differencesOnly.disabled = !visible;
    filterRows();
  }

  function metadataText(build, projection) {
    var metadata = projection && projection.metadata ? projection.metadata : {};
    var parts = [build.name];
    if (metadata.race) parts.push(metadata.race);
    if (metadata.job) parts.push(metadata.job);
    if (metadata.level != null) parts.push(t('compare.level', { level: metadata.level }, 'Lv. ' + metadata.level));
    return parts.join(' · ');
  }

  function matchingField(summary, key) {
    for (var index = 0; index < summary.length; index += 1) {
      if (summary[index].key === key) return summary[index];
    }
    return null;
  }

  function renderTable(projectionA, projectionB) {
    clearNode(tableBody);
    var summaryA = projectionA.summary || [];
    var summaryB = projectionB.summary || [];
    for (var index = 0; index < summaryA.length; index += 1) {
      var fieldA = summaryA[index];
      var fieldB = matchingField(summaryB, fieldA.key);
      if (!fieldB) continue;

      var row = document.createElement('tr');
      row.dataset.remakedCompareRow = '';
      row.dataset.statKey = fieldA.key;
      row.dataset.equal = String(identicalFields(fieldA, fieldB));

      var label = document.createElement('th');
      label.scope = 'row';
      label.textContent = fieldA.label;
      label.dataset.remakedCompareLabel = fieldA.key;
      row.appendChild(label);

      var valueA = document.createElement('td');
      valueA.dataset.remakedValueA = '';
      valueA.textContent = fieldA.display + (fieldA.unit && fieldA.display !== '---' ? fieldA.unit : '');
      row.appendChild(valueA);

      var valueB = document.createElement('td');
      valueB.dataset.remakedValueB = '';
      valueB.textContent = fieldB.display + (fieldB.unit && fieldB.display !== '---' ? fieldB.unit : '');
      row.appendChild(valueB);

      var delta = computeDelta(fieldA, fieldB);
      var deltaCell = document.createElement('td');
      deltaCell.dataset.remakedDelta = '';
      deltaCell.dataset.direction = delta.direction;
      deltaCell.textContent = delta.display;
      row.appendChild(deltaCell);

      tableBody.appendChild(row);
    }
    filterRows();
  }

  async function evaluateSelection() {
    if (!selectA || !selectB) return;
    var idA = selectA.value;
    var idB = selectB.value;
    if (!idA || !idB) {
      setComparisonVisible(false);
      setStatus(t('compare.chooseTwo', null, 'Choose two saved builds to compare.'), 'ready');
      return;
    }
    if (idA === idB) {
      setComparisonVisible(false);
      setStatus(t('compare.chooseDifferent', null, 'Choose two different saved builds.'), 'warning');
      return;
    }

    var buildA = store.getBuild(idA);
    var buildB = store.getBuild(idB);
    if (!buildA || !buildB) {
      setComparisonVisible(false);
      setStatus(t('compare.missing', null, 'A selected build is no longer available. Choose two builds again.'), 'warning');
      return;
    }

    try {
      if (namespace.catalog) await Promise.all([namespace.catalog.preparePayload(buildA.payload), namespace.catalog.preparePayload(buildB.payload)]);
      if (selectA.value !== idA || selectB.value !== idB) return;
      var projectionA = adapter.evaluateBuild(buildA.payload);
      var projectionB = adapter.evaluateBuild(buildB.payload);
      metaA.textContent = metadataText(buildA, projectionA);
      metaB.textContent = metadataText(buildB, projectionB);
      renderTable(projectionA, projectionB);
      setComparisonVisible(true);
      setStatus(t('compare.deltaHelp', null, 'Δ shows Build B minus Build A. Direction is informational only.'), 'ready');
    } catch (error) {
      setComparisonVisible(false);
      setStatus(t('compare.evaluateFailed', null, 'One of the saved builds could not be evaluated.'), 'error');
    }
  }

  function refreshChoices() {
    if (!selectA || !selectB) return;
    var previousA = selectA.value;
    var previousB = selectB.value;
    var listed = validBuilds();
    var builds = listed.builds;
    populateSelect(selectA, builds, previousA);
    populateSelect(selectB, builds, previousB);

    if (builds.length < 2) {
      emptyState.hidden = false;
      emptyState.textContent = t('compare.needTwoEmpty', null, 'Save at least two named builds before comparing them.');
      setComparisonVisible(false);
      setStatus(t('compare.needTwoStatus', null, 'Compare Builds needs at least two saved builds.'), 'ready');
      return;
    }

    emptyState.hidden = true;
    if ((previousA && !hasBuild(builds, previousA)) || (previousB && !hasBuild(builds, previousB))) {
      setComparisonVisible(false);
      setStatus(t('compare.missing', null, 'A selected build is no longer available. Choose two builds again.'), 'warning');
      return;
    }
    evaluateSelection();
  }

  function close() {
    if (!overlay || overlay.hidden) return;
    overlay.close();
    overlay.hidden = true;
    document.body.style.overflow = previousBodyOverflow;
    var target = opener;
    opener = null;
    if (target && typeof target.focus === 'function') target.focus();
  }

  function open(trigger) {
    if (!overlay || overlay.open) return;
    opener = trigger || document.activeElement;
    previousBodyOverflow = document.body.style.overflow;
    overlay.hidden = false;
    document.body.style.overflow = 'hidden';
    refreshChoices();
    overlay.showModal();
    if (selectA) selectA.focus();
  }

  function labeledSelect(labelKey, labelText, dataAttribute) {
    var group = document.createElement('label');
    group.className = 'remaked-compare-select-group';
    var label = document.createElement('span');
    if (i18n && typeof i18n.bindText === 'function') i18n.bindText(label, labelKey);
    else label.textContent = labelText;
    var select = document.createElement('select');
    select.className = 'remaked-compare-select';
    select.setAttribute(dataAttribute, '');
    group.appendChild(label);
    group.appendChild(select);
    return { group: group, select: select };
  }

  function createDialog() {
    overlay = document.createElement('dialog');
    overlay.className = 'remaked-compare-overlay remaked-modal';
    overlay.dataset.remakedCompareOverlay = '';
    overlay.hidden = true;

    panel = document.createElement('section');
    panel.className = 'remaked-compare';
    panel.dataset.remakedCompare = '';
    overlay.setAttribute('aria-labelledby', 'remaked-compare-title');

    var header = document.createElement('div');
    header.className = 'remaked-compare-header';
    var title = document.createElement('h2');
    title.id = 'remaked-compare-title';
    if (i18n && typeof i18n.bindText === 'function') i18n.bindText(title, 'compare.title');
    else title.textContent = 'Compare Builds';
    header.appendChild(title);
    var closeButton = button('×', 'remaked-compare-close');
    if (i18n && typeof i18n.bindAttribute === 'function') i18n.bindAttribute(closeButton, 'aria-label', 'compare.close');
    else closeButton.setAttribute('aria-label', 'Close Compare Builds');
    closeButton.addEventListener('click', close);
    header.appendChild(closeButton);
    panel.appendChild(header);

    var body = document.createElement('div');
    body.className = 'remaked-compare-body';

    var controls = document.createElement('div');
    controls.className = 'remaked-compare-controls';
    var a = labeledSelect('compare.buildA', 'Build A', 'data-remaked-compare-a');
    var b = labeledSelect('compare.buildB', 'Build B', 'data-remaked-compare-b');
    selectA = a.select;
    selectB = b.select;
    selectA.addEventListener('change', evaluateSelection);
    selectB.addEventListener('change', evaluateSelection);
    controls.appendChild(a.group);
    controls.appendChild(b.group);
    var refresh = button('Refresh', 'remaked-compare-button', 'compare.refresh');
    refresh.dataset.remakedCompareRefresh = '';
    refresh.addEventListener('click', refreshChoices);
    controls.appendChild(refresh);
    body.appendChild(controls);

    var filter = document.createElement('label'); filter.className = 'remaked-compare-filter';
    differencesOnly = document.createElement('input'); differencesOnly.type = 'checkbox';
    differencesOnly.dataset.remakedCompareDifferences = '';
    var filterText = document.createElement('span');
    if (i18n) i18n.bindText(filterText, 'compare.hideIdentical');
    else filterText.textContent = 'Hide identical stats';
    filter.appendChild(differencesOnly); filter.appendChild(filterText); body.appendChild(filter);
    differencesOnly.addEventListener('change', filterRows);
    identicalState = document.createElement('p'); identicalState.dataset.remakedCompareIdentical = '';
    identicalState.setAttribute('role', 'status'); identicalState.hidden = true;
    if (i18n) i18n.bindText(identicalState, 'compare.allIdentical');
    else identicalState.textContent = 'All displayed stats are identical.';
    body.appendChild(identicalState);

    emptyState = document.createElement('div');
    emptyState.className = 'remaked-compare-empty';
    emptyState.dataset.remakedCompareEmpty = '';
    emptyState.hidden = true;
    body.appendChild(emptyState);

    var meta = document.createElement('div');
    meta.className = 'remaked-compare-meta';
    metaA = document.createElement('div');
    metaA.className = 'remaked-compare-meta-card';
    metaA.dataset.remakedCompareMetaA = '';
    metaB = document.createElement('div');
    metaB.className = 'remaked-compare-meta-card';
    metaB.dataset.remakedCompareMetaB = '';
    meta.appendChild(metaA);
    meta.appendChild(metaB);
    body.appendChild(meta);

    var tableWrap = document.createElement('div');
    tableWrap.className = 'remaked-compare-table-wrap';
    table = document.createElement('table');
    table.className = 'remaked-compare-table';
    table.dataset.remakedCompareTable = '';
    var head = document.createElement('thead');
    var headRow = document.createElement('tr');
    [
      ['compare.column.stat', 'Stat'],
      ['compare.buildA', 'Build A'],
      ['compare.buildB', 'Build B'],
      ['compare.column.delta', 'Δ (B − A)']
    ].forEach(function (entry) {
      var cell = document.createElement('th');
      cell.scope = 'col';
      if (i18n && typeof i18n.bindText === 'function') i18n.bindText(cell, entry[0]);
      else cell.textContent = entry[1];
      headRow.appendChild(cell);
    });
    head.appendChild(headRow);
    table.appendChild(head);
    tableBody = document.createElement('tbody');
    table.appendChild(tableBody);
    tableWrap.appendChild(table);
    body.appendChild(tableWrap);

    statusNode = document.createElement('p');
    statusNode.className = 'remaked-compare-status';
    statusNode.dataset.remakedCompareStatus = '';
    statusNode.setAttribute('aria-live', 'polite');
    body.appendChild(statusNode);

    panel.appendChild(body);
    overlay.appendChild(panel);
    document.body.appendChild(overlay);

    overlay.addEventListener('click', function (event) {
      if (event.target === overlay) close();
    });
    overlay.addEventListener('cancel', function (event) { event.preventDefault(); close(); });
    setComparisonVisible(false);
  }

  function createTrigger() {
    var actions = document.querySelector('[data-remaked-build-actions]');
    if (!actions || actions.querySelector('[data-remaked-compare-open]')) return;
    var trigger = button('Compare Builds', 'remaked-tool-button', 'compare.button');
    trigger.dataset.remakedCompareOpen = '';
    trigger.addEventListener('click', function () { open(trigger); });
    actions.appendChild(trigger);
  }

  function init() {
    if (initialized) return;
    if (!adapter || !store) return;
    initialized = true;
    createDialog();
    createTrigger();
  }

  namespace.compare = {
    init: init,
    open: open,
    close: close,
    refresh: refreshChoices,
    computeDelta: computeDelta,
    identicalFields: identicalFields
  };

  window.addEventListener('pandora-remaked:localechange', function () {
    if (overlay && !overlay.hidden) refreshChoices();
  });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})();
