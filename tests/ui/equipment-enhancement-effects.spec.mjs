import { test, expect } from '@playwright/test';
import path from 'node:path';
import { compileRecord, draftFromSource, validateDraft } from '../../admin-api/src/catalog-model.mjs';
import equipment from '../../data/generated/equipment.v1.json' with { type: 'json' };
import character from '../../data/generated/character.v1.json' with { type: 'json' };
import { baselineById, sourceIdentity } from '../../admin-api/src/catalog-baseline.mjs';
import { previewCandidate } from '../../scripts/audit_pandora_os_fire_update_preview.mjs';
import { previewReviewedPumpkinSoul } from '../../scripts/lib/reviewed-soul-preview.mjs';

const DIVINE_SET_RECORDS = [
  {
    "id": "equipment.30.70",
    "kind": "equipment",
    "category": 30,
    "index": 70,
    "engineId": 300070,
    "engineKey": "ディバインハット",
    "names": {
      "en": "Divine Hat",
      "ru": "Божественный шлем",
      "jp": "ディバインハット",
      "tw": "(神帽)"
    },
    "description": {
      "en": "A headpiece upon which a blessing has been placed. It boasts excellent defense and can block enemy magic attacks.DEX +1Charm Resistance +6Per every 3 enhancement levels:Skill Casting Speed +3%Accuracy +5",
      "ru": "Головной убор, на который наложено благословение. Обладает отличной защитой и может блокировать магические атаки врагов.ЛВК +1Сопротивляемость чарам +6За каждые 3 единицы улучшения:Скорость применения умений +3%Точность +5",
      "jp": "器用+1、魅了耐性+6%",
      "tw": "技巧+1¸ 魅惑抗性+6%"
    },
    "notes": {
      "en": "The value of each discipline +3¸ Accuracy +5¸ +3% casting speed",
      "ru": "",
      "jp": "鍛錬値+3毎に、命中+5、詠唱速度+3%",
      "tw": "每個學科的值+3¸準確 +5¸+3％施法速度"
    },
    "acquisition": {
      "en": "",
      "ru": "",
      "jp": "",
      "tw": ""
    },
    "modifiers": {
      "en": "",
      "ru": "",
      "jp": "",
      "tw": ""
    },
    "level": 40,
    "sockets": 0,
    "disabled": false,
    "calculationCode": "3=1_49=8_142=6",
    "compatibility": [
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      0,
      0,
      0,
      0,
      0,
      0,
      0
    ],
    "parameter6": 0,
    "soulParameters": [
      "",
      ""
    ],
    "trailing": ""
  },
  {
    "id": "equipment.31.66",
    "kind": "equipment",
    "category": 31,
    "index": 66,
    "engineId": 310066,
    "engineKey": "ディバインキュイラス",
    "names": {
      "en": "Divine Cuirass",
      "ru": "Божественная кираса",
      "jp": "ディバインキュイラス",
      "tw": "(神Kyuirasu)"
    },
    "description": {
      "en": "A consecrated cuirass. It excels at protecting against damage and can neutralize magical attacks.HP +100Charm Resistance +6%When enhanced to +5 or higher, grants the following bonuses for each level of enhancement: MP +40, Defense +4, and Cast Interruption Resistance +4%. When used together with the Divine Helm, Divine Bracers, Divine Greaves, and Divine Boots, the following effects are activated:MP +200Cast Interruption Resistance +12%Skill Cooldown -8%",
      "ru": "Освященная кираса. Отлично защищает от урона и способна нейтрализовать магические атаки.ОЗ +100Сопротивляемость чарам +6%При усовершенствовании до +5 и выше даёт следующие бонусы за каждую единицу усовершенствования: ОМ +40, защита +4 и сопротивляемость прерыванию чтения заклинаний +4%. При использовании с Божественным шлемом, Божественными нарукавниками, Божественными поножами и Божественными сапогами включаются следующие эффекты:ОМ +200Сопротивляемость прерыванию чтения заклинаний +12%Время перезарядки умений -8%",
      "jp": "LP+100、魅了耐性+6%",
      "tw": "LP+100¸ 魅惑抗性+6%"
    },
    "notes": {
      "en": "",
      "ru": "",
      "jp": "",
      "tw": ""
    },
    "acquisition": {
      "en": "",
      "ru": "",
      "jp": "",
      "tw": ""
    },
    "modifiers": {
      "en": "",
      "ru": "",
      "jp": "",
      "tw": ""
    },
    "level": 40,
    "sockets": 1,
    "disabled": false,
    "calculationCode": "6=100_49=16_142=6",
    "compatibility": [
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      0,
      0,
      0,
      0,
      0,
      0,
      0
    ],
    "parameter6": 0,
    "soulParameters": [
      "",
      ""
    ],
    "trailing": ""
  },
  {
    "id": "modern.equipment.10fa6b94-3b5c-4b66-a623-0a4a45bd2ce4",
    "kind": "equipment",
    "category": 32,
    "index": 106,
    "engineId": 320106,
    "engineKey": "Modern:modern.equipment.10fa6b94-3b5c-4b66-a623-0a4a45bd2ce4",
    "names": {
      "en": "Divine Bracers",
      "ru": "Божественные нарукавники",
      "jp": "",
      "tw": ""
    },
    "description": {
      "en": "Consecrated bracers with a high level of defense, allowing them to reduce the physical damage dealt to their wearer.Casting Interruption Resistance +3%Physical Damage Taken -2% and Healing Spell Effectiveness +2% per 3 levels of enhancementWhen used with the Sentinel Shield, the following effects are activated:Sta +2Attack +15% when attacking from behind.",
      "ru": "Освященные браслеты, обладающие высоким уровнем защиты, что позволяет им уменьшать физический урон, наносимый их владельцу.Сопротивляемость прерыванию чтения заклинаний +3%Снижение получаемого физического урона +2% и эффективность лечащих заклинаний +2% за каждые 3 единицы усовершенствованияПри использовании со щитом часового активируются следующие эффекты:ВЫН +2Атака +15% при атаке со спины.",
      "jp": "",
      "tw": ""
    },
    "notes": {
      "en": "",
      "ru": "",
      "jp": "",
      "tw": ""
    },
    "acquisition": {
      "en": "",
      "ru": "",
      "jp": "",
      "tw": ""
    },
    "modifiers": {
      "en": "",
      "ru": "",
      "jp": "",
      "tw": ""
    },
    "level": 40,
    "sockets": 0,
    "disabled": false,
    "calculationCode": "49=7_134=3",
    "compatibility": [
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      0,
      0,
      0,
      0,
      0,
      0,
      0
    ],
    "parameter6": "",
    "soulParameters": [
      "",
      ""
    ],
    "trailing": ""
  },
  {
    "id": "modern.equipment.3a3f900f-7e50-46a9-a6de-6a79ce236977",
    "kind": "equipment",
    "category": 33,
    "index": 99,
    "engineId": 330099,
    "engineKey": "Modern:modern.equipment.3a3f900f-7e50-46a9-a6de-6a79ce236977",
    "names": {
      "en": "Divine Aloub",
      "ru": "Божественные поножи",
      "jp": "",
      "tw": ""
    },
    "description": {
      "en": "Consecrated leggings. They possess excellent defensive properties and can block ordinary attacks.STA +1, INT +1Per every 3 enhancement levels:MP Cost Reduction +2%Magic Resistance +5",
      "ru": "Освященные поножи. Обладают отличными защитными свойствами и могут блокировать обычные атаки.ВЫН +1, ИНТ +1За каждые 3 единицы улучшения:Снижение расхода ОМ +2%Сопротивляемость магии +5",
      "jp": "",
      "tw": ""
    },
    "notes": {
      "en": "",
      "ru": "",
      "jp": "",
      "tw": ""
    },
    "acquisition": {
      "en": "",
      "ru": "",
      "jp": "",
      "tw": ""
    },
    "modifiers": {
      "en": "",
      "ru": "",
      "jp": "",
      "tw": ""
    },
    "level": 40,
    "sockets": 1,
    "disabled": false,
    "calculationCode": "0=1_5=1_49=15",
    "compatibility": [
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      0,
      0,
      0,
      0,
      0,
      0,
      0
    ],
    "parameter6": "",
    "soulParameters": [
      "",
      ""
    ],
    "trailing": ""
  },
  {
    "id": "equipment.34.72",
    "kind": "equipment",
    "category": 34,
    "index": 72,
    "engineId": 340072,
    "engineKey": "ディバインブーツ",
    "names": {
      "en": "Divine Boots",
      "ru": "Божественные сапоги",
      "jp": "ディバインブーツ",
      "tw": "(神靴)"
    },
    "description": {
      "en": "Exceptionally durable boots that protect the owner from damage superbly.Spi +1Healing Item Effect +1%Spi +1, Healing Spell Effect +2%, and MP Recovery Rate +3% per 3 levels of enhancement",
      "ru": "Прочнейшие башмаки, которые отлично защищают владельца от уронаСД +1Эффект от лечащих предметов +1%СД +1, эффект от лечащих заклинаний +2% и скорость восстановления ОМ +3% за каждые 3 единицы усовершенствования",
      "jp": "霊感+1、LP回復スキルの効果量+1%",
      "tw": "靈感+1¸ HP恢復技能的效果+1%"
    },
    "notes": {
      "en": "The value of each discipline +3 +1 Inspiration¸ recovery skill effect size 2% LP¸ +3% MP recovery rate",
      "ru": "",
      "jp": "鍛錬値+3毎に、霊感+1、LP回復スキルの効果量+2%、MP回復速度+3%",
      "tw": "每個學科的值+3 +1啟示¸恢復技能效果大小為 2％LP¸MP恢復速度+3％"
    },
    "acquisition": {
      "en": "",
      "ru": "",
      "jp": "",
      "tw": ""
    },
    "modifiers": {
      "en": "",
      "ru": "",
      "jp": "",
      "tw": ""
    },
    "level": 40,
    "sockets": 0,
    "disabled": false,
    "calculationCode": "4=1_11=1_49=7",
    "compatibility": [
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      0,
      0,
      0,
      0,
      0,
      0,
      0
    ],
    "parameter6": 0,
    "soulParameters": [
      "",
      ""
    ],
    "trailing": ""
  }
];

