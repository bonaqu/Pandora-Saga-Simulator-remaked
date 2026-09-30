import { createHmac, randomBytes, scrypt, timingSafeEqual } from 'node:crypto';

export const COOKIE_NAME = '__Host-pandora_admin';
export const PASSWORD_ALGORITHM = 'scrypt-n16384-r8-p5-v1';
export const SESSION_SECONDS = 8 * 60 * 60;
export const IDLE_SECONDS = 30 * 60;
const TOKEN = /^[A-Za-z0-9_-]{43}$/;
const DENIED = 'CHEAT FAILED / ACCESS DENIED';

function requirePepper(pepper) {
  if (typeof pepper !== 'string' || !TOKEN.test(pepper)) throw new Error('Authentication secret is not configured');
}

function hmac(value, pepper) {
  requirePepper(pepper);
  return createHmac('sha256', pepper).update(value).digest('base64url');
}

function equal(left, right) {
  if (typeof left !== 'string' || typeof right !== 'string') return false;
  const a = Buffer.from(left), b = Buffer.from(right);
  return a.length === b.length && timingSafeEqual(a, b);
}

async function derivePassword(password, salt, pepper) {
  // OWASP's 16 MiB configuration is supported by Workers' native node:crypto.
  // Unlike PBKDF2, it does not hit the production 100,000-iteration ceiling.
  const prehash = hmac('password\0' + password, pepper);
  return new Promise((resolve, reject) => {
    scrypt(prehash, Buffer.from(salt, 'base64url'), 32,
      { N: 16384, r: 8, p: 5, maxmem: 32 * 1024 * 1024 },
      (error, result) => error ? reject(error) : resolve(result.toString('base64url')));
  });
}

export async function createPasswordRecord(password, pepper) {
  requirePepper(pepper);
  if (typeof password !== 'string' || password.length < 24 || Buffer.byteLength(password) > 512) throw new Error('Bootstrap password must be 24–512 bytes');
  const salt = randomBytes(32).toString('base64url');
  return { algorithm: PASSWORD_ALGORITHM, salt, hash: await derivePassword(password, salt, pepper) };
}

export async function verifyPassword(password, record, pepper) {
  requirePepper(pepper);
  if (typeof password !== 'string' || !record || record.algorithm !== PASSWORD_ALGORITHM || !TOKEN.test(record.salt || '') || !TOKEN.test(record.hash || '')) return false;
  return equal(await derivePassword(password, record.salt, pepper), record.hash);
}

export function sessionHash(token, pepper) { return hmac('session\0' + token, pepper); }
export function csrfToken(token, pepper) { return hmac('csrf\0' + token, pepper); }

export function jsonResponse(body, status = 200, extraHeaders = {}) {
  return Response.json(body, { status, headers: {
    'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'no-referrer', ...extraHeaders
  } });
}

function failure(status, extraHeaders) { return jsonResponse({ ok: false, message: DENIED }, status, extraHeaders); }

function cookie(value, maxAge = SESSION_SECONDS) {
  return `${COOKIE_NAME}=${value}; Path=/; Secure; HttpOnly; SameSite=Lax; Max-Age=${maxAge}`;
}

function readSessionCookie(request) {
  const values = (request.headers.get('Cookie') || '').split(';').map(value => value.trim())
    .filter(value => value.startsWith(COOKIE_NAME + '='));
  if (values.length !== 1) return null;
  const value = values[0].slice(COOKIE_NAME.length + 1);
  return TOKEN.test(value) ? value : null;
}

async function readCredentials(request) {
  const type = (request.headers.get('Content-Type') || '').split(';')[0].trim().toLowerCase();
  if (!['application/json', 'application/x-www-form-urlencoded'].includes(type)) return { error: 415 };
  const reader = request.body?.getReader();
  if (!reader) return { error: 400 };
  const chunks = [];
  let length = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      length += value.byteLength;
      if (length > 2048) { await reader.cancel(); return { error: 413 }; }
      chunks.push(value);
    }
    const text = Buffer.concat(chunks.map(chunk => Buffer.from(chunk))).toString('utf8');
    const body = type === 'application/json' ? JSON.parse(text) : Object.fromEntries(new URLSearchParams(text));
    if (!body || typeof body.username !== 'string' || typeof body.password !== 'string' || body.username.length > 64 || Buffer.byteLength(body.password) > 512) return { error: 400 };
    return { username: body.username, password: body.password };
  } catch { return { error: 400 }; }
}

