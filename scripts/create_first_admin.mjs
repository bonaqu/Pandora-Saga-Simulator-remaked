// Run once from the repository, after applying the D1 migration. This script
// never prints credentials or writes a pepper into a file/GitHub secret.
import fs from 'node:fs/promises';
import path from 'node:path';
import { spawn, execFileSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { createPasswordRecord } from '../admin-api/src/auth.mjs';
import { parseWranglerJson } from './lib/wrangler-json.mjs';

const root = path.resolve(import.meta.dirname, '..');
const privateDirectory = path.resolve('D:/CODEX/Private/PandoraSagaSimulator');
const credentialsFile = path.join(privateDirectory, 'admin-login.txt');
const config = path.join(root, 'admin-api/wrangler.jsonc');
const wrangler = path.join(root, 'node_modules/wrangler/bin/wrangler.js');

async function cli(args, input) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [wrangler, ...args, '--config', config], {
      cwd: root, windowsHide: true, stdio: ['pipe', 'pipe', 'pipe'],
      // Wrangler's --json uses level "log" (not "info"). Capture all output,
      // disable disk debug logs and retain its default secret sanitization.
      env: { ...process.env, WRANGLER_LOG: 'log', WRANGLER_WRITE_LOGS: 'false', WRANGLER_LOG_SANITIZE: 'true', WRANGLER_SEND_METRICS: 'false' }
    });
    const output = [], errors = [];
    child.stdout.on('data', chunk => output.push(chunk));
    // Consume but do not print CLI diagnostics which might include SQL values.
    child.stderr.on('data', chunk => errors.push(chunk));
    child.once('error', () => reject(new Error('Cloudflare command could not start')));
    child.once('close', code => {
      if (code === 0) { resolve(Buffer.concat(output).toString('utf8')); return; }
      const diagnostic = Buffer.concat(errors).toString('utf8');
      const apiCode = diagnostic.match(/\[code:\s*(\d+)\]/)?.[1] || 'not supplied';
      const hints = ['version', 'binding', 'authenticate', 'stdin', 'asset', 'secret'].filter(hint => diagnostic.toLowerCase().includes(hint));
      reject(new Error(`Cloudflare ${args.slice(0, 2).join(' ')} failed (exit ${code}, API code ${apiCode}, categories ${hints.join(',')}); credentials were not logged`));
    });
    child.stdin.end(input || '');
  });
}

const decodeJson = parseWranglerJson;

async function main() {
  if (privateDirectory.toLowerCase().startsWith(root.toLowerCase() + path.sep) || privateDirectory === root) throw new Error('Credential directory must be outside the repository');
  let resumePassword;
  try {
    await fs.access(credentialsFile);
    if (!process.argv.includes('--resume-uninitialized')) throw new Error('Credential file already exists; refusing to replace it');
    resumePassword = (await fs.readFile(credentialsFile, 'utf8')).match(/^Пароль: ([A-Za-z0-9_-]{43})$/m)?.[1];
    if (!resumePassword) throw new Error('Private credential file is not a valid generated bootstrap; refusing to change it');
  } catch (error) { if (error.code !== 'ENOENT') throw error; }
  const before = decodeJson(await cli(['d1', 'execute', 'pandora-saga-simulator-remaked-admin-db', '--remote', '--command', 'SELECT COUNT(*) AS count FROM admins', '--json']));
  if (before[0]?.results?.[0]?.count !== 0) throw new Error('Administrator already exists; refusing to reset or replace it');
  const secrets = decodeJson(await cli(['secret', 'list']));
  if (!Array.isArray(secrets) || secrets.some(secret => secret.name === 'AUTH_PEPPER')) throw new Error('Authentication secret already exists; use documented recovery, not a new bootstrap');

  await fs.mkdir(privateDirectory, { recursive: true, mode: 0o700 });
  if (process.platform === 'win32') {
    const owner = process.env.USERDOMAIN + '\\' + process.env.USERNAME;
    execFileSync('icacls', [privateDirectory, '/inheritance:r', '/grant:r', owner + ':(OI)(CI)F', '/grant:r', 'SYSTEM:(OI)(CI)F'], { windowsHide: true, stdio: 'pipe' });
  }
  const password = resumePassword || randomBytes(32).toString('base64url');
  const pepper = randomBytes(32).toString('base64url');
  const record = await createPasswordRecord(password, pepper);
  const credentialText = 'Pandora Saga Simulator — личный вход администратора\n\n'
    + 'Логин: admin\nПароль: ' + password + '\n'
    + 'Админка: https://pandora-saga-simulator-remaked-admin-api.bonaqu.workers.dev/admin\n\n'
    + 'Не загружайте этот файл на GitHub и не пересылайте его. Пароль не хранится на сайте.\n'
    + 'На основном сайте вводите IDDQD вне поля ввода, чтобы открыть форму входа.\n';
  if (!resumePassword) await fs.writeFile(credentialsFile, credentialText, { encoding: 'utf8', mode: 0o600, flag: 'wx' });

  const seedFile = path.join(privateDirectory, 'bootstrap-' + randomBytes(8).toString('hex') + '.sql');
  // All inserted values are generated fixed-format base64url, not user inputs.
  const sql = "INSERT INTO admins (id, username, algorithm, password_salt, password_hash, created_at) VALUES (1, 'admin', '"
    + record.algorithm + "', '" + record.salt + "', '" + record.hash + "', " + Math.floor(Date.now() / 1000) + ");\n";
  await fs.writeFile(seedFile, sql, { encoding: 'utf8', mode: 0o600, flag: 'wx' });
  await cli(['secret', 'put', 'AUTH_PEPPER'], pepper);
  const seeded = decodeJson(await cli(['d1', 'execute', 'pandora-saga-simulator-remaked-admin-db', '--remote', '--file', seedFile, '--json']));
  if (!Array.isArray(seeded) || seeded.some(result => result.success !== true)) throw new Error('Database seed did not confirm success; retain the private bootstrap file for recovery');
  // Exact single generated file, not a recursive/private-directory deletion.
  await fs.unlink(seedFile);
  process.stdout.write(JSON.stringify({ ok: true, credentialsFile, username: 'admin', passwordPrinted: false, pepperStored: 'Cloudflare Secrets only' }) + '\n');
}

main().catch(error => {
  process.stderr.write(error.message + '\n');
  process.exitCode = 1;
});
