import { authorize, jsonResponse, login, logout } from './auth.mjs';
import { adminCatalog, publicCatalog, publicCatalogHead } from './catalog.mjs';
import { CatalogError } from './catalog-model.mjs';
import { publicResultLabels, adminResultLabels } from './result-labels.mjs';
import { publicUiTranslations, adminUiTranslations } from './ui-translations.mjs';
import { publicLocalization, adminLocalization } from './localization.mjs';

const PRIVATE_CSP = "default-src 'none'; script-src 'self'; style-src 'self'; connect-src 'self'; img-src 'self'; font-src 'self'; form-action 'self'; base-uri 'none'; frame-ancestors 'none'; object-src 'none'";

function secureResponse(response, request, env) {
  const headers = new Headers(response.headers);
  headers.set('X-Content-Type-Options', 'nosniff');
  // Native form navigation under no-referrer serializes Origin as "null",
  // breaking our strict origin guard even on this Worker's own login page.
  // Keep same-origin navigation identifiable; send no referrer across sites.
  headers.set('Referrer-Policy', 'same-origin');
  headers.set('X-Frame-Options', 'DENY');
  headers.set('Content-Security-Policy', PRIVATE_CSP);
  headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  headers.set('Strict-Transport-Security', 'max-age=31536000');
  headers.set('Cache-Control', 'no-store');
  if (request.headers.get('Origin') === env.PUBLIC_ORIGIN) {
    headers.set('Access-Control-Allow-Origin', env.PUBLIC_ORIGIN);
    headers.set('Vary', 'Origin');
  }
  return new Response(response.body, { status: response.status, headers });
}

async function route(request, env) {
  const url = new URL(request.url);
  if (request.method === 'OPTIONS') {
    if (request.headers.get('Origin') !== env.PUBLIC_ORIGIN || !['/api/catalog', '/api/catalog/head', '/api/result-labels', '/api/ui-translations', '/api/localization', '/api/auth/login'].includes(url.pathname)) return jsonResponse({ ok: false }, 403);
    const method = request.headers.get('Access-Control-Request-Method');
    if (!['GET', 'POST'].includes(method)) return jsonResponse({ ok: false }, 403);
    const requestedHeaders = (request.headers.get('Access-Control-Request-Headers') || '').split(',').map(header => header.trim().toLowerCase()).filter(Boolean);
    if (requestedHeaders.some(header => header !== 'content-type')) return jsonResponse({ ok: false }, 403);
    return new Response(null, { status: 204, headers: { 'Access-Control-Allow-Methods': 'GET, POST', 'Access-Control-Allow-Headers': 'Content-Type', 'Access-Control-Max-Age': '600' } });
  }

  if (url.pathname === '/api/auth/login') {
    const form = (request.headers.get('Content-Type') || '').startsWith('application/x-www-form-urlencoded');
    const response = await login(request, env);
    // A native form POST is a top-level navigation. The HttpOnly session is
    // first-party on workers.dev; no third-party cookie dependency or JS bearer.
    if (form && ['200', '401', '403', '429'].includes(String(response.status))) {
      const headers = new Headers(response.headers);
      headers.set('Location', env.ADMIN_ORIGIN + '/admin' + (response.status === 200 ? '' : response.status === 429 ? '?status=rate' : response.status === 403 ? '?status=origin' : '?status=denied'));
      return new Response(null, { status: 303, headers });
    }
    return response;
  }
  if (url.pathname === '/api/auth/logout') return logout(request, env);
  if (url.pathname === '/api/catalog/head' && request.method === 'GET') return publicCatalogHead(env);
  if (url.pathname === '/api/catalog' && request.method === 'GET') return publicCatalog(request, env);
  if (url.pathname === '/api/result-labels' && request.method === 'GET') return publicResultLabels(env);
  if (url.pathname === '/api/ui-translations' && request.method === 'GET') return publicUiTranslations(env);
  if (url.pathname === '/api/localization' && request.method === 'GET') return publicLocalization(env);

  // Authorize before routing: even a future/new/unknown admin endpoint cannot
  // accidentally bypass the guard. IDDQD is not part of the security boundary.
  if (url.pathname === '/api/session' || url.pathname.startsWith('/api/admin/')) {
    const session = await authorize(request, env);
    if (!session.ok) return jsonResponse({ ok: false, message: 'CHEAT FAILED / ACCESS DENIED' }, session.status);
    if (url.pathname === '/api/session' && request.method === 'GET') return jsonResponse({ ok: true, username: 'admin', csrfToken: session.csrfToken, expiresAt: session.expiresAt });
    if (url.pathname === '/api/admin/result-labels') return adminResultLabels(request, env);
    if (url.pathname === '/api/admin/ui-translations') return adminUiTranslations(request, env);
    if (url.pathname === '/api/admin/localization') return adminLocalization(request, env);
    return adminCatalog(request, env);
  }

  if (url.pathname === '/health' && request.method === 'GET') return jsonResponse({ ok: true, service: 'pandora-admin-api', apiVersion: 1, workerVersion: env.CF_VERSION_METADATA?.id || null });
  if (['/admin', '/admin.css', '/admin.js', '/catalog-ui.js', '/localization-console.js', '/localization-bulk.js'].includes(url.pathname) && ['GET', 'HEAD'].includes(request.method)) {
    if (!env.ASSETS) return jsonResponse({ ok: false }, 503);
    const assetUrl = new URL(request.url);
    if (url.pathname === '/admin') assetUrl.pathname = '/admin.html';
    return env.ASSETS.fetch(new Request(assetUrl, request));
  }
  return jsonResponse({ ok: false }, 404);
}

export default {
  async fetch(request, env) {
    try { return secureResponse(await route(request, env), request, env); }
    catch (error) {
      if (error instanceof CatalogError) return secureResponse(jsonResponse({ ok: false, message: error.message }, error.status), request, env);
      // Never log request bodies, password records, secrets, cookies or tokens.
      return secureResponse(jsonResponse({ ok: false, message: 'Service temporarily unavailable' }, 503), request, env);
    }
  }
};
