import { useEffect, useRef } from 'react';
import { Gamepad2, Mouse, Navigation, X } from 'lucide-react';

const bindings=[
  {id:'move',keys:['W','A','S','D'],title:'이동',description:'방향키로도 이동할 수 있어요'},
  {id:'run',keys:['Shift'],title:'달리기',description:'누른 채 이동하세요'},
  {id:'crouch',keys:['Ctrl'],title:'앉기',description:'누르고 있는 동안 몸을 낮춰요'},
  {id:'jump',keys:['Space'],title:'점프 / 물속 상승',description:'물속에서는 길게 눌러 떠올라요'},
  {id:'look',title:'시점 돌리기',description:'마우스를 누른 채 드래그하세요'},
  {id:'interact',keys:['E'],title:'상호작용',description:'태블릿·액자·명함을 살펴보거나 벤치에 앉아요'},
  {id:'seat',keys:['E','Space'],title:'벤치에서 일어나기',description:'이동키로도 일어날 수 있어요'},
  {id:'close',keys:['Esc'],title:'닫기 / 취소',description:'상세 화면과 가이드를 닫아요'},
];

function GuideDialog({onClose}) {
  const dialogRef=useRef(null);
  useEffect(()=>{
    const previous=document.activeElement,dialog=dialogRef.current;
    dialog.showModal();
    return()=>{dialog.close();if(previous?.isConnected)previous.focus();};
  },[]);
  return <dialog ref={dialogRef} className="controls-dialog" aria-labelledby="controls-title" onCancel={event=>{event.preventDefault();onClose();}} onClick={event=>{if(event.target===event.currentTarget)onClose();}}>
    <header className="controls-heading"><div><p>CONTROLS</p><h2 id="controls-title">조작 가이드</h2></div><button className="controls-close" onClick={onClose} aria-label="조작 가이드 닫기"><X size={18}/></button></header>
    <ul className="controls-bindings">{bindings.map(({id,keys,title,description})=><li key={id}>
      <div className={`controls-keys controls-keys--${id}`} aria-label={keys?.join(' ')||'마우스 드래그'}>
        {keys?keys.map(key=><kbd key={key}>{key}</kbd>):<><Mouse size={18}/><span>드래그</span></>}
        {id==='interact'?<><span className="controls-or">/</span><Mouse size={18}/></>:null}
      </div><div className="controls-description"><strong>{title}</strong><span>{description}</span></div>
    </li>)}</ul>
    <footer className="controls-tip"><Navigation size={16}/><p>오른쪽 아래 목적지를 누르면 자동으로 달려가요.<br/>휴대폰에서는 화면의 이동·동작 버튼을 사용하세요.</p></footer>
  </dialog>;
}

export function ControlGuide({open,onOpen,onClose,disabled}) {
  return <div className="controls-menu">
    <button className="controls-toggle" onClick={onOpen} disabled={disabled} aria-label="조작 가이드 열기" aria-haspopup="dialog" aria-expanded={open} title="조작 가이드"><Gamepad2 size={19}/><span className="control-caption">조작 가이드</span></button>
    {open?<GuideDialog onClose={onClose}/>:null}
  </div>;
}
