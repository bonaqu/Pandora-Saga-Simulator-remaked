import { test, expect } from '@playwright/test';
import equipment from '../../data/generated/equipment.v1.json' with { type: 'json' };
import character from '../../data/generated/character.v1.json' with { type: 'json' };
import astir from '../fixtures/published-astian-gear.json' with { type: 'json' };

// Actual game server IDs reconciled against the published Modern catalog;
// the corresponding enhancement code is already in ITEM_FORTH, not a new
// independently maintained or duplicate rules table.
const snapshot={ok:true,schemaVersion:1,sourceFingerprint:equipment.metadata.generated_from[0].sha256,
  characterSourceFingerprint:character.sourceFingerprint,revision:85,impactRevision:85,records:astir.records};
test('Astir Scarlet Coat accuracy and Azure Coat casting speed follow exact enhancement milestones',async({page})=>{
  await page.goto('/');
  await page.evaluate(data=>PandoraRemaked.catalog.applySnapshot(data),snapshot);
  const result=await page.evaluate(()=>{
    const total=stat=>(EquipOpt[stat]||[]).reduce((sum,x)=>sum+Number(String(x).replace('%','')),0);
    const scan=(id,stat,levels)=>{
      const output={};
      for(const plus of levels){
        Status.Equip[3]=[id,0,0,plus,0,0,0];EquipCheck();
        const first=total(stat),tokens=[...(EquipOpt[stat]||[])];
        EquipCheck();
        output[plus]={first,second:total(stat),tokens,exists:Boolean(EquipData[0][Math.floor(id/10000)]?.[id%10000])};
      }
      return output;
    };
    return {scarlet:scan(310041,62,[0,1,2,3,4,5,6,7,8,9,10]),
      azure:scan(310033,77,[0,1,2,3,4,5,6,7,8,9,10]),
      leggings:scan(330036,18,[0,1,2,3,4,5,6,7,8,9,10]),
      dress:scan(310042,62,[0,1,2,3,4,5,6,7,8,9,10])};
  });
  expect(result.scarlet[0].exists).toBe(true);
  expect(result.scarlet[3].first-result.scarlet[0].first).toBe(3);
  expect(result.scarlet[5].first-result.scarlet[0].first).toBe(5);
  // Each server Forth row represents the full effect at that milestone.
  // Intermediate levels retain its effect rather than incorrectly clearing it.
  for(let level=0;level<=10;level++){
    expect(result.scarlet[level].first-result.scarlet[0].first,
      'Scarlet Coat accuracy at +'+level).toBe(level);
    expect(result.azure[level].first-result.azure[0].first,
      'Azure Coat casting speed at +'+level).toBe(Math.floor(level/2));
    expect(result.leggings[level].first-result.leggings[0].first,
      'Scarlet Leggings attack bonus at +'+level).toBe(Math.floor(level/2));
    expect(result.dress[level].first-result.dress[0].first,
      'Scarlet Dress accuracy at +'+level).toBe(level);
  }
  for(const group of [result.scarlet,result.azure,result.leggings,result.dress])
    for(const item of Object.values(group))
      expect(item.second,'Repeated EquipCheck must not stack milestones').toBe(item.first);
});

test('Astir Scarlet Dress retains the canonical torso-plus-legs exclusivity',async({page})=>{
  await page.goto('/');
  await page.evaluate(data=>PandoraRemaked.catalog.applySnapshot(data),snapshot);
  const outcome=await page.evaluate(()=>{
    const id=310042;
    const gameName=EquipData[0][31]?.[42]?.[0];
    Status.Equip[3]=[id,0,0,4,0,0,0];
    Status.Equip[5]=[330036,0,0,4,0,0,0];
    EquipCheck();
    return {gameName,torso:Status.Equip[3][0],legs:Status.Equip[5][0],
      legSelector:document.getElementById('SelEquip_5_0')?.selectedIndex};
  });
  expect(outcome.gameName).toBeTruthy();
  expect(outcome.torso).toBe(310042);
  expect(outcome.legs).toBe(0);
  expect(outcome.legSelector).toBe(0);
});
