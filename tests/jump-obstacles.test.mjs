import test from 'node:test';
import assert from 'node:assert/strict';
import {WalkController} from '../src/navigation/WalkController.js';
import {space,canStand,RADIUS,raisedSurfaceHeight,flightPoint,moveInAir} from '../src/navigation/layout.js';
import {bench} from '../src/navigation/bench.js';
function visitor(p){globalThis.window=new EventTarget();const c=new EventTarget();c.setPointerCapture=()=>{};return new WalkController(c,{position:{set(){}},rotation:{set(){}}},{start:{...p,pitch:0},onClick(){},onArea(){},onRoute(){}});}
const advance=(c,t,dt=.025)=>{for(let i=0;i<Math.ceil(t/dt);i++)c.step(Math.min(dt,t-i*dt));};
test('Jump lands on the real bench top and walking off falls continuously',()=>{
 for(const dt of [.0125,.16]){
  const c=visitor({x:2.5,z:10.78,yaw:Math.PI});c.requestJump();c.keys.add('KeyW');advance(c,.48,dt);c.keys.clear();advance(c,1.5,dt);
  assert.ok(Math.abs(c.position.y-bench.seatTop)<.001,JSON.stringify(c.position));assert.equal(c.verticalOffset,0);assert.equal(c.onRaisedSurface,true);
  c.keys.add('KeyS');advance(c,1.2,dt);assert.equal(c.feetY,0);assert.ok(c.position.z<10.7);assert.ok(canStand(c.position.x,c.position.z));c.dispose();
 }
});
test('Accessible courtyard garden edges can be left immediately without another jump',()=>{
 const beds=[{x:-5.23,z:3.2,y:.28,yaw:-Math.PI/2},{x:.5,z:12.15,y:.28,yaw:0},{x:4.80,z:11,y:.28,yaw:Math.PI/2}];
 for(const p of beds){const y=raisedSurfaceHeight(p.x,p.z);assert.equal(y,.28,JSON.stringify(p));const c=visitor(p);c.keys.add('KeyW');advance(c,1.5);assert.ok(Math.hypot(c.position.x-p.x,c.position.z-p.z)>.3,JSON.stringify(c.position));assert.equal(c.feetY,0);assert.ok(canStand(c.position.x,c.position.z));c.dispose();}
});
test('The exposed stair cheeks reject a jumping body below their masonry height',()=>{
 for(const f of space.stairs.flights)for(const t of [.25,.5,.75]){
  const edge=flightPoint(f,t,-f.width/2);
  assert.equal(moveInAir({x:edge.x-.4,z:edge.z,y:0},edge.x-.10,edge.z,Math.max(0,(edge.y-.6)*space.worldScale[1])),null);
 }
});

test('Running jumps into every reachable stair-side section can back away after landing',()=>{
 for(const f of space.stairs.flights)for(const t of [.2,.35,.5,.65,.8]){
  const edge=flightPoint(f,t,-f.width/2),start={x:edge.x-.55,z:edge.z,y:0,yaw:-Math.PI/2};
  if(!canStand(start.x,start.z))continue;
  for(const dt of [.025,.16]){
   const c=visitor(start);c.keys.add('KeyW');c.keys.add('ShiftLeft');
   for(let j=0;j<3;j++){c.requestJump();advance(c,1.6,dt);assert.ok(canStand(c.position.x,c.position.z,RADIUS,c.position.y??0)||c.onRail||c.onRaisedSurface||c.recovering,JSON.stringify(c.position));}
   c.keys.clear();const x=c.position.x;c.keys.add('KeyS');advance(c,.6,dt);assert.ok(c.position.x<x-.25,JSON.stringify(c.position));c.dispose();
  }
 }
});
test('A destination can walk off the bench and resume a dry route',()=>{
 const c=visitor({x:2.5,z:bench.seatZ,y:bench.seatTop,yaw:0});c.guide('terrace');advance(c,20);assert.ok(Math.abs(c.position.x+1.5)<.06);assert.equal(c.position.y,0);c.dispose();
});

test('Narrow enclosed planting strips cannot be entered by a jumping body',()=>{
 for(const feet of [.6,1.2,2.0]){
  assert.equal(moveInAir({x:1.4,z:-.9,y:0},2.05,-.9,feet),null);
  const f=space.stairs.flights[1],edge=flightPoint(f,.5,f.width/2);
  assert.equal(moveInAir({x:edge.x-.5,z:edge.z,y:0},edge.x+.25,edge.z,feet+4),null);
 }
});
