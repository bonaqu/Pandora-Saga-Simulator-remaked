import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { randomBytes } from 'node:crypto';
import { createPasswordRecord, verifyPassword, login, authorize, logout, sessionHash, csrfToken } from '../../admin-api/src/auth.mjs';

const origin = 'https://pandora-saga-simulator-remaked-admin-api.bonaqu.workers.dev';
const pages = 'https://bonaqu.github.io';
const password = randomBytes(32).toString('base64url');
const pepper = randomBytes(32).toString('base64url');
let record;
test.before(async () => { record = await createPasswordRecord(password, pepper); });

function fixture() {
  const sqlite = new DatabaseSync(':memory:');
  sqlite.exec(fs.readFileSync(new URL('../../admin-api/migrations/0001_auth.sql', import.meta.url), 'utf8'));
  sqlite.prepare('INSERT INTO admins (id, username, algorithm, password_salt, password_hash, created_at) VALUES (1,?,?,?,?,?)')
    .run('admin', record.algorithm, record.salt, record.hash, 1000);
  const DB = {
    prepare(sql) {
      let params = [];
      const api = {
        bind(...values) { params = values; return api; },
        async first() { return sqlite.prepare(sql).get(...params) || null; },
        async run() { const result = sqlite.prepare(sql).run(...params); return { success: true, meta: { changes: Number(result.changes) } }; },
        async all() { return { results: sqlite.prepare(sql).all(...params), success: true }; }
      };
      return api;
    }
  };
  return { env: { DB, AUTH_PEPPER: pepper, ADMIN_ORIGIN: origin, PUBLIC_ORIGIN: pages }, sqlite };
}
function request(path, body, headers = {}) {
  return new Request(origin + path, { method: body ? 'POST' : 'GET', headers: { Origin: origin, 'CF-Connecting-IP': '203.0.113.1', ...(body ? { 'Content-Type': 'application/json' } : {}), ...headers }, body: body ? JSON.stringify(body) : undefined });
}
async function signedIn(env, now = 2000) {
  const result = await login(request('/api/auth/login', { username: 'admin', password }), env, now);
  assert.equal(result.status, 200);
  const cookie = result.headers.get('Set-Cookie').split(';')[0];
  const data = await result.json();
  return { cookie, csrf: data.csrfToken };
}

test('password storage uses random salts, supported OWASP scrypt cost and a separate pepper', async () => {
  const another = await createPasswordRecord(password, pepper);
  assert.notEqual(record.salt, another.salt);
  assert.notEqual(record.hash, another.hash);
  assert.equal(record.algorithm, 'scrypt-n16384-r8-p5-v1');
  assert.equal(await verifyPassword(password, record, pepper), true);
  assert.equal(await verifyPassword(password + 'x', record, pepper), false);
  assert.equal(await verifyPassword(password, record, randomBytes(32).toString('base64url')), false);
  assert.equal(JSON.stringify(record).includes(password), false);
});

test('invalid KDF records and missing secrets fail closed', async () => {
  assert.equal(await verifyPassword(password, { ...record, algorithm: 'pbkdf2-1' }, pepper), false);
  await assert.rejects(() => createPasswordRecord(password, ''), /secret/);
});

test('schema permits only the single admin account', () => {
  const { sqlite } = fixture();
  assert.throws(() => sqlite.prepare("INSERT INTO admins VALUES (2,'other','x','x','x',0)").run());
  assert.throws(() => sqlite.prepare("UPDATE admins SET username='other'").run());
});

test('successful login stores only token hashes, issues an HttpOnly secure cookie and no bearer', async () => {
  const { env, sqlite } = fixture();
  const result = await login(request('/api/auth/login', { username: 'admin', password }, { Origin: pages }), env, 2000);
  assert.equal(result.status, 200);
  const cookie = result.headers.get('Set-Cookie');
  assert.match(cookie, /^__Host-pandora_admin=/);
  for (const attribute of ['HttpOnly', 'Secure', 'SameSite=Lax', 'Path=/']) assert.ok(cookie.includes(attribute));
  const raw = cookie.split(';')[0].split('=')[1];
  const row = sqlite.prepare('SELECT * FROM admin_sessions').get();
  assert.equal(row.token_hash, sessionHash(raw, pepper));
  assert.equal(JSON.stringify(row).includes(raw), false);
  const body = await result.json();
  assert.deepEqual(Object.keys(body).sort(), ['csrfToken', 'message', 'ok']);
  assert.equal(body.csrfToken, csrfToken(raw, pepper));
  assert.equal(result.headers.get('Cache-Control'), 'no-store');
});

