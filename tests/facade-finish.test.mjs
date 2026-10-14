import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {prepareFacadeFinish} from '../src/scene/facadeFinish.js';
import {facadeFront} from '../src/navigation/layout.js';

test('Balcony and roof share one finish draw while preserving every triangle, UV channel and floor material',()=>{
  const geometry=new THREE.BufferGeometry(),points=[];
  for(const x of [-4,1])points.push(x,3.3,facadeFront(x)+.11,x+.2,3.3,facadeFront(x+.2)+.11,x,3.5,facadeFront(x)+.11);
  points.push(-2,6.69,facadeFront(-2)+.17,-1.8,6.69,facadeFront(-1.8)+.17,-2,7.05,facadeFront(-2)+.17);
  points.push(0,0,5,1,0,5,0,0,6);
  geometry.setAttribute('position',new THREE.Float32BufferAttribute(points,3));geometry.setAttribute('normal',new THREE.Float32BufferAttribute(Array.from({length:12},()=>[0,0,1]).flat(),3));
  const uvs=Array.from({length:24},(_,i)=>i/25);geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2));geometry.setAttribute('uv1',new THREE.Float32BufferAttribute(uvs.map(v=>1-v),2));geometry.setIndex([0,1,2,3,4,5,6,7,8,9,10,11]);
  const material=new THREE.MeshPhysicalMaterial({name:'Warm_Pale_Limestone',map:new THREE.Texture(),lightMap:new THREE.Texture()});
  const root=new THREE.Group(),floor=new THREE.Mesh(geometry,material);root.add(floor);const originalIndex=Array.from(geometry.index.array);
  const result=prepareFacadeFinish(root);assert.deepEqual(result,{meshes:1,triangles:3});assert.equal(root.children.length,2);
  const band=root.children.find(mesh=>mesh!==floor);assert.equal(floor.geometry.index.count+band.geometry.index.count,geometry.index.count);assert.deepEqual(Array.from(geometry.index.array),originalIndex);
  assert.equal(floor.material,material);assert.equal(band.material.map,material.map);assert.notEqual(band.material,material);assert.equal(band.material.userData.facadeBand,true);
  assert.equal(band.geometry.getAttribute('uv1').count,9);assert.deepEqual(Array.from(band.geometry.getAttribute('uv1').array),Array.from(geometry.getAttribute('uv1').array.slice(0,18)));
  assert.ok(band.geometry.boundingBox.min.y>3);assert.ok(band.geometry.boundingBox.max.y>7);assert.deepEqual(Array.from(floor.geometry.index.array),[9,10,11]);
});
