(function () {
  'use strict';
  var namespace = window.PandoraRemaked = window.PandoraRemaked || {};
  // Known effect labels from the checked-in catalog. Split only glued effect
  // boundaries; keep prose, comma-separated clauses and existing lines intact.
  var labels = '(?:ПРВ|СИЛ|ВЫН|ЛВК|ИНТ|ДУХ|ОЗ|ОМ|STR|STA|AGI|DEX|INT|SPI|HP|MP|LP|PRV|ATK|DEF|Сопротивляемость[^+\\-\\n]{0,60}|(?:Stun|Knockdown|Fire|Ice|Lightning|Poison|Charm|Light|Dark|Magic) Resistance|(?:Physical|Magic) Attack|(?:Attack|Movement|Casting) Speed)';
  var boundary = new RegExp('([^\\s,;:])(?=' + labels + '\\s*[+\\-]\\d)', 'g');
  // The server game data occasionally concatenates textual condition headers
  // directly after an effect: "+1За каждые..." or ":Скорость атаки".
  // These are presentation boundaries, not item mechanics or numeric effects.
  var section = /([^\s\n])(?=(?:За каждые\s*\d+|При улучшении на\s*\+?\d+|Скорость атаки\s*[+-]\d|Сила атаки\s*[+-]\d|Магическая атака\s*[+-]\d))/g;
  var afterColon = /:(?=(?:Скорость атаки|Сила атаки|Магическая атака|ПРВ|СИЛ|ВЫН|ЛВК|ИНТ|ОМ|ОЗ)\s*[+-]?\d)/g;
  function lines(value) {
    return String(value || '')
      .replace(/\r\n?/g, '\n')
      .replace(/<br\s*\/?\s*>/gi, '\n')
      .replace(section, '$1\n')
      .replace(afterColon, ':\n')
      .replace(boundary, '$1\n');
  }
  namespace.catalogText = { lines: lines };
})();
