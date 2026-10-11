/**
 * Verified read-only Pandora Saga OS calculator projection (11 Oct 2026).
 * Source: https://pandorasaga-os.com/assets/BuildCalculator-BiybySwQ.js
 * Source coefficients: https://pandorasaga-os.com/gamedata/classes.json
 * This does not mutate Legacy, Modern, D1, saved builds or the actual game.
 *
 * The live calculator uses Math.floor for percentage attribute increments;
 * its "F" function uses nearest-integer rounding, ties to EVEN (not ceil).
 * It adds flat maxLifeConst/maxManaConst AFTER rounding the HP/MP base.
 */
export function halfEven(value) {
  if (!Number.isFinite(value)) throw Error('Expected a finite vitality value');
  const lower = Math.floor(value);
  const fraction = value - lower;
  return fraction < 0.5 ? lower : fraction > 0.5 ? lower + 1 : lower % 2 === 0 ? lower : lower + 1;
}

/** Applies only source-verified flat/percent attribute modifiers. */
export function projectAbilities(basicAbilities, modifiers = {}) {
  if (!Array.isArray(basicAbilities) || basicAbilities.length !== 6 ||
      !basicAbilities.every(Number.isFinite))
    throw Error('Expected six finite basic attributes');
  const constants = modifiers.abiConst || [0,0,0,0,0,0];
  const percents = modifiers.abiScaleP || [0,0,0,0,0,0];
  if (!Array.isArray(constants) || constants.length !== 6 ||
      !Array.isArray(percents) || percents.length !== 6 ||
      !constants.every(Number.isFinite) || !percents.every(Number.isFinite))
    throw Error('Invalid attribute modifier vectors');
  return basicAbilities.map((base,index) =>
    Math.max(1, base + constants[index] + Math.floor(base * percents[index] / 100)));
}

export function calculateReferenceVitals(classData, state) {
  if (!classData?.hp || !classData?.mp) throw Error('Missing Pandora OS class coefficients');
  const {level,basicAbilities,modifiers={}} = state || {};
  if (!Number.isInteger(level) || level < 1 || !Number.isFinite(level))
    throw Error('Invalid level');
  const ability = projectAbilities(basicAbilities,modifiers);
  const hp = classData.hp, mp = classData.mp;
  const numbers = [hp.base,hp.lv,hp.vit,mp.base,mp.lv,mp.spi];
  if (!numbers.every(Number.isFinite)) throw Error('Invalid class coefficients');
  const maxLifeConst = modifiers.maxLifeConst || 0;
  const maxManaConst = modifiers.maxManaConst || 0;
  if (![maxLifeConst,maxManaConst].every(Number.isFinite))
    throw Error('Invalid flat vitality modifier');
  return {
    abilities: ability,
    maxLife: halfEven(ability[0] * hp.vit + level * hp.lv + hp.base) + maxLifeConst,
    maxMana: halfEven(ability[4] * mp.spi + level * mp.lv + mp.base) + maxManaConst
  };
}
