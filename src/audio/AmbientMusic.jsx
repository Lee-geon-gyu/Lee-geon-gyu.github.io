import { useEffect, useRef, useState } from 'react';
import { Music2, VolumeX } from 'lucide-react';

export function AmbientMusic(){
  const audioRef=useRef(null),wantedRef=useRef(false);
  const [playing,setPlaying]=useState(false),[failed,setFailed]=useState(false);
  const play=()=>{
    const audio=audioRef.current;
    if(!audio.src)audio.src=`${import.meta.env.BASE_URL}assets/afternoon-piano.wav`;
    audio.volume=.28;
    return audio.play().catch(()=>{if(wantedRef.current){wantedRef.current=false;setFailed(true);}});
  };
  useEffect(()=>{
    const audio=audioRef.current;
    const visibility=()=>{if(document.hidden)audio.pause();else if(wantedRef.current)play();};
    document.addEventListener('visibilitychange',visibility);
    return()=>{wantedRef.current=false;document.removeEventListener('visibilitychange',visibility);audio.pause();};
  },[]);
  const toggle=()=>{
    setFailed(false);wantedRef.current=!wantedRef.current;
    if(wantedRef.current)play();else audioRef.current.pause();
  };
  const label=playing?'오후의 피아노 음악 끄기':failed?'오후의 피아노 음악 다시 켜기':'오후의 피아노 음악 켜기';
  return <>
    <audio ref={audioRef} preload="none" loop aria-label="나른한 오후 · 오리지널 피아노 BGM" onPlay={()=>setPlaying(true)} onPause={()=>setPlaying(false)}/>
    <button className={`music-button${playing?' is-playing':''}`} onClick={toggle} aria-label={label} aria-pressed={playing} title={label}>{playing?<Music2 size={19}/>:<VolumeX size={19}/>}<span>BGM</span></button>
  </>;
}
