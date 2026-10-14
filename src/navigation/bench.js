import bench from './bench-layout.json' with {type:'json'};
import {canStand,clearSegment} from './layout.js';
import {worldDelta} from './coordinates.js';
export {bench};
export function benchSeatFrom(position,seat=bench){
  if(Math.abs(position.y??0)>.05)return null;
  const x=Math.max(seat.seatRangeX[0],Math.min(seat.seatRangeX[1],position.x));
  const standing={x,z:seat.approachZ,y:0,yaw:seat.yaw,pitch:seat.pitch};
  const distance=Math.hypot(...worldDelta(x-position.x,seat.approachZ-position.z));
  if(distance>2.5||!canStand(x,standing.z)||!clearSegment(position,standing))return null;
  return {standing,seated:{...standing,z:seat.seatZ,y:seat.seatTop},eyeHeight:seat.eyeHeight,distance};
}
