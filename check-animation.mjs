import assert from 'node:assert/strict';
import {createFrameLoop,demoFrame} from './animation.mjs';
const queue=new Map();let sequence=0,shown=true,frames=0;
const elapsed=[];
const loop=createFrameLoop({visible:()=>shown,request:fn=>{const id=++sequence;queue.set(id,fn);return id},cancel:id=>queue.delete(id),draw:dt=>{
  frames++;elapsed.push(dt);
  // Simulate repeated OrbitControls change notifications during draw.
  if(frames<4){loop.request();loop.request()}
  return frames<4;
}});
function advance(time){assert.equal(queue.size,1);const [id,fn]=queue.entries().next().value;queue.delete(id);fn(time)}
loop.request();loop.request();assert.equal(queue.size,1);
advance(1000);advance(1050);advance(1100);advance(1150);
assert.equal(queue.size,0);assert.deepEqual(elapsed.slice(1),[.05,.05,.05],'Nested requests do not reset animation time');
loop.request();loop.stop();assert.equal(queue.size,0);
shown=false;loop.request();assert.equal(queue.size,0);
shown=true;loop.request();advance(5000);assert.equal(elapsed.at(-1),1/60,'Resume does not jump across hidden time');
assert.ok(Math.abs(demoFrame(0).focus-.65)<1e-9,'Demonstration moves to foreground immediately');
assert.ok(Math.abs(demoFrame(4.2).focus-2)<1e-9);
assert.ok(Math.abs(demoFrame(7.2).focus-7)<1e-9);
assert.equal(demoFrame(28).spread,1);
assert.equal(demoFrame(30).spread,0);
assert.deepEqual(demoFrame(32),demoFrame(0));

assert.equal(demoFrame(9).aperture,2.8);assert.equal(demoFrame(12).aperture,16);assert.ok(Math.abs(demoFrame(15).aperture-2.8)<1e-9);
assert.equal(demoFrame(18).focal,24);assert.equal(demoFrame(22).focal,70);assert.equal(demoFrame(25).focal,24);

console.log('Animation checks passed: frame scheduling, focus, aperture, zoom and assembly demonstration.');

for(const time of [0,1,3,5,7.2,32])assert.equal(demoFrame(time).aperture,5.6,'Opening demonstration keeps a neutral exposure');
