import { createHash } from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { withLegacyRuntime } from './lib/legacy-runtime.mjs';

const root = process.cwd();
const siteRoot = path.resolve(root, '_site');
const outputDir = path.resolve(root, 'data/generated');
const checkOnly = process.argv.includes('--check');

const outputs = {
  equipment: path.join(outputDir, 'equipment.v1.json'),
  souls: path.join(outputDir, 'souls.v1.json'),
  skills: path.join(outputDir, 'skills.v1.json')
};

async function sha256(relativePath) {
  const bytes = await fs.readFile(path.resolve(root, relativePath));
  return createHash('sha256').update(bytes).digest('hex');
}

async function metadata(remakedUi, sourcePaths) {
  const generatedFrom = [];
  for (const sourcePath of sourcePaths) {
    generatedFrom.push({ path: sourcePath, sha256: await sha256(sourcePath) });
  }
  return {
    schema_version: 1,
    projection_version: 'v1',
    legacy_engine: '2.00',
    remaked_ui: remakedUi,
    generated_from: generatedFrom,
    policy: 'read-only searchable projection; preserved Legacy JavaScript remains source of truth'
  };
}

async function readRemakedUiVersion() {
  const source = await fs.readFile(path.resolve(root, 'modern/version.js'), 'utf8');
  const match = source.match(/\bui\s*:\s*['"]([^'"]+)['"]/);
  if (!match) throw new Error('modern/version.js is missing the Remaked UI version');
  return match[1];
}

async function collectRuntimeData() {
  return withLegacyRuntime(siteRoot, (page) => page.evaluate(() => {
    const decode = (value) => {
      const textarea = document.createElement('textarea');
      textarea.innerHTML = String(value == null ? '' : value);
      return textarea.value.trim();
    };
    const localized = (records, fieldIndex) => ({
      jp: decode((records[0] || [])[fieldIndex]),
      en: decode((records[1] || [])[fieldIndex]),
      tw: decode((records[2] || [])[fieldIndex])
    });
    const numericSlice = (record, start, end) => {
      const values = [];
      for (let index = start; index < end; index += 1) values.push(record[index]);
      return values;
    };
    const languageRecords = (collection, first, second) => {
      const records = [];
      for (let language = 0; language < 3; language += 1) {
        const group = (collection[language] || [])[first] || [];
        records.push(second == null ? group : (group[second] || []));
      }
      return records;
    };

    const equipmentCategories = [];
    const equipmentRecords = [];
    const equipment = window.EquipData || [];
    const equipmentCategoryCount = (equipment[0] || []).length;
    for (let categoryId = 0; categoryId < equipmentCategoryCount; categoryId += 1) {
      const categoryRecords = languageRecords(equipment, categoryId, null);
      const headers = [];
      for (let language = 0; language < 3; language += 1) headers.push((categoryRecords[language][0] || []));
      const names = localized(headers, 0);
      names.jp = names.jp.replace(/^\+?-+\s*/, '');
      names.en = names.en.replace(/^\+?-+\s*/, '');
      names.tw = names.tw.replace(/^\+?-+\s*/, '');
      equipmentCategories.push({
        id: `equipment_category.${categoryId}`,
        legacy_id: categoryId,
        legacy_path: `EquipData[*][${categoryId}][0]`,
        name: names
      });

      const itemCount = (equipment[0][categoryId] || []).length;
      for (let itemIndex = 1; itemIndex < itemCount; itemIndex += 1) {
        const records = languageRecords(equipment, categoryId, itemIndex);
        const canonical = records[0];
        equipmentRecords.push({
          id: `equipment.${categoryId}.${itemIndex}`,
          legacy_id: categoryId * 10000 + itemIndex,
          legacy_category_id: categoryId,
          legacy_item_index: itemIndex,
          legacy_path: `EquipData[*][${categoryId}][${itemIndex}]`,
          name: localized(records, 0),
          option: localized(records, 1),
          special_option: localized(records, 2),
          acquisition: localized(records, 3),
          level_requirement: canonical[4],
          soul_socket_count: canonical[5],
          legacy_parameter_6: canonical[6],
          calculation_code: decode(canonical[7]),
          compatibility_flags: numericSlice(canonical, 8, 44),
          legacy_trailing_value: canonical[44]
        });
      }
    }

    const soulRecords = [];
    const souls = window.SoulData || [];
    const soulCount = Math.max(0, (souls[0] || []).length - 1);
    for (let soulId = 1; soulId <= soulCount; soulId += 1) {
      const records = languageRecords(souls, soulId, null);
      const canonical = records[0];
      soulRecords.push({
        id: `soul.${soulId}`,
        legacy_id: soulId,
        legacy_path: `SoulData[*][${soulId}]`,
        name: localized(records, 0),
        modifier: localized(records, 1),
        option: localized(records, 2),
        special_option: localized(records, 3),
        acquisition: localized(records, 4),
        legacy_parameters_5_6: numericSlice(canonical, 5, 7),
        calculation_code: decode(canonical[7]),
        compatibility_flags: numericSlice(canonical, 8, 16),
        legacy_trailing_value: canonical[16]
      });
    }

    const skillCategories = [];
    const skillRecords = [];
    const skills = window.Skill || [];
    const skillCategoryCount = (skills[0] || []).length;
    for (let categoryId = 0; categoryId < skillCategoryCount; categoryId += 1) {
      const category = (window.Name.Skill || [])[categoryId] || [];
      skillCategories.push({
        id: `skill_category.${categoryId}`,
        legacy_id: categoryId,
        legacy_path: `Name.Skill[${categoryId}]`,
        legacy_hotkey: decode(category[0]),
        name: { jp: decode(category[1]), en: decode(category[2]), tw: decode(category[3]) }
      });
      const entryCount = (skills[0][categoryId] || []).length;
      for (let entryIndex = 0; entryIndex < entryCount; entryIndex += 1) {
        const records = languageRecords(skills, categoryId, entryIndex);
        const canonical = records[0];
        skillRecords.push({
          id: `skill.${categoryId}.${entryIndex}`,
          legacy_category_id: categoryId,
          legacy_entry_index: entryIndex,
          legacy_path: `Skill[*][${categoryId}][${entryIndex}]`,
          name: localized(records, 0),
          prerequisites: localized(records, 1),
          equipment_requirements: localized(records, 2),
          description: localized(records, 3),
          is_active: Boolean(canonical[4]),
          mp_cost: canonical[5],
          cast_seconds: canonical[6],
          cooldown_seconds: canonical[7],
          duration_seconds: canonical[8],
          prerequisite_code: decode(canonical[9]),
          legacy_trailing_value: canonical[10]
        });
      }
    }

    return {
      equipment: { categories: equipmentCategories, records: equipmentRecords },
      souls: { records: soulRecords },
      skills: { categories: skillCategories, records: skillRecords }
    };
  }));
}

