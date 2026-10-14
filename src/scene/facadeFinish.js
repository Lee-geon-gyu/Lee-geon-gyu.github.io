import {BufferGeometry,BufferAttribute,Mesh} from 'three';
import {space,facadeFront} from '../navigation/layout.js';

// The balcony band and matching roof fascia receive the same warm fill. Keep
// textures, both UV channels, normals, floor lighting and rail geometry intact.
export function prepareFacadeFinish(root){
  const additions=[];let triangles=0;
  root.traverse(mesh=>{
    if(!mesh.isMesh||Array.isArray(mesh.material)||mesh.material.name!=='Warm_Pale_Limestone')return;
    const source=mesh.geometry,position=source.getAttribute('position'),index=source.index;
    const keep=[],band=[];
    for(let i=0;i<(index?.count??position.count);i+=3){
      const ids=[0,1,2].map(j=>index?index.getX(i+j):i+j);
      const facade=ids.every(id=>{
        const x=position.getX(id),y=position.getY(id),z=position.getZ(id);
        return x>=space.balconyFront[0][0]-.14&&x<=space.balconyFront[1][0]+.14&&y>=space.upperFloor-.59&&y<=space.upperFloor+.002&&Math.abs(z-facadeFront(x))<=.135;
      });
      const roof=ids.every(id=>{
        const y=position.getY(id);
        return y>=space.upperCeiling-.08&&y<=space.upperCeiling+space.upperRoofThickness+.015;
      });
      (facade||roof?band:keep).push(...ids);
    }
    if(!band.length)return;
    const rest=new BufferGeometry();for(const [name,attribute] of Object.entries(source.attributes))rest.setAttribute(name,attribute);rest.setIndex(keep);
    rest.boundingBox=source.boundingBox?.clone()??null;rest.boundingSphere=source.boundingSphere?.clone()??null;mesh.geometry=rest;
    const geometry=new BufferGeometry(),unique=[...new Set(band)],remap=new Map(unique.map((id,i)=>[id,i]));
    for(const [name,attribute] of Object.entries(source.attributes)){
      const values=new attribute.array.constructor(unique.length*attribute.itemSize);
      unique.forEach((id,i)=>{for(let j=0;j<attribute.itemSize;j++)values[i*attribute.itemSize+j]=attribute.array[id*attribute.itemSize+j];});
      geometry.setAttribute(name,new BufferAttribute(values,attribute.itemSize,attribute.normalized));
    }
    geometry.setIndex(band.map(id=>remap.get(id)));geometry.computeBoundingBox();geometry.computeBoundingSphere();
    const material=mesh.material.clone();material.userData.facadeBand=true;
    const face=new Mesh(geometry,material);face.name='Consistent_Balcony_Stone_Finish';face.position.copy(mesh.position);face.quaternion.copy(mesh.quaternion);face.scale.copy(mesh.scale);
    additions.push({parent:mesh.parent,face});triangles+=band.length/3;
  });
  for(const {parent,face} of additions)parent.add(face);
  return {meshes:additions.length,triangles};
}

export function fillFacadeLight(shader){
  shader.fragmentShader=shader.fragmentShader.replace(
    'vec3 totalDiffuse = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse;',
    'vec3 totalDiffuse = max(reflectedLight.directDiffuse + reflectedLight.indirectDiffuse, material.diffuseContribution * vec3(0.78,0.65,0.49));'
  );
}
