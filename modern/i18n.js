(function () {
  'use strict';

  var namespace = window.PandoraRemaked = window.PandoraRemaked || {};
  var catalogs = window.PandoraRemakedLocales || { en: {} };
  var gameCatalogs = window.PandoraRemakedGameTerms || { ru: {} };
  var STORAGE_KEY = 'pandora.remaked.uiLocale.v1';
  var DEFAULT_LOCALE = 'en';
  // Curated Modern terminology for currently blank workbook cells. Explicit
  // workbook translations still win, so these fallbacks disappear naturally
  // when the translator fills those rows.
  var FALLBACK_TERMINOLOGY = Object.freeze({
    ru: Object.freeze({
      ui: Object.freeze({
        'skills.adeptness': 'Изучено (ОЧ)',
        'skills.potential': 'Потенциал.'
      }),
      game: Object.freeze({
        'calculator.text.3': 'Учитывать умения',
        'calculator.text.5': 'Учитывать мастерство',
        'calculator.text.6': 'Учитывать эфф. зелий',
        'calculator.text.7': 'Сброс характеристик',
        'calculator.text.8': 'Сброс умений',
        'calculator.text.9': 'Сбросить все',
        'calculator.text.16': 'Верхом',
        'calculator.text.17': 'Эффекты умений',
        'calculator.text.18': 'Эффекты зелий',
        'calculator.text.19': 'Хар-ки верхом'
      })
    })
  });
  var supported = Object.keys(catalogs).filter(function (locale) {
    return catalogs[locale] && typeof catalogs[locale] === 'object';
  });

  if (supported.indexOf(DEFAULT_LOCALE) === -1) supported.unshift(DEFAULT_LOCALE);

  function normalizeLocale(value) {
    value = String(value || '').toLowerCase().split('-')[0];
    return supported.indexOf(value) === -1 ? DEFAULT_LOCALE : value;
  }

  function readStoredLocale() {
    try {
      return window.localStorage.getItem(STORAGE_KEY);
    } catch (error) {
      return null;
    }
  }

  function requestedLocale() {
    var query = new URLSearchParams(window.location.search).get('ui');
    if (query && supported.indexOf(String(query).toLowerCase()) !== -1) return query;
    return readStoredLocale() || DEFAULT_LOCALE;
  }

  var currentLocale = normalizeLocale(requestedLocale());
  var publishedResultLabels = Object.create(null);

  function terminology(kind, key) {
    var locale = FALLBACK_TERMINOLOGY[currentLocale];
    var group = locale && locale[kind];
    return group && Object.prototype.hasOwnProperty.call(group, key) ? group[key] : '';
  }

  // Presentation-only abbreviations for two legacy Russian captions.
  // Apply only to their previous exact text, so other catalog/admin edits win.
  var COMPACT_RU_ACTIONS = Object.freeze({
    'calculator.text.5': ['Учитывать мастерство умений', 'Учитывать мастерство'],
    'calculator.text.6': ['Учитывать эффекты зелий', 'Учитывать эфф. зелий']
  });
  function compactActionLabel(key, value) {
    var entry = currentLocale === 'ru' && COMPACT_RU_ACTIONS[key];
    return entry && value === entry[0] ? entry[1] : value;
  }

  function interpolate(template, values) {
    values = values || {};
    return String(template).replace(/\{([A-Za-z0-9_]+)\}/g, function (match, key) {
      return Object.prototype.hasOwnProperty.call(values, key) ? String(values[key]) : match;
    });
  }

  function translate(key, values) {
    var active = catalogs[currentLocale] || {};
    var english = catalogs[DEFAULT_LOCALE] || {};
    var value = Object.prototype.hasOwnProperty.call(active, key) ? active[key] : terminology('ui', key);
    if (!value) value = english[key];
    return interpolate(typeof value === 'string' ? value : key, values);
  }

  function translateGameTerm(key, fallback) {
    if (currentLocale === 'ru' && Object.prototype.hasOwnProperty.call(publishedResultLabels, key)) return publishedResultLabels[key];
    var published = namespace.catalog && namespace.catalog.gameLabel(key);
    if (published) return compactActionLabel(key, published);
    // JP/TW keep the original game's language for Legacy game terms while the
    // Modern shell uses its sparse JP/TW catalog with English fallback.
    // An English game-name override must not silently replace source languages.
    var useEnglish = !window.Flag || Number(window.Flag[0]) === 1;
    var active = currentLocale === 'en' && !useEnglish ? {} : gameCatalogs[currentLocale] || {};
    var value = Object.prototype.hasOwnProperty.call(active, key) ? active[key] : terminology('game', key);
    if (!value && currentLocale === 'ru' && useEnglish) value = (gameCatalogs.en || {})[key] || '';
    return compactActionLabel(key, typeof value === 'string' && value ? value : String(fallback == null ? '' : fallback));
  }

  function storedValues(node) {
    try {
      return node.dataset.remakedI18nValues ? JSON.parse(node.dataset.remakedI18nValues) : {};
    } catch (error) {
      return {};
    }
  }

  function apply(root) {
    root = root || document;
    var nodes = [];
    if (root.nodeType === 1 && root.hasAttribute('data-remaked-i18n')) nodes.push(root);
    if (root.querySelectorAll) {
      root.querySelectorAll('[data-remaked-i18n]').forEach(function (node) { nodes.push(node); });
    }
    nodes.forEach(function (node) {
      node.textContent = translate(node.dataset.remakedI18n, storedValues(node));
    });

    ['aria-label', 'placeholder', 'title'].forEach(function (attribute) {
      var dataName = 'remakedI18n' + attribute.split('-').map(function (part) {
        return part.charAt(0).toUpperCase() + part.slice(1);
      }).join('');
      var selector = '[data-' + dataName.replace(/[A-Z]/g, function (letter) {
        return '-' + letter.toLowerCase();
      }) + ']';
      var attributeNodes = [];
      if (root.nodeType === 1 && root.matches(selector)) attributeNodes.push(root);
      if (root.querySelectorAll) {
        root.querySelectorAll(selector).forEach(function (node) { attributeNodes.push(node); });
      }
      attributeNodes.forEach(function (node) {
        node.setAttribute(attribute, translate(node.dataset[dataName], storedValues(node)));
      });
    });
    return root;
  }

  function bindText(node, key, values) {
    node.dataset.remakedI18n = key;
    if (values) node.dataset.remakedI18nValues = JSON.stringify(values);
    node.textContent = translate(key, values);
    return node;
  }

  function bindAttribute(node, attribute, key, values) {
    var dataName = 'remakedI18n' + attribute.split('-').map(function (part) {
      return part.charAt(0).toUpperCase() + part.slice(1);
    }).join('');
    node.dataset[dataName] = key;
    if (values) node.dataset.remakedI18nValues = JSON.stringify(values);
    node.setAttribute(attribute, translate(key, values));
    return node;
  }

  function setLocale(locale) {
    currentLocale = normalizeLocale(locale);
    try {
      window.localStorage.setItem(STORAGE_KEY, currentLocale);
    } catch (error) {
      // Locale persistence must never block the calculator.
    }
    document.documentElement.lang = currentLocale;
    apply(document);
    // Consumers such as search read the calculator DOM during localechange.
    // Commit its display projection before notifying them.
    if (namespace.gameTermDisplay) namespace.gameTermDisplay.refresh();
    window.dispatchEvent(new CustomEvent('pandora-remaked:localechange', {
      detail: { locale: currentLocale }
    }));
    return currentLocale;
  }

  function applyPublishedResultLabels(payload) {
    if (!payload || payload.ok !== true || payload.schemaVersion !== 1 || !payload.overrides ||
        typeof payload.overrides !== 'object' || Array.isArray(payload.overrides)) return false;
    var changed = Object.create(null);
    for (var key of Object.keys(payload.overrides)) {
      if (!/^calculator\.status\.(?:[0-9]|[1-3][0-9]|4[0-2])$/.test(key)) return false;
      var text = payload.overrides[key];
      if (typeof text !== 'string' || !text.trim() || text.length > 100 || /[\x00-\x1f\x7f]/.test(text)) return false;
      changed[key] = text;
    }
    publishedResultLabels = changed;
    if (namespace.gameTermDisplay) namespace.gameTermDisplay.refresh();
    return true;
  }

  namespace.i18n = {
    apply: apply,
    applyPublishedResultLabels: applyPublishedResultLabels,
    bindAttribute: bindAttribute,
    bindText: bindText,
    game: translateGameTerm,
    getLocale: function () { return currentLocale; },
    setLocale: setLocale,
    supportedLocales: supported.slice(),
    t: translate,
    storageKey: STORAGE_KEY
  };

  document.documentElement.lang = currentLocale;
  // Editor customizations are deliberately independent from workbook updates.
  // Fetch only explicit published overrides, never rewrite base translations.
  if (location.origin === 'https://bonaqu.github.io') {
    fetch('https://pandora-saga-simulator-remaked-admin-api.bonaqu.workers.dev/api/result-labels', {
      credentials: 'omit', cache: 'no-store', signal: AbortSignal.timeout(4000)
    }).then(function (response) {
      if (!response.ok) throw new Error('Result translations unavailable');
      return response.json();
    }).then(applyPublishedResultLabels).catch(function () {
      // Offline and older Workers continue using bundled approved Excel text.
    });
  }
})();
