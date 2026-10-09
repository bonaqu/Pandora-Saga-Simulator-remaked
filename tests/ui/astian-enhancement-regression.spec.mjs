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


test('Modern Astir outfits have no full-set bonus, at any enhancement level',async({page})=>{
  await page.goto('/');
  await page.evaluate(data=>PandoraRemaked.catalog.applySnapshot(data),snapshot);
  const result=await page.evaluate(()=>{
    // Inclusion-exclusion isolates a hypothetical full-set interaction.
    // A complete outfit must equal its independent equipped pieces.
    // Importantly this subtracts each boot's OWN stats and enhancements.
    const measure=(torso,gloves,legs,boots,plus)=>{
      for(const slot of [3,4,5,6])Status.Equip[slot]=[0,0,0,0,0,0,0];
      Status.Equip[3]=[torso,0,0,plus,0,0,0];
      Status.Equip[4]=[gloves,0,0,0,0,0,0];
      Status.Equip[5]=[legs,0,0,0,0,0,0];
      Status.Equip[6]=[boots,0,0,0,0,0,0];
      EquipCheck();
      const result={legs:Status.Equip[5][0]};
      for(const stat of [18,49,148]){
        result[stat]=[...(EquipOpt[stat]||[])].reduce((n,v)=>n+Number(String(v).replace('%','')),0);
      }
      return result;
    };
    const combos=[];
    for(const plus of [0,5,6,8,10]){
      for(const [title,torso,gloves,legs,boots] of [
        ['male',310041,320034,330036,340037],
        ['dress',310042,320035,0,340038]
      ]){
        const full=measure(torso,gloves,legs,boots,plus);
        const without=measure(torso,gloves,legs,0,plus);
        const boot=measure(0,0,0,boots,0);
        const empty=measure(0,0,0,0,0);
        combos.push({title,plus,fullLegs:full.legs,
          interaction:Object.fromEntries([18,49,148].map(stat=>[
            stat,full[stat]-without[stat]-boot[stat]+empty[stat]
          ]))});
      }
    }
    return combos;
  });
  for(const row of result){
    for(const stat of [18,49,148])
      expect(row.interaction[stat],row.title+' +'+row.plus+' stat '+stat).toBe(0);
    if(row.title==='dress')expect(row.fullLegs).toBe(0);
  }
});

test('outdated Astir set notes are absent from Modern item descriptions in every language',async({page})=>{
  await page.goto('/');
  await page.evaluate(data=>PandoraRemaked.catalog.applySnapshot(data),snapshot);
  const cases=await page.evaluate(()=>{
    const result=[];
    const localeToFlag={jp:0,en:1,ru:2,tw:0};
    for(const locale of ['ru','en','jp','tw']){
      PandoraRemaked.i18n.setLocale(locale);
      Flag[0]=localeToFlag[locale];
      for(const id of [310041,310042,310033]){
        const details=PandoraRemaked.adapter.readItemDetails('equipment',id,3);
        result.push({locale,id,description:details.descriptions.join('\\n'),source:EquipData[0][31][id%10000][2]});
      }
    }
    return result;
  });
  for(const {locale,id,description} of cases){
    expect(description,locale+' item '+id).toBeTruthy();
    expect(description,locale+' item '+id).not.toMatch(/セットで装備すると|set (?:of|bonus|features)|set of equipment|when equipped with|pant.*glov.*boot|[кК]омплект[а-я]* бонус/i);
  }
});

test('equipment and Soul previews have no obsolete Legacy 2.00 source footer',async({page})=>{
  await page.goto('/');
  await page.evaluate(data=>PandoraRemaked.catalog.applySnapshot(data),snapshot);
  await page.evaluate(()=>PandoraRemaked.search.openEquipmentSearch(3));
  const previews=page.locator('[data-remaked-item-description]');
  await expect(previews.first()).toBeAttached();
  await expect(previews.first()).not.toContainText('Legacy 2.00');
  await expect(page.locator('[data-remaked-item-description] small')).toHaveCount(0);
});



test('all 16 deprecated Astir notes are filtered per language without hiding valid edits or other sets',async({page})=>{
  await page.goto('/');
  await page.evaluate(data=>PandoraRemaked.catalog.applySnapshot(data),snapshot);
  const ids=[310031,310032,310033,310034,310035,310036,310037,310038,
    310039,310040,310041,310042,310094,310095,310096,310097];
  const baseline=await page.evaluate(ids=>{
    const result={};
    for(const language of ['ru','en','jp','tw']){
      PandoraRemaked.i18n.setLocale(language);
      Flag[0]={jp:0,en:1,ru:2,tw:0}[language];
      result[language]={};
      for(const id of ids){
        const v=PandoraRemaked.adapter.readItemDetails('equipment',id,3);
        result[language][id]=v?.descriptions.join('\n')||'';
      }
      const golden=PandoraRemaked.adapter.readItemDetails('equipment',310064,3);
      result[language].golden=golden?.descriptions.join('\n')||'';
    }
    return result;
  },ids);
  for(const lang of ['en','jp','tw','ru']){
    for(const id of ids){
      const text=baseline[lang][id];
      expect(text,lang+' '+id).toBeTruthy();
      expect(text,lang+' '+id).not.toMatch(/セットで装備すると|\bsets?\b|when equipped|and fitted|一組|一套|配備|並設置|並配|設備|和集/i);
    }
  }
  // A different, real Legacy full-set effect must NOT be silently removed.
  expect(baseline.jp.golden).toContain('セットで装備すると');

  const newNotes=await page.evaluate(payload=>{
    const version={...payload,revision:86,impactRevision:85,records:structuredClone(payload.records)};
    const coat=version.records.find(v=>v.engineId===310041);
    coat.notes.en='A new independent note for the Scarlet Coat.';
    coat.notes.jp='アスティアンの新しい説明文';
    const applied=PandoraRemaked.catalog.applySnapshot(version);
    const text={applied};
    for(const lang of ['en','jp','tw']){
      PandoraRemaked.i18n.setLocale(lang);
      Flag[0]={en:1,jp:0,tw:0}[lang];
      text[lang]=PandoraRemaked.adapter.readItemDetails('equipment',310041,3).descriptions.join('\n');
    }
    return text;
  },snapshot);
  expect(newNotes.applied).toBeTruthy();
  expect(newNotes.en).toContain('A new independent note for the Scarlet Coat.');
  expect(newNotes.jp).toContain('アスティアンの新しい説明文');
  expect(newNotes.tw).not.toMatch(/一組|一套|配備|並設置|並配|設備|和集/);
});