test('invalid username/password have the same denial and do not create a session', async () => {
  const { env, sqlite } = fixture();
  for (const credentials of [{ username: 'admin', password: 'incorrect' }, { username: 'other', password }]) {
    const result = await login(request('/api/auth/login', credentials), env, 2000);
    assert.equal(result.status, 401);
    assert.equal((await result.json()).message, 'CHEAT FAILED / ACCESS DENIED');
    assert.equal(result.headers.has('Set-Cookie'), false);
  }
  assert.equal(sqlite.prepare('SELECT COUNT(*) AS n FROM admin_sessions').get().n, 0);
});

test('untrusted origin, missing origin, malformed and oversized inputs are rejected before hashing', async () => {
  const { env, sqlite } = fixture();
  for (const evil of ['https://bonaqu.github.io.evil.test', 'null', 'https://evil.test', '']) {
    const result = await login(request('/api/auth/login', { username: 'admin', password }, { Origin: evil }), env, 2000);
    assert.equal(result.status, 403);
  }
  assert.equal((await login(request('/api/auth/login', { username: 'admin', password: 'x'.repeat(2049) }), env, 2000)).status, 413);
  assert.equal((await login(request('/api/auth/login', { username: 'admin', password: 123 }), env, 2000)).status, 400);
  assert.equal(sqlite.prepare('SELECT COUNT(*) AS n FROM login_limits').get().n, 0);
});

test('atomic per-IP rate limit rejects the sixth request and expires without storing raw IPs', async () => {
  const { env, sqlite } = fixture();
  for (let attempt = 0; attempt < 5; attempt++) assert.equal((await login(request('/api/auth/login', { username: 'wrong', password: 'wrong' }), env, 2000)).status, 401);
  const blocked = await login(request('/api/auth/login', { username: 'admin', password }), env, 2000);
  assert.equal(blocked.status, 429);
  assert.ok(Number(blocked.headers.get('Retry-After')) > 0);
  assert.equal(JSON.stringify(sqlite.prepare('SELECT * FROM login_limits').all()).includes('203.0.113.1'), false);
  assert.equal((await login(request('/api/auth/login', { username: 'admin', password }), env, 2061)).status, 200);
});

test('distributed attempts hit a global limit before generating unbounded IP keys', async () => {
  const { env, sqlite } = fixture();
  for (let attempt = 0; attempt < 30; attempt++) {
    const result = await login(request('/api/auth/login', { username: 'wrong', password: 'wrong' }, { 'CF-Connecting-IP': '203.0.113.' + attempt }), env, 2000);
    assert.equal(result.status, 401);
  }
  assert.equal((await login(request('/api/auth/login', { username: 'admin', password }), env, 2000)).status, 429);
  assert.equal(sqlite.prepare('SELECT COUNT(*) AS n FROM login_limits').get().n, 31);
});

test('authorization checks a server session, idle and absolute expiry; malformed cookies fail closed', async () => {
  const { env, sqlite } = fixture();
  const session = await signedIn(env);
  const headers = { Cookie: session.cookie };
  assert.equal((await authorize(request('/api/session', null, headers), env, 2100)).ok, true);
  assert.equal((await authorize(request('/api/session', null, headers), env, 4001)).ok, false);
  assert.equal((await authorize(request('/api/session', null, { Cookie: session.cookie + '; ' + session.cookie }), env, 2100)).ok, false);
  sqlite.prepare('UPDATE admin_sessions SET last_seen=40000').run();
  assert.equal((await authorize(request('/api/session', null, headers), env, 40000)).ok, false);
  assert.equal((await authorize(request('/api/session'), env, 2000)).ok, false);
});

test('every mutation requires the current session, exact same-origin and CSRF token', async () => {
  const { env } = fixture();
  const session = await signedIn(env);
  for (const path of ['/api/admin/items', '/api/admin/preview']) {
    for (const headers of [{ Cookie: session.cookie }, { Cookie: session.cookie, Origin: pages, 'X-CSRF-Token': session.csrf }, { Cookie: session.cookie, 'X-CSRF-Token': 'incorrect' }]) {
      assert.equal((await authorize(request(path, {}, headers), env, 2000)).ok, false);
    }
    assert.equal((await authorize(request(path, {}, { Cookie: session.cookie, 'X-CSRF-Token': session.csrf }), env, 2000)).ok, true);
  }
});

test('logout revokes server session, clears cookie and denies token reuse', async () => {
  const { env, sqlite } = fixture();
  const session = await signedIn(env);
  const result = await logout(request('/api/auth/logout', {}, { Cookie: session.cookie, 'X-CSRF-Token': session.csrf }), env, 2000);
  assert.equal(result.status, 200);
  assert.equal((await result.json()).message, 'GOD MODE DISABLED');
  assert.match(result.headers.get('Set-Cookie'), /Max-Age=0/);
  assert.equal(sqlite.prepare('SELECT COUNT(*) AS n FROM admin_sessions').get().n, 0);
  assert.equal((await authorize(request('/api/session', null, { Cookie: session.cookie }), env, 2001)).ok, false);
});