function publication(records) {
  return {
    ok: true,
    schemaVersion: 1,
    sourceFingerprint: equipment.metadata.generated_from[0].sha256,
    characterSourceFingerprint: character.sourceFingerprint,
    revision: 85,
    impactRevision: 85,
    records
  };
}

test('observed Spark Wand stats remain correct at every fire refinement level', async ({page}) => {
  const candidate={kind:'equipment',serverId:2652,category:12,names:{en:'Spark Wand',ru:'Огненный жезл искр'},
    forth:Object.fromEntries([7,8,9,10].map(level=>[level,[{func:'EP_FIRE_RESISTANCE_CONST',a:(level-6)*4,b:0}]])),source:{
    itemKind:'WAND',level:40,sockets:2,W:36,
    descriptionEn:'When enhanced with a Fire Gem, starting at +7, per enhancement level:<br>SPI +1<br>Fire magic resistance +4',
    descriptionRu:'Закалка самоцветом огня, начиная с +7 и за каждый уровень:<br>СД +1<br>Сопротивляемость магии огня +4',
    effects:[{func:'EP_INTELIGENCE_CONST',a:4},{func:'EP_SPIRITUAL_CONST',a:3},{func:'EP_IMMUNE_BURN',a:5},{func:'EP_VITARITY_CONST',a:2},
      {func:'EP_SKILL_BENCH',a:-5}],
    classes:{CLERIC:1}}};
  const record=previewCandidate(candidate,baselineById.get('equipment.12.12')).syntheticCandidate;
  // Isolate the weapon from the independently modelled Inspiration passive.
  const passiveSource=baselineById.get('skill_entry.12.1'),passiveId=sourceIdentity(passiveSource);
  const passiveEdit=draftFromSource(passiveSource,'passive');passiveEdit.intrinsicEffectMode='replace';
  const passive=compileRecord(validateDraft(passiveEdit,passiveId),passiveId,passiveSource);
  await page.goto('/');
  const results=await page.evaluate(({record,snapshot,isolated})=>{
    PandoraRemaked.catalog.applySnapshot(snapshot);
    document.getElementById('SelRace').selectedIndex=1;document.getElementById('SelRace').onchange();
    document.getElementById('SelJob').selectedIndex=16;document.getElementById('SelJob').onchange();
    StatusMove('Lev',45-Status.Lev[0]);CalcSet('Lev');Reset('Equip');Reset('Status');
    StatusMove('Status','INT',90);StatusMove('Status','DEX',26);StatusMove('Status','SPR',22);CalcSet('ALL');
    const nativeSpr=Status.SPR[0]+Status.SPR[1]+Status.SPR[2];
    PandoraRemaked.catalog.applySnapshot(isolated);CalcSet('ALL');
    const snapshotStats=()=>Object.fromEntries(['STA','STR','AGI','DEX','SPR','INT'].map(name=>[name,Status[name][0]+Status[name][1]+Status[name][2]]));
    const unequipped=snapshotStats(), rows=[];
    for(const [gemType,element,plus] of [[0,0,0],[0,0,6],[0,0,7],[1,0,7],[0,0,8],[0,0,9],[0,0,10],[0,1,10]]){
      Status.Equip[0]=[record.engineId,gemType,element,plus,0,0,0];EquipCheck();
      const stats=snapshotStats(),delta=Object.fromEntries(Object.keys(stats).map(name=>[name,stats[name]-unequipped[name]]));
      rows.push({gemType,element,plus,delta,fireResistance:(EquipOpt[138]||[]).reduce((sum,n)=>sum+Number(n),0),
        cooldown:(EquipOpt[79]||[]).reduce((sum,n)=>sum+Number(n),0)});
    }
    return {nativeSpr,unequipped,rows};
  },{record,snapshot:publication([record]),isolated:{...publication([record,passive]),revision:86,impactRevision:86}});
  expect(results.nativeSpr).toBe(32);
  expect(results.unequipped).toEqual({STA:3,STR:5,AGI:5,DEX:30,SPR:30,INT:99});
  expect(results.rows.map(row=>row.delta.STA)).toEqual([2,2,2,2,2,2,2,2]);
  expect(results.rows.map(row=>row.delta.INT)).toEqual([4,4,4,4,4,4,4,4]);
  expect(results.rows.map(row=>row.delta.SPR)).toEqual([3,3,4,4,5,6,7,3]);
  expect(results.rows.map(row=>row.fireResistance)).toEqual([0,0,4,4,8,12,16,0]);
  expect(results.rows.map(row=>row.cooldown)).toEqual([-5,-5,-5,-5,-5,-5,-5,-5]);
  expect(results.rows.every(row=>row.delta.STR===0&&row.delta.AGI===0&&row.delta.DEX===0)).toBe(true);
});

