import { test, expect } from '@playwright/test';

test('live Dawn registry contains 40 source IDs with five distinct missing female variants', async ({ page }) => {
  await page.goto('/');
  const details = await page.evaluate(() => {
    const registry = window.PandoraRemakedDawnCollection;
    if (!registry) return null;
    const entries = registry.entries;
    return {
      length: entries.length,
      ids: entries.map(item => item.id),
      counts: [30, 31, 32, 33, 34].map(category => entries.filter(item => item.category === category).length),
      generated: entries.filter(item => item.newIndex !== undefined).map(item => item.id),
      published: entries.filter(item => item.publishedId).length,
      templateValid: entries.every(item => Array.isArray(window.EquipData[0][item.category][item.templateIndex])),
      labels: entries.every(item => item.ru && item.en && item.descriptionRu && item.descriptionEn)
    };
  });
  expect(details).not.toBeNull();
  expect(details.length).toBe(40);
  expect(new Set(details.ids).size).toBe(40);
  expect(details.counts).toEqual([8, 8, 8, 8, 8]);
  expect(details.generated.sort()).toEqual([12532, 14512, 14532, 15512, 15532]);
  expect(details.published).toBe(10);
  expect(details.templateValid).toBe(true);
  expect(details.labels).toBe(true);
});

test('Dawn expansion enforces race/sex and keeps archived calculations unchanged', async ({ page }) => {
  await page.goto('/');
  const result = await page.evaluate(() => {
    const dawn = window.PandoraRemakedDawnCollection;
    const published = dawn.entries.filter(item => item.publishedId);
    const originalFlags = Array(36).fill(1);
    const reference = { ok: true, schemaVersion: 1, revision: 94,
      records: published.map(entry => ({
        id: entry.publishedId, kind: 'equipment', category: entry.category,
        compatibility: originalFlags.slice()
      }))
    };
    const before = JSON.stringify(window.EquipData[0]);
    const augmented = dawn.augment(reference, window.EquipData);
    const repeated = dawn.augment(augmented, window.EquipData);
    const added = dawn.entries.filter(entry => entry.newIndex !== undefined).map(entry => {
      const rec = augmented.records.find(row => row.id === 'modern.equipment.dawn-os-' + entry.id);
      const template = window.EquipData[0][entry.category][entry.templateIndex];
      return { serverId: entry.id, category: rec?.category, index: rec?.index,
        gender: rec?.compatibility?.slice(0, 2), races: rec?.compatibility?.slice(2, 8),
        code: rec?.calculationCode, templateCode: template[7] };
    });
    const corrected = published.map(entry => {
      const rec = augmented.records.find(row => row.id === entry.publishedId);
      return { id: entry.id, gender: rec.compatibility.slice(0, 2),
        races: rec.compatibility.slice(2, 8), race: entry.race, sex: entry.sex };
    });
    const older = dawn.augment({ ...reference, revision: 90, records: reference.records.slice(0, 9) }, window.EquipData);
    return { added, corrected, originalIntact: JSON.stringify(window.EquipData[0]) === before,
      idempotent: JSON.stringify(repeated) === JSON.stringify(augmented),
      oldRecords: older.records.length };
  });
  expect(result.originalIntact).toBe(true);
  expect(result.idempotent).toBe(true);
  expect(result.oldRecords).toBe(9);
  expect(result.added).toHaveLength(5);
  for (const record of result.added) {
    expect(record.code).toBe(record.templateCode);
    expect(record.gender).toEqual([0, 1]);
    expect(record.races.reduce((a, b) => a + b, 0)).toBe(1);
    expect(record.category * 10000 + record.index).toBeGreaterThan(0);
  }
  for (const item of result.corrected) {
    const expectedGender = item.sex === 'male' ? [1, 0] : item.sex === 'female' ? [0, 1] : [1, 1];
    expect(item.gender).toEqual(expectedGender);
    expect(item.races).toEqual(Array.from({ length: 6 }, (_, index) => Number(index === item.race)));
  }
});

test('Dawn reserved IDs fail closed when the live catalog allocates the same equipment index', async ({ page }) => {
  await page.goto('/');
  const message = await page.evaluate(() => {
    const dawn = window.PandoraRemakedDawnCollection;
    const entries = dawn.entries.filter(entry => entry.publishedId);
    const colliding = dawn.entries.find(entry => entry.newIndex !== undefined);
    const records = entries.map(entry => ({
      id: entry.publishedId, kind: 'equipment', category: entry.category,
      compatibility: Array(36).fill(1)
    }));
    records.push({ id: 'modern.equipment.other',
      kind: 'equipment', category: colliding.category, index: colliding.newIndex });
    try { dawn.augment({ revision: 94, records }, window.EquipData); }
    catch (error) { return String(error.message || error); }
    return '';
  });
  expect(message).toMatch(/reserved Dawn equipment index/i);
});

test('D1-edited Dawn names and explicit races beat historical client placeholders', async ({ page }) => {
  await page.goto('/');
  const result = await page.evaluate(() => {
    const dawn = window.PandoraRemakedDawnCollection;
    const flagged = dawn.entries.filter(row => row.publishedId);
    const modified = flagged[0];
    const female = dawn.entries.find(row => row.newIndex === 180 && row.category === 31);
    const data = flagged.map(row => ({
      id: row.publishedId, kind: 'equipment', category: row.category,
      compatibility: Array(36).fill(1), names: { en: row.en, ru: row.ru }
    }));
    const edited = data.find(row => row.id === modified.publishedId);
    edited.names.ru = 'Название, которое изменил администратор';
    edited.compatibility.splice(2, 6, 0, 0, 0, 0, 0, 1);
    data.push({
      id: 'modern.equipment.dawn-os-' + female.id, kind: 'equipment',
      category: female.category, index: female.newIndex,
      compatibility: [0, 1, 0, 1, 0, 0, 0, 0, ...Array(28).fill(1)],
      names: { en: 'Owner-approved Dawn Vest (Elf) (w)', ru: 'Ручное название (ж)' },
      calculationCode: '1=777'
    });
    const augmented = dawn.augment({ revision: 95, records: data }, window.EquipData);
    return {
      count: augmented.records.length,
      sourceCount: data.length,
      edited: augmented.records.find(row => row.id === modified.publishedId),
      female: augmented.records.find(row => row.id === 'modern.equipment.dawn-os-' + female.id)
    };
  });
  expect(result.count).toBe(result.sourceCount + 4);
  expect(result.edited.names.ru).toBe('Название, которое изменил администратор');
  expect(result.edited.compatibility.slice(2, 8)).toEqual([0, 0, 0, 0, 0, 1]);
  expect(result.female.names.ru).toBe('Ручное название (ж)');
  expect(result.female.calculationCode).toBe('1=777');
});
