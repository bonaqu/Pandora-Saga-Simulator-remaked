(function () {
  'use strict';
  // Modern only. Legacy 2.00 continues to use js/calc.js unchanged.
  // The 28 coefficients come from /gamedata/classes.json and are injected at
  // build time; never use the obsolete Legacy Status.Mod denominators here.
  var namespace = window.PandoraRemaked = window.PandoraRemaked || {};
  var current = window.PandoraRemakedCurrentClasses;
  var order = [
    'WARRIOR','GLADIATOR','JUGGERNAUT','DRAGOON','KNIGHT','GENERAL','PALADIN',
    'SCOUT','ARCHER','SNIPER','PREDATOR','AGENT','ASSASSIN','DISTURBANCE',
    'ACOLYTE','PRIEST','CLERIC','ENCHANTER','ASCETIC','MONK','EXORCIST',
    'MAGE','WIZARD','WARLOCK','CONJURER','DARKROAR','JESTER','CALAMITY'
  ];
  if (!current || order.length !== 28 || order.some(function (name) {
    return !current[name] || !current[name].hp || !current[name].mp;
  })) throw new Error('Modern current-server HP/MP coefficients are unavailable');

  // Current game client: each class base is truncated downward. Integer-cents
  // arithmetic keeps 1279.9 stable across browsers and avoids float drift.
  function hundredths(value) {
    if (!Number.isFinite(value) || Math.abs(value * 100 - Math.round(value * 100)) > 1e-6)
      throw new Error('Unsupported current-server coefficient');
    return Math.round(value * 100);
  }
  function baseFor(cls, kind, level, ability) {
    var coeff = cls[kind];
    if (!Number.isInteger(level) || level < 1 || !Number.isFinite(ability) || ability < 0)
      throw new Error('Invalid character HP/MP input');
    var cents = hundredths(coeff.base) + level * hundredths(coeff.lv) +
      ability * hundredths(kind === 'hp' ? coeff.vit : coeff.spi);
    return Math.floor(cents / 100);
  }
  function attributes() {
    var status = window.Status;
    return {
      vit: Number(status.STA[0]) + Number(status.STA[1]) + Number(status.STA[2]),
      spi: Number(status.SPR[0]) + Number(status.SPR[1]) + Number(status.SPR[2])
    };
  }
  function percentBonus(base,percent) {
    if (!Number.isFinite(percent)) throw new Error('Invalid percent HP/MP modifier');
    return Math.floor(base * percent / 100);
  }
  function modifierBonus(kind,base,opt,context) {
    var plus = 0, percent = 0, effects = Array.isArray(opt) ? opt : [];
    for (var index = 0; index < effects.length; index += 1) {
      var token = String(effects[index]).trim();
      if (/%$/.test(token)) {
        var amount = Number(token.slice(0,-1));
        if (!Number.isFinite(amount)) throw new Error('Invalid HP/MP percentage option');
        // Sum separated percentage sources before applying them to the class
        // base, never use a denominator that already includes flat gear.
        percent += percentBonus(base,amount);
      } else {
        var flat = Number(token);
        if (!Number.isFinite(flat)) throw new Error('Invalid HP/MP flat option');
        plus += flat;
      }
    }
    var clanLevel = Number(context.clanLevel || 0);
    var clanPercent = [0,2,4,6,9,12][clanLevel];
    if (clanPercent === undefined) throw new Error('Invalid HP/MP guild buff');
    percent += percentBonus(base,clanPercent);
    if (kind === 'hp' && context.lifeSign)
      percent += 250 + percentBonus(base,15);
    return plus + percent;
  }
  function calculate(kind,params) {
    if (!params || !current[params.className]) throw new Error('Unknown class in Modern HP/MP');
    var base = baseFor(current[params.className],kind,params.level,
      kind === 'hp' ? params.vit : params.spi);
    return {
      base: base,
      bonus: modifierBonus(kind,base,params.effects,{
        clanLevel:params.clanLevel,lifeSign:params.lifeSign
      }),
      total: 0
    };
  }
  function evaluate(kind,params) {
    var result=calculate(kind,params);
    result.total=result.base+result.bonus;
    if (!Number.isFinite(result.total)) throw new Error('Invalid final HP/MP');
    return result;
  }
  function refreshOne(option) {
    var life = option === 'LP', kind = life ? 'hp' : 'mp';
    var cls = order[Number(window.Status.Job[2])], attr = attributes();
    if (!cls) throw new Error('Unknown current-server class index');
    var select=document.getElementById(life ? 'SelBuffClan_1' : 'SelBuffClan_2');
    var result=evaluate(kind,{
      className:cls,level:Number(window.Status.Lev[0]),vit:attr.vit,spi:attr.spi,
      effects:window.EquipOpt && window.EquipOpt[life ? 6 : 7],
      clanLevel:select ? select.selectedIndex : 0,
      lifeSign:life && Boolean(window.Flag['14_1'])
    });
    var text=document.getElementById(life ? 'Status_6' : 'Status_7');
    if (!text) throw new Error('Missing HP/MP output');
    window.Status[life ? 'LP' : 'MP']=result.total;
    text.textContent=typeof window.addFigure==='function'
      ? window.addFigure(result.total) : String(result.total);
    return result;
  }
  var retainedCalc=window.Calc;
  if (typeof retainedCalc!=='function') throw new Error('Legacy calculation entry missing');
  window.Calc=function (option,secondary) {
    if (!secondary && (option==='LP' || option==='MP')) return refreshOne(option);
    return retainedCalc.apply(this,arguments);
  };
  namespace.currentVitals=Object.freeze({
    classOrder:order.slice(),
    evaluate:evaluate,
    recalculate:function () {refreshOne('LP');refreshOne('MP');},
    classCount:order.length,
    source:'Pandora Saga OS /gamedata/classes.json'
  });
  // Legacy init ran before Modern scripts were injected.
  namespace.currentVitals.recalculate();
})();
