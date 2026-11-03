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

test('all 72 racial and Dawn descriptions use verified Russian only in RU, English only in EN', async ({page})=>{
  await page.goto('/');
  const result=await page.evaluate(()=>{
    const registry=window.PandoraRemakedVerifiedRacialGear.entries;
    const locale=window.PandoraRemaked.i18n, initial=locale.getLocale();
    locale.setLocale('ru');
    const ru=registry.map(row=>({
      id:row.gameId, expected:row.descriptionRu,
      description:locale.game('equipment.'+row.category+'.'+row.index+'.description','')
    }));
    const sampleRu=window.PandoraRemaked.adapter.readItemDetails('equipment',320015,4)?.descriptions.join(' ')||'';
    locale.setLocale('en');
    const en=registry.map(row=>({
      id:row.gameId, expected:row.descriptionEn,
      description:locale.game('equipment.'+row.category+'.'+row.index+'.description','')
    }));
    const sampleEn=window.PandoraRemaked.adapter.readItemDetails('equipment',320015,4)?.descriptions.join(' ')||'';
    locale.setLocale(initial);
    return {ru,en,sampleRu,sampleEn};
  });
  expect(result.ru).toHaveLength(72);
  expect(result.en).toHaveLength(72);
  for(const row of result.ru){
    expect(row.expected?.trim(),String(row.id)+' RU source').toBeTruthy();
    expect(row.description,String(row.id)+' RU UI').toBe(row.expected);
  }
  for(const row of result.en){
    expect(row.expected?.trim(),String(row.id)+' EN source').toBeTruthy();
    expect(row.description,String(row.id)+' EN UI').toBe(row.expected);
  }
  expect(result.sampleRu).toContain('Изготовленные на заказ перчатки для эльфов');
  expect(result.sampleRu).not.toContain('Custom-made gloves');
  expect(result.sampleEn).toContain('Custom-made gloves for elves');
  expect(result.sampleEn).not.toContain('Изготовленные на заказ');
});

test('41 published D1 racial and Dawn aliases fill only absent descriptions and preserve owner-edited text',async({page})=>{
  await page.goto('/');
  const result=await page.evaluate(()=>{
    const registry=window.PandoraRemakedVerifiedRacialGear.entries.filter(row=>row.publishedId);
    const dawn=window.PandoraRemakedDawnCollection;
    const published=registry.map(row=>({
      id:row.publishedId, kind:'equipment', category:row.category,
      index:row.publishedIndex, names:{en:row.en,ru:row.ru,jp:'',tw:''},
      description:{ru:'',en:''}, compatibility:Array(36).fill(1)
    }));
    const mine=published.find(row=>row.id===registry[0].publishedId);
    mine.description.ru='Авторское русское описание';
    const before=JSON.stringify(published);
    const result=dawn.augment({revision:94,records:published},window.EquipData);
    return {
      originalsUnchanged:JSON.stringify(published)===before,
      checked:registry.map(row=>{
        const record=result.records.find(item=>item.id===row.publishedId);
        return {id:row.gameId,expectedRu:row.descriptionRu,expectedEn:row.descriptionEn,
          actualRu:record?.description?.ru,actualEn:record?.description?.en};
      })
    };
  });
  expect(result.originalsUnchanged).toBe(true);
  expect(result.checked).toHaveLength(41);
  for(const [index,row] of result.checked.entries()){
    expect(row.actualRu,String(row.id)+' RU').toBe(index===0?'Авторское русское описание':row.expectedRu);
    expect(row.actualEn,String(row.id)+' EN').toBe(row.expectedEn);
  }
});
