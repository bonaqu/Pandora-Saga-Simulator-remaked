import { compileRecord, draftFromSource, validateDraft } from '../../../admin-api/src/catalog-model.mjs';
import skills from '../../../data/generated/skills.v1.json' with { type: 'json' };
import character from '../../../data/generated/character.v1.json' with { type: 'json' };
import equipment from '../../../data/generated/equipment.v1.json' with { type: 'json' };

export function variant(sourceId, change = () => {}, number = 1) {
  const original = skills.records.find(row => row.id === sourceId);
  const source = { ...original, id: sourceId.replace('skill.', 'skill_entry.'), kind: original.is_active ? 'active' : 'passive' };
  const identity = { id: 'modern.' + source.kind + '.00000000-0000-4000-8000-' + String(number).padStart(12, '0'),
    kind: source.kind, category: source.legacy_category_id, index: source.legacy_entry_index, templateId: source.id };
  const edit = { ...draftFromSource(source, source.kind), id: identity.id, templateId: source.id };
  edit.names.en = 'New ' + source.name.en; change(edit);
  return compileRecord(validateDraft(edit, identity), identity, source);
}
export const snapshot = (records, revision = 1) => ({ ok: true, schemaVersion: 1, sourceFingerprint: equipment.metadata.generated_from[0].sha256,
  characterSourceFingerprint: character.sourceFingerprint, revision, records });
