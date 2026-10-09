import { test, expect } from '@playwright/test';
import equipment from '../../data/generated/equipment.v1.json' with { type: 'json' };
import character from '../../data/generated/character.v1.json' with { type: 'json' };

// Actual game server IDs reconciled against the published Modern catalog;
// the corresponding enhancement code is already in ITEM_FORTH, not a new
// independently maintained or duplicate rules table.
const snapshot={ok:true,schemaVersion:1,sourceFingerprint:equipment.metadata.generated_from[0].sha256,
  characterSourceFingerprint:character.sourceFingerprint,revision:85,impactRevision:85,records:[]};
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
    return {scarlet:scan(310041,62,[0,1,3,5]),
      azure:scan(310033,77,[0,1,2,4,5])};
  });
  expect(result.scarlet[0].exists).toBe(true);
  expect(result.scarlet[3].first-result.scarlet[0].first).toBe(3);
  expect(result.scarlet[5].first-result.scarlet[0].first).toBe(5);
  expect(result.azure[2].first-result.azure[0].first).toBe(1);
  expect(result.azure[4].first-result.azure[0].first).toBe(2);
  for(const group of [result.scarlet,result.azure])
    for(const item of Object.values(group))expect(item.second).toBe(item.first);
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
