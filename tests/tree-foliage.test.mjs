import test from 'node:test';
import assert from 'node:assert/strict';
import {BufferGeometry,Float32BufferAttribute,Vector3,Group,Mesh,MeshBasicMaterial,BoxGeometry} from 'three';
import {fanLeafGeometry,removeTreeWood,addBranchLeaves} from '../src/scene/treeFoliage.js';

test('Added leaf fans retain separate branch attachments, photograph UVs and the shared source',()=>{
  const source=new BufferGeometry();
  source.setAttribute('position',new Float32BufferAttribute([0,0,0,1,0,0,1,1,0,4,2,1,5,2,1,5,3,1],3));
  source.setAttribute('normal',new Float32BufferAttribute(Array.from({length:6},()=>[0,0,1]).flat(),3));
  source.setAttribute('uv',new Float32BufferAttribute([0,0,1,0,1,1,0,0,1,0,1,1],2));source.setIndex([0,1,2,3,4,5]);
  const before=Array.from(source.getAttribute('position').array);
  const result=fanLeafGeometry(source,(card,position)=>new Vector3().fromBufferAttribute(position,card[0]),3);
  assert.deepEqual(Array.from(source.getAttribute('position').array),before);
  assert.equal(source.index.count,6);assert.equal(result.index.count,18);
  for(let copy=0;copy<3;copy++)for(const anchor of [0,3]){
    assert.deepEqual(new Vector3().fromBufferAttribute(result.getAttribute('position'),copy*6+anchor),new Vector3().fromBufferAttribute(source.getAttribute('position'),anchor));
    for(const vertex of [anchor+1,anchor+2]){
      const a=new Vector3().fromBufferAttribute(source.getAttribute('position'),anchor);
      const oldDistance=new Vector3().fromBufferAttribute(source.getAttribute('position'),vertex).distanceTo(a);
      const newDistance=new Vector3().fromBufferAttribute(result.getAttribute('position'),copy*6+vertex).distanceTo(a);
      assert.ok(Math.abs(newDistance-oldDistance)<1e-6);
    }
  }
  assert.notEqual(result.getAttribute('position').getZ(7),0);
  for(let copy=0;copy<3;copy++)assert.deepEqual(Array.from(result.getAttribute('uv').array.slice(copy*12,(copy+1)*12)),Array.from(source.getAttribute('uv').array));
  assert.ok(Math.max(...result.index.array)<result.getAttribute('position').count);
});

test('Tree edits affect the selected clone without changing shared branches or other tree instances',()=>{
  const original=new Group(),wood=new Mesh(new BoxGeometry(.1,2,.1),new MeshBasicMaterial({name:'Tree_trunk'}));
  const leaves=new Mesh(new BoxGeometry(.3,.2,.02),new MeshBasicMaterial({name:'Tree_leaves'}));leaves.position.y=.7;original.add(wood,leaves);
  const selected=original.clone(true),sharedIndex=Array.from(wood.geometry.index.array);
  addBranchLeaves(selected,3);
  assert.equal(selected.children[1].geometry.index.count,leaves.geometry.index.count*3);
  assert.equal(leaves.geometry.index.count,36);assert.deepEqual(Array.from(wood.geometry.index.array),sharedIndex);
  removeTreeWood(selected);
  assert.equal(selected.children.length,1);assert.equal(original.children.length,2);
});

test('A photograph UV seam cannot split one leaf into independently rotating halves',()=>{
  const source=new BufferGeometry();
  source.setAttribute('position',new Float32BufferAttribute([0,0,0,1,0,0,1,1,0,0,0,0,1,1,0,0,1,0],3));
  source.setAttribute('uv',new Float32BufferAttribute([0,0,1,0,1,1,.1,.1,.9,.9,0,1],2));source.setIndex([0,1,2,3,4,5]);
  let cards=0;
  const result=fanLeafGeometry(source,(card,position)=>{cards++;return new Vector3().fromBufferAttribute(position,card[0]);},3);
  assert.equal(cards,1);
  for(let copy=1;copy<3;copy++)for(const [a,b] of [[0,3],[2,4]]){
    assert.deepEqual(new Vector3().fromBufferAttribute(result.getAttribute('position'),copy*6+a),new Vector3().fromBufferAttribute(result.getAttribute('position'),copy*6+b));
  }
  assert.notEqual(result.getAttribute('uv').getX(6),result.getAttribute('uv').getX(9));
});
