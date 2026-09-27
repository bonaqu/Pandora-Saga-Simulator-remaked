(function () {
  'use strict';

  var namespace = window.PandoraRemaked = window.PandoraRemaked || {};
  var hooks = document.getElementById('remaked-shell-hooks');
  var defaultLabels = ['JOB', 'SKILL', 'ATTACK', 'DEFENSE', 'BUFF', 'LOG', 'FILE'];
  var HERO_ART_URL = 'https://images.mmorpg.com/reviews/206/images/ps-nation.jpg';
  var HERO_ART_SOURCE = 'https://www.mmorpg.com/reviews/our-official-pandora-saga-review-2000055105';

  function makeLink(label, href) {
    var link = document.createElement('a');
    link.className = 'remaked-link';
    link.textContent = label;
    link.href = href;
    if (/^https?:/i.test(href)) {
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
    }
    return link;
  }

  function makeButton(label, className) {
    var button = document.createElement('button');
    button.type = 'button';
    button.className = className || 'remaked-control';
    button.textContent = label;
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
      if (sourceLabel && sourceLabel.textContent.trim()) {
        button.textContent = sourceLabel.textContent.trim();
      } else {
        button.textContent = defaultLabels[tab];
      }
    });
  }

  function createLanguageControl(header) {
    var language = document.createElement('div');
    language.className = 'remaked-segment';
    language.setAttribute('aria-label', 'Language');
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
    eyebrow.textContent = 'Pandora Saga · Character Builder';

    var title = document.createElement('h1');
    title.id = 'remaked-hero-title';
    title.textContent = 'Pandora Saga Simulator';

    var meta = document.createElement('div');
    meta.className = 'remaked-hero-meta';

    var badge = document.createElement('span');
    badge.className = 'remaked-hero-badge';
    badge.textContent = 'Remaked';

    var versionText = document.createElement('span');
    versionText.textContent = 'Legacy ' + version.legacyEngine + ' · UI ' + version.ui;

    meta.appendChild(badge);
    meta.appendChild(versionText);

    var subtitle = document.createElement('p');
    subtitle.textContent = 'The preserved legacy calculator, wrapped in a cleaner modern interface.';

    var source = document.createElement('a');
    source.className = 'remaked-hero-source';
    source.href = HERO_ART_SOURCE;
    source.target = '_blank';
    source.rel = 'noopener noreferrer';
    source.textContent = 'Pandora Saga in-game screenshot';

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
    image.referrerPolicy = 'no-referrer';
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
    primary.appendChild(makeLink('Project', projectUrl));
    primary.appendChild(makeLink('Updates', updatesUrl));
    primary.appendChild(makeLink('Legacy Mode', legacyUrl));
    top.appendChild(primary);

    var controls = document.createElement('div');
    controls.className = 'remaked-utilities remaked-utilities-controls';
    controls.appendChild(createLanguageControl(header));

    var version = window.PandoraRemakedVersion || { legacyEngine: '2.00', ui: '2026.09.1' };
    var versionNode = document.createElement('span');
    versionNode.className = 'remaked-version';
    versionNode.dataset.remakedVersion = '';
    versionNode.textContent = 'Legacy ' + version.legacyEngine + ' · Remaked ' + version.ui;
    controls.appendChild(versionNode);
    top.appendChild(controls);

    header.appendChild(top);
    header.appendChild(createHero());

    var navRow = document.createElement('div');
    navRow.className = 'remaked-nav-row';

    var nav = document.createElement('nav');
    nav.className = 'remaked-nav';
    nav.dataset.remakedNav = '';
    nav.setAttribute('aria-label', 'Simulator sections');
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
    density.setAttribute('aria-label', 'Display density');
    ['Heavy', 'Medium', 'Light'].forEach(function (label, index) {
      var button = makeButton(label, 'remaked-density-button');
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
    syncDensityButtons(header);
    syncNavButtons(header);
    return header;
  }

  function markToolbarContaining(id) {
    var element = document.getElementById(id);
    if (!element) return;
    var innerList = element.closest('ul');
    if (!innerList || !innerList.parentElement || innerList.parentElement.tagName !== 'LI') return;
    var outerList = innerList.parentElement.parentElement;
    if (outerList && outerList.tagName === 'UL') {
      outerList.classList.add('remaked-legacy-toolbar');
    }
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
    frame.setAttribute('aria-label', 'Pandora Saga character simulator');

    legacyBody.parentNode.insertBefore(shell, legacyBody);
    shell.appendChild(createHeader());
    shell.appendChild(frame);
    frame.appendChild(legacyBody);
    return shell;
  };

  namespace.initModernShell();
})();
