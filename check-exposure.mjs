import assert from 'node:assert/strict';
import {exposureTimes,shutterStops,rotorAngularSpeed} from './motion-exposure.mjs';
for(const {seconds} of shutterStops){
  const times=exposureTimes(10,seconds);
  assert.ok(times.every(t=>t>10-seconds/2&&t<10+seconds/2),'Samples belong to the selected exposure interval');
  assert.ok(Math.abs(times.reduce((a,b)=>a+b,0)/times.length-10)<1e-10,'No time bias');
  assert.deepEqual(exposureTimes(10,seconds,false),[10],'Paused subjects produce no motion trail');
}
assert.equal(exposureTimes(0,1/1000).length,1);
const slow=exposureTimes(0,1/4);
assert.ok((slow.at(-1)-slow[0])*rotorAngularSpeed>1,'Quarter-second exposure spans more than one radian of rotor motion');
assert.ok(slow.length>20,'Slow exposure has enough temporal samples for continuous sails');
assert.throws(()=>exposureTimes(0,0),RangeError);
console.log('Exposure checks passed: shutter duration, temporal centering, frozen subjects, slow-shutter integration.');
