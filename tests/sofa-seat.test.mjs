import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {WalkController} from '../src/navigation/WalkController.js';
import {sofa,seatFrom} from '../src/navigation/seating.js';
import {space,canStand,LIBRARY} from '../src/navigation/layout.js';
import {worldPoint,worldDelta} from '../src/navigation/coordinates.js';
import {createContentInteraction} from '../src/scene/ContentInteraction.js';

function visitor(start={x:sofa.approachX,z:-.9,y:sofa.floor,yaw:Math.PI/2,pitch:-.3}){
 global.window=new EventTarget();const canvas=new EventTarget();canvas.setPointerCapture=()=>{};
 const camera=new THREE.PerspectiveCamera(57,1,.06,130),states=[];
 const controller=new WalkController(canvas,camera,{start,onClick(){},onArea(){},onRoute(){},onSeated:v=>states.push(v)});
 const tick=(seconds,dt=.025)=>{for(let t=0;t<seconds-1e-7;t+=dt)controller.step(Math.min(dt,seconds-t));};
 const key=code=>{const e=new Event('keydown',{cancelable:true});Object.defineProperties(e,{code:{value:code},repeat:{value:false}});window.dispatchEvent(e);};
 return {controller,camera,states,tick,key};
}
test('A jump lands on the actual sofa cushions and walking off returns smoothly to the upper floor',()=>{
 for(const dt of [.0125,.16]){
  const v=visitor(),c=v.controller;c.requestJump();c.keys.add('KeyW');v.tick(.48,dt);c.keys.clear();v.tick(1.5,dt);
  assert.ok(Math.abs(c.position.y-sofa.seatTop)<.001,JSON.stringify(c.position));assert.equal(c.verticalOffset,0);
  c.keys.add('KeyS');let previous=c.feetY;
  for(let i=0;i<80;i++){c.step(.025);assert.ok(Math.abs(c.feetY-previous)<.14);previous=c.feetY;}
  assert.equal(c.position.y,sofa.floor);assert.ok(canStand(c.position.x,c.position.z,undefined,sofa.floor));c.dispose();
 }
});
test('Sofa seating stays on the correct floor and returns to a clear standing position',()=>{
 const v=visitor(),c=v.controller;
 assert.equal(seatFrom({...c.position,y:0},sofa),null);assert.equal(seatFrom({...c.position,x:-1,y:sofa.floor},sofa),null);
 assert.equal(c.sit(sofa),true);let previous=v.camera.position.clone();
 for(let i=0;i<120;i++){c.step(.025);assert.ok(v.camera.position.distanceTo(previous)<.14);previous.copy(v.camera.position);}
 assert.equal(c.seatState.phase,'seated');assert.ok(Math.abs(c.position.y-sofa.seatTop)<.001);
 v.key('Space');v.tick(1);assert.equal(c.seated,false);assert.equal(c.verticalVelocity,0);assert.equal(c.position.y,sofa.floor);
 assert.ok(canStand(c.position.x,c.position.z,undefined,sofa.floor));assert.deepEqual(v.states,[true,false]);c.dispose();
});
test('E can sit directly from the cushion support and stand without opening portfolio content',()=>{
 const v=visitor({x:sofa.seatX,z:-.9,y:sofa.seatTop,yaw:-Math.PI/2,pitch:-.5}),c=v.controller;
 const scene=new THREE.Scene(),world=new THREE.Group();scene.add(world);const [sx,sy,sz]=space.worldScale;
 world.matrixAutoUpdate=false;world.matrix.set(sx,0,sx*space.worldShear,0,0,sy,0,0,0,0,sz,0,0,0,0,1);
 const [l,r,b,f]=sofa.seatBounds,proxy=new THREE.Mesh(new THREE.BoxGeometry(r-l,.035,f-b),new THREE.MeshBasicMaterial({visible:false}));
 proxy.position.set((l+r)/2,sofa.seatTop+.012,(b+f)/2);proxy.userData.contentId=sofa.id;world.add(proxy);scene.updateMatrixWorld(true);
 v.camera.lookAt(new THREE.Vector3(...worldPoint(sofa.seatX,sofa.seatTop,-.9)));v.camera.updateMatrixWorld(true);
 const abort=new AbortController(),opened=[];
 const interaction=createContentInteraction({camera:v.camera,controller:c,entries:[{id:sofa.id,kind:'seat',seat:sofa,root:proxy,floor:sofa.floor,focus:new THREE.Vector3(0,.019,0)}],targets:[proxy],callbacks:{onOpen:id=>opened.push(id)},signal:abort.signal,reducedMotion:false});
 assert.equal(interaction.canActivate(sofa.id),true);interaction.updateNearby();v.key('KeyE');assert.equal(c.seatState.phase,'sitting');v.tick(1);
 v.key('KeyE');v.tick(1);assert.equal(c.seated,false);assert.equal(c.position.y,sofa.floor);assert.deepEqual(opened,[]);
 abort.abort();c.dispose();
});
test('Guidance leaves a raised sofa and resumes the library route, including after sitting',()=>{
 for(const sitting of [false,true]){
  const v=visitor({x:sofa.seatX,z:-.9,y:sofa.seatTop,yaw:-Math.PI/2,pitch:0}),c=v.controller;
  if(sitting){assert.equal(c.sit(sofa),true);v.tick(1);}
  c.guide('library');v.tick(12);assert.equal(c.seated,false);assert.equal(c.position.y,sofa.floor);
  assert.ok(Math.hypot(...worldDelta(c.position.x-LIBRARY.x,c.position.z-LIBRARY.z))<.04,JSON.stringify(c.position));c.dispose();
 }
});
