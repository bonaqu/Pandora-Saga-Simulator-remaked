import {test,expect} from '@playwright/test';
import fixture from '../fixtures/pandora-os-fire-series-20261029.json' with {type:'json'};
import equipment from '../../data/generated/equipment.v1.json' with {type:'json'};
import character from '../../data/generated/character.v1.json' with {type:'json'};
import {convertedCurrentEffects} from '../../scripts/lib/current-effect-conversion.mjs';

test('all 14 reviewed fire weapons apply source bonuses and fire-only refinement without stacking',async({page})=>{
  const production=process.env.PANDORA_FIRE_PRODUCTION==='1';
  const snapshot={ok:true,schemaVersion:1,sourceFingerprint:equipment.metadata.generated_from[0].sha256,
    characterSourceFingerprint:character.sourceFingerprint,revision:94,impactRevision:94,records:fixture.records};
  const expected=fixture.sources.map(source=>{
    const converted=convertedCurrentEffects({effects:source.source.effects},false);
    expect(converted.complete,source.id).toBe(true);
    return {id:source.id,serverId:source.serverId,effects:converted.effects};
  });
  await page.goto(production?'https://bonaqu.github.io/Pandora-Saga-Simulator-remaked/':'/',{waitUntil:production?'networkidle':'load'});
  const observed=await page.evaluate(({snapshot,expected,production})=>{
    if(!production)PandoraRemaked.catalog.applySnapshot(snapshot);
    if(PandoraRemaked.catalog.getRevision()!==94)throw Error('Unexpected catalog revision');
    function sum(stat,unit){return (EquipOpt[stat]||[]).reduce((n,value)=>{
      const s=String(value),percent=s.endsWith('%'),raw=percent?s.slice(0,-1):s;
      return percent===(unit==='percent')&&/^-?\d+(?:\.\d+)?$/.test(raw)?n+Number(raw):n;
    },0);}
    function read(keys){return Object.fromEntries(keys.map(key=>{const [stat,unit]=key.split(':');return [key,sum(Number(stat),unit)];}));}
    return expected.map(row=>{
      const parts=row.id.split('.'),record=PandoraRemaked.catalog.item('equipment',Number(parts[1])*10000+Number(parts[2]));
      if(!record)throw Error('Missing published weapon '+row.id);
      const allKeys=row.effects.map(e=>e.stat+':'+e.unit)
        .concat((record.upgradeBonuses||[]).map(e=>e.stat+':'+e.unit));
      const keys=allKeys.filter((value,index)=>allKeys.indexOf(value)===index);
      for(let i=0;i<Status.Equip.length;i++)Status.Equip[i]=[0,0,0,0,0,0,0];EquipCheck();const empty=read(keys);
      const variants=[[0,0],[7,0],[10,0],[10,1]].map(([level,element])=>{
        Status.Equip[0]=[record.engineId,0,element,level,0,0,0];EquipCheck();
        const stats=read(keys),procs=PandoraRemaked.enhancementEffects.currentWeaponProcs().map(p=>({kind:p.kind,chance:p.chance}));
        return {level,element,stats:Object.fromEntries(keys.map(k=>[k,stats[k]-empty[k]])),procs};
      });
      return {id:row.id,variants};
    });
  },{snapshot,expected,production});
  for(const row of expected){
    const record=fixture.records.find(item=>item.id===row.id),actual=observed.find(item=>item.id===row.id);
    for(const variant of actual.variants){
      for(const [key,value] of Object.entries(variant.stats)){
        const [stat,unit]=key.split(':'),base=row.effects.find(e=>e.stat===Number(stat)&&e.unit===unit)?.value||0;
        const bonus=(record.upgradeBonuses||[]).filter(rule=>rule.stat===Number(stat)&&rule.unit===unit&&
          variant.level>=rule.from&&(!rule.gemElement||variant.element===0)).reduce((n,rule)=>n+rule.value*(1+Math.floor((Math.min(variant.level,rule.to)-rule.from)/rule.every)),0);
        expect(value,`${row.id} ${variant.level} ${variant.element} ${key}`).toBe(base+bonus);
      }
      for(const proc of variant.procs){
        const rule=record.procEffects.find(item=>item.kind===proc.kind);
        const active=variant.element===0&&variant.level>=rule.from;
        const steps=active?Math.floor((Math.min(variant.level,rule.to)-rule.from)/rule.every):0;
        const wanted=active?(rule.kind==='special_magic_damage'?rule.chance+steps*rule.chanceStep:rule.chance*(steps+1)):0;
        expect(proc.chance,`${row.id} ${proc.kind} +${variant.level}`).toBe(wanted);
      }
      expect(variant.procs).toHaveLength((record.procEffects||[]).length);
    }
  }
});
