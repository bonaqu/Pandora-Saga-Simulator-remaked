import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { withLegacyRuntime } from './lib/legacy-runtime.mjs';

const root = process.cwd();
const siteRoot = path.resolve(root, '_site');
const jsonPath = path.resolve(root, 'localization/game-terms.ru.json');
const checkOnly = process.argv.includes('--check');

async function collectTerms() {
  return withLegacyRuntime(siteRoot, (page) => page.evaluate(() => {
      const terms = [];
      const decode = (value) => {
        const textarea = document.createElement('textarea');
        textarea.innerHTML = String(value == null ? '' : value);
        return textarea.value.trim();
      };
      const add = (id, category, legacyPath, values) => {
        const sourceEn = decode(values.en);
        if (!sourceEn) return;
        terms.push({
          id,
          category,
          legacy_path: legacyPath,
          source_en: sourceEn,
          source_jp: decode(values.jp),
          source_tw: decode(values.tw),
          ru_proposed: '',
          ru_approved: ''
        });
      };

      window.Name.Race.forEach((entry, raceIndex) => {
        add(`race.${raceIndex}`, 'race', `Name.Race[${raceIndex}]`, { jp: entry[0], en: entry[1], tw: entry[2] });
      });
      const racialSkills = window.Name.Race.Skill || [];
      racialSkills.forEach((race, raceIndex) => {
        (race || []).forEach((entry, skillIndex) => {
          add(`racial_skill.${raceIndex}.${skillIndex}`, 'racial_skill', `Name.Race.Skill[${raceIndex}][${skillIndex}]`, { jp: entry[0], en: entry[1], tw: entry[2] });
        });
      });
      window.Name.Job.forEach((entry, jobIndex) => {
        add(`job.${jobIndex}`, 'job', `Name.Job[${jobIndex}]`, { jp: entry[2], en: entry[3], tw: entry[4] });
      });
      window.Name.Skill.forEach((entry, skillIndex) => {
        add(`skill.${skillIndex}`, 'skill', `Name.Skill[${skillIndex}]`, { jp: entry[1], en: entry[2], tw: entry[3] });
      });
      (window.Skill[1] || []).forEach((category, categoryIndex) => {
        (category || []).forEach((entry, entryIndex) => {
          add(`skill_entry.${categoryIndex}.${entryIndex}`, 'skill_entry', `Skill[*][${categoryIndex}][${entryIndex}][0]`, {
            jp: (((window.Skill[0] || [])[categoryIndex] || [])[entryIndex] || [])[0],
            en: entry[0],
            tw: (((window.Skill[2] || [])[categoryIndex] || [])[entryIndex] || [])[0]
          });
        });
      });

      const equipmentLanguages = window.EquipData;
      (equipmentLanguages[1] || []).forEach((category, categoryIndex) => {
        const jpCategory = equipmentLanguages[0][categoryIndex] || [];
        const twCategory = equipmentLanguages[2][categoryIndex] || [];
        const header = category[0] || [];
        const cleanHeader = (value) => decode(value).replace(/^\+?-+\s*/, '');
        add(`equipment_category.${categoryIndex}`, 'equipment_category', `EquipData[*][${categoryIndex}][0][0]`, {
          jp: cleanHeader((jpCategory[0] || [])[0]),
          en: cleanHeader(header[0]),
          tw: cleanHeader((twCategory[0] || [])[0])
        });
        category.slice(1).forEach((entry, offset) => {
          const itemIndex = offset + 1;
          add(`equipment.${categoryIndex}.${itemIndex}`, 'equipment', `EquipData[*][${categoryIndex}][${itemIndex}][0]`, {
            jp: (jpCategory[itemIndex] || [])[0],
            en: entry[0],
            tw: (twCategory[itemIndex] || [])[0]
          });
        });
      });

      const souls = window.SoulData;
      (souls[1] || []).slice(1).forEach((entry, offset) => {
        const soulIndex = offset + 1;
        add(`soul.${soulIndex}`, 'soul', `SoulData[*][${soulIndex}][0]`, {
          jp: (souls[0][soulIndex] || [])[0],
          en: entry[0],
          tw: (souls[2][soulIndex] || [])[0]
        });
      });
      return terms.sort((a, b) => a.id.localeCompare(b.id, 'en', { numeric: true }));
    }));
}

async function main() {
  await fs.access(path.join(siteRoot, 'index.html'));
  const terms = await collectTerms();
  const seen = new Set();
  for (const term of terms) {
    if (seen.has(term.id)) throw new Error(`Duplicate term id: ${term.id}`);
    seen.add(term.id);
  }
  const payload = {
    schema_version: 1,
    source: {
      legacy_engine: '2.00',
      generated_from: ['js/ini.js', 'js/item.js', 'js/skill.js'],
      policy: 'source rows only; approved Russian text lives in localization/translations.xlsx'
    },
    terms
  };
  const json = JSON.stringify(payload, null, 2) + '\n';

  if (checkOnly) {
    const existingJson = await fs.readFile(jsonPath, 'utf8');
    if (existingJson !== json) throw new Error('Legacy terminology export is stale; run npm run extract:terms');
    process.stdout.write(`Verified ${terms.length} deterministic Legacy terms.\n`);
    return;
  }

  await fs.writeFile(jsonPath, json, 'utf8');
  process.stdout.write(`Exported ${terms.length} Legacy terms.\n`);
}

main().catch((error) => {
  process.stderr.write(String(error && error.stack ? error.stack : error) + '\n');
  process.exitCode = 1;
});
