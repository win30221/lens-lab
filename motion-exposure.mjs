export const shutterStops=Object.freeze([
  {seconds:1/1000,label:'1/1000 s'}, {seconds:1/250,label:'1/250 s'},
  {seconds:1/125,label:'1/125 s'}, {seconds:1/60,label:'1/60 s'},
  {seconds:1/15,label:'1/15 s'}, {seconds:1/4,label:'1/4 s'},
  {seconds:1/2,label:'1/2 s'}, {seconds:1,label:'1 s'}
]);
export const rotorAngularSpeed=4.4; // radians per second, independent of frame rate
export function exposureTimes(center,seconds,moving=true){
  if(!Number.isFinite(seconds)||seconds<=0||!Number.isFinite(center))throw new RangeError('Invalid exposure interval');
  const count=moving?Math.max(1,Math.min(96,Math.ceil(seconds*rotorAngularSpeed/.05))):1;
  return Array.from({length:count},(_,i)=>center+seconds*((i+.5)/count-.5));
}
