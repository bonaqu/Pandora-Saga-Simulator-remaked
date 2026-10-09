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
  function showLogin(text) {
    // Clear credentials when leaving an authenticated workspace, not when the
    // initial asynchronous session check catches up with an already typed form.
    var leavingWorkspace = !workspace.hidden;
    if (window.PandoraCatalogConsole) window.PandoraCatalogConsole.clear();
    if (window.PandoraResultLabelConsole) window.PandoraResultLabelConsole.clear();
    if (window.PandoraUiTranslationConsole) window.PandoraUiTranslationConsole.clear();
    csrf = null; form.hidden = false; workspace.hidden = true;
    title.textContent = 'GOD MODE REQUIRES AUTHENTICATION';
    message.textContent = text; message.classList.toggle('denied', text.indexOf('DENIED') !== -1);
    if (leavingWorkspace) document.getElementById('password').value = '';
  }
  async function loadSession() {
    try {
      var response = await fetch('/api/session', { credentials: 'same-origin', cache: 'no-store', signal: AbortSignal.timeout(10000) });
      if (!response.ok) {
        var state = new URLSearchParams(location.search).get('status');
        showLogin(state === 'rate' ? 'CHEAT FAILED / ACCESS DENIED. Too many attempts. Try again later.' : state === 'origin' ? 'CHEAT FAILED / ACCESS DENIED. Sign-in must start from the production simulator or this secure page. Try again here; your password has not changed.' : state === 'denied' ? 'CHEAT FAILED / ACCESS DENIED' : 'Enter your administrator credentials.');
        return;
      }
      var session = await response.json();
      if (session.ok !== true || session.username !== 'admin' || typeof session.csrfToken !== 'string') throw new Error('Invalid session');
      csrf = session.csrfToken; form.hidden = true; workspace.hidden = false;
      title.textContent = 'GOD MODE ENABLED / WELCOME, ADMIN';
      message.textContent = 'Authenticated on the secure Worker origin.';
      message.classList.remove('denied');
      document.getElementById('password').value = '';
      history.replaceState(null, '', '/admin');
      var expired = function () { showLogin('Session expired. Sign in again.'); };
      if (window.PandoraCatalogConsole) await window.PandoraCatalogConsole.start(function () { return csrf; }, expired);
      if (window.PandoraResultLabelConsole) await window.PandoraResultLabelConsole.start(function () { return csrf; }, expired);
      if (window.PandoraUiTranslationConsole) await window.PandoraUiTranslationConsole.start(function () { return csrf; }, expired);
    } catch { showLogin('Secure service unavailable. Please try again later.'); }
  }
  logout.addEventListener('click', async function () {
    logout.disabled = true;
    try {
      var response = await fetch('/api/auth/logout', { method: 'POST', credentials: 'same-origin', headers: { 'X-CSRF-Token': csrf || '' }, signal: AbortSignal.timeout(10000) });
      if (!response.ok) { await loadSession(); return; }
      showLogin('GOD MODE DISABLED'); document.getElementById('username').focus();
    } catch { message.textContent = 'Logout was not confirmed. Your session may still be active.'; }
    finally { logout.disabled = false; }
  });
  loadSession();
})();