test('Volcano Staff preview uses INT, fire refinement and its own Phoenix chance',async({page})=>{
  const candidate={kind:'equipment',serverId:2852,category:13,names:{en:'Volcano Staff',ru:'Огненный посох вулкана'},
    forth:Object.fromEntries([7,8,9,10].map(level=>[level,[{func:'EP_INTELIGENCE_CONST',a:level-6,b:0}]])),source:{
    itemKind:'STAFF',level:40,sockets:2,W:48,
    descriptionRu:'Закалка самоцветом огня, начиная с +7 и за каждый уровень:<br>ИНТ +1<br>+3% шанс призвать Пламя феникса<br>Пламя феникса: 25 урона + 25% от ИНТ, не чаще 1 раза в 5 секунд.<br>Каждое следующее улучшение +25 и 25% от ИНТ и сокращает откат на 1 секунду.',
    descriptionEn:'When enhanced with a Fire Gem, starting at +7, per enhancement level:<br>INT +1<br>+3% chance to summon Phoenix Flame<br>Phoenix Flame: 25 damage + 25% of INT, at most 1 activation every 5 seconds.<br>Each further enhancement adds +25 damage and 25% of INT and reduces the cooldown by 1 second.',
    effects:[{func:'EP_INTELIGENCE_CONST',a:6},{func:'EP_DEXTERITY_CONST',a:4},{func:'EP_SPIRITUAL_CONST',a:4},
      {func:'EP_ELEMENT_DAMAGE_SCALE',a:20},{func:'EP_IMMUNE_BURN',a:5}],classes:{MAGE:1}}};
  const record=previewCandidate(candidate,baselineById.get('equipment.13.9')).syntheticCandidate;
  await page.goto('/');
  const result=await page.evaluate(({record,snapshot})=>{
    PandoraRemaked.catalog.applySnapshot(snapshot);
    const rows=[];
    for(const [element,plus] of [[0,0],[0,6],[0,7],[0,8],[0,9],[0,10],[1,10]]){
      Status.Equip[0]=[record.engineId,0,element,plus,0,0,0];EquipCheck();
      const sum=id=>(EquipOpt[id]||[]).reduce((total,n)=>total+Number(n),0);
      const special=PandoraRemaked.enhancementEffects.currentWeaponProcs().find(row=>row.kind==='special_magic_damage');
      rows.push({plus,element,int:sum(5),dex:sum(3),spr:sum(4),magic:sum(42),burnRes:sum(148),
        values:PandoraRemaked.enhancementEffects.specialProcValues(special.rule,special.state)});
    }return rows;
  },{record,snapshot:publication([record])});
  expect(result.map(row=>row.int)).toEqual([6,6,7,8,9,10,6]);
  expect(result.every(row=>row.dex===4&&row.spr===4&&row.magic===20&&row.burnRes===5)).toBe(true);
  expect(result.map(row=>row.values?.chance||0)).toEqual([0,0,3,6,9,12,0]);
  expect(result.slice(2,6).map(row=>row.values.cooldown)).toEqual([5,4,3,2]);
  expect(result.slice(2,6).map(row=>[row.values.damage,row.values.statPercent])).toEqual([[25,25],[50,50],[75,75],[100,100]]);
});

