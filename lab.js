import {sensorFragment} from './sensor-shader.js';
import * as THREE from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';
import {apertureStops,focusFromSlider,sliderFromFocus,sceneX,depthOfField,exposureGain,previewGain,diffractionSigma} from './optics.mjs';
import {parts as partProfiles} from './parts.mjs';
import {sensorFormat,focusOffset,stabilizationOffset,exposureState} from './camera-mechanics.mjs';
import {createCameraBody} from './camera-body.js';
import {buildAtelier} from './atelier.js';
import {createSceneFinish} from './scene-finish.js';
import {shutterStops,exposureTimes,rotorAngularSpeed} from './motion-exposure.mjs';
import {integrateExposure} from './temporal-exposure.js';
import {createFrameLoop,demoFrame} from './animation.mjs';
import {createPhotoGallery} from './photo-gallery.js';

const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
const canvas=$('#lab-canvas'),wrap=$('#lab-wrap'),photo=$('#photo-canvas'),reduce=matchMedia('(prefers-reduced-motion: reduce)');
let renderer,preview;
try{
  renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:false,powerPreference:'high-performance'});
  preview=new THREE.WebGLRenderer({canvas:photo,antialias:true,preserveDrawingBuffer:true});
}catch(error){
  $('#lab-loading').textContent='此瀏覽器無法啟用 3D。下方零件圖解仍可操作。';
  document.body.classList.remove('lab-booting');
  const fallback=document.createElement('div');fallback.id='diagram-overlay';fallback.innerHTML='<div class="diagram-modal"><header><span>此瀏覽器無法啟用 3D · 鏡頭構造圖解</span></header></div>';
  const diagram=$('.technical-view');diagram.open=true;fallback.querySelector('.diagram-modal').append(diagram);$('#lab').append(fallback);
  $('#lab-play').disabled=true;
  requestAnimationFrame(()=>window.lensDemo?.select(3,{speak:false}));
}
if(renderer&&preview)start();

