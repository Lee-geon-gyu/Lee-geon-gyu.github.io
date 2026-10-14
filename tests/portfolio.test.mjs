import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import {complete,counts,newlyCompletedQuests,PROJECT_IDS} from '../src/state/session.js';
import {START,OUTDOOR,LIBRARY,GALLERY,ATELIER,RADIUS,space,flightPoint,stairPoint,stairCoordinates,canStand,clearSegment,routeBetween,moveOnSurface,eastBoundary,inPool,inPolygon,facadeFront,facadeColumns,railSupport,waterBounds,stairGardenHeight} from '../src/navigation/layout.js';
import {worldPoint,worldDelta,logicalDelta} from '../src/navigation/coordinates.js';
import {WalkController} from '../src/navigation/WalkController.js';
import {exhibitionPages,canInteract,Presentation,visibleTargets} from '../src/scene/interactionModel.js';
import * as THREE from 'three';
import {createContentInteraction} from '../src/scene/ContentInteraction.js';
const content=JSON.parse(fs.readFileSync(new URL('../public/portfolio-content.json',import.meta.url),'utf8'));
test('Seven, eight and larger archives retain all work in readable right-room slots',()=>{
  for(const count of [0,6,7,8,19]){
    const projects=Array.from({length:count},(_,i)=>({id:`work-${i}`})),pages=exhibitionPages(projects);
    assert.deepEqual(pages.flat().map(item=>item.id),projects.map(item=>item.id));
    assert.equal(pages.length,Math.ceil(count/6));
    for(const page of pages){assert.ok(page.length<=6);assert.equal(new Set(page.map(item=>JSON.stringify(item.slot))).size,page.length);for(const {slot} of page){assert.ok(slot.x>=-2.2&&slot.x<=2.2&&slot.z<0);assert.ok(slot.width>=1);}}
    const viewed=complete(new Set(),'portfolio',projects);assert.equal(counts(viewed,projects).portfolio,count);
    if(count){const one=complete(new Set(),projects.at(-1).id,projects);assert.equal(counts(one,projects).portfolio,1);}
    assert.equal(complete(new Set(),'unknown',projects).size,0);
  }
});
test('Nearby interactions require unobstructed same-floor ground access',()=>{
  const valid={distance:2.2,floorDifference:0,facing:.2,visible:true};assert.equal(canInteract(valid),true);
  for(const overrides of [{distance:3.2},{floorDifference:3.8},{facing:-.5},{visible:false},{airborne:true},{inWater:true}])assert.equal(canInteract({...valid,...overrides}),false);
});
test('Coincident frames from a hidden exhibition page cannot intercept clicks',()=>{
  const pages=[new THREE.Group(),new THREE.Group()],meshes=pages.map((page,i)=>{const mesh=new THREE.Mesh(new THREE.PlaneGeometry(1,1),new THREE.MeshBasicMaterial());mesh.userData.contentId=`project-${i?7:1}`;page.add(mesh);page.updateMatrixWorld(true);return mesh;});
  pages[0].visible=false;const ray=new THREE.Raycaster(new THREE.Vector3(0,0,2),new THREE.Vector3(0,0,-1));
  assert.equal(ray.intersectObjects(visibleTargets(meshes))[0].object.userData.contentId,'project-7');
  pages[0].visible=true;pages[1].visible=false;assert.equal(ray.intersectObjects(visibleTargets(meshes))[0].object.userData.contentId,'project-1');
});
test('Presentation opens once, reverses before opening and resets without a late open',()=>{
  const p=new Presentation();assert.equal(p.begin('profile'),true);assert.equal(p.begin('contact'),false);
  p.step(.5);p.close();assert.equal(p.step(1),'restored');assert.equal(p.phase,'idle');assert.equal(p.step(5),'');
  p.begin('contact');assert.equal(p.step(2),'open');assert.equal(p.step(1),'');p.close();assert.equal(p.step(1),'restored');
  p.begin('project-01');p.step(.5);p.reset();assert.equal(p.step(2),'');assert.equal(p.progress,0);
});
test('Real scene rays, E input and prop/camera animation restore without moving the body',()=>{
  global.window=new EventTarget();
  for(const kind of ['tablet','card']){
    const camera=new THREE.PerspectiveCamera(57,1,.06,130);camera.position.set(0,1.53,2);camera.lookAt(0,.9,0);
    const scene=new THREE.Scene(),root=new THREE.Group();root.position.set(0,.9,0);scene.add(root);
    const mesh=new THREE.Mesh(new THREE.BoxGeometry(.6,.08,.7),new THREE.MeshBasicMaterial());mesh.userData.contentId=kind;root.add(mesh);
    const hinge=new THREE.Group();root.add(hinge);
    const wall=new THREE.Mesh(new THREE.BoxGeometry(2,3,.1),new THREE.MeshBasicMaterial());wall.position.set(0,1,1);scene.add(wall);scene.updateMatrixWorld(true);
    let power=0;
    const entry={id:kind,kind,root,focus:new THREE.Vector3(),floor:0,size:{width:.91},setPower:kind==='tablet'?value=>{power=value;}:undefined};
    const controller={position:{x:0,y:0,z:2},verticalOffset:0,swimming:false,paused:false,setPaused(value){this.paused=value;}};
    const abort=new AbortController(),opened=[],near=[];
    const interaction=createContentInteraction({camera,controller,entries:[entry],targets:[mesh,wall],callbacks:{onOpen:id=>opened.push(id),onNearby:id=>near.push(id)},signal:abort.signal,reducedMotion:false});
    assert.equal(interaction.canActivate(kind),false);assert.equal(interaction.begin(kind),false);wall.position.x=10;scene.updateMatrixWorld(true);
    assert.equal(interaction.canActivate(kind),true);
    interaction.updateNearby();assert.equal(near.at(-1),kind);
    const position=camera.position.clone(),rotation=camera.quaternion.clone(),prop=root.position.clone(),body={...controller.position};
    const e=new Event('keydown',{cancelable:true});Object.defineProperties(e,{code:{value:'KeyE'},repeat:{value:false}});window.dispatchEvent(e);
    assert.equal(interaction.phase,'opening');assert.equal(interaction.canActivate(kind),false);assert.equal(controller.paused,true);interaction.step(.8);
    assert.notDeepEqual(camera.position.toArray(),position.toArray());if(kind==='tablet')assert.ok(power>0&&power<1);interaction.step(1);assert.deepEqual(opened,[kind]);
    if(kind==='tablet')assert.equal(power,1);assert.notDeepEqual(root.position.toArray(),prop.toArray());
    interaction.close();interaction.step(1);assert.equal(controller.paused,false);
    assert.deepEqual(controller.position,body);assert.deepEqual(camera.position.toArray(),position.toArray());assert.deepEqual(camera.quaternion.toArray(),rotation.toArray());assert.deepEqual(root.position.toArray(),prop.toArray());assert.equal(power,0);
    interaction.updateNearby();assert.equal(near.at(-1),kind);assert.equal(interaction.begin(kind),true);interaction.step(.8);interaction.reset();interaction.step(10);assert.deepEqual(opened,[kind]);assert.equal(power,0);abort.abort();
  }
});
test('Hover availability rejects far, hidden, wrong-floor, jumping, swimming and paused props',()=>{
  global.window=new EventTarget();
  const camera=new THREE.PerspectiveCamera(57,1,.06,130);camera.position.set(0,1.53,2);camera.lookAt(0,.9,0);
  const root=new THREE.Group();root.position.y=.9;
  const mesh=new THREE.Mesh(new THREE.BoxGeometry(.6,.08,.7),new THREE.MeshBasicMaterial());mesh.userData.contentId='profile';root.add(mesh);root.updateMatrixWorld(true);
  const controller={position:{y:0},verticalOffset:0,swimming:false,seated:false,paused:false,setPaused(value){this.paused=value;}};
  const abort=new AbortController();
  const interaction=createContentInteraction({camera,controller,entries:[{id:'profile',kind:'tablet',root,size:{width:.91},focus:new THREE.Vector3(),floor:0}],targets:[mesh],callbacks:{},signal:abort.signal});
  assert.equal(interaction.canActivate('profile'),true);assert.equal(interaction.canActivate('unknown'),false);
  camera.position.z=6;assert.equal(interaction.canActivate('profile'),false);camera.position.z=2;
  for(const [key,value] of [['paused',true],['swimming',true],['seated',true],['verticalOffset',.2]]){
    const previous=controller[key];controller[key]=value;assert.equal(interaction.canActivate('profile'),false,key);controller[key]=previous;
  }
  controller.position.y=3.8;assert.equal(interaction.canActivate('profile'),false);controller.position.y=0;
  root.visible=false;assert.equal(interaction.canActivate('profile'),false);root.visible=true;
  assert.equal(interaction.canActivate('profile'),true);assert.equal(interaction.begin('profile'),true);assert.equal(interaction.canActivate('profile'),false);
  interaction.close();interaction.step(1);assert.equal(interaction.canActivate('profile'),true);
  abort.abort();mesh.geometry.dispose();mesh.material.dispose();
});

