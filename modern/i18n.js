(function () {
  'use strict';

  var namespace = window.PandoraRemaked = window.PandoraRemaked || {};
  var catalogs = window.PandoraRemakedLocales || { en: {} };
  var gameCatalogs = window.PandoraRemakedGameTerms || { ru: {} };
  var STORAGE_KEY = 'pandora.remaked.uiLocale.v1';
  var DEFAULT_LOCALE = 'en';
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

  function interpolate(template, values) {
    values = values || {};
    return String(template).replace(/\{([A-Za-z0-9_]+)\}/g, function (match, key) {
      return Object.prototype.hasOwnProperty.call(values, key) ? String(values[key]) : match;
    });
  }

  function translate(key, values) {
    var active = catalogs[currentLocale] || {};
    var english = catalogs[DEFAULT_LOCALE] || {};
    var value = Object.prototype.hasOwnProperty.call(active, key) ? active[key] : english[key];
    return interpolate(typeof value === 'string' ? value : key, values);
  }

  function translateGameTerm(key, fallback) {
    var published = namespace.catalog && namespace.catalog.gameLabel(key);
    if (published) return published;
    // JP/TW use the original game's language, while their Modern shell is EN.
    // An English name override must not silently replace those source languages.
    var useEnglish = !window.Flag || Number(window.Flag[0]) === 1;
    var active = currentLocale === 'en' && !useEnglish ? {} : gameCatalogs[currentLocale] || {};
    var value = Object.prototype.hasOwnProperty.call(active, key) ? active[key] : '';
    if (!value && currentLocale === 'ru' && useEnglish) value = (gameCatalogs.en || {})[key] || '';
    return typeof value === 'string' && value ? value : String(fallback == null ? '' : fallback);
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

  namespace.i18n = {
    apply: apply,
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
})();
