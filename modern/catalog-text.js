(function () {
  'use strict';
  var namespace = window.PandoraRemaked = window.PandoraRemaked || {};
  // Known effect labels from the checked-in catalog. Split only glued effect
  // boundaries; keep prose, comma-separated clauses and existing lines intact.
  var labels = '(?:ПРВ|СИЛ|ВЫН|ЛВК|ИНТ|ДУХ|ОЗ|ОМ|STR|STA|AGI|DEX|INT|SPI|HP|MP|LP|PRV|ATK|DEF|Сопротивляемость[^+\\-\\n]{0,60}|(?:Stun|Knockdown|Fire|Ice|Lightning|Poison|Charm|Light|Dark|Magic) Resistance|(?:Physical|Magic) Attack|(?:Attack|Movement|Casting) Speed)';
  var boundary = new RegExp('([^\\s,;:])(?=' + labels + '\\s*[+\\-]\\d)', 'g');
  function lines(value) {
    return String(value || '').replace(/\r\n?/g, '\n').replace(/<br\s*\/?\s*>/gi, '\n').replace(boundary, '$1\n');
  }
  namespace.catalogText = { lines: lines };
})();