test('Six original projects retain every link, description, metadata and artwork',()=>{
  assert.deepEqual(content.projects.map(p=>p.title),['SWEATIE','DIVE','EATGO','JW중외제약','CJ올리브영','E1오렌지카드']);
  assert.equal(content.projects.flatMap(p=>p.links).length,11);
  for(const p of content.projects){assert.ok(p.description);assert.equal(p.metadata.length,3);assert.ok(p.originalHtml);for(const a of [p.logo,p.representativeImage])assert.ok(fs.existsSync(new URL(`../public/${a}`,import.meta.url)));}
  assert.equal(content.profile.sections.length,5);
  assert.equal(content.profile.email,'gungyu0203@naver.com');
  const integrity=JSON.parse(fs.readFileSync(new URL('../public/content-integrity.json',import.meta.url),'utf8'));
  for(const a of integrity.contentAssets){const file=new URL(`../public/${a.file}`,import.meta.url);assert.ok(fs.existsSync(file));assert.equal(crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex'),a.sha256);}
});
test('The baked room exports exactly the material and indirect-light UV channels',()=>{
  const glb=fs.readFileSync(new URL('../public/assets/connected-atelier.glb',import.meta.url));
  assert.equal(glb.toString('ascii',0,4),'glTF');assert.equal(glb.readUInt32LE(4),2);
  assert.equal(glb.readUInt32LE(16),0x4e4f534a);
  const scene=JSON.parse(glb.toString('utf8',20,20+glb.readUInt32LE(12)));
  const primitives=scene.meshes.flatMap(mesh=>mesh.primitives);assert.ok(primitives.length);
  for(const primitive of primitives){
    const attributes=primitive.attributes;
    assert.ok(Number.isInteger(attributes.TEXCOORD_0));assert.ok(Number.isInteger(attributes.TEXCOORD_1));
    assert.equal(attributes.TEXCOORD_2,undefined,'Unexpected UV shifts the baked-light channel');
    const count=scene.accessors[attributes.POSITION].count;
    assert.equal(scene.accessors[attributes.TEXCOORD_0].count,count);assert.equal(scene.accessors[attributes.TEXCOORD_1].count,count);
  }
  const lightmap=fs.readFileSync(new URL('../public/assets/atelier-indirect.png',import.meta.url));
  assert.equal(lightmap.readUInt32BE(16),2048);assert.equal(lightmap.readUInt32BE(20),2048);
});
test('Scene and direct menus share unique completion; reset starts with zero',()=>{
  let state=complete(new Set(),'project-01');state=complete(state,'project-01');assert.equal(counts(state).portfolio,1);
  state=complete(state,'profile');assert.deepEqual(counts(state),{profile:1,portfolio:1,contact:0});
  state=complete(state,'portfolio');assert.equal(counts(state).portfolio,6);PROJECT_IDS.forEach(id=>assert.ok(state.has(id)));
  state=complete(state,'invalid');assert.equal(state.size,7);
  assert.deepEqual(counts(new Set()),{profile:0,portfolio:0,contact:0});
});
test('The same dry passage is freely walkable in both directions',()=>{
  for(const [from,to] of [[START,OUTDOOR],[OUTDOOR,START]]){
    const path=routeBetween(from,to);assert.ok(path.length);let previous=from;
    for(const next of path){assert.ok(clearSegment(previous,next),'the opening viewpoint reaches the dry passage around the pool');previous=next;}
  }
  for(let z=-.8;z<3.05;z+=.025)assert.ok(canStand(0,z),`blocked passage at z=${z}`);
  for(let z=3.2;z<8.0;z+=.025)assert.ok(canStand(1.1,z),`blocked pool-side walkway at z=${z}`);
  assert.equal(canStand(2,0),false);assert.equal(canStand(-1.5,4.8),false);assert.equal(canStand(0,-6.2),false);
  for(const p of [{x:1.3,z:4.9},{x:2.3,z:8.2},{x:1.8,z:-3.5},{x:-4.9,z:5.5}]){
    const path=routeBetween(p,START);assert.ok(path.length);let previous=p;for(const next of path){assert.ok(clearSegment(previous,next));previous=next;}
  }
});
test('Guidance runs continuously, manual cancellation preserves position, details pause movement',()=>{
  globalThis.window=new EventTarget();const canvas=new EventTarget();canvas.setPointerCapture=()=>{};
  const camera={position:{set(){}},rotation:{set(){}}};let area='atelier',routes=[];
  const controller=new WalkController(canvas,camera,{onClick(){},onArea:value=>area=value,onRoute:value=>routes.push(value)});
  controller.guide();let previous={...controller.position};
  for(let i=0;i<800;i++){controller.step(.025);assert.ok(Math.hypot(...worldDelta(controller.position.x-previous.x,controller.position.z-previous.z))<=space.poolMotion.runSpeed*.025+1e-6);previous={...controller.position};}
  assert.equal(area,'terrace');assert.equal(controller.path.length,0);
  assert.equal(controller.arrival,null);assert.ok(Math.abs(controller.position.pitch-OUTDOOR.pitch)<.003);
  assert.ok(Math.abs(controller.position.yaw-OUTDOOR.yaw)<.003);
  controller.guide();for(let i=0;i<800;i++)controller.step(.025);
  assert.equal(area,'atelier');assert.equal(controller.path.length,0);
  assert.equal(controller.arrival,null);assert.ok(Math.abs(controller.position.pitch-START.pitch)<.003);
  assert.ok(Math.abs(controller.position.yaw-START.yaw)<.003);
  controller.guide();for(let i=0;i<800;i++)controller.step(.025);
  controller.guide();controller.step(.1);const current={...controller.position};controller.cancelRoute();assert.deepEqual(controller.position,current);
  controller.keys.add('KeyW');controller.setPaused(true);controller.step(1);assert.deepEqual(controller.position,current);
  controller.setPaused(false);controller.touchMove={x:1,z:1};controller.reset();controller.step(.2);
  assert.equal(area,'atelier');assert.deepEqual(controller.position,START);
  controller.touchMove={x:1,z:1};window.dispatchEvent(new Event('blur'));controller.step(.2);assert.deepEqual(controller.position,START);controller.dispose();
});

test('The connected stair, flat landing and upper turn link both stories without crossing railings',()=>{
  for(const [from,to] of [[OUTDOOR,LIBRARY],[LIBRARY,OUTDOOR],[START,LIBRARY]]){
    const route=routeBetween(from,to);assert.ok(route.length,'missing physical route');
    let previous={...from,y:from.y??0};
    for(const point of route){assert.ok(clearSegment(previous,point));previous=point;}
  }
  const mid=stairPoint(.5);
  const beyondRail=stairPoint(.5,-space.stairs.width/2-.1);
  assert.equal(moveOnSurface(mid,beyondRail.x,beyondRail.z),null,'cannot cross the stair handrail into the planted bed');
  assert.equal(moveOnSurface({x:-2,z:2.3,y:space.upperFloor},-2,2.7),null,'cannot fall through the balcony edge');
  for(const flight of space.stairs.flights)for(let i=1;i<flight.steps;i++){
    const below=flightPoint(flight,(i-.1)/flight.steps),above=flightPoint(flight,(i+.1)/flight.steps);
    assert.ok(above.y>below.y);assert.ok(clearSegment(below,above));
  }
  const landing={x:4,z:3.05,y:space.stairs.landingHeight};
  assert.ok(canStand(landing.x,landing.z,RADIUS,landing.y));
  const across=moveOnSurface(landing,4,2.85);assert.equal(across.y,landing.y,'the intermediate landing stays level');
  assert.ok(routeBetween(landing,LIBRARY).length);assert.ok(routeBetween(landing,OUTDOOR).length);
  assert.ok(routeBetween(mid,LIBRARY).length);assert.ok(routeBetween(mid,OUTDOOR).length);
  globalThis.window=new EventTarget();const canvas=new EventTarget();canvas.setPointerCapture=()=>{};
  let cameraY=0;const camera={position:{set(x,y,z){cameraY=y;}},rotation:{set(){}}};
  const controller=new WalkController(canvas,camera,{onClick(){},onArea(){},onRoute(){}});
  controller.guide('library');let previous={...controller.position};
  for(let i=0;i<1500;i++){
    controller.step(.025);assert.ok(Math.abs((controller.position.y??0)-(previous.y??0))*space.worldScale[1]<.07,'running stairs have no vertical jump');previous={...controller.position};
  }
  assert.equal(controller.area,'library');assert.ok(Math.abs(cameraY-(space.upperFloor*space.worldScale[1]+1.53))<.001);assert.equal(controller.path.length,0);assert.equal(controller.arrival,null);
  controller.guide();for(let i=0;i<1500;i++)controller.step(.025);
  assert.equal(controller.area,'terrace');assert.ok(Math.abs(cameraY-1.53)<.001);assert.equal(controller.path.length,0);
  controller.reset();assert.deepEqual(controller.position,START);controller.dispose();
});

test('The former upper east alcove is completely solid while its front passage stays open',()=>{
  assert.equal(canStand(2.51,-1.5,RADIUS,space.upperFloor),false);
  for(const x of [2.6,3.1,4.2,5.1])for(const z of [-2.9,-1.5,-.3])assert.equal(canStand(x,z,RADIUS,space.upperFloor),false);
  const start={x:3.05,z:.45,y:space.upperFloor};
  const route=routeBetween(start,LIBRARY);
  assert.ok(route.length>0);
  let previous=start;
  for(const next of route){assert.ok(clearSegment(previous,next));previous=next;}
});

test('The reference courtyard opening pose is restored after visiting the upper story',()=>{
  globalThis.window=new EventTarget();const canvas=new EventTarget();canvas.setPointerCapture=()=>{};
  const camera={position:{set(){}},rotation:{set(){}}};let area='';
  const controller=new WalkController(canvas,camera,{start:OUTDOOR,onClick(){},onArea:value=>area=value,onRoute(){}});
  assert.equal(area,'terrace');assert.ok(canStand(controller.position.x,controller.position.z));
  controller.guide('library');for(let i=0;i<1600;i++)controller.step(.025);
  assert.equal(area,'library');controller.reset();assert.deepEqual(controller.position,OUTDOOR);assert.equal(area,'terrace');controller.dispose();
});

test('WASD climbs all three directions and strafing at an angled rail cannot descend a story',()=>{
  globalThis.window=new EventTarget();window.closest=()=>null;
  const canvas=new EventTarget();canvas.setPointerCapture=()=>{};
  let eyeY=0;const camera={position:{set(x,y,z){eyeY=y;}},rotation:{set(){}}};
  const controller=new WalkController(canvas,camera,{onClick(){},onArea(){},onRoute(){}});
  const key=(type,code)=>{const event=new Event(type,{cancelable:true});Object.defineProperty(event,'code',{value:code});window.dispatchEvent(event);};
  for(const flight of space.stairs.flights){
    const [a,b]=[flight.foot,flight.head];
    const yaw=Math.atan2(...worldDelta(a[0]-b[0],a[1]-b[1]));
    controller.position={...flightPoint(flight,.35),yaw,pitch:0};
    const initial=controller.position.y;
    key('keydown','KeyW');for(let i=0;i<12;i++)controller.step(.025);key('keyup','KeyW');
    assert.ok(controller.position.y>initial);
    assert.ok(Math.abs(eyeY-(controller.position.y*space.worldScale[1]+1.53))<.001);
    const heightBeforeSlide=controller.position.y;
    key('keydown','KeyA');for(let i=0;i<100;i++)controller.step(.025);key('keyup','KeyA');
    assert.ok(Math.abs(stairCoordinates(controller.position.x,controller.position.z).side)<space.stairs.width/2-.15);
    assert.ok(Math.abs(controller.position.y-heightBeforeSlide)<.16,'strafe stays on the same local tread region at a mitered edge');
  }
  const upper=space.stairs.flights.at(-1);
  controller.position={...flightPoint(upper,.55),yaw:Math.atan2(...worldDelta(upper.foot[0]-upper.head[0],upper.foot[1]-upper.head[1])),pitch:0};
  key('keydown','KeyW');for(let i=0;i<30;i++)controller.step(.025);key('keyup','KeyW');
  assert.equal(controller.position.y,space.upperFloor);assert.equal(controller.area,'library');
  assert.equal(controller.keys.size,0);controller.dispose();
});

test('The left studio has an open entry and both widened dry passages remain clear',()=>{
  for(const from of [START,OUTDOOR,{x:-3.75,z:3.45}]){
    const path=routeBetween(from,GALLERY);assert.ok(path.length,'left studio must be physically reachable');
    let previous=from;for(const next of path){assert.ok(clearSegment(previous,next));previous=next;}
    assert.ok(routeBetween(GALLERY,from).length);
  }
  assert.ok(clearSegment({x:-3.75,z:3.45},{x:-3.75,z:-.65}),'no legacy wall blocks the left entry');
  assert.equal(canStand(-3.75,-2.65),false,'the artwork backing is a solid wall, not a third pocket');
  for(let x=.4;x<=1.75;x+=.15)for(let z=4.6;z<7.4;z+=.2)assert.ok(canStand(x,z),`narrow pool/stair passage ${x},${z}`);
  for(let x=-4.75;x<1.3;x+=.1)assert.ok(canStand(x,3.45),`front crosswalk blocked ${x}`);
});

test('The left-studio guide walks through its open front and settles inside the room',()=>{
  globalThis.window=new EventTarget();const canvas=new EventTarget();canvas.setPointerCapture=()=>{};
  const controller=new WalkController(canvas,{position:{set(){}},rotation:{set(){}}},{start:OUTDOOR,onClick(){},onArea(){},onRoute(){}});
  controller.guide('gallery');let previous={...controller.position};
  for(let i=0;i<1100;i++){controller.step(.025);assert.ok(Math.hypot(...worldDelta(controller.position.x-previous.x,controller.position.z-previous.z))<=space.poolMotion.runSpeed*.025+1e-6);previous={...controller.position};}
  assert.equal(controller.area,'atelier');assert.equal(controller.path.length,0);assert.equal(controller.arrival,null);
  assert.ok(Math.hypot(controller.position.x-GALLERY.x,controller.position.z-GALLERY.z)<.02);controller.dispose();
});

test('Three-direction mitered stair joins share full-width floor heights',()=>{
 const [a,b,c]=space.stairs.flights;
 assert.equal(space.stairs.flights.length,3);
 for(const [i,f] of [a,b,c].entries()){
  const direction=worldDelta(f.head[0]-f.foot[0],f.head[1]-f.foot[1]);
  assert.ok(Math.abs(Math.atan2(direction[0],-direction[1])*180/Math.PI-[33,0,-33][i])<1e-7,'physical angle includes world skew');
  for(const side of [0,1]){
   const p=f.startEdge[side],q=f.endEdge[side],v=worldDelta(q[0]-p[0],q[1]-p[1]);
   assert.ok(Math.abs(Math.atan2(v[0],-v[1])*180/Math.PI-[33,0,-33][i])<1e-7,'rails and wall edges follow the flight');
  }
  const [l,r]=f.startEdge.map(p=>worldDelta(...p)),normal=[-direction[1],direction[0]],length=Math.hypot(...normal);
  assert.ok(Math.abs(((r[0]-l[0])*normal[0]+(r[1]-l[1])*normal[1])/length-2.50)<1e-7,'2.50 meter clear plan width');
 }
 assert.deepEqual(a.endEdge,b.startEdge);
 assert.deepEqual(space.stairs.landing,[b.endEdge[0],b.endEdge[1],c.startEdge[1],c.startEdge[0]]);
 for(const f of space.stairs.flights)for(let t=.02;t<1;t+=.035)for(const side of [-.8,-.4,0,.4,.8]){
  const p=flightPoint(f,t,side);assert.ok(canStand(p.x,p.z,RADIUS,p.y),`unsupported stair ${p.x},${p.z}`);
  const next=flightPoint(f,Math.min(1,t+.015),side);assert.ok(clearSegment(p,next));
 }
 for(const side of [-.8,0,.8])assert.ok(clearSegment(flightPoint(a,.97,side),flightPoint(b,.03,side)));
});
test('Affine world skew preserves metric input and fixed human eye height',()=>{
 for(const [x,z] of [[1,2],[-2,5],[.4,-.8]]){
  const metric=worldDelta(x,z),logical=logicalDelta(...metric);
  assert.ok(Math.abs(logical[0]-x)<1e-9);assert.ok(Math.abs(logical[1]-z)<1e-9);
  assert.equal(worldPoint(x,3.8,z,1.53)[1],3.8*space.worldScale[1]+1.53);
 }
});

function visitor(start){
 globalThis.window=new EventTarget();const canvas=new EventTarget();canvas.setPointerCapture=()=>{};
 let eyeY=0;const camera={position:{set(x,y,z){eyeY=y;}},rotation:{set(){}}};
 const controller=new WalkController(canvas,camera,{start,onClick(){},onArea(){},onRoute(){}});
 const key=(type,code,repeat=false)=>{const e=new Event(type,{cancelable:true});Object.defineProperties(e,{code:{value:code},repeat:{value:repeat}});window.dispatchEvent(e);return e;};
 const tick=seconds=>{for(let i=0;i<Math.ceil(seconds/.025);i++)controller.step(.025);};
 return {controller,key,tick,eye:()=>eyeY};
}
test('Quest completion fires once per full quest and follows the archive size',()=>{
 for(const count of [0,6,8,19]){
  const projects=Array.from({length:count},(_,i)=>({id:`work-${i}`}));let state=new Set();
  for(const id of ['profile',...projects.map(project=>project.id),'contact']){
   const next=complete(state,id,projects),completed=newlyCompletedQuests(state,next,projects);
   assert.deepEqual(completed,id==='profile'||id==='contact'?[id]:id===projects.at(-1).id?['portfolio']:[]);
   assert.deepEqual(newlyCompletedQuests(next,complete(next,id,projects),projects),[],'reopening never replays completion');state=next;
  }
  assert.deepEqual(newlyCompletedQuests(state,new Set(),projects),[],'reset never completes a quest');
  assert.deepEqual(newlyCompletedQuests(new Set(),complete(new Set(),'portfolio',projects),projects),count?['portfolio']:[]);
 }
});
test('Guide carries running speed through corners and accepts a new target without stopping or teleporting',()=>{
 const v=visitor(OUTDOOR),c=v.controller;c.guide('library');let travelled=0,frames=0;
 while(c.path.length&&frames++<500){
  const previous={...c.position};assert.equal(c.sprinting,true);c.step(.025);
  const distance=Math.hypot(...worldDelta(c.position.x-previous.x,c.position.z-previous.z));
  if(c.path.length)assert.ok(distance>.025,'no idle waypoint frame');
  assert.ok(distance<=space.poolMotion.runSpeed*.025+1e-6);assert.equal(c.swimming,false);travelled+=distance;
  if(frames===30){const current={...c.position};c.guide('atelier');assert.deepEqual(c.position,current);assert.equal(c.arrival,null);}
 }
 assert.ok(travelled>4);assert.ok(frames<500);assert.ok(Math.hypot(...worldDelta(c.position.x-ATELIER.x,c.position.z-ATELIER.z))<1e-6);
 assert.ok(c.arrival,'arrival orientation still settles naturally');const current={...c.position};c.guide('gallery');assert.deepEqual(c.position,current);assert.equal(c.arrival,null);
 v.tick(12);assert.ok(Math.hypot(...worldDelta(c.position.x-GALLERY.x,c.position.z-GALLERY.z))<1e-6);assert.equal(c.arrival,null);c.dispose();
});
test('A visitor on the left pool bank takes its direct dry passage instead of detouring around the right bank',()=>{
 const from={x:-4.6,z:8.4},path=routeBetween(from,GALLERY);assert.ok(path.length);
 let previous=from,length=0;
 for(const point of path){assert.ok(clearSegment(previous,point));length+=Math.hypot(...worldDelta(point.x-previous.x,point.z-previous.z));previous=point;}
 const direct=Math.hypot(...worldDelta(GALLERY.x-from.x,GALLERY.z-from.z));assert.ok(length<direct+1,'route stays near the direct distance');
 assert.ok(path.every(point=>point.x<-3),'no unnecessary crossing to the opposite bank');
});
test('The studio passage is free after moving the tree planter beside the west column',()=>{
 const garden=JSON.parse(fs.readFileSync(new URL('../src/scene/garden-layout.json',import.meta.url),'utf8'));
 const pot=garden.roomTreePlanters[0],[x,z]=pot.position,column=facadeColumns.lower[0];
 assert.equal(canStand(-2.82,.85),true,'the former obstructed position can be walked through');
 assert.equal(canStand(x,z),false,'collision follows the moved planter');
 assert.ok(x-pot.size/2-(column.x+column.size/2)>.035,'planter clears the column');
 assert.ok(x-pot.size/2-(column.x+column.size/2)<.055,'planter stays beside its requested column');
 const revealGap=column.z-column.size/2-space.lowerColumnBase.border-(z+pot.size/2);
 assert.ok(revealGap>.005&&revealGap<.015,'planter clears the complete rear edge of the visible collar');
 assert.ok(clearSegment({x:-3.75,z:3.45},GALLERY),'the studio entry remains clear');
});
test('The red bench-side pot stays outside the beds and both facade columns touch one wall plane',()=>{
 const garden=JSON.parse(fs.readFileSync(new URL('../src/scene/garden-layout.json',import.meta.url),'utf8'));
 const pot=garden.loosePots.find(p=>p.asset==='plantA'),[x,z]=pot.position;
 assert.ok(x-pot.radius>3.925+.10&&z>11.18&&z<12.01,'pot sits beside the left end of the rendered bench');
 for(let i=0;i<24;i++){
  const px=x+Math.cos(i*Math.PI/12)*pot.radius,pz=z+Math.sin(i*Math.PI/12)*pot.radius;
  assert.equal(inPolygon(px,pz,garden.eastBed),false,'pot does not intersect the angled bed');
  assert.ok(garden.beds.every(([a,b,c,d])=>px<a||px>b||pz<c||pz>d),'pot does not intersect an end bed');
 }
 assert.equal(canStand(x,z),false,'the loose pot has matching physical collision');
 const west=space.westFacade,face=west.wallCenterX+west.wallThickness/2;
 for(const column of [facadeColumns.lower[0],facadeColumns.upper[0]])assert.ok(Math.abs(column.x-column.size/2-face)<1e-8);
 assert.ok(Math.abs(garden.beds[0][2]-facadeColumns.lower[0].z-facadeColumns.lower[0].size/2-space.lowerColumnBase.border-.025)<1e-5,'west bed rim reaches the column collar');
});
test('The work destination finishes within interaction range of the exhibited frames',()=>{
 const v=visitor(OUTDOOR);v.controller.guide('atelier');v.tick(12);const p=v.controller.position;
 assert.ok(Math.hypot(...worldDelta(p.x-ATELIER.x,p.z-ATELIER.z))<1e-6);assert.equal(v.controller.path.length,0);
 assert.ok(Math.hypot(...worldDelta(2.2-p.x,-4.5-p.z))<3.1);assert.ok(canStand(p.x,p.z));v.controller.dispose();
});
test('Shift runs in world meters and Space makes one grounded jump without auto repeat',()=>{
 const pose={x:1,z:9.6,yaw:0,pitch:0},v=visitor(pose);
 v.key('keydown','KeyW');v.tick(.4);v.key('keyup','KeyW');const walked=Math.hypot(...worldDelta(v.controller.position.x-pose.x,v.controller.position.z-pose.z));
 v.controller.reset();v.key('keydown','ShiftLeft');v.key('keydown','KeyW');v.tick(.4);v.key('keyup','KeyW');v.key('keyup','ShiftLeft');
 const ran=Math.hypot(...worldDelta(v.controller.position.x-pose.x,v.controller.position.z-pose.z));assert.ok(ran>walked*1.9&&ran<walked*2.1);
 v.controller.reset();assert.ok(v.key('keydown','Space').defaultPrevented);let apex=0;
 for(let i=0;i<100;i++){if(i%5===0)v.key('keydown','Space',true);v.tick(.025);apex=Math.max(apex,v.controller.feetY);}
 assert.ok(apex>1.35&&apex<1.5,'jump clears the physical oak rail without auto repeating');assert.equal(v.controller.feetY,0);assert.equal(v.eye(),1.53);v.key('keyup','Space');v.controller.dispose();
});
test('Pool entry is continuous, the camera sinks underwater and Space raises it gradually',()=>{
 const v=visitor({x:-2.3,z:9.95,yaw:0,pitch:0});v.key('keydown','KeyW');let last=0;
 for(let i=0;i<80;i++){v.tick(.025);assert.ok(Math.abs(v.controller.feetY-last)<.16,'no entry teleport');last=v.controller.feetY;}
 v.key('keyup','KeyW');v.tick(5);assert.equal(v.controller.swimming,true);assert.equal(v.controller.motion.underwater,true);assert.ok(v.eye()<-.9);
 assert.ok(Math.abs(v.controller.feetY-space.poolMotion.bottom*space.worldScale[1])<.001);
 v.key('keydown','Space');last=v.controller.feetY;
 for(let i=0;i<120;i++){v.tick(.025);assert.ok(v.controller.feetY>=last-1e-6);assert.ok(v.controller.feetY-last<.12);last=v.controller.feetY;}
 assert.ok(v.eye()>0&&v.eye()<.35);assert.equal(v.controller.motion.underwater,false);v.key('keyup','Space');v.controller.dispose();
});
test('Holding Space and moving toward any of four banks climbs out without crossing a submerged wall',()=>{
 for(const yaw of [0,Math.PI,-Math.PI/2,Math.PI/2]){
  const v=visitor({x:-2.3,z:6.85,y:space.poolMotion.bottom,yaw,pitch:0});v.key('keydown','KeyW');v.tick(4);v.key('keyup','KeyW');
  assert.equal(v.controller.swimming,true);assert.ok(inPool(v.controller.position.x,v.controller.position.z,RADIUS-.01));
  v.key('keydown','Space');v.key('keydown','KeyW');let last=v.controller.feetY;
  for(let i=0;i<400;i++){v.tick(.025);assert.ok(Math.abs(v.controller.feetY-last)<.17,'exit lift stays continuous');last=v.controller.feetY;}
  v.key('keyup','KeyW');v.key('keyup','Space');v.tick(.5);assert.equal(v.controller.swimming,false,`bank yaw ${yaw}`);assert.equal(v.controller.feetY,0);assert.equal(v.eye(),1.53);v.controller.dispose();
 }
});
test('Navigation buttons physically leave the water before following the dry route; pause and reset clear input',()=>{
 const v=visitor({x:-2.3,z:6.85,y:space.poolMotion.bottom,yaw:0,pitch:0});v.controller.guide('library');
 let last=v.controller.feetY;for(let i=0;i<1800;i++){v.tick(.025);assert.ok(Math.abs(v.controller.feetY-last)<.17);last=v.controller.feetY;}
 assert.equal(v.controller.area,'library');assert.equal(v.controller.poolGuide,null);assert.equal(v.controller.path.length,0);
 v.key('keydown','Space');v.tick(.2);v.controller.setPaused(true);const before=v.eye();v.tick(1);assert.equal(v.eye(),before);assert.equal(v.controller.keys.size,0);
 v.controller.setPaused(false);v.controller.touchAction('jump',true);v.controller.touchAction('run',true);v.controller.reset();assert.equal(v.controller.verticalOffset,0);assert.equal(v.controller.verticalVelocity,0);assert.equal(v.controller.touchRun,false);assert.equal(v.controller.touchRise,false);v.controller.dispose();
});
test('The east wall follows all right stair stations and the lower facade wedge is solid',()=>{
 for(const f of space.stairs.flights)for(let t=0;t<=1;t+=.1){const p=flightPoint(f,t,f.width/2);assert.ok(Math.abs(eastBoundary(p.z)-p.x-space.stairWallOffset)<1e-6);}
 assert.equal(canStand(2.30,.65),false);assert.ok(canStand(1.5,1.1));
});

test('The upper deck stays inside the connected east wall and the filled return shares one west plane',()=>{
 for(const [x,z] of space.upperOutline)assert.ok(x<=eastBoundary(z)+1e-7,'no upper floor tongue beyond masonry');
 assert.equal(space.upperClosure[0],2.16);
 assert.ok(canStand(3.05,.45,RADIUS,space.upperFloor));
 assert.ok(routeBetween(OUTDOOR,LIBRARY).length);
});

test('The right stair garden joins the ground bed and rises outside the full-width steps',()=>{
 const garden=JSON.parse(fs.readFileSync(new URL('../src/scene/garden-layout.json',import.meta.url),'utf8'));
 const sections=garden.stairBedSections;
 assert.equal(garden.stairGardenSide,'east');
 assert.deepEqual(sections[0].edge,[garden.eastBed[0],garden.eastBed.at(-1)]);
 assert.deepEqual(sections[0].soil,[garden.eastSoil[0],garden.eastSoil.at(-1)]);
 assert.equal(sections[0].height,0);assert.equal(sections.at(-1).height,space.upperFloor);
 for(const f of space.stairs.flights)for(let t=.08;t<1;t+=.09){
  const edge=flightPoint(f,t,f.width/2),x=edge.x+.23;
  assert.ok(Math.abs(stairGardenHeight(x,edge.z)-(edge.y+.28))<.015,'bed follows the same slope');
  const center=flightPoint(f,t);assert.equal(stairGardenHeight(center.x,center.z),null,'clear stair width retained');
  assert.ok(canStand(center.x,center.z,RADIUS,center.y));
 }
 assert.equal(space.pool[1]-space.pool[0],4.3);
});


test('Holding Ctrl crouches smoothly, slows movement and releases on keyup, blur and reset',()=>{
 const v=visitor({x:1,z:9.6,yaw:0,pitch:0}),start={...v.controller.position};
 assert.ok(v.key('keydown','ControlLeft').defaultPrevented);v.key('keydown','ShiftLeft');v.key('keydown','KeyW');
 v.tick(.5);assert.equal(v.controller.crouching,true);assert.equal(v.controller.sprinting,false);assert.ok(v.eye()>.94&&v.eye()<.96);
 assert.ok(Math.hypot(...worldDelta(v.controller.position.x-start.x,v.controller.position.z-start.z))<.44);
 v.key('keyup','KeyW');v.key('keyup','ControlLeft');v.tick(.6);assert.ok(v.eye()>1.529);
 v.controller.touchAction('crouch',true);v.tick(.5);assert.ok(v.eye()<.96);
 window.dispatchEvent(new Event('blur'));v.tick(.6);assert.equal(v.controller.crouching,false);assert.ok(v.eye()>1.529);
 v.controller.touchAction('crouch',true);v.controller.reset();assert.equal(v.controller.touchCrouch,false);assert.equal(v.eye(),1.53);v.controller.dispose();
});
test('A jump lands on the native balcony rail and stepping off falls continuously to the terrace',()=>{
 const x=-1,edge=facadeFront(x),v=visitor({x,z:edge-.35,y:space.upperFloor,yaw:Math.PI,pitch:0});
 v.key('keydown','Space');v.key('keydown','KeyW');let reached=false;
 for(let i=0;i<90;i++){v.tick(.0125);if(railSupport(v.controller.position.x,v.controller.position.z)){reached=true;break;}}
 assert.ok(reached,'jump reaches the real oak rail');v.key('keyup','KeyW');v.key('keyup','Space');v.tick(1.5);
 assert.equal(v.controller.onRail,true);assert.equal(v.controller.verticalVelocity,0);assert.ok(v.controller.feetY>5.45&&v.controller.feetY<5.55);
 const top=v.controller.feetY;v.key('keydown','KeyW');let previous=top,sawFall=false;
 for(let i=0;i<200;i++){v.tick(.0125);assert.ok(Math.abs(v.controller.feetY-previous)<.28,'no fall teleport');if(v.controller.verticalVelocity<-.5)sawFall=true;previous=v.controller.feetY;if(sawFall&&v.controller.feetY===0)break;}
 v.key('keyup','KeyW');v.tick(.5);assert.ok(sawFall);assert.equal(v.controller.onRail,false);assert.equal(v.controller.feetY,0);assert.equal(v.controller.area,'terrace');v.controller.dispose();
});
test('All four solid pool coping bands stay dry until the center crosses the rendered water edge',()=>{
 const [a,b,c,d]=space.pool,midX=(a+b)/2,midZ=(c+d)/2;
 for(const start of [{x:a+.06,z:midZ,yaw:-Math.PI/2},{x:b-.06,z:midZ,yaw:Math.PI/2},{x:midX,z:c+.06,yaw:Math.PI},{x:midX,z:d-.06,yaw:0}]){
  const v=visitor({...start,pitch:0});v.tick(1);assert.equal(v.controller.swimming,false);assert.equal(v.controller.feetY,0);
  v.key('keydown','KeyW');v.tick(.10);v.key('keyup','KeyW');v.tick(3);
  assert.ok(inPool(v.controller.position.x,v.controller.position.z),'crossed visible water');assert.equal(v.controller.swimming,true);v.controller.dispose();
 }
 assert.deepEqual(waterBounds,[a+.115,b-.115,c+.115,d-.115]);
});


test('Guidance from a rail physically steps back onto the deck before using the stairs',()=>{
 const x=-1,z=facadeFront(x),v=visitor({x,z,y:space.upperFloor+1.092,yaw:Math.PI,pitch:0});
 assert.equal(v.controller.onRail,true);v.controller.guide('terrace');let previous=v.controller.feetY;
 for(let i=0;i<2000;i++){v.tick(.025);assert.ok(Math.abs(v.controller.feetY-previous)<.18,'no guidance teleport off the rail');previous=v.controller.feetY;}
 assert.equal(v.controller.area,'terrace');assert.equal(v.controller.airGuide,null);assert.equal(v.controller.path.length,0);assert.equal(v.controller.feetY,0);v.controller.dispose();
});


test('Running off the upper rail can fall into water without a vertical teleport',()=>{
 const x=-1,z=facadeFront(x),v=visitor({x,z,y:space.upperFloor+1.092,yaw:Math.PI,pitch:0});
 v.key('keydown','ShiftLeft');v.key('keydown','KeyW');let previous=v.controller.feetY,sawWater=false;
 for(let i=0;i<180;i++){v.tick(.025);assert.ok(Math.abs(v.controller.feetY-previous)<.28,'fall and water transition stay continuous');previous=v.controller.feetY;if(v.controller.swimming){sawWater=true;break;}}
 assert.ok(sawWater);assert.ok(inPool(v.controller.position.x,v.controller.position.z));v.key('keyup','KeyW');v.key('keyup','ShiftLeft');v.tick(6);assert.equal(v.controller.motion.underwater,true);v.controller.dispose();
});

test('Every ascending flight allows landing on its sloped rail and jumping outward to the terrace',()=>{
 for(const f of space.stairs.flights){
  const start=flightPoint(f,.5,-f.width/2+.36),edge=flightPoint(f,.5,-f.width/2),direction=worldDelta(edge.x-start.x,edge.z-start.z);
  const v=visitor({...start,yaw:Math.atan2(-direction[0],-direction[1]),pitch:0});
  v.key('keydown','Space');v.key('keydown','KeyW');let reached=false;
  for(let i=0;i<120;i++){v.controller.step(.0125);if(railSupport(v.controller.position.x,v.controller.position.z)){reached=true;break;}}
  v.key('keyup','KeyW');v.key('keyup','Space');v.tick(1.5);
  assert.ok(reached);assert.equal(v.controller.onRail,true);assert.equal(v.controller.verticalVelocity,0);
  const railTop=v.controller.feetY;let previous=railTop,apex=railTop,fell=false;
  v.key('keydown','Space');v.key('keydown','KeyW');
  for(let i=0;i<320;i++){
   if(i===52){v.key('keyup','KeyW');v.key('keyup','Space');}
   v.controller.step(.0125);assert.ok(Math.abs(v.controller.feetY-previous)<.25,'no teleport when crossing the stair clearance');
   previous=v.controller.feetY;apex=Math.max(apex,previous);fell||=v.controller.verticalVelocity<-.5;
  }
  assert.ok(apex>railTop+1.3,'Space launches before the sloped support changes');assert.ok(fell);
  assert.equal(v.controller.onRail,false);assert.equal(v.controller.feetY,0);assert.equal(v.controller.swimming,false);v.controller.dispose();
 }
});

test('Guidance from every sloped stair rail returns to the steps and completes the dry route',()=>{
 for(const f of space.stairs.flights){
  const edge=flightPoint(f,.5,-f.width/2),v=visitor({...edge,y:edge.y+1.092,yaw:0,pitch:0});
  assert.equal(v.controller.onRail,true);v.controller.guide('library');let previous=v.controller.feetY;
  for(let i=0;i<1800;i++){v.controller.step(.025);assert.ok(Math.abs(v.controller.feetY-previous)<.18);assert.equal(v.controller.swimming,false);previous=v.controller.feetY;}
  assert.equal(v.controller.airGuide,null);assert.equal(v.controller.area,'library');assert.equal(v.controller.path.length,0);
  assert.ok(Math.hypot(...worldDelta(v.controller.position.x-LIBRARY.x,v.controller.position.z-LIBRARY.z))<.03);v.controller.dispose();
 }
});
