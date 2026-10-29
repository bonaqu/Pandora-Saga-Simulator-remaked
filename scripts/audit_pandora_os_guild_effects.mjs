#!/usr/bin/env node
// GET-only evidence inventory; no interpretation of unknown fv arrays as formulas.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';

// Explicitly reviewed associations using Russian skill names, source EP and
// existing editor labels. Clan level is a composite, not a source skill ID.
export const GROUPS = Object.freeze([
  { selector: 1, first: 600000001, last: 600000006, effect: 'EP_MAXLIFE_SCALE' },
  { selector: 2, first: 600000011, last: 600000016, effect: 'EP_MAXMANA_SCALE' },
  { selector: 3, first: 600000021, last: 600000024, effect: 'EP_HEAL_TIME_SCALE' },
  { selector: 4, first: 600000031, last: 600000034, effect: 'EP_HEAL_TIME_SCALE' },
  { selector: 5, first: 600000071, last: 600000073, effect: 'EP_ONDAMAGE_FIN_DAMAGE_SCALE' },
  { selector: 6, first: 600000081, last: 600000083, effect: 'EP_ONDAMAGE_ELEM_SCALE' },
  { selector: 7, first: 600000061, last: 600000068, effect: 'EP_VOLUME_EXP' },
  { selector: 8, first: 600000211, last: 600000215, effect: 'EP_SKILL_EXEC' },
  { selector: 9, first: 600000221, last: 600000225, effect: 'EP_SKILL_EXEC' },
  { selector: 10, first: 600000231, last: 600000235, effect: 'EP_SKILL_EXEC' }
]);
const guildId = id => Number.isSafeInteger(id) && (id >= 600000000 && id < 600001000 || id >= 610000000 && id < 610001000);

export function auditGuild({ skills, english, labels, calcText, initText, vitalsText, buildText }) {
  if (!skills || !Array.isArray(labels?.skills) || labels.skills.length !== 11) throw new Error('Missing guild inputs');
  const all = Object.values(skills).filter(row => guildId(Number(row.id))).sort((a,b) => a.id-b.id);
  const byId = new Map(all.map(row => [Number(row.id),row]));
  if (byId.size !== all.length) throw new Error('Duplicate guild source IDs');
  const references = [...calcText.split(/\r?\n/), ...initText.split(/\r?\n/), ...vitalsText.split(/\r?\n/), ...buildText.split(/\r?\n/)];
  const mappedIds = new Set();
  const groups = GROUPS.map(group => {
    const label = labels.skills[group.selector];
    if (!label || !Array.isArray(label.levels)) throw new Error('Missing selector label: ' + group.selector);
    const records = [];
    for (let id = group.first; id <= group.last; id++) {
      const row = byId.get(id);
      if (!row || !row.funcs?.some(func => func.ep === group.effect)) throw new Error('Guild source changed: ' + id);
      mappedIds.add(id);
      const linkedIds = row.funcs.filter(func => func.ep === 'EP_SKILL_EXEC').map(func => Number(func.fv1?.[3])).filter(Number.isSafeInteger);
      const linkedEffects = linkedIds.map(linkedId => {
        const linked = byId.get(linkedId);
        if (!linked) throw new Error('Missing linked guild source skill: ' + linkedId);
        mappedIds.add(linkedId); return linked;
      });
      records.push({ id, level: id-group.first+1, ruName: row.name, enName: english?.skills?.[id]?.n || null,
        ruDescription: row.desc || '', enDescription: english?.skills?.[id]?.d || '', learnable: row.learnable,
        functions: row.funcs, linkedEffects, tooltip: label.levels[id-group.first] || null });
    }
    return { selector: group.selector, nameRu: label.nameRu, originalNameEn: label.sourceNameEn,
      availableSimulatorLevels: label.levels.length, sourceLevels: records.length,
      sourceOnlyLevels: records.filter(record => record.level > label.levels.length).map(record => record.level),
      calculationEvidence: references.filter(line => line.includes('SelBuffClan_' + group.selector + "'") || line.includes('SelBuffClan_' + group.selector + '"')),
      records };
  });
  const remaining = all.filter(row => !mappedIds.has(Number(row.id))).map(row => ({ ...row, english: english?.skills?.[row.id] || null }));
  return { groups, compositeClan: { selector: 0, ...labels.skills[0],
      note: 'Guild level sets multiple existing selectors; it is not directly represented by one source skill.' },
    otherGuildRows: remaining, totalSourceRows: all.length,
    limitations: [
      'Selector association is review evidence, not proof of client behavior, availability or level caps.',
      'Raw EP/fv arrays and linked effects are kept verbatim; effect units, ordering, rounding and duration are not inferred.',
      'The full guild-level composite and every active skill/rank require independent verification.',
      'Server tooltip text may differ from approved local UI wording; user translations and drafts are not inspected or overwritten.'
    ] };
}
async function get(url) {
  const response = await fetch(url, { signal: AbortSignal.timeout(30000), cache: 'no-store' });
  if (!response.ok) throw new Error('GET failed: ' + url + ' HTTP ' + response.status);
  const bytes = Buffer.from(await response.arrayBuffer());
  return { url, sha256: createHash('sha256').update(bytes).digest('hex'), data: JSON.parse(bytes.toString('utf8')) };
}
async function main() {
  if (process.argv.length !== 2 && !(process.argv.length === 4 && process.argv[2] === '--output')) throw new Error('Usage: node scripts/audit_pandora_os_guild_effects.mjs [--output NEW_FILE]');
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
  const read = file => fs.readFileSync(path.join(root,file),'utf8');
  const [skills, english] = await Promise.all(['skills.json','strings.en.json'].map(file => get('https://pandorasaga-os.com/gamedata/' + file)));
  const report = auditGuild({ skills: skills.data, english: english.data,
    labels: JSON.parse(read('localization/guild-skills.v1.json')), calcText: read('js/calc.js'), initText: read('js/ini.js'),
    vitalsText: read('modern/current-vitals.js'), buildText: read('scripts/build_pages.py') });
  report.checkedAt = new Date().toISOString(); report.sources = [skills,english].map(({url,sha256})=>({url,sha256}));
  const output = JSON.stringify(report,null,2)+'\n';
  if (process.argv.length === 4) {
    fs.writeFileSync(process.argv[3], output, { flag: 'wx' });
    console.log(JSON.stringify({ rows: report.totalSourceRows, groups: report.groups.length, output: process.argv[3] }));
  } else process.stdout.write(output);
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)) main().catch(error=>{console.error(error.message);process.exitCode=1});
