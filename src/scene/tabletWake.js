import {ease} from './interactionModel.js';

// A center line extends across the glass, then reveals the display vertically.
export function tabletWakeState(value){
  const power=Math.max(0,Math.min(1,value));
  return {power,width:ease(power/.22),height:power===0?0:.004+.996*ease((power-.32)/.68),line:1-ease((power-.32)/.18)};
}
