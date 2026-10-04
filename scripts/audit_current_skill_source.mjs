// Manual read-only reconciliation; never fetches public data as a CI dependency.
import fs from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { auditCurrentSkills } from './lib/current-skill-audit.mjs';
const args = process.argv.slice(2);
const option = name => { const index = args.indexOf(name); return index < 0 ? null : args[index + 1]; };
if (args.some((value, i) => i % 2 === 0 && !['--snapshot', '--output'].includes(value)) || args.length % 2)
  throw new Error('Usage: node scripts/audit_current_skill_source.mjs [--snapshot FILE] [--output FILE]');
const snapshotPath = option('--snapshot');
const snapshot = snapshotPath ? JSON.parse(await fs.readFile(snapshotPath, 'utf8')) : {
  fetchedAt: new Date().toISOString(), resources: await Promise.all(['skills.json', 'strings.en.json', 'classes.json'].map(async file => {
    const url = 'https://pandorasaga-os.com/gamedata/' + file;
    const response = await fetch(url, { signal: AbortSignal.timeout(20000) });
    if (!response.ok) throw new Error('Public reference unavailable: ' + file);
    const raw = await response.text();
    return { file, url, sha256: createHash('sha256').update(raw).digest('hex'), data: JSON.parse(raw) };
  })) };
const source = Object.fromEntries(['skills', 'english', 'classes'].map((key, index) => {
  const file = ['skills.json', 'strings.en.json', 'classes.json'][index];
  const resource = snapshot.resources.find(row => row.file === file);
  if (!resource?.data || resource.url !== 'https://pandorasaga-os.com/gamedata/' + file || !/^[a-f0-9]{64}$/.test(resource.sha256))
    throw new Error('Invalid reference resource metadata: ' + file);
  return [key, resource.data];
}));
const nativeSkills = JSON.parse(await fs.readFile('data/generated/skills.v1.json', 'utf8')).records;
const nativeClasses = JSON.parse(await fs.readFile('data/generated/character.v1.json', 'utf8')).records.filter(row => row.kind === 'class');
const report = { checkedAt: new Date().toISOString(), referenceFetchedAt: snapshot.fetchedAt,
  sourceHashes: snapshot.resources.map(({ file, url, sha256 }) => ({ file, url, sha256 })),
  ...auditCurrentSkills(source, nativeSkills, nativeClasses) };
if (option('--output')) await fs.writeFile(option('--output'), JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify({ classes: report.classChecks.length, currentRows: report.rowCount,
  retainedNative: report.nativeCount, counts: report.counts,
  note: 'No gameplay parity claim, source mutation, draft write or publication.' }));
