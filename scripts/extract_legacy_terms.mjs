import fs from 'node:fs/promises';
import http from 'node:http';
import path from 'node:path';
import process from 'node:process';
import { chromium } from '@playwright/test';

const root = process.cwd();
const siteRoot = path.resolve(root, '_site');
const jsonPath = path.resolve(root, 'localization/game-terms.ru.json');
const csvPath = path.resolve(root, 'localization/game-terms.ru.csv');
const checkOnly = process.argv.includes('--check');

const contentTypes = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp'
};

async function staticServer() {
  const server = http.createServer(async (request, response) => {
    try {
      const requestUrl = new URL(request.url || '/', 'http://127.0.0.1');
      const relative = decodeURIComponent(requestUrl.pathname).replace(/^\/+/, '') || 'index.html';
      const target = path.resolve(siteRoot, relative);
      if (target !== siteRoot && !target.startsWith(siteRoot + path.sep)) {
        response.writeHead(403).end();
        return;
      }
      const stat = await fs.stat(target);
      const file = stat.isDirectory() ? path.join(target, 'index.html') : target;
      const body = await fs.readFile(file);
      response.writeHead(200, { 'content-type': contentTypes[path.extname(file)] || 'application/octet-stream' });
      response.end(body);
    } catch (error) {
      response.writeHead(404).end();
    }
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  return server;
}

async function readExistingApprovals() {
  try {
    const parsed = JSON.parse(await fs.readFile(jsonPath, 'utf8'));
    const approvals = new Map();
    for (const term of parsed.terms || []) {
      approvals.set(term.id, {
        source_en: term.source_en,
        ru_approved: typeof term.ru_approved === 'string' ? term.ru_approved : ''
      });
    }
    return approvals;
  } catch (error) {
    if (error && error.code === 'ENOENT') return new Map();
    throw error;
  }
}

function csvCell(value) {
  const text = String(value == null ? '' : value);
  return /[",\r\n]/.test(text) ? '"' + text.replace(/"/g, '""') + '"' : text;
}

function toCsv(terms) {
  const columns = ['id', 'category', 'legacy_path', 'source_en', 'source_jp', 'source_tw', 'ru_proposed', 'ru_approved'];
  const lines = [columns.join(',')];
  for (const term of terms) lines.push(columns.map((key) => csvCell(term[key])).join(','));
  return '\uFEFF' + lines.join('\r\n') + '\r\n';
}

async function collectTerms() {
  const server = await staticServer();
  const address = server.address();
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage();
    await page.goto(`http://127.0.0.1:${address.port}/`, { waitUntil: 'domcontentloaded' });
    return await page.evaluate(() => {
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
    });
  } finally {
    await browser.close();
    await new Promise((resolve) => server.close(resolve));
  }
}

async function main() {
  await fs.access(path.join(siteRoot, 'index.html'));
  const approvals = await readExistingApprovals();
  const terms = await collectTerms();
  const seen = new Set();
  for (const term of terms) {
    if (seen.has(term.id)) throw new Error(`Duplicate term id: ${term.id}`);
    seen.add(term.id);
    const previous = approvals.get(term.id);
    if (previous && previous.ru_approved) {
      if (previous.source_en !== term.source_en) {
        throw new Error(`Refusing to carry approved RU text across changed English source: ${term.id}`);
      }
      term.ru_approved = previous.ru_approved;
    }
  }
  const payload = {
    schema_version: 1,
    source: {
      legacy_engine: '2.00',
      generated_from: ['js/ini.js', 'js/item.js', 'js/skill.js'],
      policy: 'ru_approved remains empty until verified against the official Russian client'
    },
    terms
  };
  const json = JSON.stringify(payload, null, 2) + '\n';
  const csv = toCsv(terms);

  if (checkOnly) {
    const [existingJson, existingCsv] = await Promise.all([
      fs.readFile(jsonPath, 'utf8'),
      fs.readFile(csvPath, 'utf8')
    ]);
    if (existingJson !== json || existingCsv !== csv) {
      throw new Error('Legacy terminology exports are stale; run npm run extract:terms');
    }
    process.stdout.write(`Verified ${terms.length} deterministic Legacy terms.\n`);
    return;
  }

  await Promise.all([
    fs.writeFile(jsonPath, json, 'utf8'),
    fs.writeFile(csvPath, csv, 'utf8')
  ]);
  process.stdout.write(`Exported ${terms.length} Legacy terms.\n`);
}

main().catch((error) => {
  process.stderr.write(String(error && error.stack ? error.stack : error) + '\n');
  process.exitCode = 1;
});
