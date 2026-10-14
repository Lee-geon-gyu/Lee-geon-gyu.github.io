import {useEffect} from 'react';
import {RotateCcw} from 'lucide-react';

const base=import.meta.env.BASE_URL;
export function LoadingScreen({progress,ready,error,onRetry,onExited,obscured}){
  // The short completion dissolve also has a cleanup-safe fallback for
  // disabled CSS animations, background tabs and reduced-motion settings.
  useEffect(()=>{
    if(!ready||error)return;
    const timer=setTimeout(onExited,1050);return()=>clearTimeout(timer);
  },[ready,error,onExited]);
  return <section className={`arrival-loading ${ready&&!error?'is-revealing':''} ${error?'has-error':''} ${obscured?'is-obscured':''}`}
    aria-label="공간 불러오기" aria-hidden={obscured||undefined} inert={obscured?true:undefined}
    onAnimationEnd={event=>{if(event.target===event.currentTarget&&event.animationName==='arrival-reveal')onExited();}}>
    <picture className="arrival-house" aria-hidden="true">
      <source media="(max-aspect-ratio: 4/5)" srcSet={`${base}assets/loading/house-mobile.webp`}/>
      <img src={`${base}assets/loading/house.webp`} alt="" fetchPriority="high" decoding="async"/>
    </picture>
    <div className="arrival-shade" aria-hidden="true"/>
    <div className="arrival-identity">
      <div className="lee-progress" role="progressbar" aria-label="3D 공간 불러오기" aria-valuemin={0} aria-valuemax={100}
        aria-valuenow={progress.percent} aria-valuetext={`${progress.percent}%, ${progress.phase}`} style={{'--load-progress':progress.percent}}>
        <span className="lee-outline" aria-hidden="true"/>
        <span className="lee-liquid-mask" aria-hidden="true"><span className="lee-liquid-level"><span className="lee-liquid">
          <span className="lee-wave lee-wave--back"/><span className="lee-wave"/>
        </span></span></span>
        <span className="sr-only">lee</span>
      </div>
      {!error?<p className="arrival-percent"><span>{progress.percent}</span><span>%</span></p>:null}
      {error?<div className="arrival-error" role="alert"><p>{error}</p><button onClick={onRetry} aria-label="다시 불러오기"><RotateCcw size={20}/><span className="control-caption">다시 불러오기</span></button></div>:null}
    </div>

  </section>;
}