test('special weapon effects have an independent attack page and update with equipment, stats and locale', async ({page}) => {
  const identity={id:'modern.equipment.phoenix-test',kind:'equipment',category:0,index:852};
  const edit=draftFromSource(null,'equipment');edit.id=identity.id;edit.category=0;edit.baseAttack=62;edit.names.en='Flameblade';
  edit.procEffects=[{kind:'burn',chance:2,from:7,every:1,to:10,gemElement:'fire'},
    {kind:'special_magic_damage',names:{en:'Phoenix Flame',ru:'Пламя феникса',jp:'',tw:''},
      chance:5,chanceStep:5,from:7,every:1,to:10,gemElement:'fire',damageStat:'STR',
      baseDamage:25,damageStep:25,statPercent:25,statPercentStep:25,cooldownSeconds:5,cooldownReduction:1}];
  const record=compileRecord(validateDraft(edit,identity),identity,null);
  await page.goto('/');
  await page.evaluate(({record,snapshot})=>{
    PandoraRemaked.catalog.applySnapshot(snapshot);PandoraRemaked.i18n.setLocale('ru');
    Status.Equip[0]=[record.engineId,0,0,7,0,0,0];EquipCheck();
  },{record,snapshot:publication([record])});
  await page.locator('[data-remaked-tab="2"]').click();
  const attackLabels=await page.evaluate(()=>Array.from(document.querySelectorAll('#ATKView [id^="TextATK_"]')).map(element=>element.textContent));
  expect(attackLabels).toHaveLength(54);
  expect(attackLabels.filter(label=>!/[А-Яа-яЁё]/.test(label) || /[A-Za-z]/.test(label))).toEqual([]);
  const stats=page.locator('[data-attack-page="stats"]'),special=page.locator('[data-attack-page="special"]'),panel=page.locator('[data-remaked-special-effects]');
  await expect(stats).toHaveAttribute('aria-pressed','true');
  await expect(page.locator('[data-remaked-weapon-procs]')).toContainText('ожога');
  await special.click();await expect(special).toHaveAttribute('aria-pressed','true');
  await expect(panel).toContainText('Пламя феникса');await expect(panel).toContainText('Шанс: 5%');
  await expect(panel).toContainText('Перезарядка: 5 с');await expect(panel).toContainText('Основа: 25 + 25% от СИЛ');
  await expect(page.locator('#ATKView')).toBeHidden();
  if(process.env.PANDORA_UI_EVIDENCE_DIR) await page.screenshot({path:path.join(process.env.PANDORA_UI_EVIDENCE_DIR,'attack-special-desktop.png')});
  await page.setViewportSize({width:390,height:844});
  await expect(panel).toBeVisible();
  const box=await panel.boundingBox();expect(box.x).toBeGreaterThanOrEqual(0);expect(box.x+box.width).toBeLessThanOrEqual(390);
  expect(await panel.evaluate(element=>element.scrollWidth<=element.clientWidth)).toBe(true);
  if(process.env.PANDORA_UI_EVIDENCE_DIR) await page.screenshot({path:path.join(process.env.PANDORA_UI_EVIDENCE_DIR,'attack-special-mobile.png')});
  await page.setViewportSize({width:1280,height:720});
  await page.evaluate(()=>{Status.Equip[0][3]=10;EquipCheck();});
  await expect(panel).toContainText('Шанс: 20%');await expect(panel).toContainText('Основа: 100 + 100% от СИЛ');
  await expect(panel).toContainText('Перезарядка: 2 с');
  const before=await page.evaluate(()=>Status.STR.slice(0,3).reduce((a,b)=>a+Number(b),0));
  await page.evaluate(()=>{Status.STR[1]+=1;Calc('STR');});
  await expect(panel).toContainText('СИЛ ('+(before+1)+')');
  await page.evaluate(()=>{Status.Equip[0][2]=1;EquipCheck();});
  await expect(panel).toContainText('Неактивен');
  await page.evaluate(()=>PandoraRemaked.i18n.setLocale('jp'));
  await expect(panel).toContainText('Phoenix Flame');
  await page.evaluate(()=>{Status.Equip[0]=[0,0,0,0,0,0,0];EquipCheck();});
  await expect(panel).toContainText('no special effects');
  await stats.click();await expect(page.locator('#ATKView')).toBeVisible();
});

test('replacing historical fire-weapon refinement does not leak native bonuses and can restore old behavior',async({page})=>{
  const source=baselineById.get('equipment.0.13'), identity=sourceIdentity(source);
  const edit=draftFromSource(source,'equipment');edit.nativeUpgradePolicy='replace-legacy-fire-weapon';
  const record=compileRecord(validateDraft(edit,identity),identity,source);
  await page.goto('/');
  const results=await page.evaluate(({record,snapshot})=>{
    const scan=()=>[4,5,6,7,10].map(plus=>{
      Status.Equip[0]=[record.engineId,0,0,plus,0,0,0];EquipCheck();
      const row=[(EquipOpt[152]||[]).reduce((sum,n)=>sum+Number(n),0),(EquipOpt[89]||[]).reduce((sum,n)=>sum+Number(n),0)];
      EquipCheck();return [row,[(EquipOpt[152]||[]).reduce((sum,n)=>sum+Number(n),0),(EquipOpt[89]||[]).reduce((sum,n)=>sum+Number(n),0)]];
    });
    PandoraRemaked.catalog.useRevision(0);const old=scan();
    PandoraRemaked.catalog.applySnapshot(snapshot);const replaced=scan();
    PandoraRemaked.catalog.useRevision(0);const restored=scan();
    return {old,replaced,restored};
  },{record,snapshot:publication([record])});
  expect(results.old.map(row=>row[0])).toEqual([[0,0],[8,1],[10,3],[15,6],[32,35]]);
  expect(results.replaced.map(row=>row[0])).toEqual([[0,0],[0,0],[0,0],[0,0],[0,0]]);
  expect(results.restored).toEqual(results.old);
  expect(results.replaced.every(row=>JSON.stringify(row[0])===JSON.stringify(row[1]))).toBe(true);
});

function customEquipment(category, index, name, effects = [], extra = {}) {
  const id = { id: 'modern.equipment.test-' + category + '-' + index, kind: 'equipment', category, index };
  const edit = draftFromSource(null, 'equipment');
  Object.assign(edit, {
    id: id.id,
    category,
    names: { en: name, ru: name, jp: '', tw: '' },
    level: extra.level ?? 40,
    sockets: extra.sockets ?? 0,
    baseAttack: extra.baseAttack ?? null,
    effects
  });
  return compileRecord(validateDraft(edit, id), id, null);
}