async function buildPayloads() {
  const remakedUi = await readRemakedUiVersion();
  const runtime = await collectRuntimeData();
  return {
    equipment: {
      kind: 'equipment',
      metadata: await metadata(remakedUi, ['js/item.js']),
      category_count: runtime.equipment.categories.length,
      count: runtime.equipment.records.length,
      categories: runtime.equipment.categories,
      records: runtime.equipment.records
    },
    souls: {
      kind: 'souls',
      metadata: await metadata(remakedUi, ['js/item.js']),
      count: runtime.souls.records.length,
      records: runtime.souls.records
    },
    skills: {
      kind: 'skills',
      metadata: await metadata(remakedUi, ['js/ini.js', 'js/skill.js']),
      category_count: runtime.skills.categories.length,
      count: runtime.skills.records.length,
      categories: runtime.skills.categories,
      records: runtime.skills.records
    }
  };
}

async function main() {
  const payloads = await buildPayloads();
  const rendered = {};
  for (const kind of Object.keys(outputs)) rendered[kind] = JSON.stringify(payloads[kind], null, 2) + '\n';

  if (checkOnly) {
    for (const kind of Object.keys(outputs)) {
      const existing = await fs.readFile(outputs[kind], 'utf8');
      if (existing !== rendered[kind]) {
        throw new Error(`Legacy ${kind} projection is stale; run npm run extract:data`);
      }
    }
    process.stdout.write(`Verified ${payloads.equipment.count} equipment, ${payloads.souls.count} Souls and ${payloads.skills.count} skills.\n`);
    return;
  }

  await fs.mkdir(outputDir, { recursive: true });
  for (const kind of Object.keys(outputs)) await fs.writeFile(outputs[kind], rendered[kind], 'utf8');
  process.stdout.write(`Exported ${payloads.equipment.count} equipment, ${payloads.souls.count} Souls and ${payloads.skills.count} skills.\n`);
}

main().catch((error) => {
  process.stderr.write(String(error && error.stack ? error.stack : error) + '\n');
  process.exitCode = 1;
});
