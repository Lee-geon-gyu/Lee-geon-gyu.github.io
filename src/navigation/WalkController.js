import {seatFrom} from './seating.js';
import { START, OUTDOOR, LIBRARY, GALLERY, ATELIER, facadeFront, space, stairCoordinates, moveOnSurface, moveManually, inPool, routeBetween, RADIUS, stairPoint, waterBounds, railSupport, airborneSupport, ceilingHeight, raisedSurfaceHeight, floorHeight, canStand } from './layout.js';
import { worldPoint,worldDelta,logicalDelta } from './coordinates.js';
export class WalkController {
  constructor(canvas,camera,{onClick,onArea,onRoute,onSeated,start=START}) {
    this.canvas=canvas;this.camera=camera;this.callbacks={onClick,onArea,onRoute,onSeated};
    this.seatState=null;this.seatGuide=null;
    this.initialPose={...start};this.initialArea=start.z>.22?'terrace':'atelier';
    this.keys=new Set();this.position={...start};this.area=this.initialArea;this.paused=false;this.path=[];this.touchMove={x:0,z:0};
    this.recovering=false;this.verticalOffset=0;this.verticalVelocity=0;this.motionTime=0;this.riseUntil=0;this.jumpQueued=false;this.touchRun=false;this.touchRise=false;this.climbingOut=false;this.poolGuide=null;this.airGuide=null;this.touchCrouch=false;this.eyeHeight=1.53;
    this.abort=new AbortController();const options={signal:this.abort.signal};
    window.addEventListener('keydown',e=>{
      if(this.paused||e.target?.closest?.('input,textarea,[role="dialog"]'))return;
      if(['KeyW','KeyA','KeyS','KeyD','ArrowUp','ArrowDown','ArrowLeft','ArrowRight','ShiftLeft','ShiftRight','ControlLeft','ControlRight','Space'].includes(e.code)){
        e.preventDefault();this.keys.add(e.code);this.cancelRoute();
        if(this.seated&&e.code!=='Space'&&!e.code.startsWith('Shift')&&!e.code.startsWith('Control'))this.stand();
        if(e.code==='Space'&&!e.repeat)this.requestJump();
      }
    },options);
    window.addEventListener('keyup',e=>this.keys.delete(e.code),options);
    window.addEventListener('blur',()=>{this.keys.clear();this.pointer=null;this.touchMove={x:0,z:0};this.touchRun=false;this.touchRise=false;this.touchCrouch=false;this.jumpQueued=false;this.riseUntil=0;this.climbingOut=false;},options);
    canvas.addEventListener('pointerdown',e=>{if(this.paused||e.button!==0)return;canvas.setPointerCapture(e.pointerId);this.pointer={x:e.clientX,y:e.clientY,lastX:e.clientX,lastY:e.clientY,distance:0,id:e.pointerId};},options);
    canvas.addEventListener('pointermove',e=>{
      const p=this.pointer;if(!p||this.paused)return;
      p.distance=Math.max(p.distance,Math.hypot(e.clientX-p.x,e.clientY-p.y));
      if(p.distance>6){this.cancelRoute();this.position.yaw-=(e.clientX-p.lastX)*.003;this.position.pitch=Math.max(-1.15,Math.min(1.1,this.position.pitch-(e.clientY-p.lastY)*.0026));}
      p.lastX=e.clientX;p.lastY=e.clientY;
    },options);
    canvas.addEventListener('pointerup',e=>{const p=this.pointer;this.pointer=null;if(p&&p.distance<=6&&!this.paused)this.callbacks.onClick(e.clientX,e.clientY);},options);
    canvas.addEventListener('pointercancel',()=>{this.pointer=null;},options);
    this.applyCamera();this.callbacks.onArea(this.area);this.callbacks.onRoute(false);
  }
  get seated(){return Boolean(this.seatState);}
  canSit(seat){return !this.paused&&!this.seated&&!this.swimming&&this.verticalOffset<.001&&this.verticalVelocity===0&&Boolean(seatFrom(this.position,seat));}
  sit(seat){
    if(!this.canSit(seat))return false;
    const poses=seatFrom(this.position,seat);this.cancelRoute();this.setPaused(false);
    this.seatState={...poses,phase:poses.fromSupport?'sitting':'approaching',elapsed:0,duration:poses.fromSupport?.7:Math.max(.2,poses.distance/1.75),origin:{...this.position},originEye:this.eyeHeight};
    this.callbacks.onSeated?.(true);return true;
  }
  stand(){
    const seat=this.seatState;if(!seat||seat.phase==='standing')return false;
    if(seat.phase==='approaching'){
      this.seatState=null;this.callbacks.onSeated?.(false);
      const guide=this.seatGuide;this.seatGuide=null;if(guide)this.guide(guide);return true;
    }
    seat.phase='standing';seat.elapsed=0;seat.duration=.65;seat.origin={...this.position};seat.originEye=this.eyeHeight;
    return true;
  }
  stepSeat(delta){
    const seat=this.seatState;if(seat.phase==='seated')return;
    seat.elapsed+=delta;const t=Math.min(1,seat.elapsed/seat.duration),p=t*t*(3-2*t);
    const target=seat.phase==='sitting'?seat.seated:seat.standing;
    for(const key of ['x','z','y','pitch'])this.position[key]=(seat.origin[key]??0)+((target[key]??0)-(seat.origin[key]??0))*p;
    const turn=Math.atan2(Math.sin(target.yaw-seat.origin.yaw),Math.cos(target.yaw-seat.origin.yaw));this.position.yaw=seat.origin.yaw+turn*p;
    const eye=seat.phase==='sitting'?seat.eyeHeight:1.53;this.eyeHeight=seat.originEye+(eye-seat.originEye)*p;
    if(t<1)return;
    if(seat.phase==='approaching'){
      seat.phase='sitting';seat.elapsed=0;seat.duration=.7;seat.origin={...this.position};seat.originEye=this.eyeHeight;
    }else if(seat.phase==='sitting')seat.phase='seated';
    else{
      this.seatState=null;this.callbacks.onSeated?.(false);
      const guide=this.seatGuide;this.seatGuide=null;if(guide)this.guide(guide);
    }
  }
  get feetY(){return (this.position.y??0)*space.worldScale[1]+this.verticalOffset;}
  get swimming(){return inPool(this.position.x,this.position.z)&&(this.position.y??0)<0&&this.feetY<space.poolMotion.waterLevel*space.worldScale[1]-.035;}
  get crouching(){return !this.seated&&!this.swimming&&(this.keys.has('ControlLeft')||this.keys.has('ControlRight')||this.touchCrouch);}
  get onRaisedSurface(){const y=raisedSurfaceHeight(this.position.x,this.position.z);return y!==null&&Math.abs((this.position.y??0)-y)<.04;}
  get onRail(){const r=railSupport(this.position.x,this.position.z);return Boolean(r&&Math.abs((this.position.y??0)-r.y)<.03);}
  get rising(){return this.keys.has('Space')||this.touchRise||this.motionTime<this.riseUntil||Boolean(this.poolGuide);}
  get sprinting(){return !this.seated&&!this.swimming&&!this.crouching&&(this.path.length>0||this.keys.has('ShiftLeft')||this.keys.has('ShiftRight')||this.touchRun);}
  get motion(){return {seated:this.seated,feetY:this.feetY,eyeY:this.feetY+this.eyeHeight,verticalVelocity:this.verticalVelocity,inPool:this.swimming,underwater:this.feetY+this.eyeHeight<space.poolMotion.waterLevel*space.worldScale[1]-.035,sprinting:this.sprinting,crouching:this.crouching,onRail:this.onRail,airborne:this.verticalOffset>.001||this.verticalVelocity!==0,climbingOut:this.climbingOut};}
  requestJump(){if(this.paused)return;if(this.seated){this.stand();return;}this.cancelRoute();if(this.swimming)this.riseUntil=this.motionTime+.85;else this.jumpQueued=true;}
  touchAction(action,active){if(this.paused)return;if(action==='run')this.touchRun=active;else if(action==='crouch')this.touchCrouch=active;else if(action==='jump'){this.touchRise=active;if(active)this.requestJump();}}
  applyCamera(){this.camera.position.set(...worldPoint(this.position.x,this.position.y??0,this.position.z,this.eyeHeight+this.verticalOffset));this.camera.rotation.order='YXZ';this.camera.rotation.set(this.position.pitch,this.position.yaw,0);}
  setPaused(value){this.paused=value;this.keys.clear();this.touchMove={x:0,z:0};this.touchRun=false;this.touchRise=false;this.touchCrouch=false;this.jumpQueued=false;this.riseUntil=0;if(value){this.climbingOut=false;this.cancelRoute();}}
  cancelRoute(){this.seatGuide=null;if(this.path.length||this.arrival||this.poolGuide||this.airGuide){this.path=[];this.arrival=null;this.poolGuide=null;this.airGuide=null;this.callbacks.onRoute(false);}}
  guide(target){
    if(this.paused)return;
    if(this.seated){this.seatGuide=target;this.stand();return;}
    this.arrival=null;this.poolGuide=null;this.airGuide=null;this.replanAfter=0;
    if(this.swimming){this.path=[];this.arrival=null;this.poolGuide={target,bank:{x:space.pool[1]+.45,z:Math.max(space.pool[2]+.55,Math.min(space.pool[3]-.55,this.position.z))}};this.callbacks.onRoute(true);return;}
    if(this.onRail||this.onRaisedSurface||this.verticalOffset>.001||this.verticalVelocity!==0){
      let bank={x:this.position.x,z:this.position.z};
      if(this.onRail){
        const rail=railSupport(this.position.x,this.position.z);
        if(Math.abs(rail.base-space.upperFloor)<.02&&this.position.x<space.balconyFront[1][0]+.05){const x=Math.max(-4.9,Math.min(2.0,this.position.x));bank={x,z:facadeFront(x)-.45};}
        else bank=stairPoint(rail.base/space.upperFloor);
      }
      if(this.onRaisedSurface){
        let best=Infinity;
        for(let r=.25;r<=2.5;r+=.20)for(let i=0;i<24;i++){
          const x=this.position.x+Math.cos(i*Math.PI/12)*r,z=this.position.z+Math.sin(i*Math.PI/12)*r,y=floorHeight(x,z,this.position.y??0);
          if(y===null||y*space.worldScale[1]>this.feetY+.1||raisedSurfaceHeight(x,z)!==null||!canStand(x,z,RADIUS,y))continue;
          const score=r+Math.abs(y-(this.position.y??0))*.10;if(score<best){best=score;bank={x,z};}
        }
      }
      this.path=[];this.arrival=null;this.airGuide={target,bank};this.callbacks.onRoute(true);return;
    }
    const destination=target==='gallery'?GALLERY:target==='atelier'?ATELIER:target==='library'?LIBRARY:target==='terrace'||this.area==='library'?OUTDOOR:this.area==='atelier'?OUTDOOR:START;
    this.path=routeBetween(this.position,destination);this.destination=destination;this.callbacks.onRoute(this.path.length>0);
  }
  followRoute(delta){
    let remaining=space.poolMotion.runSpeed*delta,direction=null;
    // Spend the complete frame's travel budget across each corner. Reaching a
    // waypoint never inserts an idle frame or cuts diagonally across masonry.
    while(remaining>1e-7&&this.path.length){
      const next=this.path[0],vx=next.x-this.position.x,vz=next.z-this.position.z,metric=worldDelta(vx,vz),distance=Math.hypot(...metric);
      if(distance<1e-7){this.path.shift();continue;}
      const travel=Math.min(distance,remaining),steps=Math.max(1,Math.ceil(travel/.035));
      const sx=vx/distance*travel/steps,sz=vz/distance*travel/steps;
      for(let i=0;i<steps;i++){
        const moved=moveOnSurface(this.position,this.position.x+sx,this.position.z+sz);
        if(!moved){
          if(this.motionTime>=(this.replanAfter??0)){
            this.path=routeBetween(this.position,this.destination);this.replanAfter=this.motionTime+.3;
            if(!this.path.length){this.arrival=null;this.callbacks.onRoute(false);}
          }
          return;
        }
        this.setSurface(moved);
      }
      direction=metric;remaining-=travel;
      if(travel>=distance-1e-7)this.path.shift();
    }
    if(direction){const angle=Math.atan2(-direction[0],-direction[1]),diff=Math.atan2(Math.sin(angle-this.position.yaw),Math.cos(angle-this.position.yaw));this.position.yaw+=diff*(1-Math.exp(-delta*7));this.position.pitch*=Math.exp(-delta*5);}
    if(!this.path.length)this.arrival=this.destination;
  }
  reset(){this.seatState=null;this.seatGuide=null;this.callbacks.onSeated?.(false);this.cancelRoute();this.position={...this.initialPose};this.area=this.initialArea;this.keys.clear();this.pointer=null;this.touchMove={x:0,z:0};this.recovering=false;this.verticalOffset=0;this.verticalVelocity=0;this.riseUntil=0;this.jumpQueued=false;this.touchRun=false;this.touchRise=false;this.climbingOut=false;this.touchCrouch=false;this.eyeHeight=1.53;this.applyCamera();this.callbacks.onArea(this.area);}
  setSurface(next){
    const oldY=this.position.y??0,airborne=this.verticalOffset!==0||this.verticalVelocity!==0||this.onRail||this.onRaisedSurface;
    if(airborne||next.y<0||oldY<0)this.verticalOffset+=(oldY-next.y)*space.worldScale[1];
    this.position.x=next.x;this.position.z=next.z;
    if(next.y!==0||this.position.y!==undefined)this.position.y=next.y;
  }
  updateVertical(delta){
    const previousFeet=this.feetY,wasAirborne=this.verticalOffset>0||this.verticalVelocity!==0;
    const m=space.poolMotion,water=m.waterLevel*space.worldScale[1];
    if(this.swimming&&this.feetY<water-.08){
      if(this.climbingOut&&this.rising){this.verticalVelocity=3.2;this.verticalOffset+=this.verticalVelocity*delta;if(this.feetY>=.08){this.verticalOffset=.08-(this.position.y??0)*space.worldScale[1];this.verticalVelocity=0;}}
      else{
        this.climbingOut=false;
        this.verticalVelocity+=((this.rising?4.0:-1.25)-this.verticalVelocity*(this.rising?2.2:1.8))*delta;
        const before=this.feetY;this.verticalOffset+=this.verticalVelocity*delta;
        const floatFeet=water+m.floatEyeHeight-this.eyeHeight;
        if(this.rising&&before<=floatFeet&&this.feetY>floatFeet){this.verticalOffset=floatFeet-(this.position.y??0)*space.worldScale[1];this.verticalVelocity=0;}
        if(this.verticalOffset<0){this.verticalOffset=0;this.verticalVelocity=0;}
      }
    }else if(this.swimming&&this.climbingOut&&this.rising){
      this.verticalVelocity=0;this.verticalOffset=.08-(this.position.y??0)*space.worldScale[1];
    }else{
      if(this.verticalOffset>0||this.verticalVelocity!==0){this.verticalVelocity-=m.gravity*delta;this.verticalOffset+=this.verticalVelocity*delta;}
      if(this.verticalOffset<=0){this.verticalOffset=0;this.verticalVelocity=0;this.climbingOut=false;}
    }
    const headLimit=ceilingHeight(this.position.x,this.position.z,previousFeet)-this.eyeHeight-.08;
    if(this.feetY>headLimit){
      this.verticalOffset=Math.max(0,headLimit-(this.position.y??0)*space.worldScale[1]);
      this.verticalVelocity=Math.min(0,this.verticalVelocity);
    }
    if(wasAirborne&&this.verticalOffset===0&&this.verticalVelocity===0&&!this.swimming&&!this.onRail&&!this.onRaisedSurface)this.recovering=!canStand(this.position.x,this.position.z,RADIUS,this.position.y??0);
  }
  step(delta){
    if(this.paused)return;
    if(delta>.035){let left=delta;while(left>1e-6){const dt=Math.min(left,.035);this.step(dt);left-=dt;}return;}
    if(this.seated){this.stepSeat(delta);this.applyCamera();return;}
    this.motionTime+=delta;
    this.eyeHeight+=((this.crouching?space.poolMotion.crouchEyeHeight:1.53)-this.eyeHeight)*(1-Math.exp(-delta*12));
    // Launch from the current support before horizontal motion changes it.
    // Otherwise leaving a sloping rail can consume Space as an airborne jump.
    if(this.jumpQueued){if(!this.swimming&&this.verticalOffset<=.001&&this.verticalVelocity===0)this.verticalVelocity=space.poolMotion.jumpSpeed;this.jumpQueued=false;}
    let dx=0,dz=0;
    const followingPath=this.path.length>0&&!this.airGuide&&!this.poolGuide;
    const guiding=this.path.length>0||Boolean(this.arrival)||Boolean(this.airGuide);
    if(this.airGuide){
      const vx=this.airGuide.bank.x-this.position.x,vz=this.airGuide.bank.z-this.position.z,metric=worldDelta(vx,vz),distance=Math.hypot(...metric),step=Math.min(delta*space.poolMotion.runSpeed,distance);
      dx=vx/(distance||1)*step;dz=vz/(distance||1)*step;
    }else if(this.poolGuide){
      const vx=this.poolGuide.bank.x-this.position.x,vz=this.poolGuide.bank.z-this.position.z,metric=worldDelta(vx,vz),distance=Math.hypot(...metric),step=Math.min(delta*(this.swimming?space.poolMotion.swimSpeed:space.poolMotion.runSpeed),distance);
      dx=vx/(distance||1)*step;dz=vz/(distance||1)*step;
      const angle=Math.atan2(-metric[0],-metric[1]),diff=Math.atan2(Math.sin(angle-this.position.yaw),Math.cos(angle-this.position.yaw));this.position.yaw+=diff*Math.min(delta*3.5,1);
    }else if(this.path.length){
      this.followRoute(delta);
    }else if(this.arrival){
      const diff=Math.atan2(Math.sin(this.arrival.yaw-this.position.yaw),Math.cos(this.arrival.yaw-this.position.yaw));
      const pitchDiff=this.arrival.pitch-this.position.pitch;
      this.position.yaw+=diff*Math.min(delta*3.5,1);this.position.pitch+=pitchDiff*Math.min(delta*3.5,1);
      if(Math.abs(diff)<.003&&Math.abs(pitchDiff)<.003){this.position.yaw=this.arrival.yaw;this.position.pitch=this.arrival.pitch;this.arrival=null;this.callbacks.onRoute(false);}
    }else{
      const k=this.keys;
      let forward=Number(k.has('KeyW')||k.has('ArrowUp'))-Number(k.has('KeyS')||k.has('ArrowDown'))+this.touchMove.z;
      let side=Number(k.has('KeyD')||k.has('ArrowRight'))-Number(k.has('KeyA')||k.has('ArrowLeft'))+this.touchMove.x;
      const norm=Math.max(1,Math.hypot(forward,side));forward/=norm;side/=norm;
      const speed=delta*(this.swimming?space.poolMotion.swimSpeed:this.crouching?space.poolMotion.crouchSpeed:this.sprinting?space.poolMotion.runSpeed:space.poolMotion.walkSpeed),sin=Math.sin(this.position.yaw),cos=Math.cos(this.position.yaw);
      [dx,dz]=logicalDelta((side*cos-forward*sin)*speed,(-side*sin-forward*cos)*speed);
    }
    // Substeps prevent crossing a stair edge or skipping a landing at low FPS.
    const steps=followingPath?0:Math.max(1,Math.ceil(Math.hypot(dx,dz)/.04));
    for(let i=0;i<steps;i++){
      const sx=dx/steps,sz=dz/steps;
      if(this.swimming&&this.rising&&this.feetY>=space.poolMotion.waterLevel*space.worldScale[1]-1.4){
        const [a,b,c,d]=waterBounds,p=this.position;
        if((p.x<a+RADIUS+.04&&sx<0)||(p.x>b-RADIUS-.04&&sx>0)||(p.z<c+RADIUS+.04&&sz<0)||(p.z>d-RADIUS-.04&&sz>0))this.climbingOut=true;
      }
      const move=(x,z)=>guiding&&!this.airGuide?moveOnSurface(this.position,x,z):moveManually(this.position,x,z,{canExitPool:this.feetY>=-.15,feetY:this.feetY,airborne:!this.swimming&&(this.verticalOffset>.001||this.verticalVelocity!==0||this.onRail||this.onRaisedSurface||this.recovering),bodyHeight:this.eyeHeight});
      let combined=move(this.position.x+sx,this.position.z+sz);
      if(combined){this.setSurface(combined);continue;}
      const q=stairCoordinates(this.position.x,this.position.z);
      if(q.t>=0&&q.t<=1&&Math.abs(q.side)<q.width/2){
        // At an angled stair rail, keep only intentional motion along the
        // stair. Axis-by-axis sliding would turn pure strafing into a descent.
        const [vx,vz]=worldDelta(...q.axis),length=Math.hypot(vx,vz),metric=worldDelta(sx,sz);
        const along=(metric[0]*vx+metric[1]*vz)/length,[ax,az]=logicalDelta(vx/length*along,vz/length*along);
        combined=move(this.position.x+ax,this.position.z+az);
        if(combined)this.setSurface(combined);
        continue;
      }
      let next=move(this.position.x+sx,this.position.z);
      if(next)this.setSurface(next);
      next=move(this.position.x,this.position.z+sz);
      if(next)this.setSurface(next);
    }
    if(!this.swimming&&(this.verticalOffset>.001||this.verticalVelocity!==0||this.onRail||this.onRaisedSurface)){
      const y=airborneSupport(this.position.x,this.position.z,this.feetY);
      if(y!==null&&Math.abs(y-(this.position.y??0))>1e-6)this.setSurface({...this.position,y});
    }
    this.updateVertical(delta);
    if(this.recovering&&canStand(this.position.x,this.position.z,RADIUS,this.position.y??0))this.recovering=false;
    if(this.airGuide&&(this.swimming||(!this.onRail&&this.verticalOffset===0&&Math.hypot(...worldDelta(this.position.x-this.airGuide.bank.x,this.position.z-this.airGuide.bank.z))<.04))){const target=this.airGuide.target;this.airGuide=null;this.guide(target);}
    if(this.poolGuide&&!this.swimming&&this.verticalOffset===0&&Math.hypot(...worldDelta(this.position.x-this.poolGuide.bank.x,this.position.z-this.poolGuide.bank.z))<.04){const target=this.poolGuide.target;this.poolGuide=null;this.guide(target);}
    const inGallery=this.position.x>space.gallery.bounds[0]&&this.position.x<space.gallery.bounds[1]&&this.position.z<facadeFront(this.position.x)-.2;
    const area=(this.position.y??0)>3.65?'library':inGallery?'atelier':this.position.z>.22?'terrace':this.position.z<-.22?'atelier':this.area;
    if(area!==this.area){this.area=area;this.callbacks.onArea(area);}
    this.applyCamera();
  }
  dispose(){this.abort.abort();this.keys.clear();}
}
