import assert from 'node:assert/strict';
import {depthOfField,blurCircle,focusFromSlider,sliderFromFocus} from './optics.mjs';
for(const distance of [.35,.65,2,7,20])assert.ok(Math.abs(focusFromSlider(sliderFromFocus(distance))-distance)<1e-10);
assert.equal(blurCircle(50,2.8,2,2),0);
const open=depthOfField(50,2.8,2),closed=depthOfField(50,16,2);
assert.ok(closed.near<open.near&&closed.far>open.far);
assert.ok(Math.abs(blurCircle(50,2.8,2,open.near)-.03)<.001);
assert.ok(Math.abs(blurCircle(50,2.8,2,open.far)-.03)<.001);
assert.equal(depthOfField(50,16,20).far,Infinity);
assert.ok(blurCircle(50,2.8,.65,7)>blurCircle(50,16,.65,7));
for(const f of [24,50,70])for(const n of [2.8,5.6,16])for(const s of [.35,.65,2,7,20]){const d=depthOfField(f,n,s);assert.ok(d.near>0&&d.near<=s&&d.far>=s)}
console.log('Optics checks passed: focus mapping, focal-plane blur, aperture/DOF relation, near/far limits, infinity.');