async function consumeBucket(env, identifier, now, seconds, max) {
  const start = Math.floor(now / seconds) * seconds;
  const row = await env.DB.prepare(`INSERT INTO login_limits (bucket_hash, window_start, attempts, updated_at)
    VALUES (?, ?, 1, ?) ON CONFLICT(bucket_hash) DO UPDATE SET
    attempts = CASE WHEN login_limits.window_start = excluded.window_start THEN login_limits.attempts + 1 ELSE 1 END,
    window_start = excluded.window_start, updated_at = excluded.updated_at RETURNING attempts`)
    .bind(hmac('rate\0' + identifier, env.AUTH_PEPPER), start, now).first();
  return { allowed: row.attempts <= max, retry: start + seconds - now, reset: row.attempts === 1 };
}

export async function login(request, env, now = Math.floor(Date.now() / 1000)) {
  if (request.method !== 'POST') return failure(405, { Allow: 'POST' });
  const origin = request.headers.get('Origin');
  if (!origin || ![env.PUBLIC_ORIGIN, env.ADMIN_ORIGIN].includes(origin)) return failure(403);
  requirePepper(env.AUTH_PEPPER);
  const credentials = await readCredentials(request);
  if (credentials.error) return failure(credentials.error);

  // Consume a global budget first, so distributed abuse cannot create an
  // unlimited number of per-IP rows or bypass the account-wide protection.
  const global = await consumeBucket(env, 'global', now, 900, 30);
  if (!global.allowed) return failure(429, { 'Retry-After': String(global.retry) });
  if (global.reset) await env.DB.prepare('DELETE FROM login_limits WHERE updated_at < ?').bind(now - 86400).run();
  const ip = request.headers.get('CF-Connecting-IP');
  if (!ip) return failure(403);
  const personal = await consumeBucket(env, 'ip:' + ip, now, 60, 5);
  if (!personal.allowed) return failure(429, { 'Retry-After': String(personal.retry) });

  const admin = await env.DB.prepare('SELECT algorithm, password_salt, password_hash FROM admins WHERE id = ?').bind(1).first();
  if (!admin) return failure(503);
  const verified = await verifyPassword(credentials.password, { algorithm: admin.algorithm, salt: admin.password_salt, hash: admin.password_hash }, env.AUTH_PEPPER);
  if (!verified || credentials.username !== 'admin') return failure(401);

  const token = randomBytes(32).toString('base64url');
  await env.DB.prepare('DELETE FROM admin_sessions WHERE expires_at <= ? OR last_seen <= ?').bind(now, now - IDLE_SECONDS).run();
  await env.DB.prepare('INSERT INTO admin_sessions (token_hash, admin_id, created_at, last_seen, expires_at) VALUES (?, 1, ?, ?, ?)')
    .bind(sessionHash(token, env.AUTH_PEPPER), now, now, now + SESSION_SECONDS).run();
  return jsonResponse({ ok: true, message: 'GOD MODE ENABLED / WELCOME, ADMIN', csrfToken: csrfToken(token, env.AUTH_PEPPER) }, 200, { 'Set-Cookie': cookie(token) });
}

export async function authorize(request, env, now = Math.floor(Date.now() / 1000)) {
  const token = readSessionCookie(request);
  if (!token) return { ok: false, status: 401 };
  const hash = sessionHash(token, env.AUTH_PEPPER);
  const row = await env.DB.prepare('SELECT token_hash, last_seen, expires_at FROM admin_sessions WHERE token_hash = ? AND admin_id = ?')
    .bind(hash, 1).first();
  if (!row || row.expires_at <= now || row.last_seen <= now - IDLE_SECONDS) return { ok: false, status: 401 };
  const csrf = csrfToken(token, env.AUTH_PEPPER);
  if (!['GET', 'HEAD'].includes(request.method) &&
    (request.headers.get('Origin') !== env.ADMIN_ORIGIN || !equal(request.headers.get('X-CSRF-Token'), csrf))) return { ok: false, status: 403 };
  if (row.last_seen <= now - 60) {
    const updated = await env.DB.prepare('UPDATE admin_sessions SET last_seen = ? WHERE token_hash = ? AND expires_at > ? AND last_seen > ?')
      .bind(now, hash, now, now - IDLE_SECONDS).run();
    if (updated.meta.changes !== 1) return { ok: false, status: 401 };
  }
  return { ok: true, tokenHash: hash, csrfToken: csrf, expiresAt: row.expires_at };
}

export async function logout(request, env, now = Math.floor(Date.now() / 1000)) {
  const session = await authorize(request, env, now);
  if (!session.ok) return failure(session.status);
  if (request.method !== 'POST') return failure(405, { Allow: 'POST' });
  await env.DB.prepare('DELETE FROM admin_sessions WHERE token_hash = ?').bind(session.tokenHash).run();
  return jsonResponse({ ok: true, message: 'GOD MODE DISABLED' }, 200, { 'Set-Cookie': cookie('', 0) });
}
