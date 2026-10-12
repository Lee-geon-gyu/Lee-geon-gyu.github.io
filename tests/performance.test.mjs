import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {renderScale} from '../src/scene/performance.js';

const publicRoot=new URL('../public/',import.meta.url);
function glb(path){const bytes=fs.readFileSync(new URL(path,publicRoot));return {bytes,doc:JSON.parse(bytes.subarray(20,20+bytes.readUInt32LE(12)))};}
function triangles(doc){return doc.meshes.reduce((sum,mesh)=>sum+mesh.primitives.reduce((n,p)=>n+doc.accessors[p.indices].count/3,0),0);}

test('Desktop stays native, high-DPI phones stay sharp and 4K buffers remain bounded',()=>{
  for(const [w,h,dpr] of [[364,672,3],[1280,720,2],[1920,1080,2],[3840,2160,2]]){
    const scale=renderScale(w,h,dpr);assert.ok(scale<=2);assert.ok(w*h*scale*scale<=3686401);
  }
  assert.equal(renderScale(1920,1080,1),1);
  assert.equal(renderScale(2560,1440,1),1);
  assert.equal(renderScale(390,844,3),2);
});

test('Runtime foliage has a bounded triangle count and architecture keeps both UV channels',()=>{
  const original=glb('assets/connected-atelier.glb').doc,room=glb('assets/runtime/atelier.glb').doc;
  assert.equal(triangles(room),triangles(original));
  for(const mesh of room.meshes)for(const primitive of mesh.primitives){assert.ok('TEXCOORD_0' in primitive.attributes);assert.ok('TEXCOORD_1' in primitive.attributes);}
  assert.ok(triangles(glb('assets/runtime/tree.glb').doc)<90000);
  assert.ok(triangles(glb('assets/runtime/garden.glb').doc)<500000);
});

test('Source-resolution derivatives stay under 26 MiB and all six previews resolve',()=>{
  const manifest=JSON.parse(fs.readFileSync(new URL('../src/scene/runtime-assets.json',import.meta.url)));
  const paths=['assets/runtime/atelier.glb','assets/runtime/tree.glb','assets/runtime/garden.glb',...Object.values(manifest.previews),...Object.values(manifest.textures)];
  const bytes=[...new Set(paths)].reduce((sum,path)=>sum+fs.statSync(new URL(path,publicRoot)).size,0);
  assert.ok(bytes<26*1024*1024,`Runtime derivative payload is ${bytes} bytes`);
  const content=JSON.parse(fs.readFileSync(new URL('portfolio-content.json',publicRoot)));
  for(const item of content.projects)assert.ok(manifest.previews[item.representativeImage]);
});

test('Runtime textures preserve source dimensions, native normal bytes and valid references',()=>{
  for(const [runtime,source] of [['atelier.glb','connected-atelier.glb'],['garden.glb','rooted-garden.glb'],['tree.glb','tree-small.glb']]){
    const current=glb('assets/runtime/'+runtime),native=glb('assets/'+source);
    const sourceMaterials=new Map(native.doc.materials.map(m=>[m.name,m]));
    const image=(asset,texture)=>{
      const t=asset.doc.textures[texture.index],i=asset.doc.images[t.source??t.extensions.EXT_texture_webp.source];
      const v=asset.doc.bufferViews[i.bufferView],offset=28+asset.bytes.readUInt32LE(12)+(v.byteOffset??0);
      assert.ok(v.byteLength>0&&offset+v.byteLength<=asset.bytes.length);
      return asset.bytes.subarray(offset,offset+v.byteLength);
    };
    for(const material of current.doc.materials){
      if(material.normalTexture){
        assert.deepEqual(image(current,material.normalTexture),image(native,sourceMaterials.get(material.name).normalTexture),'native normal-map detail retained');
      }
      for(const texture of [material.normalTexture,material.pbrMetallicRoughness?.baseColorTexture])if(texture)image(current,texture);
    }
  }
});
