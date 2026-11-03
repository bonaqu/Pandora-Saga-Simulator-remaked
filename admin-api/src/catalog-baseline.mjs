import equipment from '../../data/generated/equipment.v1.json' with { type: 'json' };
import souls from '../../data/generated/souls.v1.json' with { type: 'json' };
import terms from '../../localization/game-terms.ru.json' with { type: 'json' };
import character from '../../data/generated/character.v1.json' with { type: 'json' };
import skills from '../../data/generated/skills.v1.json' with { type: 'json' };
import approved from '../../localization/approved-translations.v1.json' with { type: 'json' };
import dawnVariants from '../../data/dawn-editable-variants.v1.json' with { type: 'json' };
import verifiedGear from '../../data/verified-racial-gear.v1.json' with { type: 'json' };

// These female Dawn variants used the same archived index as the male item.
// Register them as real source identities in the admin, so unpublished records
// are editable drafts and future catalog publications supersede the Modern
// read-only projection. Never modify the generated historical equipment file.
// Approved game-ID registry supplies the missing two-language descriptions.
 // Keep the generated Legacy equipment JSON immutable; enrich only the
 // derived source records persisted by the D1 inventory seed.
const verifiedByGameId = new Map(verifiedGear.entries.map(entry => [entry.gameId, entry]));
if (verifiedByGameId.size !== 72 || verifiedGear.entries.some(entry =>
    !entry.descriptionRu?.trim() || !entry.descriptionEn?.trim()))
  throw new Error('Incomplete RU/EN racial and Dawn equipment descriptions');
const originalBySlot = new Map(verifiedGear.entries.filter(entry =>
  !Number.isInteger(entry.newIndex)).map(entry =>
  [entry.category + '.' + entry.templateIndex, entry]));
const originalEquipmentRecords = equipment.records.map(record => {
  const entry = originalBySlot.get(record.legacy_category_id + '.' + record.legacy_item_index);
  return entry ? { ...record, option: {
    ...record.option, ru: entry.descriptionRu, en: entry.descriptionEn
  } } : record;
});
const sourceEquipment = new Map(originalEquipmentRecords.map(record =>
  [record.legacy_category_id + '.' + record.legacy_item_index, record]));
export const editableDawnRecords = dawnVariants.entries.map(entry => {
  const template = sourceEquipment.get(entry.category + '.' + entry.templateIndex);
  if (!template || !Array.isArray(template.compatibility_flags) || template.compatibility_flags.length !== 36 ||
      entry.sex !== 'female' || !Number.isInteger(entry.index) || entry.index <= 0 ||
      !Number.isInteger(entry.race) || entry.race < 0 || entry.race >= 6)
    throw new Error('Unsupported Dawn equipment source identity: ' + entry.gameId);
  const id = 'modern.equipment.dawn-os-' + entry.gameId;
  if (equipment.records.some(record => record.legacy_category_id === entry.category && record.legacy_item_index === entry.index))
    throw new Error('Dawn identity overlaps archived equipment: ' + id);
  const compatibility = [...template.compatibility_flags];
  compatibility[0] = 0; compatibility[1] = 1;
  for (let race = 0; race < 6; race++) compatibility[race + 2] = Number(race === entry.race);
  const localized = names => ({ en: names.en, ru: names.ru, jp: '', tw: '' });
  // Compact suffixes are part of the editable item name, not an additional
  // gender hint. Only the synthetic source defaults are normalized; manually
  // published text is never overwritten by this reference fixture.
  const displayNames = localized(entry.names);
  displayNames.ru = displayNames.ru.replace(/\s*\(Ж\)\s*$/i, ' (ж)');
  displayNames.en = displayNames.en.replace(/\s*\(Female\s+([^()]+)\)\s*$/i, ' ($1) (w)');
  return { ...template, id, kind: 'equipment',
    legacy_category_id: entry.category, legacy_item_index: entry.index,
    legacy_parameter_6: template.legacy_parameter_6,
    name: displayNames,
    option: localized(verifiedByGameId.get(entry.gameId)?.descriptionEn,
      verifiedByGameId.get(entry.gameId)?.descriptionRu),
    special_option: localized({en:'',ru:''}), acquisition: localized({en:'',ru:''}),
    level_requirement: entry.level, soul_socket_count: entry.sockets,
    compatibility_flags: compatibility };
});
// The archived normal outfits also merged five current female server items into
// their male slot. These separate female IDs use only source-verified equivalent
// numeric effects; the old JP/TW names and original IDs never get rewritten.
export const editableRacialRecords = verifiedGear.entries.filter(entry =>
  entry.set === 'racial' && Number.isInteger(entry.newIndex)).map(entry => {
  const template = sourceEquipment.get(entry.category + '.' + entry.templateIndex);
  if (!template || !Array.isArray(template.compatibility_flags) || template.compatibility_flags.length !== 36 ||
      entry.sex !== 'female' || entry.recordId !== 'modern.equipment.racial-os-' + entry.gameId ||
      !Number.isInteger(entry.race) || entry.race < 0 || entry.race > 5 ||
      equipment.records.some(record => record.legacy_category_id === entry.category && record.legacy_item_index === entry.index))
    throw new Error('Invalid racial equipment identity: ' + entry.gameId);
  const compatibility = [...template.compatibility_flags];
  compatibility[0] = 0; compatibility[1] = 1;
  for (let race = 0; race < 6; race++) compatibility[race + 2] = Number(race === entry.race);
  return { ...template, id: entry.recordId, kind: 'equipment',
    legacy_category_id: entry.category, legacy_item_index: entry.index,
    name: { en: entry.en, ru: entry.ru, jp: '', tw: '' },
    option: { en: entry.descriptionEn, ru: entry.descriptionRu, jp: '', tw: '' },
    special_option: { en: '', ru: '', jp: '', tw: '' },
    acquisition: { en: '', ru: '', jp: '', tw: '' },
    level_requirement: entry.level, soul_socket_count: entry.sockets,
    compatibility_flags: compatibility };
});
export const baselineRecords = [...originalEquipmentRecords, ...editableDawnRecords, ...editableRacialRecords, ...souls.records, ...character.records.filter(record => ['class', 'racial'].includes(record.kind)),
  ...skills.records.map(source => ({ ...source, id: source.id.replace('skill.', 'skill_entry.'), kind: source.is_active ? 'active' : 'passive' }))];
export const baselineById = new Map(baselineRecords.map(record => [record.id, record]));
export const categories = equipment.categories;
export const skillCategories = skills.categories.map(row => ({ id: row.id, index: row.legacy_id,
  name: { ...row.name, ru: approved.game.ru['skill.' + row.legacy_id] || row.name.en } }));
export const sourceFingerprint = equipment.metadata.generated_from[0].sha256;
export const characterSourceFingerprint = character.sourceFingerprint;
export const compatibilityLabels = Object.fromEntries(['race', 'job'].map(kind => [kind, terms.terms
  .filter(term => new RegExp('^' + kind + '\\.\\d+$').test(term.id))
  .map(term => ({ index: Number(term.id.split('.')[1]), label: term.source_en }))
  .sort((a, b) => a.index - b.index)]));
export function sourceIdentity(source) {
  if (source.kind === 'class') return { id: source.id, kind: 'class', category: null, index: source.index };
  if (source.kind === 'racial') return { id: source.id, kind: 'racial', category: source.category, index: source.index };
  if (source.kind === 'active' || source.kind === 'passive') return { id: source.id, kind: source.kind, category: source.legacy_category_id, index: source.legacy_entry_index };
  return source.id.startsWith('equipment.') || source.kind === 'equipment'
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