test('disease and madness resistance from equipment affect the correct defense results',async({page})=>{
  const record=customEquipment(33,850,'Resistance test',[
    {stat:157,unit:'flat',value:5},{stat:161,unit:'flat',value:5}]);
  await page.goto('/');await page.locator('[data-remaked-tab="3"]').click();
  const result=await page.evaluate(({record,snapshot})=>{
    PandoraRemaked.catalog.applySnapshot(snapshot);
    const read=()=>[157,161].map(id=>Number(document.getElementById('Status_'+id).textContent));
    const before=read();Status.Equip[5]=[record.engineId,0,0,0,0,0,0];EquipCheck();
    const equipped=read();Status.Equip[5]=[0,0,0,0,0,0,0];EquipCheck();
    return {before,equipped,after:read()};
  },{record,snapshot:publication([record])});
  expect(result.equipped.map((value,index)=>value-result.before[index])).toEqual([5,5]);
  expect(result.after).toEqual(result.before);
});

test('reviewed Pumpkin Soul keeps its saved ID, localized names and stat effects',async({page})=>{
  const source={id:103023,name:'Тыквенная душа',slots:['body'],desc:'Сопротивляемость магии тьмы +5, СД +1.',
    effects:[{func:'EP_DARK_RESISTANCE_CONST',a:5},{func:'EP_SPIRITUAL_CONST',a:1}]};
  const plan=previewReviewedPumpkinSoul({source,english:{n:'Soul of the Pumpkin',d:'SPI +1 Dark Resistance +5%'},
    catalog:{ok:true,revision:85,records:[]},sourceHashes:{snapshot:'a'.repeat(64)},
    privateState:{revision:85,dirtyCatalogDraft:false,localizationDrafts:[],localizationOverrides:[],legacyOverrides:[]}});
  const original=baselineById.get('soul.28'),identity=sourceIdentity(original);
  const record=compileRecord(validateDraft(plan.edit,identity),identity,original);
  const armor=equipment.records.find(row=>row.legacy_category_id===31&&row.legacy_item_index>0&&row.soul_socket_count>0);
  await page.goto('/');
  await page.evaluate(snapshot=>PandoraRemaked.catalog.applySnapshot(snapshot),publication([record]));
  const info={};for(const lang of ['ru','en','jp','tw']){
    await page.locator('[data-remaked-ui-locale="'+lang+'"]').click();
    info[lang]=await page.evaluate(()=>PandoraRemaked.adapter.readItemDetails('soul',28).name);
  }
  const result=await page.evaluate(({armorId})=>{
    Status.Equip[3]=[armorId,0,0,0,0,0,0];EquipCheck();
    const totals=()=>[4,144].map(id=>(EquipOpt[id]||[]).reduce((sum,n)=>sum+Number(n),0));
    const before=totals();Status.Equip[3][4]=28;EquipCheck();const withSoul=totals();
    const saved=PandoraRemaked.adapter.serialize();Status.Equip[3][4]=0;EquipCheck();const after=totals();
    PandoraRemaked.adapter.load(saved);
    return {before,withSoul,after,restoredSoul:Status.Equip[3][4],restored:totals()};
  },{armorId:armor.legacy_id});
  expect(info).toEqual({ru:'Тыквенная душа',en:'Soul of the Pumpkin',jp:'カボチャの魂',tw:'(南瓜的魂魄)'});
  expect(result.withSoul.map((value,index)=>value-result.before[index])).toEqual([1,5]);
  expect(result.after).toEqual(result.before);expect(Number(result.restoredSoul)).toBe(28);expect(result.restored).toEqual(result.withSoul);
});

async function equipAndMeasure(page, engineId, plus) {
  return page.evaluate(({ engineId, plus }) => {
    Status.Equip[0] = [engineId, 0, 0, plus, 0, 0, 0];
    EquipCheck();
    const sum = stat => (EquipOpt[stat] || []).reduce((total, token) => total + Number(String(token).replace('%', '')), 0);
    return {
      agiEquipmentBonus: Status.AGI[2],
      attackSpeed: Number(document.getElementById('Status_73').textContent),
      attackSpeedOptions: [...(EquipOpt[73] || [])],
      agiOptions: [...(EquipOpt[2] || [])],
      attackSpeedOptionTotal: sum(73)
    };
  }, { engineId, plus });
}


test('all six inherited Astir refinement rules match current milestone snapshots without Legacy double counting', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(snapshot => PandoraRemaked.catalog.applySnapshot(snapshot), publication([]));
  const scan = await page.evaluate(() => {
    const cases = [
      { id: 310031, slot: 3, values: { 6: [0, 75, 150], 145: [0, 5, 5] } },
      { id: 310035, slot: 3, values: { 77: [0, 2, 5] } },
      { id: 310032, slot: 3, values: { 6: [0, 75, 150], 145: [0, 5, 5], 52: [0, -1, -3] } },
      { id: 310036, slot: 3, values: { 77: [0, 2, 5], 79: [0, -2, -5] } },
      { id: 330031, slot: 5, values: { 52: [0, -1, -3] } },
      { id: 330035, slot: 5, values: { 79: [0, -2, -5] } }
    ];
    const original = Status.Equip.map(slot => [...slot]);
    const result = [];
    for (const entry of cases) {
      const values = [];
      for (const plus of [0, 5, 10]) {
        for (let i = 0; i < Status.Equip.length; i++)
          Status.Equip[i] = [0, 0, 0, 0, 0, 0, 0];
        Status.Equip[entry.slot] = [entry.id, 0, 0, plus, 0, 0, 0];
        EquipCheck();
        const totals = Object.fromEntries(Object.keys(entry.values).map(stat => [
          stat, (EquipOpt[stat] || []).reduce((sum, token) =>
            sum + Number(String(token).replace('%', '')), 0)
        ]));
        EquipCheck();
        const again = Object.fromEntries(Object.keys(entry.values).map(stat => [
          stat, (EquipOpt[stat] || []).reduce((sum, token) =>
            sum + Number(String(token).replace('%', '')), 0)
        ]));
        values.push({ totals, again });
      }
      result.push({ entry, values });
    }
    for (let i = 0; i < original.length; i++) Status.Equip[i] = original[i];
    return result;
  });
  for (const { entry, values } of scan) {
    for (const [stat, expected] of Object.entries(entry.values)) {
      const base = values[0].totals[stat];
      for (let i = 0; i < expected.length; i++) {
        expect(values[i].totals[stat] - base,
          'Astir engine ' + entry.id + ' stat ' + stat + ' milestone ' + [0,5,10][i])
          .toBe(expected[i]);
        expect(values[i].again).toEqual(values[i].totals);
      }
    }
  }
});

