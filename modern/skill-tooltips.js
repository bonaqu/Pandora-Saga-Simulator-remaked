(function () {
  'use strict';
  var namespace = window.PandoraRemaked = window.PandoraRemaked || {};
  var active, pending, openTimer, closeTimer, observer, ignoreFocus = false;
  var hoverDelay = 450, leaveDelay = 180;
  function cancelTimers() { clearTimeout(openTimer); clearTimeout(closeTimer); openTimer = closeTimer = null; pending = null; }
  function iconFor(node) {
    return node instanceof Element && !node.closest('[data-remaked-skill-tooltip]') ? node.closest('[data-remaked-skill-icon]') : null;
  }
  function close(restoreFocus) {
    cancelTimers(); if (!active) return;
    var previous = active; active = null;
    if (!previous.portal && previous.node.matches(':popover-open')) previous.node.hidePopover();
    window.DDMClose('Cancel'); window.noClose = 0; window.DDMClose('Close');
    previous.node.style.display = 'none'; previous.icon.removeAttribute('aria-describedby');
    if (previous.portal) {
      if (previous.icon.isConnected) previous.icon.appendChild(previous.node);
      else previous.node.remove();
    }
    if (restoreFocus && previous.icon.isConnected) {
      ignoreFocus = true; previous.icon.focus({ preventScroll: true }); ignoreFocus = false;
    }
  }
  function position() {
    if (!active) return;
    var anchor = active.icon.getBoundingClientRect(), node = active.node;
    if (anchor.bottom <= 0 || anchor.top >= innerHeight || anchor.right <= 0 || anchor.left >= innerWidth) { close(); return; }
    var bounds = node.getBoundingClientRect(), gap = 8;
    var left = anchor.right + gap;
    if (left + bounds.width > innerWidth - gap) left = anchor.left - gap - bounds.width;
    if (left < gap) left = Math.min(Math.max(gap, anchor.left), innerWidth - gap - bounds.width);
    var top = Math.min(Math.max(gap, anchor.top), innerHeight - gap - bounds.height);
    if (left < anchor.right && left + bounds.width > anchor.left) {
      top = anchor.bottom + gap;
      if (top + bounds.height > innerHeight - gap) top = anchor.top - gap - bounds.height;
      top = Math.max(gap, Math.min(top, innerHeight - gap - bounds.height));
    }
    if (node.style.left !== left + 'px') node.style.left = left + 'px';
    if (node.style.top !== top + 'px') node.style.top = top + 'px';
  }
  // Modern-only display translation. Retain all original Skill[] data,
  // prerequisite gates and timings used by the Legacy calculation engine.
  function translatedPrerequisites(source) {
    var i18n = namespace.i18n;
    if (!i18n || i18n.getLocale() !== 'ru') return source;
    var groups = [];
    var entries = window.Name?.Skill || [];
    for (var index = 0; index < entries.length; index++) {
      var en = entries[index]?.[2], ru = i18n.game('skill.' + index, '');
      if (en && ru && ru !== en) groups.push([en, ru]);
    }
    groups.sort(function(a,b){ return b[0].length - a[0].length; });
    // Only translate complete group names immediately preceding mastery points:
    // "Shot 8" -> "Стрельба 8", never mutate Skill[*] requirements.
    var names = Object.create(null);
    groups.forEach(function(pair){ names[pair[0]] = pair[1]; });
    var tokens = groups.map(function(pair){ return pair[0]; });
    if (!tokens.length) return source;
    return String(source).replace(new RegExp('(^|[^\\p{L}])(' + tokens.join('|') + ')(?=\\s*\\d)', 'gu'),
      function(match, before, name){ return before + names[name]; });
  }

  function renderTranslatedTooltip(node, category, index) {
    var i18n=namespace.i18n;
    if (!i18n || !window.Skill || !window.Name) return;
    var locale=i18n.getLocale(), lang=Number(window.Flag?.[0] || 0);
    var source=window.Skill[lang]?.[category]?.[index];
    if (!source) return;
    var rows=Array.from(node.children).filter(function(el){return el.tagName==='UL';});
    if (rows.length < 9) return;
    var set=function(row,index,value){
      var element=rows[row]?.children[index];
      if (element && element.textContent!==value) element.textContent=value;
    };
    var name=i18n.game('skill_entry.'+category+'.'+index,'') || source[0];
    set(0,0,name);
    var groupSource=window.Name.Skill[category]?.[lang+1] || '';
    set(1,0,i18n.game('skill.'+category,'') || groupSource);
    // Preserve published custom prerequisites and selected skill profiles.
    // The renderer must not replace them with an old Skill[] template string.
    var prerequisite=i18n.game('skill_detail.'+category+'.'+index+'.1',source[1]||'');
    // All four locales can override every visible header through the
    // authenticated editor. Localized defaults apply only if no override
    // exists; never patch original Name.Learn or Skill[] tables.
    var defaultHeading=function(index,russian){
      return locale==='ru' ? russian : window.Name.Learn[index]?.[lang]||'';
    };
    var heading=function(index,russian){
      return i18n.game('calculator.learn.'+index,defaultHeading(index,russian));
    };
    set(1,1,heading(1,'Расход ОМ'));
    set(2,0,heading(2,'Скорость применения'));
    set(2,2,heading(3,'Откат'));
    set(3,0,heading(5,'Длительность'));
    set(4,0,heading(6,'Необходимо'));
    set(5,0,locale==='ru'?translatedPrerequisites(prerequisite):prerequisite);
    set(6,0,heading(7,'Требования снаряжения'));
    var equipment=i18n.game('skill_detail.'+category+'.'+index+'.2',source[2]||'');
    set(7,0,locale==='ru'&&equipment==='None'?'Нет':equipment);
    var description=i18n.game('skill_detail.'+category+'.'+index+'.3','') || source[3]||'';
    set(8,0,description);
  }

  function open(icon) {
    cancelTimers();
    if (active?.icon === icon) return;
    close();
    if (!icon.isConnected || Number(window.Flag[2]) !== 2) return;
    var parts = icon.id.match(/^LearnSkillIcon_(\d+)_(\d+)$/);
    var node = document.getElementById('LearnSkill_' + parts[1] + '_' + parts[2]);
    if (!node) return;
    // Reuse the exact source node and original open/close callbacks. No copied
    // names, timing, learning rules, calculation tables or game formulas.
    var portal = typeof node.showPopover !== 'function';
    node.dataset.remakedSkillTooltip = ''; node.setAttribute('role', 'tooltip');
    if (portal) document.body.appendChild(node);
    else node.setAttribute('popover', 'manual');
    window.DDMOpen(Number(parts[1]), Number(parts[2]));
    renderTranslatedTooltip(node, Number(parts[1]), Number(parts[2]));
    node.style.display = 'block';
    active = { icon: icon, node: node, portal: portal };
    icon.setAttribute('aria-describedby', node.id);
    if (!portal) node.showPopover();
    position();
  }
  function request(icon) {
    if (active?.icon === icon) { clearTimeout(closeTimer); return; }
    if (pending === icon) return;
    cancelTimers(); pending = icon;
    openTimer = setTimeout(function () { open(icon); }, hoverDelay);
  }
  function leave() {
    clearTimeout(openTimer); openTimer = null; pending = null;
    clearTimeout(closeTimer); closeTimer = setTimeout(function () { close(); }, leaveDelay);
  }
  function decorate() {
    if (active && (!active.icon.isConnected || !active.node.isConnected || Number(window.Flag[2]) !== 2 || !window.Flag[3])) close();
    document.querySelectorAll('#LearnView [id^="LearnSkillIcon_"]').forEach(function (icon) {
      var parts = icon.id.match(/^LearnSkillIcon_(\d+)_(\d+)$/), node = document.getElementById('LearnSkill_' + parts[1] + '_' + parts[2]);
      if (!node) return;
      if (!icon.hasAttribute('data-remaked-skill-icon')) {
        icon.dataset.remakedSkillIcon = ''; icon.setAttribute('role', 'button'); icon.tabIndex = 0;
        icon.removeAttribute('onmouseover'); icon.removeAttribute('onmouseout');
        node.removeAttribute('onmouseover'); node.removeAttribute('onmouseout');
      }
      var label = node.firstElementChild?.textContent.trim();
      if (icon.getAttribute('aria-label') !== label) icon.setAttribute('aria-label', label);
    });
    position();
  }
  function init() {
    var panel = document.getElementById('Tab_1_1'); if (!panel) return;
    observer = new MutationObserver(decorate);
    observer.observe(panel, { childList: true, characterData: true, subtree: true, attributes: true, attributeFilter: ['hidden', 'style'] });
    document.addEventListener('pointerover', function (event) {
      if (event.pointerType === 'touch') return;
      if (active?.node.contains(event.target)) { clearTimeout(closeTimer); return; }
      var icon = iconFor(event.target); if (icon) request(icon);
    });
    document.addEventListener('pointerout', function (event) {
      if (event.pointerType === 'touch') return;
      var icon = iconFor(event.target);
      if (active?.node.contains(event.relatedTarget) || icon?.contains(event.relatedTarget) || active?.icon.contains(event.relatedTarget)) return;
      if (icon || active?.node.contains(event.target)) leave();
    });
    document.addEventListener('focusin', function (event) {
      if (ignoreFocus) return;
      var icon = iconFor(event.target); if (icon) open(icon);
      else if (active && !active.node.contains(event.target)) close();
    });
    document.addEventListener('click', function (event) {
      var icon = iconFor(event.target);
      if (icon) {
        // Pointer activation must not lose the description to a synthetic
        // mouseout on touch screens. The second deliberate tap closes it.
        if (active?.icon === icon && active.fromClick) close();
        else { open(icon); if (active) active.fromClick = true; }
      } else if (active && !active.node.contains(event.target)) close();
    });
    document.addEventListener('keydown', function (event) {
      var icon = iconFor(event.target);
      if (event.key === 'Escape' && (active || pending)) { event.preventDefault(); event.stopPropagation(); close(Boolean(active)); }
      else if (icon && (event.key === 'Enter' || event.key === ' ')) {
        event.preventDefault(); event.stopPropagation();
        if (active?.icon === icon) close(); else open(icon);
      }
    }, true);
    window.addEventListener('scroll', function (event) {
      if (active?.node.contains(event.target)) return;
      close();
    }, true);
    window.addEventListener('resize', position);
    decorate();
  }
  namespace.skillTooltips = { close: close };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
})();
