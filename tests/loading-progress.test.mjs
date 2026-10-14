import test from 'node:test';
import assert from 'node:assert/strict';
import {initialLoadingProgress,advanceLoading} from '../src/ui/loadingProgress.js';
import {statSync} from 'node:fs';

test('Only a small house still and sharp alpha mark are needed before the scene',()=>{
  const size=name=>statSync(new URL('../public/assets/loading/'+name,import.meta.url)).size;
  assert.ok(size('house.webp')+size('lee-mark.webp')<400000);
  assert.ok(size('house-mobile.webp')+size('lee-mark.webp')<200000);
});

test('Real resource progress never recedes or reaches 100 before scene readiness',()=>{
  let p=initialLoadingProgress();assert.equal(p.percent,0);
  for(const e of [{loaded:1,total:5},{loaded:2,total:12},{loaded:8,total:12},{loaded:12,total:12},{stage:'assets'},{stage:'compile'}]){
    const next=advanceLoading(p,e);assert.ok(next.percent>=p.percent);assert.ok(next.percent<100);p=next;
  }
  p=advanceLoading(p,{stage:'ready'});assert.equal(p.percent,100);
  assert.equal(initialLoadingProgress().percent,0,'a retry starts a new attempt');
  for(const e of [{loaded:Infinity,total:0},{loaded:-2,total:NaN},{loaded:999,total:2}])assert.ok(advanceLoading(initialLoadingProgress(),e).percent<=90);
});
