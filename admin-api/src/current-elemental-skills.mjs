// Reviewed current source identities, not another combat simulator or auto-seed.
// Reference: pandorasaga-os.com/gamedata/skills.json and strings.en.json.
import { baselineById } from './catalog-baseline.mjs';
import { draftFromSource } from './catalog-model.mjs';

const rows = [
  { sourceId: 410015001, id: 'skill_entry.18.9', points: 35,
    ru: 'Сопротивляемость льду', en: 'Resist Ice',
    descriptionRu: 'Сопротивляемость цели к магии льда повышается, а к магии огня и молний - понижается.',
    descriptionEn: "Increases your target's Ice Resistance, but reduces their Fire and Lightning Resistance." },
  { sourceId: 410025001, id: 'skill_entry.18.10', points: 41,
    ru: 'Сопротивляемость молниям', en: 'Resist Lightning',
    descriptionRu: 'Сопротивляемость цели к магии молний повышается, а к магии огня и льда - понижается.',
    descriptionEn: "Increases your target's Lightning Resistance, but decreases their Fire and Ice Resistance." }
];

export function currentElementalSkillDrafts() {
  return rows.map(row => {
    const source = baselineById.get(row.id);
    if (!source || source.kind !== 'active' || source.prerequisite_code !== 'S=18=33') throw new Error('Elemental source identity changed');
    const edit = draftFromSource(source, 'active');
    edit.names = { ...edit.names, ru: row.ru, en: row.en };
    edit.description = { ...edit.description, ru: row.descriptionRu, en: row.descriptionEn };
    // Current MP/cast/cooldown match the retained row. Duration is not inferred
    // from effect function arrays. Target resistance/combat is not simulated.
    edit.mpCost = 32; edit.castSeconds = 1.5; edit.cooldownSeconds = 3.5;
    edit.learningRequirements = { classIds: [], classScope: 'exact', minimumLevel: 1,
      branches: [{ branchId: 'skill_category.18', minimumPoints: row.points }] };
    return edit;
  });
}

export const currentElementalSkillIdentities = rows.map(({ id, sourceId, points }) => ({ id, sourceId, points }));
