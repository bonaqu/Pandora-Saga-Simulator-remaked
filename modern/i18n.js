(function () {
  'use strict';

  var namespace = window.PandoraRemaked = window.PandoraRemaked || {};
  var catalogs = window.PandoraRemakedLocales || { en: {} };
  var publishedUi = { ru: {}, en: {} };
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
        'skills.potential': 'Потенциал.',
        'skills.help': "Изучение расходует очки умений. Потенциал использует отдельные очки, запас которых показан рядом с уровнем персонажа. Ограничения и стоимость определяются правилами калькулятора."
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
        'calculator.text.19': 'Хар-ки верхом',
        'calculator.text.21': "СД",
        'calculator.text.22': "Благословение",
        'calculator.text.23': "Песнопения",
        'calculator.text.24': "Гильдия",
        'calculator.text.25': "Честь",
        'calculator.clan.0': "Гильдия",
        'calculator.clan.1': "Сила гильдии",
        'calculator.clan.2': "Дух гильдии",
        'calculator.clan.3': "Восстановление силы",
        'calculator.clan.4': "Восстановление духа",
        'calculator.clan.5': "Физическая устойчивость",
        'calculator.clan.6': "Магическая устойчивость",
        'calculator.clan.7': "Опыт",
        'calculator.clan.8': "Магистр исцеления",
        'calculator.clan.9': "Магистр битвы",
        'calculator.clan.10': "Магистр магии",
        'skill_entry.0.7': "Боевой клич",
        'skill_entry.1.4': "Концентрация",
        'skill_entry.14.3': "Велокс",
        'skill_entry.0.8': "Провидение",
        'skill_entry.3.2': "Рёв",
        'skill_entry.14.4': "Лапис Медио",
        'skill_entry.6.2': "Ускорение",
        'skill_entry.5.5': "Заслон",
        'skill_entry.14.6': "Групповой барьер",
        'skill_entry.6.3': "Третий глаз",
        'skill_entry.11.3': "Быстрый шаг",
        'skill_entry.14.8': "Сальтио",
        'skill_entry.14.0': "Спокойствие духа",
        'skill_entry.11.6': "Уклонение",
        'skill_entry.14.9': "Боевая молитва",
        'skill_entry.14.1': "Божественная помощь",
        'skill_entry.15.0': "Восстановление маны",
        'skill_entry.14.2': "Зачарование",
        'skill_entry.0.9': "Яростная душа",
        'skill_entry.15.8': "Освящение оружия",
        'skill_entry.15.1': "Стремительный ветер",
        'skill_entry.0.10': "Фаланга",
        'skill_entry.16.0': "Песня менестреля",
        'skill_entry.0.11': "Десперадо",
        'skill_entry.16.2': "Гимн мира",
        'skill_entry.7.0': "Скорострельность",
        'skill_entry.16.3': "Песня мудреца",
        'skill_entry.7.1': "Снайперская позиция",
        'skill_entry.11.0': "Прилив сил",
        'skill_entry.18.8': "Защита от огня",
        'skill_entry.18.9': "Защита от холода",
        'skill_entry.8.1': "Отравление",
        'skill_entry.18.10': "Защита от молний",
        'skill_entry.20.3': "Мрак",
        'skill_entry.20.7': "Защита от зла",
        'skill_entry.21.7': "Защита от чар",
        'skill_detail.0.7.3': "Повышает физическую атаку всех участников группы.",
        'skill_detail.1.4.3': "Сильный удар, способный пробить броню.",
        'skill_detail.14.3.3': "Повышает скорость атаки цели.",
        'skill_detail.0.8.3': "Повышает сопротивление магии всех участников группы, укрепляя их веру.",
        'skill_detail.3.2.3': "Обостряет чувства, повышая вероятность критических ударов.",
        'skill_detail.14.4.3': "Повышает физическую защиту всех участников группы.",
        'skill_detail.6.2.3': "Повышает скорость передвижения. Подробности эффекта в исходном описании не уточнены.",
        'skill_detail.5.5.3': "Снижает уклонение и повышает сопротивление критическим ударам.",
        'skill_detail.14.6.3': "Снижает урон, получаемый всеми участниками группы.",
        'skill_detail.6.3.3': "Повышает точность физических атак участников группы.",
        'skill_detail.11.3.3': "Повышает уклонение.",
        'skill_detail.14.8.3': "Повышает скорость произнесения заклинаний цели.",
        'skill_detail.14.0.3': "Ускоряет восстановление маны у всех участников группы.",
        'skill_detail.11.6.3': "Повышает уклонение. Эффект прекращается после двух попаданий физических атак.",
        'skill_detail.14.9.3': "Повышает силу, ловкость и интеллект цели.",
        'skill_detail.14.1.3': "Временно увеличивает максимальное здоровье всех участников группы.",
        'skill_detail.15.0.3': "Восстанавливает ману цели, усиливая её магическую энергию.",
        'skill_detail.14.2.3': "Накладывает на союзника эффект, повышающий урон аурой и магическую атаку.",
        'skill_detail.0.9.3': "Повышает силу атаки ценой снижения защиты.",
        'skill_detail.15.8.3': "Придаёт оружию цели ауру Света.",
        'skill_detail.15.1.3': "Повышает уклонение всех участников группы.",
        'skill_detail.0.10.3': "Жертвует силой собственной атаки ради усиления защиты. Требуется щит.",
        'skill_detail.16.0.3': "Песня, повышающая точность и уклонение игроков в зоне действия.",
        'skill_detail.0.11.3': "Повышает собственную физическую атаку, но снижает физическую защиту.",
        'skill_detail.16.2.3': "Песня, усиливающая защиту. Защищает игроков от урона ниже определённого значения.",
        'skill_detail.7.0.3': "Позволяет вести быстрый огонь из арбалета. Подробности эффекта в исходном описании не уточнены.",
        'skill_detail.16.3.3': "Песня, повышающая магическую атаку и сокращающая время восстановления умений игроков в зоне действия.",
        'skill_detail.7.1.3': "Значительно усиливает атаку, но не позволяет передвигаться.",
        'skill_detail.11.0.3': "Увеличивает скорость передвижения.",
        'skill_detail.18.8.3': "Повышает сопротивление холоду, но снижает сопротивление огню и молнии.",
        'skill_detail.18.9.3': "Повышает сопротивление огню, но снижает сопротивление холоду и молнии.",
        'skill_detail.8.1.3': "Придаёт оружию свойство яда, позволяющее отравлять противника. Расходует один флакон яда.",
        'skill_detail.18.10.3': "Повышает сопротивление молнии, но снижает сопротивление огню и холоду.",
        'skill_detail.20.3.3': "Накладывает на оружие ауру тьмы. Раненый этим оружием противник получает проклятие, обращающее его атаки против него самого.",
        'skill_detail.20.7.3': "Повышает сопротивление яду и тьме, но снижает сопротивление очарованию.",
        'skill_detail.21.7.3': "Повышает сопротивление очарованию, но снижает сопротивление яду и тьме."
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

  // Normalize only the previously published mixed-language help text. A fully
  // translated workbook/admin value retains precedence over this compatibility fix.
  var OLD_RU_SKILLS_HELP = 'Adeptness использует очки Skill. Potential использует свой запас очков рядом с уровнем. Ограничения и стоимость определяет движок Legacy.';
  function localizedUiValue(key, value) {
    if (currentLocale === 'ru' && key === 'skills.help' && value === OLD_RU_SKILLS_HELP)
      return terminology('ui', key);
    return value;
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
    var override = publishedUi[currentLocale] && publishedUi[currentLocale][key];
    var value = override || (Object.prototype.hasOwnProperty.call(active, key) ? active[key] : terminology('ui', key));
    if (!value) value = english[key];
    return interpolate(typeof value === 'string' ? localizedUiValue(key, value) : key, values);
  }

  // Older workbook labels are normalized only when they still match that exact
  // approved old wording. Independently published/admin-customized text wins.
  var RU_LABEL_RENAMES = Object.freeze({
    'skill_entry.18.8': ['Сопротивляемость огню', 'Сопр. огню'],
    'skill_entry.18.9': ['Сопротивляемость льду', 'Сопр. льду'],
    'skill_entry.18.10': ['Сопротивляемость молниям', 'Сопр. молнии'],
    'skill_entry.20.7': ['Сопротивляемость магии тьмы', 'Сопр. тьме'],
    'skill_entry.21.7': ['Сопротивляемость чарам', 'Сопр. чарам'],
    'calculator.status.39': ['Сопр. тьмы', 'Сопр. тьме']
  });
  function normalizeRussianLabel(key, value) {
    var replacement = RU_LABEL_RENAMES[key];
    return currentLocale === 'ru' && replacement && value === replacement[0] ? replacement[1] : value;
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
    return compactActionLabel(key, normalizeRussianLabel(key, typeof value === 'string' && value ? value : String(fallback == null ? '' : fallback)));
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
      if (typeof text !== 'string' || !text.trim() || text.length > 100 || /[\x00-\x1f\x7f<>]/.test(text)) return false;
      changed[key] = text;
    }
    publishedResultLabels = changed;
    if (namespace.gameTermDisplay) namespace.gameTermDisplay.refresh();
    return true;
  }

  function applyPublishedUi(payload) {
    if (!payload || payload.ok !== true || payload.schemaVersion !== 1 ||
        !payload.overrides || typeof payload.overrides !== 'object') return false;
    var next = { ru: {}, en: {} };
    for (var locale of ['ru', 'en']) {
      var words = payload.overrides[locale];
      if (!words || typeof words !== 'object' || Array.isArray(words)) return false;
      for (var [key, value] of Object.entries(words)) {
        if (!Object.prototype.hasOwnProperty.call(catalogs.en || {}, key) ||
            typeof value !== 'string' || !value.trim() || value.length > 300 ||
            /[\\x00-\\x1f\\x7f<>]/.test(value)) return false;
        next[locale][key] = value;
      }
    }
    publishedUi = next;
    apply(document);
    return true;
  }

  namespace.i18n = {
    apply: apply,
    applyPublishedResultLabels: applyPublishedResultLabels,
    applyPublishedUi: applyPublishedUi,
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
    fetch('https://pandora-saga-simulator-remaked-admin-api.bonaqu.workers.dev/api/ui-translations', {
      credentials: 'omit', cache: 'no-store', signal: AbortSignal.timeout(4000)
    }).then(function (response) {
      if (!response.ok) throw new Error('UI translation overrides unavailable');
      return response.json();
    }).then(applyPublishedUi).catch(function () {
      // Offline users always receive the bundled approved workbook catalog.
    });
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
