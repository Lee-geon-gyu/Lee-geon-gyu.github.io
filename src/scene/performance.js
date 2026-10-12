// Keep native desktop pixels and sharp high-DPI phones. Only supersampling
// and very large displays are bounded; transient load never blurs a 1080p view.
export function renderScale(width,height,dpr=1){
  return Math.min(dpr,2,Math.sqrt(3686400/(width*height)));
}

export function createPerformanceMeter(renderer,canvas){
  const gl=renderer.getContext(),extension=gl.getExtension('EXT_disjoint_timer_query_webgl2');
  const pending=[],gpu=[],frames=[];let active=null,lastPublish=0,readyMs=0,assetMs=0,compileMs=0,resourceBytes=0,frame=0;
  const percentile=(samples,p)=>samples.length?+([...samples].sort((a,b)=>a-b)[Math.min(samples.length-1,Math.floor(samples.length*p))]).toFixed(2):null;
  const append=(samples,value)=>{samples.push(value);if(samples.length>120)samples.shift();};
  return {
    ready(stages){({readyMs,assetMs,compileMs}=stages);resourceBytes=performance.getEntriesByType('resource').reduce((sum,entry)=>sum+entry.encodedBodySize,0);},
    begin(){
      frame++;if(!extension||frame%7||pending.length>=4)return;
      active=gl.createQuery();gl.beginQuery(extension.TIME_ELAPSED_EXT,active);
    },
    end(delta,quality,pose={}){
      if(active){gl.endQuery(extension.TIME_ELAPSED_EXT);pending.push(active);active=null;}
      const poll=extension&&pending.length&&frame%7===0;
      const disjoint=poll&&gl.getParameter(extension.GPU_DISJOINT_EXT);
      while(poll&&pending.length&&gl.getQueryParameter(pending[0],gl.QUERY_RESULT_AVAILABLE)){
        const query=pending.shift(),ns=gl.getQueryParameter(query,gl.QUERY_RESULT);gl.deleteQuery(query);
        if(!disjoint)append(gpu,ns/1e6);
      }
      if(document.hasFocus()&&!document.hidden&&delta>0&&delta<.25)append(frames,delta*1000);
      if(performance.now()-lastPublish<500)return null;lastPublish=performance.now();
      const buffer=renderer.getDrawingBufferSize({set(x,y){this.x=x;this.y=y;return this;},floor(){return this;}});
      const snapshot={readyMs:Math.round(readyMs),assetMs:Math.round(assetMs),compileMs:Math.round(compileMs),gpuMs:percentile(gpu,.5),gpuP95:percentile(gpu,.95),frameMs:percentile(frames,.5),frameP95:percentile(frames,.95),samples:gpu.length,focused:document.hasFocus(),hidden:document.hidden,triangles:renderer.info.render.triangles,drawCalls:renderer.info.render.calls,buffer:[Math.floor(buffer.x),Math.floor(buffer.y)],quality};
      canvas.dataset.performance=JSON.stringify({...snapshot,resourceBytes,...pose});return snapshot;
    },
    resetSamples(){gpu.length=0;frames.length=0;},
    dispose(){for(const query of pending)gl.deleteQuery(query);},
  };
}
