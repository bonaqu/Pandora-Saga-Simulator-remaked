import {test, expect} from '@playwright/test';

// Source tables.json captured 2026-10-28. Values are racial base + initial
// profession, not equipment, learned skills, guild effects or combat parity.
const races = [
  [4,6,4,5,4,5], [2,4,5,4,6,7], [5,8,4,6,2,3],
  [4,6,8,6,2,2], [7,7,3,4,5,2], [2,2,5,5,8,6]
];
const jobs = [[3,2,0,1,0,0],[1,1,2,2,0,0],[1,1,0,0,2,2],[0,0,0,1,2,3]];
const family = [0,0,0,0,0,0,0,1,1,1,1,1,1,1,2,2,2,2,2,2,2,3,3,3,3,3,3,3];

test('all 28 classes and six races use current base values, and the observed Cleric build spends 432 points', async ({page}) => {
  test.setTimeout(180000);
  await page.goto('/');
  const result = await page.evaluate(() => {
    const selectors = {race: document.getElementById('SelRace'), job: document.getElementById('SelJob')};
    const names = ['STA','STR','AGI','DEX','SPR','INT'];
    const bases=[];
    for (let job=0;job<28;job++) for (let race=0;race<6;race++) {
      selectors.race.selectedIndex=race; selectors.race.onchange();
      selectors.job.selectedIndex=job; selectors.job.onchange();
      bases.push({job,race,actual:names.map(key=>Status[key][0])});
    }
    selectors.race.selectedIndex=1; selectors.race.onchange();
    selectors.job.selectedIndex=16; selectors.job.onchange();
    StatusMove('Lev',45-Status.Lev[0]); CalcSet('Lev');
    Reset('Equip'); Reset('Status');
    const initial={level:Status.Lev[0], available:Status.StP[0],total:Status.StP[1],
      stats:names.map(key=>Status[key][0]+Status[key][1]), maxLevel:MaxLv};
    StatusMove('Status','INT',90); StatusMove('Status','DEX',26); StatusMove('Status','SPR',22);
    CalcSet('ALL');
    const spent={available:Status.StP[0],total:Status.StP[1],stats:names.map(key=>Status[key][0]+Status[key][1]),
      equipment:Status.Equip.slice(0,14).every(row=>Number(row[0])===0)};
    return {bases,initial,spent};
  });
  expect(result.bases).toHaveLength(168);
  for (const row of result.bases) {
    const expected = races[row.race].map((value,index)=>value+jobs[family[row.job]][index]);
    expect(row.actual,`race ${row.race}, job ${row.job}`).toEqual(expected);
  }
  expect(result.initial).toEqual({level:45,available:432,total:432,stats:[3,5,5,4,8,9],maxLevel:55});
  expect(result.spent).toEqual({available:0,total:432,stats:[3,5,5,30,30,99],equipment:true});
});
