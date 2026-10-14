import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createDeskObjects} from '../src/scene/DeskObjects.js';
import {createContentInteraction} from '../src/scene/ContentInteraction.js';
import {tabletWakeState} from '../src/scene/tabletWake.js';

test('Tablet wakes as a full-width center line before expanding up and down',()=>{
  assert.deepEqual(tabletWakeState(0),{power:0,width:0,height:0,line:1});
  const line=tabletWakeState(.25);assert.equal(line.width,1);assert.equal(line.height,.004);assert.equal(line.line,1);
  const unfolded=tabletWakeState(.65);assert.equal(unfolded.width,1);assert.ok(unfolded.height>.004&&unfolded.height<1);assert.equal(unfolded.line,0);
  assert.deepEqual(tabletWakeState(1),{power:1,width:1,height:1,line:0});
  let previous=0;for(let p=0;p<=1;p+=.01){const state=tabletWakeState(p);assert.ok(state.height>=previous);previous=state.height;}
});

test('The actual tablet is dark on the desk and uses the same UI face when powered',()=>{
  const profileScreen=new THREE.Texture(),contactFace=new THREE.Texture();
  const [tablet,card]=createDeskObjects({profileScreen,contactFace},3.8);
  const screen=tablet.root.getObjectByName('Profile_Tablet_Screen');
  assert.equal(tablet.kind,'tablet');assert.equal(screen.material.color.getHex(),0);
  assert.equal(screen.material.map,profileScreen);assert.equal(screen.material.toneMapped,false);
  tablet.setPower(.4);assert.ok(screen.material.color.r>0&&screen.material.color.r<1);
  tablet.setPower(1);assert.equal(screen.material.color.getHex(),0xffffff);
  tablet.setPower(0);assert.equal(screen.material.color.getHex(),0);
  assert.equal(card.root.getObjectByName('Contact_Card_Face').material.map,contactFace);
  assert.equal(card.root.getObjectByName('Contact_Card_Face').material.toneMapped,false);
  assert.ok(tablet.meshes.every(mesh=>mesh.userData.contentId==='profile'));
  assert.ok(card.meshes.every(mesh=>mesh.userData.contentId==='contact'));
  const bounds=new THREE.Box3().setFromObject(tablet.root).getSize(new THREE.Vector3());
  assert.ok(bounds.x<1&&bounds.z<.75,'tablet remains within the existing desktop');
});

test('E powers the real tablet, fits desktop and phone cameras, and cancellation restores it',()=>{
  for(const aspect of [1280/720,364/672])for(const transformed of [false,true]){
    global.window=new EventTarget();
    const [tablet]=createDeskObjects({profileScreen:new THREE.Texture(),contactFace:new THREE.Texture()},3.8);
    const scene=new THREE.Scene(),world=new THREE.Group();scene.add(world);world.add(tablet.root);
    if(transformed){world.matrixAutoUpdate=false;world.matrix.set(1.12,0,1.12*.045,0,0,1.12,0,0,0,0,1.06,0,0,0,0,1);}
    scene.updateMatrixWorld(true);
    const camera=new THREE.PerspectiveCamera(aspect<.8?72:57,aspect,.06,130);camera.position.copy(world.localToWorld(new THREE.Vector3(-3.7,0,0)));camera.position.y=1.53;camera.lookAt(world.localToWorld(new THREE.Vector3(-3.7,.93,-2)));camera.updateMatrixWorld(true);
    const controller={position:{x:-3.7,y:0,z:0},verticalOffset:0,swimming:false,paused:false,setPaused(value){this.paused=value;}};
    const abort=new AbortController(),opened=[];
    const interaction=createContentInteraction({camera,controller,entries:[tablet],targets:tablet.meshes,callbacks:{onOpen:id=>opened.push(id)},signal:abort.signal});
    const original=tablet.root.position.clone();assert.equal(interaction.begin('profile'),true);
    interaction.step(.8);const screen=tablet.root.getObjectByName('Profile_Tablet_Screen');assert.ok(screen.material.color.r>0&&screen.material.color.r<1);
    interaction.step(1);assert.deepEqual(opened,['profile']);assert.equal(screen.material.color.getHex(),0xffffff);
    scene.updateMatrixWorld(true);camera.updateMatrixWorld(true);
    for(const vertex of [[-.455,-.258],[.455,-.258],[-.455,.258],[.455,.258]]){
      const projected=tablet.root.localToWorld(new THREE.Vector3(vertex[0],.018,vertex[1])).project(camera);
      assert.ok(Math.abs(projected.x)<1&&Math.abs(projected.y)<1,`tablet fits aspect ${aspect}`);
    }
    interaction.close();interaction.step(1);assert.equal(screen.material.color.getHex(),0);assert.deepEqual(tablet.root.position.toArray(),original.toArray());assert.equal(controller.paused,false);
    scene.updateMatrixWorld(true);assert.equal(interaction.begin('profile'),true);interaction.step(.8);interaction.reset();interaction.step(10);
    assert.equal(screen.material.color.getHex(),0);assert.deepEqual(opened,['profile']);abort.abort();
  }
});
