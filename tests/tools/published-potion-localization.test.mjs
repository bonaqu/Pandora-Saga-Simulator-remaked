import {test} from 'node:test';
import assert from 'node:assert/strict';
import {
  inspectPotionLocalization, POTION_KEYS, PUBLIC_LOCALIZATION_URL
} from '../../scripts/audit_published_potion_localization.mjs';

const approved = {game:{ru:Object.fromEntries(
  POTION_KEYS.map((key, index) => [key, 'Approved ' + index])
)}};
const payload = overrides => ({
  ok:true,schemaVersion:1,overrides:{
    game:{ru:overrides,en:{'calculator.potion.11':'Rest POT'}},
    ui:{ru:{},en:{},jp:{},tw:{}}
  }
});

test('all 14 labels and 14 hints have explicit expected identities', () => {
  assert.equal(POTION_KEYS.length,28);
  assert.equal(new Set(POTION_KEYS).size,28);
  assert.match(PUBLIC_LOCALIZATION_URL,/^https:\/\/.*\/api\/localization$/);
  for(let index=0;index<14;index++){
    assert.ok(POTION_KEYS.includes('calculator.potion.'+index));
    assert.ok(POTION_KEYS.includes('calculator.potion.'+index+'.hint'));
  }
  const result=inspectPotionLocalization(payload({...approved.game.ru}),approved);
  assert.deepEqual(result.summary,{
    total:28,visible:28,matchesApproved:28,differsApproved:0,absent:0
  });
  assert.equal(result.isCompletePublicCoverage,true);
});

test('public effective text reflects differences, but cannot reveal resets or drafts', () => {
  const values={...approved.game.ru};
  values['calculator.potion.11']='Published owner choice';
  // A reset tombstone is already projected to its baseline by publicLocalization().
  values['calculator.potion.12']=approved.game.ru['calculator.potion.12'];
  delete values['calculator.potion.13'];
  const result=inspectPotionLocalization(payload(values),approved);
  assert.deepEqual(result.summary,{
    total:28,visible:27,matchesApproved:26,differsApproved:1,absent:1
  });
  assert.equal(result.isCompletePublicPublication,false);
  const byKey=Object.fromEntries(result.rows.map(row=>[row.key,row]));
  assert.equal(byKey['calculator.potion.11'].status,'differs-approved');
  assert.equal(byKey['calculator.potion.12'].status,'matches-approved');
  assert.equal(byKey['calculator.potion.13'].status,'absent');
  assert.ok(result.rows.every(row=>row.fallbackAvailable));
  assert.ok(!JSON.stringify(result).includes('Published owner choice'),
    'audit logs must never leak owner text contents');
});

test('fail closed on malformed API response and absent approved defaults', () => {
  assert.throws(()=>inspectPotionLocalization(null,approved),/public D1/);
  assert.throws(()=>inspectPotionLocalization({ok:false},approved),/public D1/);
  assert.throws(()=>inspectPotionLocalization(payload({}),null),/fallback/);
  const invalid={...approved.game.ru,'calculator.potion.11':null};
  assert.throws(()=>inspectPotionLocalization(payload(invalid),approved),/Invalid public/);
  assert.throws(()=>inspectPotionLocalization(payload({...approved.game.ru,'calculator.potion.11':''}),approved),/Unexpected empty/);
  const missing={game:{ru:{...approved.game.ru}}};
  delete missing.game.ru['calculator.potion.6'];
  assert.throws(()=>inspectPotionLocalization(payload({}),missing),/Missing approved/);
});
