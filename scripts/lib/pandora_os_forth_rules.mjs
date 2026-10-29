// Converts only numeric, explicitly mapped Forth snapshots into existing
// additive catalog rules. `complete` covers the numeric snapshots only, not
// gem type, combat events or other conditions from an item's description.
// Audit/preview only: never publish without checking all source conditions.
import { convertedCurrentEffects } from './current-effect-conversion.mjs';
import { EFFECTS } from '../../admin-api/src/catalog-model.mjs';

export function forthToUpgradeRules(levels, options = {}) {
  if (!levels || typeof levels !== 'object' || Array.isArray(levels)) throw Error('Forth levels must be an object');
  if (!options || typeof options !== 'object' || Array.isArray(options) ||
      Object.keys(options).some(key => key !== 'gemElement') ||
      (options.gemElement !== undefined && !['fire','ice','lightning','poison','light','dark','rainbow'].includes(options.gemElement)))
    throw Error('Invalid Forth conversion options');
  for (const [key, effects] of Object.entries(levels)) {
    if (!/^(?:0|[1-9]|10)$/.test(key) || !Array.isArray(effects)) throw Error('Invalid Forth milestone');
  }
  let previous = new Map(), current = new Map();
  const rules = [], incomplete = [];
  for (let level = 0; level <= 10; level++) {
    if (Object.hasOwn(levels, String(level))) {
      if (levels[level].some(effect => !effect || typeof effect !== 'object' || Array.isArray(effect) ||
        Object.keys(effect).some(key => !['func', 'a', 'b'].includes(key))))
        incomplete.push({ level, reason: 'unreviewed effect fields or conditions', effects: levels[level] });
      const validEffects = levels[level].filter(effect => effect && typeof effect === 'object' && !Array.isArray(effect));
      const fireEffects = validEffects.filter(effect => effect.func === 'EP_ELEMENT_DAMAGE_SCALE_FIRE');
      const converted = convertedCurrentEffects({ effects: validEffects.filter(effect => effect.func !== 'EP_ELEMENT_DAMAGE_SCALE_FIRE') }, false);
      if (!converted.complete) incomplete.push({ level, reason: 'unmapped or conditional effect', effects: levels[level] });
      current = new Map(converted.effects.map(effect => [effect.stat + ':' + effect.unit, effect.value]));
      // The server describes this as fire-element skill damage in percent;
      // native MATKFire (43) accepts additive percentage points, not aura damage.
      for (const effect of fireEffects) {
        if (typeof effect.a !== 'number' || !Number.isFinite(effect.a) || (effect.b !== undefined && effect.b !== null && effect.b !== 0)) {
          incomplete.push({ level, reason: 'invalid fire magic effect parameters', effect });
          continue;
        }
        current.set('43:flat', (current.get('43:flat') || 0) + effect.a);
      }
    }
    for (const key of new Set([...previous.keys(), ...current.keys()])) {
      const raw = (current.get(key) || 0) - (previous.get(key) || 0);
      const delta = Number(raw.toFixed(2));
      if (Math.abs(raw - delta) > 1e-9 || Math.abs(delta) > 10000)
        incomplete.push({ level, reason: 'effect delta exceeds catalog precision or bounds', key, value: raw });
      if (!delta) continue;
      if (level === 0) { incomplete.push({ level, reason: 'base-level bonus is not an upgrade rule', key, value: delta }); continue; }
      const [stat, unit] = key.split(':');
      if (!EFFECTS.some(effect => effect.id === Number(stat) && effect.units.includes(unit)))
        incomplete.push({ level, reason: 'effect is not supported by catalog schema', key });
      rules.push({ stat: Number(stat), unit, value: delta, every: 1, from: level, to: level,
        ...(options.gemElement !== undefined ? { gemElement: options.gemElement } : {}) });
    }
    previous = new Map(current);
  }
  if (rules.length > 12) incomplete.push({ reason: 'more than 12 catalog upgrade rules', count: rules.length });
  return { complete: incomplete.length === 0, rules, incomplete };
}
