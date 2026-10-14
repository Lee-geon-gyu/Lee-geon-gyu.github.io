export function softenLibraryLighting(shader,upperY,ceiling=false){
 // Both stories use the same satin finish and their real baked bounce.
 // A minimum diffuse value on the upper ceiling erased its panel shading
 // and made the distant soffit look like a different, flat white material.
 if(ceiling)return;
 shader.uniforms.libraryFloorY={value:upperY};
 shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nvarying float vLibraryHeight;').replace('#include <begin_vertex>','#include <begin_vertex>\nvLibraryHeight=(modelMatrix*vec4(transformed,1.0)).y;');
 shader.fragmentShader=shader.fragmentShader.replace('#include <common>','#include <common>\nvarying float vLibraryHeight; uniform float libraryFloorY;');
 shader.fragmentShader=shader.fragmentShader.replace('#include <opaque_fragment>','outgoingLight *= mix(1.0,0.58,step(libraryFloorY-0.025,vLibraryHeight));\n#include <opaque_fragment>');
}
