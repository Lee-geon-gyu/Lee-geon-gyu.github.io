import {useEffect,useRef} from 'react';
import {CursorMotion,cursorFrames} from './cursorMotion.js';

// The OS tracks position. Only the tiny cached native cursor shape changes.
export function WorldCursor({canvasRef,targetId,enabled}){
 const targetRef=useRef(''),refreshRef=useRef(null);
 useEffect(()=>{targetRef.current=targetId;refreshRef.current?.();},[targetId]);
 useEffect(()=>{
  if(!enabled)return;
  const canvas=canvasRef.current,root=canvas?.parentElement,html=document.documentElement;
  if(!root)return;
  const media=matchMedia('(any-hover: hover) and (any-pointer: fine)'),reduced=matchMedia('(prefers-reduced-motion: reduce)'),abort=new AbortController(),options={signal:abort.signal,passive:true},motion=new CursorMotion();
  let visible=false,onCanvas=false,control='',dragging=false,pressed=false,target='',mode='idle',raf=0,last=0,painted=-1;
  const paint=index=>{if(index!==painted){painted=index;html.style.setProperty('--world-cursor-image',cursorFrames[index]);}};
  const tick=time=>{
   raf=0;if(!visible||!media.matches||document.hidden||!document.hasFocus())return;
   if(!last||time-last>=40){paint(motion.step(last?(time-last)/1000:1/60,time/1000,mode,reduced.matches));last=time;}
   if(!reduced.matches)raf=requestAnimationFrame(tick);
  };
  const refresh=()=>{
   target=visible&&!dragging?(onCanvas?targetRef.current:control):'';
   const next=pressed?'pressed':target?'hover':'idle';
   if(target)html.dataset.cursorTarget=target;else delete html.dataset.cursorTarget;
   if(pressed)html.dataset.cursorPressed='';else delete html.dataset.cursorPressed;
   if(next!==mode){mode=next;html.dataset.cursorMode=mode;}
   if(visible&&media.matches){
    if(reduced.matches){cancelAnimationFrame(raf);raf=0;paint(motion.step(0,0,mode,true));}
    else if(!raf){last=0;raf=requestAnimationFrame(tick);}
   }
  };
  refreshRef.current=refresh;
  const hide=()=>{
   visible=false;onCanvas=false;control='';dragging=false;pressed=false;mode='idle';
   cancelAnimationFrame(raf);raf=0;last=0;painted=-1;motion.radius=10.5;motion.velocity=0;
   delete html.dataset.cursorTarget;delete html.dataset.cursorPressed;delete html.dataset.cursorMode;html.style.removeProperty('--world-cursor-image');
  };
  const enter=event=>{
   if(!media.matches||event.pointerType!=='mouse'||!root.contains(event.target)||event.clientX<0||event.clientY<0||event.clientX>=innerWidth||event.clientY>=innerHeight){hide();return;}
   visible=true;onCanvas=event.target===canvas;control=event.target.closest('button:not(:disabled),a[href],[role="button"]:not([aria-disabled="true"])')?'control':'';
   if(!event.buttons){dragging=false;pressed=false;}refresh();
  };
  root.addEventListener('pointerover',enter,options);
  root.addEventListener('pointermove',event=>{if(!visible)enter(event);},options);
  root.addEventListener('pointerdown',event=>{enter(event);if(visible&&event.button===0){pressed=true;dragging=event.target===canvas;refresh();}},options);
  root.addEventListener('pointerleave',hide,options);
  window.addEventListener('pointerup',event=>{pressed=false;dragging=false;enter(event);},options);
  for(const event of ['pointercancel','blur','resize'])window.addEventListener(event,hide,options);
  window.addEventListener('keydown',event=>{if(event.key==='Tab')hide();},options);
  document.addEventListener('visibilitychange',()=>{if(document.hidden)hide();},options);
  media.addEventListener('change',hide,options);reduced.addEventListener('change',refresh,options);
  return()=>{abort.abort();hide();refreshRef.current=null;};
 },[canvasRef,enabled]);
 return null;
}
