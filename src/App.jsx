import { useCallback, useEffect, useRef, useState } from 'react';
import { RotateCcw, ArrowUp, ArrowDown, ArrowLeft, ArrowRight, Tablet, Images, Library, Armchair, Footprints, ChevronsDown, LogOut } from 'lucide-react';
import { complete, counts, newlyCompletedQuests } from './state/session.js';
import { AmbientMusic } from './audio/AmbientMusic.jsx';
import {Detail} from "./ui/DetailView.jsx";
import { QuestPanel } from './ui/QuestPanel.jsx';
import { ControlGuide } from './ui/ControlGuide.jsx';
import {LoadingScreen} from './ui/LoadingScreen.jsx';
import {WorldCursor} from './ui/WorldCursor.jsx';
import {initialLoadingProgress,advanceLoading} from './ui/loadingProgress.js';
const base=import.meta.env.BASE_URL;
const url=path=>`${base}${path}`;
const guideDestinations=[['gallery','프로필 태블릿',Tablet],['atelier','작업 전시',Images],['library','2층 서재',Library],['terrace','테라스',Armchair]];
const ignoreSceneHint=()=>{};
export function App(){
  const canvasRef=useRef(null),sceneRef=useRef(null),openRef=useRef(null),closeTimer=useRef(null),closingRef=useRef(false),sessionRef=useRef({viewed:new Set(),paused:false});
  const [content,setContent]=useState(null),[viewed,setViewed]=useState(()=>new Set()),[detail,setDetail]=useState(null);
  const [area,setArea]=useState('atelier'),[route,setRoute]=useState(false),[controlsOpen,setControlsOpen]=useState(false);
  const [waterActive,setWaterActive]=useState(false),[seated,setSeated]=useState(false),[hovered,setHovered]=useState('');
  const [questScans,setQuestScans]=useState([]),[guideTarget,setGuideTarget]=useState('');
  const [nearby,setNearby]=useState(''),[presentation,setPresentation]=useState(''),[closing,setClosing]=useState(false),[gallery,setGallery]=useState({page:0,total:1,count:0});
  const [ready,setReady]=useState(false),[error,setError]=useState(''),[retry,setRetry]=useState(0),[progress,setProgress]=useState(initialLoadingProgress),[loadingVisible,setLoadingVisible]=useState(true);
  const exitedLoading=useCallback(()=>{setLoadingVisible(false);if(!sessionRef.current.paused)canvasRef.current?.focus({preventScroll:true});},[]);
  const retryLoading=()=>{setError('');setContent(null);setReady(false);setLoadingVisible(true);setProgress(initialLoadingProgress());setRetry(value=>value+1);};
  const open=useCallback(id=>{if(content){sceneRef.current?.pause(true);setDetail(id);}},[content]);openRef.current=open;
  const close=useCallback(()=>{if(closingRef.current)return;closingRef.current=true;setClosing(true);sceneRef.current?.closeContent();closeTimer.current=setTimeout(()=>{setDetail(null);setClosing(false);closingRef.current=false;sceneRef.current?.pause(false);},240);},[]);
  useEffect(()=>()=>clearTimeout(closeTimer.current),[]);
  const opened=useCallback(id=>{
    const previous=sessionRef.current.viewed,next=complete(previous,id,content.projects);
    const completed=newlyCompletedQuests(previous,next,content.projects);
    sessionRef.current.viewed=next;setViewed(next);
    if(completed.length)setQuestScans(pending=>[...new Set([...pending,...completed])]);
  },[content]);
  const scanEnded=useCallback(id=>setQuestScans(pending=>pending.filter(quest=>quest!==id)),[]);
  const closeControls=useCallback(()=>setControlsOpen(false),[]);
  const guide=target=>{setGuideTarget(target);sceneRef.current?.guide(target);};
  useEffect(()=>{
    const controller=new AbortController();fetch(url('portfolio-content.json'),{signal:controller.signal}).then(response=>{if(!response.ok)throw new Error('콘텐츠 파일을 읽지 못했어요.');return response.json();}).then(setContent).catch(e=>{if(e.name!=='AbortError')setError('콘텐츠를 불러오지 못했어요. 다시 불러오기를 눌러 주세요.');});return()=>controller.abort();
  },[retry]);
  useEffect(()=>{
    if(!content)return;
    const controller=new AbortController();setReady(false);setLoadingVisible(true);setError('');setProgress(initialLoadingProgress());
    import('./scene/createScene.js').then(({createScene})=>{if(controller.signal.aborted)return null;return createScene(canvasRef.current,content,{onProgress:event=>{if(!controller.signal.aborted)setProgress(previous=>advanceLoading(previous,event));},onError:message=>{if(!controller.signal.aborted){setReady(false);setLoadingVisible(true);setError(message);}},onArea:setArea,onWater:setWaterActive,onRoute:setRoute,onHint:ignoreSceneHint,onHover:setHovered,onNearby:setNearby,onSeated:setSeated,onPresentation:setPresentation,onGallery:setGallery,onOpen:id=>openRef.current(id)},controller.signal);}).then(scene=>{if(scene&&!controller.signal.aborted){sceneRef.current=scene;scene.setViewed(sessionRef.current.viewed);scene.pause(sessionRef.current.paused);setProgress(previous=>advanceLoading(previous,{stage:'ready',phase:'공간이 준비됐어요'}));setReady(true);}}).catch(e=>{if(!controller.signal.aborted){console.error(e);setError(e.message||'WebGL을 시작하지 못했어요.');}});
    return()=>{controller.abort();sceneRef.current=null;};
  },[content,retry]);
  useEffect(()=>{sessionRef.current.viewed=viewed;sceneRef.current?.setViewed(viewed);},[viewed,ready]);
  useEffect(()=>{sessionRef.current.paused=Boolean(detail||controlsOpen);sceneRef.current?.pause(sessionRef.current.paused);},[detail,controlsOpen,ready]);
  const reset=()=>{clearTimeout(closeTimer.current);closingRef.current=false;setClosing(false);setDetail(null);setControlsOpen(false);const empty=new Set();sessionRef.current.viewed=empty;setViewed(empty);setQuestScans([]);setGuideTarget('');sceneRef.current?.setViewed(empty);sceneRef.current?.reset();setNearby('');setPresentation('');setWaterActive(false);setSeated(false);};
  const totals=counts(viewed,content?.projects??[]),movement=(x,z)=>sceneRef.current?.touch(x,z),projectCount=content?.projects.length??0;
  const nearbySeat=['terrace-bench','library-sofa'].includes(nearby);
  const nearbyTitle=nearby==='terrace-bench'?'벤치에 앉기':nearby==='library-sofa'?'소파에 앉기':nearby==='profile'?'책상 위의 프로필 태블릿':nearby==='contact'?'책상 위의 명함':content?.projects.find(p=>p.id===nearby)?.title;
  return <main className={`portfolio-world ${presentation?'is-presenting':''}`} aria-label="오후의 공방과 수영장 테라스 포트폴리오">
    <canvas ref={canvasRef} className="world-canvas" aria-label="3D 공간. WASD 이동, Shift 달리기, Ctrl 앉기, Space 점프와 물속 상승. 마우스 드래그로 둘러보기. 태블릿, 작업물, 명함, 벤치에 가까이 가서 E키 또는 클릭으로 상호작용하세요." tabIndex={ready&&!loadingVisible?0:-1}/>
    {ready&&!loadingVisible?<>
      <ControlGuide open={controlsOpen} onOpen={()=>setControlsOpen(true)} onClose={closeControls} disabled={Boolean(presentation)}/>
      <QuestPanel totals={totals} projectCount={projectCount} scanIds={questScans} active={!detail&&!presentation&&!controlsOpen} onScanEnd={scanEnded}/>
      {!detail&&!controlsOpen&&!waterActive&&!presentation&&(seated||nearby||(area==='atelier'&&gallery.total>1))?<div className="scene-actions" role="group" aria-label="가까운 소품과 전시">
        {seated?<button className="interaction-prompt" aria-label="자리에서 일어나기 E 또는 Space" onClick={()=>sceneRef.current?.stand()}><kbd>E</kbd><span className="control-caption">일어나기</span></button>:null}
        {!seated&&nearby?<button className="interaction-prompt" aria-label={`${nearbyTitle} E키로 상호작용`} onClick={()=>sceneRef.current?.interact(nearby)}><kbd>E</kbd><span className="control-caption">{nearbySeat?'앉기':'살펴보기'}</span></button>:null}
        {area==='atelier'&&gallery.total>1?<nav className="exhibition-pages" aria-label="작업 전시 페이지"><button disabled={gallery.page===0} onClick={()=>sceneRef.current?.galleryPage(-1)} aria-label="이전 전시 페이지">←</button><span>전시 {gallery.page+1} / {gallery.total} · 전체 {gallery.count}점</span><button disabled={gallery.page===gallery.total-1} onClick={()=>sceneRef.current?.galleryPage(1)} aria-label="다음 전시 페이지">→</button></nav>:null}
      </div>:null}
      {waterActive&&!detail?<div className="water-instructions" role="status"><span><strong>수영장 안</strong>Space 또는 떠오르기를 길게 누르고 가장자리로 이동하면 올라올 수 있어요.</span><button onClick={()=>guide('terrace')} aria-label="물 밖으로"><LogOut size={19}/><span className="control-caption">물 밖으로</span></button></div>:null}
      <footer className="world-controls"><div className="restart-actions"><button className="restart-button" onClick={reset} aria-label="다시 시작" title="다시 시작"><RotateCcw size={19}/><span className="control-caption">다시 시작</span></button><AmbientMusic/></div><nav className="space-navigation" aria-label="공간으로 달려가기">{guideDestinations.map(([target,label,Icon])=><button key={target} className="space-button" data-guide-target={target} onClick={()=>guide(target)} aria-label={label} title={label} aria-pressed={route&&guideTarget===target} disabled={Boolean(presentation)}><Icon size={20}/><span className="control-caption">{label}</span></button>)}</nav></footer>
      <div className="touch-navigation" aria-label="터치 이동">{[[ArrowUp,0,1,'앞으로'],[ArrowLeft,-1,0,'왼쪽으로'],[ArrowDown,0,-1,'뒤로'],[ArrowRight,1,0,'오른쪽으로']].map(([Icon,x,z,label])=><button key={label} aria-label={label} onPointerDown={e=>{e.currentTarget.setPointerCapture(e.pointerId);movement(x,z);}} onPointerUp={()=>movement(0,0)} onPointerCancel={()=>movement(0,0)} onLostPointerCapture={()=>movement(0,0)}><Icon size={20}/></button>)}</div>
      <div className="touch-actions" aria-label="터치 달리기와 점프">{[['run','달리기',Footprints],['crouch','앉기',ChevronsDown],['jump','점프 / 떠오르기',ArrowUp]].map(([action,label,Icon])=><button key={action} aria-label={label} onPointerDown={e=>{e.currentTarget.setPointerCapture(e.pointerId);sceneRef.current?.touchAction(action,true);}} onPointerUp={()=>sceneRef.current?.touchAction(action,false)} onPointerCancel={()=>sceneRef.current?.touchAction(action,false)} onLostPointerCapture={()=>sceneRef.current?.touchAction(action,false)}><Icon size={19}/><span className="control-caption">{action==='jump'?'점프':label}</span></button>)}</div>
    </>:null}
    <WorldCursor canvasRef={canvasRef} targetId={ready&&!loadingVisible?hovered:''} enabled={!detail&&!controlsOpen&&!presentation}/>
    {loadingVisible?<LoadingScreen progress={progress} ready={ready} error={error} onRetry={retryLoading} onExited={exitedLoading} obscured={Boolean(detail)}/>:null}
    {detail&&content?<Detail key={detail} id={detail} content={content} onClose={close} onOpened={opened} closing={closing}/>:null}
    <span className="sr-only" aria-live="polite">현재 공간: {area==='atelier'?'공방':area==='library'?'2층 서재':'수영장 테라스'}. 프로필 {totals.profile}/1, 작업물 {totals.portfolio}/{projectCount}, 연락처 {totals.contact}/1.</span>
  </main>;
}
