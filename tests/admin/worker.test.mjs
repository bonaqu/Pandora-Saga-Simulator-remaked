import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import worker from '../../admin-api/src/worker.mjs';

const origin = 'https://pandora-saga-simulator-remaked-admin-api.bonaqu.workers.dev';
const pages = 'https://bonaqu.github.io';
const env = {
  PUBLIC_ORIGIN: pages, ADMIN_ORIGIN: origin,
  ASSETS: { fetch: async () => new Response('<!doctype html><title>Admin</title>', { headers: { 'Content-Type': 'text/html' } }) }
};

test('Worker-owned admin URL does not conflict with Assets HTML canonical redirects', async () => {
  const config = JSON.parse(fs.readFileSync(new URL('../../admin-api/wrangler.jsonc', import.meta.url), 'utf8'));
  assert.equal(config.assets.html_handling, 'none');
  let requested;
  const result = await worker.fetch(new Request(origin + '/admin'), { ...env, ASSETS: { fetch: async request => {
    requested = new URL(request.url).pathname;
    return new Response('<!doctype html><title>Admin</title>', { headers: { 'Content-Type': 'text/html' } });
  } } });
  assert.equal(requested, '/admin.html');
  assert.equal(result.status, 200);
  assert.equal(result.headers.has('Location'), false);
});

test('every private route rejects missing sessions, independent of hidden UI', async () => {
  for (const method of ['GET', 'POST', 'PUT', 'DELETE']) {
    for (const path of ['/api/session', '/api/admin/items', '/api/admin/publish', '/api/admin/preview', '/api/admin/unknown']) {
      const result = await worker.fetch(new Request(origin + path, { method }), env);
      assert.equal(result.status, 401);
      assert.equal(result.headers.get('Cache-Control'), 'no-store');
    }
  }
});

test('CORS grants only the exact production Pages origin, no wildcard or credentials', async () => {
  for (const requestOrigin of [pages, 'https://evil.test', pages + '.evil.test', 'null']) {
    const result = await worker.fetch(new Request(origin + '/api/catalog', { method: 'OPTIONS', headers: { Origin: requestOrigin, 'Access-Control-Request-Method': 'GET' } }), env);
    assert.equal(result.status, requestOrigin === pages ? 204 : 403);
    assert.equal(result.headers.get('Access-Control-Allow-Origin'), requestOrigin === pages ? pages : null);
    assert.equal(result.headers.has('Access-Control-Allow-Credentials'), false);
  }
});

test('login disallows an attacker origin before any database access', async () => {
  const result = await worker.fetch(new Request(origin + '/api/auth/login', { method: 'POST', headers: { Origin: 'https://evil.test', 'Content-Type': 'application/json' }, body: '{}' }), env);
  assert.equal(result.status, 403);
});

test('rejected native preview login returns to a safe retry form without granting a session or weakening JSON origin checks', async () => {
  for (const requestOrigin of ['http://127.0.0.1:8000', 'https://evil.test', 'null']) {
    const result = await worker.fetch(new Request(origin + '/api/auth/login', { method: 'POST', headers: { Origin: requestOrigin, 'Content-Type': 'application/x-www-form-urlencoded' }, body: 'username=admin&password=synthetic-not-a-secret' }), env);
    assert.equal(result.status, 303);
    assert.equal(result.headers.get('Location'), origin + '/admin?status=origin');
    assert.equal(result.headers.has('Set-Cookie'), false);
    assert.equal(result.headers.has('Access-Control-Allow-Origin'), false);
    assert.equal(result.headers.get('Cache-Control'), 'no-store');
    const json = await worker.fetch(new Request(origin + '/api/auth/login', { method: 'POST', headers: { Origin: requestOrigin, 'Content-Type': 'application/json' }, body: '{}' }), env);
    assert.equal(json.status, 403);
  }
});

test('admin HTML has strict CSP, no framing, no cache and no secret-bearing error details', async () => {
  const result = await worker.fetch(new Request(origin + '/admin'), env);
  assert.equal(result.status, 200);
  assert.match(result.headers.get('Content-Security-Policy'), /script-src 'self'/);
  assert.match(result.headers.get('Content-Security-Policy'), /frame-ancestors 'none'/);
  assert.ok(!result.headers.get('Content-Security-Policy').includes('unsafe-inline'));
  assert.equal(result.headers.get('X-Frame-Options'), 'DENY');
  assert.equal(result.headers.get('Referrer-Policy'), 'same-origin');
  assert.equal(result.headers.get('Cache-Control'), 'no-store');
});

test('unknown public paths do not expose config, credentials or assets directories', async () => {
  for (const path of ['/wrangler.jsonc', '/src/auth.mjs', '/.dev.vars', '/admin/credentials.json', '/api/bootstrap']) {
    assert.equal((await worker.fetch(new Request(origin + path), env)).status, 404);
  }
});

test('missing pepper fails closed and does not reveal internal configuration', async () => {
  const result = await worker.fetch(new Request(origin + '/api/auth/login', { method: 'POST', headers: { Origin: origin, 'Content-Type': 'application/json' }, body: '{}' }), env);
  assert.equal(result.status, 503);
  assert.equal((await result.text()).includes('secret'), false);
});
