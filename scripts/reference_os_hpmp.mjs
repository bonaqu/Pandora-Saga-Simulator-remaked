/**
 * Read-only reference implementation of the HP/MP formula in the dated
 * pandorasaga-os.com BuildCalculator-BiybySwQ.js asset.
 *
 * The server computes class baselines with a round-to-nearest, ties-to-even
 * function. This module intentionally never patches the original Calc(),
 * catalog, D1 or build storage.
 */
import {CLASS_ORDER, parseLegacyModifiers} from './audit_pandora_os_class_coefficients.mjs';

export function roundHalfToEven(value) {
  if (!Number.isFinite(value) || value < 0) throw new RangeError('Invalid reference value');
  const floor=Math.floor(value),fraction=value-floor;
  return fraction < 0.5 ? floor : fraction > 0.5 ? floor+1 : floor%2===0 ? floor : floor+1;
}

export function currentOsBase({hp,mp},level,vit,spi) {
  if (![level,vit,spi].every(Number.isFinite) || level<1 || level>45 || vit<1 || spi<1)
    throw new RangeError('Invalid character inputs for dated level-45 reference');
  const values=[hp?.base,hp?.lv,hp?.vit,mp?.base,mp?.lv,mp?.spi];
  if (!values.every(Number.isFinite)) throw new TypeError('Malformed reference class');
  return {
    hp:roundHalfToEven(vit*hp.vit+level*hp.lv+hp.base),
    mp:roundHalfToEven(spi*mp.spi+level*mp.lv+mp.base)
  };
}

export function historicalBase(mod,level,vit,spi) {
  if(!Array.isArray(mod)||mod.length!==6||!mod.every(Number.isFinite))throw new TypeError('Malformed original class');
  return {
    hp:mod[0]+Math.ceil(level*100/mod[2])+Math.ceil(vit*Math.ceil(100/mod[4])),
    mp:mod[1]+Math.ceil(level*100/mod[3])+Math.ceil(spi*Math.ceil(100/mod[5]))
  };
}

/** Full per-class base HP/MP comparison for a precisely scoped no-effect vector. */
export function referenceMatrix(classes,iniSource,level=45,vit=7,spi=4){
  const original=parseLegacyModifiers(iniSource);
  if(original.size!==CLASS_ORDER.length||Object.keys(classes).length!==CLASS_ORDER.length)
    throw new Error('Class identity drift: refuse a partial reference comparison');
  return CLASS_ORDER.map((name,index)=>{
    const cls=classes[name],old=original.get(index);
    if(!cls||!old)throw new Error('Missing class '+name);
    const modern=currentOsBase(cls,level,vit,spi);
    const preserved=historicalBase(old,level,vit,spi);
    return {className:name,index,level,vit,spi,currentReference:modern,legacy:preserved,
      delta:{hp:modern.hp-preserved.hp,mp:modern.mp-preserved.mp}};
  });
}
