import { useState } from 'react';
import { Check, Plus, Minus, MoreHorizontal } from 'lucide-react';

const quests=[
  ['profile','프로필 살펴보기','왼쪽 방의 프로필 태블릿',1],
  ['portfolio','작업물 둘러보기','오른쪽 방의 작업 전시',0],
  ['contact','연락처 확인하기','2층 책상 위의 명함',1],
];

export function QuestPanel({totals,projectCount,scanIds,active,onScanEnd}) {
  const [collapsed,setCollapsed]=useState(false);
  const finished=quests.filter(([id,,,total])=>totals[id]===(id==='portfolio'?projectCount:total)&&(id!=='portfolio'||projectCount>0)).length;
  return <aside className={`quest-panel${collapsed?' is-collapsed':''}`} aria-label="포트폴리오 둘러보기 진행">
    <header className="quest-heading">
      <h2>둘러보기</h2>
      <span className="quest-summary" aria-label={`둘러보기 완료 ${finished}/3`}>{finished}/3</span>
      <button aria-label={collapsed?'둘러보기 펼치기':'둘러보기 접기'} aria-expanded={!collapsed} aria-controls="exploration-list" onClick={()=>setCollapsed(value=>!value)}>{collapsed?<Plus size={14}/>:<Minus size={14}/>}</button>
    </header>
    <div className="quest-fold" id="exploration-list" aria-hidden={collapsed} inert={collapsed?true:undefined}><div className="quest-fold__content"><ul className="quest-list">{quests.map(([id,title,label,total])=>{
      const max=id==='portfolio'?projectCount:total,done=max>0&&totals[id]===max;
      return <li key={id} data-quest-id={id} className={`quest-row${done?' is-complete':''}${active&&scanIds.includes(id)?' is-scanning':''}`} onAnimationEnd={event=>{if(event.animationName==='quest-scan')onScanEnd(id);}}>
        <span className="quest-mark" aria-hidden="true">
          <span className="quest-glyph"><MoreHorizontal size={13} strokeWidth={2}/></span>
          <span className="quest-check"><Check size={12} strokeWidth={2}/></span>
        </span>
        <div className="quest-copy">
          <strong>{title}</strong>
          <output aria-label={`${title} ${totals[id]}/${max}${done?' 완료':''}`}>
            <span className="quest-count">{done?'완료':`${totals[id]}/${max}`}</span>
            {' '}<span className="quest-objective">{label}</span>
          </output>
        </div>
      </li>;
    })}</ul></div></div>
  </aside>;
}
