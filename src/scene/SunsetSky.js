import * as THREE from 'three';

// Clouds advect and change shape at two heights; the sun and horizon stay put.
// The existing photographic sky supplies fine cloud detail inside the shader.
export function createSunsetSky(photo, lighting) {
  photo.colorSpace = THREE.SRGBColorSpace;
  photo.wrapS = THREE.RepeatWrapping;
  const sunDirection = new THREE.Vector3(...lighting.sun.position)
    .sub(new THREE.Vector3(...lighting.sun.target));
  sunDirection.y *= .42;
  sunDirection.normalize();
  const uniforms = {
    skyMap: { value: photo },
    cloudTime: { value: 0 },
    sunDirection: { value: sunDirection },
  };
  const material = new THREE.ShaderMaterial({
    uniforms,
    side: THREE.BackSide,
    depthWrite: false,
    fog: false,
    vertexShader: `varying vec3 skyPosition;
      void main(){vec4 p=modelMatrix*vec4(position,1.0);skyPosition=p.xyz;
      gl_Position=projectionMatrix*viewMatrix*p;}`,
    fragmentShader: `uniform sampler2D skyMap;
      uniform float cloudTime;uniform vec3 sunDirection;varying vec3 skyPosition;
      float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
      float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.0-2.0*f);
        return mix(mix(hash(i),hash(i+vec2(1.0,0.0)),f.x),
          mix(hash(i+vec2(0.0,1.0)),hash(i+vec2(1.0,1.0)),f.x),f.y);}
      float cloud(vec2 p){float a=.5,v=0.0;mat2 turn=mat2(.8,-.6,.6,.8);
        for(int i=0;i<5;i++){v+=a*noise(p);p=turn*p*2.03+17.1;a*=.5;}return v;}
      void main(){
        vec3 d=normalize(skyPosition-cameraPosition);
        vec2 uv=vec2(atan(d.z,d.x)*.159154943+.5,asin(clamp(d.y,-1.0,1.0))*.318309886+.5);
        vec2 wind=vec2(cloudTime*.00013,cloudTime*.000018);
        vec2 plane=d.xz/max(.23,d.y+.38);
        float low=cloud(plane*1.7+vec2(cloudTime*.008,-cloudTime*.003));
        float high=cloud(plane*3.2+vec2(-cloudTime*.004,cloudTime*.0018)+41.7);
        vec2 warp=vec2(low-.5,high-.5)*.009;
        vec3 photograph=texture2D(skyMap,vec2(fract(uv.x+wind.x+warp.x),clamp(uv.y+wind.y+warp.y,0.0,1.0))).rgb;
        float detail=dot(photograph,vec3(.30,.52,.18));
        float photographicCloud=smoothstep(.15,.62,detail);
        float mist=smoothstep(.56,.79,low)*.27+smoothstep(.67,.85,high)*.16;
        float cover=clamp(photographicCloud*.82+mist-.045,0.0,.94)*smoothstep(-.12,.08,d.y);
        float height=smoothstep(-.05,.90,d.y);
        vec3 atmosphere=mix(vec3(1.12,.32,.17),vec3(.085,.11,.235),height);
        float toward=max(0.0,dot(d,sunDirection));
        float glow=pow(toward,12.0);
        atmosphere+=vec3(1.25,.37,.10)*glow;
        vec3 cloudShade=mix(vec3(.27,.13,.21),vec3(1.42,.63,.34),clamp(detail*.85+glow*.55,0.0,1.0));
        cloudShade+=vec3(.28,.13,.075)*smoothstep(.43,.72,high)*photographicCloud;
        vec3 color=mix(atmosphere,cloudShade,cover);
        float sun=smoothstep(.99968,.99994,toward)*(1.0-cover*.88);
        color+=vec3(3.2,1.5,.55)*sun;
        color=mix(vec3(.30,.14,.17),color,smoothstep(-.30,.10,d.y));
        gl_FragColor=vec4(color,1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
  });
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(85,48,24), material);
  mesh.name = 'Sunset_Cloud_Dome';
  mesh.frustumCulled = false;
  mesh.renderOrder = -100;
  const state = { style:'sunset', time:0, lowWind:0, highWind:0, reducedMotion:false };
  return {
    mesh,
    state,
    update(delta,reducedMotion) {
      state.reducedMotion = reducedMotion;
      if(!reducedMotion)uniforms.cloudTime.value += delta;
      state.time = uniforms.cloudTime.value;
      state.lowWind = state.time*.008;
      state.highWind = -state.time*.004;
    },
  };
}
