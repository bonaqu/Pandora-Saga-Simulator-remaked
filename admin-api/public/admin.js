(function () {
  'use strict';
  var title = document.getElementById('terminal-title');
  var message = document.getElementById('auth-message');
  var form = document.getElementById('login-form');
  var workspace = document.getElementById('admin-workspace');
  var logout = document.getElementById('logout');
  // Keep CSRF only in memory; authentication remains an HttpOnly cookie.
  var csrf = null;
  function shellText(node,key,english) {
    node.dataset.adminI18n = key;
    node.textContent = english;
    // Text-only D1 translation, never HTML; not part of auth validation.
    window.PandoraAdminI18n?.apply();
  }
  function showLogin(key,english,denied) {
    // Do not clear an initial password entered while session detection runs.
    var leavingWorkspace = !workspace.hidden;
    if (window.PandoraCatalogConsole) window.PandoraCatalogConsole.clear();
    if (window.PandoraLocalizationConsole) window.PandoraLocalizationConsole.clear();
    csrf = null; form.hidden = false; workspace.hidden = true;
    shellText(title,'adminShell.loginTitle','GOD MODE REQUIRES AUTHENTICATION');
    shellText(message,key,english);
    message.classList.toggle('denied',Boolean(denied));
    if (leavingWorkspace) document.getElementById('password').value = '';
  }
  async function loadSession() {
    try {
      var response = await fetch('/api/session',{
        credentials:'same-origin',cache:'no-store',signal:AbortSignal.timeout(10000)
      });
      if (!response.ok) {
        var state = new URLSearchParams(location.search).get('status');
        if (state === 'rate') showLogin('adminShell.rateDenied',
          'CHEAT FAILED / ACCESS DENIED. Too many attempts. Try again later.',true);
        else if (state === 'origin') showLogin('adminShell.originDenied',
          'CHEAT FAILED / ACCESS DENIED. Sign-in must start from the production simulator or this secure page. Try again here; your password has not changed.',true);
        else if (state === 'denied') showLogin('adminShell.accessDenied',
          'CHEAT FAILED / ACCESS DENIED',true);
        else showLogin('adminShell.loginPrompt','Enter your administrator credentials.',false);
        return;
      }
      var session = await response.json();
      if (session.ok !== true || session.username !== 'admin' ||
          typeof session.csrfToken !== 'string') throw new Error('Invalid session');
      csrf = session.csrfToken; form.hidden = true; workspace.hidden = false;
      shellText(title,'adminShell.welcome','GOD MODE ENABLED / WELCOME, ADMIN');
      shellText(message,'adminShell.authenticated','Authenticated on the secure Worker origin.');
      message.classList.remove('denied');
      document.getElementById('password').value = '';
      history.replaceState(null,'','/admin');
      var expired = function () {
        showLogin('adminShell.expired','Session expired. Sign in again.',false);
      };
      if (window.PandoraCatalogConsole)
        await window.PandoraCatalogConsole.start(function () { return csrf; },expired);
      if (window.PandoraLocalizationConsole)
        await window.PandoraLocalizationConsole.start(function () { return csrf; },expired);
    } catch {
      showLogin('adminShell.offline','Secure service unavailable. Please try again later.',false);
    }
  }
  logout.addEventListener('click',async function () {
    logout.disabled = true;
    try {
      var response = await fetch('/api/auth/logout',{
        method:'POST',credentials:'same-origin',
        headers:{'X-CSRF-Token':csrf||''},signal:AbortSignal.timeout(10000)
      });
      if (!response.ok) {await loadSession();return;}
      showLogin('adminShell.loggedOut','GOD MODE DISABLED',false);
      document.getElementById('username').focus();
    } catch {
      shellText(message,'adminShell.logoutUnconfirmed',
        'Logout was not confirmed. Your session may still be active.');
    } finally {logout.disabled=false;}
  });
  loadSession();
})();
