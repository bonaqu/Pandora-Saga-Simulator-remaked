#!/usr/bin/env node
/**
 * Reference-only current Pandora Saga OS character base HP/MP calculator.
 * Port of the public 2026-10-11 BuildCalculator logic:
 *   F(p[VIT]*cls.hp.vit + level*cls.hp.lv + cls.hp.base)
 *   F(p[SPI]*cls.mp.spi + level*cls.mp.lv + cls.mp.base)
 * where F is ties-to-even rounding, NOT Math.round/Math.ceil.
 *
 * Data freshness must be checked separately (the offline fixture is dated).
 * Do NOT silently replace the archived Legacy engine or advertised Modern
 * numerical outputs with these partial, unbuffed reference values.
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {CLASS_ORDER} from './audit_pandora_os_class_coefficients.mjs';

export function roundHalfToEven(number) {
  if (!Number.isFinite(number)) throw new Error('Reference is not finite');
  const lower=Math.floor(number), fractional=number-lower;
  if (fractional<0.5)return lower;
  if (fractional>0.5)return lower+1;
  return lower%2===0?lower:lower+1;
}
export function currentClassBaseHpMp(cls,{level,vit,spi}) {
  if(!cls || !cls.hp || !cls.mp)throw new Error('Missing HP or MP class coefficients');
  for(const [name,value] of Object.entries({level,vit,spi})){
    if(!Number.isInteger(value) || value< (name==='level'?1:0))
      throw new Error('Invalid character '+name);
  }
  const h=cls.hp,m=cls.mp;
  for(const value of [h.base,h.lv,h.vit,m.base,m.lv,m.spi])
    if(!Number.isFinite(value))throw new Error('Class reference coefficient is not finite');
  return {
    hp:roundHalfToEven(vit*h.vit+level*h.lv+h.base),
    mp:roundHalfToEven(spi*m.spi+level*m.lv+m.base)
  };
}
/**
 * The current public calculator builds six effective abilities before
 * calculating class HP/MP. Its build-state input to this function is the
 * race/class baseline + allocated points, NOT unmodified player allocation.
 * API here is read-only, and no assumptions are made about which equip/guild
 * effects contribute to these modifier channels.
 */
export function projectEffectiveAbilities(basicAbilities,modifiers={}) {
  if(!Array.isArray(basicAbilities)||basicAbilities.length!==6||
     !basicAbilities.every(Number.isFinite))throw new Error('Expected six finite base abilities');
  const flat=modifiers.abiConst??[0,0,0,0,0,0];
  const percent=modifiers.abiScaleP??[0,0,0,0,0,0];
  if(!Array.isArray(flat)||flat.length!==6||!flat.every(Number.isFinite)||
     !Array.isArray(percent)||percent.length!==6||!percent.every(Number.isFinite))
    throw new Error('Invalid attribute modifiers');
  return basicAbilities.map((base,index)=>
    Math.max(1,base+flat[index]+Math.floor(base*percent[index]/100)));
}

export function currentVitalsWithModifiers(cls,{level,basicAbilities,modifiers={}}) {
  const effective=projectEffectiveAbilities(basicAbilities,modifiers);
  const base=currentClassBaseHpMp(cls,{level,vit:effective[0],spi:effective[4]});
  const maxLifeConst=modifiers.maxLifeConst??0,maxManaConst=modifiers.maxManaConst??0;
  if(!Number.isFinite(maxLifeConst)||!Number.isFinite(maxManaConst))
    throw new Error('Invalid flat HP/MP modifiers');
  return {effectiveAbilities:effective,
    hp:base.hp+maxLifeConst,mp:base.mp+maxManaConst};
}

export function generateReferenceVectors(classes,levels=[1,10,20,30,40,45],attributes=[
  {vit:5,spi:5},{vit:7,spi:4},{vit:35,spi:45},{vit:100,spi:100}
]) {
  if(Object.keys(classes).length!==28 ||
     CLASS_ORDER.some(name=>!classes[name]))throw new Error('Unexpected reference class identity set');
  return CLASS_ORDER.flatMap(name=>levels.flatMap(level=>attributes.map(({vit,spi})=>({
    cls:name,level,vit,spi,...currentClassBaseHpMp(classes[name],{level,vit,spi})
  }))));
}
async function main() {
 const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
 const fixture=JSON.parse(await fs.readFile(path.join(root,'tests/fixtures/pandora-os-classes-20261011.json'),'utf8'));
 const result={source:'Pandora Saga OS BuildCalculator-BiybySwQ.js, read 2026-10-11',
   captureDate:'2026-10-11',disclaimer:'Unbuffed class HP/MP only: no race base stats, allocated attributes, equipment, skill modifiers, inventory effects or Combat formulas. Not a full game-parity claim.',
   count:0,preview:null};
 const vectors=generateReferenceVectors(fixture); result.count=vectors.length;
 result.preview=vectors.filter(row=>['WARRIOR','GLADIATOR'].includes(row.cls)&&row.level===45&&row.vit===7&&row.spi===4);
 console.log(JSON.stringify(result,null,2));
}
if(process.argv[1] && path.resolve(process.argv[1])===fileURLToPath(import.meta.url))
 main().catch(error=>{console.error(error.message);process.exitCode=1;});
