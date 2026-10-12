import * as THREE from 'three';

// Precompute the noise lattice once. Trilinear texture filtering replaces
// hundreds of hash operations per lit pixel, retaining the same smooth noise
// interpolation, world-space grain and three patina octaves.
export function createFinishNoise(){
  const size=64,data=new Uint8Array(size**3),fract=x=>x-Math.floor(x);
  for(let z=0;z<size;z++)for(let y=0;y<size;y++)for(let x=0;x<size;x++){
    let a=fract(x*.1031),b=fract(y*.1031),c=fract(z*.1031);
    const dot=a*(b+33.33)+b*(c+33.33)+c*(a+33.33);a+=dot;b+=dot;c+=dot;
    data[x+size*(y+size*z)]=Math.round(fract((a+b)*c)*255);
  }
  const texture=new THREE.Data3DTexture(data,size,size,size);texture.format=THREE.RedFormat;
  texture.minFilter=texture.magFilter=THREE.LinearFilter;
  texture.wrapS=texture.wrapT=texture.wrapR=THREE.RepeatWrapping;texture.needsUpdate=true;
  return texture;
}

// World-space patina remains consistent as the camera moves. The scanned
// grain, normal maps, baked illumination and live PBR response remain intact.
const patinaShader = `
varying vec3 vAtelierSurface;
uniform highp sampler3D atelierNoiseMap;
float atelierNoise(vec3 p) {
  vec3 i=floor(p),f=fract(p);f=f*f*(3.0-2.0*f);
  return texture(atelierNoiseMap,(mod(i,64.0)+f+0.5)/64.0).r;
}
float atelierPatina(vec3 p) {
  return atelierNoise(p)*.62+atelierNoise(p*2.07+8.3)*.26+atelierNoise(p*4.13+21.7)*.12;
}
`;

export function applyAgedFinish(shader, finish, noise) {
  shader.uniforms.atelierNoiseMap={value:noise};
  shader.vertexShader=shader.vertexShader
    .replace('#include <common>','#include <common>\nvarying vec3 vAtelierSurface;')
    .replace('#include <begin_vertex>',`#include <begin_vertex>
      vec4 atelierWorld=vec4(transformed,1.0);
      #ifdef USE_INSTANCING
        atelierWorld=instanceMatrix*atelierWorld;
      #endif
      vAtelierSurface=(modelMatrix*atelierWorld).xyz;`);
  shader.fragmentShader=shader.fragmentShader.replace('#include <common>','#include <common>\n'+patinaShader);
  const tint=finish==='oak' ? `
    float agedPatch=atelierPatina(vAtelierSurface*.85+vec3(5.1,0.0,3.7));
    diffuseColor.rgb=pow(diffuseColor.rgb,vec3(.92));
    diffuseColor.rgb*=mix(vec3(.88,.83,.73),vec3(1.16,1.12,1.04),agedPatch);
  ` : finish==='plaster' ? `
    float agedPatch=atelierPatina(vAtelierSurface*1.15+vec3(1.7,5.3,0.0));
    float mineralGrain=atelierNoise(vAtelierSurface*45.0);
    diffuseColor.rgb*=mix(vec3(.88,.86,.82),vec3(1.04,1.03,1.00),agedPatch);
    diffuseColor.rgb*=.97+.055*mineralGrain;
  ` : `
    float agedPatch=atelierPatina(vAtelierSurface*.8);
    diffuseColor.rgb*=.90+.13*agedPatch;
  `;
  shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>','#include <map_fragment>\n'+tint);
  shader.fragmentShader=shader.fragmentShader.replace('#include <roughnessmap_fragment>',
    `#include <roughnessmap_fragment>\nroughnessFactor=clamp(roughnessFactor+(.5-agedPatch)*${finish==='stone'?'.025':'.18'},${finish==='stone'?'.055':'.08'},1.0);`);
}
