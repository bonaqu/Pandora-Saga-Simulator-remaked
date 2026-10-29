// Offline planning only: no network, credentials, D1 writes or allocation.
// Callers must supply *proven* prior source values, not the current record as
// a fabricated baseline. Partial patches intentionally never delete fields.
import { createHash } from 'node:crypto';
import { isDeepStrictEqual } from 'node:util';
import { validateDraft, compileRecord } from '../../admin-api/src/catalog-model.mjs';
import { baselineById, sourceIdentity } from '../../admin-api/src/catalog-baseline.mjs';

const forbidden = new Set(['__proto__', 'prototype', 'constructor']);
const plain = value => value !== null && typeof value === 'object' && !Array.isArray(value) && Object.getPrototypeOf(value) === Object.prototype;
const has = (object, key) => Object.prototype.hasOwnProperty.call(object, key);
function canonical(value) {
  if (Array.isArray(value)) return value.map(canonical);
  if (!plain(value)) return value;
  return Object.fromEntries(Object.keys(value).sort().map(key => [key, canonical(value[key])]));
}
function digest(value) { return createHash('sha256').update(JSON.stringify(canonical(value))).digest('hex'); }
function fail(message) { throw new Error(message); }
function assertJson(value) {
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return;
  if (typeof value === 'number' && Number.isFinite(value)) return;
  if (Array.isArray(value)) { value.forEach(assertJson); return; }
  if (plain(value)) {
    for (const [key, child] of Object.entries(value)) {
      if (forbidden.has(key)) fail('Unsafe key in source patch');
      assertJson(child);
    }
    return;
  }
  fail('Source patch contains non-JSON data');
}
function checkIdentity(identity) {
  if (!plain(identity) || typeof identity.id !== 'string' || !identity.id || typeof identity.kind !== 'string' ||
      !Number.isInteger(identity.index) || !has(identity, 'category')) fail('Invalid project identity');
  const source = baselineById.get(identity.id);
  if (source && !isDeepStrictEqual(identity, sourceIdentity(source))) fail('Existing source identity must not change');
  return source || (identity.templateId ? baselineById.get(identity.templateId) : null);
}
function comparePatch(base, current, incoming) {
  const edit = structuredClone(current), changes = [], conflicts = [];
  function visit(old, now, next, target, path) {
    for (const key of Object.keys(next).sort()) {
      if (forbidden.has(key)) fail('Unsafe key in source patch');
      const where = path ? path + '.' + key : key;
      if (!path && ['id', 'kind', 'category', 'templateId'].includes(key)) {
        conflicts.push({ path: where, reason: 'identity-field' }); continue;
      }
      if (!has(old, key)) { conflicts.push({ path: where, reason: 'unknown-provenance' }); continue; }
      if (plain(next[key]) && plain(old[key]) && plain(now?.[key])) {
        visit(old[key], now[key], next[key], target[key], where); continue;
      }
      if (isDeepStrictEqual(old[key], next[key]) || isDeepStrictEqual(now?.[key], next[key])) continue;
      if (!has(now || {}, key) || !isDeepStrictEqual(now[key], old[key])) {
        conflicts.push({ path: where, reason: 'manual-change' }); continue;
      }
      target[key] = structuredClone(next[key]); changes.push({ path: where, before: now[key], after: next[key] });
    }
  }
  visit(base, current, incoming, edit, '');
  return { edit, changes, conflicts };
}

/** Pure preview; identityVerified is a caller-supplied evidence flag, not proof.
 * base/incoming contain only fields verified from the old/new server snapshots.
 * current is a full private catalog edit; never publish plan output directly. */
export function planCatalogMerge({ revision, sourceHashes, candidates }) {
  if (!Number.isSafeInteger(revision) || revision < 0 || !plain(sourceHashes) || !Object.keys(sourceHashes).length ||
      !Object.values(sourceHashes).every(hash => typeof hash === 'string' && /^[a-f0-9]{64}$/.test(hash)) || !Array.isArray(candidates))
    fail('Expected catalog revision, source hashes and candidates');
  const ids = new Set(), serverIds = new Set(), encodedIds = new Set();
  const records = candidates.map(candidate => {
    if (!plain(candidate) || !plain(candidate.identity) || !Number.isSafeInteger(candidate.serverId) || candidate.serverId <= 0 ||
        typeof candidate.identityVerified !== 'boolean' || typeof candidate.dirtyDraft !== 'boolean') fail('Invalid candidate metadata');
    const source = checkIdentity(candidate.identity), id = candidate.identity.id, serverKey = candidate.identity.kind + ':' + candidate.serverId;
    if (ids.has(id) || serverIds.has(serverKey)) fail('Duplicate project or server identity in plan');
    ids.add(id); serverIds.add(serverKey);
    if (['equipment', 'soul'].includes(candidate.identity.kind)) {
      const encoded = candidate.identity.kind + ':' + candidate.identity.category + ':' + candidate.identity.index;
      if (encodedIds.has(encoded)) fail('Duplicate encoded item identity in plan');
      encodedIds.add(encoded);
    }
    const result = { id, kind: candidate.identity.kind, serverId: candidate.serverId, identity: structuredClone(candidate.identity) };
    if (!candidate.identityVerified) return { ...result, status: 'identity-unverified' };
    if (candidate.dirtyDraft) return { ...result, status: 'dirty-draft' };
    if (candidate.current === null) {
      // Allocation is a separate concurrent transaction: even an apparently
      // free index in an offline snapshot is not a valid allocation receipt.
      assertJson(candidate.incoming);
      return { ...result, status: 'needs-allocation', candidate: structuredClone(candidate.incoming) };
    }
    if (!plain(candidate.current) || !plain(candidate.incoming) || !plain(candidate.base)) fail('Expected current edit and source patches');
    assertJson(candidate.current); assertJson(candidate.base); assertJson(candidate.incoming);
    const current = validateDraft(candidate.current, candidate.identity);
    // Never silently normalize an existing historical/manual value as a side
    // effect of a different import. It needs a separate reviewed decision.
    if (!isDeepStrictEqual(current, candidate.current)) return { ...result, status: 'current-normalization-review', expectedCurrentHash: digest(candidate.current) };
    compileRecord(current, candidate.identity, source);
    const compared = comparePatch(candidate.base, current, candidate.incoming);
    const expectedCurrentHash = digest(current);
    if (compared.conflicts.length) return { ...result, status: 'conflict', expectedCurrentHash, conflicts: compared.conflicts, proposedChanges: compared.changes };
    if (!compared.changes.length) return { ...result, status: 'unchanged', expectedCurrentHash };
    try {
      const edit = validateDraft(compared.edit, candidate.identity);
      compileRecord(edit, candidate.identity, source);
      return { ...result, status: 'change', expectedCurrentHash, changes: compared.changes, edit };
    } catch (error) {
      return { ...result, status: 'invalid-merge', expectedCurrentHash, reason: error.message, proposedChanges: compared.changes };
    }
  });
  return { revision, sourceHashes: structuredClone(sourceHashes), records };
}
