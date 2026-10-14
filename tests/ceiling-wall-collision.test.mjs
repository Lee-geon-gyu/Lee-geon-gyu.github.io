import test from 'node:test';
import assert from 'node:assert/strict';
import {WalkController} from '../src/navigation/WalkController.js';
import {space,canStand,facadeFront,ceilingHeight,railSupport,moveInAir,RADIUS,eastBoundary} from '../src/navigation/layout.js';
import {worldDelta} from '../src/navigation/coordinates.js';
import garden from '../src/scene/garden-layout.json' with {type:'json'};
function visitor(start){
 globalThis.window=new EventTarget();const canvas=new EventTarget();canvas.setPointerCapture=()=>{};
 const controller=new WalkController(canvas,{position:{set(){}},rotation:{set(){}}},{start,onClick(){},onArea(){},onRoute(){}});
 return controller;
}
test('Jumping from the upper rail stops below the real roof then lands back on the rail',()=>{
 for(const dt of [.0125,.035,.18]){
  const x=-1,z=facadeFront(x),c=visitor({x,z,y:space.upperFloor+1.092,yaw:Math.PI,pitch:0});
  const floor=c.feetY;let apex=floor,sawCeiling=false;
  c.requestJump();
  for(let i=0;i<Math.ceil(2/dt);i++){
   c.step(dt);apex=Math.max(apex,c.feetY);
   assert.ok(c.feetY+c.eyeHeight<=space.upperCeiling*space.worldScale[1]-.079,'eye and near plane remain below the soffit');
   sawCeiling ||= c.feetY>floor+.3&&c.verticalVelocity<=0;
  }
  assert.ok(apex>floor+.3&&apex<floor+.6);assert.ok(sawCeiling);assert.equal(c.onRail,true);assert.equal(c.verticalVelocity,0);c.dispose();
 }
});
test('Roof overhang stops a rising head while the adjacent open courtyard remains jumpable',()=>{
 const x=-1,edge=facadeFront(x),feet=(space.upperFloor+1.092)*space.worldScale[1];
 assert.equal(ceilingHeight(x,edge+.1,feet),(space.upperCeiling-.065)*space.worldScale[1]);
 assert.equal(ceilingHeight(x,edge+.6,feet),Infinity);
 const p={x,z:edge+.7,y:space.upperFloor+1.092};
 assert.equal(moveInAir(p,x,edge+.1,feet+.9),null,'cannot move sideways through the roof edge');
 const c=visitor({x:1,z:10,yaw:0,pitch:0});c.requestJump();let apex=0;
 for(let i=0;i<100;i++){c.step(.025);apex=Math.max(apex,c.feetY);}assert.ok(apex>1.35);assert.equal(c.feetY,0);c.dispose();
});
test('Repeated running jumps into walls and furniture never land inside walking clearance or trap movement',()=>{
 const cases=[
  {x:-4.95,z:-.4,y:0,yaw:Math.PI/2}, // studio west wall
  {x:1.95,z:-4,y:0,yaw:-Math.PI/2}, // atelier side wall
  {x:-.4,z:-4.95,y:0,yaw:0}, // rear desk
  {x:1.9,z:.65,y:0,yaw:0}, // ground return
  {x:-5,z:1,y:space.upperFloor,yaw:Math.PI/2}, // upper west wall
  {x:-3,z:-2.35,y:space.upperFloor,yaw:0}, // rear books
  {x:1.75,z:-1,y:space.upperFloor,yaw:-Math.PI/2}, // upper closure
  {x:-3.8,z:-.9,y:space.upperFloor,yaw:Math.PI/2,jumpable:true}, // sofa
  {x:-1.5,z:.4,y:space.upperFloor,yaw:0}, // shifted chair and desk
 ];
 for(const dt of [.025,.16])for(const start of cases){
  assert.ok(canStand(start.x,start.z,RADIUS,start.y),JSON.stringify(start));
  const c=visitor({...start,pitch:0});c.keys.add('KeyW');c.keys.add('ShiftLeft');
  for(let jump=0;jump<4;jump++){
   c.requestJump();for(let i=0;i<Math.ceil(1.5/dt);i++)c.step(dt);
   assert.equal(c.verticalOffset,0,'settles on a floor or permitted support');
   assert.ok(canStand(c.position.x,c.position.z,RADIUS,c.position.y??0)||(start.jumpable&&c.onRaisedSurface),`jump ${jump}, ${JSON.stringify(c.position)}`);
  }
  c.keys.clear();const before={...c.position};c.keys.add('KeyS');for(let i=0;i<Math.ceil(.5/dt);i++)c.step(dt);
  assert.ok(Math.hypot(...worldDelta(c.position.x-before.x,c.position.z-before.z))>.4,'can immediately back away');c.dispose();
 }
});
test('The long sofa, shifted desk and card leave a usable passage beside the rear bookcase',()=>{
 const {sofa,deskShift}=garden.library;
 assert.ok(sofa.center[1]-sofa.size[1]/2>-2.90+.4);
 assert.equal(canStand(sofa.center[0],sofa.center[1],RADIUS,space.upperFloor),false);
 assert.equal(canStand(-2.98+deskShift[0],-1.55,RADIUS,space.upperFloor),false);
 for(let z=-2.4;z<1.3;z+=.1)assert.ok(canStand(-3.75,z,RADIUS,space.upperFloor),'continuous gap along the sofa');
});

test('Airborne clearance follows the angled east perimeter rather than its center point alone',()=>{
 const z=10,x=eastBoundary(z)-RADIUS+.01,feet=6;
 assert.equal(moveInAir({x:x-.5,z,y:space.upperFloor},x,z,feet),null,'the diagonal wall cannot intersect the circular body');
 assert.ok(moveInAir({x:x-.5,z,y:space.upperFloor},x-.10,z,feet),'the space just inside remains usable');
});
