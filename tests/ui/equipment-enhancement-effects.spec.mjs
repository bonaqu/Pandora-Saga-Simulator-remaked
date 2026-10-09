import { test, expect } from '@playwright/test';
import { compileRecord, draftFromSource, validateDraft } from '../../admin-api/src/catalog-model.mjs';
import equipment from '../../data/generated/equipment.v1.json' with { type: 'json' };
import character from '../../data/generated/character.v1.json' with { type: 'json' };

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


test('new and existing equipment calculate refinement bonuses at +2/+4/+6/+8/+10 without stacking on recheck',async({page})=>{
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

  await page.goto('/');
  await page.evaluate(snapshot=>PandoraRemaked.catalog.applySnapshot(snapshot),publication([created,modified]));
  const measurements=await page.evaluate(ids=>{
    const scan=id=>{
      const output={};
      for(const level of [0,1,2,3,4,6,8,10]){
        Status.Equip[7]=[id,0,0,level,0,0,0];
        EquipCheck();
        const tokens=()=>[...(EquipOpt[11]||[])].map(String);
        const first=tokens();
        EquipCheck();
        const second=tokens();
        output[level]={first,second};
      }
      return output;
    };
    return {created:scan(ids.created),existing:scan(ids.existing),
      formula:[0,1,2,3,4,6,8,10].map(level=>PandoraRemaked.enhancementEffects.enhancementRuleValue(ids.rule,level))};
  },{created:created.engineId,existing:modified.engineId,rule});
  expect(measurements.formula).toEqual([0,0,1,1,2,3,4,5]);
  for(const kind of ['created','existing']){
    const readings=measurements[kind];
    const baseline=readings[0].first.reduce((sum,v)=>sum+Number(v.replace('%','')),0);
    for(const level of [0,1,2,3,4,6,8,10]){
      const sum=readings[level].first.reduce((total,v)=>total+Number(v.replace('%','')),0);
      expect(sum-baseline,kind+' at +'+level).toBe(measurements.formula[[0,1,2,3,4,6,8,10].indexOf(level)]);
      expect(readings[level].second,kind+' duplicate effect after recheck').toEqual(readings[level].first);
    }
  }
});
