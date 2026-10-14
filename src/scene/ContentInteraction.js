import * as THREE from 'three';
import {canInteract,ease,Presentation,visibleTargets} from './interactionModel.js';

export function createContentInteraction({camera,controller,entries,targets,callbacks,signal,reducedMotion}){
  const timeline=new Presentation(reducedMotion?.18:1.55),ray=new THREE.Raycaster();ray.firstHitOnly=true;
  const point=new THREE.Vector3(),direction=new THREE.Vector3(),offset=new THREE.Vector3();
  let nearby='',active=null,origin=null,destination=null,rest=null;
  function eligible(entry){
    if(!entry.root.visible||controller.seated||(entry.kind==='seat'&&!controller.canSit(entry.seat)))return false;
    point.copy(entry.proximity??entry.focus);entry.root.localToWorld(point);
    offset.subVectors(point,camera.position);const distance=offset.length();camera.getWorldDirection(direction);
    const facing=direction.dot(offset.clone().normalize());
    const floorDifference=entry.kind==='seat'?Math.min(Math.abs((controller.position.y??0)-entry.floor),Math.abs((controller.position.y??0)-entry.seat.seatTop)):Math.abs((controller.position.y??0)-entry.floor);
    if(distance>3.1||floorDifference>.45)return false;
    ray.set(camera.position,offset.normalize());ray.near=.03;ray.far=distance+.12;
    const hit=ray.intersectObjects(visibleTargets(targets),false)[0];
    return canInteract({distance,floorDifference,facing,visible:hit?.object.userData.contentId===entry.id,airborne:controller.verticalOffset>.025,inWater:controller.swimming});
  }
  // Hover feedback and activation share exactly the same access checks.
  function availableEntry(id){
    if(controller.paused||timeline.phase!=='idle')return null;
    return entries.find(item=>item.id===id&&eligible(item))??null;
  }
  function begin(id=nearby){
    const entry=availableEntry(id);if(!entry)return false;
    if(entry.kind==='seat'){const seated=controller.sit(entry.seat);if(seated){nearby='';callbacks.onNearby?.('');}return seated;}
    if(!timeline.begin(id))return false;
    active=entry;controller.setPaused(true);
    origin={position:camera.position.clone(),quaternion:camera.quaternion.clone()};
    point.copy(entry.focus);entry.root.localToWorld(point);
    let eye;
    if(entry.kind==='tablet')eye=point.clone().add(new THREE.Vector3(0,1.15,1.5));
    else if(entry.kind==='card')eye=point.clone().add(new THREE.Vector3(.1,.88,1.35));
    else{const normal=new THREE.Vector3(0,0,1).transformDirection(entry.root.matrixWorld);eye=point.clone().addScaledVector(normal,camera.aspect<.8?2.25:1.9);eye.y+=.05;}
    const look=new THREE.Matrix4().lookAt(eye,point,new THREE.Vector3(0,1,0));destination={position:eye,quaternion:new THREE.Quaternion().setFromRotationMatrix(look)};
    rest={position:entry.root.position.clone(),quaternion:entry.root.quaternion.clone(),scale:entry.root.scale.clone()};
    nearby='';callbacks.onPresentation?.(entry.kind);callbacks.onNearby?.('');return true;
  }
  function restore(){
    active?.setPower?.(0);
    if(active&&rest){active.root.position.copy(rest.position);active.root.quaternion.copy(rest.quaternion);active.root.scale.copy(rest.scale);}
    if(origin){camera.position.copy(origin.position);camera.quaternion.copy(origin.quaternion);}
    active=null;origin=null;rest=null;destination=null;timeline.reset();controller.setPaused(false);callbacks.onPresentation?.('');
  }
  function step(delta){
    if(timeline.phase==='idle')return;
    const event=timeline.step(delta);
    if(event==='restored'){restore();return;}
    const p=timeline.progress,approach=ease(p/.52),reveal=ease((p-.42)/.58);
    camera.position.lerpVectors(origin.position,destination.position,approach);camera.quaternion.slerpQuaternions(origin.quaternion,destination.quaternion,approach);
    active.setPower?.(ease((p-.22)/.6));
    if(active.kind==='tablet'||active.kind==='card'){
      const scale=active.root.parent.getWorldScale(new THREE.Vector3());
      const width=active.kind==='tablet'?active.size.width*Math.max(scale.x,scale.y,scale.z):0;
      const distance=active.kind==='tablet'?Math.max(.88,width*1.08/(2*Math.tan(THREE.MathUtils.degToRad(camera.fov/2))*camera.aspect)):camera.aspect<.8?1.06:.83;
      const held=camera.position.clone().add(new THREE.Vector3(0,-.025,-distance).applyQuaternion(camera.quaternion));
      active.root.parent.worldToLocal(held);
      active.root.position.lerpVectors(rest.position,held,reveal);
      const parentRotation=active.root.parent.getWorldQuaternion(new THREE.Quaternion()).invert();
      const heldRotation=parentRotation.multiply(camera.quaternion).multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1,0,0),Math.PI/2));
      active.root.quaternion.slerpQuaternions(rest.quaternion,heldRotation,reveal);active.root.scale.copy(rest.scale).multiplyScalar(active.kind==='tablet'?1:1+.4*reveal);
    }
    if(event==='open')callbacks.onOpen(active.id,active.kind);
  }
  function updateNearby(){
    if(controller.paused||timeline.phase!=='idle')return;
    let closest='',distance=Infinity;
    for(const entry of entries)if(eligible(entry)){point.copy(entry.proximity??entry.focus);entry.root.localToWorld(point);const d=point.distanceTo(camera.position);if(d<distance){distance=d;closest=entry.id;}}
    if(nearby!==closest){nearby=closest;callbacks.onNearby?.(closest);}
  }
  window.addEventListener('keydown',event=>{
    if(!controller.paused&&controller.seated&&!event.repeat&&['KeyE','Escape'].includes(event.code)){event.preventDefault();controller.stand();return;}
    if(event.code==='Escape'&&timeline.phase==='opening'){event.preventDefault();timeline.close();}
    if(event.code==='KeyE'&&!event.repeat&&!event.target?.closest?.('input,textarea,select,dialog,[contenteditable="true"]')){if(begin()){event.preventDefault();}}
  },{signal});
  return {begin,canActivate:id=>Boolean(availableEntry(id)),step,updateNearby,eligible,close:()=>timeline.close(),reset:restore,get phase(){return timeline.phase;},get id(){return active?.id??'';}};
}
