import {test,expect} from '@playwright/test';

// These are the preserved calculator's 14 known base recovery factors.
// The fifth fixed potion is intentionally 145 in the legacy calculation,
// although an older tooltip says 175: that external data conflict is audited.
const FIXED=[20,60,120,180,450,145,10,25,200,150];
const PERCENT=[5,15,30,18];
function expected(state){
  return FIXED.map(value=>Math.floor(value*state.potion/100)).concat(
    PERCENT.map(value=>Math.floor(state.lp*Math.ceil(value*state.potion)/10000)));
}
async function read(page){
  return page.evaluate(()=>({
    flag:Flag[6],tab:Flag[8],lp:Status.LP,potion:Status.POT,
    values:[...document.querySelectorAll('#POTView [id^="ViewPOT_"][id$="_1"]')]
      .map(node=>node.textContent.trim()),
    build:Store()
  }));
}

test('all 14 potion values render immediately even while Use potion effects is off',async({page})=>{
  await page.goto('/?ui=ru');
  const initial=await read(page);
  expect(initial.flag).toBeFalsy();
  await page.locator('#EfTab_1').click();
  await expect(page.locator('[data-remaked-effect="1"]')).toHaveAttribute('aria-pressed','true');
  await expect(page.locator('#POTView')).toBeVisible();
  await expect.poll(async()=>(await read(page)).values).toEqual(expected(initial).map(String));
  let after=await read(page);
  expect(after.flag).toBe(initial.flag);
  expect(after.build).toBe(initial.build);
  expect(after.values).toHaveLength(14);
  expect(after.values).not.toContain('---');

  // The native toggle is independent: enabling it cannot double-apply bonuses.
  await page.locator('#SwitchUse_3').click();
  await expect.poll(async()=>(await read(page)).values)
    .toEqual(expected(await read(page)).map(String));
  await page.locator('#SwitchUse_3').click();
  await expect.poll(async()=>(await read(page)).values)
    .toEqual(expected(await read(page)).map(String));

  // Original panel can be opened and closed via keyboard as well as hover.
  await page.locator('[data-remaked-effect="0"]').focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('#SkillView')).toBeVisible();
  await page.locator('[data-remaked-effect="1"]').focus();
  await page.keyboard.press('Space');
  await expect(page.locator('#POTView')).toBeVisible();
  await expect(page.locator('[data-remaked-effect="1"]')).toHaveAttribute('aria-pressed','true');
});

test('Potion Soul +8% composes across two chest and two leg sockets with no duplicate recalc',async({page})=>{
  await page.goto('/?ui=ru');
  await page.locator('#EfTab_1').click();
  const data=await page.evaluate(()=>{
    const original=Status.Equip.map(item=>item.slice());
    const job=[...Status.Job],raw=Store();
    const read=()=>({
      base:Status.POT,lp:Status.LP,
      potionOptions:[...(EquipOpt[8]||[])],
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
          PandoraRemaked.calculatorControls.refresh();
          const first=read(),ready=Store();
          EquipCheck();CalcSet('ALL');
          PandoraRemaked.calculatorControls.refresh();
          const second=read();
          results.push({selected,count,first,second,noDuplicate:JSON.stringify(first.potionOptions)===JSON.stringify(second.potionOptions),
            buildStable:ready===Store(), delta:previous===undefined?0:first.base-previous});
          previous=first.base;
        }
        // The next job starts from the same clean soul configuration.
        Status.Equip[3]=[0,0,0,0,0,0,0];
        Status.Equip[5]=[0,0,0,0,0,0,0];
        EquipCheck();
      }
    }finally{
      for(let i=0;i<original.length;i++)Status.Equip[i]=original[i];
      Status.Job=job;
      EquipCheck();CalcSet('ALL');
    }
    return {results,initial:raw,finished:Store()};
  });
  expect(data.results).toHaveLength(10);
  for(const frame of data.results){
    const label='job '+frame.selected+', '+frame.count+' Soul(s)';
    expect(frame.first.values,label).toHaveLength(14);
    expect(frame.first.values,label).toEqual(expected({potion:frame.first.base,lp:frame.first.lp}).map(String));
    expect(frame.second,label).toEqual(frame.first);
    expect(frame.noDuplicate,label).toBe(true);
    expect(frame.buildStable,label).toBe(true);
    if(frame.count>0)expect(frame.delta,label).toBe(8);
  }
});

test('four-language potion preview changes labels but never 14 numeric results or character build',async({page})=>{
  await page.goto('/?ui=ru');
  await page.locator('#EfTab_1').click();
  const saved=await read(page);
  for(const locale of ['en','jp','tw','ru']){
    await page.evaluate(lang=>PandoraRemaked.i18n.setLocale(lang),locale);
    await expect.poll(async()=>(await read(page)).values).toEqual(expected(saved).map(String));
    expect((await read(page)).build).toBe(saved.build);
  }
});