function start(){
  document.body.classList.add('immersive');
  document.body.dataset.theme='dark';canvas.setAttribute('aria-label','單眼相機與鏡頭剖面。直接旋轉對焦環調整清晰距離，旋轉變焦環改變焦距；空白處拖曳轉視角。H 隱藏介面，空白鍵拍照。');
  const lab=$('#lab'),visual=$('.lab-visual'),deck=document.createElement('div');deck.className='lab-control-deck';visual.append(deck);deck.append($('.lab-focus-controls'),$('.lab-bottom-controls'));
  const topbar=document.createElement('div');topbar.className='immersive-topbar';topbar.innerHTML='<div class="immersive-brand"><span class="brand-aperture">◉</span><div>ANATOMY <small>鏡頭實驗室</small></div><span class="lab-version">INTERACTIVE OPTICS</span></div><div class="immersive-actions"><button id="lab-catalog" aria-expanded="false">零件圖鑑</button><button id="lab-diagram">構造圖解</button><button id="lab-browser-full" aria-label="進入全螢幕" title="進入全螢幕">⛶</button></div>';lab.append(topbar);
  const shotButton=document.createElement('button');shotButton.id='lab-shot';shotButton.textContent='鏡頭特寫';$('.lab-camera-tools').prepend(shotButton);
  const gardenButton=document.createElement('button');gardenButton.id='lab-garden';gardenButton.textContent='景觀特寫';gardenButton.setAttribute('aria-pressed','false');gardenButton.title='檢視 Blender 景觀模型；暫停主畫面的展示景深';shotButton.after(gardenButton);let inspectGarden=false;
  const rearButton=document.createElement('button');rearButton.id='lab-rear';rearButton.textContent='成像面背面';rearButton.setAttribute('aria-pressed','false');rearButton.title='從機身後方觀看 3:2 成像透視';shotButton.after(rearButton);
  const bodyButton=document.createElement('button');bodyButton.id='lab-body';bodyButton.textContent='單眼機身';bodyButton.setAttribute('aria-expanded','false');$('#lab-catalog').after(bodyButton);
  const bodyPanel=document.createElement('aside');bodyPanel.id='body-profile';bodyPanel.hidden=true;bodyPanel.setAttribute('aria-label','單眼機身構造與操作');bodyPanel.innerHTML=`<header><span>DSLR / 全片幅單眼</span><button id="body-close" aria-label="關閉機身說明">×</button></header><h2>一條光路，兩種取景。</h2><div class="body-view-modes" role="group" aria-label="取景方式"><button id="view-live" aria-pressed="true">Live View</button><button id="view-optical" aria-pressed="false">光學觀景窗</button></div><p id="body-state" role="status"></p><div class="body-diagram-steps"><button data-body-part="mirror">反光鏡</button><span>→</span><button data-body-part="prism">對焦屏／五稜鏡</button><button data-body-part="shutter">快門簾</button><span>→</span><button data-body-part="sensor">CMOS</button></div><h3 id="body-part-title">CMOS 感光元件</h3><p id="body-part-desc"></p><div class="body-teaching-controls"><button id="sensor-xray" aria-pressed="true">成像透視：開</button><button id="sensor-circle" aria-pressed="false">顯示成像圈</button></div><p class="body-schematic-note">36 × 24 mm、3:2 全片幅。實際感光元件不透明；透視模式將成像顯示在正反面，便於觀察倒像。機身外殼移除，快門動作放慢。</p><p class="body-schematic-note">Live View 維持取景亮度並展示景深；照片依固定 ISO 100、光圈與快門計算曝光。兩者皆使用九葉片散景與繞射近似。以 f/5.6、1/125 秒為場景曝光基準，並非測光校準。鏡頭採一般 24–70 mm 變焦結構示意；片數、曲率、鏡組行程與接環依型號不同。防手震為選配機構。</p><div class="body-sources">構造依據：<a href="https://global.canon/en/technology/dslr2021s.html" target="_blank" rel="noopener">Canon 單眼機構</a> · <a href="https://www.nikonusa.com/c/lenses/dslr-lenses/technology" target="_blank" rel="noopener">NIKKOR 鏡頭技術</a> · <a href="https://www.zeiss.com/photonics-and-optics/us/cinematography/know-how-hub/lens-illumination.html" target="_blank" rel="noopener">ZEISS 成像圈</a></div>`;lab.append(bodyPanel);
  const partSelect=document.createElement('select');partSelect.id='lab-part-select';partSelect.setAttribute('aria-label','選擇鏡頭零件');partSelect.innerHTML=partProfiles.map((p,i)=>`<option value="${i}">${String(i+1).padStart(2,'0')}　${p.name}</option>`).join('');$('.detail-top').after(partSelect);
  const inspector=document.createElement('aside');inspector.className='camera-inspector';inspector.setAttribute('aria-label','取景與構造說明');lab.append(inspector);
  const inspectorTabs=document.createElement('div');inspectorTabs.className='inspector-tabs';inspectorTabs.setAttribute('role','group');inspectorTabs.setAttribute('aria-label','構造說明');inspectorTabs.append($('#lab-catalog'),bodyButton);
  const partPanel=$('.detail-panel');inspector.append($('.photo-panel'),inspectorTabs,partPanel,bodyPanel);
  const moreParts=document.createElement('details');moreParts.className='inspector-more';moreParts.innerHTML='<summary>深入了解零件</summary>';
  moreParts.append($('#mini-art'),$('#part-desc'),partPanel.querySelector('.fact'));partPanel.querySelector('.part-pager').before(moreParts);
  const moreBody=document.createElement('details');moreBody.className='inspector-more';moreBody.innerHTML='<summary>成像原理與參考資料</summary>';moreBody.append(...bodyPanel.querySelectorAll('.body-schematic-note,.body-sources'));bodyPanel.append(moreBody);
  const diagram=document.createElement('div');diagram.id='diagram-overlay';diagram.hidden=true;diagram.innerHTML='<div class="diagram-modal"><header><span>鏡頭構造圖解</span><button id="close-diagram" aria-label="關閉構造圖解">×</button></header></div>';diagram.querySelector('.diagram-modal').append($('.technical-view'));lab.append(diagram);
  const rotaryHint=document.createElement('div');rotaryHint.id='rotary-hint';rotaryHint.innerHTML='<span>↻</span><div>直接旋轉對焦環<small>沿環面拖曳，改變清晰的距離</small></div>';wrap.append(rotaryHint);
  const dismissRotaryHint=()=>rotaryHint.classList.add('used');
  canvas.addEventListener('pointerdown',dismissRotaryHint,{once:true,capture:true,passive:true});
  canvas.addEventListener('wheel',dismissRotaryHint,{once:true,passive:true});
  const shutter=document.createElement('button');shutter.id='lab-shutter';shutter.setAttribute('aria-label','按下快門');shutter.title='按下快門';shutter.innerHTML='<span></span>';deck.append(shutter);
  const speedField=document.createElement('div');speedField.className='lab-speed';speedField.innerHTML=`<label for="shutter-speed">快門</label><select id="shutter-speed">${shutterStops.map((s,i)=>`<option value="${i}" ${i===2?'selected':''}>${s.label}</option>`).join('')}</select>`;$('.lab-bottom-controls').append(speedField);
  const structureControl=document.createElement('details');structureControl.className='structure-control';structureControl.innerHTML='<summary>拆解程度</summary>';structureControl.append($('.lab-spread'));$('.lab-toolbar').append(structureControl);
  const focusField=document.createElement('div');focusField.className='compact-focus';const focusLabel=document.createElement('label');focusLabel.htmlFor='lab-focus';focusLabel.textContent='對焦';focusField.append(focusLabel,$('#lab-focus'),$('#focus-label'));$('.lab-bottom-controls').prepend(focusField);$('.lab-focus-controls').remove();deck.prepend($('.lab-toolbar'));
  const flash=document.createElement('div');flash.id='shutter-flash';wrap.append(flash);
  const gallery=createPhotoGallery(wrap);
  const scene=new THREE.Scene();scene.background=new THREE.Color(0x111a22);scene.fog=new THREE.FogExp2(0x111a22,.018);
  renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));renderer.setClearColor(0x111a22);renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.18;renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFShadowMap;
  const PREVIEW_W=sensorFormat.previewWidth,PREVIEW_H=sensorFormat.previewHeight;
  preview.setSize(PREVIEW_W,PREVIEW_H,false);preview.setPixelRatio(1);preview.toneMapping=THREE.ACESFilmicToneMapping;preview.toneMappingExposure=1.18;
  const camera=new THREE.PerspectiveCamera(34,1,.1,100),home=new THREE.Vector3(3.4,4.1,17.8),targetHome=new THREE.Vector3(.3,1.35,0);camera.position.copy(home);
  const sceneFinish=createSceneFinish(renderer,camera);
  const orbit=new OrbitControls(camera,canvas);orbit.target.copy(targetHome);orbit.enableDamping=true;orbit.dampingFactor=.075;orbit.enablePan=false;orbit.minDistance=4.2;orbit.maxDistance=25;orbit.minPolarAngle=.4;orbit.maxPolarAngle=Math.PI*.485;orbit.rotateSpeed=.55;orbit.zoomSpeed=.7;orbit.update();
  $('.photo-footer').title='取景亮度已補償，保留景深變化；拍下照片才套用光圈、快門與 ISO 100 的曝光。';
  const photoCamera=new THREE.PerspectiveCamera(25,sensorFormat.aspect,.1,30);photoCamera.position.set(.9,1.35,0);photoCamera.lookAt(7.5,1.35,0);camera.layers.enable(1);
  const studio=document.createElement('canvas');studio.width=512;studio.height=256;const envCtx=studio.getContext('2d');
  const envGrad=envCtx.createLinearGradient(0,0,0,256);envGrad.addColorStop(0,'#a6bbcd');envGrad.addColorStop(.43,'#28343e');envGrad.addColorStop(.5,'#0a1016');envGrad.addColorStop(1,'#26313a');envCtx.fillStyle=envGrad;envCtx.fillRect(0,0,512,256);
  for(const [x,y,w,h,c] of [[25,40,90,70,'#e9e9e5'],[270,55,30,140,'#b8e5ff'],[410,50,65,130,'#fbd59a']]){envCtx.fillStyle=c;envCtx.fillRect(x,y,w,h)}
  const env=new THREE.CanvasTexture(studio);env.mapping=THREE.EquirectangularReflectionMapping;env.colorSpace=THREE.SRGBColorSpace;scene.environment=env;scene.environmentIntensity=.65;
  scene.add(new THREE.HemisphereLight(0xc6e5f6,0x29211c,1.15));
  const key=new THREE.DirectionalLight(0xffe7c5,3.2);key.position.set(-3,8,5);key.castShadow=true;key.shadow.mapSize.set(2048,2048);key.shadow.camera.left=-12;key.shadow.camera.right=12;key.shadow.camera.top=9;key.shadow.camera.bottom=-9;key.shadow.bias=-.0005;key.shadow.normalBias=.018;scene.add(key);
  const rim=new THREE.DirectionalLight(0x78c9f2,3.8);rim.position.set(4,5,-5);scene.add(rim);
  const fill=new THREE.PointLight(0xffb95a,18,10);fill.position.set(-2.5,2.3,2);scene.add(fill);
  const metal=new THREE.MeshStandardMaterial({color:0x303944,metalness:.82,roughness:.36});
  const dark=new THREE.MeshStandardMaterial({color:0x131b22,metalness:.45,roughness:.4});
  const rubber=new THREE.MeshStandardMaterial({color:0x0c1015,metalness:.08,roughness:.62});
  const brass=new THREE.MeshStandardMaterial({color:0x98713c,metalness:.89,roughness:.23});
  const chrome=new THREE.MeshStandardMaterial({color:0xb8c3cc,metalness:1,roughness:.18});
  const glass=new THREE.MeshPhysicalMaterial({color:0xc5dae2,metalness:0,roughness:.04,transmission:.91,transparent:true,opacity:.8,thickness:.12,ior:1.52,clearcoat:1,envMapIntensity:1.2,side:THREE.DoubleSide,depthWrite:false});
  const materials={metal,dark,rubber,brass,chrome};
  const blockGeo=new RoundedBoxGeometry(1,1,1,2,.025);
  function box(parent,w,h,d,x,y,z,mat=metal){const m=new THREE.Mesh(blockGeo,mat);m.scale.set(w,h,d);m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m}
  function cylinder(parent,r,len,x,y,z,mat=metal,axis='y',segments=48){const m=new THREE.Mesh(new THREE.CylinderGeometry(r,r,len,segments),mat);if(axis==='x')m.rotation.z=-Math.PI/2;if(axis==='z')m.rotation.x=Math.PI/2;m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m}
  function torus(parent,x,r,t,mat=brass,y=0,z=0){const m=new THREE.Mesh(new THREE.TorusGeometry(r,t,8,96),mat);m.rotation.y=Math.PI/2;m.position.set(x,y,z);parent.add(m);return m}
  function label(text,color='#afc5cd',background=null,width=512,height=64){const c=document.createElement('canvas');c.width=width;c.height=height;const ctx=c.getContext('2d');if(background){ctx.fillStyle=background;ctx.fillRect(0,0,width,height)}ctx.fillStyle=color;ctx.font=`${Math.round(height*.44)}px Consolas, monospace`;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(text,width/2,height/2);const tx=new THREE.CanvasTexture(c);tx.colorSpace=THREE.SRGBColorSpace;return tx}
  const bench=new THREE.Group();scene.add(bench);
  box(bench,14.6,.27,4.7,.4,.04,0,dark);box(bench,14.3,.06,4.4,.4,.205,0,metal);
  for(const x of [-4.8,6.8])for(const z of [-1.8,1.8]){cylinder(bench,.2,.17,x,-.12,z,rubber);cylinder(bench,.24,.035,x,-.03,z,chrome)}
  for(const z of [-.96,.96]){cylinder(bench,.062,13.3,.2,.39,z,chrome,'x');box(bench,13.5,.15,.23,.2,.28,z,dark);for(const x of [-6.4,6.7]){box(bench,.25,.28,.4,x,.4,z,metal);cylinder(bench,.045,.03,x,.56,z,brass)}}
  const ruler=box(bench,11.7,.016,.22,.8,.251,1.59,chrome);const ticks=[];
  for(let i=0;i<=160;i++){const x=-5.0+i*.073;ticks.push(x,.263,1.5,x,.263,i%10===0?1.68:1.58)}
  const ticksGeo=new THREE.BufferGeometry();ticksGeo.setAttribute('position',new THREE.Float32BufferAttribute(ticks,3));const tickLines=new THREE.LineSegments(ticksGeo,new THREE.LineBasicMaterial({color:0x151e27}));bench.add(tickLines);
  const nameplate=box(bench,1.7,.045,.5,-3.65,.26,1.13,brass);const plateText=new THREE.Mesh(new THREE.PlaneGeometry(1.45,.17),new THREE.MeshBasicMaterial({map:label('HUGO / OPTICAL ATELIER','#211d15'),transparent:true}));plateText.rotation.x=-Math.PI/2;plateText.position.set(-3.65,.285,1.13);bench.add(plateText);
  const floor=new THREE.Mesh(new THREE.PlaneGeometry(200,200),new THREE.MeshStandardMaterial({color:0x171d23,roughness:.77,metalness:.16}));floor.rotation.x=-Math.PI/2;floor.position.y=-2.62;floor.receiveShadow=true;scene.add(floor);
  const LENS_Y=1.65,CENTER=-1.55,AX=.018,RAD=.024;
  const lensRoot=new THREE.Group();lensRoot.position.set(CENTER,LENS_Y,0);scene.add(lensRoot);
  const groups=[],shells=[],zoomGlass=[],irisBlades=[];let selected=3,cutaway=true,focusCarriage,vrCarriage;
  // MODEL is a lexical const in the standalone page, so the 3D model uses its own rest dimensions.
  const rest=[[-140,-112,44],[-112,-104,40],[-104,-86,39],[-86,-64,40],[-64,-34,41],[-34,-10,38],[-10,0,38],[0,16,38],[16,36,36],[36,60,34],[60,68,38],[68,70,36]];
  function sleeve(group,index,ri,ro,length,mat,s=0,canCut=true){
    const profile=[new THREE.Vector2(ri,-length/2),new THREE.Vector2(ro-.015,-length/2),new THREE.Vector2(ro,-length/2+.015),new THREE.Vector2(ro,length/2-.015),new THREE.Vector2(ro-.015,length/2),new THREE.Vector2(ri,length/2),new THREE.Vector2(ri,-length/2)];
    const full=new THREE.Mesh(new THREE.LatheGeometry(profile,96),mat.clone());full.rotation.z=-Math.PI/2;full.position.x=s;full.castShadow=true;full.userData.part=index;group.add(full);
    if(canCut){const cut=new THREE.Mesh(new THREE.LatheGeometry(profile,96,.82,Math.PI*2-1.64),full.material);cut.rotation.copy(full.rotation);cut.position.copy(full.position);cut.castShadow=true;cut.userData.part=index;group.add(cut);shells.push({full,cut})}
    return full;
  }
  function ribs(group,index,x,len,r,count=112,mat=rubber){
    const geo=new RoundedBoxGeometry(len,.029,.025,2,.005),inst=new THREE.InstancedMesh(geo,mat,count),dummy=new THREE.Object3D();
    for(let i=0;i<count;i++){const a=i/count*Math.PI*2;dummy.position.set(x,r*Math.cos(a),r*Math.sin(a));dummy.rotation.set(a,0,0);dummy.updateMatrix();inst.setMatrixAt(i,dummy.matrix)}inst.userData.part=index;inst.castShadow=true;group.add(inst);return inst;
  }
  function glassElement(group,index,offset,r,thickness=.075,form='positive'){
    const p=[],surface=(t,back)=>form==='negative'?(back?1:-1)*(.012+(thickness/2-.012)*t*t):form==='meniscus'?(back?.016:-.016)+thickness*.6*(1-t*t):(back?1:-1)*(thickness/2-(thickness/2-.012)*t*t);
    for(let j=0;j<=20;j++){const t=j/20;p.push(new THREE.Vector2(r*t,surface(t,false)))}for(let j=20;j>=0;j--){const t=j/20;p.push(new THREE.Vector2(r*t,surface(t,true)))}p.push(p[0].clone());
    const m=new THREE.Mesh(new THREE.LatheGeometry(p,96),glass.clone());m.rotation.z=-Math.PI/2;m.position.x=offset;m.userData.part=index;group.add(m);torus(group,offset,r,.009,chrome);return m;
  }
  for(let i=0;i<12;i++){
    const [s0,s1,r]=rest[i],center=(s0+s1)/2,g=new THREE.Group();g.position.x=-(center+35)*AX;g.userData.rest=g.position.x;g.userData.part=i;groups.push(g);lensRoot.add(g);
    const len=(s1-s0)*AX,ro=r*RAD,ri=([37,33,32,33,33,29,27,29,27,24,34,28][i])*RAD;
    const mat=i===3||i===4?rubber:i===10?chrome:metal;
    sleeve(g,i,ri,ro,len,mat,0,i!==0&&i!==10&&i!==11);
    torus(g,-len/2+.01,ro-.015,.018,chrome);torus(g,len/2-.01,ro-.015,.018,metal);
    if(i===0){sleeve(g,i,ro-.035,ro+.13,.06,dark,len/2,false)}
    if(i===1)for(let j=0;j<4;j++)torus(g,-len/2+.025+j*.025,ri+.018,.008,chrome);
    if(i===2){glassElement(g,i,-.065,ri,.09,'meniscus');glassElement(g,i,.075,ri,.07)}
    if(i===3||i===4)ribs(g,i,i===3?-.055:0,i===3?len-.15:len-.07,ro+.006,132,rubber);
    if(i===3)box(g,.024,.13,.025,-len/2-.025,ro-.09,0,new THREE.MeshStandardMaterial({color:0xe0e9dc,roughness:.35}));
    if(i===5){for(const [j,x]of [-.12,0,.12].entries())zoomGlass.push(glassElement(g,i,x,ri,.065,j===1?'negative':'positive'))}
    if(i===7){ribs(g,i,0,len*.75,ri+.045,64,brass);torus(g,-len/2,ri+.04,.017,brass)}
    if(i===8){vrCarriage=new THREE.Group();g.add(vrCarriage);glassElement(vrCarriage,i,0,ri,.08,'meniscus');for(let j=0;j<3;j++){const a=j*2*Math.PI/3;box(g,.14,.07,.07,0,(ro-.08)*Math.cos(a),(ro-.08)*Math.sin(a),brass)}}
    if(i===9){focusCarriage=new THREE.Group();focusCarriage.userData.part=3;g.add(focusCarriage);glassElement(focusCarriage,3,-.09,ri,.065);glassElement(focusCarriage,3,0,ri,.065,'negative');glassElement(g,i,.16,ri,.075,'meniscus')}
    if(i===10){for(let j=0;j<3;j++){const a=j*2*Math.PI/3;const lug=box(g,.045,.14,.2,-len/2,(ro-.025)*Math.cos(a),(ro-.025)*Math.sin(a),chrome);lug.rotation.x=a}for(let j=0;j<6;j++){const a=j*Math.PI/3;cylinder(g,.025,.018,-len/2-.012,(ro-.045)*Math.cos(a),(ro-.045)*Math.sin(a),chrome,'x',12)}}
    if(i===11){for(let j=0;j<8;j++){const a=1.0+j*.13;cylinder(g,.025,.024,len/2+.015,(ro-.09)*Math.cos(a),(ro-.09)*Math.sin(a),brass,'x',12)}}
    g.traverse(obj=>{if(obj.isMesh){if(obj.userData.part===undefined)obj.userData.part=i;obj.material=obj.material.clone();if(obj.material.emissive){obj.userData.baseColor=obj.material.color.clone()}}});
  }
  // A real scale band rotates under a fixed index; logarithmic focus travel spans 252 degrees.
  const FOCUS_TRAVEL=4.4,focusAngle=d=>-2.2+sliderFromFocus(d)/1000*FOCUS_TRAVEL;
  const scaleCanvas=document.createElement('canvas');scaleCanvas.width=2048;scaleCanvas.height=256;const scaleCtx=scaleCanvas.getContext('2d');scaleCtx.fillStyle='#c5c9b8';scaleCtx.textAlign='center';scaleCtx.font='44px Consolas, monospace';
  const indexPhi=-.35;
  for(let j=0;j<=100;j++){const theta=indexPhi-(-2.2+j/100*FOCUS_TRAVEL),u=((theta/(Math.PI*2))%1+1)%1;scaleCtx.fillRect(u*2048-1,184,j%5===0?3:1.5,j%5===0?58:26)}
  for(const d of [.35,.5,.65,1,1.5,2,3,5,10,20]){const theta=indexPhi-focusAngle(d),u=((theta/(Math.PI*2))%1+1)%1;scaleCtx.fillText(String(d),u*2048,141)}
  const scaleTexture=new THREE.CanvasTexture(scaleCanvas);scaleTexture.colorSpace=THREE.SRGBColorSpace;scaleTexture.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());
  const scaleBand=new THREE.Mesh(new THREE.CylinderGeometry(.968,.968,.13,128,1,true),new THREE.MeshStandardMaterial({map:scaleTexture,transparent:true,alphaTest:.1,metalness:.22,roughness:.4,depthWrite:false}));scaleBand.rotation.z=-Math.PI/2;scaleBand.position.x=.13;scaleBand.userData.part=3;groups[3].add(scaleBand);
  const indexHousing=new THREE.Group();indexHousing.position.x=groups[3].userData.rest+.225;lensRoot.add(indexHousing);torus(indexHousing,0,.969,.022,chrome);
  const indexMarker=box(indexHousing,.045,.13,.025,.014,.99*Math.sin(.35),.99*Math.cos(.35),new THREE.MeshStandardMaterial({color:0xf3eee0,roughness:.4}));indexMarker.rotation.x=-.35;
  const pickMaterial=new THREE.MeshBasicMaterial({transparent:true,opacity:0,depthWrite:false,colorWrite:false,side:THREE.DoubleSide});
  const ringPick=new THREE.Mesh(new THREE.CylinderGeometry(1.01,1.01,.42,80,1,true),pickMaterial);ringPick.rotation.z=-Math.PI/2;ringPick.userData.part=3;groups[3].add(ringPick);
  const distanceCanvas=document.createElement('canvas');distanceCanvas.width=320;distanceCanvas.height=96;const distanceCtx=distanceCanvas.getContext('2d'),distanceTexture=new THREE.CanvasTexture(distanceCanvas);distanceTexture.colorSpace=THREE.SRGBColorSpace;distanceTexture.anisotropy=4;
  const distanceBezel=box(indexHousing,.48,.18,.038,-.105,.72,.83,metal);distanceBezel.rotation.x=-.715;
  const distanceDisplay=new THREE.Mesh(new THREE.PlaneGeometry(.425,.133),new THREE.MeshBasicMaterial({map:distanceTexture}));distanceDisplay.rotation.x=-.715;distanceDisplay.position.set(-.105,.739,.85);indexHousing.add(distanceDisplay);
  // The iris is a 9-sided adjustable opening, deliberately separated from its surrounding cell.
  for(let j=0;j<9;j++){
    const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(new Float32Array(18),3));geo.computeVertexNormals();
    const m=new THREE.Mesh(geo,new THREE.MeshStandardMaterial({color:j%2?0x6b6d65:0x85887e,metalness:.85,roughness:.31,side:THREE.DoubleSide}));m.userData.part=6;groups[6].add(m);irisBlades.push(m);
  }
  for(const x of [-3.1,-.1]){
    box(bench,.64,.14,1.85,x,.58,0,metal);box(bench,.24,.55,.32,x,.91,0,brass);box(bench,.42,.16,.56,x,1.21,0,dark);
    for(const z of [-.75,.75]){cylinder(bench,.05,.025,x,.665,z,chrome,undefined,18)}
  }
  // The body and its rectangular sensor are separate from the lens assembly.
  const sensorMap=new THREE.CanvasTexture(photo);sensorMap.colorSpace=THREE.SRGBColorSpace;
  sensorMap.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());
  const body=createCameraBody({scene,texture:sensorMap,box,label,metal,dark,chrome,axisY:LENS_Y});
  // Procedural sample scene: three genuinely spatial subjects at the marked distances.
  const props=new THREE.Group();scene.add(props);
  const nearX=sceneX(.65),midX=sceneX(2),farX=sceneX(7);
  const sky=document.createElement('canvas');sky.width=256;sky.height=256;const sc=sky.getContext('2d'),sg=sc.createLinearGradient(0,0,0,256);sg.addColorStop(0,'#40657a');sg.addColorStop(.55,'#91b4bc');sg.addColorStop(1,'#d3c19d');sc.fillStyle=sg;sc.fillRect(0,0,256,256);sc.fillStyle='#e5d6b3';sc.beginPath();sc.arc(177,80,23,0,Math.PI*2);sc.fill();
  const skyTexture=new THREE.CanvasTexture(sky);skyTexture.colorSpace=THREE.SRGBColorSpace;const backdrop=new THREE.Mesh(new THREE.PlaneGeometry(14,8),new THREE.MeshBasicMaterial({map:skyTexture}));backdrop.rotation.y=-Math.PI/2;backdrop.position.set(8.4,3.2,0);props.add(backdrop);
  const meadow=new THREE.Mesh(new THREE.PlaneGeometry(7,14),new THREE.MeshStandardMaterial({color:0x71805a,roughness:1}));meadow.rotation.x=-Math.PI/2;meadow.position.set(5,.31,0);meadow.receiveShadow=true;props.add(meadow);
  // Cyan plane and its near/far limits live only in the explanatory camera layer.
  const focusPlane=new THREE.Group();focusPlane.layers.set(1);scene.add(focusPlane);
  const planeFace=new THREE.Mesh(new THREE.PlaneGeometry(2.9,2.5),new THREE.MeshBasicMaterial({color:0x7ad7ed,transparent:true,opacity:.065,side:THREE.DoubleSide,depthWrite:false}));planeFace.rotation.y=Math.PI/2;focusPlane.add(planeFace);
  const planeBorder=new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0,-1.25,-1.45),new THREE.Vector3(0,1.25,-1.45),new THREE.Vector3(0,1.25,1.45),new THREE.Vector3(0,-1.25,1.45)]),new THREE.LineBasicMaterial({color:0xb9efff,transparent:true,opacity:.85}));focusPlane.add(planeBorder);
  const gridPoints=[];for(let i=0;i<=6;i++){const t=-1.45+i*2.9/6;gridPoints.push(0,-1.25,t,0,1.25,t)}for(let i=0;i<=5;i++){const t=-1.25+i*.5;gridPoints.push(0,t,-1.45,0,t,1.45)}
  const grid=new THREE.LineSegments(new THREE.BufferGeometry().setAttribute('position',new THREE.Float32BufferAttribute(gridPoints,3)),new THREE.LineBasicMaterial({color:0x8ee2f3,transparent:true,opacity:.4}));focusPlane.add(grid);focusPlane.traverse(n=>n.layers.set(1));
  const dofVolume=new THREE.Mesh(new THREE.BoxGeometry(1,2.5,2.9),new THREE.MeshBasicMaterial({color:0x5bbfcb,transparent:true,opacity:.025,side:THREE.BackSide,depthWrite:false}));dofVolume.layers.set(1);scene.add(dofVolume);
  const rayGeo=new THREE.BufferGeometry();rayGeo.setAttribute('position',new THREE.Float32BufferAttribute(new Float32Array(9*3*6),3));
  const rayLines=new THREE.LineSegments(rayGeo,new THREE.LineBasicMaterial({color:0x99e1ed,transparent:true,opacity:.25,blending:THREE.AdditiveBlending,depthWrite:false}));rayLines.layers.set(1);scene.add(rayLines);
  const photonsGeo=new THREE.BufferGeometry();photonsGeo.setAttribute('position',new THREE.Float32BufferAttribute(new Float32Array(27),3));const photons=new THREE.Points(photonsGeo,new THREE.PointsMaterial({color:0xbbf5ff,size:.035,transparent:true,opacity:.8,blending:THREE.AdditiveBlending,depthWrite:false}));photons.layers.set(1);scene.add(photons);
  // Preview: the depth buffer is converted to a thin-lens circle of confusion before sampling.
  const photoRT=new THREE.WebGLRenderTarget(PREVIEW_W,PREVIEW_H,{depthBuffer:true,type:THREE.HalfFloatType});photoRT.depthTexture=new THREE.DepthTexture(PREVIEW_W,PREVIEW_H,THREE.UnsignedShortType);
  const uniforms={tColor:{value:photoRT.texture},tDepth:{value:photoRT.depthTexture},resolution:{value:new THREE.Vector2(PREVIEW_W,PREVIEW_H)},focus:{value:2},focal:{value:24},aperture:{value:5.6},exposure:{value:1},diffraction:{value:diffractionSigma(5.6)}};
  const blurMaterial=new THREE.ShaderMaterial({uniforms,depthTest:false,depthWrite:false,
    vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=vec4(position.xy,0.,1.);}',
    fragmentShader:sensorFragment});
  const screenScene=new THREE.Scene(),screenCamera=new THREE.OrthographicCamera(-1,1,1,-1,0,1);screenScene.add(new THREE.Mesh(new THREE.PlaneGeometry(2,2),blurMaterial));
  let focus=2,targetFocus=2,focal=24,aperture=5.6,spread=0,targetSpread=0,auto=false,clock=0,demoTime=0,visible=true,dirty=true,rayOn=true,drag=null,lastPhoto=0,focusMode='MF',wideShot=false,rearView=false,liveView=true,sensorXray=true,showImageCircle=false,dofPreview=false,shotStarted=null,shotSaved=false;
  let rotor=null,motionTime=0,shutterIndex=2,shotSettings=null;
  function poseMotion(time){if(rotor)rotor.rotation.x=time*rotorAngularSpeed;canvas.dataset.rotorAngle=String(time*rotorAngularSpeed)}
  const demoStatus=document.createElement('span');demoStatus.id='demo-status';demoStatus.setAttribute('role','status');demoStatus.hidden=true;$('.lab-toolbar').append(demoStatus);
  $('#lab-play').title='32 秒循環：對焦 → 光圈景深 → 廣角／望遠 → 鏡組拆解';
  $('#shutter-speed').addEventListener('change',e=>{shutterIndex=Number(e.target.value);canvas.dataset.shutterSeconds=String(shutterStops[shutterIndex].seconds);dirty=true;run()});
  const bodyDescriptions={sensor:['CMOS 感光元件','一般全片幅單眼使用約 36 × 24 mm 的長方形感光區，記錄鏡頭成像圈內的 3:2 畫面。它把光轉換為電訊號，並不是另一片透鏡。此處只有透視模式會從背面顯示影像。'],mirror:['快速回復反光鏡','光學取景時，約 45° 的反光鏡把光向上送到對焦屏與五稜鏡。拍照時反光鏡先升起，讓光線抵達快門與感光元件；Live View 則保持升起。'],shutter:['焦平面快門','快門位於感光元件前方。先幕開始曝光、後幕結束曝光；拍攝完成後再復位。按下快門可觀察放慢的動作，這裡示範完全開啟的曝光，不模擬高速狹縫掃描。'],prism:['對焦屏、五稜鏡與接目鏡','反光鏡將光送至對焦屏，再經五稜鏡轉向與校正，讓光學觀景窗呈現正立影像。部分入門單眼以五面鏡替代五稜鏡。感光元件與上方對焦屏是不同的平面。']};
  const previewDepth=document.createElement('button');previewDepth.id='dof-preview';previewDepth.textContent='景深預覽';previewDepth.setAttribute('aria-pressed','false');$('.body-teaching-controls').append(previewDepth);
  const dofNote=document.createElement('p');dofNote.className='body-schematic-note';dofNote.textContent='光學取景時光圈通常保持全開，按「景深預覽」或曝光時再收至設定值。對焦距離控制選取 0.35–20 m 作教學展示。';$('.body-teaching-controls').after(dofNote);
  function closeBody(){bodyPanel.hidden=true;bodyButton.setAttribute('aria-expanded','false');lab.classList.remove('body-open')}
  function openBody(part='sensor'){stopAuto();bodyPanel.hidden=false;bodyButton.setAttribute('aria-expanded','true');lab.classList.add('body-open');lab.classList.remove('parts-open');$('#lab-catalog').setAttribute('aria-expanded','false');const [title,desc]=bodyDescriptions[part];$('#body-part-title').textContent=title;$('#body-part-desc').textContent=desc;$$('[data-body-part]').forEach(b=>b.classList.toggle('active',b.dataset.bodyPart===part))}
  bodyButton.addEventListener('click',()=>bodyPanel.hidden?openBody():closeBody());$('#body-close').addEventListener('click',closeBody);$$('[data-body-part]').forEach(b=>b.addEventListener('click',()=>openBody(b.dataset.bodyPart)));
  for(const [id,mode]of [['view-live',true],['view-optical',false]])$('#'+id).addEventListener('click',()=>{stopAuto();if(shotStarted!==null)return;liveView=mode;$('#view-live').setAttribute('aria-pressed',String(mode));$('#view-optical').setAttribute('aria-pressed',String(!mode));$('.photo-panel>div:first-child>span:first-child').textContent=mode?'感光元件預覽':'光學觀景窗';$('.photo-footer>span:last-child').innerHTML=mode?'LIVE VIEW <i></i>':'OPTICAL VIEW';dirty=true;run()});
  $('#sensor-xray').addEventListener('click',()=>{sensorXray=!sensorXray;$('#sensor-xray').setAttribute('aria-pressed',String(sensorXray));$('#sensor-xray').textContent='成像透視：'+(sensorXray?'開':'關');dirty=true;run()});
  $('#sensor-circle').addEventListener('click',()=>{showImageCircle=!showImageCircle;$('#sensor-circle').setAttribute('aria-pressed',String(showImageCircle));dirty=true;run()});
  previewDepth.addEventListener('click',()=>{dofPreview=!dofPreview;previewDepth.setAttribute('aria-pressed',String(dofPreview));dirty=true;run()});
  let rayPaths=[],picked=-1,focusRotation=0,compactViewport=false;
  function stopAuto(){if(auto){targetFocus=focus;targetSpread=spread}auto=false;canvas.dataset.demoPlaying='false';demoStatus.hidden=true;$('#lab-play').setAttribute('aria-pressed','false');$('#lab-play').innerHTML='<span class="play-mark">▶</span> <span>對焦／拆解導覽</span>'}
  if(!auto)stopAuto();
  function setFocus(value,manual=true){targetFocus=THREE.MathUtils.clamp(value,.35,20);if(manual){stopAuto();focusMode='MF'}dirty=true;run()}
  function setMode(mode){cutaway=mode==='cutaway';targetSpread=mode==='exploded'?1:0;$$('[data-lab-mode]').forEach(b=>{b.classList.toggle('active',b.dataset.labMode===mode);b.setAttribute('aria-pressed',String(b.dataset.labMode===mode))});dirty=true;run()}
  function syncControls(){
    const value=focus.toFixed(2),dof=depthOfField(focal,aperture,focus),far=Number.isFinite(dof.far)?dof.far.toFixed(2):'∞';
    distanceCtx.fillStyle='#0a1417';distanceCtx.fillRect(0,0,320,96);distanceCtx.fillStyle='#dce9cf';distanceCtx.font='53px Consolas, monospace';distanceCtx.textAlign='center';distanceCtx.textBaseline='middle';distanceCtx.fillText(value+' m',160,51);distanceTexture.needsUpdate=true;
    $('#lab-distance').innerHTML=value+' <small>m</small>';$('#lab-dof').innerHTML=dof.near.toFixed(2)+'—'+far+' <small>m</small>';
    if(document.activeElement!==$('#lab-focus'))$('#lab-focus').value=String(Math.round(sliderFromFocus(focus)));$('#lab-focus').setAttribute('aria-valuetext',value+' 公尺');
    const targets=[.65,2,7],names=['前景樹木','中景小屋','遠景山丘'];let nearest=0;for(let i=1;i<3;i++)if(Math.abs(Math.log(focus/targets[i]))<Math.abs(Math.log(focus/targets[nearest])))nearest=i;
    const onTarget=Math.abs(Math.log(focus/targets[nearest]))<.05;
    $('#focus-label').textContent=value+' m';$('#photo-status').textContent=onTarget?names[nearest]+'對焦':'自訂距離 '+value+' m';
    $$('[data-focus]').forEach(b=>b.classList.toggle('active',Math.abs(Math.log(focus/Number(b.dataset.focus)))<.05));
    $('#photo-settings').textContent=(liveView?focusMode:'OVF')+' · '+focal+' mm · f/'+(!liveView&&!dofPreview&&shotStarted===null?2.8:aperture)+' · '+shutterStops[shutterIndex].label;$('#lab-spread').value=String(Math.round(spread*100));$('#lab-spread-value').textContent=Math.round(spread*100)+'%';
    photo.parentElement.classList.toggle('in-focus',onTarget);
    canvas.dataset.focus=String(focus);canvas.dataset.aperture=String(aperture);canvas.dataset.focal=String(focal);canvas.dataset.spread=String(spread);
    canvas.dataset.sensorAspect=String(sensorFormat.aspect);canvas.dataset.focusGroup=String(focusCarriage.position.x);canvas.dataset.vrAxial=String(vrCarriage.position.x);
  }
  let lastOpticsKey='',lastControlsKey='',viewMovingUntil=0;
  function updateOptics(){
    const workingAperture=!liveView&&!dofPreview&&shotStarted===null?2.8:aperture,open=.56*2.8/workingAperture;
    const toSensor=exposureState(shotStarted===null?null:clock-shotStarted,liveView).mirrorLift>.99;
    // View navigation must not rebuild optical geometry or upload text textures.
    const opticsKey=[focus,focal,aperture,workingAperture,liveView,toSensor].join('|');
    const controlsKey=[opticsKey,spread,focusMode,shutterIndex].join('|');
    if(opticsKey===lastOpticsKey){
      if(controlsKey!==lastControlsKey){lastControlsKey=controlsKey;syncControls()}
      return;
    }
    lastOpticsKey=opticsKey;lastControlsKey=controlsKey;
    for(let j=0;j<9;j++){const a=j*2*Math.PI/9,b=(j+1)*2*Math.PI/9,r=.64,vertices=[[0,r*Math.cos(a),r*Math.sin(a)],[0,r*Math.cos(b),r*Math.sin(b)],[0,open*Math.cos(b),open*Math.sin(b)],[0,open*Math.cos(a),open*Math.sin(a)]];const arr=irisBlades[j].geometry.attributes.position;let k=0;for(const ix of [0,1,2,0,2,3]){arr.setXYZ(k++,...vertices[ix])}arr.needsUpdate=true;irisBlades[j].geometry.computeVertexNormals()}
    uniforms.focus.value=focus;uniforms.focal.value=focal;uniforms.aperture.value=workingAperture;uniforms.diffraction.value=diffractionSigma(workingAperture);
    uniforms.exposure.value=previewGain(liveView,workingAperture);
    photoCamera.fov=2*Math.atan(sensorFormat.height/(2*focal))*180/Math.PI;photoCamera.updateProjectionMatrix();
    focusPlane.position.set(sceneX(focus),1.55,0);
    const dof=depthOfField(focal,aperture,focus),near=sceneX(Math.max(.35,dof.near)),far=sceneX(Math.min(20,dof.far));dofVolume.position.set((near+far)/2,1.55,0);dofVolume.scale.x=Math.max(.01,far-near);
    focusCarriage.position.x=focusOffset(focal,focus);
    for(let j=0;j<zoomGlass.length;j++)zoomGlass[j].position.x=(j-1)*(.12+(focal-24)/46*.035);
    rayPaths=[];const a=rayGeo.attributes.position;let k=0;
    const sensorX=body.sensorX;
    for(let j=0;j<9;j++){const ang=j*2*Math.PI/9,ry=Math.cos(ang)*open,rz=Math.sin(ang)*open;
      const path=[new THREE.Vector3(sceneX(focus),1.4,0),new THREE.Vector3(CENTER+1.15,LENS_Y+ry,rz),new THREE.Vector3(CENTER-.25,LENS_Y+ry*.75,rz*.75),new THREE.Vector3(toSensor?sensorX+.04:body.mirrorX,LENS_Y+(toSensor?.12:0),0)];
      rayPaths.push(path);for(let q=0;q<3;q++){a.setXYZ(k++,...path[q].toArray());a.setXYZ(k++,...path[q+1].toArray())}}
    a.needsUpdate=true;rayGeo.computeBoundingSphere();dirty=true;syncControls();
  }
  function highlight(index){selected=index;partSelect.value=String(index);groups.forEach(g=>g.traverse(m=>{if(m.isMesh&&m.material.emissive){const active=m.userData.part===index;m.material.emissive.setHex(active?0x6b4220:0x000000);m.material.emissiveIntensity=active?.2:0}}));dirty=true;run()}
  function select(index){window.lensDemo?.select(index);highlight(index)}
  document.addEventListener('lens-select',e=>highlight(e.detail.index));
  function resize(){const r=wrap.getBoundingClientRect();if(r.width<1||r.height<1)return;renderer.setSize(r.width,r.height,false);camera.aspect=r.width/r.height;const compact=r.width<700;if(compact!==compactViewport&&!wideShot&&!rearView){orbit.target.x+=compact?-.5:.5;orbit.update()}compactViewport=compact;camera.fov=compact?THREE.MathUtils.clamp(2*Math.atan(Math.tan(44*Math.PI/360)/camera.aspect)*180/Math.PI,45,95):32;camera.updateProjectionMatrix();dirty=true;run()}
  new ResizeObserver(resize).observe(wrap);
  const raycaster=new THREE.Raycaster(),pointer=new THREE.Vector2();
  function hit(event){const r=canvas.getBoundingClientRect();pointer.set((event.clientX-r.left)/r.width*2-1,-(event.clientY-r.top)/r.height*2+1);raycaster.setFromCamera(pointer,camera);return raycaster.intersectObjects([...lensRoot.children,...body.root.children],true).find(h=>{for(let n=h.object;n;n=n.parent)if(!n.visible)return false;return h.object.userData.part!==undefined||h.object.userData.bodyPart})}
  function rotaryAngle(event,center){const r=canvas.getBoundingClientRect();pointer.set((event.clientX-r.left)/r.width*2-1,-(event.clientY-r.top)/r.height*2+1);raycaster.setFromCamera(pointer,camera);const point=raycaster.ray.intersectPlane(new THREE.Plane(new THREE.Vector3(1,0,0),-center.x),new THREE.Vector3());return point?Math.atan2(point.z-center.z,point.y-center.y):null}
  canvas.addEventListener('pointerdown',event=>{
    event.preventDefault();canvas.focus({preventScroll:true});stopAuto();const result=hit(event);
    if(result?.object.userData.bodyPart){openBody(result.object.userData.bodyPart);dirty=true;run();return}
    if(result){closeBody();picked=result.object.userData.part;select(picked);if(picked===3||picked===4){const center=groups[picked].getWorldPosition(new THREE.Vector3());drag={x:event.clientX,id:event.pointerId,index:picked,center,lastAngle:rotaryAngle(event,center),angle:0,start:picked===3?sliderFromFocus(targetFocus)/1000:(focal-24)/46};canvas.setPointerCapture(event.pointerId);orbit.enabled=false;rotaryHint.classList.add('used');$('#lab-tip-text').textContent=picked===3?'對焦環操作中 · 沿環面旋轉':'變焦環操作中 · 旋轉改變焦距';event.stopImmediatePropagation()}else{lab.classList.add('parts-open');$('#lab-catalog').setAttribute('aria-expanded','true');window.lensDemo?.select(picked,{speak:false})}}dirty=true;run();
  },true);
  canvas.addEventListener('pointermove',event=>{
    if(drag){const a=rotaryAngle(event,drag.center);if(a!==null&&drag.lastAngle!==null){drag.angle+=Math.atan2(Math.sin(a-drag.lastAngle),Math.cos(a-drag.lastAngle));drag.lastAngle=a}const value=THREE.MathUtils.clamp(drag.start+drag.angle/(drag.index===3?FOCUS_TRAVEL:Math.PI*1.1),0,1);
      if(drag.index===3)setFocus(focusFromSlider(value*1000));else{focal=Math.round(24+value*46);$('#lab-focal').value=String(focal);$('#lab-focal-value').textContent=focal+' mm';$('#focal').value=String(focal);updateOptics();run()}return}
    if(event.buttons)return;const result=hit(event);canvas.style.cursor=result?(result.object.userData.part===3?'ew-resize':'pointer'):'grab';
    $('#lab-tip-text').textContent=result?(result.object.userData.bodyPart?bodyDescriptions[result.object.userData.bodyPart][0]+' · 點選查看功能':partProfiles[result.object.userData.part].name+(result.object.userData.part===3||result.object.userData.part===4?' · 沿環面拖曳旋轉':' · 點選查看功能')):'拖曳空白處轉動視角 · 滾輪靠近觀察';
  });
  function release(){if(drag){try{canvas.releasePointerCapture(drag.id)}catch{}drag=null;orbit.enabled=true;$('#lab-tip-text').textContent='轉動對焦環，清晰就會移動'}}
  canvas.addEventListener('pointerup',release);canvas.addEventListener('pointercancel',release);canvas.addEventListener('wheel',stopAuto,{passive:true});
  orbit.addEventListener('change',()=>{viewMovingUntil=clock+.15;run()});orbit.addEventListener('start',()=>{stopAuto();viewMovingUntil=clock+.15;run()});
  canvas.addEventListener('keydown',event=>{let used=true;if(event.key==='ArrowLeft')camera.position.applyAxisAngle(new THREE.Vector3(0,1,0),-.08);else if(event.key==='ArrowRight')camera.position.applyAxisAngle(new THREE.Vector3(0,1,0),.08);else if(event.key==='ArrowUp')setFocus(targetFocus*1.1);else if(event.key==='ArrowDown')setFocus(targetFocus/1.1);else if(event.key.toLowerCase()==='f')select(3);else used=false;if(used){event.preventDefault();stopAuto();orbit.update();dirty=true;run()}});
  $('#lab-focus').addEventListener('input',e=>{select(3);setFocus(focusFromSlider(Number(e.target.value)))});
  $$('[data-focus]').forEach(b=>b.addEventListener('click',()=>{select(3);setFocus(Number(b.dataset.focus))}));
  $('#lab-aperture').addEventListener('input',e=>{stopAuto();aperture=apertureStops[Number(e.target.value)];$('#lab-aperture-value').textContent='f/'+aperture;$('#aperture').value=e.target.value;$('#aperture').dispatchEvent(new Event('input'));select(6);updateOptics();run()});
  $('#lab-focal').addEventListener('input',e=>{stopAuto();focal=Number(e.target.value);$('#lab-focal-value').textContent=focal+' mm';$('#focal').value=e.target.value;$('#focal').dispatchEvent(new Event('input'));updateOptics();run()});
  $('#lab-spread').addEventListener('input',e=>{stopAuto();targetSpread=Number(e.target.value)/100;cutaway=targetSpread<.15;$$('[data-lab-mode]').forEach(b=>{const on=b.dataset.labMode===(targetSpread>.01?'exploded':'cutaway');b.classList.toggle('active',on);b.setAttribute('aria-pressed',String(on))});dirty=true;run()});
  $$('[data-lab-mode]').forEach(b=>b.addEventListener('click',()=>{stopAuto();setMode(b.dataset.labMode)}));
  function startDemo(){resetView();closeBody();orbit.update();auto=true;canvas.dataset.demoPlaying='true';demoTime=0;aperture=5.6;focal=24;shutterIndex=2;$('#shutter-speed').value='2';canvas.dataset.shutterSeconds=String(shutterStops[2].seconds);targetFocus=.65;setMode('cutaway');demoStatus.hidden=false;demoStatus.textContent='前景樹木';$('#lab-play').setAttribute('aria-pressed','true');$('#lab-play').innerHTML='<span class="play-mark">Ⅱ</span> <span>暫停導覽</span>';dirty=true;run()}
  $('#lab-play').addEventListener('click',()=>{if(auto)stopAuto();else startDemo()});
  let userInteracted=false;
  function interruptDemo(event){userInteracted=true;if(event.target.closest?.('#lab-play'))return;stopAuto()}
  for(const type of ['pointerdown','wheel','keydown','click','input','change'])lab.addEventListener(type,interruptDemo,{capture:true,passive:true});
  $('#lab-rays').addEventListener('click',()=>{rayOn=!rayOn;$('#lab-rays').setAttribute('aria-pressed',String(rayOn));rayLines.visible=rayOn;photons.visible=rayOn;dirty=true;run()});
  $('#stabilize').addEventListener('click',()=>{dirty=true;run()});
  function resetView(){wideShot=false;rearView=false;inspectGarden=false;gardenButton.setAttribute('aria-pressed','false');gardenButton.textContent='景觀特寫';rearButton.setAttribute('aria-pressed','false');$('#lab-shot').textContent='鏡頭特寫';lab.classList.remove('rear-view');canvas.dataset.view='lens';camera.position.copy(home);orbit.target.copy(targetHome);if(compactViewport)orbit.target.x-=.5}
  $('#lab-reset').addEventListener('click',()=>{stopAuto();resetView();orbit.update();dirty=true;run()});
  $('#lab-full').textContent='◩';$('#lab-full').setAttribute('aria-label','隱藏操作介面');$('#lab-full').title='隱藏操作介面（H）';
  $('#lab-full').addEventListener('click',()=>lab.classList.toggle('clean-view'));
  $('#lab-catalog').addEventListener('click',()=>{closeBody();const on=lab.classList.toggle('parts-open');$('#lab-catalog').setAttribute('aria-expanded',String(on));if(on)window.lensDemo?.select(selected,{speak:false})});
  partSelect.addEventListener('change',()=>select(Number(partSelect.value)));
  $('#lab-diagram').addEventListener('click',()=>{stopAuto();diagram.hidden=false;diagram.querySelector('details').open=true});$('#close-diagram').addEventListener('click',()=>diagram.hidden=true);
  $('#lab-browser-full').addEventListener('click',async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else await lab.requestFullscreen()}catch{}});
  $('#lab-shot').addEventListener('click',()=>{stopAuto();const wide=!wideShot;resetView();wideShot=wide;camera.position.copy(wideShot?new THREE.Vector3(1.1,3.5,8.4):home);orbit.target.copy(wideShot?new THREE.Vector3(-2.15,1.6,0):targetHome);$('#lab-shot').textContent=wideShot?'實驗台全景':'鏡頭特寫';orbit.update();dirty=true;run()});
  gardenButton.addEventListener('click',()=>{stopAuto();const next=!inspectGarden;resetView();inspectGarden=next;gardenButton.setAttribute('aria-pressed',String(next));gardenButton.textContent=next?'返回全景':'景觀特寫';if(next){camera.position.set(1.9,3.3,6);orbit.target.set(4.6,1.1,0);rotaryHint.classList.add('used');canvas.dataset.view='garden';$('#lab-tip-text').textContent='Blender 景觀模型檢視 · 主畫面景深暫停，感光元件預覽仍可對焦';}else{$('#lab-tip-text').textContent='拖曳畫面旋轉 · 拖曳對焦環對焦';}orbit.update();dirty=true;run()});
  rearButton.addEventListener('click',()=>{stopAuto();const rear=!rearView;resetView();rearView=rear;rearButton.setAttribute('aria-pressed',String(rear));lab.classList.toggle('rear-view',rear);canvas.dataset.view=rear?'image-back':'lens';if(rear){camera.position.set(-12.5,3.1,3.2);orbit.target.set(-4.1,1.3,0);rotaryHint.classList.add('used');$('#lab-tip-text').textContent='36 × 24 mm CMOS · 背面影像僅在「成像透視」開啟時顯示';$('#announcement').textContent='已繞到 3:2 成像面背面。實際感光元件不透明，此處是成像透視示意。'}orbit.update();dirty=true;run()});
  function savePhoto(){
    const settings=shotSettings??shutterStops[shutterIndex],moving=!!rotor;
    const times=exposureTimes(motionTime,settings.seconds,moving);let accumulated;
    preview.setSize(sensorFormat.captureWidth,sensorFormat.captureHeight,false);photoRT.setSize(sensorFormat.captureWidth,sensorFormat.captureHeight);uniforms.resolution.value.set(sensorFormat.captureWidth,sensorFormat.captureHeight);
    try{
      accumulated=integrateExposure({renderer:preview,scene,camera:photoCamera,source:photoRT,times,pose:poseMotion});
      uniforms.tColor.value=accumulated.texture;uniforms.exposure.value=exposureGain(aperture,settings.seconds);preview.render(screenScene,screenCamera);
      gallery.add(photo.toDataURL('image/png'),`${settings.label} · ${focal} mm · f/${aperture} · 對焦 ${focus.toFixed(2)} m · ISO 100`);
      canvas.dataset.captureSamples=String(times.length);canvas.dataset.captureShutter=String(settings.seconds);
      $('#announcement').textContent='已拍攝 '+settings.label+'、3:2 照片。'+(moving&&times.length>1?'已累積曝光期間的風車運動。':'風車動作凍結。')+'已套用曝光模擬。'+'可在相簿放大檢視與切換照片。';
    }catch(error){console.error('Photo exposure failed',error);$('#announcement').textContent='拍攝未完成，請重試。'}
    finally{
      uniforms.tColor.value=photoRT.texture;accumulated?.dispose();poseMotion(motionTime);
      preview.setSize(PREVIEW_W,PREVIEW_H,false);photoRT.setSize(PREVIEW_W,PREVIEW_H);uniforms.resolution.value.set(PREVIEW_W,PREVIEW_H);renderPhoto();
    }
    flash.classList.remove('shoot');void flash.offsetWidth;flash.classList.add('shoot');dirty=true;run();
  }
  function takePhoto(){if(shotStarted!==null)return;stopAuto();shotSettings={...shutterStops[shutterIndex]};shotStarted=clock;shotSaved=false;shutter.disabled=true;$('#announcement').textContent='拍攝 '+shotSettings.label+'：機構動作放慢以便觀察，照片依設定曝光時間累積。';if(reduce.matches){updateOptics();savePhoto();shotStarted=null;shutter.disabled=false;}dirty=true;run()}
  shutter.addEventListener('click',takePhoto);
  photo.style.cursor='crosshair';photo.addEventListener('pointerdown',e=>e.stopPropagation());photo.addEventListener('click',event=>{const r=photo.getBoundingClientRect();pointer.set((event.clientX-r.left)/r.width*2-1,-(event.clientY-r.top)/r.height*2+1);raycaster.setFromCamera(pointer,photoCamera);const h=raycaster.intersectObjects(props.children,true)[0];if(h){setFocus(.35*Math.pow(20/.35,(h.point.x-1.8)/5.3));focusMode='AF-S'}});
  document.addEventListener('keydown',e=>{if(gallery.isOpen)return;if(e.key==='Escape'){closeBody();lab.classList.remove('clean-view','parts-open');$('#lab-catalog').setAttribute('aria-expanded','false');diagram.hidden=true}if(!/INPUT|SELECT|BUTTON/.test(e.target.tagName)){if(e.key.toLowerCase()==='h')lab.classList.toggle('clean-view');if(e.key===' '){e.preventDefault();takePhoto()}}});
  // Keep diagram controls connected to the 3D view as well.
  $('#aperture').addEventListener('input',e=>{aperture=apertureStops[Number(e.target.value)];$('#lab-aperture').value=e.target.value;$('#lab-aperture-value').textContent='f/'+aperture;stopAuto();updateOptics();run()});
  $('#focal').addEventListener('input',e=>{focal=Number(e.target.value);$('#lab-focal').value=e.target.value;$('#lab-focal-value').textContent=focal+' mm';stopAuto();updateOptics();run()});
  new IntersectionObserver(entries=>{visible=entries.at(-1).isIntersecting;if(visible)run()},{rootMargin:'100px'}).observe(wrap);
  document.addEventListener('visibilitychange',()=>{if(document.hidden)animationLoop.stop();else run()});
  reduce.addEventListener('change',()=>{if(reduce.matches)stopAuto();dirty=true;run()});
  canvas.addEventListener('webglcontextlost',event=>{event.preventDefault();$('#lab-loading').classList.remove('ready');$('#lab-loading').removeAttribute('aria-hidden');$('#lab-loading').textContent='3D 顯示已暫停，重新載入頁面即可恢復。零件圖解仍可使用。';$('.technical-view').open=true;stopAuto()});
  const animationLoop=createFrameLoop({draw:tick,visible:()=>visible&&!document.hidden,request:callback=>requestAnimationFrame(callback),cancel:handle=>cancelAnimationFrame(handle)});
  function run(){animationLoop.request()}
  function renderPhoto(){uniforms.exposure.value=previewGain(liveView,uniforms.aperture.value);preview.setRenderTarget(photoRT);preview.render(scene,photoCamera);preview.setRenderTarget(null);preview.render(screenScene,screenCamera);sensorMap.needsUpdate=true;lastPhoto=clock}
  function tick(elapsed){
    const dt=Math.min(elapsed,1/30);clock+=elapsed;
    motionTime+=elapsed;poseMotion(motionTime);
    if(shotStarted!==null)dirty=true;
    if(auto){
      demoTime+=elapsed;const demo=demoFrame(demoTime);targetFocus=demo.focus;targetSpread=demo.spread;focal=Math.round(demo.focal);aperture=Math.round(demo.aperture*10)/10;
      $('#lab-focal').value=String(focal);$('#focal').value=String(focal);$('#lab-focal-value').textContent=focal+' mm';
      const aperturePosition=apertureStops.reduce((best,value,i)=>Math.abs(value-aperture)<Math.abs(apertureStops[best]-aperture)?i:best,0);$('#lab-aperture').value=String(aperturePosition);$('#aperture').value=String(aperturePosition);$('#lab-aperture-value').textContent='f/'+aperture;
      if(demoStatus.textContent!==demo.stage)demoStatus.textContent=demo.stage;dirty=true;
    }
    focus=reduce.matches&&!auto?targetFocus:THREE.MathUtils.damp(focus,targetFocus,7,dt);spread=reduce.matches&&!auto?targetSpread:THREE.MathUtils.damp(spread,targetSpread,5,dt);if(Math.abs(focus-targetFocus)<.0003)focus=targetFocus;if(Math.abs(spread-targetSpread)<.0003)spread=targetSpread;
    updateOptics();
    for(let i=0;i<groups.length;i++)groups[i].position.x=groups[i].userData.rest+(5.5-i)*.16*spread;
    groups[3].rotation.x=focusAngle(focus);groups[4].rotation.x=(focal-24)/46*Math.PI*1.1;indexHousing.position.x=groups[3].position.x+.225;
    if(!rotaryHint.classList.contains('used')){const guide=groups[3].getWorldPosition(new THREE.Vector3()).add(new THREE.Vector3(0,.9,.2)).project(camera),gw=wrap.clientWidth,gh=wrap.clientHeight;rotaryHint.style.transform=`translate(${THREE.MathUtils.clamp((guide.x*.5+.5)*gw-70,18,gw-235)}px,${Math.max(85,(-guide.y*.5+.5)*gh-76)}px)`;}
    const stable=$('#stabilize').getAttribute('aria-pressed')==='true',vr=stabilizationOffset(clock,stable&&!reduce.matches);vrCarriage.position.set(vr.x,vr.y,vr.z);
    const exposure=exposureState(shotStarted===null?null:clock-shotStarted,liveView);body.update({state:exposure,xray:sensorXray,showCircle:showImageCircle,showRays:rayOn});
    if($('#body-state').textContent!==exposure.phase)$('#body-state').textContent=exposure.phase;
    photo.parentElement.classList.toggle('viewfinder-blackout',!liveView&&exposure.mirrorLift>.01);
    canvas.dataset.mirrorLift=String(exposure.mirrorLift);canvas.dataset.shutterPhase=exposure.phase;canvas.dataset.liveView=String(liveView);canvas.dataset.sensorXray=String(sensorXray);
    if(exposure.record&&!shotSaved){shotSaved=true;savePhoto()}
    if(exposure.done){shotStarted=null;shutter.disabled=false;updateOptics();dirty=true;}
    for(const pair of shells){pair.cut.visible=cutaway&&spread<.3;pair.full.visible=!pair.cut.visible}
    if(rayOn&&rayPaths.length&&!reduce.matches){const pos=photonsGeo.attributes.position;for(let i=0;i<9;i++){const t=(clock*.33+i*.113)%1,u=t*3,j=Math.min(2,Math.floor(u)),p=new THREE.Vector3().lerpVectors(rayPaths[i][j],rayPaths[i][j+1],u-j);pos.setXYZ(i,p.x,p.y,p.z)}pos.needsUpdate=true}
    orbit.update();
    // Bound the second WebGL renderer even while controls change every frame.
    if(lastPhoto===0||clock-lastPhoto>=.1)renderPhoto();
    if(inspectGarden)renderer.render(scene,camera);else sceneFinish.render(scene,focus,focal,aperture,!!drag||clock<viewMovingUntil);
    dirty=false;
    if(canvas.dataset.studio){canvas.dataset.ready='true';document.body.classList.remove('lab-booting');$('#lab-loading').classList.add('ready');$('#lab-loading').setAttribute('aria-hidden','true');}
    return true;
  }
  buildAtelier({scene,props,bench,groups,body,nearX,midX,farX,label,materials,onRotor:value=>{rotor=value;poseMotion(motionTime)},onLoad:error=>{canvas.dataset.studio=error?'error':'ready';if(!error&&!userInteracted)startDemo();dirty=true;run()}});
  document.querySelector('.immersive-brand>div').innerHTML='HUGO <small>光學工作室</small>';
  document.querySelector('.lab-version').textContent='OPTICAL ATELIER / 001';
  $('#lab-focal').value='24';$('#focal').value='24';$('#lab-focal-value').textContent='24 mm';select(3);updateOptics();resize();run();
}
