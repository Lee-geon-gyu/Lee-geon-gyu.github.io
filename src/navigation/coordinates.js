import space from './space-layout.json' with { type: 'json' };
// One affine transform keeps the skewed architecture, lights and walking aligned.
export function worldPoint(x,y,z,eye=0){return [(x+space.worldShear*z)*space.worldScale[0],y*space.worldScale[1]+eye,z*space.worldScale[2]];}
export function worldDelta(x,z){return [(x+space.worldShear*z)*space.worldScale[0],z*space.worldScale[2]];}
export function logicalDelta(x,z){return [x/space.worldScale[0]-space.worldShear*z/space.worldScale[2],z/space.worldScale[2]];}
