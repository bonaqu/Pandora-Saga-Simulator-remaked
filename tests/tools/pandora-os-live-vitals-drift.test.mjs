import assert from 'node:assert/strict';
import {test} from 'node:test';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {
  FIELDS,canonicalCoefficients,compareLiveVitals,readSource
} from '../../scripts/audit_pandora_os_live_vitals.mjs';
import {SOURCE_URL} from '../../scripts/audit_pandora_os_class_coefficients.mjs';

const fixturePath=new URL('../fixtures/pandora-os-classes-20261011.json',import.meta.url);
const baseline=JSON.parse(readFileSync(fixturePath,'utf8'));

test('dated 28-class source produces a deterministic zero-drift 672-vector report',()=>{
  const actual=compareLiveVitals(baseline,baseline);
  assert.deepEqual(actual.summary,{
    classCount:28,vectorCount:672,changedClasses:0,changedCoefficients:0,
    changedVectors:0,hpChanged:0,mpChanged:0,maxAbsHp:0,maxAbsMp:0,
    baselineMatchesCurrent:true
  });
  assert.equal(actual.reference.includes('unbuffed'),true);
  assert.equal(actual.independentlyVerifiedFullGameParity,false);
  assert.equal(actual.baselineDate,'2026-10-11');
  assert.equal(actual.baselineSha256,actual.currentSha256);
  assert.deepEqual(actual.coefficientDifferences,[]);
  assert.deepEqual(actual.vectorExamples,[]);
  assert.equal(actual.examplesTruncated,false);
  assert.deepEqual(actual,compareLiveVitals(baseline,baseline));
});

test('one modified class HP and MP base affects exactly its 24 reference inputs',()=>{
  const latest=structuredClone(baseline);
  latest.WARRIOR.hp.base+=10;
  latest.WARRIOR.mp.base+=1;
  const r=compareLiveVitals(latest,baseline);
  assert.equal(r.summary.changedClasses,1);
  assert.equal(r.summary.changedCoefficients,2);
  assert.equal(r.summary.changedVectors,24);
  assert.equal(r.summary.hpChanged,24);
  assert.equal(r.summary.mpChanged,24);
  assert.equal(r.summary.maxAbsHp,10);
  assert.equal(r.summary.maxAbsMp,1);
  assert.equal(r.summary.baselineMatchesCurrent,false);
  assert.equal(r.coefficientDifferences[0].cls,'WARRIOR');
  assert.equal(r.coefficientDifferences[0].field,'hp.base');
  assert.equal(r.vectorExamples.length,24);
  assert.equal(r.examplesTruncated,false);
  assert.ok(r.vectorExamples.every(row=>
    row.cls==='WARRIOR'&&row.delta.hp===10&&row.delta.mp===1));
  const truncated=compareLiveVitals(latest,baseline,{maxExamples:3});
  assert.equal(truncated.vectorExamples.length,3);
  assert.equal(truncated.examplesTruncated,true);
  assert.deepEqual(truncated.summary,r.summary);
  const none=compareLiveVitals(latest,baseline,{maxExamples:0});
  assert.equal(none.vectorExamples.length,0);
  assert.equal(none.examplesTruncated,true);
});

test('source schema rejects malformed, incomplete, extra, negative and nonfinite coefficients',()=>{
  assert.deepEqual(FIELDS,['hp.base','hp.lv','hp.vit','mp.base','mp.lv','mp.spi']);
  assert.equal(canonicalCoefficients(baseline).length,28);
  assert.throws(()=>compareLiveVitals(null,baseline),/exact 28/);
  assert.throws(()=>compareLiveVitals({...baseline,EXTRA:baseline.WARRIOR},baseline),/exact 28/);
  const partial=structuredClone(baseline);
  delete partial.WARRIOR;
  assert.throws(()=>compareLiveVitals(partial,baseline),/exact 28/);
  for(const bad of [-1,Infinity,NaN,'32',undefined]){
    const broken=structuredClone(baseline);
    broken.WARRIOR.hp.base=bad;
    assert.throws(()=>compareLiveVitals(broken,baseline),/coefficient/);
  }
  assert.throws(()=>compareLiveVitals(baseline,baseline,{maxExamples:673}),/bounded/);
  assert.throws(()=>compareLiveVitals(baseline,baseline,{maxExamples:-1}),/bounded/);
});

test('explicit local source is marked offline; live network failure never masquerades as fixture',async()=>{
  const offline=await readSource({source:fileURLToPath(fixturePath)});
  assert.equal(offline.origin.live,false);
  assert.deepEqual(compareLiveVitals(offline.classes,baseline).summary.baselineMatchesCurrent,true);
  const requests=[];
  const network=await readSource({fetchReference:async(url,options)=>{
    requests.push({url,options});
    return {ok:true,text:async()=>JSON.stringify(baseline)};
  }});
  assert.equal(network.origin.live,true);
  assert.equal(network.origin.url,SOURCE_URL);
  assert.equal(requests.length,1);
  assert.equal(requests[0].url,SOURCE_URL);
  assert.equal(requests[0].options.headers.accept,'application/json');
  await assert.rejects(
    ()=>readSource({fetchReference:async()=>({ok:false,status:503})}),
    /no fallback used: HTTP 503/
  );
  await assert.rejects(
    ()=>readSource({fetchReference:async()=>({ok:true,text:async()=>'<html>'})}),
    /Unexpected token/
  );
});
