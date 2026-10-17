(()=>{
  'use strict';
  const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
  const {P,F,parts,motions,W,H}=MODEL, scene=$('#scene'),svg=scene.querySelector('svg'),assembly=$('#assembly');
  const nodes=[...assembly.children],reduced=matchMedia('(prefers-reduced-motion: reduce)');
  const stops=[2.8,4,5.6,8,11,16],fNumber=()=>stops[Number($('#aperture').value)];
  let selected=6,mode='explode',target=1,share=.75,zoom=1,targetZoom=1,frame=0,last=0,visible=true;
  let tour=false,tourTimer=0,tourStart=0,userInteracted=false,stabilizing=false,stabilizeStart=0,ordered='',preview=-1;
  const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
  const camera=()=>{const a=P.azimuth*Math.PI/180,e=P.elevation*Math.PI/180;return {sinA:Math.sin(a),cosA:Math.cos(a),sinE:Math.sin(e),cosE:Math.cos(e),k:P.scale*Math.sqrt(1.6)}};
  const C=camera();
  function project(p){const [x,y,z]=p;return[P.origin[0]+(x*C.sinA-y*C.cosA)*C.k,P.origin[1]+((x*C.cosA+y*C.sinA)*C.sinE-z*C.cosE)*C.k]}
  const vector=p=>{const q=project(p);return[q[0]-P.origin[0],q[1]-P.origin[1]]};
  const depth=p=>(p[0]*C.cosA+p[1]*C.sinA)*C.cosE+p[2]*C.sinE;
  const world=(s,u,v)=>F.o.map((x,i)=>x+F.a[i]*s+F.u[i]*u+F.v[i]*v);
  const path=points=>points.map((p,i)=>(i?'L':'M')+project(p).map(x=>x.toFixed(2)).join(' ')).join('')+'Z';
  function announce(text){$('#announcement').textContent=text}
  function highlight(index){preview=index;scene.dataset.focus='';for(const node of nodes)node.toggleAttribute('data-on',node.dataset.piece===parts[index].id)}
  function mini(){
    const ns='http://www.w3.org/2000/svg',art=document.createElementNS(ns,'svg'),g=document.createElementNS(ns,'g');
    for(const node of nodes.filter(n=>n.dataset.piece===parts[selected].id)){const c=node.cloneNode(true);c.removeAttribute('transform');c.setAttribute('data-on','');c.removeAttribute('data-piece');g.append(c)}
    art.append(g);$('#mini-art').replaceChildren(art);const b=g.getBBox();art.setAttribute('viewBox',[b.x-10,b.y-8,b.width+20,b.height+16].join(' '));
  }
  function select(index,{speak=true,scroll=false}={}){
    selected=(index+parts.length)%parts.length;const part=parts[selected],num=String(selected+1).padStart(2,'0');
    for(const [id,value]of Object.entries({'part-number':num,'detail-counter':num+' / 12','part-name':part.name,'part-en':part.en,'part-category':part.category,'part-title':part.title,'part-desc':part.desc,'part-action':part.action,'part-note':part.note,'pager-label':part.en}))$('#'+id).textContent=value;
    $$('.part-button').forEach((b,i)=>{b.classList.toggle('selected',i===selected);b.setAttribute('aria-pressed',String(i===selected))});
    $('#stabilize').hidden=part.id!=='stabilizer';
    if(part.id!=='stabilizer'&&stabilizing)stopStabilize();
    highlight(selected);mini();
    document.dispatchEvent(new CustomEvent('lens-select',{detail:{index:selected,part}}));
    if(speak)announce(num+'，'+part.name+'。'+part.short);
    if(scroll)$('#explore').scrollIntoView({behavior:reduced.matches?'instant':'smooth'});
  }
  function stopTour(){tour=false;clearTimeout(tourTimer);$('#tour').setAttribute('aria-pressed','false');$('#tour span').textContent='自動導覽';$('#tour svg').innerHTML='<path d="m8 5 11 7-11 7Z"/>'}
  function interact(){userInteracted=true;stopTour()}
  function tourNext(){if(!tour)return;if(!document.hidden&&visible){select((selected+1)%parts.length);tourStart=performance.now()}tourTimer=setTimeout(tourNext,5300)}
  function startTour(){stopTour();tour=true;selected=-1;select(0);setMode('explode');target=1;syncExplosion();$('#tour').setAttribute('aria-pressed','true');$('#tour span').textContent='暫停導覽';$('#tour svg').innerHTML='<path d="M8 5v14m8-14v14"/>';tourStart=performance.now();tourTimer=setTimeout(tourNext,5300);run()}
  function syncExplosion(){$('#explode').value=String(Math.round(target*100));$('#explode-value').textContent=Math.round(target*100)+'%'}
  function setMode(next){
    mode=next;$$('[data-mode]').forEach(b=>{b.classList.toggle('active',b.dataset.mode===mode);b.setAttribute('aria-pressed',String(b.dataset.mode===mode))});
    const light=mode==='light';scene.hidden=light;$('#light-scene').hidden=!light;$('#explode').disabled=light;
    $$('.zoom-tools button').forEach(b=>b.disabled=light&&b.id!=='reset');
    $('#figure-hint').textContent=light?'調整光圈與焦距，觀察光束變化':'點選零件探索 · ← → 切換';
    if(mode==='assembled')target=0;if(mode==='explode'&&target===0)target=1;
    syncExplosion();updateOptics();run();
  }
  function stopStabilize(){stabilizing=false;$('#stabilize').setAttribute('aria-pressed','false');$('#stabilize').textContent='啟動防手震示意';run()}
  function updateAperture(){
    const n=fNumber(),r=22*2.8/n;
    for(const blade of scene.querySelectorAll('[data-blade]')){const i=Number(blade.dataset.blade),a=i*Math.PI*2/9,b=(i+1)*Math.PI*2/9;blade.setAttribute('d',path([world(-5,27*Math.cos(a),27*Math.sin(a)),world(-5,27*Math.cos(b),27*Math.sin(b)),world(-5,r*Math.cos(b),r*Math.sin(b)),world(-5,r*Math.cos(a),r*Math.sin(a))]))}
    $('#aperture-value').textContent='f/'+n;$('#aperture').setAttribute('aria-valuetext','f/'+n);
    $('#light-ratio').textContent=(Math.pow(2.8/n,2)*100).toFixed(n>=11?1:0)+'%';
    if(selected===6)mini();updateOptics();
  }
  function updateFocal(){
    const f=Number($('#focal').value);$('#focal-value').textContent=f+' mm';$('#focal').setAttribute('aria-valuetext',f+' 毫米');
    $('#fov-value').textContent='水平視角 '+(2*Math.atan(36/(2*f))*180/Math.PI).toFixed(1)+'°';updateOptics();run();
  }
  function updateOptics(){
    const n=fNumber(),f=Number($('#focal').value),opening=119*2.8/n,sx=900,lx=sx-f*5;
    let before='',after='';
    for(let i=-4;i<=4;i++){
      const h=i*28,y=265+h;
      if(Math.abs(h)>opening)before+=`<path class="blocked-ray" d="M110 ${y}H${lx}"/>`;
    }
    for(let i=-3;i<=3;i++){
      const y=265+i*opening*.3;
      before+=`<path class="ray" d="M110 ${y}H${lx}"/><path class="ray ray-flow" d="M110 ${y}H${lx}"/>`;
      after+=`<path class="ray" d="M${lx} ${y}L${sx} 265"/><path class="ray ray-flow" d="M${lx} ${y}L${sx} 265"/>`;
    }
    $('#ray-back').innerHTML=before;$('#ray-front').innerHTML=after;
    $('#opt-stop').innerHTML=`<path class="opt-stop-body" d="M${lx-6} 110h12v${155-opening}h-12Z M${lx-6} ${265+opening}h12V420h-12Z"/>`;
    $('#optics .opt-lens').setAttribute('transform',`translate(${lx-480} 0)`);$('#optics .opt-center').setAttribute('cx',String(lx));
    $('#sensor').setAttribute('transform',`translate(${sx-880} 0)`);
    if(mode==='light')$('#readout').textContent='f/'+n+' · '+f+' mm · PARALLEL RAYS';
  }
  function draw(now){
    const f=Number($('#focal').value),order=[];
    const wave=stabilizing&&!reduced.matches?Math.sin((now-stabilizeStart)/440)*1.8:0;
    for(let i=0;i<nodes.length;i++){
      const n=nodes[i],id=n.dataset.piece,move=motions[id].map(v=>v*share);
      if(id==='stabilizer')move[0]+=wave;
      if(n.dataset.motion==='zoom')for(let j=0;j<3;j++)move[j]+=F.a[j]*(f-47)/23*.7;
      const [x,y]=vector(move);n.setAttribute('transform',`translate(${x.toFixed(3)} ${y.toFixed(3)})`);order.push({n,k:Number(n.dataset.key)+depth(move),i});
    }
    order.sort((a,b)=>a.k-b.k);const key=order.map(x=>x.i).join(',');if(key!==ordered){assembly.append(...order.map(x=>x.n));ordered=key}
    const scale=(2.03-1.03*share)*zoom,centerX=W/2,centerY=H/2;
    svg.setAttribute('viewBox',[centerX-W/scale/2,centerY-H/scale/2,W/scale,H/scale].join(' '));
    if(mode!=='light')$('#readout').textContent=Math.abs(target-share)>.002?'TRANSITION · '+Math.round(share*100)+'%':share<.003?'ASSEMBLED · 12 COMPONENTS':'EXPLODED · '+Math.round(share*100)+'%';
    $('#zoom-in').disabled=mode==='light'||targetZoom>=1.5;$('#zoom-out').disabled=mode==='light'||targetZoom<=.8;
  }
  function tick(now){frame=0;if(!visible||document.hidden)return;const dt=last?Math.min((now-last)/1000,1/30):1/60;last=now;
    share=reduced.matches?target:share+(target-share)*(1-Math.exp(-dt/.24));zoom=reduced.matches?targetZoom:zoom+(targetZoom-zoom)*(1-Math.exp(-dt/.18));
    if(Math.abs(target-share)<.0005)share=target;if(Math.abs(targetZoom-zoom)<.0005)zoom=targetZoom;draw(now);
    if(share!==target||zoom!==targetZoom||(stabilizing&&!reduced.matches))frame=requestAnimationFrame(tick);
  }
  function run(){if(!frame&&visible&&!document.hidden){last=0;frame=requestAnimationFrame(tick)}}
  $$('.part-button').forEach(b=>b.addEventListener('click',()=>{interact();select(Number(b.dataset.select))}));
  $$('[data-jump]').forEach(b=>b.addEventListener('click',()=>{interact();select(Number(b.dataset.jump),{scroll:true});setMode('explode')}));
  $('#prev-part').addEventListener('click',()=>{interact();select(selected-1)});$('#next-part').addEventListener('click',()=>{interact();select(selected+1)});
  $$('[data-mode]').forEach(b=>b.addEventListener('click',()=>{interact();setMode(b.dataset.mode);announce(b.textContent)}));
  $('#explode').addEventListener('input',e=>{interact();target=Number(e.target.value)/100;mode=target===0?'assembled':'explode';$$('[data-mode]').forEach(b=>{b.classList.toggle('active',b.dataset.mode===mode);b.setAttribute('aria-pressed',String(b.dataset.mode===mode))});$('#explode-value').textContent=e.target.value+'%';run()});
  $('#aperture').addEventListener('input',()=>{interact();updateAperture()});$('#focal').addEventListener('input',()=>{interact();updateFocal()});
  $('#tour').addEventListener('click',()=>{userInteracted=true;tour?stopTour():startTour()});
  $('#stabilize').addEventListener('click',()=>{interact();if(stabilizing){stopStabilize();return}stabilizing=true;stabilizeStart=performance.now();$('#stabilize').setAttribute('aria-pressed','true');$('#stabilize').textContent=reduced.matches?'已啟動（偏好減少動態：靜態顯示）':'暫停防手震示意';run()});
  $('#zoom-in').addEventListener('click',()=>{interact();targetZoom=clamp(targetZoom+.1,.8,1.5);run()});$('#zoom-out').addEventListener('click',()=>{interact();targetZoom=clamp(targetZoom-.1,.8,1.5);run()});
  $('#reset').addEventListener('click',()=>{interact();stopStabilize();target=1;targetZoom=1;$('#aperture').value='2';$('#focal').value='50';setMode('explode');select(6);updateAperture();updateFocal();announce('展示已重設')});
  scene.addEventListener('click',e=>{const node=e.target.closest('[data-piece]');if(node){interact();select(parts.findIndex(p=>p.id===node.dataset.piece))}});
  scene.addEventListener('pointerover',e=>{if(e.pointerType==='touch')return;const node=e.target.closest('[data-piece]');if(node)highlight(parts.findIndex(p=>p.id===node.dataset.piece))});
  scene.addEventListener('pointerleave',()=>highlight(selected));
  scene.addEventListener('keydown',e=>{let used=true;if(e.key==='ArrowRight'){interact();select(selected+1)}else if(e.key==='ArrowLeft'){interact();select(selected-1)}else if(e.key==='Home'){interact();select(0)}else if(e.key==='End'){interact();select(parts.length-1)}else if(e.key==='Enter'||e.key===' '){interact();setMode(mode==='assembled'?'explode':'assembled')}else used=false;if(used)e.preventDefault()});
  $('#theme').addEventListener('click',()=>{const light=document.body.dataset.theme!=='light';document.body.dataset.theme=light?'light':'dark';$('#theme').setAttribute('aria-label',light?'切換深色主題':'切換淺色主題');try{localStorage.setItem('lens-theme',light?'light':'dark')}catch{}});
  try{if(localStorage.getItem('lens-theme')==='light'){document.body.dataset.theme='light';$('#theme').setAttribute('aria-label','切換深色主題')}}catch{}
  new IntersectionObserver(entries=>{visible=entries.at(-1).isIntersecting;$('#light-scene').classList.toggle('paused',!visible);if(visible)run()},{rootMargin:'120px 0px'}).observe($('.workspace'));
  document.addEventListener('visibilitychange',()=>{$('#light-scene').classList.toggle('paused',document.hidden);if(!document.hidden)run()});
  reduced.addEventListener('change',()=>{if(reduced.matches)stopTour();run()});
  select(6,{speak:false});updateAperture();updateFocal();draw(performance.now());run();
  // A gentle idle tour only begins while the pointer and keyboard are outside the workspace.
  let idle=setTimeout(()=>{if(!userInteracted&&!reduced.matches&&visible&&!$('.workspace').matches(':hover')&&!$('.workspace').contains(document.activeElement))startTour()},20000);
  $('.workspace').addEventListener('pointerdown',()=>{clearTimeout(idle)},{once:true});
  window.lensDemo={get state(){return{selected,mode,target,share,zoom,tour,stabilizing,fNumber:fNumber(),focal:Number($('#focal').value)}},select,setMode};
})();
