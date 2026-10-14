import garden from '../scene/garden-layout.json' with {type:'json'};
import space from './space-layout.json' with {type:'json'};

const s=garden.library.sofa,[x,z]=s.center,[depth,length]=s.size,floor=space.upperFloor;
const back=[s.backFaceX,s.backFaceX+.25,z-length/2,z+length/2];
const arms=[z-length/2+.10,z+length/2-.10].map(az=>[x+.01-(depth-.02)/2,x+.01+(depth-.02)/2,az-.10,az+.10]);
export const sofa={
 id:'library-sofa',floor,
 bounds:[x-depth/2,x+depth/2,z-length/2,z+length/2],
 seatBounds:[s.backFaceX+.265,x+.055+(depth-.24)/2,z-length/2+.20,z+length/2-.20],
 seatTop:floor+s.seatHeight+.095,
 seatX:x+.08,approachX:x+depth/2+.36,seatRangeZ:[z-length/2+.45,z+length/2-.45],
 yaw:-Math.PI/2,pitch:-.06,eyeHeight:.68,
 parts:[{bounds:back,top:floor+1.08},...arms.map(bounds=>({bounds,top:floor+.74}))]
};
