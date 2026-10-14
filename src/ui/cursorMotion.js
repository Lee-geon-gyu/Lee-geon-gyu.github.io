const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export function cursorSvg(radius=10.5){
 const squeeze=clamp((10.2-radius)/1.7,0,1),ry=radius*(1-.13*squeeze),tilt=-9*squeeze;
 const n=v=>Number(v.toFixed(3));
 // The same hollow mint ring is rendered by the OS from the loading paint.
 // Two cached strokes suggest neon without filters or a following overlay.
 return `<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 48 48"><g transform="rotate(${n(tilt)} 24 24)" fill="none" stroke="#9cffe2"><ellipse cx="24" cy="24" rx="${n(radius)}" ry="${n(ry)}" stroke-width="3.2" opacity=".16"/><ellipse cx="24" cy="24" rx="${n(radius)}" ry="${n(ry)}" stroke-width="1.65" opacity=".94"/></g></svg>`;
}
export const cursorFrames=Array.from({length:37},(_,i)=>`url("data:image/svg+xml,${encodeURIComponent(cursorSvg(8.5+i*.125))}") 24 24, auto`);
export class CursorMotion{
 constructor(){this.radius=10.5;this.velocity=0;}
 step(dt,time,mode='idle',reduced=false){
  const target=mode==='pressed'?8.5:mode==='hover'?12.5:10.5+(reduced?0:Math.sin(time*1.45)*.32);
  if(reduced){this.radius=target;this.velocity=0;}
  else{let left=Math.min(.10,Math.max(0,dt));while(left>1e-7){const h=Math.min(left,1/120);this.velocity+=(145*(target-this.radius)-22*this.velocity)*h;this.radius+=this.velocity*h;left-=h;}this.radius=clamp(this.radius,8.5,13);}
  return clamp(Math.round((this.radius-8.5)/.125),0,36);
 }
}
