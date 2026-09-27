(function () {
  'use strict';

  var namespace = window.PandoraRemaked = window.PandoraRemaked || {};
  var hooks = document.getElementById('remaked-shell-hooks');
  var defaultLabels = ['JOB', 'SKILL', 'ATTACK', 'DEFENSE', 'BUFF', 'LOG', 'FILE'];

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

  function createBrand() {
    var brand = document.createElement('div');
    brand.className = 'remaked-brand';

    var mark = document.createElement('span');
    mark.className = 'remaked-brand-mark';
    mark.textContent = 'PS';
    mark.setAttribute('aria-hidden', 'true');

    var copy = document.createElement('div');
    copy.className = 'remaked-brand-copy';

    var title = document.createElement('strong');
    title.textContent = 'Pandora Saga Simulator';

    var subtitle = document.createElement('span');
    subtitle.textContent = 'Remaked';

    copy.appendChild(title);
    copy.appendChild(subtitle);
    brand.appendChild(mark);
    brand.appendChild(copy);
    return brand;
  }

  function createHeader() {
    var header = document.createElement('header');
    header.className = 'remaked-header';
    header.dataset.remakedHeader = '';

    var top = document.createElement('div');
    top.className = 'remaked-header-top';
    top.appendChild(createBrand());

    var utilities = document.createElement('div');
    utilities.className = 'remaked-utilities';

    var projectUrl = hooks && hooks.dataset.projectUrl ? hooks.dataset.projectUrl : '#';
    var updatesUrl = hooks && hooks.dataset.updatesUrl ? hooks.dataset.updatesUrl : '#';
    var legacyUrl = hooks && hooks.dataset.legacyUrl ? hooks.dataset.legacyUrl : './legacy/';
    utilities.appendChild(makeLink('Project', projectUrl));
    utilities.appendChild(makeLink('Updates', updatesUrl));
    utilities.appendChild(makeLink('Legacy Mode', legacyUrl));

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
    utilities.appendChild(language);

    var version = window.PandoraRemakedVersion || { legacyEngine: '2.00', ui: '2026.09.1' };
    var versionNode = document.createElement('span');
    versionNode.className = 'remaked-version';
    versionNode.dataset.remakedVersion = '';
    versionNode.textContent = 'Legacy ' + version.legacyEngine + ' · Remaked ' + version.ui;
    utilities.appendChild(versionNode);

    top.appendChild(utilities);
    header.appendChild(top);

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

  function markLegacyToolbar(legacyBody) {
    var toolbars = legacyBody.querySelectorAll(':scope > ul > li > ul');
    if (toolbars[0]) toolbars[0].classList.add('remaked-legacy-toolbar');
    if (toolbars[1]) toolbars[1].classList.add('remaked-legacy-toolbar');
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
    markLegacyToolbar(legacyBody);

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
