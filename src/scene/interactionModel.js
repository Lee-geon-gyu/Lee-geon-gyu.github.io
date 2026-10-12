// A fixed, readable hanging size; additional work gets another exhibition page.
const hangingSize={y:2.06,width:1.04,height:1.47};
const sideWallCenters=[-5.90,-4.50,-3.10];
export const EXHIBITION_SLOTS = [
  ...[-1.42, 0, 1.42].map(x => ({...hangingSize,x,z:-6.90,rotation:0})),
  ...sideWallCenters.slice(0,2).map(z => ({...hangingSize,x:2.20,z,rotation:-Math.PI/2})),
  // Orange Card sits near the rear corner of the left wall, mirroring the right.
  {...hangingSize,x:-2.20,z:sideWallCenters[0],rotation:Math.PI/2},
];
export function exhibitionPages(projects) {
  return Array.from({length:Math.ceil(projects.length/EXHIBITION_SLOTS.length)},(_,page)=>
    projects.slice(page*6,page*6+6).map((project,slot)=>({id:project.id,slot:EXHIBITION_SLOTS[slot]})));
}
export function canInteract({distance,floorDifference,facing,visible,airborne=false,inWater=false}) {
  return distance<=3.1 && floorDifference<.45 && facing>-.1 && visible && !airborne && !inWater;
}
export function visibleTargets(meshes){return meshes.filter(mesh=>{for(let node=mesh;node;node=node.parent)if(node.visible===false)return false;return true;});}
export const ease = t => {t=Math.max(0,Math.min(1,t));return t*t*(3-2*t);};
// One reversible timeline. Closing during approach cannot open stale content.
export class Presentation {
  constructor(duration=1.5){this.duration=duration;this.phase='idle';this.progress=0;this.delivered=false;}
  begin(id){if(this.phase!=='idle')return false;this.id=id;this.phase='opening';this.delivered=false;return true;}
  close(){if(this.phase!=='idle')this.phase='closing';}
  reset(){this.phase='idle';this.progress=0;this.id=null;this.delivered=false;}
  step(delta){
    if(this.phase==='opening'){
      this.progress=Math.min(1,this.progress+delta/this.duration);
      if(this.progress===1){this.phase='reading';if(!this.delivered){this.delivered=true;return 'open';}}
    }else if(this.phase==='closing'){
      this.progress=Math.max(0,this.progress-delta/Math.min(.75,this.duration));
      if(this.progress===0){this.reset();return 'restored';}
    }
    return '';
  }
}
