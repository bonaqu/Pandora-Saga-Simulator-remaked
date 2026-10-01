// Restore bytes, not semantics. Never normalize the preservation assertion.
// Default is read-only; repair is limited to files whose CRLF->LF bytes match
// the existing committed SHA-256 manifest exactly, with a mandatory backup.
import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';

const root = process.cwd();
const repair = process.argv.includes('--repair');
const backupIndex = process.argv.indexOf('--backup');
const backup = backupIndex === -1 ? null : path.resolve(process.argv[backupIndex + 1] || '');
if (repair && (!backup || backup === root || backup.startsWith(root + path.sep))) throw new Error('A backup directory outside the repository is required');
const digest = value => createHash('sha256').update(value).digest('hex');
const changes = [];
const manifest = await fs.readFile(path.join(root, 'preservation/legacy-files.sha256'), 'utf8');
for (const line of manifest.split(/\r?\n/).filter(Boolean)) {
  const match = line.match(/^([a-f0-9]{64})  (.+)$/);
  if (!match) throw new Error('Invalid preservation manifest');
  const file = path.resolve(root, match[2]);
  if (!file.startsWith(root + path.sep)) throw new Error('Manifest path outside repository');
  const current = await fs.readFile(file);
  if (digest(current) === match[1]) continue;
  const original = Buffer.from(current.toString('latin1').replace(/\r\n/g, '\n'), 'latin1');
  if (digest(original) !== match[1]) throw new Error('Non-line-ending difference: ' + match[2] + '. No files changed.');
  changes.push({ relative: match[2], file, current, original });
}
// All files are preflighted before any repair. Preserve their exact prior
// bytes outside Git; refuse to overwrite a pre-existing backup.
if (repair) {
  for (const entry of changes) {
    const saved = path.resolve(backup, entry.relative);
    if (!saved.startsWith(backup + path.sep)) throw new Error('Backup path outside target');
    await fs.mkdir(path.dirname(saved), { recursive: true });
    await fs.writeFile(saved, entry.current, { flag: 'wx' });
  }
  for (const entry of changes) await fs.writeFile(entry.file, entry.original);
}
console.log(JSON.stringify({ operation: repair ? 'restored-exact-source-bytes' : 'read-only', files: changes.map(entry => entry.relative), count: changes.length }));
