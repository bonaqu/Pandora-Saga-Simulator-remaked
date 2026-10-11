(function () {
  'use strict';
  var title = document.getElementById('terminal-title');
  var message = document.getElementById('auth-message');
  var form = document.getElementById('login-form');
  var workspace = document.getElementById('admin-workspace');
  var logout = document.getElementById('logout');
  // CSRF is not an authentication token. Keep it only in this page's memory.
  // The actual server session is an HttpOnly cookie, inaccessible to this JS.
  var csrf = null;
  // Preserve the original security messages if the localization asset or D1
  // is temporarily unavailable; authentication must remain independently usable.
  var englishErrors = {
    'admin.shell.enter':'Enter your administrator credentials.',
    'admin.shell.denied':'CHEAT FAILED / ACCESS DENIED',
    'admin.shell.rate':'CHEAT FAILED / ACCESS DENIED. Too many attempts. Try again later.',
    'admin.shell.origin':'CHEAT FAILED / ACCESS DENIED. Sign-in must start from the production simulator or this secure page. Try again here; your password has not changed.',
    'admin.shell.expired':'Session expired. Sign in again.',
    'admin.shell.unavailable':'Secure service unavailable. Please try again later.',
    'admin.shell.loggedOut':'GOD MODE DISABLED'
  };
  function bind(node,key,fallback) {
    if(window.PandoraAdminShellI18n)window.PandoraAdminShellI18n.text(node,key);
    else node.textContent=fallback;
  }
  function showLogin(key) {
    // Clear credentials when leaving an authenticated workspace, not when the
    // initial asynchronous session check catches up with an already typed form.
    var leavingWorkspace = !workspace.hidden;
    if (window.PandoraCatalogConsole) window.PandoraCatalogConsole.clear();
    if (window.PandoraLocalizationConsole) window.PandoraLocalizationConsole.clear();
    csrf = null; form.hidden = false; workspace.hidden = true;
    bind(title,'admin.shell.locked','GOD MODE REQUIRES AUTHENTICATION');
    bind(message,key,englishErrors[key]||englishErrors['admin.shell.enter']);
    message.classList.toggle('denied', ['admin.shell.denied','admin.shell.origin','admin.shell.rate'].includes(key));
    if (leavingWorkspace) document.getElementById('password').value = '';
  }
  async function loadSession() {
    try {
      var response = await fetch('/api/session', { credentials: 'same-origin', cache: 'no-store', signal: AbortSignal.timeout(10000) });
      if (!response.ok) {
        var state = new URLSearchParams(location.search).get('status');
        showLogin(state === 'rate' ? 'admin.shell.rate' : state === 'origin' ? 'admin.shell.origin' : state === 'denied' ? 'admin.shell.denied' : 'admin.shell.enter');
        return;
      }
      var session = await response.json();
      if (session.ok !== true || session.username !== 'admin' || typeof session.csrfToken !== 'string') throw new Error('Invalid session');
      csrf = session.csrfToken; form.hidden = true; workspace.hidden = false;
      bind(title,'admin.shell.unlocked','GOD MODE ENABLED / WELCOME, ADMIN');
      bind(message,'admin.shell.authenticated','Authenticated on the secure Worker origin.');
      message.classList.remove('denied');
      document.getElementById('password').value = '';
      history.replaceState(null, '', '/admin');
      var expired = function () { showLogin('admin.shell.expired'); };
      if (window.PandoraCatalogConsole) await window.PandoraCatalogConsole.start(function () { return csrf; }, expired);
      if (window.PandoraLocalizationConsole) await window.PandoraLocalizationConsole.start(function () { return csrf; }, expired);
    } catch { showLogin('admin.shell.unavailable'); }
  }
  logout.addEventListener('click', async function () {
    logout.disabled = true;
    try {
      var response = await fetch('/api/auth/logout', { method: 'POST', credentials: 'same-origin', headers: { 'X-CSRF-Token': csrf || '' }, signal: AbortSignal.timeout(10000) });
      if (!response.ok) { await loadSession(); return; }
      showLogin('admin.shell.loggedOut'); document.getElementById('username').focus();
    } catch { bind(message,'admin.shell.logoutUnconfirmed','Logout was not confirmed. Your session may still be active.'); }
    finally { logout.disabled = false; }
  });
  loadSession();
})();
