import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import * as k from './kit/iso-kit.mjs';
import * as G from './kit/lathe.mjs';
import * as A from './kit/audit.mjs';
import {parts} from './parts.mjs';

// A generic teaching model, with real closed solids, not a particular lens prescription.
const W=1080,H=530, F=G.frameAlong([0,0,0],[0,-1,0]);
const bounds=[];
for(const s of [-305,235]) for(const x of [-49,49]) for(const z of [-49,49]) bounds.push([x,-s,z]);
const P=k.fitProjection(bounds,W,H,{pad:66,azimuth:34,elevation:25});
const states=Array.from({length:11},(_,i)=>i/10);
const R=A.recorder(P,{ground:shape=>shape.piece==='mount'});
let serial=0;
const motions={};
for(let i=0;i<parts.length;i++) motions[parts[i].id]=G.mul3(F.a,(i-5.5)*30);
const S=k.solidSvg,L=k.lineSvg,at=p=>k.iso(p,P),pt=(s,r,a)=>G.pointOf(F,s,r,a);
function put(id,svg,shape,ref,extra={}) {
  const name=`${id}.${++serial}`;
  const solid=R.solid({...shape,name,owner:name});
  return R.put({piece:id,name,move:motions[id],at:ref,svg,shapes:[solid],...extra});
}
function band(id,s0,s1,ri,ro,{ribs=0,seams=[],cls='',tone='mid',split=false}={}) {
  if(split){
    const centers={front:[-98,-90.5],variator:[-29,-22,-15],iris:[-5],stabilizer:[26],rear:[43,54]}[id]??[];
    const count=Math.ceil((s1-s0)/.7);
    for(let i=0;i<count;i++){
      const from=s0+(s1-s0)*i/count,to=s0+(s1-s0)*(i+1)/count;
      if(centers.some(c=>c+.56>=from&&c-.56<=to)){
        // A ring surrounding glass needs separate near and far shells for true occlusion.
        const view=G.viewOf(P),phi=Math.atan2(G.dot3(F.v,view),G.dot3(F.u,view));
        for(let half=0;half<2;half++){
          const angles=Array.from({length:49},(_,j)=>phi-Math.PI/2+half*Math.PI+j*Math.PI/48);
          const poly=[...angles.map(a=>[ro*Math.cos(a),ro*Math.sin(a)]),...angles.toReversed().map(a=>[ri*Math.cos(a),ri*Math.sin(a)])];
          const paths=G.prismOf(F,poly,from,to,P);
          // prismOf uses a convex hull for general boxes; a half-annulus must retain its void.
          paths.fill=paths.shades.join('')+paths.top;
          const projectAt=(s,p)=>at(G.add3(G.mul3(F.a,s),G.add3(G.mul3(F.u,p[0]),G.mul3(F.v,p[1]))));
          paths.outline=k.pathOf(poly.map(p=>projectAt(from,p)),true);
          const seen=poly.map((p,j)=>{const q=poly[(j+1)%poly.length];return G.dot3(G.add3(G.mul3(F.u,q[1]-p[1]),G.mul3(F.v,p[0]-q[0])),view)>0});
          for(let j=0;j<poly.length;j++)if(seen[j]!==seen[(j+poly.length-1)%poly.length])paths.outline+=k.pathOf([projectAt(from,poly[j]),projectAt(to,poly[j])]);
          put(id,S(paths,{tone,crease:'none'}),A.prism(F,poly,from,to),pt((from+to)/2,(ri+ro)/2,phi+half*Math.PI));
        }
      } else band(id,from,to,ri,ro,{tone,cls});
    }
    return;
  }
  let lines=seams.map(s=>L(G.arcOf(F,s,ro,P),{tone:'faint'})).join('');
  if(ribs) lines+=L(G.ribsOf(F,s0+.8,s1-.8,ro,ribs,P,{seams:true}),{tone:'lo'});
  const paths=G.ringBand(s0,s1,ri,ro,F,P,{bevel:.35});
  return put(id,S(paths,{tone,inner:lines,className:cls}),A.ring(F,s0,s1,ri,ro),pt((s0+s1)/2,0,0));
}
function lens(id,center,r,width=5,moving=false) {
  const meridian=[];
  // Two convex spherical-like faces, with a cylindrical edge that seats in its cell.
  for(let i=0;i<=18;i++){const y=i/18;meridian.push([center-width/2+(width/2-.55)*y*y,r*y]);}
  for(let i=18;i>=0;i--){const y=i/18;meridian.push([center+width/2-(width/2-.55)*y*y,r*y]);}
  const body=S(G.lathe(meridian,F,P,{steps:100,smooth:{rows:5}}),{tone:'hi',crease:'none',className:'glass'});
  const rim=L(G.circleOf(F,center-.55,r,P),{tone:'mid'});
  const item=put(id,body+rim,A.lathe(F,meridian),pt(center,0,0));
  if(moving) item.motion='zoom';
}
function pin(id,s0,s1,r,rad,angle) {
  const origin=pt(0,rad,angle),frame=G.frameAlong(origin,F.a);
  put(id,S(G.disc(s0,s1,r,frame,P),{tone:'hi',className:'contact'}),A.disc(frame,s0,s1,r),G.pointOf(frame,(s0+s1)/2,0,0));
}
const hoodProfile=[[-140,44],[-140,47],[-137,47],[-114,40],[-114,37],[-137,44]];
put('hood',S(G.lathe(hoodProfile,F,P,{steps:120}),{tone:'mid',inner:L(G.arcOf(F,-137,47,P),{tone:'lo'})}),A.lathe(F,hoodProfile),pt(-126,0,0));
band('hood',-114,-112,37,40,{seams:[-113]});
band('filter',-112,-110,33,40);
band('filter',-110,-106,33,39,{seams:[-109,-108,-107]});
band('filter',-106,-104,33,40);
band('front',-104,-102,32,39,{tone:'hi'});
band('front',-102,-88,32,38,{split:true});
band('front',-88,-86,32,39);
lens('front',-98,32,5);lens('front',-90.5,32,4);
band('focus',-86,-83,33,40);
band('focus',-83,-67,33,40,{ribs:136,cls:'rubber'});
band('focus',-67,-64,33,40);
band('zoom',-64,-61,33,41);
band('zoom',-61,-37,33,41,{ribs:144,cls:'rubber'});
band('zoom',-37,-34,33,41);
band('variator',-34,-32,29,38);band('variator',-32,-12,29,36,{split:true});band('variator',-12,-10,29,38);
lens('variator',-29,29,4,true);lens('variator',-22,29,4,true);lens('variator',-15,29,4,true);
band('iris',-10,-9,27,38);band('iris',-9,-1,27,36,{split:true});band('iris',-1,0,27,38);
const bladePolys=[];
for(let j=0;j<9;j++) {
  const a=j*Math.PI*2/9,b=(j+1)*Math.PI*2/9;
  const polygon=[[27*Math.cos(a),27*Math.sin(a)],[27*Math.cos(b),27*Math.sin(b)],[11*Math.cos(b),11*Math.sin(b)],[11*Math.cos(a),11*Math.sin(a)]];
  bladePolys.push(polygon);
  const d=k.pathOf(polygon.map(([u,v])=>at(G.add3(G.add3(F.o,G.mul3(F.a,-5)),G.add3(G.mul3(F.u,u),G.mul3(F.v,v))))),true);
  put('iris',`<path class="blade" data-blade="${j}" d="${d}"/>`,A.prism(F,polygon,-5.3,-5),pt(-5,0,0));
}
band('motor',0,2,29,38);band('motor',2,14,29,37,{ribs:64,seams:[5,11]});band('motor',14,16,29,38);
band('stabilizer',16,18,27,36);band('stabilizer',18,34,27,34,{split:true});band('stabilizer',34,36,27,36);
lens('stabilizer',26,27,6);
band('rear',36,38,24,34);band('rear',38,58,24,32,{split:true});band('rear',58,60,24,34);
lens('rear',43,24,4);lens('rear',54,24,5);
band('mount',60,62,34,38,{tone:'hi'});band('mount',62,66,34,37,{seams:[63,65],tone:'hi'});band('mount',66,68,34,38,{tone:'hi'});
for(let j=0;j<6;j++)pin('mount',59.3,60,.7,35.5,j*Math.PI/3+.2);
band('contacts',68,70,28,36,{tone:'hi'});
for(let j=0;j<8;j++)pin('contacts',67.3,68,.85,32,j*.115+1.1);

