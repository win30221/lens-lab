import assert from 'node:assert/strict';
import {sensorFormat,exposureState,focusOffset,stabilizationOffset} from './camera-mechanics.mjs';
assert.equal(sensorFormat.width/sensorFormat.height,3/2);
assert.equal(sensorFormat.previewWidth/sensorFormat.previewHeight,3/2);
assert.equal(sensorFormat.captureWidth/sensorFormat.captureHeight,3/2);
for(const live of [false,true]){
  let recorded=false;
  for(let i=0;i<=1800;i++){
    const s=exposureState(i/1000,live);
    for(const k of ['mirrorLift','firstCover','secondCover'])assert.ok(s[k]>=0&&s[k]<=1);
    if(s.mirrorLift>0&&s.mirrorLift<1)assert.ok(s.firstCover===1||s.secondCover===1,'Curtains protect sensor while mirror moves');
    if(s.record){recorded=true;assert.equal(s.mirrorLift,1);assert.equal(s.firstCover,0);assert.equal(s.secondCover,0);}
  }
  assert.ok(recorded);assert.ok(exposureState(1.8,live).done);
  assert.equal(exposureState(null,live).mirrorLift,live?1:0);
}
assert.ok(focusOffset(50,.65)>focusOffset(50,7));
for(const f of [24,50,70])for(const distance of [.35,.65,2,7,20])assert.ok(focusOffset(f,distance)+.0325<.144,'Focus group clears fixed rear glass');
for(let t=0;t<10;t+=.07){const offset=stabilizationOffset(t,true);assert.equal(offset.x,0);assert.ok(Math.hypot(offset.y,offset.z)<=.026);assert.deepEqual(stabilizationOffset(t,false),{x:0,y:0,z:0});}
console.log('Mechanics checks passed: 3:2 capture, mirror/curtain sequence, protected reset, axial focus and transverse VR.');
