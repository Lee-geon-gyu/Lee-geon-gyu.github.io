import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {WalkController} from '../src/navigation/WalkController.js';
import {bench,benchSeatFrom} from '../src/navigation/bench.js';
import {space,canStand,OUTDOOR} from '../src/navigation/layout.js';
import {worldPoint,worldDelta} from '../src/navigation/coordinates.js';
import {createContentInteraction} from '../src/scene/ContentInteraction.js';

function visitor(start={x:2.5,z:10.5,y:0,yaw:Math.PI,pitch:-.35}){
  global.window=new EventTarget();const canvas=new EventTarget();canvas.setPointerCapture=()=>{};
  const camera=new THREE.PerspectiveCamera(57,1,.06,130),states=[];
  const controller=new WalkController(canvas,camera,{start,onClick(){},onArea(){},onRoute(){},onSeated:value=>states.push(value)});
  const tick=seconds=>{for(let i=0;i<Math.ceil(seconds/.025);i++)controller.step(.025);};
  const key=code=>{const e=new Event('keydown',{cancelable:true});Object.defineProperties(e,{code:{value:code},repeat:{value:false}});window.dispatchEvent(e);return e;};
  return {canvas,camera,controller,states,tick,key};
}

test('Only a grounded visitor with a clear dry approach can sit on the actual bench',()=>{
  const v=visitor();assert.equal(v.controller.canSit(bench),true);
  for(const position of [{...OUTDOOR},{x:2.5,z:10.5,y:3.8},{x:2.5,z:12.2,y:0}])assert.equal(benchSeatFrom(position),null);
  v.controller.verticalOffset=.2;assert.equal(v.controller.sit(bench),false);v.controller.verticalOffset=0;
  v.controller.setPaused(true);assert.equal(v.controller.sit(bench),false);v.controller.setPaused(false);
  assert.equal(v.controller.sit(bench),true);assert.equal(v.controller.sit(bench),false);v.controller.dispose();
});

test('Sitting is continuous, keeps free look, pauses with help, and Space stands safely without a jump',()=>{
  const v=visitor();const standingEye=v.camera.position.y;assert.equal(v.controller.sit(bench),true);
  let previous=v.camera.position.clone();
  for(let i=0;i<100;i++){v.controller.step(.025);assert.ok(v.camera.position.distanceTo(previous)<.12);previous.copy(v.camera.position);}
  assert.equal(v.controller.seatState.phase,'seated');assert.ok(v.camera.position.y<standingEye-.1);
  assert.ok(Math.abs(v.camera.position.y-(bench.seatTop*space.worldScale[1]+bench.eyeHeight))<1e-8);
  const body={...v.controller.position};
  const pointer=(type,props)=>{const e=new Event(type);Object.assign(e,props);v.canvas.dispatchEvent(e);};
  pointer('pointerdown',{button:0,pointerId:1,clientX:400,clientY:300});pointer('pointermove',{clientX:520,clientY:260});pointer('pointerup',{clientX:520,clientY:260});v.tick(.1);
  assert.equal(v.controller.position.x,body.x);assert.equal(v.controller.position.z,body.z);assert.notEqual(v.controller.position.yaw,body.yaw);
  v.controller.setPaused(true);const paused=v.camera.position.clone();v.tick(1);assert.deepEqual(v.camera.position,paused);assert.equal(v.controller.seated,true);v.controller.setPaused(false);
  assert.equal(v.key('Space').defaultPrevented,true);v.tick(1);
  assert.equal(v.controller.seated,false);assert.equal(v.controller.jumpQueued,false);assert.equal(v.controller.verticalVelocity,0);assert.equal(v.controller.position.y,0);assert.equal(v.controller.eyeHeight,1.53);
  assert.equal(canStand(v.controller.position.x,v.controller.position.z),true);assert.deepEqual(v.states,[true,false]);v.controller.dispose();
});

test('Bench ray interaction and E seat/stand never open content or mark a quest',()=>{
  const v=visitor(),scene=new THREE.Scene(),world=new THREE.Group();scene.add(world);
  const [sx,sy,sz]=space.worldScale;world.matrixAutoUpdate=false;world.matrix.set(sx,0,sx*space.worldShear,0,0,sy,0,0,0,0,sz,0,0,0,0,1);
  const proxy=new THREE.Mesh(new THREE.BoxGeometry(2.865,.075,.855),new THREE.MeshBasicMaterial({visible:false}));proxy.position.set(2.5,bench.seatTop-.025,11.595);proxy.userData.contentId=bench.id;world.add(proxy);
  const wall=new THREE.Mesh(new THREE.BoxGeometry(5,3,.1),new THREE.MeshBasicMaterial());wall.position.set(2.5,1.5,11.0);world.add(wall);scene.updateMatrixWorld(true);
  v.camera.lookAt(new THREE.Vector3(...worldPoint(2.5,bench.seatTop,11.595)));v.camera.updateMatrixWorld(true);
  const abort=new AbortController(),opened=[],near=[];
  const interaction=createContentInteraction({camera:v.camera,controller:v.controller,entries:[{id:bench.id,kind:'seat',seat:bench,root:proxy,floor:0,focus:new THREE.Vector3(0,.038,0)}],targets:[proxy,wall],callbacks:{onOpen:id=>opened.push(id),onNearby:id=>near.push(id)},signal:abort.signal,reducedMotion:false});
  assert.equal(interaction.begin(bench.id),false);wall.position.x=10;scene.updateMatrixWorld(true);interaction.updateNearby();assert.equal(near.at(-1),bench.id);
  v.key('KeyE');assert.equal(v.controller.seated,true);assert.equal(interaction.phase,'idle');v.tick(3);assert.deepEqual(opened,[]);
  v.key('KeyE');v.tick(1);assert.equal(v.controller.seated,false);assert.deepEqual(opened,[]);abort.abort();v.controller.dispose();
});

test('A destination first stands then follows its dry route; reset cancels a pending seat transition',()=>{
  const v=visitor();v.controller.sit(bench);v.tick(3);v.controller.guide('terrace');assert.equal(v.controller.seatState.phase,'standing');
  v.tick(12);assert.equal(v.controller.seated,false);assert.ok(Math.hypot(...worldDelta(v.controller.position.x-OUTDOOR.x,v.controller.position.z-OUTDOOR.z))<.04);
  v.controller.reset();v.controller.sit(bench);v.tick(.25);v.controller.reset();v.tick(2);assert.equal(v.controller.seated,false);assert.deepEqual(v.controller.position,v.controller.initialPose);
  v.controller.dispose();
});