test('Robust War Crossbow follows the live +2/+4/+6/+7 enhancement thresholds', async ({ page }) => {
  const crossbow = customEquipment(9, 19, 'War Crossbow D', [{ stat: 2, unit: 'flat', value: 1 }], {
    baseAttack: 70,
    sockets: 2
  });
  expect(crossbow.engineId).toBe(90019);

  await page.goto('/');
  await page.evaluate(snapshot => PandoraRemaked.catalog.applySnapshot(snapshot), publication([crossbow]));

  const p0 = await equipAndMeasure(page, crossbow.engineId, 0);
  const p2 = await equipAndMeasure(page, crossbow.engineId, 2);
  const p4 = await equipAndMeasure(page, crossbow.engineId, 4);
  const p6 = await equipAndMeasure(page, crossbow.engineId, 6);
  const p7 = await equipAndMeasure(page, crossbow.engineId, 7);
  const p8 = await equipAndMeasure(page, crossbow.engineId, 8);

  expect(p2.attackSpeedOptionTotal - p0.attackSpeedOptionTotal).toBe(2);
  expect(p4.attackSpeedOptionTotal - p0.attackSpeedOptionTotal).toBe(4);
  expect(p6.attackSpeedOptionTotal - p0.attackSpeedOptionTotal).toBe(6);
  expect(p7.attackSpeedOptionTotal - p0.attackSpeedOptionTotal).toBe(6);
  expect(p8.attackSpeedOptionTotal - p0.attackSpeedOptionTotal).toBe(8);

  expect(p0.agiEquipmentBonus).toBe(1);
  expect(p6.agiEquipmentBonus).toBe(1);
  expect(p7.agiEquipmentBonus).toBe(2);
  expect(p8.agiEquipmentBonus).toBe(2);

  expect(p2.attackSpeed).toBeGreaterThan(p0.attackSpeed);
  expect(p4.attackSpeed).toBeGreaterThanOrEqual(p2.attackSpeed + 2);
  expect(p6.attackSpeed).toBeGreaterThanOrEqual(p4.attackSpeed + 2);
});

test('Strong War Crossbow grants its full +2 enhancement stat at +7', async ({ page }) => {
  const crossbow = customEquipment(9, 21, 'War Crossbow S', [{ stat: 2, unit: 'flat', value: 1 }], {
    baseAttack: 75,
    sockets: 1
  });
  expect(crossbow.engineId).toBe(90021);

  await page.goto('/');
  await page.evaluate(snapshot => PandoraRemaked.catalog.applySnapshot(snapshot), publication([crossbow]));
  const p6 = await equipAndMeasure(page, crossbow.engineId, 6);
  const p7 = await equipAndMeasure(page, crossbow.engineId, 7);
  expect(p6.agiEquipmentBonus).toBe(1);
  expect(p7.agiEquipmentBonus).toBe(3);
});

test('retained native enhancement-ranged Souls use the host item level exactly once', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(snapshot => PandoraRemaked.catalog.applySnapshot(snapshot), publication([]));
  const result = await page.evaluate(() => {
    const sum = stat => (EquipOpt[stat] || []).reduce((total, token) => total + Number(String(token).replace('%', '')), 0);

    Status.Equip[2] = [0, 0, 0, 7, 164, 0, 0];
    EquipCheck();
    const parade7 = sum(160);
    Status.Equip[2] = [0, 0, 0, 8, 164, 0, 0];
    EquipCheck();
    const parade8 = sum(160);

    Status.Equip[3] = [0, 0, 0, 7, 163, 0, 0];
    Status.Equip[2] = [0, 0, 0, 0, 0, 0, 0];
    EquipCheck();
    const mirror7 = sum(135);
    Status.Equip[3] = [0, 0, 0, 8, 163, 0, 0];
    EquipCheck();
    const mirror8 = sum(135);

    return { parade7, parade8, mirror7, mirror8 };
  });
  expect(result.parade7).toBe(25);
  expect(result.parade8).toBe(50);
  expect(result.mirror7).toBe(3);
  expect(result.mirror8).toBe(5);
});

test('server unison set effects work even when members use Modern-only identities', async ({ page }) => {
  const records = DIVINE_SET_RECORDS;
  const ids = Object.fromEntries(records.map(r => [r.category, r.engineId]));

  await page.goto('/');
  await page.evaluate(snapshot => PandoraRemaked.catalog.applySnapshot(snapshot), publication(records));
  const result = await page.evaluate(ids => {
    Status.Equip[2] = [ids[30], 0, 0, 0, 0, 0, 0];
    Status.Equip[3] = [ids[31], 0, 0, 5, 0, 0, 0];
    Status.Equip[4] = [ids[32], 0, 0, 0, 0, 0, 0];
    Status.Equip[5] = [ids[33], 0, 0, 0, 0, 0, 0];
    Status.Equip[6] = [ids[34], 0, 0, 0, 0, 0, 0];
    EquipCheck();
    const values = stat => [...(EquipOpt[stat] || [])].map(String);
    return {
      mp: values(7),
      armor: values(49),
      castInterrupt: values(134),
      cooldown: values(79)
    };
  }, ids);

  expect(result.mp).toContain('200');
  expect(result.mp).toContain('40');
  expect(result.armor).toContain('4');
  expect(result.castInterrupt).toContain('12');
  expect(result.castInterrupt).toContain('4');
  expect(result.cooldown).toContain('-8');
});

test('safe omitted base stats are visible in the retained calculator', async ({ page }) => {
  const bullseye = customEquipment(30, 111, 'Bullseye Cap', [{ stat: 3, unit: 'flat', value: 1 }, { stat: 49, unit: 'flat', value: 7 }]);
  const cloak = customEquipment(35, 50, "Novice's Cloak");
  const earring = customEquipment(40, 61, "Priest's Earring");

  await page.goto('/');
  await page.evaluate(snapshot => PandoraRemaked.catalog.applySnapshot(snapshot), publication([bullseye, cloak, earring]));
  const result = await page.evaluate(ids => {
    Status.Equip[2] = [ids.bullseye, 0, 0, 0, 0, 0, 0];
    Status.Equip[7] = [ids.cloak, 0, 0, 0, 0, 0, 0];
    Status.Equip[8] = [ids.earring, 0, 0, 0, 0, 0, 0];
    EquipCheck();
    return {
      accuracyTokens: [...(EquipOpt[62] || [])],
      townMoveTokens: [...(EquipOpt[75] || [])],
      expTokens: [...(EquipOpt[82] || [])],
      auraTokens: [...(EquipOpt[33] || [])]
    };
  }, { bullseye: bullseye.engineId, cloak: cloak.engineId, earring: earring.engineId });

  expect(result.accuracyTokens).toContain('10%');
  expect(result.townMoveTokens).toContain('15');
  expect(result.expTokens).toContain('5');
  expect(result.auraTokens).toContain('2');
});

