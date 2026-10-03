(function () {
  'use strict';

  var namespace = window.PandoraRemaked = window.PandoraRemaked || {};
  var i18n = namespace.i18n;
  var hooks = document.getElementById('remaked-shell-hooks');
  var defaultLabels = ['JOB', 'SKILL', 'ATTACK', 'DEFENSE', 'BUFF', 'LOG', 'FILE'];
  var HERO_ART_URL = './modern/pandora-hero.webp';

  function localizeText(node, key, fallback, values) {
    if (key && i18n && typeof i18n.bindText === 'function') return i18n.bindText(node, key, values);
    node.textContent = fallback;
    return node;
  }

  function localizeAttribute(node, attribute, key, fallback, values) {
    if (key && i18n && typeof i18n.bindAttribute === 'function') {
      return i18n.bindAttribute(node, attribute, key, values);
    }
    node.setAttribute(attribute, fallback);
    return node;
  }

  function makeLink(label, href, key) {
    var link = document.createElement('a');
    link.className = 'remaked-link';
    localizeText(link, key, label);
    link.href = href;
    if (/^https?:/i.test(href)) {
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
    }
    return link;
  }

  function makeButton(label, className, key) {
    var button = document.createElement('button');
    button.type = 'button';
    button.className = className || 'remaked-control';
    localizeText(button, key, label);
    return button;
  }

  function getFlag(index, fallback) {
    return window.Flag && typeof window.Flag[index] !== 'undefined' ? window.Flag[index] : fallback;
  }

  function syncLanguageButtons(header) {
    var current = Number(getFlag(0, 1));
    var locale = i18n && i18n.getLocale() === 'ru' ? 'RU' : ['JP', 'EN', 'TW'][current];
    header.querySelectorAll('[data-remaked-language-panel] button').forEach(function (button) {
      var active = button.textContent === locale;
      button.setAttribute('aria-pressed', active ? 'true' : 'false');
    });
  }

  function syncUiLocaleButtons(header) {
    syncLanguageButtons(header);
  }

  function syncNavButtons(header) {
    var current = Number(getFlag(2, 0));
    header.querySelectorAll('[data-remaked-tab]').forEach(function (button) {
      var tab = Number(button.dataset.remakedTab);
      button.setAttribute('aria-pressed', current === tab + 1 ? 'true' : 'false');
      var sourceLabel = document.getElementById('TextTab_' + tab);
      button.textContent = sourceLabel && sourceLabel.textContent.trim() ? sourceLabel.textContent.trim() : defaultLabels[tab];
    });
  }

  function createLanguageControl(header) {
    var language = document.createElement('div');
    language.className = 'remaked-segment remaked-ui-locale';
    language.dataset.remakedLanguagePanel = '';
    language.setAttribute('role', 'group');
    localizeAttribute(language, 'aria-label', 'controls.interfaceLanguage', 'Interface language');
    ['EN', 'RU', 'JP', 'TW'].forEach(function (label) {
      var index = label === 'JP' ? 0 : label === 'TW' ? 2 : 1;
      var button = makeButton(label, 'remaked-segment-button');
      if (label !== 'RU') button.dataset.remakedLanguage = String(index);
      if (label === 'RU' || label === 'EN') button.dataset.remakedUiLocale = label.toLowerCase();
      button.setAttribute('aria-pressed', 'false');
      button.addEventListener('click', function () {
        var legacyControl = document.getElementById('Lang_' + index);
        if (legacyControl) legacyControl.click();
        if (i18n) i18n.setLocale(label === 'RU' ? 'ru' : 'en');
        syncLanguageButtons(header);
        syncNavButtons(header);
      });
      language.appendChild(button);
    });
    return language;
  }

  function createHero() {
    var version = window.PandoraRemakedVersion || { legacyEngine: '2.00', ui: '2026.09.1' };
    var hero = document.createElement('section');
    hero.className = 'remaked-hero';
    hero.dataset.remakedHero = '';
    hero.setAttribute('aria-labelledby', 'remaked-hero-title');

    var copy = document.createElement('div');
    copy.className = 'remaked-hero-copy';

    var eyebrow = document.createElement('span');
    eyebrow.className = 'remaked-hero-eyebrow';
    localizeText(eyebrow, 'hero.eyebrow', 'Pandora Saga · Character Builder');

    var title = document.createElement('h1');
    title.id = 'remaked-hero-title';
    localizeText(title, 'hero.title', 'Pandora Saga Simulator');

    var meta = document.createElement('div');
    meta.className = 'remaked-hero-meta';
    var badge = document.createElement('span');
    badge.className = 'remaked-hero-badge';
    localizeText(badge, 'hero.badge', 'Remaked');
    var versionText = document.createElement('span');
    localizeText(versionText, 'hero.version', 'Legacy ' + version.legacyEngine + ' · UI ' + version.ui, version);
    meta.appendChild(badge);
    meta.appendChild(versionText);

    var subtitle = document.createElement('p');
    localizeText(subtitle, 'hero.subtitle', 'The preserved legacy calculator, wrapped in a cleaner modern interface.');

    var source = document.createElement('span');
    source.className = 'remaked-hero-source';
    localizeText(source, 'hero.source', 'Unofficial Pandora Saga fan artwork');

    copy.appendChild(eyebrow);
    copy.appendChild(title);
    copy.appendChild(meta);
    copy.appendChild(subtitle);

    var art = document.createElement('div');
    art.className = 'remaked-hero-art';
    art.setAttribute('aria-hidden', 'true');
    var image = document.createElement('img');
    image.dataset.remakedHeroArt = '';
    image.src = HERO_ART_URL;
    image.alt = '';
    image.loading = 'eager';
    image.decoding = 'async';
    art.appendChild(image);
    art.appendChild(source);

    hero.appendChild(copy);
    hero.appendChild(art);
    return hero;
  }

  function createHeader() {
    var header = document.createElement('header');
    header.className = 'remaked-header';
    header.dataset.remakedHeader = '';

    var top = document.createElement('div');
    top.className = 'remaked-header-top';
    var primary = document.createElement('div');
    primary.className = 'remaked-utilities remaked-utilities-primary';
    var projectUrl = hooks && hooks.dataset.projectUrl ? hooks.dataset.projectUrl : '#';
    var updatesUrl = hooks && hooks.dataset.updatesUrl ? hooks.dataset.updatesUrl : '#';
    var legacyUrl = hooks && hooks.dataset.legacyUrl ? hooks.dataset.legacyUrl : './legacy/';
    primary.appendChild(makeLink('Project', projectUrl, 'header.project'));
    var updates = makeButton('Updates', 'remaked-link', 'header.updates');
    updates.dataset.remakedUpdatesOpen = '';
    updates.addEventListener('click', function () { openUpdates(updatesUrl, projectUrl); });
    primary.appendChild(updates);
    primary.appendChild(makeLink('Legacy Mode', legacyUrl, 'header.legacyMode'));
    top.appendChild(primary);

    var controls = document.createElement('div');
    controls.className = 'remaked-utilities remaked-utilities-controls';
    controls.appendChild(createLanguageControl(header));
    var pwaActions = document.createElement('div');
    pwaActions.className = 'remaked-pwa-actions';
    pwaActions.dataset.remakedPwaActions = '';
    controls.appendChild(pwaActions);
    var version = window.PandoraRemakedVersion || { legacyEngine: '2.00', ui: '2026.09.1' };
    var versionNode = document.createElement('span');
    versionNode.className = 'remaked-version';
    versionNode.dataset.remakedVersion = '';
    localizeText(versionNode, 'shell.version', 'Legacy ' + version.legacyEngine + ' · Remaked ' + version.ui, version);
    controls.appendChild(versionNode);
    top.appendChild(controls);

    header.appendChild(top);
    header.appendChild(createHero());

    var navRow = document.createElement('div');
    navRow.className = 'remaked-nav-row';
    var nav = document.createElement('nav');
    nav.className = 'remaked-nav';
    nav.dataset.remakedNav = '';
    localizeAttribute(nav, 'aria-label', 'shell.sections', 'Simulator sections');
    defaultLabels.slice(0, 5).forEach(function (label, index) {
      var button = makeButton(label, 'remaked-nav-button');
      button.dataset.remakedTab = String(index);
      button.setAttribute('aria-pressed', 'false');
      button.addEventListener('click', function () {
        var legacyTab = document.getElementById('Tab_' + index + '_0');
        if (legacyTab) legacyTab.click();
        syncNavButtons(header);
      });
      nav.appendChild(button);
    });
    var builds = document.createElement('div'); builds.className = 'remaked-build-actions';
    builds.dataset.remakedBuildActions = ''; builds.setAttribute('role', 'group');
    localizeAttribute(builds, 'aria-label', 'builds.button', 'Builds'); nav.appendChild(builds);
    navRow.appendChild(nav);
    header.appendChild(navRow);

    syncLanguageButtons(header);
    syncUiLocaleButtons(header);
    syncNavButtons(header);
    return header;
  }

  function createDiscoveryTools() {
    var tools = document.createElement('section');
    tools.className = 'remaked-tools';
    tools.dataset.remakedTools = '';
    localizeAttribute(tools, 'aria-label', 'tools.region', 'Build discovery tools');

    var label = document.createElement('span');
    label.className = 'remaked-tools-label';
    localizeText(label, 'tools.label', 'Search current build data');
    tools.appendChild(label);

    var equipment = makeButton('Equipment Search', 'remaked-tool-button', 'tools.equipmentSearch');
    equipment.dataset.remakedEquipmentSearch = '';
    equipment.addEventListener('click', function () {
      if (namespace.search && typeof namespace.search.openEquipmentSearch === 'function') {
        namespace.search.openEquipmentSearch(null, equipment);
      }
    });
    tools.appendChild(equipment);

    var souls = makeButton('Soul Search', 'remaked-tool-button', 'tools.soulSearch');
    souls.dataset.remakedSoulSearch = '';
    souls.addEventListener('click', function () {
      if (namespace.search && typeof namespace.search.openSoulSearch === 'function') {
        namespace.search.openSoulSearch(null, souls);
      }
    });
    tools.appendChild(souls);

    return tools;
  }

  var updatesDialog;
  function openUpdates(changelogUrl, projectUrl) {
    if (!updatesDialog) {
      updatesDialog = document.createElement('dialog');
      updatesDialog.className = 'remaked-modal remaked-updates-overlay';
      updatesDialog.dataset.remakedUpdates = '';
      updatesDialog.setAttribute('aria-labelledby', 'remaked-updates-title');
      var panel = document.createElement('section');
      panel.className = 'remaked-updates-panel';
      var header = document.createElement('div'); header.className = 'remaked-updates-header';
      var title = document.createElement('h2'); title.id = 'remaked-updates-title';
      localizeText(title, 'updates.title', "What's new");
      var close = makeButton('Close updates', 'remaked-tool-button', 'updates.close');
      close.autofocus = true;
      close.addEventListener('click', function () { updatesDialog.close(); });
      header.appendChild(title); header.appendChild(close); panel.appendChild(header);
      var version = document.createElement('p'); version.className = 'remaked-updates-version';
      localizeText(version, 'updates.version', '', window.PandoraRemakedVersion);
      panel.appendChild(version);
      var list = document.createElement('ul');
      ['keyboard', 'translations', 'builds', 'offline', 'preservation'].forEach(function (key) {
        var item = document.createElement('li'); localizeText(item, 'updates.' + key, ''); list.appendChild(item);
      });
      panel.appendChild(list);
      var links = document.createElement('div'); links.className = 'remaked-updates-links';
      links.appendChild(makeLink('Full changelog', changelogUrl, 'updates.fullChangelog'));
      links.appendChild(makeLink('Report a problem', projectUrl + '/issues/new?template=bug_report.yml', 'updates.report'));
      panel.appendChild(links); updatesDialog.appendChild(panel);
      updatesDialog.addEventListener('click', function (event) { if (event.target === updatesDialog) updatesDialog.close(); });
      document.body.appendChild(updatesDialog);
    }
    if (!updatesDialog.open) updatesDialog.showModal();
  }

  function markToolbarContaining(id) {
    var element = document.getElementById(id);
    if (!element) return;
    var innerList = element.closest('ul');
    if (!innerList || !innerList.parentElement || innerList.parentElement.tagName !== 'LI') return;
    var outerList = innerList.parentElement.parentElement;
    if (outerList && outerList.tagName === 'UL') outerList.classList.add('remaked-legacy-toolbar');
  }

  function markLegacyToolbar() {
    markToolbarContaining('TextMenu');
    markToolbarContaining('Tab_0_0');
  }

  namespace.getLegacyBuildCode = function () {
    return typeof window.Store === 'function' ? String(window.Store()) : '';
  };

  namespace.initModernShell = function () {
    var existing = document.querySelector('[data-remaked-shell]');
    if (existing) {
      var existingHeader = existing.querySelector('[data-remaked-header]');
      if (existingHeader) {
        syncLanguageButtons(existingHeader);
        syncUiLocaleButtons(existingHeader);
        syncNavButtons(existingHeader);
      }
      return existing;
    }

    var legacyBody = document.getElementById('body');
    if (!legacyBody || !legacyBody.parentNode) return null;
    document.body.classList.add('remaked-modern');
    document.body.dataset.remakedMode = 'modern';
    // No Modern LOG/FILE navigation. Keep source File()/DOM translation anchors
    // for old browser data and the museum, but never offer duplicate managers.
    window.Flag[4] = 0; window.Log = function () {};
    ['Tab_5_1', 'Tab_6_1', 'SwitchUse_1'].forEach(function (id) {
      var node = document.getElementById(id); if (node) { node.hidden = true; node.inert = true; }
    });
    markLegacyToolbar();

    var shell = document.createElement('div');
    shell.className = 'remaked-shell';
    shell.dataset.remakedShell = '';
    var frame = document.createElement('main');
    frame.className = 'remaked-app-frame';
    frame.id = 'remaked-calculator';
    frame.tabIndex = -1;
    localizeAttribute(frame, 'aria-label', 'shell.calculator', 'Pandora Saga character simulator');
    legacyBody.parentNode.insertBefore(shell, legacyBody);
    var skip = document.createElement('a');
    skip.className = 'remaked-skip-link';
    skip.href = '#remaked-calculator';
    localizeText(skip, 'shell.skipCalculator', 'Skip to calculator');
    skip.addEventListener('click', function () { frame.focus(); });
    shell.appendChild(skip);
    shell.appendChild(createHeader());
    shell.appendChild(createDiscoveryTools());
    shell.appendChild(frame);
    frame.appendChild(legacyBody);
    return shell;
  };

  namespace.initModernShell();
  document.addEventListener('keydown', function (event) {
    if (event.key !== 'Tab' || !event.target.closest) return;
    var dialog = event.target.closest('dialog[open]');
    if (!dialog) return;
    var stops = Array.from(dialog.querySelectorAll('button, summary, input, select, textarea, a[href], [tabindex]')).filter(function (node) {
      return node.tabIndex >= 0 && !node.disabled && !node.closest('[inert]') && node.getClientRects().length;
    });
    if (!stops.length) return;
    if (event.shiftKey && event.target === stops[0]) {
      event.preventDefault(); stops[stops.length - 1].focus();
    } else if (!event.shiftKey && event.target === stops[stops.length - 1]) {
      event.preventDefault(); stops[0].focus();
    }
  });
  window.addEventListener('pandora-remaked:localechange', function () {
    var header = document.querySelector('[data-remaked-header]');
    if (header) syncUiLocaleButtons(header);
  });
})();
