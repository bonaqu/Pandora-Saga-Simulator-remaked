import assert from 'node:assert/strict';
import {test} from 'node:test';
import {readFileSync} from 'node:fs';
import {
  SOURCE_URL,canonicalWeaponFixture,compareLiveWeaponRanges,readSource
} from '../../scripts/audit_pandora_os_live_weapon_ranges.mjs';

const reference=JSON.parse(readFileSync(new URL(
  '../fixtures/pandora-os-weapon-ranges-20261011.json',import.meta.url),'utf8'));
const dated=JSON.parse(readFileSync(new URL(
  '../../admin-api/data/pandora-os-live-items-20261007.json',import.meta.url),'utf8'));

test('independently dated 164-weapon base ranges agree, with zero expected drift',()=>{
  const report=compareLiveWeaponRanges(dated,reference);
  assert.equal(SOURCE_URL,reference.source);
  assert.equal(canonicalWeaponFixture(reference).length,164);
  assert.deepEqual(report.summary,{
    weaponCount:164,foundWeapons:164,missingWeapons:0,
    changedWeapons:0,rangeChanges:0,kindChanges:0,slotChanges:0,
    unknownRanges:0,maxAbsRangeDelta:0,baselineMatchesCurrent:true
  });
  assert.equal(report.baselineSha256,report.currentSha256);
  assert.equal(report.baselineDate,'2026-10-11');
  assert.equal(report.independentlyVerifiedEffectiveRange,false);
  assert.match(report.exclusions,/Riding/);
  assert.match(report.exclusions,/EquipOpt\[40\/41\]/);
  assert.equal(report.examples.length,0);
  assert.deepEqual(report,compareLiveWeaponRanges(dated,reference));
});

test('drift on one raw number, changed kind, absent ID, and unknown range is explicit, never zero',()=>{
  const current=structuredClone(dated);
  current['21'].range+=7;
  current['51'].kind='LANCE';
  delete current['22'];
  current['31'].range=null;
  const result=compareLiveWeaponRanges(current,reference,{maxExamples:3});
  assert.equal(result.summary.weaponCount,164);
  assert.equal(result.summary.foundWeapons,163);
  assert.equal(result.summary.missingWeapons,1);
  assert.equal(result.summary.changedWeapons,4);
  assert.equal(result.summary.rangeChanges,3);
  assert.equal(result.summary.kindChanges,2);
  assert.equal(result.summary.slotChanges,1);
  assert.equal(result.summary.unknownRanges,2);
  assert.equal(result.summary.maxAbsRangeDelta,7);
  assert.equal(result.summary.baselineMatchesCurrent,false);
  assert.equal(result.examples.length,3);
  assert.equal(result.examplesTruncated,true);
  const full=compareLiveWeaponRanges(current,reference,{maxExamples:164});
  const deleted=full.examples.find(row=>row.officialId===22);
  const unknown=full.examples.find(row=>row.officialId===31);
  assert.equal(deleted.current.range,null);
  assert.ok(deleted.changeType.includes('baseRange'));
  assert.equal(unknown.current.range,null);
  assert.equal(unknown.rangeDelta,null);
  assert.equal(full.examplesTruncated,false);
  assert.notEqual(full.baselineSha256,full.currentSha256);
  assert.deepEqual(compareLiveWeaponRanges(current,reference,{maxExamples:0}).examples,[]);
  assert.equal(compareLiveWeaponRanges(current,reference,{maxExamples:0}).examplesTruncated,true);
});

test('server text edits do not masquerade as numeric mechanics changes',()=>{
  const current=structuredClone(dated);
  current['21'].name='Localized source name changed';
  current['21'].desc='Source description changed';
  const report=compareLiveWeaponRanges(current,reference);
  assert.equal(report.summary.baselineMatchesCurrent,true);
});

test('invalid current fields and corrupt or duplicate reference identities fail closed',()=>{
  assert.throws(()=>compareLiveWeaponRanges(null,reference),/ID-keyed/);
  assert.throws(()=>compareLiveWeaponRanges([],reference),/ID-keyed/);
  const corrupt=structuredClone(dated);
  corrupt['21'].id=999;
  assert.throws(()=>compareLiveWeaponRanges(corrupt,reference),/identity mismatch/);
  const negative=structuredClone(dated);
  negative['21'].range=-1;
  assert.throws(()=>compareLiveWeaponRanges(negative,reference),/Invalid current raw/);
  assert.throws(()=>compareLiveWeaponRanges(dated,reference,{maxExamples:165}),/Invalid bounded/);
  assert.throws(()=>compareLiveWeaponRanges(dated,reference,{maxExamples:-1}),/Invalid bounded/);
  const duplicated=structuredClone(reference);
  duplicated.items[1].officialId=duplicated.items[0].officialId;
  assert.throws(()=>canonicalWeaponFixture(duplicated),/Duplicate or inconsistent/);
  const wrongModern=structuredClone(reference);
  const uuidIndex=wrongModern.items.findIndex(row=>row.id.startsWith('modern.equipment.'));
  assert.ok(uuidIndex>=0);
  wrongModern.items[uuidIndex].engineKey='Forged';
  assert.throws(()=>canonicalWeaponFixture(wrongModern),/Duplicate or inconsistent/);
  const short=structuredClone(reference);
  short.items.pop();
  assert.throws(()=>compareLiveWeaponRanges(dated,short),/exact dated 164/);
});

test('source mode distinguishes manually supplied dated data from live HTTP, never silently falls back',async()=>{
  const source=new URL('../../admin-api/data/pandora-os-live-items-20261007.json',import.meta.url);
  const offline=await readSource({source});
  assert.equal(offline.origin.live,false);
  assert.equal(offline.items['21'].range,110);
  await assert.rejects(readSource({fetchReference:async()=>({ok:false,status:503})}),
    /Live weapon source unavailable; no dated fallback used/);
  let requestedUrl;
  const remote=await readSource({fetchReference:async(url)=>{
    requestedUrl=url;
    return {ok:true,text:async()=>JSON.stringify(dated)};
  }});
  assert.equal(requestedUrl,SOURCE_URL);
  assert.equal(remote.origin.live,true);
  assert.equal(remote.items['51'].range,110);
  await assert.rejects(readSource({fetchReference:async()=>({
    ok:true,text:async()=>'{'
  })}),SyntaxError);
});
