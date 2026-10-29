// Add current-server mappings on top of the preserved historical converter.
// This module is an offline audit/preview helper, not a second import path.
import { convertedEffects, EFFECT_MAP } from '../materialize_pandora_os_live_sync_hardening.mjs';

export const CURRENT_EFFECT_MAP = Object.freeze({ ...EFFECT_MAP,
  EP_IMMUNE_RAVING: [157, 'flat'], EP_IMMUNE_DISEASE: [161, 'flat'], EP_AURADAMAGE_CONST: [33, 'flat'] });
const additions = new Set(['EP_IMMUNE_RAVING','EP_IMMUNE_DISEASE','EP_AURADAMAGE_CONST']);

export function convertedCurrentEffects(server, includeArmorClass) {
  const rows=Array.isArray(server?.effects)?server.effects:[];
  const extra=rows.filter(row=>additions.has(row?.func));
  const base=convertedEffects({...server,effects:rows.filter(row=>!additions.has(row?.func))},includeArmorClass);
  const values=new Map(base.effects.map(effect=>[effect.stat+':'+effect.unit,effect.value]));
  let complete=base.complete;
  for(const effect of extra) {
    if(typeof effect.a!=='number' || !Number.isFinite(effect.a) || Number(effect.min||0)>0 || effect.exclusive ||
      (effect.dir && !['SELF','TARGET'].includes(effect.dir)) || (effect.b!==null && effect.b!==undefined && effect.b!==0)) {
      complete=false;continue;
    }
    const [stat,unit]=CURRENT_EFFECT_MAP[effect.func],key=stat+':'+unit;
    values.set(key,(values.get(key)||0)+effect.a);
  }
  return {complete,effects:[...values].map(([key,value])=>{
    const [stat,unit]=key.split(':');return {stat:Number(stat),unit,value};
  }).sort((a,b)=>a.stat-b.stat||a.unit.localeCompare(b.unit))};
}
