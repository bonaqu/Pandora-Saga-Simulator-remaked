// Canonical RU/EN item-description layout for Cloudflare D1 and admin edits.
// Newlines are presentation metadata: no names, stat values, percentages,
// conditions, JP/TW text, or combat calculation codes are translated/changed.
const LABELS = {
  ru: [
    'ПРВ','СИЛ','ВЫН','ЛВК','ИНТ','ДУХ','СД','ОЗ','ОМ',
    'Атака(?: в спину)?','Магическая атака','Защита','Точность',
    'Шанс критической атаки','Уклонение','Скорость(?: атаки| применения умений| движения в городе)?',
    'Время перезарядки умений','Снижение расхода ОМ',
    'Сопротивляемость[\p{L}\s-]{0,48}','Получаемый[\p{L}\s-]{0,48}',
    'Дальность[\p{L}\s-]{0,48}','Эффективность[\p{L}\s-]{0,48}',
    'Время негативных эффектов','Урон ауры','Получаемый опыт',
    'Шанс уклониться от физической атаки','Снижение получаемого физического урона',
    'Эффект от лечащих предметов'
  ],
  en: [
    'STR','STA','AGI','DEX','INT','SPI','HP','MP','LP','PRV','ATK','DEF',
    'Attack(?: Speed)?','Accuracy','Defense','Evasion','Magic Attack','Magic Resistance',
    'Physical Damage Taken','Magic Damage Taken','Critical Hit Chance',
    'Skill Cooldown','Skill Casting Speed','MP Cost Reduction',
    '(?:\p{Lu}[\p{L}-]*\s+){0,5}Resistance',
    '(?:Physical|Magic) Status Ailment Resistance',
    '(?:Physical|Magic) Attack Evasion Chance',
    '(?:Cast|Casting) Interruption Resistance',
    'Skill Failure Resistance','Healing Spell Effectiveness','Experience Gained',
    'Negative Effect Duration','Attack Range','Bow Range','Town Movement Speed',
    'Aura Damage','Back Attack','Speed'
  ]
};
const CONDITIONS = {
  ru: 'За\s+кажд(?:ую|ые|ый)\b|При\s+(?:улучшении|усовершенствовании)\b|Если\s+доспехи\b',
  en: 'Per\s+every\b|For\s+every\b|At\s*\+\s*\d|When\s+enhanced\b|If\s+the\s+armor\b'
};
const compiled = Object.fromEntries(['ru','en'].map(locale => {
  const label = '(?:'+LABELS[locale].join('|')+')\s*[+\-−]\s*\d';
  const conditional = '(?:'+CONDITIONS[locale]+')';
  return [locale, {
    statStart: new RegExp('^'+label,'iu'),
    conditionalStart: new RegExp('^'+conditional,'iu'),
    gluedStat: new RegExp('(?<=[0-9%])(?='+label+')','giu'),
    gluedCondition: new RegExp('(?<=[0-9%])(?='+conditional+')','giu'),
    afterColon: new RegExp(':(?='+label+')','giu')
  }];
}));

export function formatItemDescription(value, locale) {
  if (typeof value !== 'string' || !value.trim() || !compiled[locale]) return value || '';
  const rules = compiled[locale];
  const normalized = value.replace(/\r\n?/g,'\n').replace(/<br\s*\/?\s*>/gi,'\n')
    // Source strings concatenate complete sentences without a separator.
    .replace(/([.!?])\s*(?=[А-ЯЁA-Z])/g,'$1\n')
    .replace(rules.gluedStat,'\n').replace(rules.gluedCondition,'\n')
    .replace(rules.afterColon,':\n');
  const lines = normalized.split('\n').map(line => line.trim()).filter(Boolean);
  const firstStat = lines.findIndex(line =>
    rules.statStart.test(line) || rules.conditionalStart.test(line));
  // Pure prose retains its existing whitespace; stat-only text gets no empty
  // introductory paragraph. Description + effects uses exactly one blank line.
  if (firstStat < 0) return value.replace(/\r\n?/g,'\n');
  if (firstStat === 0) return lines.join('\n');
  return lines.slice(0,firstStat).join(' ')+'\n\n'+lines.slice(firstStat).join('\n');
}

export function formatItemDescriptionMap(map) {
  if (!map || typeof map !== 'object') return map;
  return { ...map, ru:formatItemDescription(map.ru||'','ru'),
    en:formatItemDescription(map.en||'','en') };
}
