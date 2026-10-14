import test from 'node:test';
import assert from 'node:assert/strict';
import {CursorMotion,cursorFrames} from '../src/ui/cursorMotion.js';
test('Hover and press preserve continuous radius and velocity instead of changing shape abruptly',()=>{
 const c=new CursorMotion();const before=c.radius;c.step(0,0,'hover');assert.equal(c.radius,before);
 c.step(1/60,.016,'hover');assert.ok(c.radius>before&&c.radius<before+.2);
 for(let i=0;i<45;i++)c.step(1/60,i/60,'hover');assert.ok(Math.abs(c.radius-12.5)<.04);
 const hover=c.radius;c.step(1/60,1,'pressed');assert.ok(c.radius>hover-.25);
 for(let i=0;i<60;i++)c.step(1/60,i/60,'pressed');assert.ok(Math.abs(c.radius-8.5)<.02);
 const held=c.radius;c.step(1/60,2,'hover');assert.ok(c.radius<held+.25);
});
test('Idle breath stays subtle and reduced motion holds a steady precision cursor',()=>{
 const c=new CursorMotion(),r=[];for(let i=0;i<600;i++){const frame=c.step(1/60,i/60,'idle');r.push(c.radius);assert.ok(frame>=0&&frame<cursorFrames.length);}
 assert.ok(Math.max(...r)-Math.min(...r)>.3);assert.ok(Math.max(...r)-Math.min(...r)<.7);
 for(let i=0;i<100;i++){c.step(.1,i,'idle',true);assert.equal(c.radius,10.5);assert.equal(c.velocity,0);}
 c.step(.1,0,'pressed',true);assert.equal(c.radius,8.5);
});
test('Rapid reversals and a delayed frame remain bounded and return to the hover size',()=>{
 const c=new CursorMotion();for(let i=0;i<500;i++){c.step(i%11===0?1:1/60,i/60,i%2?'pressed':'hover');assert.ok(c.radius>=8.5&&c.radius<=13);}
 for(let i=0;i<180;i++)c.step(1/60,i/60,'hover');assert.ok(Math.abs(c.radius-12.5)<.001);
});
