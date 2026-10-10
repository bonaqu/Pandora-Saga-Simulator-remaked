import rules from '../../data/modern-astir-rules.json' with { type: 'json' };

// This data-driven policy is shared by Modern's deploy builder, browser
// previews and the D1 editor. It does not alter equipment calculations.
export const astirRules = rules;
export const astirIds = rules.outfitRootIds.map(engineId =>
  'equipment.' + Math.floor(engineId / 10000) + '.' + engineId % 10000);
export const astirLanguages = ['en', 'ru', 'jp', 'tw'];
const historicalPattern = new RegExp(rules.obsoleteNotePattern, 'i');
const normalize = text => String(text || '').replace(/\s+/g, ' ').trim();
export function astirEdit(entries, id, baselineById, draftFromSource) {
  const entry = entries.find(row => row.identity.id === id);
  const baseline = baselineById.get(id);
  if (!baseline || baseline.kind !== 'equipment') throw new Error('Missing Astir baseline: ' + id);
  return entry ? structuredClone(entry.edit) : draftFromSource(baseline, 'equipment');
}
export function planAstirCleanup(entries, baselineById, draftFromSource) {
  const fields = [], warnings = [], affected = new Set();
  for (let index = 0; index < astirIds.length; index++) {
    const id = astirIds[index], engineId = rules.outfitRootIds[index];
    const edit = astirEdit(entries, id, baselineById, draftFromSource);
    for (const locale of astirLanguages) {
      const before = String(edit.notes?.[locale] || '');
      if (!before.trim()) continue;
      const old = rules.historicalNotes[id]?.[locale] || '';
      if (old && normalize(before) === normalize(old)) {
        fields.push({ id, engineId, locale, before, after: '' });
        affected.add(id);
      } else if (historicalPattern.test(before)) {
        // A fuzzy match can be a legitimate editor-authored note. Fail closed.
        warnings.push({ id, engineId, locale, before,
          reason: 'Set-like wording differs from historical text; manual review required' });
      }
    }
  }
  return { fields, warnings, affectedIds: [...affected].sort() };
}
export function applyAstirFields(entries, fields, baselineById, sourceIdentity, draftFromSource) {
  const output = structuredClone(entries);
  for (const field of fields) {
    let entry = output.find(row => row.identity.id === field.id);
    if (!entry) {
      const source = baselineById.get(field.id);
      if (!source) throw new Error('Missing Astir source: ' + field.id);
      entry = { identity: sourceIdentity(source), edit: draftFromSource(source, 'equipment') };
      output.push(entry);
    }
    if (entry.edit.notes[field.locale] !== field.before)
      throw new Error('Astir note changed during maintenance: ' + field.id + '/' + field.locale);
    entry.edit.notes[field.locale] = field.after;
  }
  return output;
}
export function restorablesForCleanup(predecessor, publishedCleanup, current,
  baselineById, draftFromSource) {
  const plan = planAstirCleanup(predecessor, baselineById, draftFromSource);
  if (!plan.fields.length || plan.warnings.length) throw new Error('Unverifiable original Astir cleanup');
  return plan.fields.map(field => {
    const atCleanup = astirEdit(publishedCleanup, field.id, baselineById, draftFromSource).notes[field.locale];
    const atCurrent = astirEdit(current, field.id, baselineById, draftFromSource).notes[field.locale];
    if (atCleanup !== '' || atCurrent !== atCleanup)
      throw new Error('Astir note modified after cleanup: ' + field.id + '/' + field.locale);
    return { ...field, before: '', after: field.before };
  });
}
