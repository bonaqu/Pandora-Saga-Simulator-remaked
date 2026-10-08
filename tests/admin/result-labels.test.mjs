import test from 'node:test';
import assert from 'node:assert/strict';
import baseline from '../../localization/calculator-results.ru.json' with { type: 'json' };
import { adminResultLabels, publicResultLabels } from '../../admin-api/src/result-labels.mjs';

function environment() {
  const rows = new Map();
  const DB = {
    prepare(sql) {
      let params = [];
      return {
        bind(...input) { params = input; return this; },
        async first() {
          if (sql.startsWith('SELECT ru, version')) return rows.get(params[0]) || null;
          throw new Error('Unexpected D1 read: ' + sql);
        },
        async all() {
          if (!sql.startsWith('SELECT id, ru, version, updated_at')) throw new Error('Unexpected D1 listing');
          return { results: [...rows].map(([id, value]) => ({ id, ...value })) };
        },
        async run() {
          if (sql.startsWith('DELETE FROM result_label_overrides')) {
            const row = rows.get(params[0]);
            if (!row || row.version !== params[1]) return { meta: { changes: 0 } };
            rows.delete(params[0]);
            return { meta: { changes: 1 } };
          }
          if (sql.startsWith('INSERT INTO result_label_overrides')) {
            const [id, ru, updated_at, expectedVersion] = params;
            const row = rows.get(id);
            if (row && row.version !== expectedVersion) return { meta: { changes: 0 } };
            rows.set(id, { ru, updated_at, version: (row?.version || 0) + 1 });
            return { meta: { changes: 1 } };
          }
          throw new Error('Unexpected D1 write: ' + sql);
        }
      };
    }
  };
  return { DB, rows };
}
function request(value) {
  return new Request('https://admin.example/api/admin/result-labels', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(value)
  });
}

test('admin uses 43 Excel base labels and public endpoint publishes overrides only', async () => {
  const env = environment();
  const admin = await (await adminResultLabels(new Request('https://admin.example/api/admin/result-labels'), env)).json();
  assert.equal(admin.items.length, 43);
  assert.deepEqual(admin.items.map(x => x.id), Array.from({ length: 43 }, (_, i) => 'calculator.status.' + i));
  assert.equal(admin.items[25].value, baseline.labels['calculator.status.25']);
  assert.equal(admin.items[25].version, 0);
  assert.equal(admin.items[25].overridden, false);
  const publicData = await (await publicResultLabels(env)).json();
  assert.deepEqual(publicData.overrides, {});
});

test('admin save, publish and revert never mutate Excel baseline or build impact', async () => {
  const env = environment(), id = 'calculator.status.25';
  const one = await adminResultLabels(request({ id, value: 'Дальность ближней атаки', expectedVersion: 0 }), env);
  assert.equal(one.status, 200);
  assert.equal((await one.json()).version, 1);
  const listed = await (await publicResultLabels(env)).json();
  assert.deepEqual(listed.overrides, { [id]: 'Дальность ближней атаки' });
  assert.equal(baseline.labels[id], 'Дальн. АТК ближ. боя');
  const two = await adminResultLabels(request({ id, value: ' Дальн. ближ. атаки ', expectedVersion: 1 }), env);
  assert.equal((await two.json()).version, 2);
  const revert = await adminResultLabels(request({ id, value: baseline.labels[id], expectedVersion: 2 }), env);
  assert.equal((await revert.json()).overridden, false);
  assert.deepEqual((await (await publicResultLabels(env)).json()).overrides, {});
});

test('stale versions and malformed labels fail closed', async () => {
  const env = environment(), id = 'calculator.status.13';
  await adminResultLabels(request({ id, value: 'Моя подпись', expectedVersion: 0 }), env);
  for (const edit of [
    { id, value: 'Чужая правка', expectedVersion: 0 },
    { id: 'calculator.status.43', value: 'Несуществующая', expectedVersion: 0 },
    { id, value: 'Некорректно\\n', expectedVersion: 1 },
    { id, value: 'x'.repeat(101), expectedVersion: 1 },
    { id, value: 'Другой текст', expectedVersion: -1 }
  ]) {
    let caught = null;
    try { await adminResultLabels(request(edit), env); } catch (error) { caught = error; }
    assert.ok(caught, 'Invalid or stale write must fail');
  }
  const current = await (await publicResultLabels(env)).json();
  assert.equal(current.overrides[id], 'Моя подпись');
});
