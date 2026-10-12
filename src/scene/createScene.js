import { createSunsetSky } from './SunsetSky.js';
import {createDeskObjects} from './DeskObjects.js';
import {createContentInteraction} from './ContentInteraction.js';
import {exhibitionPages,visibleTargets} from './interactionModel.js';
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import { Water } from 'three/addons/objects/Water.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { SMAAPass } from 'three/addons/postprocessing/SMAAPass.js';
import { RectAreaLightUniformsLib } from 'three/addons/lights/RectAreaLightUniformsLib.js';
import {createPerformanceMeter,renderScale} from './performance.js';
import runtimeAssets from './runtime-assets.json' with {type:'json'};
import { WalkController } from '../navigation/WalkController.js';
import { MeshBVH, acceleratedRaycast } from 'three-mesh-bvh';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import { applyAgedFinish,createFinishNoise } from './agedMaterials.js';
import lighting from './lighting-layout.json' with { type: 'json' };
import { worldPoint } from '../navigation/coordinates.js';
import decor from './wall-decor.json' with { type: 'json' };
import gardenLayout from './garden-layout.json' with { type: 'json' };
import { space, OUTDOOR, LIBRARY, exteriorZ, stairPoint, flightPoint, inPolygon, routeBetween, canStand, RADIUS, eastBoundary } from '../navigation/layout.js';

const base = import.meta.env.BASE_URL;
export const asset = path => `${base}${path}`;
function filterFoliageLight(shader){
  const lights=THREE.ShaderChunk.lights_fragment_begin
    .replace('spotLightCoord.xy );','fract(spotLightCoord.xy * 4.0) );')
    .replace('RE_Direct_RectArea( rectAreaLight,','if (dot(rectAreaLight.color,vec3(1.0))>0.001) RE_Direct_RectArea( rectAreaLight,');
  shader.fragmentShader=shader.fragmentShader.replace('#include <lights_fragment_begin>',lights);
}
const loadImage = url => new Promise((resolve,reject)=>{const img=new Image();img.onload=()=>resolve(img);img.onerror=()=>reject(new Error(`이미지를 읽지 못했어요: ${url}`));img.src=url;});
function textLines(ctx,text,x,y,width,lineHeight){let line='';for(const character of text){if(ctx.measureText(line+character).width>width){ctx.fillText(line,x,y);y+=lineHeight;line='';}line+=character;}if(line)ctx.fillText(line,x,y);return y+lineHeight;}

