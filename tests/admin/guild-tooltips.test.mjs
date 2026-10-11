import test from 'node:test';
import assert from 'node:assert/strict';
import approved from '../../localization/guild-skills.v1.json' with { type: 'json' };
import { localizationEntry } from '../../admin-api/src/localization.mjs';

test('all 44 approved guild skill descriptions are one-to-one editable translations', () => {
  const counts = [12, 5, 5, 2, 2, 2, 2, 5, 3, 3, 3];
  assert.equal(approved.schemaVersion, 1);
  assert.equal(approved.skills.length, 11);
  for (const [index, skill] of approved.skills.entries()) {
    assert.equal(skill.levels.length, counts[index]);
    for (const [offset, level] of skill.levels.entries()) {
      const id = 'calculator.clan.' + index + '.level.' + (offset + 1) + '.hint';
      const entry = localizationEntry('game', id);
      assert.ok(entry, id);
      assert.equal(entry.kind, 'calculator_hint');
      assert.equal(entry.baseline.ru, level.ru);
      assert.equal(entry.baseline.en, level.en);
      assert.equal(entry.baselineOrigin.ru, 'import');
      assert.equal(entry.baselineOrigin.en, 'import');
      assert.equal(entry.baselineOrigin.jp, 'fallback');
      assert.equal(entry.baselineOrigin.tw, 'fallback');
      assert.equal(localizationEntry('game', id.replace(/\.hint$/, '.other')), null);
    }
  }
  assert.equal(localizationEntry('game', 'calculator.clan.0.level.13.hint'), null);
  assert.match(localizationEntry('game', 'calculator.clan.0.level.12.hint').baseline.ru, /максимальные ОЗ \+12%/);
  assert.match(localizationEntry('game', 'calculator.clan.8.level.3.hint').baseline.ru, /жёлтый кристалл/);
});