test('Priest earring replaces its built-in aura bonus without stacking and restores old revisions',async({page})=>{
  const id={id:'modern.equipment.ac383fab-00a9-45ff-a09a-b2192c47ef5d',kind:'equipment',category:40,index:61};
  const edit=draftFromSource(null,'equipment');edit.id=id.id;edit.category=40;edit.names.en="Priest's Earring";
  edit.effects=[{stat:49,unit:'flat',value:1}];
  const old=compileRecord(validateDraft(edit,id),id,null);
  edit.nativeBasePolicy='replace-priest-earring-aura';edit.effects.push({stat:33,unit:'flat',value:3});
  const changed=compileRecord(validateDraft(edit,id),id,null);
  edit.effects.pop();const disabled=compileRecord(validateDraft(edit,id),id,null);
  await page.goto('/');
  const result=await page.evaluate(({old,changed,disabled,pub})=>{
    const apply=(record,rev)=>{PandoraRemaked.catalog.applySnapshot({...pub,revision:rev,impactRevision:rev,records:[record]});EquipCheck();Flag[2]=3;Calc('DAMAura');return {tokens:[...(EquipOpt[33]||[])],light:document.getElementById('Status_38').textContent};};
    PandoraRemaked.catalog.applySnapshot({...pub,records:[old]});
    Status.Equip[8]=[old.engineId,0,0,0,0,0,0];Flag['15_8']=1;document.getElementById('InBuff_0').value='0';
    const before=apply(old,85),after=apply(changed,86),none=apply(disabled,87),restored=apply(old,85);
    return {before,after,none,restored};
  },{old,changed,disabled,pub:publication([old])});
  expect(result.before.tokens).toEqual(['2']);expect(result.after.tokens).toEqual(['3']);
  expect(result.none.tokens).toEqual([]);expect(result.restored).toEqual(result.before);
  expect(Number(result.after.light)-Number(result.before.light),JSON.stringify(result)).toBe(1);
  expect(Number(result.before.light)-Number(result.none.light)).toBe(2);
});


test('existing/new gear adds enhancement bonuses on top of baseline without double-counting',async({page})=>{
  const rule={stat:11,unit:'flat',value:1,from:2,every:2,to:10};
  const id={id:'modern.equipment.2f65c193-bda8-4c62-9a9a-5d5d4d4a74fa',kind:'equipment',category:35,index:850};
  const edit=draftFromSource(null,'equipment');
  edit.id=id.id;edit.category=35;edit.names={en:'Healer Cloak',ru:'Плащ лекаря',jp:'治療者のマント',tw:'治療者披風'};
  edit.upgradeBonuses=[rule];
  const created=compileRecord(validateDraft(edit,id),id,null);
  const source=equipment.records.find(item=>item.legacy_category_id===35&&item.legacy_item_index>0);
  expect(source).toBeTruthy();
  const existingIdentity={id:source.id,kind:'equipment',category:35,index:source.legacy_item_index};
  const existingEdit=draftFromSource(source,'equipment');
  existingEdit.upgradeBonuses=[rule];
  const modified=compileRecord(validateDraft(existingEdit,existingIdentity),existingIdentity,source);
  expect(modified.calculationCode).toBe(source.calculation_code);
  expect(created.names.tw).toBe('治療者披風');

  const plain=[created,modified].map(record=>{
    const copy=structuredClone(record);delete copy.upgradeBonuses;return copy;
  });
  const collect=async records=>{
    await page.goto('/');
    await page.evaluate(snapshot=>PandoraRemaked.catalog.applySnapshot(snapshot),publication(records));
    return page.evaluate(ids=>{
      const scan=id=>{
        const output={};
        for(const level of [0,1,2,3,4,6,8,10]){
          Status.Equip[7]=[id,0,0,level,0,0,0];
          EquipCheck();
          const tokens=()=>[...(EquipOpt[11]||[])].map(String);
          const first=tokens();
          EquipCheck();
          const second=tokens();
          output[level]={first,second,slots:Status.Equip.map(state=>[Number(state[0]),Number(state[3])])};
        }
        return output;
      };
      return {created:scan(ids.created),existing:scan(ids.existing),
        formula:[0,1,2,3,4,6,8,10].map(level=>PandoraRemaked.enhancementEffects.enhancementRuleValue(ids.rule,level))};
    },{created:created.engineId,existing:modified.engineId,rule});
  };
  const baseline=await collect(plain);
  const withBonus=await collect([created,modified]);
  expect(withBonus.formula).toEqual([0,0,1,1,2,3,4,5]);
  const sum=list=>list.reduce((total,v)=>total+Number(v.replace('%','')),0);
  for(const kind of ['created','existing']){
    for(const level of [0,1,2,3,4,6,8,10]){
      const base=baseline[kind][level],after=withBonus[kind][level];
      const delta=sum(after.first)-sum(base.first);
      expect(delta,kind+' +'+level+' got '+JSON.stringify(after.first)+' vs '+JSON.stringify(base.first)+' equipped '+JSON.stringify(after.slots))
        .toBe(withBonus.formula[[0,1,2,3,4,6,8,10].indexOf(level)]);
      expect(after.second,kind+' duplicated after repeated EquipCheck at +'+level).toEqual(after.first);
    }
  }
});

