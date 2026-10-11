(function () {
  'use strict';
  // Display-only localization. Authentication, CSRF and the HttpOnly cookie
  // never flow through this module. D1 publications are read, not written.
  var select = document.getElementById('admin-language');
  var locales = ['ru','en','jp','tw'];
  var languageTags = {ru:'ru',en:'en',jp:'ja',tw:'zh-Hant'};
  var current = 'en', dictionary = null;
  // The login must stay explicitly English even if the localization API fails.
  document.documentElement.lang = 'en';
  function originalLanguage() {
    var native = String(navigator.language || '').toLowerCase();
    if (native.startsWith('ru')) return 'ru';
    if (native.startsWith('ja')) return 'jp';
    if (native.startsWith('zh')) return 'tw';
    return 'en';
  }
  function t(key, fallback) {
    var translated = dictionary?.[current]?.[key] || dictionary?.en?.[key];
    return typeof translated === 'string' && translated.trim() ? translated : String(fallback || '');
  }
  function apply() {
    document.querySelectorAll('[data-admin-i18n]').forEach(function (node) {
      var key = node.getAttribute('data-admin-i18n');
      var text = t(key, node.textContent);
      // textContent cannot interpret a user-published string as HTML.
      if (node.textContent !== text) node.textContent = text;
    });
    document.querySelectorAll('[data-admin-i18n-aria]').forEach(function (node) {
      var key = node.getAttribute('data-admin-i18n-aria');
      var text = t(key, node.getAttribute('aria-label'));
      if (text) node.setAttribute('aria-label', text);
    });
    document.querySelectorAll('[data-admin-i18n-placeholder]').forEach(function (node) {
      var key = node.getAttribute('data-admin-i18n-placeholder');
      var text = t(key, node.getAttribute('placeholder'));
      if (text) node.setAttribute('placeholder', text);
    });
    document.querySelectorAll('[data-admin-i18n-title]').forEach(function (node) {
      var key = node.getAttribute('data-admin-i18n-title');
      var text = t(key, node.getAttribute('title'));
      if (text) node.setAttribute('title', text);
    });
    document.documentElement.lang = languageTags[current] || 'en';
  }
  function change(locale) {
    if (!locales.includes(locale) || !dictionary) return;
    current = locale;
    select.value = locale;
    apply();
    window.dispatchEvent(new Event('pandora-admin:localechange'));
  }
  select.disabled = true; // no misleading selector until text source is loaded
  select.addEventListener('change', function () { change(select.value); });
  window.PandoraAdminI18n = Object.freeze({t:t,apply:apply,getLocale:function(){return current;},change:change});
  fetch('/api/admin-shell-localization', {
    method:'GET',credentials:'same-origin',cache:'no-store',
    signal:AbortSignal.timeout(10000)
  }).then(function (response) {
    if (!response.ok) throw new Error('Admin localization unavailable');
    return response.json();
  }).then(function (data) {
    if (!data || data.ok !== true || data.schemaVersion !== 1 ||
        !data.locales || locales.some(function (locale) {
          return !data.locales[locale] ||
            Object.keys(data.locales[locale]).some(function (key) {
              var value = data.locales[locale][key];
              return !/^adminShell\.[A-Za-z]+$/.test(key) ||
                typeof value !== 'string' || value.length > 4000 || /[<>]/.test(value);
            });
        })) throw new Error('Invalid locale catalog');
    dictionary = data.locales;
    select.disabled = false;
    change(originalLanguage());
  }).catch(function () {
    // Fail-open only for the text interface: the secure login remains usable
    // with the existing English markup, and no credentials are re-submitted.
    select.disabled = true;
    select.title = 'Interface translations are temporarily unavailable.';
  });
})();
