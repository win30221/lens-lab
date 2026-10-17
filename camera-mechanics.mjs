export const sensorFormat=Object.freeze({width:36,height:24,aspect:3/2,previewWidth:600,previewHeight:400,captureWidth:1500,captureHeight:1000});
const clamp=value=>Math.max(0,Math.min(1,value));
export const focusOffset=(focal,distance)=>Math.min(.09,focal*focal/(distance*1000-focal)*.025);
export const stabilizationOffset=(time,enabled)=>({x:0,y:enabled?-.025*Math.sin(time*3.2):0,z:enabled?-.025*Math.cos(time*3.2):0});
// Slowed down for observation: curtains protect the sensor while the mirror
// moves. A single exposure is recorded only after the first curtain clears.
export function exposureState(time,liveView){
  if(time===null)return {mirrorLift:liveView?1:0,firstCover:liveView?0:1,secondCover:0,record:false,done:false,phase:liveView?'Live View：反光鏡升起，感光元件取景':'光學取景：反光鏡放下，快門關閉'};
  if(time<.18)return {mirrorLift:liveView?1:0,firstCover:liveView?clamp(time/.18):1,secondCover:0,record:false,done:false,phase:'快門預備'};
  if(time<.42)return {mirrorLift:liveView?1:clamp((time-.18)/.24),firstCover:1,secondCover:0,record:false,done:false,phase:'反光鏡升起'};
  if(time<.72)return {mirrorLift:1,firstCover:1-clamp((time-.42)/.3),secondCover:0,record:false,done:false,phase:'先幕開啟'};
  if(time<.9)return {mirrorLift:1,firstCover:0,secondCover:0,record:true,done:false,phase:'感光元件曝光'};
  if(time<1.15)return {mirrorLift:1,firstCover:0,secondCover:clamp((time-.9)/.25),record:false,done:false,phase:'後幕關閉'};
  if(time<1.45)return {mirrorLift:liveView?1:1-clamp((time-1.15)/.3),firstCover:1,secondCover:1,record:false,done:false,phase:'快門復位'};
  if(time<1.7)return {mirrorLift:liveView?1:0,firstCover:liveView?1-clamp((time-1.45)/.25):1,secondCover:0,record:false,done:false,phase:'恢復取景'};
  return {...exposureState(null,liveView),done:true};
}