test('gem-specific refinement uses the equipped element, survives repeated checks and saved builds',async({page})=>{
  const id={id:'modern.equipment.2f65c193-bda8-4c62-9a9a-5d5d4d4a74fb',kind:'equipment',category:0,index:851};
  const edit=draftFromSource(null,'equipment');edit.id=id.id;edit.category=0;edit.baseAttack=10;edit.names.en='Conditional sword';
  edit.upgradeBonuses=[{stat:11,unit:'flat',value:1,from:7,every:1,to:10},
    {stat:11,unit:'flat',value:3,from:7,every:1,to:10,gemElement:'fire'},
    {stat:43,unit:'flat',value:1,from:7,every:1,to:10,gemElement:'fire'}];
  edit.procEffects=[{kind:'burn',chance:5},{kind:'burn',chance:2,from:7,every:1,to:10,gemElement:'fire'}];
  const record=compileRecord(validateDraft(edit,id),id,null);
  await page.goto('/');
  await page.locator('[data-remaked-tab="2"]').click();
  const results=await page.evaluate(({record,snapshot})=>{
    const oldPin=PandoraRemaked.adapter.serialize();
    PandoraRemaked.catalog.applySnapshot(snapshot);
    const rows=[];
    for(const [element,plus] of [[0,6],[0,7],[0,8],[1,8],[6,8],[0,10]]){
      Status.Equip[0]=[record.engineId,0,element,plus,0,0,0];
      EquipCheck();const first=(EquipOpt[11]||[]).map(String);
      EquipCheck();const second=(EquipOpt[11]||[]).map(String);
      rows.push({element,plus,first,second,fireMagic:Number(document.getElementById('Status_43').textContent),
        procs:PandoraRemaked.enhancementEffects.currentWeaponProcs().map(entry=>entry.chance)});
    }
    Status.Equip[0]=[record.engineId,0,0,8,0,0,0];EquipCheck();
    const saved=PandoraRemaked.adapter.serialize();
    Status.Equip[0][2]=1;EquipCheck();
    PandoraRemaked.adapter.load(oldPin);
    const oldRestored=PandoraRemaked.adapter.serialize()===oldPin;
    const oldProcs=PandoraRemaked.enhancementEffects.currentWeaponProcs().length;
    PandoraRemaked.adapter.load(saved);
    return {rows,oldRestored,oldProcs,savedRestored:PandoraRemaked.adapter.serialize()===saved,restored:Status.Equip[0][2],tokens:(EquipOpt[11]||[]).map(String)};
  },{record,snapshot:publication([record])});
  const sum=values=>values.reduce((total,value)=>total+Number(value),0);
  expect(results.rows.map(row=>sum(row.first))).toEqual([0,4,8,2,2,16]);
  expect(results.rows.map(row=>row.fireMagic)).toEqual([0,1,2,0,0,4]);
  expect(results.rows.map(row=>row.procs)).toEqual([[5,0],[5,2],[5,4],[5,0],[5,0],[5,8]]);
  expect(results.rows.every(row=>JSON.stringify(row.first)===JSON.stringify(row.second))).toBe(true);
  expect(results.oldRestored).toBe(true);expect(results.oldProcs).toBe(0);expect(results.savedRestored).toBe(true);
  expect(results.restored).toBe(0);expect(sum(results.tokens)).toBe(8);
  await page.locator('[data-remaked-tab="2"]').click();
  await page.evaluate(id=>{PandoraRemaked.adapter.selectEquipment(0,id);PandoraRemaked.equipmentPicker.refresh();},record.engineId);
  await page.locator('#SelEquip_0_3').selectOption('8');
  await page.locator('#SelEquip_0_2').selectOption('1');
  await page.locator('[data-remaked-tab="2"]').click();
  await expect(page.locator('[data-remaked-weapon-procs]')).toContainText('refinement: 0%');
  await expect(page.locator('[data-remaked-weapon-procs]')).toContainText('combat and target resistance are not simulated');
  await page.locator('[data-remaked-tab="2"]').click();
  expect(await page.evaluate(()=>({gem:Status.Equip[0][2],total:(EquipOpt[11]||[]).reduce((sum,x)=>sum+Number(x),0)}))).toEqual({gem:1,total:2});
  await page.locator('#SelEquip_0_2').selectOption('0');
  await page.locator('[data-remaked-tab="2"]').click();
  await expect(page.locator('[data-remaked-weapon-procs]')).toContainText('refinement: 4%');
  await page.locator('[data-remaked-tab="2"]').click();
  expect(await page.evaluate(()=>({gem:Status.Equip[0][2],total:(EquipOpt[11]||[]).reduce((sum,x)=>sum+Number(x),0)}))).toEqual({gem:0,total:8});
  const trigger=page.locator('[data-remaked-equipment-picker="SelEquip_0_0"]');
  await expect(trigger).toHaveAttribute('title',/Fire gem:.*from \+7/);
  await expect(trigger).toHaveAttribute('aria-description',/Fire gem/);
  await page.evaluate(()=>PandoraRemaked.search.openEquipmentSearch(0));
  let row=page.locator(`[data-remaked-search-row][data-value="${record.engineId}"]`);
  await row.locator('summary').click();
  await expect(row.locator('.remaked-item-upgrade').nth(1)).toContainText('Fire gem: Fire MA +1%');
  await expect(row.locator('.remaked-item-proc').nth(1)).toContainText('Burn chance: 2%');
  await page.locator('.remaked-search-close').click();
  await page.evaluate(()=>{PandoraRemaked.i18n.setLocale('ru');PandoraRemaked.equipmentPicker.refresh();});
  await expect(trigger).toHaveAttribute('title',/Самоцвет «Огонь»:.*с \+7/);
  await page.evaluate(()=>PandoraRemaked.search.openEquipmentSearch(0));
  row=page.locator(`[data-remaked-search-row][data-value="${record.engineId}"]`);
  await row.locator('summary').click();
  await expect(row.locator('.remaked-item-upgrade').nth(1)).toContainText('Самоцвет «Огонь»: Магическая атака огнём +1%');
  await expect(row.locator('.remaked-item-proc').nth(1)).toContainText('Шанс ожога: 2%');
  await page.locator('.remaked-search-close').click();
  await page.setViewportSize({width:390,height:844});
  await page.evaluate(()=>PandoraRemaked.search.openEquipmentSearch(0));
  row=page.locator(`[data-remaked-search-row][data-value="${record.engineId}"]`);
  await row.locator('summary').click();
  await expect(row.locator('.remaked-item-upgrade').nth(1)).toContainText('Самоцвет «Огонь»: Магическая атака огнём +1%');
  await page.locator('.remaked-search-close').click();
  await page.evaluate(()=>PandoraRemaked.adapter.selectEquipment(0,0));
  await page.locator('[data-remaked-tab="2"]').click();
  await expect(page.locator('[data-remaked-weapon-procs]')).toHaveCount(0);
});
