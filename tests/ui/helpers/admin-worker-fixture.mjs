import fs from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { randomBytes } from 'node:crypto';
import worker from '../../../admin-api/src/worker.mjs';
import { createPasswordRecord } from '../../../admin-api/src/auth.mjs';

export const adminOrigin = 'https://pandora-saga-simulator-remaked-admin-api.bonaqu.workers.dev';

export async function routeSyntheticWorker(page) {
  // Actual Worker routing/security headers and SQLite migrations. Credentials
  // are generated only for this in-memory test, never read from a real account.
  const password = randomBytes(32).toString('base64url');
  const pepper = randomBytes(32).toString('base64url');
  const record = await createPasswordRecord(password, pepper);
  const sqlite = new DatabaseSync(':memory:');
  for (const name of ['0001_auth.sql', '0002_catalog.sql']) sqlite.exec(fs.readFileSync(new URL('../../../admin-api/migrations/' + name, import.meta.url), 'utf8'));
  sqlite.prepare('INSERT INTO admins (id, username, algorithm, password_salt, password_hash, created_at) VALUES (1,?,?,?,?,?)').run('admin', record.algorithm, record.salt, record.hash, 1000);
  const DB = {
    prepare(sql) {
      let values = [];
      return { bind(...params) { values = params; return this; },
        async first() { return sqlite.prepare(sql).get(...values) || null; },
        async run() { return { success: true, meta: { changes: Number(sqlite.prepare(sql).run(...values).changes) } }; },
        async all() { return { success: true, results: sqlite.prepare(sql).all(...values) }; }
      };
    },
    async batch(statements) {
      sqlite.exec('BEGIN');
      try { const results = []; for (const statement of statements) results.push(await statement.run()); sqlite.exec('COMMIT'); return results; }
      catch (error) { sqlite.exec('ROLLBACK'); throw error; }
    }
  };
  const env = { DB, AUTH_PEPPER: pepper, PUBLIC_ORIGIN: 'https://bonaqu.github.io', ADMIN_ORIGIN: adminOrigin, ASSETS: {
    async fetch(request) {
      const asset = new URL(request.url).pathname.slice(1);
      if (!['admin.html', 'admin.css', 'admin.js', 'catalog-ui.js'].includes(asset)) return new Response(null, { status: 404 });
      return new Response(fs.readFileSync(new URL('../../../admin-api/public/' + asset, import.meta.url)), { headers: { 'Content-Type': asset.endsWith('.css') ? 'text/css' : asset.endsWith('.js') ? 'text/javascript' : 'text/html' } });
    }
  } };
  const loginRequests = [];
  await page.route(adminOrigin + '/**', async route => {
    const incoming = route.request();
    // headers() may omit security-related Cookie headers in some engines.
    // Forward the complete browser request to the real authorization handler;
    // never log this object or any credential/session-bearing values.
    const incomingHeaders = await incoming.allHeaders();
    if (new URL(incoming.url()).pathname === '/api/auth/login') loginRequests.push({ method: incoming.method(), origin: incomingHeaders.origin });
    // Cloudflare adds this trusted edge header in production. Do not alter
    // Origin: the browser itself must produce the value the guard checks.
    // Routing runs before WebKit's network stack attaches Cookie. Mirror that
    // transport step using only cookies actually issued by this fixture's
    // Worker and accepted into this browser context, never fabricated auth.
    // https://playwright.dev/docs/next/network
    if (!incomingHeaders.cookie) {
      const accepted = await page.context().cookies(incoming.url());
      if (accepted.length) incomingHeaders.cookie = accepted.map(cookie => cookie.name + '=' + cookie.value).join('; ');
    }
    const request = new Request(incoming.url(), { method: incoming.method(), headers: { ...incomingHeaders, 'CF-Connecting-IP': '203.0.113.1' }, body: incoming.postData() || undefined });
    const response = await worker.fetch(request, env);
    if (new URL(incoming.url()).pathname === '/api/auth/login') {
      const entry = loginRequests[loginRequests.length - 1];
      entry.status = response.status;
      entry.secureSession = /HttpOnly/.test(response.headers.get('Set-Cookie') || '') && /Secure/.test(response.headers.get('Set-Cookie') || '');
      // WebKit cannot fulfill a routed 303. Test the real Worker response and
      // browser-generated form Origin, then navigate to its Location explicitly.
      // Real un-intercepted 303 navigation is a separate production release gate.
      await route.fulfill({ status: 200, contentType: 'text/html', headers: Object.fromEntries(response.headers), body: '<!doctype html><h1>Test-only native response boundary</h1>' });
      return;
    }
    await route.fulfill({ status: response.status, headers: Object.fromEntries(response.headers), body: Buffer.from(await response.arrayBuffer()) });
  });
  return { password, sqlite, loginRequests };
}
