(function () {
  'use strict';
  var namespace = window.PandoraRemaked = window.PandoraRemaked || {};
  if (namespace.adminEntry) return;
  var sequence = 'iddqd', progress = '', lastKey = 0, dialog = null, opener = null;
  var ADMIN_ORIGIN = 'https://pandora-saga-simulator-remaked-admin-api.bonaqu.workers.dev';
  function element(tag, className, text) {
    var node = document.createElement(tag); if (className) node.className = className;
    if (text) node.textContent = text; return node;
  }
  function clear() { progress = ''; lastKey = 0; }
  function close() { if (dialog?.open) dialog.close(); }
  function createDialog() {
    dialog = element('dialog', 'remaked-admin-entry'); dialog.dataset.remakedAdminEntry = '';
    dialog.setAttribute('aria-labelledby', 'remaked-admin-title');
    dialog.setAttribute('aria-describedby', 'remaked-admin-hint');
    var header = element('div', 'remaked-admin-terminal-header');
    header.appendChild(element('span', '', 'PANDORA / SECURE CHANNEL'));
    var dismiss = element('button', 'remaked-admin-close', '×'); dismiss.type = 'button';
    dismiss.setAttribute('aria-label', 'Close administrator login'); dismiss.addEventListener('click', close); header.appendChild(dismiss);
    dialog.appendChild(header);
    var body = element('div', 'remaked-admin-terminal-body');
    body.appendChild(element('p', 'remaked-admin-accepted', 'IDDQD ACCEPTED'));
    var title = element('h2', '', 'GOD MODE REQUIRES AUTHENTICATION'); title.id = 'remaked-admin-title'; body.appendChild(title);
    var hint = element('p', 'remaked-admin-hint', 'Authentication opens the secure Cloudflare console. This code does not grant access.');
    hint.id = 'remaked-admin-hint'; body.appendChild(hint);
    var form = null;
    if (window.location.origin !== 'https://bonaqu.github.io') {
      hint.textContent = 'This is a local preview or a non-production site. Sign in on the secure console; do not enter credentials here.';
      var secureLogin = element('a', 'remaked-admin-authenticate', 'OPEN SECURE LOGIN');
      secureLogin.href = ADMIN_ORIGIN + '/admin'; secureLogin.rel = 'noreferrer'; secureLogin.setAttribute('autofocus', '');
      body.appendChild(secureLogin);
    } else {
      form = element('form'); form.method = 'post'; form.action = ADMIN_ORIGIN + '/api/auth/login';
      [['username', 'LOGIN', 'text', 'admin', 'username'], ['password', 'PASSWORD', 'password', '', 'current-password']].forEach(function (field) {
        var label = element('label', '', field[1]); label.htmlFor = 'remaked-admin-' + field[0]; form.appendChild(label);
        var input = element('input'); input.id = label.htmlFor; input.name = field[0]; input.type = field[2]; input.value = field[3];
        input.autocomplete = field[4]; input.maxLength = field[0] === 'password' ? 512 : 64; input.required = true;
        if (field[0] === 'password') input.autofocus = true;
        form.appendChild(input);
      });
      var submit = element('button', 'remaked-admin-authenticate', 'AUTHENTICATE'); submit.type = 'submit'; form.appendChild(submit);
      // Native HTTPS navigation makes the session first-party on Worker, even
      // with third-party cookies blocked. Never fetch/persist the password here.
      body.appendChild(form);
    }
    dialog.appendChild(body);
    dialog.appendChild(element('div', 'remaked-admin-terminal-footer', 'MODERN CATALOG / MUSEUM ENGINE 2.00'));
    dialog.addEventListener('cancel', function (event) { event.preventDefault(); close(); });
    dialog.addEventListener('click', function (event) { if (event.target === dialog) close(); });
    dialog.addEventListener('close', function () {
      if (form) form.elements.password.value = ''; clear();
      if (opener?.isConnected && typeof opener.focus === 'function') opener.focus(); opener = null;
    });
    document.body.appendChild(dialog);
  }
  function open() {
    clear(); if (!dialog) createDialog(); if (dialog.open) return;
    opener = document.activeElement; dialog.showModal();
  }
  document.addEventListener('keydown', function (event) {
    if (event.ctrlKey || event.altKey || event.metaKey || event.shiftKey || event.repeat || event.isComposing || event.defaultPrevented) { clear(); return; }
    var target = event.target?.nodeType === 1 ? event.target : document.activeElement;
    if (target?.closest('input, textarea, select, [contenteditable]:not([contenteditable="false"])') || target?.isContentEditable || document.querySelector('dialog[open]')) { clear(); return; }
    if (event.key.length !== 1) { clear(); return; }
    var key = event.key.toLowerCase(), now = performance.now();
    if (now - lastKey > 2500) clear();
    var candidate = progress + key;
    progress = sequence.indexOf(candidate) === 0 ? candidate : key === sequence[0] ? key : '';
    lastKey = now;
    if (!progress) return;
    // Matching prefix characters must not also execute the retained Legacy
    // Q/D character shortcuts while the owner types the Easter egg.
    event.preventDefault(); event.stopImmediatePropagation();
    if (progress === sequence) open();
  }, true);
  document.addEventListener('focusin', clear);
  window.addEventListener('blur', clear);
  namespace.adminEntry = { open, close };
})();
