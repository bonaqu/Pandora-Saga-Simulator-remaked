// Owner's exact RU/EN dataset, verified against current public skill rows.
// Existing identities and native Calc options, not another game calculator.
import { baselineById } from './catalog-baseline.mjs';
import { draftFromSource } from './catalog-model.mjs';
const flat = (stat, value) => ({ stat, value, unit: 'flat' });
const percent = (stat, value) => ({ stat, value, unit: 'percent' });
const weapons = weaponCategories => ({ weaponCategories, shieldRequired: false, ridingRequired: false });
const rows = [
  ['Fighting Spirit', 'Бойцовский дух', 'Increases one-handed weapon attack by 10 and 12%.', 'Увеличивает атаку одноручным оружием на 10 и на 12%.', [flat(18, 10), percent(18, 12)], weapons([0, 2, 4, 6, 10, 12])],
  ['Adaptability', 'Приспособляемость', 'Abnormal Status Resistance +15', 'Сопротивляемость аномальных состояний тела +15.', [flat(146, 15)]],
  ['Pharmaceutics', 'Знахарство', 'Your medical knowledge allows you to use potions with maximum efficiency. Increases healing potion effectiveness by 15%.', 'Позволяет максимально эффективно использовать зелья за счет познаний в медицине. Увеличивает эффективность лечебных зелий +15%', [flat(8, 15)]],
  ["Nature's Harmony", 'Гармония', 'Vast magical knowledge reduces your MP costs. MP Cost -15%.', 'Позволяет тратить на 15% ОМ меньше за счет обширных познаний в магии.', [flat(76, -15)]],
  ['Eagle Eye', 'Зоркость', 'Increases attack range by 500', 'Увеличивает дальность стрельбы на 500.', [], weapons([8, 9]), {
    en: 'The +500 range is reference information: the retained calculator has no calculated ranged-weapon range. No base range or carrying bonus is invented.',
    ru: 'Дальность +500 указана справочно: исходный калькулятор не рассчитывает дальность дальнобойного оружия. Базовую дальность и бонус переносимого веса не придумываем.'
  }],
  ['Steadfastness', 'Стойкость разума', 'Increases resistance to Charm skills by 20', 'Увеличивает сопротивляемость эффектам ветки умений чар на +20.', [flat(142, 20)]],
  ['Stronghearted', 'Упрямое сердце', 'Grants a 20% chance to survive a fatal hit with 1 HP. Also increases Knockdown, Stun, and Freeze Resistance by 10.', 'Дает 20% шанс пережить последний удар сохранив одну единицу здоровья, а также дарует устойчивость к падению, оглушению и заморозке на 10.', [flat(149, 10), flat(150, 10), flat(151, 10)], null, {
    en: 'Stun, freeze and knockdown resistance are calculated. The 20% fatal-hit survival chance is reference information; this calculator does not simulate combat or survival.',
    ru: 'Сопротивления оглушению, заморозке и падению рассчитываются. Шанс пережить последний удар 20% указан справочно: калькулятор не моделирует бой и выживание.'
  }],
  ['Dwarf Spirit', 'Дух цверга', 'Increases Axe and Blunt Weapon Attack +10 and +12%', 'Увеличивает атаку топоров и булав на 10 и 12%.', [flat(18, 10), percent(18, 12)], weapons([2, 3, 10, 11])],
  ['Steel will', 'Стальная воля', 'Increases Critical Hit Resistance by 5%', 'Увеличивает сопротивляемость критическим атакам на 5%.', [flat(70, -5)]],
  ['Acute Senses', 'Охотничье чутьё', 'Increases Critical Hit Chance by 5%', 'Увеличивает вероятность критического удара на 5%.', [flat(69, 5)]],
  ['Calmness', 'Подавление гнева', 'Increases Accuracy by 10%', 'Увеличивает точность на 10%', [percent(62, 10)]],
  ['Sharpness', 'Интуиция', 'Increases Evasion by 5%', 'Повышает уклонение на 5%.', [percent(65, 5)]],
  ['Stone Skin', 'Каменная кожа', 'Rock-hard protection: Reduces physical damage taken by 10%', 'Уменьшает получаемый физический урон на 10%.', [percent(52, -10)]],
  ['Strong Arm', 'Сильные руки', 'Increases damage dealt with two-handed weapons by 12%', 'Увеличивает урон, наносимый двуручным оружием на 12%.', [percent(18, 12)], weapons([1, 3, 5, 7, 8, 9, 11, 13])],
  ['Enkidu Spirit', 'Дух энкиду', 'Increases Critical Damage by 10%', 'Увеличивает критический урон на 10%', [flat(71, 10)]],
  ['Magic Resistance', 'Антимагия', 'Magic Damage Taken -10%', 'Уменьшает получаемый магический урон на 10%.', [flat(60, -10)]],
  // Set.RES[1] explicitly renders native MPRecSPD (10) in percent. Its flat
  // token adds percentage points to that existing speed bonus, not MP amount.
  ['Inner Light', 'Всплеск магии', 'Increases MP recovery speed by 18%', 'Увеличивает скорость восстановления ОМ на 18%.', [flat(10, 18)]],
  ['Lapin Spirit', 'Дух кролля', 'Critical Damage Taken -10%', 'Уменьшает получаемый критический урон на 10%', [flat(72, -10)]]
];
export function currentRacialDrafts() {
  return rows.map(([en, ru, descriptionEn, descriptionRu, effects, requirements, notes], position) => {
    const category = Math.floor(position / 3), index = position % 3;
    const edit = draftFromSource(baselineById.get(`racial_skill.${category}.${index}`), 'racial');
    edit.names = { ...edit.names, en, ru };
    edit.description = { en: descriptionEn, ru: descriptionRu, jp: '', tw: '' };
    edit.effectMode = 'replace'; edit.effects = effects.map(effect => ({ ...effect }));
    if (requirements) edit.bonusRequirements = { ...requirements, weaponCategories: [...requirements.weaponCategories] };
    if (notes) edit.calculationNotes = { ...notes, jp: '', tw: '' };
    return edit;
  });
}
