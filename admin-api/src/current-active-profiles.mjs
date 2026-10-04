// Offline reviewed reference data, not an automatic seed or publication route.
import reference from '../../data/current-active-profiles.v1.json' with { type: 'json' };
import { baselineById } from './catalog-baseline.mjs';
import { draftFromSource } from './catalog-model.mjs';

export function currentActiveProfileDrafts() {
  return reference.records.map(record => {
    const source = baselineById.get(record.id);
    if (!source || source.kind !== 'active' || source.name.en !== record.nativeName ||
        source.prerequisite_code !== record.prerequisiteCode)
      throw new Error('Reviewed active skill identity changed: ' + record.id);
    const edit = draftFromSource(source, 'active');
    function fields(row) {
      return {
        names: { ...edit.names, ...row.names },
        description: { ...edit.description, ...row.description },
        learningRequirements: structuredClone(row.learningRequirements),
        mpCost: row.timing[0], castSeconds: row.timing[1], cooldownSeconds: row.timing[2],
        // Do not translate opaque fv arrays into a duration or combat formula.
        durationSeconds: source.duration_seconds
      };
    }
    const base = record.rows.find(row => row.sourceId === record.baseSourceId);
    if (!base) throw new Error('Missing reviewed fallback: ' + record.id);
    Object.assign(edit, fields(base));
    edit.profiles = record.rows.filter(row => row.sourceId !== record.baseSourceId)
      .map(row => ({ id: 'source-' + row.sourceId, ...fields(row) }));
    return edit;
  });
}

export const currentActiveProfileReference = structuredClone(reference);
