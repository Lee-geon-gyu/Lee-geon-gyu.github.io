import {Matrix4} from 'three';

// Fixture irradiance is already baked into this satin shell. Camera-ranked
// local emitters otherwise add it a second time as the visitor enters the
// atelier, washing out the cornice and changing the apparent finish.
export function stabilizeAtelierCeiling(shader,space){
 const [sx,sy,sz]=space.worldScale;
 shader.uniforms.ceilingWorldToLayout={value:new Matrix4().set(sx,0,sx*space.worldShear,0,0,sy,0,0,0,0,sz,0,0,0,0,1).invert()};
 shader.vertexShader=shader.vertexShader
  .replace('#include <common>','#include <common>\nuniform mat4 ceilingWorldToLayout; varying vec3 vCeilingLayout;')
  .replace('#include <begin_vertex>','#include <begin_vertex>\nvCeilingLayout=(ceilingWorldToLayout*modelMatrix*vec4(transformed,1.0)).xyz;');
 shader.fragmentShader=shader.fragmentShader
  .replace('#include <common>','#include <common>\nvarying vec3 vCeilingLayout;')
  .replace('IncidentLight directLight;',`IncidentLight directLight;
   float ceilingFixtureGain=(vCeilingLayout.y<${(space.upperFloor+.5).toFixed(3)} &&
    abs(vCeilingLayout.x)<2.55 && vCeilingLayout.z<0.165 && vCeilingLayout.z>-7.27)?0.0:1.0;`)
  .replace('getPointLightInfo( pointLight, geometryPosition, directLight );',
   'getPointLightInfo( pointLight, geometryPosition, directLight );\ndirectLight.color*=ceilingFixtureGain;')
  .replace('rectAreaLight = rectAreaLights[ i ];',
   'rectAreaLight = rectAreaLights[ i ];\nrectAreaLight.color*=ceilingFixtureGain;');
 // Directional sunlight, projected foliage, baked bounce and environment
 // remain live. Other rooms, timber, fittings and furniture keep their PBR.
}
