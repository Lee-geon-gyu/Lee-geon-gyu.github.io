import * as THREE from 'three';
import garden from './garden-layout.json' with {type:'json'};
import {tabletWakeState} from './tabletWake.js';

// Captured from the actual DetailView, including its locally hosted font.
export const deskFaces={profile:'assets/desk/profile-screen.png',contact:'assets/desk/contact-face.png'};
const tabletSize={width:.91,depth:.516,thickness:.018,radius:.028};

function roundedShape(width,height,radius){
  const shape=new THREE.Shape(),x=-width/2,y=-height/2;
  shape.moveTo(x+radius,y);shape.lineTo(x+width-radius,y);
  shape.quadraticCurveTo(x+width,y,x+width,y+radius);shape.lineTo(x+width,y+height-radius);
  shape.quadraticCurveTo(x+width,y+height,x+width-radius,y+height);shape.lineTo(x+radius,y+height);
  shape.quadraticCurveTo(x,y+height,x,y+height-radius);shape.lineTo(x,y+radius);
  shape.quadraticCurveTo(x,y,x+radius,y);return shape;
}
function roundedBody(width,depth,thickness,radius,material){
  const geometry=new THREE.ExtrudeGeometry(roundedShape(width,depth,radius),{depth:thickness,bevelEnabled:false,curveSegments:6});
  const mesh=new THREE.Mesh(geometry,material);mesh.rotation.x=-Math.PI/2;mesh.castShadow=true;mesh.receiveShadow=true;return mesh;
}
function face(texture,width,depth,y,radius=0){
  texture.colorSpace=THREE.SRGBColorSpace;texture.anisotropy=8;
  const geometry=radius?new THREE.ShapeGeometry(roundedShape(width,depth,radius),6):new THREE.PlaneGeometry(width,depth);
  // ShapeGeometry uses world-space UVs; normalize them to the captured screen.
  if(radius){const uv=geometry.attributes.uv;for(let i=0;i<uv.count;i++)uv.setXY(i,uv.getX(i)/width+.5,uv.getY(i)/depth+.5);}
  const material=new THREE.MeshBasicMaterial({map:texture,toneMapped:false});
  const mesh=new THREE.Mesh(geometry,material);mesh.rotation.x=-Math.PI/2;mesh.position.y=y;return mesh;
}
function outline(parent,width,depth,y){
  const group=new THREE.Group(),material=new THREE.MeshBasicMaterial({color:new THREE.Color().setRGB(0,.4,3.2),toneMapped:false});
  for(const [x,z,w,d] of [[-width/2,0,.006,depth],[width/2,0,.006,depth],[0,-depth/2,width,.006],[0,depth/2,width,.006]]){
    const mesh=new THREE.Mesh(new THREE.BoxGeometry(w,.002,d),material);mesh.position.set(x,y,z);group.add(mesh);
  }
  parent.add(group);return {group,material};
}
export function createDeskObjects({profileScreen,contactFace},upperFloor){
  // Crop in UV space to the actual screen/card bounds of the 1280x720 capture.
  profileScreen.offset.set(18/1280,18/720);profileScreen.repeat.set(1244/1280,684/720);
  contactFace.offset.set(260/1280,91.15625/720);contactFace.repeat.set(760/1280,537.6875/720);
  const graphite=new THREE.MeshStandardMaterial({color:0x151515,roughness:.3,metalness:.42});
  const tablet=new THREE.Group();tablet.name='Interactive_Profile_Tablet';tablet.position.set(-3.70,.912,-2.0);
  tablet.add(roundedBody(tabletSize.width,tabletSize.depth,tabletSize.thickness,tabletSize.radius,graphite));
  const screen=face(profileScreen,.884,.486,.0182,.016);screen.name='Profile_Tablet_Screen';screen.material.color.setScalar(0);tablet.add(screen);
  const wake=new THREE.Vector3(0,0,1);
  screen.material.onBeforeCompile=shader=>{
    shader.uniforms.tabletWake={value:wake};
    shader.vertexShader='varying vec2 vTabletUv;\n'+shader.vertexShader.replace('#include <uv_vertex>','#include <uv_vertex>\nvTabletUv=uv;');
    shader.fragmentShader='varying vec2 vTabletUv;\nuniform vec3 tabletWake;\n'+shader.fragmentShader.replace('#include <map_fragment>',`#include <map_fragment>
      vec2 edge=abs(vTabletUv-vec2(.5));
      float mask=step(.0001,tabletWake.x)*(1.0-smoothstep(tabletWake.x*.5-.001,tabletWake.x*.5+.001,edge.x))*(1.0-smoothstep(tabletWake.y*.5-.001,tabletWake.y*.5+.001,edge.y));
      diffuseColor.rgb=mix(diffuseColor.rgb,vec3(1.0),tabletWake.z)*mask;
    `);
  };
  screen.material.customProgramCacheKey=()=> 'tablet-center-line-v1';
  const lens=new THREE.Mesh(new THREE.CircleGeometry(.0032,12),new THREE.MeshBasicMaterial({color:0x3c4146}));
  lens.rotation.x=-Math.PI/2;lens.position.set(0,.0183,-.25);tablet.add(lens);
  const tabletCue=outline(tablet,.922,.528,.019);
  const card=new THREE.Group();card.name='Interactive_Contact_Card';card.position.set(-2.8+garden.library.deskShift[0],upperFloor+.846,-1.45+garden.library.deskShift[1]);card.rotation.y=.08;
  const cardDepth=.44*538/760;
  card.add(roundedBody(.44,cardDepth,.006,.008,new THREE.MeshStandardMaterial({color:0x090909,roughness:.7})));
  const printedCard=face(contactFace,.438,cardDepth-.002,.0062,.007);printedCard.name='Contact_Card_Face';card.add(printedCard);
  const cardCue=outline(card,.452,cardDepth+.012,.007);
  const entries=[
    {id:'profile',kind:'tablet',root:tablet,floor:0,focus:new THREE.Vector3(0,.018,0),size:tabletSize,cue:tabletCue,setPower:value=>{const state=tabletWakeState(value);screen.material.color.setScalar(state.power);wake.set(state.width,state.height,state.line);}},
    {id:'contact',kind:'card',root:card,floor:upperFloor,focus:new THREE.Vector3(0,.006,0),cue:cardCue},
  ];
  for(const entry of entries){entry.meshes=[];entry.root.traverse(mesh=>{if(mesh.isMesh&&mesh.material!==entry.cue.material){mesh.userData.contentId=entry.id;entry.meshes.push(mesh);}});}
  return entries;
}
