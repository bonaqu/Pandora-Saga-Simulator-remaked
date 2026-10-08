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
  var RU_RESULT_LABELS = Object.freeze({
    'calculator.status.2': ['УВЕЛИЧЗЕЛ', 'Леч. зельями'],
    'calculator.status.3': ['% исцел ОЗ', 'Леч. умениями'],
    'calculator.status.4': ['Восст ОМ', 'Расход ОМ'],
    'calculator.status.5': ['МаксАТК', 'АТК'],
    'calculator.status.6': ['Фронт+', 'АТК. спереди'],
    'calculator.status.7': ['Спина+', 'АТК сзади'],
    'calculator.status.9': ['ЗАЩИТА', 'Защита'],
    'calculator.status.10': ['Сопр ФРОНТ', 'Сопр. АТК спереди'],
    'calculator.status.11': ['Сопр УРОНСПИН', 'Сопр. АТК сзади'],
    'calculator.status.12': ['Сопр ФИЗ', 'Сопр. физ (ед.)'],
    'calculator.status.13': ['Сопр ФИЗ', 'Сопр. физ (%)'],
    'calculator.status.14': ['Сопр МАГ', 'Сопр. маг. урону'],
    'calculator.status.16': ['ТОЧН', 'Точн. спереди'],
    'calculator.status.17': ['ШАНС КРИТ', 'Шанс крита'],
    'calculator.status.18': ['Крит УРОН', 'Крит. урон'],
    'calculator.status.20': ['Сопр КРИТ', 'Сопр. криту'],
    'calculator.status.21': ['Сопр КРУРОН', 'Получ. крит. урон'],
    'calculator.status.22': ['Ближ УКЛОН', 'Укл. ближ. атак'],
    'calculator.status.23': ['Дальн АТК УКЛОН', 'Укл. дальн. атак'],
    'calculator.status.24': ['МАГУКЛОН', 'Укл. от магии'],
    'calculator.status.25': ['Дист ближ АТК', 'Дальн. АТК ближ. боя'],
    'calculator.status.26': ['Дист дальн АТК', 'Дальн. АТК дальн. боя'],
    'calculator.status.27': ['Сопр ОГН', 'Сопр. огню'],
    'calculator.status.28': ['СКР АТК', 'Скор. атаки'],
    'calculator.status.29': ['Сопр ЛЕД', 'Сопр. льду'],
    'calculator.status.30': ['СКР Каста', 'Скор. каста'],
    'calculator.status.31': ['ВремяКаст', 'Сокрщ. времени каста'],
    'calculator.status.32': ['Сопр МОЛН', 'Сопр. молнии'],
    'calculator.status.34': ['Сопр ЯД', 'Сопр. яду'],
    'calculator.status.35': ['СКР Движ', 'Скор. движения'],
    'calculator.status.36': ['СКР Движ Астир', 'Скор. в городе'],
    'calculator.status.37': ['Сопр ЧАР', 'Сопр. чарам'],
    'calculator.status.38': ['Сопр СВЕТ', 'Сопр. свету'],
    'calculator.status.39': ['Сопр ТЬМ', 'Сопр. тьмы'],
    'calculator.status.40': ['Сопр АНОМТЕЛ', 'Сопр. аном. тел.'],
    'calculator.status.41': ['Сопр АНОМДУХ', 'Сопр. аном. дух.'],
    'calculator.status.42': ['Сопр МАГ', 'Сопр. магии']
  });
  function compactActionLabel(key, value) {
    var entry = currentLocale === 'ru' && (RU_RESULT_LABELS[key] || COMPACT_RU_ACTIONS[key]);
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
