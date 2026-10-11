(function () {
  'use strict';
  // Native title popups have OS/browser styling. Re-skin ordinary Modern
  // title help without touching existing bespoke skill/stat tooltips or Legacy.
  var current = null, popup = null, pending = null;
  function eligible(node) {
    if (!(node instanceof Element)) return null;
    if (node.closest('[data-remaked-skill-tooltip], [data-remaked-guild-popup], [data-remaked-guild-tooltip], .remaked-stat-tooltip')) return null;
    var target = node.closest('[title]');
    if (!target || target.matches('option, select') ||
        target.closest('[data-remaked-skill-icon], .remaked-stat-help')) return null;
    return target;
  }
  function clamp(value, min, max) { return Math.max(min, Math.min(value, Math.max(min, max))); }
  function position() {
    if (!popup || !current) return;
    var anchor = current.node.getBoundingClientRect();
    if (!anchor.width && !anchor.height) { close(); return; }
    var w = popup.offsetWidth, h = popup.offsetHeight;
    var x = anchor.left;
    if (x + w > innerWidth - 8) x = anchor.right - w;
    x = clamp(x, 8, innerWidth - w - 8);
    var y = anchor.bottom + 7;
    if (y + h > innerHeight - 8) y = anchor.top - h - 7;
    popup.style.left = x + 'px';
    popup.style.top = clamp(y, 8, innerHeight - h - 8) + 'px';
  }
  function close() {
    clearTimeout(pending); pending = null;
    if (popup) popup.hidden = true;
    if (current) {
      var node = current.node;
      if (node.isConnected) {
        // If a live translation changed title while this was open, retain it.
        if (!node.hasAttribute('title')) node.setAttribute('title', current.text);
        if (current.previousDescribedBy === null) node.removeAttribute('aria-describedby');
        else node.setAttribute('aria-describedby', current.previousDescribedBy);
      }
    }
    current = null;
  }
  function show() {
    if (!current) return;
    if (!popup) {
      popup = document.createElement('div');
      popup.className = 'remaked-site-tooltip';
      popup.id = 'remaked-site-tooltip';
      popup.dataset.remakedSiteTooltip = '';
      popup.setAttribute('role', 'tooltip');
      popup.hidden = true;
      document.body.appendChild(popup);
    }
    popup.textContent = current.text;
    popup.hidden = false;
    position();
  }
  function open(node, immediate) {
    if (current?.node === node) return;
    close();
    if (!node) return;
    var title = node.getAttribute('title');
    if (!title || !title.trim()) return;
    current = { node: node, text: title, previousDescribedBy: node.getAttribute('aria-describedby') };
    // Remove before hover delay to prevent competing OS/browser bubbles.
    node.removeAttribute('title');
    if (popup) node.setAttribute('aria-describedby', popup.id);
    if (immediate) {
      show();
      node.setAttribute('aria-describedby', popup.id);
    } else {
      pending = setTimeout(function () {
        pending = null;
        show();
        if (current?.node === node) node.setAttribute('aria-describedby', popup.id);
      }, 160);
    }
  }
  function init() {
    if (!document.body.classList.contains('remaked-modern')) return;
    document.addEventListener('pointerover', function (event) {
      if (event.pointerType === 'touch') return;
      if (current?.node.contains(event.target)) return;
      open(eligible(event.target), false);
    });
    document.addEventListener('pointerout', function (event) {
      if (!current || event.pointerType === 'touch') return;
      if (current.node.contains(event.target) && !current.node.contains(event.relatedTarget)) close();
    });
    document.addEventListener('focusin', function (event) { open(eligible(event.target), true); });
    document.addEventListener('focusout', function (event) {
      if (current?.node.contains(event.target) && !current.node.contains(event.relatedTarget)) close();
    });
    document.addEventListener('keydown', function (event) {
      if (event.key === 'Escape' && current) close();
    });
    window.addEventListener('pandora-remaked:localechange', close);
    window.addEventListener('pandora-remaked:translationchange', close);
    window.addEventListener('scroll', close, true);
    window.addEventListener('resize', function () { if (current) position(); });
    document.addEventListener('pointerdown', close);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
})();
