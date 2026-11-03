import { test, expect } from '@playwright/test';

test('all 72 official race-kit names have exact RU source labels and short sex suffixes', async ({ page }) => {
  await page.goto('/');
  const values = await page.evaluate(() => {
    const registry = window.PandoraRemakedVerifiedRacialGear;
    const i18n = window.PandoraRemaked.i18n;
    i18n.setLocale('ru');
    const ru = registry.entries.map(entry => ({
      gameId:entry.gameId, id:entry.recordId, set:entry.set,
      sex:entry.sex, expected:entry.ru,
      title:i18n.game('equipment.'+entry.category+'.'+entry.index,'')
    }));
    i18n.setLocale('en');
    const en = registry.entries.map(entry => ({
      gameId:entry.gameId, expected:entry.en,
      title:i18n.game('equipment.'+entry.category+'.'+entry.index,'')
    }));
    return {total:registry.entries.length, ru, en,
      duplicates:new Set(registry.entries.map(row=>row.category+'.'+row.index)).size};
  });
  expect(values.total).toBe(72);
  expect(values.duplicates).toBe(72);
  for(const entry of values.ru){
    expect(entry.title,entry.id).toBe(entry.expected);
    if(entry.sex==='male')expect(entry.title).toMatch(/\(м\)$/);
    else if(entry.sex==='female')expect(entry.title).toMatch(/\(ж\)$/);
    else expect(entry.title).not.toMatch(/\([мж]\)$/);
  }
  for(const entry of values.en)expect(entry.title,entry.gameId+' EN').toBe(entry.expected);
  expect(values.ru.find(x=>x.gameId===12551).title).toBe('Корсет для мирины');
  expect(values.ru.find(x=>x.gameId===12562).title).toBe('Жилет зари для энкиду');
  expect(values.ru.find(x=>x.gameId===11542).title).toBe('Рассветный шлем для цверга');
});

test('female regular racial items use distinct names/IDs with identical legacy formulas, and JP/TW new-item fallback is English',async({page})=>{
  await page.goto('/');
  const result=await page.evaluate(()=>{
    const set=window.PandoraRemakedVerifiedRacialGear.entries;
    const registry=window.PandoraRemakedDawnCollection;
    const original=JSON.stringify(window.EquipData);
    const sourceRows=registry.entries.filter(row=>row.publishedId).map(row=>({
      id:row.publishedId,kind:'equipment',category:row.category,index:100+row.templateIndex,
      compatibility:Array(36).fill(1),names:{en:row.en,ru:row.ru,jp:'',tw:''}
    }));
    const added=registry.augment({revision:94,records:sourceRows},window.EquipData);
    const addedRegular=set.filter(row=>row.set==='racial'&&row.newIndex!==undefined).map(row=>{
      const record=added.records.find(x=>x.id===row.recordId);
      return {gameId:row.gameId,id:record?.id,index:record?.index,
        code:record?.calculationCode,
        original:window.EquipData[0][row.category][row.templateIndex][7],
        gender:record?.compatibility.slice(0,2),
        race:record?.compatibility.slice(2,8),
        japanese:record?.names.jp,traditionalChinese:record?.names.tw,
        english:record?.names.en
      };
    });
    const jpLegacy=window.EquipData[0][31][10][0],twLegacy=window.EquipData[2][31][10][0];
    const hasOriginalChanges=JSON.stringify(window.EquipData)!==original;
    return {addedRegular,jpLegacy,twLegacy,hasOriginalChanges};
  });
  expect(result.addedRegular).toHaveLength(5);
  for(const item of result.addedRegular){
    expect(item.id).toBe('modern.equipment.racial-os-'+item.gameId);
    expect(item.code).toBe(item.original);
    expect(item.gender).toEqual([0,1]);
    expect(item.race.reduce((a,b)=>a+b,0)).toBe(1);
    expect(item.japanese).toBe('');
    expect(item.traditionalChinese).toBe('');
    expect(item.english).toBeTruthy();
  }
  expect(result.hasOriginalChanges).toBe(false);
  expect(result.jpLegacy).toBe('マイリーンセパレーツ');
  expect(result.twLegacy).toBeTruthy();
});