// The same positions are used for geometry verification and browser motion.
if(process.argv.includes('--audit')) {
  A.settle(R,P,{states});
  A.auditOrExit(R,P,{frames:states,apart:true});
} else {
  A.settle(R,P,{states});
}
const items=R.items.sort((a,b)=>a.key-b.key);
const body=items.map(item=>`<g class="it" data-piece="${item.piece}" data-key="${item.key}" data-move='${JSON.stringify(item.move)}' ${item.motion?'data-motion="zoom"':''}>${item.svg}</g>`).join('');
const art=k.figureSvg({width:W,height:H,label:'通用變焦鏡頭等角透視拆解模型。點選零件或使用下方清單探索。',body:`<defs><radialGradient id="floorFade"><stop stop-color="var(--anatomy-halo)" stop-opacity=".45"/><stop offset="1" stop-color="var(--anatomy-halo)" stop-opacity="0"/></radialGradient></defs><ellipse cx="535" cy="405" rx="410" ry="42" fill="url(#floorFade)"/><g id="assembly">${body}</g>`});
const data={P,F,parts,motions,bladePolys,W,H,solidCount:R.solids.length};
const ico=(name)=>({sun:'<circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5"/>',play:'<path d="m8 5 11 7-11 7Z"/>',reset:'<path d="M4 10a8 8 0 1 1 1 7M4 4v6h6"/>',arrow:'<path d="M5 12h14m-6-6 6 6-6 6"/>',aperture:'<circle cx="12" cy="12" r="9"/><path d="m8 4 5 8m8-4-10 0m8 11-5-9M9 21l5-9M3 15h10M5 5l-1 10"/>'}[name]);
const icon=(name)=>`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ico(name)}</svg>`;
const html=`<!doctype html><html lang="zh-Hant"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="theme-color" content="#111311"><meta name="description" content="以互動等角透視拆解單眼相機鏡頭，探索12個關鍵部分，操作光圈、焦距與光路示意。"><title>鏡頭解剖室 — Lens Anatomy</title><style>${readFileSync(new URL('./kit/iso.css',import.meta.url),'utf8')}\n${readFileSync(new URL('./style.css',import.meta.url),'utf8')}</style></head>
<body class="iso" data-theme="dark"><a href="#explore" class="skip">跳到互動展示</a>
<nav class="nav"><a class="brand" href="#top">${icon('aperture')}<span>ANATOMY<span class="brand-cn">物件解剖室</span></span></a><div class="nav-right"><a href="#explore">構造探索</a><a href="#notes">光學筆記</a><span class="nav-divider"></span><button id="theme" class="icon-button" aria-label="切換淺色主題" title="切換主題">${icon('sun')}</button></div></nav>
<main id="top"><header class="intro"><div><p class="eyebrow"><span class="tiny-line"></span>THE OPTICS SERIES <span class="dim">/ 001</span></p><h1>鏡頭裡的<span>精密世界。</span></h1></div><div class="intro-copy"><p>從第一道光，到一張影像。<br>拆開單眼相機鏡頭，探索每個零件的任務。</p><span class="mono intro-meta">INTERACTIVE LENS ANATOMY <span>↙</span></span></div></header>
<section id="explore" aria-label="互動鏡頭拆解展示"><div class="workspace"><div class="visual-column"><div class="work-toolbar"><div class="mode-tabs" role="group" aria-label="展示模式"><button class="active" data-mode="explode" aria-pressed="true">拆解構造</button><button data-mode="assembled" aria-pressed="false">鏡頭組裝</button><button data-mode="light" aria-pressed="false">光路原理</button></div><button id="tour" class="tour" aria-pressed="false">${icon('play')}<span>自動導覽</span></button></div>
<div class="figure-card iso-plate"><div class="figure-top"><span class="mono">FIG. 01 <span class="dim">/</span> LENS ASSEMBLY</span><span class="badge">通用變焦鏡頭</span></div><div id="scene" class="scene" tabindex="0" role="group" aria-label="鏡頭零件互動圖。左右方向鍵選取零件，Enter 切換組裝。">${art}</div>
<div id="light-scene" class="light-scene" hidden><svg id="optics" viewBox="0 0 1080 530" role="img" aria-label="等效薄透鏡光路示意"><defs><linearGradient id="lensFill" x2="1" y2="0"><stop stop-color="currentColor" stop-opacity=".03"/><stop offset=".5" stop-color="currentColor" stop-opacity=".13"/><stop offset="1" stop-color="currentColor" stop-opacity=".03"/></linearGradient></defs><path class="opt-axis" d="M100 265H970"/><g id="ray-back"></g><path class="opt-lens" d="M480 110Q420 265 480 420Q540 265 480 110Z"/><g id="opt-stop"></g><g id="ray-front"></g><g id="sensor"><path class="sensor-body" d="M880 168h14v194h-14Z"/><path class="sensor-surface" d="M879 181v168"/></g><circle cx="480" cy="265" r="3" class="opt-center"/></svg><div class="opt-labels mono"><span>物方光線 →</span><span>等效薄透鏡</span><span>→ 成像平面</span></div><p class="opt-note">光路採等效薄透鏡示意，非實際多鏡組的光線追跡。</p></div>
<div class="figure-bottom"><span id="figure-hint">點選零件探索 · ← → 切換</span><span id="readout" class="mono">EXPLODED · 12 ASSEMBLIES</span></div><div class="zoom-tools"><button id="zoom-out" aria-label="縮小圖示">−</button><button id="zoom-in" aria-label="放大圖示">＋</button><button id="reset" aria-label="重設展示" title="重設展示">${icon('reset')}</button></div></div>
<div class="explosion-control"><span>組裝</span><input id="explode" type="range" min="0" max="100" value="100" aria-label="零件拆解程度"><span>拆解</span><output id="explode-value" class="mono">100%</output></div>
<div class="lens-controls"><div class="control-label"><span class="control-dot"></span><span>光學控制台</span><span class="mono dim">LIVE</span></div><div class="control-unit"><div><label for="aperture">光圈</label><output id="aperture-value" class="mono">f/5.6</output></div><input id="aperture" type="range" min="0" max="5" step="1" value="2" aria-valuetext="f/5.6"><div class="range-labels mono"><span>f/2.8</span><span>f/16</span></div></div><div class="control-unit"><div><label for="focal">焦距</label><output id="focal-value" class="mono">50 mm</output></div><input id="focal" type="range" min="24" max="70" step="1" value="50"><div class="range-labels mono"><span>24 mm</span><span>70 mm</span></div></div><div class="light-readout"><span>相對入光量<sup>＊</sup></span><strong id="light-ratio" class="mono">25%</strong><span id="fov-value" class="mono">水平視角 39.6°</span></div></div>
</div><aside class="detail-panel" aria-label="選取零件說明"><div class="detail-top"><span class="mono">COMPONENT PROFILE</span><span id="detail-counter" class="mono">07 / 12</span></div><div class="part-identity"><div class="part-number mono" id="part-number">07</div><span id="part-category" class="category">光學系統</span></div><h2 id="part-name">光圈葉片</h2><p id="part-en" class="part-en mono">APERTURE DIAPHRAGM</p><div id="mini-art" class="mini-art" aria-hidden="true"></div><h3 id="part-title">一個開口，決定光的份量。</h3><p id="part-desc" class="part-desc"></p><div class="detail-rule"></div><span class="detail-label">觀察重點</span><p id="part-action" class="part-action"></p><button id="stabilize" class="stabilize" aria-pressed="false" hidden>啟動防手震示意</button><div class="fact"><span class="detail-label">再多懂一點</span><p id="part-note"></p></div><div class="part-pager"><button id="prev-part" aria-label="上一個零件">←</button><span id="pager-label" class="mono">APERTURE DIAPHRAGM</span><button id="next-part" aria-label="下一個零件">→</button></div></aside></div>
<div class="figure-caption"><span><i class="legend-glass"></i>光學鏡組 <i class="legend-shell"></i>機械結構 <i class="legend-active"></i>選取部分</span><p>教學示意：零件比例、位置與片數經簡化；配置會因鏡頭設計而異。</p></div>
<div class="parts-heading"><h2>一顆鏡頭，十二個關鍵。</h2><span class="mono">SELECT A COMPONENT ↓</span></div><div class="parts-grid" aria-label="零件清單">${parts.map((p,i)=>`<button class="part-button${i===6?' selected':''}" data-select="${i}" aria-pressed="${i===6}"><span class="part-button-top"><span class="mono">${String(i+1).padStart(2,'0')}</span><span class="part-arrow">↗</span></span><strong>${p.name}</strong><span>${p.short}</span><i class="part-strip"></i></button>`).join('')}</div>
</section>
<section id="notes" class="notes"><div class="notes-heading"><p class="eyebrow">FOLLOW THE LIGHT</p><h2>把零件串起來，<br>就是一張照片的旅程。</h2><p>光學、機械與電子控制，在按下快門前協同工作。</p></div><div class="note-flow"><button class="note-row" data-jump="2"><span class="mono">01</span><div><h3>收集與校正</h3><p>遮光罩阻擋雜光，鏡組共同彎折光線並修正像差。</p></div>${icon('arrow')}</button><button class="note-row" data-jump="6"><span class="mono">02</span><div><h3>調整與控制</h3><p>變焦決定取景範圍，對焦選擇清晰距離，光圈控制光束。</p></div>${icon('arrow')}</button><button class="note-row" data-jump="10"><span class="mono">03</span><div><h3>傳遞與成像</h3><p>光經後鏡組與接環進入機身，於感光元件或底片上成像。</p></div>${icon('arrow')}</button></div></section>
<section class="footnotes"><p>＊相對入光量以 f/2.8 為 100%，依 (2.8 ÷ f 值)² 計算，忽略透光損耗、漸暈與近攝效應。水平視角以 36 mm 寬的全片幅感光元件計算。光圈開口以固定焦距下的相對尺寸呈現。</p><details><summary>關於這份展示與資料來源 <span>＋</span></summary><div class="source-content"><p>此模型整合現代單眼用變焦鏡頭的常見構造，並非特定品牌或型號的維修圖。防手震、鏡內馬達、密封圈與電子光圈依機種而異；外部鏡筒在展示中分段攤開，便於觀察。</p><p>插圖使用 <a href="https://github.com/wheresryan22/anatomy" target="_blank" rel="noopener">Anatomy SVG kit（MIT）</a>。技術說明參考 <a href="https://cdn-10.nikon-cdn.com/pdf/manuals/lenses/AF/AFS70-200_4GEDVR.pdf" target="_blank" rel="noopener">Nikon 鏡頭使用說明</a>、<a href="https://www.nikonusa.com/c/lenses/dslr-lenses/technology" target="_blank" rel="noopener">NIKKOR 鏡頭技術</a>與 <a href="https://files.canon-europe.com/files/webcontent/rf-lens-world/features/technology/index.html?pop=pop28" target="_blank" rel="noopener">Canon 光學防手震原理</a>。</p></div></details></section>
<footer><a class="footer-brand" href="#top">ANATOMY <span>一層一層，理解世界。</span></a><span class="mono">OPTICS STUDY NO. 001</span><a href="#top" aria-label="回到頂端">回到頂端 ↑</a></footer><div id="announcement" class="sr-only" aria-live="polite" aria-atomic="true"></div>
</main><script>const MODEL=${JSON.stringify(data)};\n${readFileSync(new URL('./app.js',import.meta.url),'utf8')}</script></body></html>`;
mkdirSync(new URL('./dist/',import.meta.url),{recursive:true});
writeFileSync(new URL('./dist/index.html',import.meta.url),html);

console.log(`Built standalone page · ${R.solids.length} solids · ${Math.round(Buffer.byteLength(html)/1024)} KB`);
