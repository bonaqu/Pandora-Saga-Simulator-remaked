/* Dawn equipment reference: live Pandora Saga OS items.json + strings.en.json,
 * checked 2026-11-03; additional published IDs from Remaked catalog revision 94.
 * Only source-backed identity/description/compatibility; no guessed combat formulas.
 * New female variants reuse the identical archived equipment calculation code.
 */
(function () {
  'use strict';
  var entries = [
  {
    "id": 11502,
    "category": 30,
    "templateIndex": 19,
    "race": 0,
    "sex": "male",
    "ru": "Рассветная шапка для человека (М)",
    "en": "Dawn Agal (Male Human)",
    "descriptionRu": "Изготовленная на заказ мужская шапка. СИЛ +1, ИНТ +1Сопротивляемость магии +2",
    "descriptionEn": "A custom-made cap for men. STR +1, INT +1Magic Resistance +2",
    "level": 20,
    "sockets": 0,
    "icon": "I_011502_00"
  },
  {
    "id": 11512,
    "category": 30,
    "templateIndex": 20,
    "race": 0,
    "sex": "female",
    "ru": "Рассветная шапка для человека (Ж)",
    "en": "Dawn Turban (Female Human)",
    "descriptionRu": "Изготовленная на заказ женская шапка.СИЛ +1, ИНТ +1Сопротивляемость магии +2",
    "descriptionEn": "A custom-made cap for women.STR +1, INT +1Magic Resistance +2",
    "level": 20,
    "sockets": 0,
    "icon": "I_011512_00"
  },
  {
    "id": 11522,
    "category": 30,
    "templateIndex": 21,
    "race": 1,
    "sex": "male",
    "ru": "Рассветный венец для эльфа (М)",
    "en": "Dawn Circlet (Male Elf)",
    "descriptionRu": "Изготовленный на заказ венец для эльфов.СИЛ +1, СД +1Шанс критической атаки +2%",
    "descriptionEn": "A custom-made circlet for male Elves.STR +1, SPI +1Critical Hit Chance +2%",
    "level": 20,
    "sockets": 0,
    "icon": "I_011522_00"
  },
  {
    "id": 11532,
    "category": 30,
    "templateIndex": 22,
    "race": 1,
    "sex": "female",
    "ru": "Рассветный венец для эльфа (Ж)",
    "en": "Dawn Headdress (Female Elf)",
    "descriptionRu": "Изготовленный на заказ венец для эльфиек.СИЛ +1, СД +1Шанс критической атаки +2%",
    "descriptionEn": "A custom-made headdress for female Elves.STR +1, SPI +1Critical Hit Chance +2%",
    "level": 20,
    "sockets": 0,
    "icon": "I_011532_00"
  },
  {
    "id": 11542,
    "category": 30,
    "templateIndex": 23,
    "race": 2,
    "sex": "both",
    "ru": "Рассветный шлем для цверга",
    "en": "Dawn Helmet (Dwarf)",
    "descriptionRu": "Шляпа патриарха.Носить ее может только цверг.ВЫН +1Время перезарядки умений -5%Дальность атаки +50",
    "descriptionEn": "A patriarch's hat.Only a Dwarf can wear it.STA +1Skill Cooldown -5%Attack Range +50",
    "level": 20,
    "sockets": 0,
    "icon": "I_011542_00"
  },
  {
    "id": 11552,
    "category": 30,
    "templateIndex": 24,
    "race": 3,
    "sex": "both",
    "ru": "Рассветная вуаль для мирины",
    "en": "Dawn Veil (Myrine)",
    "descriptionRu": "Изготовленная на заказ вуаль для мирин.ЛВК +1, ПРВ +1Шанс уклониться от физической атаки +3%",
    "descriptionEn": "A custom-made veil for the Myrine.DEX +1, AGI +1Physical Attack Evasion Chance +3%",
    "level": 20,
    "sockets": 0,
    "icon": "I_011552_00",
    "publishedId": "modern.equipment.549efeeb-e073-4356-a8dc-83bf60fce92e"
  },
  {
    "id": 11562,
    "category": 30,
    "templateIndex": 25,
    "race": 4,
    "sex": "both",
    "ru": "Рассветная маска для энкиду",
    "en": "Dawn Mask (Enkidu)",
    "descriptionRu": "Изготовленная на заказ маска для энкиду.ВЫН +1Сопротивляемость оглушению +10%Сопротивляемость падению +10%",
    "descriptionEn": "A custom-made mask for the Enkidu.STA +1Stun Resistance +10%Knockdown Resistance +10%",
    "level": 20,
    "sockets": 0,
    "icon": "I_011562_00"
  },
  {
    "id": 11572,
    "category": 30,
    "templateIndex": 26,
    "race": 5,
    "sex": "both",
    "ru": "Рассветная шапочка для кролля",
    "en": "Dawn Hat (Lapin)",
    "descriptionRu": "Изготовленная на заказ шапочка для кроллей.СД +1, ИНТ +1, ОМ +3%",
    "descriptionEn": "A custom-made cap for the Lapin.SPI +1, INT +1, MP +3%",
    "level": 20,
    "sockets": 0,
    "icon": "I_011572_00"
  },
  {
    "id": 12502,
    "category": 31,
    "templateIndex": 22,
    "race": 0,
    "sex": "male",
    "ru": "Рассветная туника для человека (М)",
    "en": "Dawn Tunic (Male Human)",
    "descriptionRu": "Изготовленная на заказ мужская одежда для людей.ЛВК +2, ОЗ +30Точность +8Шанс критической атаки +2%",
    "descriptionEn": "Custom-made men's clothing for Humans.DEX +2, HP +30Accuracy +8Critical Hit Chance +2%",
    "level": 20,
    "sockets": 0,
    "icon": "I_012502_00"
  },
  {
    "id": 12512,
    "category": 31,
    "templateIndex": 23,
    "race": 0,
    "sex": "female",
    "ru": "Жилет зари для человека (Ж)",
    "en": "Dawn Vest (Female Human)",
    "descriptionRu": "Изготовленная на заказ женская одежда для людей.ЛВК +2, ОЗ +30Точность +8Шанс критической атаки +2%",
    "descriptionEn": "Custom-made women's clothing for Humans.DEX +2, HP +30Accuracy +8Critical Hit Chance +2%",
    "level": 20,
    "sockets": 0,
    "icon": "I_012512_00"
  },
  {
    "id": 12522,
    "category": 31,
    "templateIndex": 24,
    "race": 1,
    "sex": "male",
    "ru": "Жилет зари для эльфа (М)",
    "en": "Dawn Vest (Male Elf)",
    "descriptionRu": "Изготовленная на заказ одежда для эльфов.ИНТ +1, ОЗ +22Снижение расхода ОМ +7%Сопротивляемость чарам +5Сопротивляемость болезням духа +5%",
    "descriptionEn": "Custom-made clothing for Elves.INT +1, HP +22MP Cost Reduction +7%Charm Resistance +5Mental Status Ailment Resistance +5%",
    "level": 20,
    "sockets": 0,
    "icon": "I_012522_00"
  },
  {
    "id": 12532,
    "category": 31,
    "templateIndex": 24,
    "race": 1,
    "sex": "female",
    "ru": "Жилет зари для эльфа (Ж)",
    "en": "Dawn Vest (Female Elf)",
    "descriptionRu": "Изготовленная на заказ одежда для эльфиек.ИНТ +1, ОЗ +22Снижение расхода ОМ +7%Сопротивляемость чарам +5Сопротивляемость болезням духа +5%",
    "descriptionEn": "Custom-made clothing for female Elves.INT +1, HP +22MP Cost Reduction +7%Charm Resistance +5Mental Status Ailment Resistance +5%",
    "level": 20,
    "sockets": 0,
    "icon": "I_012532_00",
    "newIndex": 180
  },
  {
    "id": 12542,
    "category": 31,
    "templateIndex": 25,
    "race": 2,
    "sex": "both",
    "ru": "Туника зари для цверга",
    "en": "Dawn Tunic (Dwarf)",
    "descriptionRu": "Одежда, изготовленная специально для цвергов.СИЛ +1, ОЗ +12Атака +8Сопротивляемость ожогам +15%",
    "descriptionEn": "Clothing made specially for Dwarves.STR +1, HP +12Attack +8Burn Resistance +15%",
    "level": 20,
    "sockets": 0,
    "icon": "I_012542_00",
    "publishedId": "modern.equipment.44bcf90e-3b59-4ed4-af36-1c9000b4b916"
  },
  {
    "id": 12552,
    "category": 31,
    "templateIndex": 26,
    "race": 3,
    "sex": "both",
    "ru": "Корсет зари для мирины",
    "en": "Dawn Bustier (Myrine)",
    "descriptionRu": "Изготовленный на заказ корсет для мирин.ПРВ +2, ОЗ +28Шанс критической атаки +3%Сопротивляемость тьме +5",
    "descriptionEn": "Custom-made corset for Myrines.AGI +2, HP +28Critical Hit Chance +3%Dark Resistance +5",
    "level": 20,
    "sockets": 0,
    "icon": "I_012552_00",
    "publishedId": "modern.equipment.2673a73e-fe80-4806-a32b-53991feb566c"
  },
  {
    "id": 12562,
    "category": 31,
    "templateIndex": 27,
    "race": 4,
    "sex": "both",
    "ru": "Жилет зари для энкиду",
    "en": "Dawn Vest (Enkidu)",
    "descriptionRu": "Изготовленный на заказ жилет для энкиду.ВЫН +2, ОЗ +50Получаемый физический урон -5%Сопротивляемость падению +15%",
    "descriptionEn": "Custom-made vest for Enkidu.STA +2, HP +50Physical Damage Taken -5%Knockdown Resistance +15%",
    "level": 20,
    "sockets": 0,
    "icon": "I_012562_00",
    "publishedId": "modern.equipment.75f00438-3adc-4ed8-aa18-e95aeff1dfc8"
  },
  {
    "id": 12572,
    "category": 31,
    "templateIndex": 28,
    "race": 5,
    "sex": "both",
    "ru": "Куртка зари для кролля",
    "en": "Dawn Tunic (Lapin)",
    "descriptionRu": "Изготовленная на заказ куртка для кроллей.СД +2, ОЗ +25, ОМ +8Сопротивляемость немоте +15%",
    "descriptionEn": "Custom-made tunic for Lapins.SPI +2, HP +25, MP +8Silence Resistance +15%",
    "level": 20,
    "sockets": 0,
    "icon": "I_012572_00"
  },
  {
    "id": 13502,
    "category": 33,
    "templateIndex": 20,
    "race": 0,
    "sex": "male",
    "ru": "Рассветные штаны для человека (М)",
    "en": "Dawn Trousers (Male Human)",
    "descriptionRu": "Изготовленные на заказ штаны для мужчин.ОЗ +25, ОМ +9Уклонение +4Сопротивляемость болезни +5%",
    "descriptionEn": "Custom-made pants for men.HP +25, MP +9Evasion +4Disease Resistance +5%",
    "level": 20,
    "sockets": 0,
    "icon": "I_013502_00"
  },
  {
    "id": 13512,
    "category": 33,
    "templateIndex": 21,
    "race": 0,
    "sex": "female",
    "ru": "Рассветные штаны для человека (Ж)",
    "en": "Dawn Pants (Female Human)",
    "descriptionRu": "Изготовленные на заказ шорты для женщин.ОЗ +25, ОМ +9Уклонение +4Сопротивляемость болезни +5%",
    "descriptionEn": "Custom-made shorts for women.HP +25, MP +9Evasion +4Disease Resistance +5%",
    "level": 20,
    "sockets": 0,
    "icon": "I_013512_00"
  },
  {
    "id": 13522,
    "category": 33,
    "templateIndex": 22,
    "race": 1,
    "sex": "male",
    "ru": "Рассветные штаны для эльфа (М)",
    "en": "Dawn Trousers (Male Elf)",
    "descriptionRu": "Изготовленные на заказ штаны для эльфов.ПРВ +1, ОЗ +13, ОМ +10Уклонение +2",
    "descriptionEn": "Custom-made pants for elves.AGI +1, HP +13, MP +10Evasion +2",
    "level": 20,
    "sockets": 0,
    "icon": "I_013522_00"
  },
  {
    "id": 13532,
    "category": 33,
    "templateIndex": 23,
    "race": 1,
    "sex": "female",
    "ru": "Юбка для эльфийки (Ж)",
    "en": "Dawn Skirt (Female Elf)",
    "descriptionRu": "Изготовленная на заказ юбка для эльфиек.ПРВ +1, ОЗ +13, ОМ +10Уклонение +2",
    "descriptionEn": "A custom-made skirt for elven women.AGI +1, HP +13, MP +10, Evasion +2.",
    "level": 20,
    "sockets": 0,
    "icon": "I_013532_00"
  },
  {
    "id": 13542,
    "category": 33,
    "templateIndex": 24,
    "race": 2,
    "sex": "both",
    "ru": "Рассветные штаны для цверга",
    "en": "Dawn Leggings (Dwarf)",
    "descriptionRu": "Изготовленные на заказ штаны для цвергов.ОЗ +22, ОМ +13Получаемый физический урон -3%Сопротивляемость немоте +5%",
    "descriptionEn": "Custom-made pants for dwarves.HP +22, MP +13Physical Damage Taken -3%Silence Resistance +5%",
    "level": 20,
    "sockets": 0,
    "icon": "I_013542_00"
  },
  {
    "id": 13552,
    "category": 33,
    "templateIndex": 25,
    "race": 3,
    "sex": "both",
    "ru": "Рассветные чулки для мирины",
    "en": "Dawn Hosiery (Myrine)",
    "descriptionRu": "Изготовленные на заказ чулки для мирин.ОМ +17Снижение расхода ОМ +6%Сопротивляемость ожогам +5%",
    "descriptionEn": "Custom-made hosiery for the Myrine.MP +17MP Cost Reduction +6%Burn Resistance +5%",
    "level": 20,
    "sockets": 0,
    "icon": "I_013552_00",
    "publishedId": "modern.equipment.486dbc10-ca5b-4647-a41a-4734c44ed33b"
  },
  {
    "id": 13562,
    "category": 33,
    "templateIndex": 26,
    "race": 4,
    "sex": "both",
    "ru": "Рассветная повязка для энкиду",
    "en": "Dawn Kilt (Enkidu)",
    "descriptionRu": "Изготовленная на заказ набедренная повязка для энкиду.СД +1, ОМ +18Сопротивляемость слабости +5%",
    "descriptionEn": "A custom-made kilt for the Enkidu.SPI +1, MP +18Weakness Resistance +5%",
    "level": 20,
    "sockets": 0,
    "icon": "I_013562_00",
    "publishedId": "modern.equipment.c235d398-2281-41d1-a072-c9cca7668cb0"
  },
  {
    "id": 13572,
    "category": 33,
    "templateIndex": 27,
    "race": 5,
    "sex": "both",
    "ru": "Рассветные штаны для кролля",
    "en": "Dawn Leggings (Lapin)",
    "descriptionRu": "Изготовленные на заказ штаны для кроллей.ИНТ +1, ОМ +9Сопротивляемость безумию +5%",
    "descriptionEn": "Custom-made leggings for the Lapin.INT +1, MP +9Madness Resistance +5%",
    "level": 20,
    "sockets": 0,
    "icon": "I_013572_00"
  },
  {
    "id": 14502,
    "category": 32,
    "templateIndex": 14,
    "race": 0,
    "sex": "male",
    "ru": "Рассветный браслет для человека (М)",
    "en": "Dawn Armband (Male Human)",
    "descriptionRu": "Изготовленный на заказ мужской браслет.Атака +4Точность +2",
    "descriptionEn": "A custom-made armband for men.Attack +4Accuracy +2",
    "level": 20,
    "sockets": 1,
    "icon": "I_014502_00"
  },
  {
    "id": 14512,
    "category": 32,
    "templateIndex": 14,
    "race": 0,
    "sex": "female",
    "ru": "Рассветный браслет для человека (Ж)",
    "en": "Dawn Armband (Female Human)",
    "descriptionRu": "Изготовленный на заказ женский браслет.Атака +4Точность +2",
    "descriptionEn": "A custom-made armband for women.Attack +4Accuracy +2",
    "level": 20,
    "sockets": 1,
    "icon": "I_014512_00",
    "newIndex": 180
  },
  {
    "id": 14522,
    "category": 32,
    "templateIndex": 15,
    "race": 1,
    "sex": "male",
    "ru": "Рассветные перчатки для эльфа (М)",
    "en": "Dawn Gloves (Male Elf)",
    "descriptionRu": "Изготовленные на заказ перчатки для эльфов.Атака +2Точность +4",
    "descriptionEn": "Custom-made gloves for elves.Attack +2Accuracy +4",
    "level": 20,
    "sockets": 1,
    "icon": "I_014522_00",
    "publishedId": "modern.equipment.fb711826-a631-4423-af72-803ac0e6a516"
  },
  {
    "id": 14532,
    "category": 32,
    "templateIndex": 15,
    "race": 1,
    "sex": "female",
    "ru": "Рассветные перчатки для эльфа (Ж)",
    "en": "Dawn Gloves (Female Elf)",
    "descriptionRu": "Изготовленные на заказ перчатки для эльфиек.Атака +2Точность +4",
    "descriptionEn": "Custom-made gloves for elven women.Attack +2Accuracy +4",
    "level": 20,
    "sockets": 1,
    "icon": "I_014532_00",
    "newIndex": 181
  },
  {
    "id": 14542,
    "category": 32,
    "templateIndex": 16,
    "race": 2,
    "sex": "both",
    "ru": "Рассветные рукавицы для цверга",
    "en": "Dawn Gloves (Dwarf)",
    "descriptionRu": "Изготовленные на заказ рукавицы для цвергов.Точность +5Шанс критической атаки +1%",
    "descriptionEn": "Custom-made gloves for dwarves.Accuracy +5Critical Hit Chance +1%",
    "level": 20,
    "sockets": 1,
    "icon": "I_014542_00"
  },
  {
    "id": 14552,
    "category": 32,
    "templateIndex": 17,
    "race": 3,
    "sex": "both",
    "ru": "Рассветные перчатки для мирины",
    "en": "Dawn Gloves (Myrine)",
    "descriptionRu": "Изготовленные на заказ перчатки для мирин.Атака +3Шанс критической атаки +2%",
    "descriptionEn": "Custom-made gloves for Mailyn.Attack +3Critical Hit Chance +2%",
    "level": 20,
    "sockets": 1,
    "icon": "I_014552_00"
  },
  {
    "id": 14562,
    "category": 32,
    "templateIndex": 18,
    "race": 4,
    "sex": "both",
    "ru": "Рассветные рукавицы для энкиду",
    "en": "Dawn Gloves (Enkidu)",
    "descriptionRu": "Изготовленные на заказ рукавицы для энкиду.Точность +3Шанс критической атаки +2%",
    "descriptionEn": "Custom-made gloves for Enkidu.Accuracy +3Critical Hit Chance +2%",
    "level": 20,
    "sockets": 1,
    "icon": "I_014562_00",
    "publishedId": "modern.equipment.d6f750c7-b049-4f42-ae14-897d3c7ba041"
  },
  {
    "id": 14572,
    "category": 32,
    "templateIndex": 19,
    "race": 5,
    "sex": "both",
    "ru": "Рассветные перчатки для кролля",
    "en": "Dawn Gloves (Lapin)",
    "descriptionRu": "Изготовленные на заказ перчатки для кроллей.Атака +3Точность +3",
    "descriptionEn": "Custom-made gloves for Lapin.Attack +3Accuracy +3",
    "level": 20,
    "sockets": 1,
    "icon": "I_014572_00"
  },
  {
    "id": 15502,
    "category": 34,
    "templateIndex": 14,
    "race": 0,
    "sex": "male",
    "ru": "Рассветные сапоги для человека (М)",
    "en": "Dawn Boots (Male Human)",
    "descriptionRu": "Изготовленные на заказ мужские сапоги.ОЗ +20, ОМ +12Получаемый физический урон -1%",
    "descriptionEn": "Custom-made boots for men.HP +20, MP +12Physical Damage Taken -1%",
    "level": 20,
    "sockets": 1,
    "icon": "I_015502_00"
  },
  {
    "id": 15512,
    "category": 34,
    "templateIndex": 14,
    "race": 0,
    "sex": "female",
    "ru": "Рассветные сапоги для человека (Ж)",
    "en": "Dawn Boots (Female Human)",
    "descriptionRu": "Изготовленные на заказ женские сапоги.ОЗ +20, ОМ +12Получаемый физический урон -1%",
    "descriptionEn": "Custom-made women's boots.HP +20, MP +12Physical Damage Taken -1%",
    "level": 20,
    "sockets": 1,
    "icon": "I_015512_00",
    "newIndex": 180
  },
  {
    "id": 15522,
    "category": 34,
    "templateIndex": 15,
    "race": 1,
    "sex": "male",
    "ru": "Рассветные сапоги для эльфа (М)",
    "en": "Dawn Boots (Male Elf)",
    "descriptionRu": "Изготовленные на заказ сапоги для эльфов.ОЗ +18, ОМ +13Получаемый физический урон -1%",
    "descriptionEn": "Custom-made boots for elves.HP +18, MP +13Physical Damage Taken -1%",
    "level": 20,
    "sockets": 1,
    "icon": "I_015522_00",
    "publishedId": "modern.equipment.e465ca33-722f-4fb9-a735-774bee698a32"
  },
  {
    "id": 15532,
    "category": 34,
    "templateIndex": 15,
    "race": 1,
    "sex": "female",
    "ru": "Рассветные сапоги для эльфа (Ж)",
    "en": "Dawn Boots (Female Elf)",
    "descriptionRu": "Изготовленные на заказ сапоги для эльфиек.ОЗ +18, ОМ +13Получаемый физический урон -1%",
    "descriptionEn": "Custom-made boots for elf women.HP +18, MP +13Physical Damage Taken -1%",
    "level": 20,
    "sockets": 1,
    "icon": "I_015532_00",
    "newIndex": 181
  },
  {
    "id": 15542,
    "category": 34,
    "templateIndex": 16,
    "race": 2,
    "sex": "both",
    "ru": "Рассветные башмаки для цверга",
    "en": "Dawn Boots (Dwarf)",
    "descriptionRu": "Изготовленные на заказ башмаки для цвергов.ОЗ +6, ОМ +21Уклонение +5",
    "descriptionEn": "Custom-made shoes for dwarves.HP +6, MP +21Evasion +5",
    "level": 20,
    "sockets": 1,
    "icon": "I_015542_00"
  },
  {
    "id": 15552,
    "category": 34,
    "templateIndex": 17,
    "race": 3,
    "sex": "both",
    "ru": "Рассветные сапоги для мирины",
    "en": "Dawn Boots (Myrine)",
    "descriptionRu": "Изготовленные на заказ сапоги для мирин.ОЗ +21, ОМ +13Уклонение +3",
    "descriptionEn": "Custom-made boots for the Myrine.HP +21, MP +13Evasion +3",
    "level": 20,
    "sockets": 1,
    "icon": "I_015552_00"
  },
  {
    "id": 15562,
    "category": 34,
    "templateIndex": 18,
    "race": 4,
    "sex": "both",
    "ru": "Рассветные башмаки для энкиду",
    "en": "Dawn Boots (Enkidu)",
    "descriptionRu": "Изготовленные на заказ башмаки для энкиду.ОЗ +8, ОМ +26Получаемый физический урон -1%",
    "descriptionEn": "Custom-made shoes for the Enkidu.HP +8, MP +26Physical Damage Taken -1%",
    "level": 20,
    "sockets": 1,
    "icon": "I_015562_00",
    "publishedId": "modern.equipment.9bfb82fe-1d1c-4ecc-a454-be6a46f86056"
  },
  {
    "id": 15572,
    "category": 34,
    "templateIndex": 19,
    "race": 5,
    "sex": "both",
    "ru": "Рассветные башмачки для кролля",
    "en": "Dawn Boots (Lapin)",
    "descriptionRu": "Изготовленные на заказ башмачки для кроллей.ОЗ +24, ОМ +6Уклонение +4",
    "descriptionEn": "Custom-made shoes for the Lapin.HP +24, MP +6Evasion +4",
    "level": 20,
    "sockets": 1,
    "icon": "I_015572_00"
  }
];
  // The regular racial outfits share the same archived male/female indices
  // in five places. Current OS confirms identical base stats and effects for
  // each pair; add distinct Modern selections without touching the museum.
  var regularVariants = (window.PandoraRemakedVerifiedRacialGear?.entries || [])
    .filter(function (row) { return row.set === 'racial' && Number.isInteger(row.newIndex); })
    .map(function (row) {
      return { id: row.gameId, recordId: row.recordId, category: row.category,
        templateIndex: row.templateIndex, newIndex: row.newIndex, race: row.race,
        sex: row.sex, ru: row.ru, en: row.en, descriptionRu: row.descriptionRu,
        level: row.level, sockets: row.sockets };
    });
  var newIds = entries.filter(function (entry) { return Number.isInteger(entry.newIndex); }).concat(regularVariants);
  var verifiedItems = window.PandoraRemakedVerifiedRacialGear?.entries || [];
  var byPublishedId = Object.create(null);
  entries.forEach(function (entry) { if (entry.publishedId) byPublishedId[entry.publishedId] = entry; });
  // 31 regular race-outfit variants also already exist in production D1. The
  // simulator previously added those same server identities through Legacy,
  // including five synthetic female rows, producing multiple visible copies.
  verifiedItems.forEach(function (entry) {
    if (entry.publishedId && !byPublishedId[entry.publishedId])
      byPublishedId[entry.publishedId] = entry;
  });
  function compatible(entry, base) {
    if (!Array.isArray(base) || base.length !== 36) throw new Error('Invalid Dawn compatibility source: ' + entry.id);
    var result = base.slice();
    result[0] = entry.sex !== 'female' ? 1 : 0;
    result[1] = entry.sex !== 'male' ? 1 : 0;
    for (var i = 2; i < 8; i++) result[i] = Number(i === entry.race + 2);
    return result;
  }
  function localized(en, ru) { return { en: en || '', ru: ru || '', jp: '', tw: '' }; }
  function addNew(entry, original) {
    var source = original?.[0]?.[entry.category]?.[entry.templateIndex];
    if (!source || typeof source[7] !== 'string') throw new Error('Missing Dawn calculator template ' + entry.id);
    var id = entry.recordId || 'modern.equipment.dawn-os-' + entry.id;
    var code = source[7];
    return {
      id: id, kind: 'equipment', category: entry.category, index: entry.newIndex,
      engineId: entry.category * 10000 + entry.newIndex, engineKey: 'Modern:' + id,
      names: localized(entry.en, entry.ru),
      description: localized(entry.descriptionEn || original?.[1]?.[entry.category]?.[entry.templateIndex]?.[1] || '', entry.descriptionRu),
      notes: localized('', ''), acquisition: localized('', ''), modifiers: localized('', ''),
      level: entry.level, sockets: entry.sockets, disabled: false,
      calculationCode: code, compatibility: compatible(entry, source.slice(8, 44)),
      parameter6: typeof source[6] === 'number' || typeof source[6] === 'string' ? source[6] : '',
      soulParameters: ['', ''], trailing: typeof source[44] === 'string' ? source[44] : ''
    };
  }
  // A current OS item may be present twice: its original Legacy slot and a
  // previously published D1 UUID. Keep the D1 publication as the canonical
  // editable identity; retain the old slot only for loading historical builds.
  // Identity is established by the verified OS item ID, never by fuzzy name or
  // equal numerical effects (different items can share stats).
  function canonicalForLegacy(category, index, snapshot) {
    if (!snapshot || snapshot.revision === 0 || !Array.isArray(snapshot.records)) return null;
    var entry = verifiedItems.find(function (candidate) {
      return candidate.publishedId && candidate.category === Number(category) &&
        (candidate.newIndex === undefined ? candidate.templateIndex : candidate.newIndex) === Number(index);
    });
    if (!entry) return null;
    // Never silently retire a separately admin-published legacy item.
    if (snapshot.records.some(function (row) {
      return row.id === (entry.newIndex !== undefined
        ? entry.recordId : 'equipment.' + category + '.' + index);
    })) return null;
    return snapshot.records.find(function (row) {
      return row.id === entry.publishedId && row.kind === 'equipment' &&
        row.category === entry.category && row.index === entry.publishedIndex && !row.disabled;
    }) || null;
  }
  function augment(snapshot, source) {
    if (!snapshot || !Array.isArray(snapshot.records) || snapshot.revision === 0) return snapshot;
    // Do not rebase an older catalog onto a newer Dawn identity set. All ten
    // published items must exist before overlaying the five verified gaps.
    if (!entries.filter(function (entry) { return entry.publishedId; }).every(function (entry) {
      return snapshot.records.some(function (row) { return row.id === entry.publishedId; });
    })) return snapshot;
    var rows = snapshot.records.map(function (record) {
      var entry = byPublishedId[record.id];
      if (!entry || record.kind !== 'equipment') return record;
      var changes = {};
      // These published Dawn UUIDs have exact counterparts in the archived
      // game. Keep the OLD Japanese/Taiwanese item names, never synthesize new
      // translations from English. Explicit published translations still win.
      if (record.names && source && entry.newIndex === undefined) {
        var names = Object.assign({}, record.names), supplemented = false;
        [['jp', 0], ['tw', 2]].forEach(function (pair) {
          var old = source[pair[1]]?.[entry.category]?.[entry.templateIndex]?.[0];
          if (!names[pair[0]] && typeof old === 'string' && old.trim()) {
            names[pair[0]] = old; supplemented = true;
          }
        });
        if (supplemented) changes.names = names;
      }
      // Revision 94 had ten Dawn records with unbounded all-race flags.
      // Normalize only that known legacy placeholder: an administrator's
      // explicitly edited race selection is always the source of truth.
      if (Array.isArray(record.compatibility) &&
          record.compatibility.slice(2, 8).every(function (value) { return value === 1; })) {
        var flags = compatible(entry, record.compatibility);
        if (flags.some(function (value, i) { return value !== record.compatibility[i]; }))
          changes.compatibility = flags;
      }
      return Object.keys(changes).length ? Object.assign({}, record, changes) : record;
    });
    newIds.forEach(function (entry) {
      var id = entry.recordId || 'modern.equipment.dawn-os-' + entry.id;
      if (rows.some(function (row) { return row.id === id; })) return;
      if (rows.some(function (row) {
        return row.kind === 'equipment' && row.category === entry.category && row.index === entry.newIndex;
      })) throw new Error('Reserved Dawn equipment index was allocated by the public catalog: ' + entry.category + '.' + entry.newIndex);
      rows.push(addNew(entry, source));
    });
    return Object.assign({}, snapshot, { records: rows });
  }
  window.PandoraRemakedDawnCollection = Object.freeze({
    entries: Object.freeze(entries), augment: augment, compatible: compatible,
    canonicalForLegacy: canonicalForLegacy,
    source: 'https://pandorasaga-os.com/gamedata/items.json'
  });
})();
