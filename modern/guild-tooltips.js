(function () {
  'use strict';
  // Keep the archived select, option values and onchange calculations intact.
  // A native option menu cannot expose reliable per-option hover events.
  var ns = window.PandoraRemaked = window.PandoraRemaked || {};
  var data = window.PandoraRemakedGuildSkills;
  if (!data || data.schemaVersion !== 1 || !Array.isArray(data.skills)) return;

  var menu = null, tip = null, source = null, trigger = null, observer = null, scheduled = false;
  function locale() { return ns.i18n?.getLocale() || 'en'; }
  function byId(id) { return document.getElementById(id); }
  function description(index, level) {
    if (level < 1) return '';
    var levelInfo = data.skills[index]?.levels[level - 1];
    if (!levelInfo) return '';
    var id = 'calculator.clan.' + index + '.level.' + level + '.hint';
    var approved = ns.i18n?.game(id, '') || (locale() === 'ru' ? levelInfo.ru : levelInfo.en);
    // Old D1 publications with exactly the obsolete prefix remain readable;
    // an independently edited description is not overwritten.
    if (index >= 1 && index <= 7) {
      approved = approved.replace(/^Passive:\s*/i, '').replace(/^Пассивно:\s*/i, '');
      approved = approved.replace(/^увеличивает\b/, 'Увеличивает').replace(/^повышает\b/, 'Повышает')
        .replace(/^уменьшает\b/, 'Уменьшает');
    }
    return approved;
  }
  function updateTriggers() {
    for (var i = 0; i < data.skills.length; i++) {
      var select = byId('SelBuffClan_' + i);
      if (!select?._remakedGuildButton) continue;
      var button = select._remakedGuildButton;
      var caption = select.options[select.selectedIndex]?.textContent || '';
      if (button.firstChild.textContent !== caption) button.firstChild.textContent = caption;
      button.setAttribute('aria-label', caption);
      button.setAttribute('aria-expanded', String(Boolean(menu && select === source)));
    }
  }
  function close(restoreFocus) {
    var focus = restoreFocus && trigger;
    if (menu) menu.remove();
    if (tip) tip.remove();
    menu = null; tip = null; source = null; trigger = null;
    updateTriggers();
    if (focus?.isConnected) focus.focus({ preventScroll: true });
  }
  function clamp(value, low, high) { return Math.max(low, Math.min(value, Math.max(low, high))); }
  function positionMenu() {
    if (!menu || !trigger) return;
    var rect = trigger.getBoundingClientRect();
    var w = menu.offsetWidth, h = menu.offsetHeight;
    menu.style.left = clamp(rect.left, 8, innerWidth - w - 8) + 'px';
    menu.style.top = (innerHeight - rect.bottom >= Math.min(h, 280) || rect.top < h
      ? clamp(rect.bottom + 3, 8, innerHeight - h - 8)
      : clamp(rect.top - h - 3, 8, innerHeight - h - 8)) + 'px';
  }
  function hideHint() {
    if (tip) tip.hidden = true;
    if (menu) menu.querySelectorAll('.remaked-guild-hovered').forEach(function (node) {
      node.classList.remove('remaked-guild-hovered');
    });
  }
  function showHint(index, level, item) {
    if (!tip || !menu) return;
    var text = description(index, level);
    if (!text) { hideHint(); return; }
    tip.textContent = text; tip.hidden = false;
    menu.querySelectorAll('.remaked-guild-hovered').forEach(function (node) {
      node.classList.remove('remaked-guild-hovered');
    });
    item.classList.add('remaked-guild-hovered');
    var list = menu.getBoundingClientRect(), row = item.getBoundingClientRect();
    var w = tip.offsetWidth, h = tip.offsetHeight, x, y;
    if (innerWidth - list.right >= w + 10) {
      x = list.right + 7; y = row.top - 5;
    } else if (list.left >= w + 10) {
      x = list.left - w - 7; y = row.top - 5;
    } else {
      x = clamp(list.left, 8, innerWidth - w - 8);
      y = (innerHeight - list.bottom >= h + 10)
        ? list.bottom + 5 : list.top - h - 5;
    }
    tip.style.left = clamp(x, 8, innerWidth - w - 8) + 'px';
    tip.style.top = clamp(y, 8, innerHeight - h - 8) + 'px';
  }
  function open(select) {
    if (menu && select === source) { close(true); return; }
    close(false);
    source = select; trigger = select._remakedGuildButton;
    var index = Number(select.dataset.remakedGuildIndex);
    var popup = document.createElement('div');
    popup.className = 'remaked-guild-popup';
    popup.dataset.remakedGuildPopup = String(index);
    popup.id = 'remaked-guild-popup-' + index;
    popup.setAttribute('role', 'listbox');
    popup.setAttribute('aria-label', trigger.firstChild.textContent);
    var tooltip = document.createElement('div');
    tooltip.className = 'remaked-guild-hover-tip';
    tooltip.dataset.remakedGuildTooltip = '';
    tooltip.id = 'remaked-guild-tooltip-' + index;
    tooltip.setAttribute('role', 'tooltip');
    tooltip.hidden = true;
    var options = [];
    Array.prototype.forEach.call(select.options, function (nativeOption, level) {
      var button = document.createElement('button');
      button.type = 'button';
      button.className = 'remaked-guild-option';
      button.dataset.remakedGuildOption = String(level);
      button.setAttribute('role', 'option');
      button.setAttribute('aria-selected', String(level === select.selectedIndex));
      button.setAttribute('aria-describedby', tooltip.id);
      button.tabIndex = -1;
      button.textContent = nativeOption.textContent;
      button.addEventListener('pointerenter', function (event) {
        if (event.pointerType !== 'touch') showHint(index, level, button);
      });
      button.addEventListener('focus', function () { showHint(index, level, button); });
      button.addEventListener('pointerleave', hideHint);
      button.addEventListener('click', function () {
        select.value = nativeOption.value;
        select.dispatchEvent(new Event('change', { bubbles: true }));
        close(true);
      });
      options.push(button); popup.appendChild(button);
    });
    popup.addEventListener('keydown', function (event) {
      var current = options.indexOf(document.activeElement);
      var next = event.key === 'ArrowDown' ? Math.min(options.length - 1, current + 1)
        : event.key === 'ArrowUp' ? Math.max(0, current - 1)
        : event.key === 'Home' ? 0
        : event.key === 'End' ? options.length - 1 : -1;
      if (next !== -1) { event.preventDefault(); options[next].focus(); }
      else if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); close(true); }
    });
    popup.addEventListener('pointerleave', hideHint);
    menu = popup; tip = tooltip;
    document.body.append(menu, tip);
    positionMenu(); updateTriggers();
    var active = options[Math.max(0, select.selectedIndex)];
    // Do not display an oversized unsolicited preview just on opening.
    active.focus({ preventScroll: true });
    hideHint();
    active.scrollIntoView({ block: 'nearest' });
  }
  function enhance() {
    var container = byId('BUFFView'); if (!container) return;
    if (!observer) {
      observer = new MutationObserver(function (records) {
        if (records.some(function (record) {
          return Array.from(record.addedNodes).some(function (node) {
            return node.nodeType === 1 && (node.matches?.('select[id^="SelBuffClan_"]') ||
              node.querySelector?.('select[id^="SelBuffClan_"]'));
          });
        })) schedule();
      });
      observer.observe(container, { childList: true, subtree: true });
    }
    for (var i = 0; i < data.skills.length; i++) {
      var select = byId('SelBuffClan_' + i);
      if (!select || select._remakedGuildButton) continue;
      var field = document.createElement('div');
      field.className = 'remaked-guild-field';
      var button = document.createElement('button');
      button.type = 'button'; button.className = 'remaked-guild-trigger';
      button.dataset.remakedGuildTrigger = String(i);
      button.setAttribute('aria-haspopup', 'listbox');
      button.setAttribute('aria-controls', 'remaked-guild-popup-' + i);
      button.setAttribute('aria-expanded', 'false');
      var caption = document.createElement('span');
      var arrow = document.createElement('span');
      arrow.className = 'remaked-guild-chevron';
      arrow.setAttribute('aria-hidden', 'true');
      button.append(caption, arrow);
      select.parentNode.insertBefore(field, select);
      field.append(select, button);
      select.dataset.remakedGuildSource = '';
      select.dataset.remakedGuildIndex = String(i);
      select.setAttribute('aria-hidden', 'true'); select.tabIndex = -1;
      select._remakedGuildButton = button;
      button.addEventListener('click', (function (original) {
        return function () { open(original); };
      })(select));
      button.addEventListener('keydown', (function (original) {
        return function (event) {
          if (['ArrowDown', 'ArrowUp'].includes(event.key)) { event.preventDefault(); open(original); }
        };
      })(select));
    }
    updateTriggers();
  }
  function schedule() {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(function () {
      scheduled = false;
      if (menu && !source?.isConnected) close(false);
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
    window.addEventListener('resize', function () { if (menu) { positionMenu(); hideHint(); } });
    window.addEventListener('scroll', function (event) {
      if (menu && !menu.contains(event.target)) { positionMenu(); hideHint(); }
    }, true);
  }
  ns.guildTooltips = { refresh: schedule, description: description };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
})();
