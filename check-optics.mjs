import assert from 'node:assert/strict';
import {depthOfField,blurCircle,focusFromSlider,sliderFromFocus,exposureGain,relativeExposureEV,previewGain,diffractionSigma} from './optics.mjs';
for(const distance of [.35,.65,2,7,20])assert.ok(Math.abs(focusFromSlider(sliderFromFocus(distance))-distance)<1e-10);
assert.equal(blurCircle(50,2.8,2,2),0);
const open=depthOfField(50,2.8,2),closed=depthOfField(50,16,2);
assert.ok(closed.near<open.near&&closed.far>open.far);
assert.ok(Math.abs(blurCircle(50,2.8,2,open.near)-.03)<.001);
assert.ok(Math.abs(blurCircle(50,2.8,2,open.far)-.03)<.001);
assert.equal(depthOfField(50,16,20).far,Infinity);
assert.ok(blurCircle(50,2.8,.65,7)>blurCircle(50,16,.65,7));
for(const f of [24,50,70])for(const n of [2.8,5.6,16])for(const s of [.35,.65,2,7,20]){const d=depthOfField(f,n,s);assert.ok(d.near>0&&d.near<=s&&d.far>=s)}
for(const f of [24,50,70])for(const n of [2.8,4,5.6,8,11,16])for(const s of [.35,.65,2,7,20]){
  const d=depthOfField(f,n,s);
  assert.ok(Math.abs(blurCircle(f,n,s,d.near)-.03)<1e-10,'Near boundary matches the sensor blur threshold');
  if(Number.isFinite(d.far))assert.ok(Math.abs(blurCircle(f,n,s,d.far)-.03)<1e-10,'Far boundary matches the sensor blur threshold');
  assert.ok(Math.abs(blurCircle(f,n,s,s))<1e-10,'Focused plane remains sharp at every aperture');
}
assert.ok(Math.abs(blurCircle(50,4,2,7)/blurCircle(50,8,2,7)-2)<1e-10,'Doubling f-number halves blur diameter');
const hyperfocal=depthOfField(50,8,2).hyperfocal;
assert.equal(depthOfField(50,8,hyperfocal+.000001).far,Infinity);
assert.ok(Number.isFinite(depthOfField(50,8,hyperfocal-.000001).far));
console.log('Optics checks passed: focus mapping, exact blur/DOF boundaries, aperture scaling and hyperfocal transition.');

assert.equal(exposureGain(5.6,1/125),1);
assert.equal(exposureGain(2.8,1/125),4);
assert.equal(exposureGain(11.2,1/125),.25);
assert.equal(exposureGain(5.6,1/250),.5);
assert.equal(exposureGain(5.6,1),125);

assert.ok(Math.abs(exposureGain(8,1/125)/exposureGain(4,1/500)-1)<1e-12,'Equivalent exposure pairs agree');
assert.equal(diffractionSigma(16)/diffractionSigma(8),2);

for(const aperture of [2.8,5.6,16])for(const seconds of [1/1000,1/125,1]){
  assert.equal(previewGain(true,aperture),1,'Live View stays readable at all camera settings');
  assert.equal(exposureGain(aperture,seconds),seconds*125*(5.6/aperture)**2,'Capture exposure remains independent of preview gain');
}
assert.equal(previewGain(false,2.8),1);
assert.equal(previewGain(false,5.6),.25,'Optical DOF preview dims when the iris closes');
for(let nd=0;nd<=10;nd++){
  assert.equal(exposureGain(5.6,1/125,nd),2**(-nd),'Each ND stop halves captured light');
  assert.equal(relativeExposureEV(5.6,1/125,nd),nd===0?0:-nd,'ND subtracts exposure stops');
  assert.equal(previewGain(true,16,nd),1,'Normal Live View compensates ND');
  assert.equal(previewGain(false,5.6,nd),.25*2**(-nd),'Optical finder includes ND attenuation');
}
assert.ok(Math.abs(relativeExposureEV(16,1,4))<.1,'One second with f/16 and four-stop ND approaches baseline');
for(const iso of [100,200,400,800,1600,3200,6400]){
  assert.equal(exposureGain(5.6,1/125,0,iso),iso/100,'ISO scales output gain');
  assert.equal(relativeExposureEV(5.6,1/125,0,iso),Math.log2(iso/100),'ISO updates relative EV');
}
assert.equal(exposureGain(5.6,1/250,0,200),exposureGain(5.6,1/125,0,100),'Double ISO compensates half shutter duration');
assert.equal(exposureGain(5.6,1/125,3,800),1,'Three ND stops offset ISO 800 gain');
