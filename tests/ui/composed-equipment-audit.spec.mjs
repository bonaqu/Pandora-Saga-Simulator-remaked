import {test,expect} from '@playwright/test';

// These checks assert native Modern runtime consistency and known individual
// item effects. They do not claim independent game-client parity.
test('28 × 6 class/race matrix: Astir refinement, universal Soul, Providence and full undo',async({page})=>{
  test.setTimeout(300_000);
  await page.goto('/?ui=ru');
  const results=await page.evaluate(()=>{
    const jobs=document.getElementById('SelJob'),races=document.getElementById('SelRace');
    if(jobs.options.length<28||races.options.length<6)throw new Error('Class/race options changed');
    const original=Status.Equip.map(slot=>[...slot]),initialRiding=Flag[7],
      initialProvidence=Flag['0_8'],initialLapis=Flag['14_4'];
    const raw=id=>(EquipOpt[id]||[]).reduce((acc,entry)=>acc+Number(String(entry).replace('%','')),0);
    const read=()=>{
      const output=[...document.querySelectorAll('#StatusView .input_gt')]
        .map(node=>node.textContent.trim());
      return {output,def:document.getElementById('Status_49')?.textContent.trim(),
        magic:document.getElementById('Status_145')?.textContent.trim(),
        opts:{def:raw(49),magic:raw(145)},
        lp:document.getElementById('Status_6')?.textContent.trim(),
        mp:document.getElementById('Status_7')?.textContent.trim()};
    };
    const frames=[];
    const equip=(plus,soul,providence)=>{
      Status.Equip[3]=[310031,0,0,plus,soul,0,0];
      Flag['0_8']=providence?1:0;
      EquipCheck();CalcSet('ALL');
      return read();
    };
    try{
      for(let job=0;job<28;job++)for(let race=0;race<6;race++){
        races.selectedIndex=race;races.onchange();
        jobs.selectedIndex=job;jobs.onchange();
        Flag[7]=0;Flag['0_8']=0;Flag['14_4']=0;
        Status.Equip[3]=[0,0,0,0,0,0,0];
        EquipCheck();CalcSet('ALL');
        const clean=read(),saved=Store();
        const base=equip(0,0,false),plus5=equip(5,0,false),
          soul=equip(5,42,false),soulAgain=equip(5,42,false),
          plus10=equip(10,42,false),blessed=equip(10,42,true);
        Status.Equip[3]=[0,0,0,0,0,0,0];Flag['0_8']=0;
        EquipCheck();CalcSet('ALL');
        frames.push({job,race,clean,base,plus5,soul,soulAgain,plus10,blessed,
          restored:read(),savedRestored:Store()===saved});
      }
    } finally{
      for(let i=0;i<original.length;i++)Status.Equip[i]=original[i];
      Flag[7]=initialRiding;Flag['0_8']=initialProvidence;Flag['14_4']=initialLapis;
      EquipCheck();CalcSet('ALL');
    }
    return frames;
  });
  expect(results).toHaveLength(168);
  for(const row of results){
    const msg='class '+row.job+', race '+row.race;
    for(const key of ['clean','base','plus5','soul','soulAgain','plus10','blessed','restored']){
      const item=row[key];
      expect(item.output,msg+' '+key).toHaveLength(43);
      expect(item.output.every(text=>Boolean(text)&&!/NaN|Infinity|undefined|null/i.test(text)),
        msg+' '+key).toBe(true);
      expect(item.magic,msg+' '+key).toMatch(/^-?\d+(?:[.,]\d+)?$/);
      expect(item.def,msg+' '+key).toMatch(/^-?\d+(?:[.,]\d+)?$/);
    }
    expect(row.savedRestored,msg).toBe(true);
    expect(row.restored,msg).toEqual(row.clean);
    expect(row.soulAgain,msg).toEqual(row.soul);
    // Astir chest refinement is source-snapshotted: +5 MR from +5 onward.
    expect(row.plus5.opts.magic-row.base.opts.magic,msg+' +5').toBe(5);
    expect(row.plus10.opts.magic-row.soul.opts.magic,msg+' +10').toBe(0);
    // Universal Soul 42 is a documented +1 DEF, +10 LP/MP token.
    expect(row.soul.opts.def-row.plus5.opts.def,msg+' Soul42 DEF').toBe(1);
    // Providence should not consume or overwrite the equipped Soul/upgrade.
    expect(Number(row.blessed.magic)-Number(row.plus10.magic),
      msg+' Providence').toBe(25);
    expect(row.blessed.opts.def,msg+' retains DEF').toBe(row.plus10.opts.def);
  }
});
