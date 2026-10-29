import { showApprovedTranslations } from './catalog-model.mjs';

// Compare editable, validated catalog values rather than only the shortened
// player-facing record preview. In particular all RU/EN/JP/TW text fields and
// conditional numeric settings must participate.
const optionalEmptyLists = new Set(['profiles', 'upgradeBonuses', 'procEffects']);
function comparable(value, key = '') {
  if (Array.isArray(value)) return value.map(entry => comparable(entry));
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value)
      .filter(([name, entry]) => entry !== undefined && !(optionalEmptyLists.has(name) && Array.isArray(entry) && entry.length === 0))
      .map(([name, entry]) => [name, comparable(entry, name)]));
  }
  return value;
}

export function compareCatalogEdits(beforeEdit, afterEdit, source, kind) {
  if (!beforeEdit) {
    return { status: 'new', count: 1, changes: [{ path: '$new', before: null, after: afterEdit.names?.ru || afterEdit.names?.en || afterEdit.id }] };
  }
  const before = comparable(showApprovedTranslations(beforeEdit, source, kind));
  const after = comparable(showApprovedTranslations(afterEdit, source, kind));
  const changes = [];
  function visit(a, b, path) {
    if (Object.is(a, b)) return;
    if (Array.isArray(a) && Array.isArray(b)) {
      for (let index = 0; index < Math.max(a.length, b.length); index++)
        visit(a[index], b[index], path + '[' + index + ']');
      return;
    }
    if (a && b && typeof a === 'object' && typeof b === 'object' && !Array.isArray(a) && !Array.isArray(b)) {
      for (const key of new Set([...Object.keys(a), ...Object.keys(b)].sort()))
        visit(a[key], b[key], path ? path + '.' + key : key);
      return;
    }
    changes.push({ path, before: a === undefined ? null : a, after: b === undefined ? null : b });
  }
  visit(before, after, '');
  return { status: changes.length ? 'changed' : 'unchanged', count: changes.length, changes };
}
