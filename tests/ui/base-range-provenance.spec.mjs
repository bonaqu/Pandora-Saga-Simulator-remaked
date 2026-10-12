import {test,expect} from '@playwright/test';
import english from '../../localization/ui.en.json' with {type:'json'};
import approved from '../../localization/approved-translations.v1.json' with {type:'json'};

const KNOWN='calculator.weaponBaseRangeVerified';
const UNKNOWN='calculator.weaponBaseRangeUnverified';

test('base and unknown reach have safe source-provenance hints on RU/EN/JP/TW with zero build mutation',async({page})=>{
  await page.goto('/?ui=ru');
  const original=await page.evaluate(()=>Store());
  const melee=page.locator('#Status_40'),ranged=page.locator('#Status_41');
  const assertHint=async(locale,key,node)=>{
    await expect(node).toHaveAttribute('data-remaked-range-evidence',key===KNOWN?'base':'unverified');
    const phrase=locale==='en'?english[key]:approved.ui[locale][key];
    await expect(node).toHaveAttribute('title',phrase);
    await expect(node).toHaveAttribute('aria-description',phrase);
    expect(phrase).not.toMatch(/<[^>]*>/);
  };
  const initial=await page.evaluate(()=>({
    melee:document.getElementById('Status_40').dataset.remakedRangeEvidence,
    ranged:document.getElementById('Status_41').dataset.remakedRangeEvidence
  }));
  expect(initial).toEqual({melee:'unverified',ranged:'unverified'});
  for(const locale of ['ru','en','jp','tw']){
    await page.evaluate(lang=>PandoraRemaked.i18n.setLocale(lang),locale);
    await assertHint(locale,UNKNOWN,melee);
    await assertHint(locale,UNKNOWN,ranged);
  }
  const fitted=await page.evaluate(()=>{
    Flag[7]=0;
    return PandoraRemaked.adapter.selectEquipment(0,10);
  });
  expect(fitted).toBe(true);
  await expect(melee).toHaveText('115');
  for(const locale of ['tw','jp','en','ru']){
    await page.evaluate(lang=>PandoraRemaked.i18n.setLocale(lang),locale);
    await assertHint(locale,KNOWN,melee);
    await assertHint(locale,UNKNOWN,ranged);
    await expect(melee).toHaveText('115');
  }
  await page.evaluate(()=>{
    PandoraRemaked.adapter.selectEquipment(0,0);
    Flag[7]=0;
    CalcSet('ALL');
  });
  await assertHint('ru',UNKNOWN,melee);
  expect(await page.evaluate(()=>Store())).toBe(original);
});

test('source-only base-range guidance has complete, equivalent four-language approved copy',()=>{
  for(const key of [KNOWN,UNKNOWN]){
    const value=english[key];
    expect(value).toBeTruthy();
    for(const locale of ['ru','jp','tw']){
      const translated=approved.ui[locale]?.[key];
      expect(translated,key+locale).toBeTruthy();
      expect(translated).not.toMatch(/[<>]/);
      expect((translated.match(/\{\w+\}/g)||[]).sort())
        .toEqual((value.match(/\{\w+\}/g)||[]).sort());
    }
  }
});
