(function () {
  'use strict';
  var namespace = window.PandoraRemaked = window.PandoraRemaked || {};
  var i18n = namespace.i18n;
  if (namespace.adminEntry) return;
  var sequence = 'iddqd', progress = '', lastKey = 0, dialog = null, opener = null;
  var ADMIN_ORIGIN = 'https://pandora-saga-simulator-remaked-admin-api.bonaqu.workers.dev';
  function element(tag, className, text) {
    var node = document.createElement(tag); if (className) node.className = className;
    if (text) node.textContent = text; return node;
  }
  function localText(node, key, fallback) {
    if (i18n?.bindText) i18n.bindText(node, key);
    else node.textContent = fallback;
    return node;
  }
  function label(tag, className, key, fallback) {
    return localText(element(tag, className), key, fallback);
  }
  function localAttr(node, attribute, key, fallback) {
    if (i18n?.bindAttribute) i18n.bindAttribute(node, attribute, key);
    else node.setAttribute(attribute, fallback);
  }
  function clear() { progress = ''; lastKey = 0; }
  function close() { if (dialog?.open) dialog.close(); }
  function createDialog() {
    dialog = element('dialog', 'remaked-admin-entry'); dialog.dataset.remakedAdminEntry = '';
    dialog.setAttribute('aria-labelledby', 'remaked-admin-title');
    dialog.setAttribute('aria-describedby', 'remaked-admin-hint');
    var header = element('div', 'remaked-admin-terminal-header');
    header.appendChild(label('span', '', 'adminEntry.channel', 'PANDORA / SECURE CHANNEL'));
    var dismiss = element('button', 'remaked-admin-close', '×'); dismiss.type = 'button';
    localAttr(dismiss, 'aria-label', 'adminEntry.close', 'Close administrator login'); dismiss.addEventListener('click', close); header.appendChild(dismiss);
    dialog.appendChild(header);
    var body = element('div', 'remaked-admin-terminal-body');
    body.appendChild(label('p', 'remaked-admin-accepted', 'adminEntry.accepted', 'IDDQD ACCEPTED'));
    var title = label('h2', '', 'adminEntry.title', 'GOD MODE REQUIRES AUTHENTICATION'); title.id = 'remaked-admin-title'; body.appendChild(title);
    var hint = label('p', 'remaked-admin-hint', 'adminEntry.hint', 'Authentication opens the secure Cloudflare console. This code does not grant access.');
    hint.id = 'remaked-admin-hint'; body.appendChild(hint);
    var form = null;
    if (window.location.origin !== 'https://bonaqu.github.io') {
      localText(hint, 'adminEntry.previewHint', 'This is a local preview or a non-production site. Sign in on the secure console; do not enter credentials here.');
      var secureLogin = label('a', 'remaked-admin-authenticate', 'adminEntry.openLogin', 'OPEN SECURE LOGIN');
      secureLogin.href = ADMIN_ORIGIN + '/admin'; secureLogin.rel = 'noreferrer'; secureLogin.setAttribute('autofocus', '');
      body.appendChild(secureLogin);
    } else {
      form = element('form'); form.method = 'post'; form.action = ADMIN_ORIGIN + '/api/auth/login';
      [['username', 'adminEntry.username', 'LOGIN', 'text', 'admin', 'username'], ['password', 'adminEntry.password', 'PASSWORD', 'password', '', 'current-password']].forEach(function (field) {
        var inputLabel = label('label', '', field[1], field[2]);
        inputLabel.htmlFor = 'remaked-admin-' + field[0]; form.appendChild(inputLabel);
        var input = element('input'); input.id = inputLabel.htmlFor; input.name = field[0]; input.type = field[3]; input.value = field[4];
        input.autocomplete = field[5]; input.maxLength = field[0] === 'password' ? 512 : 64; input.required = true;
        if (field[0] === 'password') input.autofocus = true;
        form.appendChild(input);
      });
      var submit = label('button', 'remaked-admin-authenticate', 'adminEntry.authenticate', 'AUTHENTICATE'); submit.type = 'submit'; form.appendChild(submit);
      // Native HTTPS navigation makes the session first-party on Worker, even
      // with third-party cookies blocked. Never fetch/persist the password here.
      body.appendChild(form);
    }
    dialog.appendChild(body);
    dialog.appendChild(label('div', 'remaked-admin-terminal-footer', 'adminEntry.footer', 'MODERN CATALOG / MUSEUM ENGINE 2.00'));
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
