import {readFileSync,writeFileSync} from 'node:fs';
import {build} from 'esbuild';
import {fileURLToPath} from 'node:url';
import {parts} from './parts.mjs';
const index=new URL('./dist/index.html',import.meta.url),diagram=new URL('./dist/diagram.html',import.meta.url);
let base=readFileSync(index,'utf8');
if(base.includes('id="lab"'))base=readFileSync(diagram,'utf8');else writeFileSync(diagram,base);
const appStart=base.indexOf('<script>const MODEL='),modelEnd=base.indexOf(';\n',appStart),appEnd=base.indexOf('</script>',modelEnd);
if(appStart>=0&&modelEnd>=0&&appEnd>=0){const data=JSON.parse(base.slice(appStart+'<script>const MODEL='.length,modelEnd));data.parts=parts;base=base.slice(0,appStart)+'<script>const MODEL='+JSON.stringify(data)+';\n'+readFileSync(new URL('./app.js',import.meta.url),'utf8')+base.slice(appEnd);}
const aside=base.match(/<aside class="detail-panel"[\s\S]*?<\/aside>/)[0];
base=base.replace(aside,'');
base=base.replace('<div class="workspace">','<details class="technical-view"><summary>查看等角透視零件圖解 <span>＋</span></summary><div class="workspace">');
base=base.replace('</div>\n<div class="figure-caption">','</div></details>\n<div class="figure-caption">');
// build.mjs keeps the HTML compact, so also handle the inline closing form.
const cap=base.indexOf('<div class="figure-caption">');
if(!base.slice(0,cap).endsWith('</details>\n')&&!base.slice(0,cap).endsWith('</details>'))base=base.slice(0,cap)+'</details>'+base.slice(cap);
const lab=`<section id="lab" aria-label="3D 鏡頭互動實驗台"><div class="lab-workspace"><div class="lab-visual"><div class="lab-toolbar"><div role="group" aria-label="3D 展示模式" class="lab-modes"><button data-lab-mode="cutaway" class="active" aria-pressed="true">透視剖面</button><button data-lab-mode="assembled" aria-pressed="false">完整組裝</button><button data-lab-mode="exploded" aria-pressed="false">爆炸拆解</button></div><button id="lab-play" aria-pressed="true"><span class="play-mark">Ⅱ</span> <span>暫停示範</span></button></div>
<div class="lab-canvas-wrap" id="lab-wrap"><canvas id="lab-canvas" tabindex="0" aria-label="3D 鏡頭實驗台。拖曳轉動視角、滾輪縮放；拖曳對焦環調整焦距離。方向鍵調整視角，F 鍵選取對焦環。"></canvas><div class="lab-hud"><span class="mono lab-kicker">THE OPTICS WORKBENCH</span><h2>讓清晰，<br><em>移動到你眼前。</em></h2><div class="lab-meters"><div><span>對焦距離</span><strong id="lab-distance">2.00 <small>m</small></strong></div><div><span>景深範圍</span><strong id="lab-dof">1.77—2.30 <small>m</small></strong></div></div></div><div class="photo-panel"><div><span>取景預覽</span><span id="photo-status">中景對焦</span></div><canvas id="photo-canvas" aria-label="隨對焦距離與光圈即時變化的景深預覽"></canvas><div class="photo-footer"><span id="photo-settings">50 mm · f/5.6</span><span>LIVE VIEW <i></i></span></div></div><div class="lab-tip"><span class="tip-dot"></span><span id="lab-tip-text">拖曳畫面旋轉 · 拖曳對焦環對焦</span></div><div class="lab-camera-tools"><button id="lab-rays" aria-pressed="true" title="切換光束示意">光束</button><button id="lab-reset" aria-label="重設3D視角" title="重設視角">↺</button><button id="lab-full" aria-label="放大3D實驗台" title="放大實驗台">⛶</button></div><div id="lab-loading">正在點亮光學實驗台<span></span></div></div>
<div class="lab-focus-controls"><div class="focus-topline"><label for="lab-focus">對焦環 <span>FOCUS</span></label><output id="focus-label">中景小屋 · 2.00 m</output><div class="focus-presets" role="group" aria-label="對焦目標"><button data-focus="0.65">前景盆栽</button><button data-focus="2" class="active">中景小屋</button><button data-focus="7">遠景山丘</button></div></div><input id="lab-focus" type="range" min="0" max="1000" value="430" aria-label="對焦距離"><div class="focus-ticks"><span>0.35 m</span><span>1 m</span><span>3 m</span><span>20 m</span></div></div><div class="lab-bottom-controls"><div><label for="lab-aperture">光圈</label><input id="lab-aperture" type="range" min="0" max="5" value="2" step="1" aria-label="3D 光圈"><output id="lab-aperture-value">f/5.6</output></div><div><label for="lab-focal">焦距</label><input id="lab-focal" type="range" min="24" max="70" value="50" step="1" aria-label="3D 焦距"><output id="lab-focal-value">50 mm</output></div><div class="lab-spread"><label for="lab-spread">拆解</label><input id="lab-spread" type="range" min="0" max="100" value="0" aria-label="3D 拆解程度"><output id="lab-spread-value">0%</output></div></div></div>${aside}</div><p class="lab-caption">即時 3D · 點選零件查看功能。光束與場景距離為原理示意，景深數值採薄透鏡與 0.03 mm 容許彌散圈計算；此展示未逐片追跡鏡片光線。</p></section>`;
base=base.replace('<section id="explore"',lab+'<section id="explore"');
base=base.replace('景深範圍','拍攝景深').replace('取景預覽','感光元件預覽').replace('THE OPTICS WORKBENCH','FULL-FRAME DSLR / 24–70 mm');
// Apply the presentation before the browser can paint the document. Waiting
// for the Three.js bundle to add this class briefly exposes the diagram page.
base=base.replace('<body class="iso" data-theme="dark">','<body class="iso immersive lab-booting" data-theme="dark">');
base=base.replace('<div id="lab-loading">','<div id="lab-loading" role="status" aria-live="polite">');
base=base.replace('THE OPTICS SERIES','THE OPTICS LAB').replace('鏡頭裡的<span>精密世界。</span>','把光學，<span>轉成直覺。</span>').replace('從第一道光，到一張影像。<br>拆開單眼相機鏡頭，探索每個零件的任務。','轉動對焦環，看鏡片、光束與清晰平面一起移動。<br>親手操作，理解鏡頭內的每一個零件。').replace('href="#explore">構造探索','href="#lab">3D 實驗台');
base=base.replace('</style>',readFileSync(new URL('./lab.css',import.meta.url),'utf8')+readFileSync(new URL('./immersive.css',import.meta.url),'utf8')+'</style>');
base=base.replace('href="#explore" class="skip"','href="#lab" class="skip"');
base=base.replace('插圖使用 <a','3D 場景使用 <a href="https://threejs.org/" target="_blank" rel="noopener">Three.js（MIT）</a>；等角透視插圖使用 <a');
const result=await build({absWorkingDir:fileURLToPath(new URL('./',import.meta.url)),entryPoints:['./lab.js'],tsconfigRaw:{compilerOptions:{}},preserveSymlinks:true,bundle:true,minify:true,format:'iife',write:false,target:'es2020',legalComments:'inline'});
const code=result.outputFiles[0].text.replace(/<\/script/gi,'<\\/script');
base=base.replace('</body>',()=>'<script>'+code+'</script></body>');
const notices=readFileSync(new URL('./kit/LICENSE',import.meta.url),'utf8')+'\n'+readFileSync(new URL('./node_modules/three/LICENSE',import.meta.url),'utf8');
base=base.replace('<head>',()=>'<head><!-- Third-party licenses\n'+notices+'\n-->');
writeFileSync(index,base);writeFileSync(new URL('./index.html',import.meta.url),base);
console.log('Built 3D lens laboratory · '+Math.round(Buffer.byteLength(base)/1024)+' KB · self-contained');
