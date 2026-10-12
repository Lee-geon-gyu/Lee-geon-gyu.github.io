import { useCallback, useEffect, useRef, useState } from 'react';
import { RotateCcw, Mouse, X, ExternalLink, Check, ArrowUp, ArrowDown, ArrowLeft, ArrowRight } from 'lucide-react';
import { complete, counts } from './state/session.js';
import { AmbientMusic } from './audio/AmbientMusic.jsx';
const base=import.meta.env.BASE_URL;
const url=path=>`${base}${path}`;
function Project({project,index}) {
  return <article className="project-detail" id={`detail-${project.id}`}>
    <div className="project-detail__intro">
      <p className="eyebrow">{String(index+1).padStart(2,'0')} / {project.category}</p><p className="project-type">{project.categoryKorean}</p>
      <img className="project-logo" src={url(project.logo)} alt={project.title} decoding="async"/><h3>{project.tagline}</h3><p className="project-description">{project.description}</p>
      <dl className="project-metadata">{project.metadata.map(item=><div key={item.label}><dt>{item.label}</dt><dd>{item.value}</dd></div>)}</dl>
      <div className="project-links">{project.links.map(link=><a key={link.href} href={link.href} target="_blank" rel="noopener noreferrer">{link.label}<ExternalLink size={16}/></a>)}</div>
    </div><img className="project-artwork" src={url(project.representativeImage)} alt={`${project.title} 프로젝트 디자인 전체 이미지`} loading="lazy" decoding="async"/>
  </article>;
}
function preservedHtml(html) {
  const doc=new DOMParser().parseFromString(html,'text/html');
  doc.querySelectorAll('[src]').forEach(el=>el.setAttribute('src',url(el.getAttribute('src'))));
  doc.querySelectorAll('a[href="#"]').forEach(el=>{if(el.textContent.includes('010-'))el.href='tel:01087397139';else if(el.textContent.includes('@'))el.href='mailto:gungyu0203@naver.com';});
  return doc.body.innerHTML;
}
function Detail({id,content,onClose,onOpened,closing}) {
  const dialogRef=useRef(null),openedRef=useRef(false);
  const portfolio=id==='portfolio',profile=id==='profile',contact=id==='contact',project=content.projects.find(p=>p.id===id);
  const title=profile?'Profile':contact?'Contact':portfolio?'Portfolio':project?.title;
  useEffect(()=>{
    if(!title)return;
    const previous=document.activeElement,dialog=dialogRef.current;dialog.showModal();
    const onKey=e=>{
      if(e.key==='Escape'){e.preventDefault();onClose();}
      if(e.key==='Tab'){
        const items=[...dialog.querySelectorAll('button,a[href],input,[tabindex="0"]')],first=items[0],last=items.at(-1);
        if(e.shiftKey&&document.activeElement===first){e.preventDefault();last?.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first?.focus();}
      }
    };
    dialog.addEventListener('keydown',onKey);if(!openedRef.current){openedRef.current=true;onOpened(id);}
    return()=>{dialog.removeEventListener('keydown',onKey);dialog.close();if(previous?.isConnected)previous.focus();else document.querySelector(`.direct-navigation button[data-content-id="${id}"]`)?.focus();};
  },[id,onClose,onOpened,title]);
  if(!title)return null;
  return <dialog ref={dialogRef} className={`detail-dialog detail-dialog--${profile?'book':contact?'card':'artwork'} ${closing?'is-closing':''}`} aria-labelledby="detail-title" onCancel={e=>{e.preventDefault();onClose();}} onClick={e=>{if(e.target===e.currentTarget)onClose();}}>
    <div className="detail-sheet"><header className="detail-header"><div><p className="eyebrow">LEE GEON-GYU / AFTERNOON ATELIER</p><h2 id="detail-title">{title}</h2></div><button className="close-button" onClick={onClose} aria-label="상세 내용 닫기"><X size={23}/></button></header>
      <div className="detail-body">
        {profile?<><p className="profile-introduction">{content.profile.introduction}</p><p className="profile-role">{content.profile.role}</p><div className="preserved-profile">{content.profile.sections.map(section=><div key={section.key} dangerouslySetInnerHTML={{__html:preservedHtml(section.originalHtml)}}/>)}</div></>:null}
        {contact?<div className="preserved-contact" dangerouslySetInnerHTML={{__html:preservedHtml(content.contact.originalHtml)}}/>:null}
        {portfolio?<><p className="portfolio-introduction">사용자의 경험을 고민하고, 화면에 담아낸 {content.projects.length}가지 작업.</p><nav className="project-index" aria-label="프로젝트 바로 보기">{content.projects.map((p,i)=><a key={p.id} href={`#detail-${p.id}`}>{String(i+1).padStart(2,'0')} {p.title}</a>)}</nav>{content.projects.map((p,i)=><Project key={p.id} project={p} index={i}/>)}</>:null}
        {project?<Project project={project} index={content.projects.indexOf(project)}/>:null}
      </div>
    </div>
  </dialog>;
}
function Loading({progress,error,onRetry,onContent,hasContent}) {
  return <div className="loading-screen" role="status" aria-live="polite"><div className="loading-content">
    <p className="eyebrow">LEE GEON-GYU / PORTFOLIO</p><h1>잠시, 오후의 공간으로.</h1><p>{error?'공간을 불러오는 중 문제가 생겼어요.':progress.phase}</p>
    {!error?<><progress value={progress.loaded} max={Math.max(progress.total,1)} aria-label="3D 공간 불러오기"/><span className="loading-caption">공방과 수영장, 2층 서재를 함께 준비하고 있어요.</span></>:<><p className="load-error">{error}</p><button onClick={onRetry}>다시 불러오기</button></>}
    {hasContent?<><p className="loading-shortcut-label">먼저 내용을 살펴보세요</p><nav aria-label="콘텐츠 바로 보기">{['profile','portfolio','contact'].map(id=><button key={id} data-content-id={id} onClick={()=>onContent(id)}>{id[0].toUpperCase()+id.slice(1)}</button>)}</nav></>:null}
  </div><span className="loading-footer">UI/UX DESIGN & WEB PUBLISHING</span></div>;
}
const questRows=[['profile','Profile','왼쪽 방의 프로필 책',1],['portfolio','Portfolio','오른쪽 방의 작업 전시',0],['contact','Contact','2층 책상 위의 명함',1]];
export function App(){
  const canvasRef=useRef(null),sceneRef=useRef(null),openRef=useRef(null),closeTimer=useRef(null),closingRef=useRef(false),sessionRef=useRef({viewed:new Set(),paused:false});
  const [content,setContent]=useState(null),[viewed,setViewed]=useState(()=>new Set()),[detail,setDetail]=useState(null);
  const [area,setArea]=useState('atelier'),[route,setRoute]=useState(false),[hint,setHint]=useState(''),[hover,setHover]=useState('');
  const [waterActive,setWaterActive]=useState(false);
  const [nearby,setNearby]=useState(''),[presentation,setPresentation]=useState(''),[closing,setClosing]=useState(false),[gallery,setGallery]=useState({page:0,total:1,count:0});
  const [ready,setReady]=useState(false),[error,setError]=useState(''),[retry,setRetry]=useState(0),[progress,setProgress]=useState({loaded:0,total:1,phase:'포트폴리오를 준비하고 있어요'});
  const open=useCallback(id=>{if(content){sceneRef.current?.pause(true);setDetail(id);}},[content]);openRef.current=open;
  const close=useCallback(()=>{if(closingRef.current)return;closingRef.current=true;setClosing(true);sceneRef.current?.closeContent();closeTimer.current=setTimeout(()=>{setDetail(null);setClosing(false);closingRef.current=false;sceneRef.current?.pause(false);},240);},[]);
  useEffect(()=>()=>clearTimeout(closeTimer.current),[]);
  const opened=useCallback(id=>setViewed(previous=>complete(previous,id,content.projects)),[content]);
  const shortcut=id=>{if(!sceneRef.current?.interact(id))open(id);};
  useEffect(()=>{
    const controller=new AbortController();fetch(url('portfolio-content.json'),{signal:controller.signal}).then(response=>{if(!response.ok)throw new Error('콘텐츠 파일을 읽지 못했어요.');return response.json();}).then(setContent).catch(e=>{if(e.name!=='AbortError')setError(e.message);});return()=>controller.abort();
  },[retry]);
  useEffect(()=>{
    if(!content)return;
    const controller=new AbortController();setReady(false);setError('');
    import('./scene/createScene.js').then(({createScene})=>{if(controller.signal.aborted)return null;return createScene(canvasRef.current,content,{onProgress:setProgress,onError:message=>{setReady(false);setError(message);},onArea:setArea,onWater:setWaterActive,onRoute:setRoute,onHint:setHint,onHover:setHover,onNearby:setNearby,onPresentation:setPresentation,onGallery:setGallery,onOpen:id=>openRef.current(id)},controller.signal);}).then(scene=>{if(scene&&!controller.signal.aborted){sceneRef.current=scene;scene.setViewed(sessionRef.current.viewed);scene.pause(sessionRef.current.paused);setReady(true);}}).catch(e=>{if(!controller.signal.aborted){console.error(e);setError(e.message||'WebGL을 시작하지 못했어요.');}});
    return()=>{controller.abort();sceneRef.current=null;};
  },[content,retry]);
  useEffect(()=>{sessionRef.current.viewed=viewed;sceneRef.current?.setViewed(viewed);},[viewed,ready]);
  useEffect(()=>{sessionRef.current.paused=Boolean(detail);sceneRef.current?.pause(Boolean(detail));},[detail,ready]);
  const reset=()=>{clearTimeout(closeTimer.current);closingRef.current=false;setClosing(false);setDetail(null);setViewed(new Set());sceneRef.current?.setViewed(new Set());sceneRef.current?.reset();setHint('');setHover('');setNearby('');setPresentation('');setWaterActive(false);};
  const totals=counts(viewed,content?.projects??[]),movement=(x,z)=>sceneRef.current?.touch(x,z),projectCount=content?.projects.length??0;
  const nearbyTitle=nearby==='profile'?'책상 위의 프로필 책':nearby==='contact'?'책상 위의 명함':content?.projects.find(p=>p.id===nearby)?.title;
  const placeText=hint==='up'?'계단을 따라 올라가면 명함이 있는 2층 서재예요.':hint==='down'?'계단을 따라 1층 테라스로 내려갈 수 있어요.':hint==='in'?'왼쪽 방에는 프로필 책, 오른쪽 방에는 작업물이 있어요.':hint==='out'?'문을 지나 수영장 테라스로 나가 보세요.':area==='library'?'책상 위의 명함에 가까이 다가가 보세요.':area==='gallery'?'책상 위의 책에서 제 이야기를 만나 보세요.':area==='atelier'?'오른쪽 방의 액자에 가까이 다가가 작업물을 살펴보세요.':'왼쪽 방의 책과 오른쪽 방의 작업물, 2층의 명함을 만나 보세요.';
  return <main className={`portfolio-world ${presentation?'is-presenting':''}`} aria-label="오후의 공방과 수영장 테라스 포트폴리오">
    <canvas ref={canvasRef} className="world-canvas" aria-label="3D 공간. WASD 이동, Shift 달리기, Ctrl 앉기, Space 점프와 물속 상승. 마우스 드래그로 둘러보기. 책, 작업물, 명함에 가까이 가서 E키 또는 클릭으로 상호작용하세요." tabIndex={0}/>
    {ready?<>
      <nav className="direct-navigation" aria-label="포트폴리오 바로 보기">{['profile','portfolio','contact'].map(id=><button key={id} data-content-id={id} onClick={()=>shortcut(id)} disabled={Boolean(presentation)}>{id[0].toUpperCase()+id.slice(1)}</button>)}</nav>
      <aside className="quest-panel" aria-label="둘러보기 진행 상황"><h2>둘러보기</h2>{questRows.map(([id,title,label,total])=>{const max=id==='portfolio'?projectCount:total;return <div className={`quest-row ${totals[id]===max?'is-complete':''}`} key={id}><span className="quest-mark" aria-hidden="true">{totals[id]===max?<Check size={17}/>:null}</span><div><strong>{title}</strong><span>{label}</span></div><output aria-label={`${title} ${totals[id]}/${max}`}>{totals[id]}/{max}</output></div>;})}</aside>
      {!detail&&!waterActive?<section className={`scene-message ${nearby?'has-interaction':''}`} aria-label="공간 안내" aria-live="polite"><span className="message-avatar" aria-hidden="true">A</span><div className="message-copy"><strong>{presentation?presentation==='book'?'책을 펼치고 있어요':presentation==='card'?'명함을 들어 보고 있어요':'작업물을 살펴보고 있어요':nearbyTitle||'Afternoon Atelier'}</strong><p>{presentation?'잠시 후 내용을 읽을 수 있어요 · Esc 취소':route?'통로를 따라 이동 중 · WASD 또는 드래그로 직접 둘러보기':nearby?'E 버튼을 눌러서 상호작용 하세요':placeText}</p>{nearby?<small>소품을 클릭하거나 오른쪽 E 버튼을 눌러도 열려요.</small>:null}{area==='atelier'&&gallery.total>1&&!presentation?<nav className="exhibition-pages" aria-label="작업 전시 페이지"><button disabled={gallery.page===0} onClick={()=>sceneRef.current?.galleryPage(-1)} aria-label="이전 전시 페이지">←</button><span>전시 {gallery.page+1} / {gallery.total} · 전체 {gallery.count}점</span><button disabled={gallery.page===gallery.total-1} onClick={()=>sceneRef.current?.galleryPage(1)} aria-label="다음 전시 페이지">→</button></nav>:null}</div>{nearby&&!presentation?<button className="interact-button" aria-label={`${nearbyTitle} E키로 상호작용`} onClick={()=>sceneRef.current?.interact(nearby)}><kbd>E</kbd><span>보기</span></button>:null}</section>:null}
      {waterActive&&!detail?<div className="water-instructions" role="status"><span><strong>수영장 안</strong>Space 또는 떠오르기를 길게 누르고 가장자리로 이동하면 올라올 수 있어요.</span><button onClick={()=>sceneRef.current?.guide('terrace')} disabled={route}>물 밖으로</button></div>:null}
      <footer className="world-controls"><div className="restart-actions"><button className="restart-button" onClick={reset}><RotateCcw size={20}/>다시 시작</button><AmbientMusic/></div><div className="control-legend"><span className="movement-legend"><span className="key-group">{'WASD'.split('').map(key=><kbd key={key}>{key}</kbd>)}</span>이동</span><span className="keyboard-motion"><kbd>Shift</kbd>달리기</span><span className="keyboard-motion"><kbd>Ctrl</kbd>앉기</span><span className="keyboard-motion"><kbd>Space</kbd>점프·물속 상승</span><span><Mouse size={23}/>드래그로 시점</span><span><kbd>E</kbd>상호작용 · 클릭</span><span><kbd>ESC</kbd>닫기</span></div><div className="space-navigation"><button className="space-button" onClick={()=>sceneRef.current?.guide('gallery')} disabled={route}>프로필 책</button><button className="space-button" onClick={()=>sceneRef.current?.guide('atelier')} disabled={route}>작업 전시</button>{area==='terrace'?<button className="space-button" onClick={()=>sceneRef.current?.guide('library')} disabled={route}>2층 서재</button>:null}<button className="space-button" onClick={()=>sceneRef.current?.guide()} disabled={route}>{area==='atelier'?'다음 공간':area==='library'?'1층 테라스':'이전 공간'}</button></div></footer>
      <div className="touch-navigation" aria-label="터치 이동">{[[ArrowUp,0,1,'앞으로'],[ArrowLeft,-1,0,'왼쪽으로'],[ArrowDown,0,-1,'뒤로'],[ArrowRight,1,0,'오른쪽으로']].map(([Icon,x,z,label])=><button key={label} aria-label={label} onPointerDown={e=>{e.currentTarget.setPointerCapture(e.pointerId);movement(x,z);}} onPointerUp={()=>movement(0,0)} onPointerCancel={()=>movement(0,0)} onLostPointerCapture={()=>movement(0,0)}><Icon size={20}/></button>)}</div>
      <div className="touch-actions" aria-label="터치 달리기와 점프">{[['run','달리기'],['crouch','앉기'],['jump','점프 / 떠오르기']].map(([action,label])=><button key={action} aria-label={label} onPointerDown={e=>{e.currentTarget.setPointerCapture(e.pointerId);sceneRef.current?.touchAction(action,true);}} onPointerUp={()=>sceneRef.current?.touchAction(action,false)} onPointerCancel={()=>sceneRef.current?.touchAction(action,false)} onLostPointerCapture={()=>sceneRef.current?.touchAction(action,false)}>{label}</button>)}</div>
    </>:null}
    {!ready?<Loading progress={progress} error={error} onRetry={()=>{setError('');setRetry(value=>value+1);}} onContent={open} hasContent={Boolean(content)}/>:null}
    {detail&&content?<Detail key={detail} id={detail} content={content} onClose={close} onOpened={opened} closing={closing}/>:null}
    <span className="sr-only" aria-live="polite">현재 공간: {area==='atelier'?'공방':area==='library'?'2층 서재':'수영장 테라스'}. 프로필 {totals.profile}/1, 작업물 {totals.portfolio}/{projectCount}, 연락처 {totals.contact}/1.</span>
  </main>;
}
