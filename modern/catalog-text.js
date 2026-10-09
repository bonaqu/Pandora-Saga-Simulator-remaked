(function () {
  'use strict';
  var namespace = window.PandoraRemaked = window.PandoraRemaked || {};
  // Presentation-only formatting of compact in-game descriptions. No numeric
  // code, canonical item name or source data is rewritten or persisted.
  var labels = '(?:ПРВ|СИЛ|ВЫН|ЛВК|ИНТ|ДУХ|СД|ОЗ|ОМ|STR|STA|AGI|DEX|INT|SPI|HP|MP|LP|PRV|ATK|DEF|Сопротивляемость[^+\\-\\n]{0,60}|Шанс критической атаки|Эффективность лечащих заклинаний|Уклонение от критической атаки|(?:Stun|Knockdown|Fire|Ice|Lightning|Poison|Charm|Light|Dark|Magic) Resistance|(?:Physical|Magic) Attack|(?:Attack|Movement|Casting) Speed)';
  var boundary = new RegExp('([^\\s,;:\\n])(?=' + labels + '\\s*[+\\-]\\d)', 'g');
  var sections = /([^\s\n])(?=(?:За каждую\s+единицу|За каждые\s+\d+|При улучшении на\s*\+?\d+|Per every\s+\d+|For every\s+\d+|When enhanced|Скорость атаки\s*[+\-]\d|Скорость применения умений\s*[+\-]\d|Атака в спину\s*[+\-]\d|Точность\s*[+\-]\d|Сила атаки\s*[+\-]\d|Магическая атака\s*[+\-]\d|Время перезарядки умений\s*[+\-]\d|Получаемый физический урон\s*[+\-]\d|Получаемый магический урон\s*[+\-]\d))/g;
  var afterColon = /:(?=(?:Скорость атаки|Скорость применения умений|Атака в спину|Точность|Урон ауры|Время перезарядки умений|ОЗ|ОМ|ПРВ|СИЛ|ВЫН|ЛВК|ИНТ|СД|Получаемый)[ \t]*[+\-]?\d)/g;
  var sentences = /([.!?])(?=[А-ЯЁA-Z][а-яёa-z])/g;
  function lines(value) {
    return String(value || '')
      .replace(/\r\n?/g, '\n')
      .replace(/<br\s*\/?\s*>/gi, '\n')
      .replace(sentences, '$1\n')
      .replace(sections, '$1\n')
      .replace(afterColon, ':\n')
      .replace(boundary, '$1\n');
  }
  namespace.catalogText = { lines: lines };
})();
