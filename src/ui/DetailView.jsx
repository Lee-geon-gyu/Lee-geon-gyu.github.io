import {useEffect,useRef,useState} from 'react';
import {X,ArrowLeft,ArrowRight,UserRound,Layers,GraduationCap,Award,Trophy,FileText,Image as ImageIcon} from 'lucide-react';

const base=import.meta.env.BASE_URL;
const url=path=>`${base}${path}`;
const profileTabs=[['mission-identity','소개',UserRound],['mission-modules','스킬',Layers],['mission-log','학력',GraduationCap],['mission-certification','자격',Award],['mission-achievement','수상',Trophy]];

function preservedHtml(html){
 const doc=new DOMParser().parseFromString(html,'text/html');
 doc.querySelectorAll('[src]').forEach(el=>el.setAttribute('src',url(el.getAttribute('src'))));
 doc.querySelectorAll('a[href="#"]').forEach(el=>{if(el.textContent.includes('010-'))el.href='tel:01087397139';else if(el.textContent.includes('@'))el.href='mailto:gungyu0203@naver.com';});
 return doc.body.innerHTML;
}

function Profile({profile}){
 const [active,setActive]=useState(profileTabs[0][0]);
 return <>
  <div className="profile-lead"><p className="profile-introduction">{profile.introduction}</p><p className="profile-role">{profile.role}</p></div>
  <nav className="profile-tabs" role="tablist" aria-label="프로필 항목">{profileTabs.map(([key,label,Icon],index)=><button key={key} role="tab" id={`profile-tab-${key}`} aria-label={label} aria-selected={active===key} aria-controls={`profile-panel-${key}`} tabIndex={active===key?0:-1} onClick={()=>setActive(key)} onKeyDown={event=>{
   if(!['ArrowLeft','ArrowRight','Home','End'].includes(event.key))return;
   event.preventDefault();const next=event.key==='Home'?0:event.key==='End'?profileTabs.length-1:(index+(event.key==='ArrowRight'?1:-1)+profileTabs.length)%profileTabs.length;
   setActive(profileTabs[next][0]);event.currentTarget.parentElement.children[next].focus();
  }}><Icon size={18}/><span>{label}</span></button>)}</nav>
  <div className="preserved-profile">{profile.sections.map(section=><div key={section.key} id={`profile-panel-${section.key}`} className={`profile-section${active===section.key?' is-active':''}`} role="tabpanel" aria-labelledby={`profile-tab-${section.key}`} dangerouslySetInnerHTML={{__html:preservedHtml(section.originalHtml)}}/>)}</div>
 </>;
}

function Project({project}){
 const [pane,setPane]=useState('intro');
 return <>
  <nav className="project-view-tabs" aria-label="작업물 보기 방식">{[['intro','소개',FileText],['details','정보',Layers],['artwork','디자인',ImageIcon]].map(([key,label,Icon])=><button key={key} aria-label={`작업물 ${label}`} aria-pressed={pane===key} onClick={()=>setPane(key)}><Icon size={17}/><span>{label}</span></button>)}</nav>
  <div id="sec-project-list" className={`legacy-project legacy-project--${pane}`}><div className="project-list-wrapper" dangerouslySetInnerHTML={{__html:preservedHtml(project.originalHtml)}}/></div>
 </>;
}

export function Detail({id,content,onClose,onOpened,closing}){
 const dialogRef=useRef(null),openedRef=useRef(false);
 const profile=id==='profile',contact=id==='contact';
 const [projectIndex,setProjectIndex]=useState(()=>Math.max(0,content.projects.findIndex(p=>p.id===id)));
 const project=content.projects[projectIndex],title=profile?'Profile':contact?'Contact':project?.title;
 const selectProject=index=>{if(index===projectIndex)return;setProjectIndex(index);onOpened(content.projects[index].id);};
 useEffect(()=>{
  if(!title)return;
  const previous=document.activeElement,dialog=dialogRef.current;dialog.showModal();
  const onKey=event=>{
   if(event.key==='Escape'){event.preventDefault();onClose();}
   if(event.key==='Tab'){
    const items=[...dialog.querySelectorAll('button:not(:disabled),a[href],[tabindex="0"]')].filter(el=>el.getClientRects().length&&el.tabIndex>=0),first=items[0],last=items.at(-1);
    if(event.shiftKey&&document.activeElement===first){event.preventDefault();last?.focus();}else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first?.focus();}
   }
  };
  dialog.addEventListener('keydown',onKey);
  if(!openedRef.current){openedRef.current=true;onOpened(profile||contact?id:project.id);}
  return()=>{dialog.removeEventListener('keydown',onKey);dialog.close();if(previous?.isConnected)previous.focus();else document.querySelector('canvas')?.focus();};
 },[id,onClose,onOpened]);
 if(!title)return null;
 return <dialog ref={dialogRef} className={`detail-dialog detail-dialog--${profile?'tablet':contact?'card':'artwork'}${closing?' is-closing':''}`} aria-labelledby="detail-title" onCancel={event=>{event.preventDefault();onClose();}} onClick={event=>{if(event.target===event.currentTarget)onClose();}}>
  <div className="detail-sheet">
   <div className={profile?'tablet-display':'detail-display'}>
   <header className="detail-header"><div><p className="eyebrow">LEE GEON-GYU / AFTERNOON ATELIER</p><h2 id="detail-title">{title}</h2></div>
    {!profile&&!contact?<nav className="project-switcher" aria-label="작업물 선택"><button onClick={()=>selectProject(projectIndex-1)} disabled={projectIndex===0} aria-label="이전 작업물"><ArrowLeft size={17}/></button><span aria-live="polite">{String(projectIndex+1).padStart(2,'0')} / {String(content.projects.length).padStart(2,'0')}</span><button onClick={()=>selectProject(projectIndex+1)} disabled={projectIndex===content.projects.length-1} aria-label="다음 작업물"><ArrowRight size={17}/></button></nav>:null}
    <button className="close-button" onClick={onClose} aria-label="상세 내용 닫기"><X size={22}/></button>
   </header>
   <div className="detail-body">
    {profile?<Profile profile={content.profile}/>:contact?<div className="preserved-contact" dangerouslySetInnerHTML={{__html:preservedHtml(content.contact.originalHtml)}}/>:<Project key={project.id} project={project}/>}
   </div>
   </div>
  </div>
 </dialog>;
}
