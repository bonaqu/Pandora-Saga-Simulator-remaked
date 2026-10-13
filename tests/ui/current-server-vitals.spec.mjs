import {test,expect} from '@playwright/test';
import classes from '../fixtures/pandora-os-classes-20261011.json' with {type:'json'};
import {CLASS_ORDER} from '../../scripts/audit_pandora_os_class_coefficients.mjs';

test('Modern loads all 28 current-server class vitals without mutating Legacy denominators',async({page})=>{
  await page.goto('/?ui=ru');
  const data=await page.evaluate(()=>{
    const api=window.PandoraRemaked.currentVitals;
    const output=[];
    for(const className of api.classOrder){
      for(const level of [1,20,45]){
        const h=api.evaluate('hp',{className,level,vit:37,spi:53,effects:[],clanLevel:0});
        const m=api.evaluate('mp',{className,level,vit:37,spi:53,effects:[],clanLevel:0});
        output.push({className,level,hp:h.total,mp:m.total});
      }
    }
    return {count:api.classCount,order:api.classOrder,output,
      legacyDenominators:window.Status.Mod.map(row=>row.slice())};
  });
  expect(data.count).toBe(28);
  expect(data.order).toEqual(CLASS_ORDER);
  expect(data.legacyDenominators).toHaveLength(28);
  for(const row of data.output){
    const source=classes[row.className];
    const hp=Math.floor(Math.round(source.hp.base*100+row.level*source.hp.lv*100+37*source.hp.vit*100)/100);
    const mp=Math.floor(Math.round(source.mp.base*100+row.level*source.mp.lv*100+53*source.mp.spi*100)/100);
    expect(row.hp,row.className+'/'+row.level+' HP').toBe(hp);
    expect(row.mp,row.className+'/'+row.level+' MP').toBe(mp);
  }
});

test('game client Cleric 45 matches naked 3145/1279 and equipped 3402/1505 with Life Sign 4127',async({page})=>{
  await page.goto('/?ui=ru');
  const result=await page.evaluate(()=>{
    const api=window.PandoraRemaked.currentVitals;
    const plainHp=api.evaluate('hp',{className:'CLERIC',level:45,vit:49,spi:53,effects:[],clanLevel:0});
    const plainMp=api.evaluate('mp',{className:'CLERIC',level:45,vit:49,spi:53,effects:[],clanLevel:0});
    const gearedHp=api.evaluate('hp',{className:'CLERIC',level:45,vit:50,spi:57,effects:['230'],clanLevel:0});
    const gearedMp=api.evaluate('mp',{className:'CLERIC',level:45,vit:50,spi:57,effects:['10','20','50','8%'],clanLevel:0});
    const buffedHp=api.evaluate('hp',{className:'CLERIC',level:45,vit:50,spi:57,effects:['230'],clanLevel:0,lifeSign:true});
    return {plainHp,plainMp,gearedHp,gearedMp,buffedHp};
  });
  expect(result.plainHp.total).toBe(3145);
  expect(result.plainMp.total).toBe(1279);
  expect(result.gearedHp.total).toBe(3402);
  expect(result.gearedMp.base).toBe(1320);
  expect(result.gearedMp.bonus).toBe(185);
  expect(result.gearedMp.total).toBe(1505);
  expect(result.buffedHp.total).toBe(4127);
});

test('Modern live Calc entry and result DOM use new source-class HP/MP and recalculate after equipment effect changes',async({page})=>{
  await page.goto('/?ui=ru');
  const frames=await page.evaluate(()=>{
    const old={job:Status.Job.slice(),level:Status.Lev[0],sta:Status.STA.slice(),
      spr:Status.SPR.slice(),life:Flag['14_1'],equip6:EquipOpt[6]?.slice(),
      equip7:EquipOpt[7]?.slice()};
    const read=()=>({
      hp:Status.LP,mp:Status.MP,
      hpText:document.getElementById('Status_6').textContent.trim(),
      mpText:document.getElementById('Status_7').textContent.trim()
    });
    try{
      Status.Job[2]=16;Status.Lev[0]=45;
      Status.STA=[49,0,0];Status.SPR=[53,0,0];
      EquipOpt[6]=[];EquipOpt[7]=[];Flag['14_1']=0;
      Calc('LP');Calc('MP');
      const naked=read();
      Status.STA=[50,0,0];Status.SPR=[57,0,0];
      EquipOpt[6]=['230'];EquipOpt[7]=['10','20','50','8%'];
      Calc('LP');Calc('MP');
      const equipped=read();
      Flag['14_1']=1;Calc('LP');
      const buffed=read();
      return {naked,equipped,buffed};
    }finally{
      Status.Job=old.job;Status.Lev[0]=old.level;
      Status.STA=old.sta;Status.SPR=old.spr;Flag['14_1']=old.life;
      EquipOpt[6]=old.equip6;EquipOpt[7]=old.equip7;
      CalcSet('ALL');
    }
  });
  expect(frames.naked.hp).toBe(3145);
  expect(frames.naked.mp).toBe(1279);
  expect(frames.equipped.hp).toBe(3402);
  expect(frames.equipped.mp).toBe(1505);
  expect(frames.buffed.hp).toBe(4127);
  expect(frames.buffed.mp).toBe(1505);
  for(const frame of Object.values(frames)){
    expect(Number(frame.hpText.replace(/,/g,''))).toBe(frame.hp);
    expect(Number(frame.mpText.replace(/,/g,''))).toBe(frame.mp);
  }
});

test('each percentage uses the source class base, not HP/MP including flat gear',async({page})=>{
  await page.goto('/?ui=ru');
  const out=await page.evaluate(()=>{
    const api=PandoraRemaked.currentVitals;
    return {
      first:api.evaluate('mp',{className:'CLERIC',level:45,vit:50,spi:57,effects:['80','8%']}),
      reverse:api.evaluate('mp',{className:'CLERIC',level:45,vit:50,spi:57,effects:['8%','80']}),
      withClan:api.evaluate('mp',{className:'CLERIC',level:45,vit:50,spi:57,effects:['80','8%'],clanLevel:1})
    };
  });
  expect(out.first.total).toBe(1505);
  expect(out.reverse.total).toBe(1505);
  expect(out.withClan.total).toBe(1531);
});
