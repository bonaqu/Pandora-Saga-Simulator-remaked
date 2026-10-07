import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const forth = JSON.parse(fs.readFileSync(new URL('../../admin-api/data/pandora-os-live-item-forth-20261007.json', import.meta.url)));
const unison = JSON.parse(fs.readFileSync(new URL('../../admin-api/data/pandora-os-live-unison-20261007.json', import.meta.url)));
const souls = JSON.parse(fs.readFileSync(new URL('../../admin-api/data/pandora-os-live-souls-20261007.json', import.meta.url)));
const runtime = fs.readFileSync(new URL('../../modern/enhancement-effects.js', import.meta.url), 'utf8');

function jsonVar(name) {
  const marker = 'var ' + name + ' = ';
  const start = runtime.indexOf(marker);
  assert.notEqual(start, -1, 'Missing runtime constant ' + name);
  const from = start + marker.length;
  const end = runtime.indexOf(';\n', from);
  assert.notEqual(end, -1, 'Unterminated runtime constant ' + name);
  return JSON.parse(runtime.slice(from, end));
}

const effectMap = jsonVar('EFFECT_MAP');
const runtimeForth = jsonVar('ITEM_FORTH');
const runtimeUnison = jsonVar('UNISON');
const nativeIds = jsonVar('NATIVE_SERVER_IDS');

test('every live itemForth item is covered exactly once by native Legacy or Modern server runtime', () => {
  const sourceIds = Object.keys(forth).map(Number).sort((a, b) => a - b);
  const injectedIds = Object.values(runtimeForth).map(row => Number(row.serverId)).sort((a, b) => a - b);
  const native = nativeIds.map(Number).sort((a, b) => a - b);
  assert.equal(sourceIds.length, 148);
  assert.equal(injectedIds.length, 118);
  assert.equal(native.length, 30);
  assert.deepEqual([...new Set([...injectedIds, ...native])].sort((a, b) => a - b), sourceIds);
  assert.equal(new Set(injectedIds.filter(id => native.includes(id))).size, 0);

  for (const row of Object.values(runtimeForth)) {
    assert.deepEqual(row.levels, forth[String(row.serverId)], 'Enhancement table drift for server item ' + row.serverId);
  }
});

test('all 1,136 live enhancement effects have a verified calculator mapping', () => {
  let count = 0;
  const unsupported = new Set();
  for (const levels of Object.values(forth)) {
    for (const effects of Object.values(levels || {})) {
      for (const effect of effects || []) {
        count++;
        if (!Object.hasOwn(effectMap, effect.func)) unsupported.add(effect.func);
      }
    }
  }
  assert.equal(count, 1136);
  assert.deepEqual([...unsupported], []);
});

test('military crossbow enhancement thresholds are pinned exactly to the live server table', () => {
  const byServer = new Map(Object.values(runtimeForth).map(row => [row.serverId, row]));
  for (const id of [2422, 2423, 2424]) assert.ok(byServer.has(id), 'Missing server crossbow ' + id);
  const robust = byServer.get(2422).levels;
  assert.deepEqual(robust['2'], [{ func: 'EP_ATTACKINTERVAL_SCALE', a: 2, b: 0 }]);
  assert.deepEqual(robust['4'], [{ func: 'EP_ATTACKINTERVAL_SCALE', a: 4, b: 0 }]);
  assert.deepEqual(robust['6'], [{ func: 'EP_ATTACKINTERVAL_SCALE', a: 6, b: 0 }]);
  assert.deepEqual(robust['7'], [
    { func: 'EP_AGILITY_CONST', a: 1, b: 0 },
    { func: 'EP_ATTACKINTERVAL_SCALE', a: 6, b: 0 }
  ]);
  assert.equal(byServer.get(2424).levels['7'][0].a, 2);
});

test('all current live unison tables are represented by the runtime', () => {
  assert.equal(Object.keys(unison).length, 3);
  assert.equal(Object.keys(runtimeUnison).length, 3);
  const runtimeRoots = new Set(Object.values(runtimeUnison).map(row => Number(row.serverId)));
  assert.deepEqual([...runtimeRoots].sort((a, b) => a - b), Object.keys(unison).map(Number).sort((a, b) => a - b));
  for (const row of Object.values(runtimeUnison)) {
    const source = unison[String(row.serverId)];
    assert.equal(row.members.length, source.members.length);
    assert.deepEqual(row.rows, source.rows);
  }
});

test('the only enhancement-ranged live Souls remain covered by retained native logic', () => {
  const ranged = [];
  for (const soul of Object.values(souls)) {
    const effects = (soul.effects || []).filter(effect => Number(effect.min || 0) > 0 || (effect.max != null && Number(effect.max) < 10));
    if (effects.length) ranged.push({ id: Number(soul.id), effects });
  }
  assert.deepEqual(ranged.map(row => row.id).sort((a, b) => a - b), [102025, 103001]);
  assert.match(runtime, /nativeServerIds/);
  assert.doesNotMatch(runtime, /SOUL_CONDITIONAL/);
});

test('known safe base stats omitted by the old flat sync are explicitly supplemented', () => {
  assert.match(runtime, /"300111":\[\{"stat":62,"value":10,"percent":true\}\]/);
  assert.match(runtime, /"350050":\[\{"stat":82,"value":5,"percent":false\},\{"stat":75,"value":15,"percent":false\}\]/);
  assert.match(runtime, /"400061":\[\{"stat":33,"value":2,"percent":false\}\]/);
  for (const soul of ['191','192','193','194','195','196']) {
    assert.match(runtime, new RegExp('"' + soul + '":\\[\\{"stat":'));
  }
});
