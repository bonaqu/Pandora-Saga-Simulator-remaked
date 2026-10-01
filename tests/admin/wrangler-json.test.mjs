import test from 'node:test';
import assert from 'node:assert/strict';
import { parseWranglerJson } from '../../scripts/lib/wrangler-json.mjs';

test('Wrangler JSON reader handles query results and D1 file progress without evaluating log text', () => {
  const result = [{ success: true, results: [] }];
  assert.deepEqual(parseWranglerJson(JSON.stringify(result)), result);
  assert.deepEqual(parseWranglerJson('├ Checking remote database\n├ File uploaded\n' + JSON.stringify(result, null, 2)), result);
});

test('Wrangler JSON reader rejects empty, truncated and trailing-error output without exposing it', () => {
  for (const output of ['', 'secret-value invalid result', 'Progress\n[{"success": true}]\nError happened', 'Progress\n[{"success":']) {
    assert.throws(() => parseWranglerJson(output), { message: 'Wrangler did not return a valid JSON result' });
  }
});
