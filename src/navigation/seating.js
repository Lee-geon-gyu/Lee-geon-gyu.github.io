import {bench,benchSeatFrom} from './bench.js';
import {sofa} from './sofa.js';
import {canStand,clearSegment} from './layout.js';
import {worldDelta} from './coordinates.js';
export {sofa};

export function seatFrom(position,seat=bench){
 if(seat.id!==sofa.id)return benchSeatFrom(position,seat);
 const y=position.y??0,onSeat=Math.abs(y-seat.seatTop)<.05;
 const [left,right,back,front]=seat.seatBounds;
 if(onSeat&&(position.x<left-.19||position.x>right+.19||position.z<back||position.z>front))return null;
 if(!onSeat&&Math.abs(y-seat.floor)>.05)return null;
 const z=Math.max(seat.seatRangeZ[0],Math.min(seat.seatRangeZ[1],position.z));
 const standing={x:seat.approachX,z,y:seat.floor,yaw:seat.yaw,pitch:seat.pitch};
 if(!canStand(standing.x,z,undefined,seat.floor))return null;
 const distance=Math.hypot(...worldDelta(standing.x-position.x,z-position.z));
 if(!onSeat&&(distance>2.5||!clearSegment(position,standing)))return null;
 return {standing,seated:{...standing,x:seat.seatX,y:seat.seatTop},eyeHeight:seat.eyeHeight,distance:onSeat?0:distance,fromSupport:onSeat};
}
