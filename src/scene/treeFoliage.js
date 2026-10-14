import {BufferAttribute,Vector3,Matrix4} from 'three';
import {MeshBVH} from 'three-mesh-bvh';

export const isLeafMesh=mesh=>(Array.isArray(mesh.material)?mesh.material:[mesh.material]).some(material=>/lea/i.test(material?.name??''));

// Fan existing leaf cards around their petioles. Every copy keeps its branch
// attachment and original photograph; the shared source tree stays untouched.
export function fanLeafGeometry(source,anchorFor,fans=3){
  const position=source.getAttribute('position'),count=position.count;
  const indices=source.index?Array.from(source.index.array):Array.from({length:count},(_,i)=>i);
  const parent=Array.from({length:count},(_,i)=>i);
  const find=i=>{while(parent[i]!==i){parent[i]=parent[parent[i]];i=parent[i];}return i;};
  const join=(a,b)=>{parent[find(b)]=find(a);};
  for(let i=0;i<indices.length;i+=3){join(indices[i],indices[i+1]);join(indices[i],indices[i+2]);}
  // glTF splits vertices at UV/normal seams. Reconnect their coincident
  // positions for the attachment calculation without welding the artwork UVs.
  const seams=new Map();
  for(let i=0;i<count;i++){
    const key=[position.getX(i),position.getY(i),position.getZ(i)].map(value=>Math.round(value*1e6)).join(',');
    if(seams.has(key))join(i,seams.get(key));else seams.set(key,i);
  }
  const cards=new Map();
  for(let i=0;i<count;i++){const root=find(i);if(!cards.has(root))cards.set(root,[]);cards.get(root).push(i);}
  const result=source.clone();result.clearGroups();
  for(const [name,attribute] of Object.entries(source.attributes)){
    const values=new attribute.array.constructor(attribute.array.length*fans);
    for(let copy=0;copy<fans;copy++)values.set(attribute.array,copy*attribute.array.length);
    result.setAttribute(name,new BufferAttribute(values,attribute.itemSize,attribute.normalized));
  }
  const output=result.getAttribute('position'),normal=result.getAttribute('normal'),point=new Vector3();
  for(const card of cards.values()){
    const anchor=anchorFor(card,position);
    for(let copy=1;copy<fans;copy++){
      const angle=(copy%2?1:-1)*Math.ceil(copy/2)*.48,c=Math.cos(angle),s=Math.sin(angle);
      for(const vertex of card){
        point.fromBufferAttribute(position,vertex).sub(anchor);
        output.setXYZ(copy*count+vertex,anchor.x+c*point.x+s*point.z,anchor.y+point.y,anchor.z-s*point.x+c*point.z);
        if(normal){point.fromBufferAttribute(source.getAttribute('normal'),vertex);normal.setXYZ(copy*count+vertex,c*point.x+s*point.z,point.y,-s*point.x+c*point.z);}
      }
    }
  }
  const outputIndex=[];
  for(let copy=0;copy<fans;copy++){
    for(const index of indices)outputIndex.push(index+copy*count);
    for(const group of source.groups)result.addGroup(group.start+copy*indices.length,group.count,group.materialIndex);
  }
  result.setIndex(outputIndex);result.computeBoundingBox();result.computeBoundingSphere();return result;
}

export function addBranchLeaves(tree,fans){
  if(fans<=1)return;
  tree.updateMatrixWorld(true);
  const leaves=[],wood=[];
  tree.traverse(mesh=>{if(mesh.isMesh)(isLeafMesh(mesh)?leaves:wood).push(mesh);});
  const surfaces=wood.map(mesh=>({mesh,bvh:new MeshBVH(mesh.geometry,{indirect:true})}));
  for(const leaf of leaves){
    const transforms=surfaces.map(surface=>({...surface,toWood:new Matrix4().copy(surface.mesh.matrixWorld).invert().multiply(leaf.matrixWorld)}));
    const point=new Vector3(),local=new Vector3();
    leaf.geometry=fanLeafGeometry(leaf.geometry,(card,position)=>{
      let nearest=Infinity,anchor=card[0];
      for(const vertex of card){
        point.fromBufferAttribute(position,vertex);
        for(const surface of transforms){
          local.copy(point).applyMatrix4(surface.toWood);
          const hit=surface.bvh.closestPointToPoint(local);
          if(hit&&hit.distance<nearest){nearest=hit.distance;anchor=vertex;}
        }
      }
      return new Vector3().fromBufferAttribute(position,anchor);
    },fans);
  }
}

export function removeTreeWood(tree){
  const wood=[];tree.traverse(mesh=>{if(mesh.isMesh&&!isLeafMesh(mesh))wood.push(mesh);});
  for(const mesh of wood)mesh.removeFromParent();
}
