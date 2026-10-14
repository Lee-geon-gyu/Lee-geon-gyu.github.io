export const initialLoadingProgress=()=>({percent:0,phase:'공간을 준비하고 있어요'});

// Percentages describe completed resources and actual setup milestones,
// never elapsed time. Dynamic glTF dependencies cannot make progress recede.
export function advanceLoading(previous,event){
  const stages={assets:92,compile:96,ready:100};
  const completed=Number.isFinite(event.loaded)?Math.max(0,event.loaded):0;
  const total=Number.isFinite(event.total)?Math.max(1,event.total):1;
  const measured=stages[event.stage]??Math.min(90,4+Math.floor(86*Math.min(1,completed/total)));
  return {percent:Math.max(previous.percent,measured),phase:event.phase??previous.phase};
}
