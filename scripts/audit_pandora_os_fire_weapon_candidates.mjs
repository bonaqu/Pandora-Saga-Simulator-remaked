#!/usr/bin/env node
// Review evidence, not an identity map or a write to the published catalog.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import equipment from '../data/generated/equipment.v1.json' with { type: 'json' };

export const CANDIDATES = Object.freeze([
  [252,'equipment.0.13'],[452,'equipment.1.9'],[652,'equipment.2.7'],[852,'equipment.3.8'],
  [1052,'equipment.10.11'],[1252,'equipment.11.7'],[1493,'equipment.5.9'],[1652,'equipment.4.7'],
  [1862,'equipment.6.12'],[2042,'equipment.7.9'],[2262,'equipment.8.12'],[2442,'equipment.9.5'],
  [2652,'equipment.12.12'],[2852,'equipment.13.9']
]);

export function inspectFireWeapon(candidate, legacy, baseline) {
  if (!candidate || !legacy || candidate.kind !== 'equipment' || candidate.category !== legacy.legacy_category_id) throw new Error('Invalid weapon candidate or category');
  const source = candidate.source;
  const w = Number(source?.W), token = '18=W' + w;
  const matching = baseline.filter(row => row.legacy_category_id === candidate.category &&
    row.level_requirement === source.level && row.soul_socket_count === source.sockets && String(row.calculation_code).split('_').includes(token));
  const match = matching.some(row => row.id === legacy.id);
  if (!match || !String(legacy.name?.jp || '').includes('炎')) throw new Error('Weapon evidence changed: ' + candidate.serverId);
  return { serverId: candidate.serverId, sourceNames: candidate.names, legacyId: legacy.id, legacyNames: legacy.name,
    category: candidate.category, sourceKind: source.itemKind, level: source.level, sockets: source.sockets,
    W: source.W, sourceStats: { penetration: source.PEN, range: source.range, attackSpeed: source.atkspeed },
    sourceEffects: source.effects, sourceForth: candidate.forth, sourceDescriptions: { ru: source.descriptionRu, en: source.descriptionEn },
    legacy: { calculationCode: legacy.calculation_code, compatibilityFlags: legacy.compatibility_flags, sourceOptions: legacy.option },
    competingMatches: matching.filter(row => row.id !== legacy.id).map(row => ({ id: row.id, names: row.name, calculationCode: row.calculation_code })),
    evidence: ['same category','same level','same sockets','same base W','historical Japanese name contains fire ideograph'],
    limitation: 'These clues do not prove numeric game-ID identity or equality of current effects.' };
}
function main() {
  if (process.argv.length !== 3) throw new Error('Usage: node scripts/audit_pandora_os_fire_weapon_candidates.mjs <candidate-report.json>');
  const source = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
  if (!Array.isArray(source.candidates) || !Array.isArray(source.sources)) throw new Error('Invalid candidate report');
  const rows = CANDIDATES.map(([serverId, id]) => inspectFireWeapon(source.candidates.find(row => row.serverId === serverId && row.kind === 'equipment'),
    equipment.records.find(row => row.id === id), equipment.records));
  process.stdout.write(JSON.stringify({ checkedAt: new Date().toISOString(), catalogRevision: source.catalogRevision,
    sourceHashes: source.sources, rows,
    note: 'Input source snapshots were captured separately; this script does not fetch, publish, or alter D1.' }, null, 2) + '\n');
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) try { main(); } catch(error) { console.error(error.message); process.exitCode = 1; }
