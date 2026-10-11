import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';
import { CLASS_ORDER, parseLegacyModifiers, compareCoefficients, summarize } from '../../scripts/audit_pandora_os_class_coefficients.mjs';

test('all canonical class identities are unique and ordered', () => {
  assert.equal(CLASS_ORDER.length, 28);
  assert.equal(new Set(CLASS_ORDER).size, 28);
  assert.equal(CLASS_ORDER[0], 'WARRIOR');
  assert.equal(CLASS_ORDER[1], 'GLADIATOR');
  assert.equal(CLASS_ORDER[27], 'CALAMITY');
});

test('comparison detects base and growth drift without claiming game parity', () => {
  const source = [
    "Status['Mod'][0] = new Array(98,16,5.847,44.55,15.5,48.3);",
    "Status['Mod'][1] = new Array(148,28,3.188,36.7,8.465,39.5);"
  ].join('\n');
  const classes = {
    WARRIOR: { hp: { base: 100, lv: 17.1, vit: 6.45 },
      mp: { base: 30, lv: 2.24, spi: 2.08 } },
    GLADIATOR: { hp: { base: 150, lv: 31.35, vit: 11.82 },
      mp: { base: 30, lv: 2.73, spi: 2.53 } }
  };
  const legacy = parseLegacyModifiers(source);
  const results = compareCoefficients(classes, legacy, ['WARRIOR', 'GLADIATOR']);
  assert.equal(results.length, 2);
  assert.equal(summarize(results).classesWithBaseCoefficientDifference, 2);
  assert.ok(results[0].comparison.find(value => value.field === 'hp.base').delta === 2);
  assert.ok(results[1].comparison.find(value => value.field === 'mp.base').delta === 2);
  assert.ok(results[0].comparison.find(value => value.field === 'hp.lv').retained > 17.1);
});

test('same raw coefficients report no drift; rejects incomplete mappings', () => {
  const legacy = parseLegacyModifiers("Status['Mod'][0] = new Array(100,30,5,10,20,40);");
  const classes = { WARRIOR: { hp: { base: 100, lv: 20, vit: 5 },
    mp: { base: 30, lv: 10, spi: 2.5 } } };
  const exact = compareCoefficients(classes, legacy, ['WARRIOR']);
  assert.equal(exact[0].changed, false);
  assert.equal(summarize(exact).classesWithAnyCoefficientDifference, 0);
  assert.throws(() => compareCoefficients({}, legacy, ['WARRIOR']), /server class count/);
  assert.throws(() => parseLegacyModifiers("Status['Mod'][0] = new Array(1,2,3);"), /Malformed/);
  assert.throws(() => parseLegacyModifiers(
    "Status['Mod'][0] = new Array(1,2,3,4,5,6);\nStatus['Mod'][0] = new Array(1,2,3,4,5,6);"
  ), /Duplicate/);
});


test('dated 28-class server coefficient snapshot replays against preserved Legacy', () => {
  const classes = JSON.parse(readFileSync(new URL('../fixtures/pandora-os-classes-20261011.json', import.meta.url), 'utf8'));
  const ini = readFileSync(new URL('../../js/ini.js', import.meta.url), 'utf8');
  const retained = parseLegacyModifiers(ini);
  const rows = compareCoefficients(classes, retained);
  assert.equal(rows.length, CLASS_ORDER.length);
  assert.equal(rows[0].name, 'WARRIOR');
  assert.equal(rows[1].name, 'GLADIATOR');
  assert.equal(summarize(rows).classesWithBaseCoefficientDifference, 28);
  assert.equal(rows[0].comparison.find(x => x.field === 'mp.base').server, 30);
  assert.equal(rows[16].comparison.find(x => x.field === 'mp.base').server, 255);
});
