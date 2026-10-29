#!/usr/bin/env node
// Review-only evidence. A many-to-one historical candidate is NOT an import map.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { baselineById } from '../admin-api/src/catalog-baseline.mjs';
import { convertedEffects, serverCategory } from './materialize_pandora_os_live_sync_hardening.mjs';
import { parseTokens } from './audit_pandora_os_catalog_values.mjs';

export const CANDIDATES = Object.freeze([
  [11502,'equipment.30.19'],[11512,'equipment.30.20'],[11522,'equipment.30.21'],[11532,'equipment.30.22'],
  [11542,'equipment.30.23'],[11562,'equipment.30.25'],[11572,'equipment.30.26'],
  [12502,'equipment.31.22'],[12512,'equipment.31.23'],[12522,'equipment.31.24'],[12532,'equipment.31.24'],[12572,'equipment.31.28'],
  [13502,'equipment.33.20'],[13512,'equipment.33.21'],[13522,'equipment.33.22'],[13532,'equipment.33.23'],[13542,'equipment.33.24'],[13572,'equipment.33.27'],
  [14502,'equipment.32.14'],[14512,'equipment.32.14'],[14532,'equipment.32.15'],[14542,'equipment.32.16'],[14552,'equipment.32.17'],[14572,'equipment.32.19'],
  [15502,'equipment.34.14'],[15512,'equipment.34.14'],[15532,'equipment.34.15'],[15542,'equipment.34.16'],[15552,'equipment.34.17'],[15572,'equipment.34.19']
]);

export function examinePair(serverId, projectId, server, english, legacy, published) {
  if (!server || Number(server.id) !== serverId || !legacy || legacy.id !== projectId ||
      serverCategory(server) !== legacy.legacy_category_id) throw new Error('Dawn candidate identity/category mismatch: ' + serverId);
  const parsed = parseTokens(legacy.calculation_code), converted = convertedEffects(server, true);
  const serverEffects = converted.effects.map(effect => ({ ...effect, legacyValue: parsed.effects.get(effect.stat + ':' + effect.unit) ?? null }));
  const mapped = new Set(converted.effects.map(effect => effect.stat + ':' + effect.unit));
  const retainedOnly = [...parsed.effects].filter(([key]) => !mapped.has(key)).map(([key,value]) => ({ key,value }));
  return { serverId, projectId, sourceNames: { ru: server.name || '', en: english?.n || '' },
    sourceDescriptions: { ru: server.desc || '', en: english?.d || '' },
    legacyNames: legacy.name, legacyFlags: legacy.compatibility_flags.slice(0,8),
    sourceCategory: serverCategory(server), legacyCategory: legacy.legacy_category_id,
    level: { source: server.level, legacy: legacy.level_requirement }, sockets: { source: server.soulslot, legacy: legacy.soul_socket_count },
    serverEffects, retainedOnly, conversionComplete: converted.complete, sourceEffects: server.effects || [],
    legacyCode: legacy.calculation_code, publishedRecord: published || null };
}

async function get(url) {
  const response = await fetch(url, { signal: AbortSignal.timeout(30000), cache: 'no-store' });
  if (!response.ok) throw new Error('GET failed: ' + url + ' HTTP ' + response.status);
  const bytes = Buffer.from(await response.arrayBuffer());
  return { url, sha256: createHash('sha256').update(bytes).digest('hex'), data: JSON.parse(bytes.toString('utf8')) };
}
async function main() {
  if (process.argv.length !== 3 && !(process.argv.length === 5 && process.argv[3] === '--output')) throw new Error('Usage: node scripts/audit_pandora_os_dawn_candidates.mjs <identity-report.json> [--output NEW_FILE]');
  const identity = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
  const urls = ['https://pandorasaga-os.com/gamedata/items.json','https://pandorasaga-os.com/gamedata/strings.en.json','https://pandora-saga-simulator-remaked-admin-api.bonaqu.workers.dev/api/catalog'];
  const resources = await Promise.all(urls.map(get));
  for (const resource of resources) {
    const previous = identity.sources?.find(source => source.url === resource.url);
    if (!previous || previous.sha256 !== resource.sha256) throw new Error('Source or public catalog changed since identity audit: ' + resource.url);
  }
  const [items, english, catalog] = resources.map(resource => resource.data);
  if (catalog.revision !== identity.revision) throw new Error('Catalog revision changed');
  const publicById = new Map(catalog.records.map(record => [record.id, record]));
  const rows = CANDIDATES.map(([serverId, projectId]) => examinePair(serverId, projectId, items[serverId], english.items?.[serverId], baselineById.get(projectId), publicById.get(projectId)));
  const groups = new Map();
  rows.forEach(row => { const ids = groups.get(row.projectId) || []; ids.push(row.serverId); groups.set(row.projectId, ids); });
  const report = { checkedAt: new Date().toISOString(), revision: catalog.revision, rows,
    manyToOne: [...groups].filter(([,ids]) => ids.length > 1).map(([projectId,serverIds]) => ({ projectId, serverIds })),
    sourceHashes: resources.map(({url,sha256}) => ({url,sha256})),
    note: 'Evidence for manual identity review only; no alias, merge, data import or D1 write is performed.' };
  const output = JSON.stringify(report, null, 2) + '\n';
  if (process.argv.length === 5) {
    fs.writeFileSync(process.argv[4], output, { flag: 'wx' });
    console.log(JSON.stringify({ revision: report.revision, rows: rows.length, manyToOne: report.manyToOne.length, output: process.argv[4] }));
  } else process.stdout.write(output);
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main().catch(error => { console.error(error.message); process.exitCode = 1; });