function printTexture(project,image){
  // The source project artwork stays intact on a mounted portrait page.
  const canvas=document.createElement('canvas');canvas.width=1536;canvas.height=2160;
  const ctx=canvas.getContext('2d');ctx.scale(1.5,1.5);ctx.fillStyle='#f5f2e9';ctx.fillRect(0,0,1024,1440);
  ctx.fillStyle='#514c43';ctx.font='24px Urbanist, sans-serif';ctx.fillText(project.category.toUpperCase(),65,92);
  ctx.font='600 56px Urbanist, sans-serif';ctx.fillStyle='#272b28';ctx.fillText(project.title,65,180);
  const ratio=Math.min(930/image.width,620/image.height),w=image.width*ratio,h=image.height*ratio;
  ctx.drawImage(image,(1024-w)/2,270,w,h);
  ctx.font='500 36px sans-serif';ctx.fillStyle='#373c36';const next=textLines(ctx,project.tagline,65,955,890,49);
  ctx.font='28px sans-serif';ctx.fillStyle='#706c62';textLines(ctx,project.description,65,next+26,890,41);
  ctx.fillStyle='#68665e';ctx.font='26px sans-serif';ctx.fillText(project.categoryKorean,65,1310);
  ctx.font='22px sans-serif';ctx.fillText('이건규  /  UI·UX DESIGN & PUBLISHING',65,1360);
  const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;return texture;
}
export async function createScene(canvas,content,callbacks,signal){
  const started=performance.now();let assetMs=0,compileMs=0,quality=1,lastQualityChange=0;
  const finishNoise=createFinishNoise();
  const runtimeTexture=name=>asset(runtimeAssets.textures[name]??`assets/${name}`);
  const previewImage=path=>asset(runtimeAssets.previews[path]??path);
  callbacks.onHint('');callbacks.onHover('');callbacks.onNearby?.('');callbacks.onPresentation?.('');callbacks.onWater?.(false);
  const renderer=new THREE.WebGLRenderer({canvas,antialias:false,powerPreference:'high-performance',alpha:false});
  const meter=createPerformanceMeter(renderer,canvas);
  if(import.meta.env.DEV){const gl=renderer.getContext(),extension=gl.getExtension('WEBGL_debug_renderer_info');canvas.dataset.gpu=extension?gl.getParameter(extension.UNMASKED_RENDERER_WEBGL):'unknown';}
  renderer.setPixelRatio(1);
  renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=lighting.exposure;
  renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFShadowMap;
    const scene=new THREE.Scene();scene.fog=new THREE.FogExp2(0xd7b8aa,.006);
  const camera=new THREE.PerspectiveCamera(57,1,.06,130);
    const clock=new THREE.Timer();clock.connect(document);const cues=new Map(), interactables=[],occluders=[],emissiveLamps=[],closureMeshes=[];
  let disposed=false,cleaned=false,compiling=false,renderReady=false,raf=0,viewed=new Set(),hintLast='',hoverLast='',lastPointer=null,lastDiagnostic=0,lastPick=0,wasInWater=false;
  const manager=new THREE.LoadingManager();let count=0,total=0;
  manager.onProgress=(_url,loaded,all)=>{count=loaded;total=all;callbacks.onProgress({loaded:count,total,phase:'재료와 작업물을 불러오고 있어요'});};
  const textures=new THREE.TextureLoader(manager),gltf=new GLTFLoader(manager),draco=new DRACOLoader(manager);
  draco.setDecoderPath(asset('assets/draco/'));gltf.setDRACOLoader(draco);
  const maximumAnisotropy=renderer.capabilities.getMaxAnisotropy();
  const resources={renderer,scene,draco};
  const release=()=>{
    if(cleaned)return;cleaned=true;
    resources.composer?.passes.forEach(pass=>pass.dispose?.());resources.composer?.dispose();resources.pmrem?.dispose();resources.environmentTarget?.dispose();draco.dispose();clock.disconnect();
    const geometries=new Set(),materials=new Set(),maps=new Set();scene.traverse(obj=>{if(obj.geometry)geometries.add(obj.geometry);if(obj.isLight&&obj.map)maps.add(obj.map);if(obj.material)(Array.isArray(obj.material)?obj.material:[obj.material]).forEach(m=>materials.add(m));});
    materials.forEach(m=>{for(const key of Object.keys(m))if(m[key]?.isTexture)maps.add(m[key]);for(const uniform of Object.values(m.uniforms||{}))if(uniform.value?.isTexture)maps.add(uniform.value);m.dispose();});geometries.forEach(g=>g.dispose());maps.forEach(t=>t.dispose());
    scene.background?.dispose();scene.environment?.dispose();finishNoise.dispose();meter.dispose();renderer.dispose();
  };
  const dispose=()=>{if(disposed)return;disposed=true;cancelAnimationFrame(raf);resources.controller?.dispose();resources.observer?.disconnect();if(!compiling)release();};
  signal.addEventListener('abort',dispose,{once:true});
  canvas.addEventListener('webglcontextlost',event=>{event.preventDefault();callbacks.onError('그래픽 연결이 잠시 끊겼어요. 공간을 다시 불러오거나 바로 메뉴에서 내용을 확인하세요.');dispose();},{signal});
  let architecture,plantA,plantB,tree,sky,rug,waterNormal,projectImages,indirect,book,marble,vines,portrait,foliageLight,poolCaustics;
  try {
    [architecture,plantA,plantB,tree,sky,rug,waterNormal,projectImages,indirect,book,marble,vines,portrait,foliageLight,poolCaustics]=await Promise.all([
      gltf.loadAsync(asset('assets/runtime/atelier.glb')),
      gltf.loadAsync(asset('assets/potted-02.glb')),
      gltf.loadAsync(asset('assets/models/potted_plant_04/potted_plant_04.gltf')),
      gltf.loadAsync(asset('assets/runtime/tree.glb')),
      textures.loadAsync(runtimeTexture('afternoon-sky.png')),
      textures.loadAsync(runtimeTexture('jute-rug.png')),
      textures.loadAsync(asset('assets/waternormals.jpg')),
      Promise.all(content.projects.map(p=>loadImage(previewImage(p.representativeImage)))),
      textures.loadAsync(asset('assets/atelier-indirect.png')),
      textures.loadAsync(runtimeTexture('book-spines.png')),
      textures.loadAsync(runtimeTexture('ivory-marble.png')),
      gltf.loadAsync(asset('assets/runtime/garden.glb')),
      loadImage(previewImage(content.profile.portrait)),
      textures.loadAsync(runtimeTexture('foliage-light-mask.png')),
      textures.loadAsync(runtimeTexture('pool-caustics.png')),
    ]);
    await document.fonts.ready;
    assetMs=performance.now()-started;
    if(disposed){[architecture,plantA,plantB,tree,vines].forEach(g=>g.scene.traverse(o=>{o.geometry?.dispose();o.material?.dispose?.();}));return null;}
    callbacks.onProgress({loaded:count,total,phase:'오후의 빛과 반사를 준비하고 있어요'});
    const sunsetSky=createSunsetSky(sky,lighting);scene.background=null;scene.add(sunsetSky.mesh);
    const pmrem=new THREE.PMREMGenerator(renderer);resources.pmrem=pmrem;
    const skyEnvironment=new THREE.Scene();skyEnvironment.add(sunsetSky.mesh.clone());
    resources.environmentTarget=pmrem.fromScene(skyEnvironment,.025,.1,120);scene.environment=resources.environmentTarget.texture;scene.environmentIntensity=lighting.environment;
    rug.colorSpace=THREE.SRGBColorSpace;rug.wrapS=rug.wrapT=THREE.RepeatWrapping;rug.repeat.set(2.5,2.5);rug.anisotropy=maximumAnisotropy;
    indirect.colorSpace=THREE.NoColorSpace;indirect.flipY=false;indirect.channel=1;indirect.anisotropy=maximumAnisotropy;
    book.colorSpace=THREE.SRGBColorSpace;book.wrapS=book.wrapT=THREE.RepeatWrapping;book.repeat.set(1.3,4.8);book.anisotropy=maximumAnisotropy;
    marble.colorSpace=THREE.SRGBColorSpace;marble.wrapS=marble.wrapT=THREE.RepeatWrapping;marble.anisotropy=maximumAnisotropy;marble.flipY=false;
    architecture.scene.traverse(obj=>{
      if(!obj.isMesh)return;
      obj.castShadow=true;obj.receiveShadow=true;occluders.push(obj);
      const mats=Array.isArray(obj.material)?obj.material:[obj.material];mats.forEach(mat=>{
        if(mat.name==='Lamp_Diffuser')emissiveLamps.push(obj);
        for(const key of ['map','normalMap','roughnessMap'])if(mat[key]){mat[key].wrapS=mat[key].wrapT=THREE.RepeatWrapping;mat[key].anisotropy=maximumAnisotropy;}
        if(mat.name==='Jute'){mat.map=rug;mat.color.set(0xb09b77);}
        if(mat.name.startsWith('Book_')){mat.map=book.clone();mat.map.offset.x=Number(mat.name.slice(5))*.157;mat.roughness=.94;}
        if(mat.name==='Warm_Oak'){mat.color.set(0xfff0d5);mat.normalScale.set(.22,.22);mat.roughnessMap=null;mat.roughness=.52;}
        if(mat.name==='Pool_Stone'){mat.color.set(0x78c4bd);mat.normalScale.set(.12,.12);mat.roughnessMap=null;mat.roughness=.38;}
        if(mat.name==='Oak_Shaded_Edges')mat.color.set(0xae8250);
        if(mat.name==='Ceiling_Opal'){mat.emissive.setRGB(1,.88,.70);mat.emissiveIntensity=2.0;}
        if(mat.name==='Ground_Ceiling_Opal'){mat.emissive.setRGB(1,.88,.70);mat.emissiveIntensity=1.55;}
        if(mat.name==='Exterior_Gloss_Black'){mat.color.set(0x191c22);mat.metalness=.65;mat.roughness=.18;if(mat.isMeshPhysicalMaterial){mat.clearcoat=.5;mat.clearcoatRoughness=.12;}}
        if(mat.name==='White_Satin_Ceiling'){mat.color.set(0xf8f6ef);mat.roughness=.78;}
        if(mat.name==='Ivory_Polished_Column'){mat.map=marble;mat.color.set(0xf7f5ee);mat.normalScale.set(.04,.04);mat.roughnessMap=null;mat.roughness=.24;mat.envMapIntensity=.60;}
        if(mat.name==='Shelf_Amber_Diffuser'){mat.emissive.setRGB(1,.65,.24);mat.emissiveIntensity=1.35;}
        if(mat.name==='Warm_Pale_Limestone'){mat.map=marble;mat.color.set(0xfff6e6);mat.roughnessMap=null;mat.normalScale.set(.025,.025);mat.roughness=.085;if(mat.isMeshPhysicalMaterial){mat.clearcoat=.65;mat.clearcoatRoughness=.08;}mat.envMapIntensity=.85;}
        if(mat.name==='Pale_Marble_Planter'){mat.map=marble;mat.color.set(0xffffff);mat.roughnessMap=null;mat.normalScale.set(.12,.12);mat.roughness=.48;}
        if(mat.name==='Ivory_Mineral_Plaster'){mat.color.set(0xffefda);mat.normalScale.set(.45,.45);mat.roughness=.92;}
        if(mat.name==='Bronze'){mat.color.set(0x382613);mat.metalness=.8;mat.roughness=.48;}
        if(mat.name==='Natural_Linen')mat.side=THREE.DoubleSide;
        if(mat.name==='Charcoal')mat.color.set(0x10110e);
        if(mat.name==='Furniture_Ivory_Porcelain'){mat.map=marble;mat.color.set(0xfcfcfa);mat.roughness=.19;if(mat.isMeshPhysicalMaterial){mat.clearcoat=.45;mat.clearcoatRoughness=.15;}}
        if(mat.name==='Furniture_White_Lacquer')mat.color.set(0xf0f1ef);
        if(mat.name==='Furniture_White_Leather'){mat.color.set(0xf2eee7);mat.roughness=.49;}
        if(mat.name==='Furniture_Graphite_Steel'){mat.color.set(0x242a2e);mat.metalness=.82;mat.roughness=.30;}
        // Baked irradiance already supplies occlusion. Drop duplicate ORM
        // samplers so textured light/shadow passes fit 16-unit WebGL hardware.
        mat.aoMap=null;mat.metalnessMap=null;
        if(mat.name!=='Warm_Pale_Limestone')mat.envMapIntensity=.25;mat.lightMap=indirect;mat.lightMapIntensity=mat.name==='Warm_Pale_Limestone'?.5:mat.name==='Ivory_Mineral_Plaster'?.95:1.35;
        if(mat.name.startsWith('Furniture_'))mat.envMapIntensity=.75;
        if(mat.name==='Ivory_Polished_Column')mat.envMapIntensity=.60;
        if(mat.name==='Exterior_Gloss_Black')mat.envMapIntensity=1.15;
        if(import.meta.env.DEV&&mat.name==='Exterior_Gloss_Black')canvas.dataset.exteriorTrim=JSON.stringify({color:mat.color.getHexString(),metalness:mat.metalness,roughness:mat.roughness,environment:mat.envMapIntensity,clearcoat:mat.clearcoat??0});
        if(import.meta.env.DEV&&mat.name==='Ground_Ceiling_Opal')canvas.dataset.groundCeilingEmission=String(mat.emissiveIntensity);
        if(import.meta.env.DEV&&mat.name==='Warm_Pale_Limestone')canvas.dataset.lighting=JSON.stringify({uvs:Object.keys(obj.geometry.attributes),channel:indirect.channel,image:[indirect.image.width,indirect.image.height],intensity:mat.lightMapIntensity});
        // Cycles DIFFUSE without the color pass stores reflected radiance. Apply
        // the surface albedo once, without a second Lambert conversion; retain
        // live PBR specular so reflections still follow the visitor's position.
        const finish=mat.name==='Warm_Oak'?'oak':mat.name==='Ivory_Mineral_Plaster'?'plaster':mat.name==='Warm_Pale_Limestone'?'stone':null;
        mat.onBeforeCompile=shader=>{filterFoliageLight(shader);if(finish)applyAgedFinish(shader,finish,finishNoise);if(mat.name==='Warm_Pale_Limestone')shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>','#include <map_fragment>\ndiffuseColor.rgb = pow(diffuseColor.rgb,vec3(1.08));');shader.fragmentShader=shader.fragmentShader.replace('#include <lights_fragment_end>','#include <lights_fragment_end>\nreflectedLight.indirectDiffuse += material.diffuseContribution * texture2D(lightMap,vLightMapUv).rgb * lightMapIntensity * (1.0 - RECIPROCAL_PI);');if(finish==='plaster')shader.fragmentShader=shader.fragmentShader.replace('#include <lights_fragment_end>','#include <lights_fragment_end>\nreflectedLight.indirectDiffuse = max(reflectedLight.indirectDiffuse, material.diffuseContribution * vec3(0.50,0.38,0.24));');};
        mat.customProgramCacheKey=()=>`atelier-indirect-aged-${finish||'plain'}-v5`;
      });
    });scene.add(architecture.scene);
    // A solid mortar bed under the individually bevelled tiles. The pool cutout
    // stays open; small grout lines reveal mortar rather than the sky sphere.
    const mortar=new THREE.MeshStandardMaterial({color:0x5d5143,roughness:.95});
    const [poolLeft,poolRight,poolBack,poolFront]=space.pool,courtyardDepth=space.courtyard[3];
    for(const [a,b,c,d] of [[-5.4,poolLeft,-7,courtyardDepth],[poolRight,5.4,-7,courtyardDepth],[poolLeft,poolRight,-7,poolBack],[poolLeft,poolRight,poolFront,courtyardDepth]]){
      const bed=new THREE.Mesh(new THREE.PlaneGeometry(b-a,d-c),mortar);bed.rotation.x=-Math.PI/2;bed.position.set((a+b)/2,-.045,(c+d)/2);bed.receiveShadow=true;scene.add(bed);occluders.push(bed);closureMeshes.push(bed);
    }
    const sun=new THREE.DirectionalLight(0xffffff,lighting.sun.intensity);sun.color.setRGB(...lighting.sun.color);sun.position.fromArray(lighting.sun.position);sun.target.position.fromArray(lighting.sun.target);scene.add(sun,sun.target);
    sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);Object.assign(sun.shadow.camera,{left:-15,right:15,top:18,bottom:-16,near:1,far:65});sun.shadow.bias=-.00015;sun.shadow.normalBias=.025;sun.shadow.radius=2;
    sun.shadow.camera.updateProjectionMatrix();
    const passageDaylight=new THREE.DirectionalLight(0xffd6a0,lighting.passage);passageDaylight.position.set(2,3,4);passageDaylight.target.position.set(-1,0,-4);scene.add(passageDaylight,passageDaylight.target);passageDaylight.castShadow=true;passageDaylight.shadow.mapSize.set(1024,1024);Object.assign(passageDaylight.shadow.camera,{left:-7,right:7,top:9,bottom:-9,near:1,far:26});passageDaylight.shadow.bias=-.00015;passageDaylight.shadow.normalBias=.012;
    passageDaylight.shadow.camera.updateProjectionMatrix();
    scene.add(new THREE.HemisphereLight(0xffe6cf,0x947a65,lighting.hemisphere));
    RectAreaLightUniformsLib.init();const courtyardFill=new THREE.RectAreaLight(0xffe1be,2.0,10,5);courtyardFill.position.set(.4,3.8,6.2);courtyardFill.rotation.y=-Math.PI/2;scene.add(courtyardFill);const bounce=new THREE.RectAreaLight(0xffcc91,.35,4,6);bounce.position.set(0,.10,-3.5);bounce.rotation.x=Math.PI/2;scene.add(bounce);
    const timberBounce=new THREE.RectAreaLight(0xffba79,lighting.timberBounce,4,1.8);timberBounce.position.set(-2.24,1.9,-2.4);timberBounce.rotation.y=-Math.PI/2;scene.add(timberBounce);
    const libraryGlow=new THREE.RectAreaLight(0xffbb75,lighting.libraryGlow,7,.7);libraryGlow.position.set(-1.45,6.22,-2.70);libraryGlow.rotation.y=0;scene.add(libraryGlow);
    // A photographic transmission mask filters illumination, rather than being
    // applied to the wall. Geometry, PBR response and camera parallax stay live.
    foliageLight.colorSpace=THREE.NoColorSpace;
    const leafyDaylight=new THREE.SpotLight(0xffffff,45,14,.8,.5,2);leafyDaylight.color.setRGB(1,.5,.15);leafyDaylight.position.set(-.9,3.45,-2.5);leafyDaylight.target.position.set(2.4,1.7,-3.65);leafyDaylight.map=foliageLight;scene.add(leafyDaylight,leafyDaylight.target);
    const filteredFloorDaylight=new THREE.SpotLight(0xffffff,65,15,.74,.3,2);filteredFloorDaylight.color.setRGB(1,.46,.13);filteredFloorDaylight.position.set(4.6,3.6,-3.3);filteredFloorDaylight.target.position.set(-.4,0,-2.2);filteredFloorDaylight.map=foliageLight;scene.add(filteredFloorDaylight,filteredFloorDaylight.target);
    filteredFloorDaylight.castShadow=true;filteredFloorDaylight.shadow.mapSize.set(1024,1024);filteredFloorDaylight.shadow.bias=-.00015;filteredFloorDaylight.shadow.normalBias=.012;
    const backWallDaylight=new THREE.SpotLight(0xffffff,30,13,.66,.5,2);backWallDaylight.color.setRGB(1,.35,.10);backWallDaylight.position.set(-.3,3.45,-2);backWallDaylight.target.position.set(.85,1.75,-6.97);backWallDaylight.map=foliageLight;scene.add(backWallDaylight,backWallDaylight.target);
    const courtyardSun=new THREE.SpotLight(0xffffff,lighting.projector,18,.90,.4,2);courtyardSun.color.setRGB(1,.66,.32);courtyardSun.position.set(3.3,8,8.4);courtyardSun.target.position.set(.9,0,4.2);courtyardSun.map=foliageLight;scene.add(courtyardSun,courtyardSun.target);courtyardSun.castShadow=true;courtyardSun.shadow.mapSize.set(1024,1024);courtyardSun.shadow.normalBias=.012;
    // Bronze wall lights illuminate the plaster above and below each fitting.
    // Static glow radiance is baked; these small lights provide live PBR highlights.
    // Baked fixture glow stays on every wall. Eight local lights provide nearby
    // live highlights instead of making every fragment evaluate 55 point lights.
    const fixtures=[];
    for(const [x,y,z,rotation] of decor.lamps){const light=new THREE.PointLight(0xffb45f,.95,1.85,2);light.position.set(x+Math.sin(rotation)*.09,y-.22,z+Math.cos(rotation)*.09);fixtures.push(light);}
    for(const [x,y,z] of decor.stairLamps){const light=new THREE.PointLight(0xffbd75,1.15,2.4,2);light.position.set(x-.12,y-.20,z);fixtures.push(light);}
    for(const [x,y,z] of decor.stepLights){const light=new THREE.PointLight(0xffcc8a,.25,.62,2);light.position.set(x-.07,y,z);fixtures.push(light);}
    const galleryGlow=new THREE.PointLight(0xffd59b,9,5.5,2);galleryGlow.position.fromArray(decor.galleryLight);fixtures.push(galleryGlow);
    const pendant=new THREE.PointLight(0xffd5a2,decor.ceilingLight.intensity,decor.ceilingLight.range,2);pendant.position.fromArray(decor.ceilingLight.position);pendant.position.y-=.10;fixtures.push(pendant);
    for(const fitting of decor.ceilingSpots){const light=new THREE.PointLight(0xffe4bf,fitting.intensity,3.2,2);light.position.fromArray(fitting.position);light.position.y-=.018;fixtures.push(light);}
    const ceilingGroups=new Map();
    for(const fixture of [...decor.interiorStrips,...decor.interiorFill]){
      const key=fixture.position[1]>4?'upper':fixture.position[0]<-2.3?'left':'right';
      if(!ceilingGroups.has(key))ceilingGroups.set(key,[]);ceilingGroups.get(key).push(fixture);
    }
    for(const group of ceilingGroups.values()){
      const minX=Math.min(...group.map(f=>f.position[0]-f.width/2)),maxX=Math.max(...group.map(f=>f.position[0]+f.width/2));
      const minZ=Math.min(...group.map(f=>f.position[2]-(f.height??.035)/2)),maxZ=Math.max(...group.map(f=>f.position[2]+(f.height??.035)/2));
      const width=maxX-minX,height=maxZ-minZ,energy=group.reduce((sum,f)=>sum+f.intensity*(f.height?.8:.68)*f.width*(f.height??.035),0);
      const light=new THREE.RectAreaLight(0xffffff,energy/(width*height),width,height);light.color.setRGB(...group[0].color);
      light.position.set((minX+maxX)/2,group[0].position[1]-.018,(minZ+maxZ)/2);light.rotation.x=-Math.PI/2;scene.add(light);
    }
    const plantMaterials=new Map(),staticPlants=[];
    function plantMaterial(original){
      if(plantMaterials.has(original))return plantMaterials.get(original);
      // Leaves are diffuse surfaces. Their scanned color, native silhouettes and
      // real sunlight shadows do not need the architecture's glossy PBR shader.
      const material=new THREE.MeshLambertMaterial({color:original.color,map:original.map,side:THREE.DoubleSide,alphaTest:original.alphaTest||.4});
      material.onBeforeCompile=filterFoliageLight;material.shadowSide=THREE.DoubleSide;
      plantMaterials.set(original,material);return material;
    }
    function vegetation(source,x,z,height,baseY=0,rotation=0,widthScale=1){
      const obj=source.scene.clone(true);const cube=obj.getObjectByName('Cube');if(source===tree&&cube)obj.remove(cube);
      const bounds=new THREE.Box3().setFromObject(obj),size=bounds.getSize(new THREE.Vector3());
      const scale=height/size.y;obj.scale.set(scale*widthScale,scale,scale*widthScale);
      const centered=source!==tree;
      obj.position.set(x-(centered?(bounds.min.x+bounds.max.x)/2*scale*widthScale:0),baseY-bounds.min.y*scale,z-(centered?(bounds.min.z+bounds.max.z)/2*scale*widthScale:0));obj.rotation.y=rotation;
      obj.traverse(mesh=>{if(mesh.isMesh){mesh.castShadow=true;mesh.receiveShadow=true;(Array.isArray(mesh.material)?mesh.material:[mesh.material]).forEach(mat=>{mat.onBeforeCompile=filterFoliageLight;if(mat.map)mat.map.anisotropy=maximumAnisotropy;if(mat.alphaMap||mat.alphaTest||mat.transparent){mat.alphaTest=.4;mat.depthWrite=true;mat.transparent=false;mat.side=THREE.DoubleSide;mat.shadowSide=THREE.DoubleSide;}if(source===tree){mat.roughnessMap=null;mat.roughness=.72;}mat.envMapIntensity=1.1;});}});
      obj.traverse(mesh=>{if(mesh.isMesh)mesh.material=Array.isArray(mesh.material)?mesh.material.map(plantMaterial):plantMaterial(mesh.material);});
      scene.add(obj);staticPlants.push(obj);return obj;
    }
    if(import.meta.env.DEV)canvas.dataset.gardenVisuals=JSON.stringify({roots:gardenLayout.roots.length,styles:[...new Set(gardenLayout.roots.map(r=>r.style))],leafVariants:gardenLayout.leafVariants,wallGrowth:gardenLayout.wallGrowthMode,canopyHeights:gardenLayout.canopyTrees.map(p=>p[2])});
    for(const [x,z,h,y,rotation,width] of gardenLayout.canopyTrees)vegetation(tree,x,z,h,y,rotation,width);
    for(const [x,z,h,y,rotation,width] of gardenLayout.bedTrees)vegetation(tree,x,z,h,y,rotation,width);
    for(const [x,z,h,y,rotation,width] of gardenLayout.roomTrees)vegetation(tree,x,z,h,y,rotation,width);
    for(const pot of gardenLayout.stairWallPots){const [x,z]=pot.position;vegetation(tree,x,z,pot.plantHeight,pot.potHeight+.016,pot.rotation,pot.widthScale);}
    for(const pot of gardenLayout.rightAtelier.pots){const [x,z]=pot.position;vegetation(tree,x,z,pot.plantHeight,pot.height,pot.rotation,pot.widthScale);}
    vegetation(tree,1.58,-2.36,1.9,space.upperFloor+.58,.8);
    // Low foliage stays beneath the exhibition's paper edges.
    vegetation(tree,-1.55,-6.35,.15,1.16,.2,1.2);
    vegetation(plantB,-4.9,.72,.9,0,1);vegetation(plantA,4.35,9.8,.8,0,1);
    const garden=vines.scene;
    garden.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;o.material=Array.isArray(o.material)?o.material.map(plantMaterial):plantMaterial(o.material);}});scene.add(garden);
    const oak=new THREE.MeshStandardMaterial({color:0xb18a59,roughness:.70});oak.onBeforeCompile=shader=>{filterFoliageLight(shader);applyAgedFinish(shader,'oak',finishNoise);};oak.customProgramCacheKey=()=> 'atelier-aged-frame-oak-v2';
    // An exterior timber screen filters the side window's afternoon sunlight.
    const screen=new THREE.InstancedMesh(new THREE.BoxGeometry(.027,2.22,.027),oak,22),matrix=new THREE.Matrix4();
    for(let i=0;i<22;i++){matrix.makeTranslation(2.63,2.04,-6.8+i*.15);screen.setMatrixAt(i,matrix);}screen.castShadow=true;screen.receiveShadow=true;scene.add(screen);
    for(const y of [1.2,1.7,2.2,2.7]){const rail=new THREE.Mesh(new THREE.BoxGeometry(.027,.027,3.2),oak);rail.position.set(2.63,y,-5.225);rail.castShadow=true;scene.add(rail);}
    const raycaster=new THREE.Raycaster();raycaster.firstHitOnly=true;
    function frame(id,texture,{x,y,z,width=1.15,height=1.56,rotation=0}){
      const group=new THREE.Group();group.position.set(x,y,z);group.rotation.y=rotation;
      const trim=width<.4?.03:.07;
      const backing=new THREE.Mesh(new THREE.BoxGeometry(width+trim,height+trim,.055),oak);backing.castShadow=true;backing.receiveShadow=true;group.add(backing);occluders.push(backing);
      texture.anisotropy=maximumAnisotropy;
      // Matte paper retains its printed contrast under the brighter room lights.
      // Cap incident diffuse irradiance, retaining live shadows and warm tint.
      const print=new THREE.Mesh(new THREE.PlaneGeometry(width,height),new THREE.MeshPhysicalMaterial({map:texture,color:z>=0&&width>.4?0xe8dfcb:0xffffff,roughness:.97,specularIntensity:.12}));
      print.material.onBeforeCompile=shader=>{
        filterFoliageLight(shader);
        shader.fragmentShader=shader.fragmentShader.replace('#include <lights_fragment_end>',`#include <lights_fragment_end>
          vec3 paperIrradiance=(reflectedLight.directDiffuse+reflectedLight.indirectDiffuse)/max(diffuseColor.rgb,vec3(.001));
          float paperPeak=max(paperIrradiance.r,max(paperIrradiance.g,paperIrradiance.b));
          float paperScale=min(1.0,1.05/max(paperPeak,.001));
          reflectedLight.directDiffuse*=paperScale;
          reflectedLight.indirectDiffuse*=paperScale;`);
      };
      print.material.customProgramCacheKey=()=> 'atelier-matte-print-v1';
      print.receiveShadow=true;print.position.z=.029;print.userData.contentId=id;group.add(print);interactables.push(print);
      const cueGroup=new THREE.Group();cueGroup.position.z=.037;const cueMat=new THREE.MeshBasicMaterial({color:new THREE.Color().setRGB(0,.40,3.2),transparent:true,opacity:1,depthWrite:false,toneMapped:false});
      const thickness=Math.min(.025,width*.028),gap=Math.min(.012,width*.04);
      const sides=[[-width/2-gap,0,thickness,height+gap*3],[width/2+gap,0,thickness,height+gap*3],[0,-height/2-gap,width+gap*3,thickness],[0,height/2+gap,width+gap*3,thickness]];
      for(let layer=0;layer<=3;layer++){
        const parts=sides.map(([px,py,w,h])=>new THREE.PlaneGeometry(w<.1?w+layer*.018:w,h<.1?h+layer*.018:h).translate(px,py,.0002*layer));
        const geometry=mergeGeometries(parts);parts.forEach(part=>part.dispose());
        const material=layer?cueMat.clone():cueMat;if(layer){material.blending=THREE.AdditiveBlending;material.opacity=.09/layer;}
        cueGroup.add(new THREE.Mesh(geometry,material));
      }
      group.add(cueGroup);if(!cues.has(id))cues.set(id,[]);cues.get(id).push({group:cueGroup,material:cueMat,exhibit:group});scene.add(group);return group;
    }
    const pages=exhibitionPages(content.projects),contentEntries=[],exhibits=[];let galleryPage=0;
    for(const [page,items] of pages.entries())for(const item of items){
      const index=content.projects.findIndex(project=>project.id===item.id),project=content.projects[index];
      const root=frame(project.id,printTexture(project,projectImages[index]),item.slot);root.visible=page===0;
      exhibits.push({root,page});contentEntries.push({id:project.id,kind:'project',root,floor:0,focus:new THREE.Vector3(0,0,.03)});
    }
    const deskObjects=createDeskObjects(content,portrait,space.upperFloor);
    for(const entry of deskObjects){scene.add(entry.root);interactables.push(...entry.meshes);cues.set(entry.id,[entry.cue]);entry.proximity=new THREE.Vector3(0,.03,0);contentEntries.push(entry);}
    function setGalleryPage(page){galleryPage=Math.max(0,Math.min(Math.max(0,pages.length-1),page));for(const exhibit of exhibits)exhibit.root.visible=exhibit.page===galleryPage;callbacks.onGallery?.({page:galleryPage,total:pages.length,count:content.projects.length});}
    setGalleryPage(0);
    waterNormal.wrapS=waterNormal.wrapT=THREE.RepeatWrapping;
    const waterInset=space.poolWaterInset;
    const water=new Water(new THREE.PlaneGeometry(poolRight-poolLeft-waterInset*2,poolFront-poolBack-waterInset*2),{textureWidth:512,textureHeight:512,waterNormals:waterNormal,sunDirection:new THREE.Vector3(9,5.5,10).normalize(),sunColor:0xffbf7b,waterColor:0x088f94,distortionScale:1.5,alpha:.95,fog:true});water.material.uniforms.size.value=12;
    water.material.fragmentShader=water.material.fragmentShader.replace('vec3( 1.5, 1.0, 1.5 )','vec3( 1.10, 1.0, 1.10 )').replace('float rf0 = 0.02;', 'float rf0 = 0.06;').replace('100.0, 2.0, 0.5','70.0, 3.0, 0.5').replace('diffuseLight * 0.3','diffuseLight * 0.12').replace('max( 0.0, dot( surfaceNormal, eyeDirection ) ) * waterColor','(0.62 + 0.38 * max( 0.0, dot( surfaceNormal, eyeDirection ) )) * waterColor');
    // Indoor projector shadows do not extinguish exterior sunlight. Preserve
    // sky/underwater scattering when the pergola blocks direct illumination.
    water.material.fragmentShader=water.material.fragmentShader.replace('#include <shadowmask_pars_fragment>',THREE.ShaderChunk.shadowmask_pars_fragment.replace(/#if NUM_SPOT_LIGHT_SHADOWS > 0[\s\S]*?#endif/,''));
    water.material.fragmentShader=water.material.fragmentShader.replace('( sunColor * diffuseLight * 0.12 + scatter ) * getShadowMask(), reflectionSample + specularLight','scatter * (0.4 + 0.6 * getShadowMask()) + sunColor * diffuseLight * 0.12 * getShadowMask(), reflectionSample + specularLight * getShadowMask()');
    poolCaustics.colorSpace=THREE.NoColorSpace;poolCaustics.wrapS=poolCaustics.wrapT=THREE.RepeatWrapping;poolCaustics.anisotropy=maximumAnisotropy;
    water.material.uniforms.tPoolCaustics={value:poolCaustics};
    water.material.fragmentShader=water.material.fragmentShader.replace('void main() {',`uniform sampler2D tPoolCaustics;
    float poolCaustic(vec2 uv){
      uv+=vec2(sin(uv.y*4.1+time*.4),cos(uv.x*4.3-time*.3))*.032;
      float light=texture2D(tPoolCaustics,uv+vec2(time*.009,-time*.006)).r;
      float crossing=texture2D(tPoolCaustics,uv*1.37+vec2(-time*.008,time*.005)+.31).r;
      return light*.8+crossing*.2;
    }
    void main() {`).replace('vec3 outgoingLight = albedo;','vec3 outgoingLight = albedo + sunColor * poolCaustic(worldPosition.xz * .85) * .12 * (1.0-reflectance) * getShadowMask();');
    water.material.side=THREE.DoubleSide;
    water.material.fragmentShader=water.material.fragmentShader.replace('gl_FragColor = vec4( outgoingLight, alpha );','if(!gl_FrontFacing)outgoingLight=mix(outgoingLight,waterColor,0.62)+vec3(0.04,0.09,0.10);\n gl_FragColor = vec4( outgoingLight, alpha );');
    water.rotation.x=-Math.PI/2;water.position.set((poolLeft+poolRight)/2,space.poolMotion.waterLevel,(poolBack+poolFront)/2);water.receiveShadow=true;scene.add(water);
    // Polished stone uses the sunset environment and live PBR highlights.
    // Avoid a second full courtyard render for a faint floor overlay.
    const waterRender=water.onBeforeRender;let lastReflection=-Infinity;
    water.onBeforeRender=function(r,s,c){
      if(c!==camera||s.overrideMaterial)return;
      const now=performance.now();if(now-lastReflection<1000/(quality<1?15:30))return;
      lastReflection=now;waterRender.call(this,r,s,c);
    };
    const target=new THREE.WebGLRenderTarget(1,1,{type:THREE.HalfFloatType});
    const composer=new EffectComposer(renderer,target);resources.composer=composer;composer.addPass(new RenderPass(scene,camera));
    // Baked shadows retain contact detail without a second normal render or
    // a 41-sample depth-of-field pass on every pixel.
    const bloom=new UnrealBloomPass(new THREE.Vector2(1,1),.24,.25,1.5);composer.addPass(bloom);
    // Grade, underwater attenuation and tone mapping share one full-size pass.
    const output=new OutputPass();
    Object.assign(output.uniforms,{grade:{value:new THREE.Vector3(...lighting.grade)},depth:{value:0},time:{value:0}});
    output.material.fragmentShader=output.material.fragmentShader.replace('uniform sampler2D tDiffuse;','uniform sampler2D tDiffuse; uniform vec3 grade; uniform float depth; uniform float time;')
      .replace('gl_FragColor = texture2D( tDiffuse, vUv );',`
        float wet=smoothstep(0.0,0.14,depth);
        vec2 uv=vUv+vec2(sin(vUv.y*24.0+time*1.6),cos(vUv.x*21.0-time*1.4))*.0009*wet;
        gl_FragColor=texture2D(tDiffuse,uv);gl_FragColor.rgb*=grade;
        vec3 attenuation=exp(-vec3(.85,.18,.08)*depth);
        gl_FragColor.rgb=mix(gl_FragColor.rgb,gl_FragColor.rgb*attenuation+vec3(.01,.12,.12)*(1.0-exp(-depth*.6)),wet);`);
    // SMAA smooths geometric edges without full-screen FXAA blur or the
    // multisampled HDR buffers that strain integrated GPUs at native pixels.
    composer.addPass(new SMAAPass());composer.addPass(output);
    const invitation=new THREE.Group();const inviteMat=new THREE.MeshBasicMaterial({color:new THREE.Color(0xff941e).multiplyScalar(3),transparent:true,opacity:.7,toneMapped:false});
    for(const x of [-1.68,1.68]){const line=new THREE.Mesh(new THREE.BoxGeometry(.013,3.22,.014),inviteMat);line.position.set(x,1.61,.239);invitation.add(line);const reverse=line.clone();reverse.position.z=-.18;invitation.add(reverse);}
    for(const z of [-.18,.239]){const top=new THREE.Mesh(new THREE.BoxGeometry(3.36,.013,.014),inviteMat);top.position.set(0,3.22,z);invitation.add(top);}scene.add(invitation);
    // One shared world transform enlarges geometry, foliage and lighting,
    // while eye height stays 1.53m in real world space.
    const world=new THREE.Group();const children=[...scene.children];scene.add(world);for(const child of children)world.add(child);world.matrixAutoUpdate=false;const [sx,sy,sz]=space.worldScale;world.matrix.set(sx,0,sx*space.worldShear,0,0,sy,0,0,0,0,sz,0,0,0,0,1);
    const lightPool=Array.from({length:4},()=>{const light=new THREE.PointLight(0xffffff,0,1,2);world.add(light);return light;});
    // Irradiance from all fixtures is already in the full-resolution lightmap.
    // Only nearby area emitters need expensive live specular evaluation.
    const areaFixtures=world.children.filter(o=>o.isRectAreaLight);
    for(const light of areaFixtures)world.remove(light);
    const areaPool=Array.from({length:2},()=>{const light=new THREE.RectAreaLight(0xffffff,0,1,1);world.add(light);return light;});
    const lightPosition=new THREE.Vector3();let lastLightUpdate=-1;
    function updateLocalLights(time){
      if(time-lastLightUpdate<.2)return;lastLightUpdate=time;
      const ranked=fixtures.map(light=>{
        lightPosition.copy(light.position).applyMatrix4(world.matrix);
        const distance=lightPosition.distanceTo(camera.position),falloff=Math.max(0,1-(distance/light.distance)**4);
        return {light,score:light.intensity*falloff*falloff/Math.max(.1,distance*distance)};
      }).sort((a,b)=>b.score-a.score);
      for(let i=0;i<lightPool.length;i++){
        const light=ranked[i].light,target=lightPool[i];target.position.copy(light.position);target.color.copy(light.color);target.intensity=light.intensity;target.distance=light.distance;
      }
      const areas=areaFixtures.map(light=>{
        lightPosition.copy(light.position).applyMatrix4(world.matrix);
        return {light,score:light.intensity*light.width*light.height/Math.max(1,lightPosition.distanceToSquared(camera.position))};
      }).sort((a,b)=>b.score-a.score);
      for(let i=0;i<areaPool.length;i++){
        const source=areas[i].light,target=areaPool[i];target.position.copy(source.position);target.quaternion.copy(source.quaternion);
        target.width=source.width;target.height=source.height;target.color.copy(source.color);target.intensity=i===0||quality===1?source.intensity:0;
      }
    }
    const metricPoint=(x,y,z,eye=0)=>new THREE.Vector3(...worldPoint(x,y,z,eye));
    const targets=[...interactables,...occluders];
    for(const mesh of occluders){if(!mesh.geometry.boundsTree)mesh.geometry.boundsTree=new MeshBVH(mesh.geometry);mesh.raycast=acceleratedRaycast;}
    if(import.meta.env.DEV&&new URLSearchParams(location.search).has('geometryQA')){
      // Probe the actual loaded shell, not the collision rectangles. This catches
      // missing faces beside the entrance and exposed horizons at terrace edges.
      scene.updateMatrixWorld(true);const shell=[...closureMeshes];architecture.scene.traverse(o=>{if(o.isMesh)shell.push(o);});
      const probe=new THREE.Raycaster();probe.firstHitOnly=true;probe.near=.001;probe.far=30;
      const origins=[[-5.07,5.5],[3.6,6.5],[0,7],[-2.7,.5],[3.5,.7],[0,.65]],uncovered=[];
      for(const [x,z] of origins)for(const pitch of [-.35,0,.1])for(let i=0;i<16;i++){
        const angle=i*Math.PI/8;probe.set(metricPoint(x,0,z,1.53),new THREE.Vector3(Math.sin(angle)*Math.cos(pitch),Math.sin(pitch),Math.cos(angle)*Math.cos(pitch)));
        if(!probe.intersectObjects(shell,false).length)uncovered.push({x,z,pitch,angle});
      }
      canvas.dataset.courtyardShell=JSON.stringify({rays:origins.length*48,uncovered});
      const upperOrigins=[[-2.7,.5],[2.0,1.0],[-4,.5],[1.9,.5],[3.15,.65]],upperUncovered=[];
      for(const [x,z] of upperOrigins)for(const pitch of [-.35,-.1,0])for(let i=0;i<16;i++){
        const angle=i*Math.PI/8;probe.set(metricPoint(x,space.upperFloor,z,1.53),new THREE.Vector3(Math.sin(angle)*Math.cos(pitch),Math.sin(pitch),Math.cos(angle)*Math.cos(pitch)));
        if(!probe.intersectObjects(shell,false).length)upperUncovered.push({x,z,pitch,angle});
      }
      canvas.dataset.upperShell=JSON.stringify({rays:upperOrigins.length*48,uncovered:upperUncovered});
      // Test the rendered masonry, not just navigation rectangles, along the
      // staircase. A wrongly sized wall can otherwise hide inside a valid path.
      const obstructions=[];let clearanceRays=0;
      for(let i=1;i<space.stairRoute.length;i++){
        const a=space.stairRoute[i-1],b=space.stairRoute[i],steps=Math.ceil(Math.hypot(b.x-a.x,b.z-a.z)/.10);
        for(let j=0;j<steps;j++)for(const height of [.45,1.0,1.53]){
          const t=j/steps,u=(j+1)/steps,from=metricPoint(a.x+(b.x-a.x)*t,a.y+(b.y-a.y)*t,a.z+(b.z-a.z)*t,height),to=metricPoint(a.x+(b.x-a.x)*u,a.y+(b.y-a.y)*u,a.z+(b.z-a.z)*u,height),direction=to.clone().sub(from),length=direction.length();
          probe.near=.005;probe.far=length;probe.set(from,direction.normalize());clearanceRays++;
          const hit=probe.intersectObjects(shell,false)[0];if(hit)obstructions.push({segment:i,x:from.x,y:from.y,z:from.z,distance:hit.distance});
        }
      }
      canvas.dataset.stairClearance=JSON.stringify({rays:clearanceRays,obstructions});
      // Full-width downward probes catch missing tread/landing corners that
      // center-line body rays cannot detect. Require the same stone material.
      let floorRays=0;const floorGaps=[];
      function checkStone(p,h,zone){
        probe.near=.001;probe.far=.6;probe.set(metricPoint(p.x,h,p.z,.25),new THREE.Vector3(0,-1,0));floorRays++;
        const hit=probe.intersectObjects(shell,false)[0];
        const mat=hit&&(Array.isArray(hit.object.material)?hit.object.material[hit.face.materialIndex]:hit.object.material);
        if(!hit||mat.name!=='Warm_Pale_Limestone'||Math.abs(hit.point.y-h*space.worldScale[1])>.025)floorGaps.push({zone,x:p.x,z:p.z,h,material:mat?.name,hitY:hit?.point.y});
      }
      for(const f of space.stairs.flights)for(let i=0;i<f.steps;i++)for(const fraction of [.06,.5,.94])for(const side of [-.94,-.5,0,.5,.94]){
        const p=flightPoint(f,(i+fraction)/f.steps,side*f.width/2);checkStone(p,f.bottom+(i+1)*(f.top-f.bottom)/f.steps,'tread');
      }
      for(const [polygon,h,zone] of [[space.stairs.landing,space.stairs.landingHeight,'landing'],[space.upperOutline,space.upperFloor,'arrival']]){
        const xa=zone==='arrival'?2.75:Math.min(...polygon.map(p=>p[0]))+.12,xb=zone==='arrival'?5.1:Math.max(...polygon.map(p=>p[0]))-.12;
        const za=zone==='arrival'?.24:Math.min(...polygon.map(p=>p[1]))+.12,zb=zone==='arrival'?.8:Math.max(...polygon.map(p=>p[1]))-.12;
        for(let x=xa;x<xb;x+=.15)for(let z=za;z<zb;z+=.13)if(inPolygon(x,z,polygon)&&(zone!=='arrival'||canStand(x,z,.05,h)))checkStone({x,z},h,zone);
      }
      canvas.dataset.stairFloorCoverage=JSON.stringify({rays:floorRays,gaps:floorGaps});
      const upperStart={x:3.05,z:.45,y:space.upperFloor},upperPassage=routeBetween(upperStart,LIBRARY),upperBlocks=[];let upperPassageRays=0,previous=upperStart;
      for(const next of upperPassage){
        const steps=Math.ceil(Math.hypot(next.x-previous.x,next.z-previous.z)/.10);
        for(let j=0;j<steps;j++)for(const height of [.45,1,1.53]){
          const t=j/steps,u=(j+1)/steps,from=metricPoint(previous.x+(next.x-previous.x)*t,space.upperFloor,previous.z+(next.z-previous.z)*t,height),to=metricPoint(previous.x+(next.x-previous.x)*u,space.upperFloor,previous.z+(next.z-previous.z)*u,height),direction=to.clone().sub(from);
          probe.near=.005;probe.far=direction.length();probe.set(from,direction.normalize());upperPassageRays++;
          if(probe.intersectObjects(shell,false).length)upperBlocks.push({x:from.x,y:from.y,z:from.z});
        }
        previous=next;
      }
      canvas.dataset.upperPassageClearance=JSON.stringify({rays:upperPassageRays,obstructions:upperBlocks,reachable:upperPassage.length>0});
      const passages=[[{x:-3.75,z:3.45},{x:-3.75,z:-.65}],[{x:-4.75,z:3.45},{x:1.3,z:3.45}],...Array.from({length:5},(_,i)=>[{x:.4+i*.32,z:7.4},{x:.4+i*.32,z:4.6}])];
      const passageObstructions=[];let passageRays=0;
      for(let i=0;i<passages.length;i++){
        const [a,b]=passages[i],steps=Math.ceil(Math.hypot(b.x-a.x,b.z-a.z)/.10);
        for(let j=0;j<steps;j++)for(const height of [.45,1.0,1.53]){
          const t=j/steps,u=(j+1)/steps,from=metricPoint(a.x+(b.x-a.x)*t,0,a.z+(b.z-a.z)*t,height),to=metricPoint(a.x+(b.x-a.x)*u,0,a.z+(b.z-a.z)*u,height),direction=to.clone().sub(from);
          probe.near=.005;probe.far=direction.length();probe.set(from,direction.normalize());passageRays++;
          const hit=probe.intersectObjects(shell,false)[0];if(hit)passageObstructions.push({passage:i,x:from.x,y:from.y,z:from.z,distance:hit.distance});
        }
      }
      canvas.dataset.passageClearance=JSON.stringify({rays:passageRays,obstructions:passageObstructions});
      let wallRays=0;const wallGaps=[];
      for(const f of space.stairs.flights)for(let i=0;i<=8;i++){
        const t=i/8,p=flightPoint(f,t,f.width/2),x=eastBoundary(p.z);
        for(const eye of [.6,1.53]){
          probe.near=.001;probe.far=.20;probe.set(metricPoint(x-.055,p.y,p.z,eye),new THREE.Vector3(1,0,0));wallRays++;
          if(!probe.intersectObjects(shell,false).length)wallGaps.push({x,z:p.z,height:p.y+eye/space.worldScale[1]});
        }
      }
      canvas.dataset.eastWallFit=JSON.stringify({rays:wallRays,gaps:wallGaps});
      const plasterShell=shell.filter(o=>!Array.isArray(o.material)&&o.material?.name==='Ivory_Mineral_Plaster');
      const seams=[];let flatRays=0;
      for(const [wallX,baseY,zs] of [[2.30,0,[-6.7,-5.2,-3.7,-2.2]],[space.upperClosure[0],space.upperFloor,[-3.20,-2.20,-1.20,-.20,.09]]])for(const z of zs)for(const eye of [.40,1.53,2.45]){
        const origin=metricPoint(wallX-.35,baseY,z,eye);probe.near=.001;probe.far=.6;probe.set(origin,new THREE.Vector3(1,0,0));flatRays++;
        const hit=probe.intersectObjects(plasterShell,false)[0];
        if(!hit||Math.abs(hit.distance-.35*space.worldScale[0])>.012)seams.push({wallX,z,eye,distance:hit?.distance});
      }
      canvas.dataset.wallFlatness=JSON.stringify({rays:flatRays,seams});
      const finishGaps=[];let finishRays=0;
      // The far east end of the front return is hidden behind solid treads;
      // finish probes cover its exposed face, and tread probes cover that end.
      const returnA=space.lowerCornerClosure[3],returnB=space.lowerCornerClosure[0];
      const finishWalls=[{a:[-2.289,-6.989],b:[2.289,-6.989],base:0},{a:[-5.302,facadeZ(-5.302)-.12],b:[-5.302,-3.321],base:0},{a:[-2.553,-1.20],b:[-2.18,.13],base:0},{a:[2.149,-3.329],b:[2.149,.149],base:space.upperFloor},{a:[2.18,.169],b:[3.4,.169],base:0,top:space.upperFloor-.30},{a:returnA,b:returnB,base:0,top:space.upperFloor-.30,timberTop:true}];
      function facadeZ(x){const [a,b]=space.balconyFront;return a[1]+(b[1]-a[1])*(x-a[0])/(b[0]-a[0]);}
      for(const wall of finishWalls){const dx=wall.b[0]-wall.a[0],dz=wall.b[1]-wall.a[1],length=Math.hypot(dx,dz),nx=-dz/length,nz=dx/length;
        for(const t of [.12,.43,.77,.96]){const x=wall.a[0]+dx*t,z=wall.a[1]+dz*t,top=wall.top??(wall.base?space.upperCeiling:space.groundCeiling-.10+Math.max(0,-z-3.4)*.094);
          for(const y of [wall.base+.04,wall.base+.16,wall.base+1.5,top-.13]){
            const from=metricPoint(x+nx*.16,y,z+nz*.16),to=metricPoint(x,y,z);probe.near=.001;probe.far=.30;probe.set(from,to.sub(from).normalize());finishRays++;
            const hit=probe.intersectObjects(shell,false)[0],allowed=y>top-.24&&!wall.timberTop?['White_Satin_Ceiling']:['Warm_Oak','Oak_Shaded_Edges'];if(!hit||!allowed.includes(hit.object.material?.name))finishGaps.push({x,y,z,material:hit?.object.material?.name});
          }
        }
      }
      canvas.dataset.interiorFinish=JSON.stringify({rays:finishRays,gaps:finishGaps});
      const tops=[[-5.48,7],[0,space.courtyard[3]+.10],[eastBoundary(5)+.1,5],[2.5,-2]],heightSeams=[];
      for(const [x,z] of tops){probe.near=.001;probe.far=.8;probe.set(metricPoint(x,space.courtyardHeight+.4,z),new THREE.Vector3(0,-1,0));const hit=probe.intersectObjects(shell,false)[0];if(!hit||Math.abs(hit.point.y-(space.courtyardHeight+.11)*space.worldScale[1])>.012)heightSeams.push({x,z,height:hit?.point.y});}
      canvas.dataset.wallTopAlignment=JSON.stringify({rays:tops.length,seams:heightSeams});
      const nativeRails=[{a:space.balconyFront[0],b:space.balconyFront[1],ha:space.upperFloor,hb:space.upperFloor},...space.stairs.sections.slice(1).map((b,i)=>({a:space.stairs.sections[i].edge[0],b:b.edge[0],ha:space.stairs.sections[i].height,hb:b.height}))],railGaps=[];let railRays=0;
      for(const r of nativeRails)for(const t of [.22,.53,.81]){const x=r.a[0]+(r.b[0]-r.a[0])*t,z=r.a[1]+(r.b[1]-r.a[1])*t,y=r.ha+(r.hb-r.ha)*t+1.092;probe.near=.001;probe.far=.22;probe.set(metricPoint(x,y+.08,z),new THREE.Vector3(0,-1,0));railRays++;const hit=probe.intersectObjects(shell,false)[0];if(!hit||Math.abs(hit.point.y-y*space.worldScale[1])>.022)railGaps.push({x,z,height:hit?.point.y,expected:y*space.worldScale[1]});}
      canvas.dataset.railMeshFit=JSON.stringify({rays:railRays,gaps:railGaps});

      const mountingGaps=[];let mountingRays=0;
      const bronze=shell.filter(o=>o.material?.name==='Bronze'),ceilingShell=shell.filter(o=>o.material?.name==='White_Satin_Ceiling');
      for(const strip of decor.interiorStrips)for(const offset of [-.40,0,.40]){
        const [cx,y,z]=strip.position,x=cx+strip.width*offset;
        probe.near=.001;probe.far=.12;probe.set(metricPoint(x,y-.025,z),new THREE.Vector3(0,1,0));mountingRays++;
        const fitting=probe.intersectObjects(bronze,false)[0],ceilingHit=probe.intersectObjects(ceilingShell,false)[0];
        if(!fitting||!ceilingHit||Math.abs(ceilingHit.point.y-(y+.024)*space.worldScale[1])>.006)mountingGaps.push({name:strip.name,x,z,fitting:!!fitting,ceilingY:ceilingHit?.point.y,expected:(y+.024)*space.worldScale[1]});
      }
      canvas.dataset.fixtureMounting=JSON.stringify({rays:mountingRays,gaps:mountingGaps});
      const plantedGaps=[];let plantedRays=0;
      const soilShell=shell.filter(o=>o.material?.name==='Soil');
      for(let i=1;i<gardenLayout.stairBedSections.length;i++){
        const a=gardenLayout.stairBedSections[i-1],b=gardenLayout.stairBedSections[i];
        for(const t of [.03,.33,.67,.97]){
          const x=(a.soil[0][0]+a.soil[1][0])*.5*(1-t)+(b.soil[0][0]+b.soil[1][0])*.5*t,z=a.soil[0][1]*(1-t)+b.soil[0][1]*t,y=a.height*(1-t)+b.height*t+.225;
          probe.near=.001;probe.far=.25;probe.set(metricPoint(x,y+.12,z),new THREE.Vector3(0,-1,0));plantedRays++;
          const hit=probe.intersectObjects(soilShell,false)[0];if(!hit||Math.abs(hit.point.y-y*space.worldScale[1])>.008)plantedGaps.push({x,z,height:hit?.point.y,expected:y*space.worldScale[1]});
        }
      }
      canvas.dataset.risingStairGarden=JSON.stringify({rays:plantedRays,gaps:plantedGaps});
      const gardenRimGaps=[];let gardenRimRays=0;
      const rimRuns=gardenLayout.stairBedSections.slice(1).map((b,i)=>({a:gardenLayout.stairBedSections[i],b}));
      rimRuns.push({a:{edge:[gardenLayout.eastBed[0]],height:0},b:{edge:[gardenLayout.eastBed[1]],height:0},samples:[.003]});
      for(const {a,b,samples} of rimRuns)for(const t of samples??[.12,.33,.67,.88])for(const rise of [.02,.10,.20]){
        const x=a.edge[0][0]*(1-t)+b.edge[0][0]*t,z=a.edge[0][1]*(1-t)+b.edge[0][1]*t,y=a.height*(1-t)+b.height*t+rise;
        probe.near=.001;probe.far=.36;probe.set(metricPoint(x-.18,y,z),new THREE.Vector3(1,0,0));gardenRimRays++;
        const hit=probe.intersectObjects(shell,false)[0];
        // A tread can meet the rim before its face at a miter. Either solid
        // stone surface closes the joint; an empty or recessed face fails.
        if(!hit||hit.object.material?.name!=='Warm_Pale_Limestone'||hit.distance>.115*space.worldScale[0]+.010)gardenRimGaps.push({x,z,y,material:hit?.object.material?.name,distance:hit?.distance});
      }
      canvas.dataset.connectedGardenRim=JSON.stringify({rays:gardenRimRays,gaps:gardenRimGaps});

      // Inspect the upper curb locations, excluding the intentionally raised
      // oak/bronze handrail. Stone/plaster must stop at the walking floor.
      const floorShell=shell.filter(o=>['Warm_Pale_Limestone','Ivory_Mineral_Plaster','Pale_Marble_Planter'].includes(o.material?.name)),flushPoints=[];
      const arrivalEdge=space.stairs.sections.at(-1).edge[0],join=[space.upperClosure[0]+.14,space.upperClosure[3]];
      for(const t of [.15,.35,.55,.75])flushPoints.push([join[0]*(1-t)+arrivalEdge[0]*t,join[1]*(1-t)+arrivalEdge[1]*t]);
      for(const x of [-4.2,-3,-2,-1,0,1,2])flushPoints.push([x,facadeZ(x)]);
      const curbGaps=[];
      for(const [x,z] of flushPoints){probe.near=.001;probe.far=.45;probe.set(metricPoint(x,space.upperFloor+.30,z),new THREE.Vector3(0,-1,0));const hit=probe.intersectObjects(floorShell,false)[0];if(!hit||Math.abs(hit.point.y-space.upperFloor*space.worldScale[1])>.012)curbGaps.push({x,z,height:hit?.point.y});}
      canvas.dataset.upperFlushFloor=JSON.stringify({rays:flushPoints.length,gaps:curbGaps});
      // Include timber in these rays: a coplanar oak crown used to pass the
      // stone-only height check while remaining visible across this entrance.
      const entryGaps=[];let entryRays=0;
      const entryA=space.lowerCornerClosure[3],entryB=space.lowerCornerClosure[0];
      for(const z of [.23,.50,.80,1.10])for(const offset of [-.04,-.015,0,.015,.04]){
        const x=entryA[0]+(entryB[0]-entryA[0])*(z-entryA[1])/(entryB[1]-entryA[1])+offset;
        probe.near=.001;probe.far=.45;probe.set(metricPoint(x,space.upperFloor+.30,z),new THREE.Vector3(0,-1,0));entryRays++;
        const hit=probe.intersectObjects(shell,false)[0];
        if(!hit||hit.object.material?.name!=='Warm_Pale_Limestone'||Math.abs(hit.point.y-space.upperFloor*space.worldScale[1])>.012)entryGaps.push({x,z,material:hit?.object.material?.name,height:hit?.point.y});
      }
      canvas.dataset.upperEntranceMarble=JSON.stringify({rays:entryRays,gaps:entryGaps});
      const cheekGaps=[];let cheekRays=0;
      for(let i=1;i<space.stairs.sections.length;i++){
        const a=space.stairs.sections[i],b=space.stairs.sections[i-1],dx=b.edge[0][0]-a.edge[0][0],dz=b.edge[0][1]-a.edge[0][1],len=Math.hypot(dx,dz),nx=-dz/len,nz=dx/len;
        for(const t of [.21,.51,.81])for(const fraction of [.12,.43,.74]){
          const x=a.edge[0][0]*(1-t)+b.edge[0][0]*t-.065,z=a.edge[0][1]*(1-t)+b.edge[0][1]*t,y=(Math.min(space.upperFloor,a.height+.14)*(1-t)+Math.min(space.upperFloor,b.height+.14)*t)*fraction;
          probe.near=.001;probe.far=.28;const from=metricPoint(x+nx*.16,y,z+nz*.16),to=metricPoint(x,y,z);probe.set(from,to.sub(from).normalize());cheekRays++;const hit=probe.intersectObjects(shell,false)[0];if(!hit||!['Warm_Oak','Oak_Shaded_Edges'].includes(hit.object.material?.name))cheekGaps.push({x,z,y,material:hit?.object.material?.name});
        }
      }
      canvas.dataset.connectedStairFinish=JSON.stringify({rays:cheekRays,gaps:cheekGaps});
      const lampGaps=[];
      for(const [x,y,z] of decor.stairLamps){probe.near=.001;probe.far=.30;probe.set(metricPoint(x-.18,y,z),new THREE.Vector3(1,0,0));const hit=probe.intersectObjects(shell,false)[0];if(hit?.object.material?.name!=='Bronze')lampGaps.push({x,z,y,material:hit?.object.material?.name});}
      canvas.dataset.visibleStairFixtures=JSON.stringify({rays:decor.stairLamps.length,gaps:lampGaps});
      const ceilingGaps=[],ceilingPoints=[[0,-1.1,3.5],[1,-2.8,3.5],[0,-6.3,3.7726],[-4,-.85,3.5],[-4,-2.6,3.5],[-4,-3.36,3.5],[-2,.9,3.5],[-1,.5,3.5],[-3.9,1,3.5],[-3,-.8,space.upperCeiling],[-1,-2.3,space.upperCeiling],[1,-.8,space.upperCeiling]];
      for(const [x,z,y] of ceilingPoints){probe.near=.001;probe.far=.30;probe.set(metricPoint(x,y-.15,z),new THREE.Vector3(0,1,0));const hit=probe.intersectObjects(shell,false)[0];if(hit?.object.material?.name!=='White_Satin_Ceiling'||Math.abs(hit.point.y-y*space.worldScale[1])>.008)ceilingGaps.push({x,z,y,material:hit?.object.material?.name,height:hit?.point.y});}
      canvas.dataset.whiteCeilings=JSON.stringify({rays:ceilingPoints.length,gaps:ceilingGaps});
      const columnGaps=[];let columnRays=0;
      for(const [xs,base,shift] of [[[-5.11,-2.65,space.balconyFront[1][0]],0,0],[[-5.1,-2.55,space.balconyFront[1][0]],space.upperFloor,-.16]])for(const x of xs){const z=facadeZ(x)+shift;probe.near=.001;probe.far=.40;probe.set(metricPoint(x+.30,base+1.5,z),new THREE.Vector3(-1,0,0));columnRays++;const hit=probe.intersectObjects(shell,false)[0];if(hit?.object.material?.name!=='Ivory_Polished_Column')columnGaps.push({x,z,material:hit?.object.material?.name});}
      canvas.dataset.modernColumns=JSON.stringify({rays:columnRays,gaps:columnGaps});
      const approachGaps=[];
      for(const x of [1.96,2.08,2.20]){probe.near=.001;probe.far=1.5;probe.set(metricPoint(x,1,8.7),new THREE.Vector3(0,-1,0));const hit=probe.intersectObjects(shell,false)[0];if(!hit||Math.abs(hit.point.y)>.012)approachGaps.push({x,height:hit?.point.y,material:hit?.object.material?.name});}
      canvas.dataset.openStairApproach=JSON.stringify({rays:3,gaps:approachGaps});



    }
    function pick(clientX,clientY,activate=false){
      const rect=canvas.getBoundingClientRect();raycaster.setFromCamera(new THREE.Vector2((clientX-rect.left)/rect.width*2-1,-(clientY-rect.top)/rect.height*2+1),camera);
      const hits=raycaster.intersectObjects(visibleTargets(targets),false);
      const hit=hits.find(hit=>hit.distance>.07);const id=hit?.object.userData.contentId;
      if(activate&&id)interaction.begin(id);
      return id||'';
    }
    const controller=new WalkController(canvas,camera,{start:OUTDOOR,onClick:(x,y)=>pick(x,y,true),onArea:callbacks.onArea,onRoute:callbacks.onRoute});resources.controller=controller;
    canvas.addEventListener('pointermove',e=>{lastPointer={x:e.clientX,y:e.clientY};},{signal});
    canvas.addEventListener('pointerleave',()=>{if(!controller.pointer){lastPointer=null;hoverLast='';callbacks.onHover('');}},{signal});
    const resize=()=>{const w=canvas.clientWidth,h=canvas.clientHeight;if(!w||!h)return;const scale=renderScale(w,h,window.devicePixelRatio);renderer.setPixelRatio(scale);renderer.setSize(w,h,false);composer.setPixelRatio(scale);composer.setSize(w,h);const bloomScale=Math.min(.5,768/Math.max(w*scale,h*scale))*quality;bloom.setSize(w*scale*bloomScale,h*scale*bloomScale);camera.aspect=w/h;camera.fov=w/h<.8?72:57;camera.updateProjectionMatrix();if(renderReady&&!disposed&&!document.hidden)composer.render();};
    const observer=new ResizeObserver(resize);resources.observer=observer;observer.observe(canvas);resize();
    renderer.shadowMap.autoUpdate=false;renderer.shadowMap.needsUpdate=true;
    // Parallel shader polling retains its materials until completion, including
    // an aborted load, so a retry never disposes an in-flight shader program.
    updateLocalLights(0);scene.updateMatrixWorld(true);
    // These meshes never animate. Keep their world matrices cached for both
    // main and reflected views; desk props/camera/cues remain fully animated.
    const freeze=root=>root.traverse(o=>{o.matrixAutoUpdate=false;o.matrixWorldAutoUpdate=false;});
    freeze(architecture.scene);freeze(garden);
    staticPlants.forEach(freeze);
    const compileStart=performance.now();compiling=true;try{await renderer.compileAsync(scene,camera);}finally{compiling=false;if(disposed)release();}compileMs=performance.now()-compileStart;
    if(disposed)return null;
    const reducedMotion=matchMedia('(prefers-reduced-motion: reduce)').matches;
    const interaction=createContentInteraction({camera,controller,entries:contentEntries,targets,callbacks,signal,reducedMotion});let lastNearby=0;
    const direction=new THREE.Vector3(),toDoor=new THREE.Vector3();
    function render(){
      if(disposed)return;raf=requestAnimationFrame(render);clock.update();const rawDelta=clock.getDelta(),delta=Math.min(rawDelta,.25),time=clock.getElapsed();
      if(document.hidden||(controller.paused&&(interaction.phase==='idle'||interaction.phase==='reading')))return;
      let remaining=delta;while(remaining>0){const step=Math.min(remaining,.035);controller.step(step);remaining-=step;}interaction.step(delta);if(time-lastNearby>.15){lastNearby=time;interaction.updateNearby();}water.material.uniforms.time.value+=reducedMotion?0:delta*.22;
      sunsetSky.update(delta,reducedMotion);
      const motion=controller.motion,submersion=motion.inPool?Math.max(0,space.poolMotion.waterLevel*space.worldScale[1]-motion.eyeY):0;
      if(motion.inPool!==wasInWater){wasInWater=motion.inPool;callbacks.onWater?.(wasInWater);}
      output.uniforms.depth.value=submersion;output.uniforms.time.value=time;
      scene.fog.color.set(submersion>.02?0x2f7686:0xd7b8aa);scene.fog.density=submersion>.02?.035+Math.min(submersion,.8)*.065:.006;
      updateLocalLights(time);
      for(const [id,instances] of cues)for(const cue of instances){cue.group.visible=!viewed.has(id)&&(!cue.exhibit||cue.exhibit.visible)&&!interaction.id;cue.material.color.setRGB(0,.40,3.2).multiplyScalar(reducedMotion?1:.8+.2*Math.sin(time*Math.PI*2/2.4));}
      camera.getWorldDirection(direction);toDoor.set(-camera.position.x,0,-camera.position.z).normalize();
      const near=(controller.position.y??0)<.1&&Math.abs(camera.position.z)<(controller.area==='terrace'?8:3.1)&&Math.abs(camera.position.x)<2.7&&direction.dot(toDoor)>.77;
      invitation.visible=(controller.position.y??0)<.1&&(controller.area==='terrace'||near);inviteMat.opacity=reducedMotion?.66:.64+.13*Math.sin(time*1.4);
      const stairUp=Math.hypot(controller.position.x-space.stairs.foot[0],controller.position.z-space.stairs.foot[1])<2&&(controller.position.y??0)<.2;
      const stairDown=controller.area==='library'&&Math.hypot(controller.position.x-space.stairs.head[0],controller.position.z-space.stairs.head[1])<1.3;
      const hint=stairUp?'up':stairDown?'down':near?(controller.area==='atelier'?'out':'in'):'';if(hint!==hintLast){hintLast=hint;callbacks.onHint(hint);}
      if(lastPointer&&!controller.pointer&&!controller.paused&&time-lastPick>.15){lastPick=time;const id=pick(lastPointer.x,lastPointer.y);if(id!==hoverLast){hoverLast=id;canvas.style.cursor=id?'pointer':'grab';callbacks.onHover(id);}}
      renderer.info.autoReset=false;renderer.info.reset();const renderStart=performance.now();meter.begin();composer.render();const stats=meter.end(rawDelta,quality,{position:controller.position,area:controller.area,presentation:interaction.phase});
      if(stats&&time-lastQualityChange>8&&stats.focused&&!stats.hidden&&stats.samples>30){
        const next=stats.gpuP95>24?.7:stats.gpuP95<16?1:quality;
        if(next!==quality){quality=next;lastQualityChange=time;meter.resetSamples();resize();}
      }
      if(import.meta.env.DEV&&time-lastDiagnostic>.25){lastDiagnostic=time;canvas.dataset.presentation=JSON.stringify({phase:interaction.phase,id:interaction.id,bookAngle:deskObjects[0].hinge.rotation.z,cardPosition:deskObjects[1].root.position.toArray(),camera:camera.position.toArray()});canvas.dataset.exhibition=JSON.stringify(exhibits.filter(item=>item.root.visible).map(item=>({id:item.root.children.find(child=>child.userData.contentId)?.userData.contentId,position:item.root.position.toArray()})));canvas.dataset.position=JSON.stringify(controller.position);canvas.dataset.motion=JSON.stringify(motion);canvas.dataset.area=controller.area;canvas.dataset.route=String(controller.path.length);canvas.dataset.skyMotion=JSON.stringify(sunsetSky.state);canvas.dataset.visibleCues=JSON.stringify([...cues].filter(([,instances])=>instances.some(cue=>cue.group.visible)).map(([id])=>id));canvas.dataset.cueInstances=JSON.stringify(Object.fromEntries([...cues].map(([id,instances])=>[id,instances.filter(cue=>cue.group.visible).length])));canvas.dataset.frameMs=String(Math.round(rawDelta*1000));canvas.dataset.renderMs=String(Math.round(performance.now()-renderStart));canvas.dataset.triangles=String(renderer.info.render.triangles);}
    }
    composer.render();meter.ready({readyMs:performance.now()-started,assetMs,compileMs});renderReady=true;render();
    return {pause:value=>{if(value||interaction.phase==='idle')controller.setPaused(value);},interact:id=>interaction.begin(id),closeContent:()=>interaction.close(),galleryPage:offset=>setGalleryPage(galleryPage+offset),setViewed:value=>{viewed=value;},reset:()=>{interaction.reset();controller.reset();setGalleryPage(0);},guide:target=>{if(interaction.phase==='idle')controller.guide(target);},cancelGuide:()=>controller.cancelRoute(),touch:(x,z)=>{if(controller.paused)return;controller.cancelRoute();controller.touchMove={x,z};},touchAction:(action,active)=>controller.touchAction(action,active),dispose};
  } catch(error){dispose();throw error;}
}
