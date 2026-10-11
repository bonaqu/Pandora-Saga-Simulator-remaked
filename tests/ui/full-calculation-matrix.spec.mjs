import {test,expect} from '@playwright/test';

// The retained engine is the runtime used by Modern. This regression matrix
// detects dropped/stale outputs; it does not certify numerical game parity.
const CORE=[49,60,70,138,139,140,141,142,143,144,145];
const STATUS=/^-?\d+(?:[.,]\d+)?%?$/;

test('28 classes × 6 races retain all 43 results and recompute deterministically',async({page})=>{
  test.setTimeout(180_000);
  await page.goto('/?ui=ru');
  const matrix=await page.evaluate(()=>{
    const jobs=document.getElementById('SelJob'),races=document.getElementById('SelRace');
    if(!jobs||!races||jobs.options.length<28||races.options.length<6)
      throw new Error('Source race/class selectors have changed');
    const read=()=>{
      const nodes=Array.from(document.querySelectorAll('#StatusView .input_gt'));
      const numeric=Object.fromEntries([49,60,70,138,139,140,141,142,143,144,145]
        .map(id=>[id,document.getElementById('Status_'+id)?.textContent.trim()]));
      return {output:nodes.map(node=>node.textContent.trim()),numeric};
    };
    const entries=[];
    for(let job=0;job<28;job++){
      for(let race=0;race<6;race++){
        races.selectedIndex=race;races.onchange();
        jobs.selectedIndex=job;jobs.onchange();
        Flag[7]=0;Flag['0_8']=0;Flag['14_4']=0;
        CalcSet('ALL');
        const currentJob=jobs.selectedIndex,currentRace=races.selectedIndex;
        const first=read();
        const payload=Store();
        CalcSet('ALL');
        const repeated=read();
        entries.push({job,race,currentJob,currentRace,first,repeated,
          persisted:payload===Store(),label:document.getElementById('StatusJob')?.textContent.trim()});
      }
    }
    return {jobOptions:jobs.options.length,raceOptions:races.options.length,entries};
  });
  expect(matrix.entries).toHaveLength(28*6);
  for(const item of matrix.entries){
    const key='job='+item.job+',race='+item.race;
    expect(item.currentJob,key).toBe(item.job);
    expect(item.currentRace,key).toBe(item.race);
    expect(item.label,key).toBeTruthy();
    expect(item.first.output,key).toHaveLength(43);
    expect(item.first.output.every(value=>Boolean(value)&&
      !/NaN|Infinity|undefined|null|---\d/i.test(value)),key).toBe(true);
    for(const id of CORE)expect(item.first.numeric[id],key+',Status_'+id).toMatch(STATUS);
    expect(item.repeated,key).toEqual(item.first);
    expect(item.persisted,key).toBe(true);
  }
});

test('defense and magic resistance remain additive, reversible and finite across representative classes',async({page})=>{
  test.setTimeout(120_000);
  await page.goto('/?ui=ru');
  const results=await page.evaluate(()=>{
    const jobs=document.getElementById('SelJob');
    const ids=[49,145],read=()=>Object.fromEntries(ids.map(id=>[
      id,document.getElementById('Status_'+id)?.textContent.trim()]));
    const matrix=[];
    for(const job of [0,4,8,16,20,27]){
      jobs.selectedIndex=job;jobs.onchange();
      Flag[7]=0;Flag['0_8']=0;Flag['14_4']=0;
      CalcSet('ALL');
      const original=read(),before=Store();
      const equipped=PandoraRemaked.adapter.selectEquipment(3,310015);
      const robe=read();
      Flag['0_8']=1;Flag['14_4']=1;CalcSet('ALL');
      const buffed=read();
      CalcSet('ALL');const repeated=read();
      Flag['0_8']=0;Flag['14_4']=0;
      const unequipped=PandoraRemaked.adapter.selectEquipment(3,0);
      CalcSet('ALL');const restored=read();
      matrix.push({job,equipped,unequipped,original,robe,buffed,repeated,restored,
        buildRestored:Store()===before});
    }
    return matrix;
  });
  for(const frame of results){
    const tag='job='+frame.job;
    expect(frame.equipped,tag).toBe(true);
    expect(frame.unequipped,tag).toBe(true);
    for(const values of [frame.original,frame.robe,frame.buffed,frame.repeated,frame.restored])
      for(const [id,value] of Object.entries(values))
        expect(value,tag+',Status_'+id).toMatch(STATUS);
    expect(Number(frame.robe[49])-Number(frame.original[49]),tag).toBe(8);
    expect(Number(frame.robe[145])-Number(frame.original[145]),tag).toBe(3);
    expect(Number(frame.buffed[145])-Number(frame.robe[145]),tag).toBe(25);
    expect(Number(frame.buffed[49]),tag).toBeGreaterThan(Number(frame.robe[49]));
    expect(frame.repeated,tag).toEqual(frame.buffed);
    expect(frame.restored,tag).toEqual(frame.original);
    expect(frame.buildRestored,tag).toBe(true);
  }
});
