import equipment from '../../data/generated/equipment.v1.json' with { type: 'json' };
import souls from '../../data/generated/souls.v1.json' with { type: 'json' };
import terms from '../../localization/game-terms.ru.json' with { type: 'json' };
import character from '../../data/generated/character.v1.json' with { type: 'json' };

export const baselineRecords = [...equipment.records, ...souls.records, ...character.records.filter(record => ['class', 'racial'].includes(record.kind))];
export const baselineById = new Map(baselineRecords.map(record => [record.id, record]));
export const categories = equipment.categories;
export const sourceFingerprint = equipment.metadata.generated_from[0].sha256;
export const characterSourceFingerprint = character.sourceFingerprint;
export const compatibilityLabels = Object.fromEntries(['race', 'job'].map(kind => [kind, terms.terms
  .filter(term => new RegExp('^' + kind + '\\.\\d+$').test(term.id))
  .map(term => ({ index: Number(term.id.split('.')[1]), label: term.source_en }))
  .sort((a, b) => a.index - b.index)]));
export function sourceIdentity(source) {
  if (source.kind === 'class') return { id: source.id, kind: 'class', category: null, index: source.index };
  if (source.kind === 'racial') return { id: source.id, kind: 'racial', category: source.category, index: source.index };
  return source.id.startsWith('equipment.')
    ? { id: source.id, kind: 'equipment', category: source.legacy_category_id, index: source.legacy_item_index }
    : { id: source.id, kind: 'soul', category: null, index: source.legacy_id };
}
export function firstNewIndex(kind, category) {
  let index = 0;
  for (const source of baselineRecords) {
    const identity = sourceIdentity(source);
    if (identity.kind === kind && identity.category === category) index = Math.max(index, identity.index);
  }
  return index + 1;
}
