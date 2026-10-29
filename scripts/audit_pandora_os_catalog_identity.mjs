#!/usr/bin/env node
// Read-only inventory. Name matches are review candidates, never identity proof.
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { baselineRecords } from '../admin-api/src/catalog-baseline.mjs';
import { stableCustomId } from './materialize_pandora_os_identity_reconcile.mjs';
import { serverCategory } from './materialize_pandora_os_live_sync_hardening.mjs';
import reviews from '../data/current-source-identity-reviews.v1.json' with { type: 'json' };

const normalize = value => String(value || '').normalize('NFKC').trim().toLocaleLowerCase('en').replace(/\s+/g, ' ');
// A name-only hint, never a verified identity: common English Soul word order
// varies ("Soul of the Pumpkin" versus "Pumpkin Soul").
const soulSubject = value => normalize(value).replace(/['’]s\b/g, '').replace(/[^a-z0-9]+/g, ' ')
  .split(' ').filter(word => word && !['soul','souls','of','the'].includes(word)).join(' ');
const asList = value => Array.isArray(value) ? value : Object.values(value || {});
const categoryOfBaseline = row => row.id.startsWith('equipment.') ? row.legacy_category_id : null;
const sourceKind = row => row.id.startsWith('equipment.') ? 'equipment' : row.id.startsWith('soul.') ? 'soul' : null;

export function auditIdentities({ items, souls, english, mapping, catalog, baseline = baselineRecords, olderItems = {}, olderSouls = {}, identityReviews = [] }) {
  if (!catalog?.ok || !Number.isSafeInteger(catalog.revision) || !Array.isArray(catalog.records)) throw new Error('Invalid public catalog snapshot');
  if (!Array.isArray(mapping?.equipment) || !Array.isArray(mapping?.souls)) throw new Error('Invalid identity map');
  if (!Array.isArray(identityReviews)) throw new Error('Invalid identity reviews');
  const reviewedPairs=new Set(),reviewedServerIds=new Set(),reviewedProjectIds=new Set();
  for(const review of identityReviews) {
    if (!review || !['equipment','soul'].includes(review.kind) || !Number.isSafeInteger(review.serverId) ||
        review.serverId<=0 || typeof review.projectId!=='string' || !review.evidence ||
        reviewedServerIds.has(review.kind+':'+review.serverId) || reviewedProjectIds.has(review.projectId))
      throw new Error('Invalid or duplicate identity review');
    const row=asList(review.kind==='equipment'?items:souls).find(entry=>Number(entry.id)===review.serverId);
    const original=baseline.find(entry=>entry.id===review.projectId);
    const en=english?.[review.kind==='equipment'?'items':'souls']?.[review.serverId]?.n;
    if(!row || !original || sourceKind(original)!==review.kind || row.name!==review.sourceRu || en!==review.sourceEn ||
      original.name?.en!==review.legacyEn || (review.kind==='equipment' && serverCategory(row)!==categoryOfBaseline(original)))
      throw new Error('Reviewed identity evidence changed: '+review.serverId);
    reviewedServerIds.add(review.kind+':'+review.serverId);reviewedProjectIds.add(review.projectId);
    reviewedPairs.add(review.kind+':'+review.serverId+':'+review.projectId);
  }
  const effective = new Map();
  for (const row of baseline) {
    const kind = sourceKind(row); if (!kind) continue;
    if (effective.has(row.id)) throw new Error('Duplicate baseline identity: ' + row.id);
    effective.set(row.id, { id: row.id, kind, category: categoryOfBaseline(row), names: row.name || {}, source: 'baseline' });
  }
  const publicIds = new Set();
  for (const row of catalog.records) {
    if (!['equipment', 'soul'].includes(row.kind)) continue;
    if (publicIds.has(row.id)) throw new Error('Duplicate public identity: ' + row.id);
    publicIds.add(row.id);
    effective.set(row.id, { id: row.id, kind: row.kind, category: row.category, names: row.names || {}, disabled: Boolean(row.disabled), source: 'published' });
  }
  const result = { revision: catalog.revision, matched: [], missing: [], ambiguous: [], duplicateCandidates: [], excluded: [], catalogOnly: [] };
  const known = new Set();
  for (const [kind, source, old] of [['equipment', items, olderItems], ['soul', souls, olderSouls]]) {
    const historical = kind === 'equipment' ? mapping.equipment : mapping.souls;
    const relations = [...historical,
      ...identityReviews.filter(row=>row.kind===kind && !historical.some(old=>Number(old.serverId)===row.serverId && old.projectId===row.projectId))
        .map(row=>({serverId:row.serverId,projectId:row.projectId}))];
    const byServer = new Map(), byProject = new Map();
    for (const row of relations) {
      const id = Number(row.serverId), list = byServer.get(id) || []; list.push(row.projectId); byServer.set(id, list);
      const reverse = byProject.get(row.projectId) || []; reverse.push(id); byProject.set(row.projectId, reverse);
    }
    const seen = new Set();
    for (const row of asList(source)) {
      const id = Number(row.id);
      if (!Number.isSafeInteger(id) || id <= 0 || seen.has(id)) throw new Error('Invalid or duplicate server ID in ' + kind + ': ' + row.id);
      seen.add(id);
      const category = kind === 'equipment' ? serverCategory(row) : null;
      const entry = { kind, serverId: id, category, serverKind: row.kind || null, slot: row.slot || null,
        names: { ru: row.name || '', en: english?.[kind === 'equipment' ? 'items' : 'souls']?.[id]?.n || '' },
        existedInOctoberSnapshot: Boolean(old[id]) };
      if (kind === 'equipment' && String(row.kind || '').startsWith('DECO_')) { result.excluded.push({ ...entry, reason: 'decorative overlay; existing project policy' }); continue; }
      if (kind === 'equipment' && (!row.slot || row.slot === 'arrow' || category === null)) { result.excluded.push({ ...entry, reason: 'unsupported slot or category; needs separate evaluation' }); continue; }
      const targets = byServer.get(id) || [], custom = stableCustomId(kind, id);
      const ids = [...new Set([...targets, custom])].filter(candidate => effective.has(candidate));
      const reverseCollision = targets.some(target => (byProject.get(target) || []).length > 1);
      const mismatched = ids.filter(candidate => { const current = effective.get(candidate); return current.kind !== kind || current.category !== category; });
      if (targets.length > 1 || reverseCollision || ids.length > 1 || mismatched.length) {
        result.ambiguous.push({ ...entry, mappedTargets: targets, existingIds: ids, mismatchedIds: mismatched, reverseCollision });
        ids.forEach(value => known.add(value)); continue;
      }
      if (ids.length === 1) {
        const current = effective.get(ids[0]); known.add(ids[0]);
        result.matched.push({ ...entry, projectId: ids[0], evidence: reviewedPairs.has(kind+':'+id+':'+ids[0]) ? 'owner-confirmed-review' : targets.includes(ids[0]) ? 'reviewed-map' : 'deterministic-source-id', catalogSource: current.source, disabled: Boolean(current.disabled) });
        continue;
      }
      const names = new Set(Object.values(entry.names).map(normalize).filter(Boolean));
      const subject = kind === 'soul' ? soulSubject(entry.names.en) : '';
      const candidates = [...effective.values()].filter(candidate => candidate.kind === kind && candidate.category === category &&
        (Object.values(candidate.names).some(name => names.has(normalize(name)) && normalize(name)) ||
          subject && soulSubject(candidate.names.en) === subject)).map(candidate => ({ id: candidate.id, source: candidate.source, disabled: Boolean(candidate.disabled) }));
      const missing = { ...entry, mappedTargets: targets, deterministicId: custom, sameNameCandidates: candidates };
      result.missing.push(missing);
      if (candidates.length) result.duplicateCandidates.push({ kind, serverId: id, projectIds: candidates.map(candidate => candidate.id), reason: 'same normalized RU/EN name or Soul subject and category; identity unverified' });
    }
  }
  for (const row of effective.values()) if (!known.has(row.id)) result.catalogOnly.push(row);
  result.counts = Object.fromEntries(['matched', 'missing', 'ambiguous', 'duplicateCandidates', 'excluded', 'catalogOnly'].map(key => [key, result[key].length]));
  return result;
}

async function readPublic(url) {
  const response = await fetch(url, { signal: AbortSignal.timeout(30000), cache: 'no-store' });
  if (!response.ok) throw new Error('Unable to fetch public source: ' + url + ' HTTP ' + response.status);
  const bytes = Buffer.from(await response.arrayBuffer());
  return { url, sha256: createHash('sha256').update(bytes).digest('hex'), data: JSON.parse(bytes.toString('utf8')) };
}

async function main() {
  const args = process.argv.slice(2);
  if (args.length !== 0 && !(args.length === 2 && args[0] === '--output' && args[1])) throw new Error('Usage: node scripts/audit_pandora_os_catalog_identity.mjs [--output FILE]');
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
  const urls = ['items.json', 'souls.json', 'strings.en.json'].map(name => 'https://pandorasaga-os.com/gamedata/' + name);
  urls.push('https://pandora-saga-simulator-remaked-admin-api.bonaqu.workers.dev/api/catalog');
  const [items, souls, english, catalog] = await Promise.all(urls.map(readPublic));
  const read = name => JSON.parse(fs.readFileSync(path.join(root, 'admin-api/data', name), 'utf8'));
  const result = auditIdentities({ items: items.data, souls: souls.data, english: english.data, catalog: catalog.data,
    mapping: read('pandora-os-live-map-20261007-v3.json'), olderItems: read('pandora-os-live-items-20261007.json'), olderSouls: read('pandora-os-live-souls-20261007.json'), identityReviews: reviews.reviews });
  result.checkedAt = new Date().toISOString();
  result.sources = [items, souls, english, catalog].map(({ url, sha256 }) => ({ url, sha256 }));
  result.note = 'GET-only; same-name candidates are not confirmed duplicates. No D1 drafts or editor history are visible to this public audit.';
  const report = JSON.stringify(result, null, 2) + '\n';
  if (args.length) { fs.writeFileSync(args[1], report, { flag: 'wx' }); console.log(JSON.stringify({ revision: result.revision, counts: result.counts, output: args[1] })); }
  else process.stdout.write(report);
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main().catch(error => { console.error(error.message); process.exitCode = 1; });
