import {test,expect} from '@playwright/test';

// Native potion source factors. Percent entries MUST remain percentages until
// the user explicitly opts into "Use potion effects" (#SwitchUse_3 / Flag[6]).
const FIXED=[20,60,120,180,450,145,10,25,200,150];
const PERCENT=[5,15,30,18];
const BASE=[...FIXED.map(String),...PERCENT.map(value=>value+'%')];
function calculated(state){
  return FIXED.map(value=>Math.floor(value*state.potion/100)).concat(
    PERCENT.map(value=>Math.floor(state.lp*Math.ceil(value*state.potion)/10000)))
    .map(String);
}
async function read(page){
  return page.evaluate(()=>({
    flag:Flag[6],tab:Flag[8],lp:Status.LP,potion:Status.POT,
    values:[...document.querySelectorAll('#POTView [id^="ViewPOT_"][id$="_1"]')]
      .map(node=>node.textContent.trim()),
    build:Store()
  }));
}

test('potions show original flat/percent values when OFF; only explicit toggle enables computed healing',async({page})=>{
  await page.goto('/?ui=ru');
  const initial=await read(page);
  expect(initial.flag).toBeFalsy();
  await page.locator('#EfTab_1').click();
  await expect(page.locator('[data-remaked-effect="1"]')).toHaveAttribute('aria-pressed','true');
  await expect(page.locator('#POTView')).toBeVisible();
  await expect.poll(async()=>(await read(page)).values).toEqual(BASE);
  expect((await read(page)).build).toBe(initial.build);
  expect((await read(page)).flag).toBeFalsy();
  // Rest POT: 15% is the base effect; it is NOT 15% of the character's HP.
  await expect(page.locator('#ViewPOT_11_1')).toHaveText('15%');
  await expect(page.locator('#ViewPOT_5_1')).toHaveText('145');

  await page.locator('#SwitchUse_3').click();
  await expect.poll(async()=>Boolean((await read(page)).flag)).toBe(true);
  await expect.poll(async()=>(await read(page)).values)
    .toEqual(calculated(await read(page)));
  await expect(page.locator('#ViewPOT_11_1')).not.toHaveText('15%');

  await page.locator('#SwitchUse_3').click();
  await expect.poll(async()=>Boolean((await read(page)).flag)).toBe(false);
  await expect.poll(async()=>(await read(page)).values).toEqual(BASE);
  expect((await read(page)).build).toBe(initial.build);
  // No stale computed values may survive once the setting is disabled.
  await expect(page.locator('#ViewPOT_11_1')).toHaveText('15%');

  // View switcher is navigation, never a hidden calculation opt-in.
  await page.locator('[data-remaked-effect="0"]').focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('#SkillView')).toBeVisible();
  await page.locator('[data-remaked-effect="1"]').focus();
  await page.keyboard.press('Space');
  await expect(page.locator('#POTView')).toBeVisible();
  await expect.poll(async()=>(await read(page)).values).toEqual(BASE);
  expect((await read(page)).flag).toBeFalsy();
});

test('1–4 Potion Souls and 101 melee points do not change the OFF preview; ON uses native bonus exactly once',async({page})=>{
  await page.goto('/?ui=ru');
  await page.locator('#EfTab_1').click();
  const data=await page.evaluate(()=>{
    const original=Status.Equip.map(item=>item.slice());
    const job=[...Status.Job],flag=Flag[6],raw=Store();
    const read=()=>({
      bonus:Status.POT,lp:Status.LP,flag:Flag[6],
      options:[...(EquipOpt[8]||[])],
      values:[...document.querySelectorAll('#POTView [id^="ViewPOT_"][id$="_1"]')]
        .map(el=>el.textContent.trim())
    });
    const results=[];
    try{
      const jobs=document.getElementById('SelJob');
      for(const selected of [19,6]){
        jobs.selectedIndex=selected;jobs.onchange();
        StatusMove('Lev',45);
        if(selected===6){
          Status.Skill[0][0]=101;
          CalcSet('ALL');
        }
        let previous;
        for(let count=0;count<=4;count++){
          Status.Equip[3]=[310031,0,0,0,count>=1?60:0,count>=2?60:0,0];
          Status.Equip[5]=[330031,0,0,0,count>=3?60:0,count>=4?60:0,0];
          EquipCheck();CalcSet('ALL');
          Flag[6]=0;
          PandoraRemaked.calculatorControls.refresh();
          const off=read();
          Flag[6]=1;
          CalcSet('ViewPOT');
          PandoraRemaked.calculatorControls.refresh();
          const first=read(),ready=Store();
          EquipCheck();CalcSet('ALL');
          PandoraRemaked.calculatorControls.refresh();
          const repeated=read();
          Flag[6]=0;
          CalcSet('ViewPOT');
          PandoraRemaked.calculatorControls.refresh();
          const restoredOff=read();
          results.push({
            selected,count,off,first,repeated,restoredOff,
            stable:ready===Store()||flag===0,
            bonusDelta:previous===undefined?0:first.bonus-previous
          });
          previous=first.bonus;
        }
        Status.Equip[3]=[0,0,0,0,0,0,0];
        Status.Equip[5]=[0,0,0,0,0,0,0];
        EquipCheck();
      }
    }finally{
      for(let i=0;i<original.length;i++)Status.Equip[i]=original[i];
      Status.Job=job;Flag[6]=flag;
      EquipCheck();CalcSet('ALL');PandoraRemaked.calculatorControls.refresh();
    }
    return {results,initial:raw,finished:Store()};
  });
  expect(data.results).toHaveLength(10);
  for(const frame of data.results){
    const label='job '+frame.selected+', '+frame.count+' Soul(s)';
    expect(frame.off.flag,label).toBe(0);
    expect(frame.off.values,label).toEqual(BASE);
    expect(frame.first.flag,label).toBe(1);
    expect(frame.first.values,label).toEqual(calculated({potion:frame.first.bonus,lp:frame.first.lp}));
    expect(frame.repeated,label).toEqual(frame.first);
    expect(frame.restoredOff.values,label).toEqual(BASE);
    expect(frame.restoredOff.bonus,label).toBe(frame.first.bonus);
    if(frame.count>0)expect(frame.bonusDelta,label).toBe(8);
  }
});

test('RU/EN/JP/TW language switches preserve base values OFF and calculated values ON without modifying builds',async({page})=>{
  await page.goto('/?ui=ru');
  await page.locator('#EfTab_1').click();
  const saved=await read(page);
  for(const locale of ['en','jp','tw','ru']){
    await page.evaluate(lang=>PandoraRemaked.i18n.setLocale(lang),locale);
    await expect.poll(async()=>(await read(page)).values).toEqual(BASE);
    expect((await read(page)).flag).toBeFalsy();
    expect((await read(page)).build).toBe(saved.build);
  }
  await page.locator('#SwitchUse_3').click();
  const enabled=await read(page);
  expect(enabled.flag).toBeTruthy();
  for(const locale of ['jp','tw','en','ru']){
    await page.evaluate(lang=>PandoraRemaked.i18n.setLocale(lang),locale);
    await expect.poll(async()=>(await read(page)).values)
      .toEqual(calculated(await read(page)));
    expect((await read(page)).build).toBe(enabled.build);
  }
  await page.locator('#SwitchUse_3').click();
  await expect.poll(async()=>(await read(page)).values).toEqual(BASE);
  expect((await read(page)).build).toBe(saved.build);
});
