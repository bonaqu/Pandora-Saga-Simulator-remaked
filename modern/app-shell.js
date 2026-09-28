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
    header.querySelectorAll('[data-remaked-language]').forEach(function (button) {
      var active = Number(button.dataset.remakedLanguage) === current;
      button.setAttribute('aria-pressed', active ? 'true' : 'false');
    });
  }

  function syncUiLocaleButtons(header) {
    var current = i18n && typeof i18n.getLocale === 'function' ? i18n.getLocale() : 'en';
    header.querySelectorAll('[data-remaked-ui-locale]').forEach(function (button) {
      button.setAttribute('aria-pressed', button.dataset.remakedUiLocale === current ? 'true' : 'false');
    });
  }

  function syncDensityButtons(header) {
    var current = Number(getFlag(1, 1));
    header.querySelectorAll('[data-remaked-density]').forEach(function (button) {
      var active = Number(button.dataset.remakedDensity) === current;
      button.setAttribute('aria-pressed', active ? 'true' : 'false');
    });
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
    language.className = 'remaked-segment';
    localizeAttribute(language, 'aria-label', 'controls.gameDataLanguage', 'Game data language');
    ['JP', 'EN', 'TW'].forEach(function (label, index) {
      var button = makeButton(label, 'remaked-segment-button');
      button.dataset.remakedLanguage = String(index);
      button.setAttribute('aria-pressed', 'false');
      button.addEventListener('click', function () {
        var legacyControl = document.getElementById('Lang_' + index);
        if (legacyControl) legacyControl.click();
        syncLanguageButtons(header);
        syncNavButtons(header);
      });
      language.appendChild(button);
    });
    return language;
  }

  function createUiLocaleControl(header) {
    var control = document.createElement('div');
    control.className = 'remaked-segment remaked-ui-locale';
    localizeAttribute(control, 'aria-label', 'controls.interfaceLanguage', 'Interface language');
    ['EN', 'RU'].forEach(function (label) {
      var locale = label.toLowerCase();
      var button = makeButton(label, 'remaked-segment-button');
      button.dataset.remakedUiLocale = locale;
      button.setAttribute('aria-pressed', 'false');
      button.addEventListener('click', function () {
        if (i18n && typeof i18n.setLocale === 'function') i18n.setLocale(locale);
        syncUiLocaleButtons(header);
      });
      control.appendChild(button);
    });
    return control;
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
    copy.appendChild(source);

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
    primary.appendChild(makeLink('Updates', updatesUrl, 'header.updates'));
    primary.appendChild(makeLink('Legacy Mode', legacyUrl, 'header.legacyMode'));
    top.appendChild(primary);

    var controls = document.createElement('div');
    controls.className = 'remaked-utilities remaked-utilities-controls';
    controls.appendChild(createUiLocaleControl(header));
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
    defaultLabels.forEach(function (label, index) {
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
    navRow.appendChild(nav);

    var density = document.createElement('div');
    density.className = 'remaked-density';
    localizeAttribute(density, 'aria-label', 'controls.displayDensity', 'Display density');
    ['Heavy', 'Medium', 'Light'].forEach(function (label, index) {
      var keys = ['controls.density.heavy', 'controls.density.medium', 'controls.density.light'];
      var button = makeButton(label, 'remaked-density-button', keys[index]);
      button.dataset.remakedDensity = String(index);
      button.setAttribute('aria-pressed', 'false');
      button.addEventListener('click', function () {
        var legacyControl = document.getElementById('CSS_' + index);
        if (legacyControl) legacyControl.click();
        syncDensityButtons(header);
      });
      density.appendChild(button);
    });
    navRow.appendChild(density);
    header.appendChild(navRow);

    syncLanguageButtons(header);
    syncUiLocaleButtons(header);
    syncDensityButtons(header);
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
        syncDensityButtons(existingHeader);
        syncNavButtons(existingHeader);
      }
      return existing;
    }

    var legacyBody = document.getElementById('body');
    if (!legacyBody || !legacyBody.parentNode) return null;
    document.body.classList.add('remaked-modern');
    document.body.dataset.remakedMode = 'modern';
    markLegacyToolbar();

    var shell = document.createElement('div');
    shell.className = 'remaked-shell';
    shell.dataset.remakedShell = '';
    var frame = document.createElement('main');
    frame.className = 'remaked-app-frame';
    localizeAttribute(frame, 'aria-label', 'shell.calculator', 'Pandora Saga character simulator');
    legacyBody.parentNode.insertBefore(shell, legacyBody);
    shell.appendChild(createHeader());
    shell.appendChild(createDiscoveryTools());
    shell.appendChild(frame);
    frame.appendChild(legacyBody);
    return shell;
  };

  namespace.initModernShell();
  window.addEventListener('pandora-remaked:localechange', function () {
    var header = document.querySelector('[data-remaked-header]');
    if (header) syncUiLocaleButtons(header);
  });
})();
