(function () {
  'use strict';

  // The original selects remain the single source of character/build state.
  // Native <option> cannot reliably show per-option hover help, so Modern
  // offers a keyboard-accessible list with a live description beside it.
  var namespace = window.PandoraRemaked = window.PandoraRemaked || {};
  var catalog = window.PandoraRemakedGuildSkills;
  if (!catalog || catalog.schemaVersion !== 1 || !Array.isArray(catalog.skills)) return;

  var panel, menu, trigger, source, selectedButton, watcher, pending = false;

  function locale() { return namespace.i18n?.getLocale() || 'en'; }
  function byId(id) { return document.getElementById(id); }
  function hint(index, level) {
    if (level < 1) return locale() === 'ru'
      ? 'Навык не выбран. Выбери уровень, чтобы увидеть его эффект.'
      : 'No skill selected. Choose a level to inspect its effect.';
    var entry = catalog.skills[index]?.levels[level - 1];
    if (!entry) return '';
    var key = 'calculator.clan.' + index + '.level.' + level + '.hint';
    var published = namespace.i18n?.game(key, '');
    return published || (locale() === 'ru' ? entry.ru : entry.en);
  }
  function sync() {
    for (var index = 0; index < catalog.skills.length; index++) {
      var select = byId('SelBuffClan_' + index);
      if (!select || !select._remakedGuildButton) continue;
      var button = select._remakedGuildButton;
      var value = select.options[select.selectedIndex]?.textContent || '';
      if (button.firstChild.textContent !== value) button.firstChild.textContent = value;
      button.setAttribute('aria-label', value);
      button.setAttribute('aria-expanded', String(menu && source === select));
    }
  }
  function close(restoreFocus) {
    var focus = restoreFocus && trigger;
    if (menu) menu.remove();
    menu = null; trigger = null; source = null; selectedButton = null;
    sync();
    if (focus && focus.isConnected) focus.focus({ preventScroll: true });
  }
  function preview(index, level, option, box) {
    if (!box) return;
    box.textContent = hint(index, level);
    if (selectedButton) selectedButton.classList.remove('remaked-guild-hovered');
    selectedButton = option;
    if (option) option.classList.add('remaked-guild-hovered');
  }
  function position(anchor) {
    if (!menu) return;
    var rect = anchor.getBoundingClientRect();
    var width = menu.getBoundingClientRect().width;
    var height = menu.getBoundingClientRect().height;
    var left = Math.max(8, Math.min(rect.left, window.innerWidth - width - 8));
    var below = window.innerHeight - rect.bottom - 8;
    var top = below >= Math.min(height, 260) || rect.top < height
      ? rect.bottom + 4 : rect.top - height - 4;
    top = Math.max(8, Math.min(top, window.innerHeight - height - 8));
    menu.style.left = left + 'px';
    menu.style.top = top + 'px';
  }
  function open(select) {
    if (menu && source === select) { close(true); return; }
    close(false);
    source = select;
    trigger = select._remakedGuildButton;
    var index = Number(select.dataset.remakedGuildIndex);
    var dropdown = document.createElement('div');
    dropdown.className = 'remaked-guild-popup';
    dropdown.dataset.remakedGuildPopup = String(index);
    dropdown.id = 'remaked-guild-popup-' + index;
    dropdown.setAttribute('role', 'dialog');
    dropdown.setAttribute('aria-label', catalog.skills[index]?.nameRu || 'Guild skills');
    var items = document.createElement('div');
    items.className = 'remaked-guild-options';
    items.setAttribute('role', 'listbox');
    items.setAttribute('aria-label', trigger.textContent.trim());
    var detail = document.createElement('div');
    detail.className = 'remaked-guild-preview';
    detail.id = 'remaked-guild-preview';
    detail.setAttribute('role', 'tooltip');
    detail.setAttribute('aria-live', 'polite');
    var options = [];
    Array.prototype.forEach.call(select.options, function (nativeOption, level) {
      var option = document.createElement('button');
      option.type = 'button';
      option.className = 'remaked-guild-option';
      option.dataset.remakedGuildOption = String(level);
      option.setAttribute('role', 'option');
      option.setAttribute('aria-selected', String(level === select.selectedIndex));
      option.setAttribute('aria-describedby', detail.id);
      option.textContent = nativeOption.textContent;
      option.tabIndex = -1;
      option.addEventListener('mouseenter', function () { preview(index, level, option, detail); });
      option.addEventListener('focus', function () { preview(index, level, option, detail); });
      option.addEventListener('click', function () {
        select.value = nativeOption.value;
        // Native onchange calculates guild presets, including all 7 passives.
        select.dispatchEvent(new Event('change', { bubbles: true }));
        close(true);
      });
      options.push(option);
      items.appendChild(option);
    });
    items.addEventListener('keydown', function (event) {
      var current = options.indexOf(document.activeElement);
      var next = event.key === 'ArrowDown' ? Math.min(options.length - 1, current + 1)
        : event.key === 'ArrowUp' ? Math.max(0, current - 1)
        : event.key === 'Home' ? 0
        : event.key === 'End' ? options.length - 1 : -1;
      if (next >= 0) { event.preventDefault(); options[next].focus(); }
      else if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); close(true); }
    });
    dropdown.append(items, detail);
    menu = dropdown;
    document.body.appendChild(menu);
    position(trigger);
    sync();
    var focusLevel = Math.max(0, select.selectedIndex);
    var focused = options[focusLevel];
    preview(index, focusLevel, focused, detail);
    focused.focus({ preventScroll: true });
  }
  function enhance() {
    var container = byId('BUFFView');
    if (!container) return;
    if (!watcher) {
      watcher = new MutationObserver(function (changes) {
        if (changes.some(function (change) {
          return Array.prototype.some.call(change.addedNodes, function (node) {
            return node.nodeType === 1 &&
              (node.matches?.('select[id^="SelBuffClan_"]') ||
               node.querySelector?.('select[id^="SelBuffClan_"]'));
          });
        })) schedule();
      });
      watcher.observe(container, { subtree: true, childList: true });
    }
    for (var index = 0; index < catalog.skills.length; index++) {
      var select = byId('SelBuffClan_' + index);
      if (!select || select._remakedGuildButton) continue;
      var field = document.createElement('div');
      field.className = 'remaked-guild-field';
      var button = document.createElement('button');
      button.type = 'button';
      button.className = 'remaked-guild-trigger';
      button.dataset.remakedGuildTrigger = String(index);
      button.setAttribute('aria-haspopup', 'listbox');
      button.setAttribute('aria-controls', 'remaked-guild-popup-' + index);
      button.setAttribute('aria-expanded', 'false');
      var caption = document.createElement('span');
      var chevron = document.createElement('span');
      chevron.className = 'remaked-guild-chevron';
      chevron.setAttribute('aria-hidden', 'true');
      chevron.textContent = '⌄';
      button.append(caption, chevron);
      select.before(field);
      field.append(select, button);
      select.dataset.remakedGuildSource = '';
      select.dataset.remakedGuildIndex = String(index);
      select.setAttribute('aria-hidden', 'true');
      select.tabIndex = -1;
      select._remakedGuildButton = button;
      button.addEventListener('click', function (nativeSelect) {
        return function () { open(nativeSelect); };
      }(select));
      button.addEventListener('keydown', function (nativeSelect) {
        return function (event) {
          if (event.key === 'ArrowDown' || event.key === 'ArrowUp' || event.key === 'Enter' || event.key === ' ') {
            event.preventDefault(); open(nativeSelect);
          }
        };
      }(select));
    }
    sync();
  }
  function schedule() {
    if (pending) return;
    pending = true;
    window.requestAnimationFrame(function () {
      pending = false;
      if (menu && (!source || !source.isConnected)) close(false);
      enhance();
    });
  }
  function init() {
    enhance();
    document.addEventListener('change', function (event) {
      if (event.target?.matches?.('select[id^="SelBuffClan_"]')) schedule();
    });
    document.addEventListener('pointerdown', function (event) {
      if (menu && !menu.contains(event.target) && !trigger.contains(event.target)) close(false);
    });
    document.addEventListener('focusin', function (event) {
      if (menu && !menu.contains(event.target) && event.target !== trigger) close(false);
    });
    window.addEventListener('pandora-remaked:localechange', function () { close(false); schedule(); });
    window.addEventListener('pandora-remaked:translationchange', function () { close(false); schedule(); });
    window.addEventListener('resize', function () { if (menu && trigger) position(trigger); });
    window.addEventListener('scroll', function () { if (menu && trigger) position(trigger); }, true);
  }
  namespace.guildTooltips = { refresh: schedule, description: hint };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
})();
