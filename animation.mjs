// A request made during a frame is coalesced, never allowed to reset its clock
// or create a second RAF chain (OrbitControls emits change while rendering).
export function createFrameLoop({draw,visible,request,cancel}){
  let handle=null,running=false,again=false,last=null;
  function schedule(){
    if(!visible())return;
    if(running){again=true;return}
    if(handle===null)handle=request(frame);
  }
  function frame(now){
    handle=null;if(!visible()){last=null;return}
    const elapsed=last===null?1/60:Math.min(Math.max(0,(now-last)/1000),.1);last=now;
    running=true;again=false;let keepGoing=false;
    try{keepGoing=draw(elapsed)}finally{running=false}
    if(keepGoing||again)schedule();else last=null;
  }
  return {request:schedule,stop(){if(handle!==null)cancel(handle);handle=null;last=null;again=false}};
}

export function demoFrame(seconds){
  const keys=[
    {t:0,f:.65,e:0,a:5.6,z:24},{t:1.2,f:.65,e:0,a:5.6,z:24},
    {t:4.2,f:2,e:0,a:5.6,z:24},{t:7.2,f:7,e:0,a:5.6,z:24},
    {t:9,f:2,e:0,a:2.8,z:50},{t:12,f:2,e:0,a:16,z:50},
    {t:15,f:2,e:0,a:2.8,z:50},{t:18,f:2,e:0,a:5.6,z:24},
    {t:22,f:2,e:0,a:5.6,z:70},{t:25,f:2,e:0,a:5.6,z:24},
    {t:28,f:2,e:1,a:5.6,z:24},{t:30,f:2,e:0,a:5.6,z:24},
    {t:32,f:.65,e:0,a:5.6,z:24}];
  const t=((seconds%32)+32)%32;let i=0;
  while(i<keys.length-2&&t>keys[i+1].t)i++;
  const a=keys[i],b=keys[i+1],v=(t-a.t)/(b.t-a.t),u=v*v*(3-2*v);
  const stage=t<1.2?'前景樹木':t<4.2?'移焦到小屋':t<7.2?'移焦到遠山':t<9?'小屋景深比較':t<12?'縮小光圈 · 擴大景深':t<15?'開大光圈 · 背景柔化':t<18?'24 mm · 廣角全景':t<22?'70 mm · 拉近小屋':t<25?'返回廣角':t<28?'展開鏡組':t<30?'組裝鏡頭':'返回前景';
  return {focus:Math.exp(Math.log(a.f)*(1-u)+Math.log(b.f)*u),spread:a.e+(b.e-a.e)*u,aperture:a.a+(b.a-a.a)*u,focal:a.z+(b.z-a.z)*u,stage};
}
