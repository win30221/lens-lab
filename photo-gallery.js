export function createPhotoGallery(parent){
  const photos=[];let selected=0,serial=0;
  const trigger=document.createElement('button');trigger.id='last-photo';trigger.hidden=true;
  trigger.innerHTML='<img alt="最近拍攝的照片"><span></span>';
  const dock=document.createElement('div');dock.className='scene-status-dock';parent.append(dock);dock.append(trigger);
  const tip=parent.querySelector('.lab-tip');if(tip)dock.append(tip);
  const dialog=document.createElement('dialog');dialog.id='photo-gallery';dialog.setAttribute('aria-labelledby','gallery-title');
  dialog.innerHTML=`<header><div><small>HUGO / PHOTO COLLECTION</small><h2 id="gallery-title">拍攝相簿</h2></div><button type="button" data-close autofocus>繼續拍攝 ×</button></header><div class="gallery-stage"><button type="button" data-prev aria-label="上一張照片">‹</button><img class="gallery-image" alt=""><button type="button" data-next aria-label="下一張照片">›</button></div><div class="gallery-info"><p role="status"></p><a download>下載這張照片 ↓</a></div><div class="gallery-thumbnails" role="group" aria-label="選擇照片"></div><footer>本次頁面保留最近 24 張照片；重新整理會清除。可用 ← → 切換、Esc 返回拍攝。</footer>`;
  parent.append(dialog);
  const find=s=>dialog.querySelector(s),strip=find('.gallery-thumbnails');
  function show(index){
    selected=Math.max(0,Math.min(index,photos.length-1));const item=photos[selected];if(!item)return;
    find('.gallery-image').src=item.url;find('.gallery-image').alt=`照片 ${item.id}：${item.details}`;
    find('.gallery-info p').textContent=`${selected+1} / ${photos.length}　·　${item.details}`;
    find('a').href=item.url;find('a').download=`hugo-photo-${String(item.id).padStart(3,'0')}.png`;
    find('[data-prev]').disabled=selected===0;find('[data-next]').disabled=selected===photos.length-1;
    dialog.classList.toggle('single-photo',photos.length===1);
    [...strip.children].forEach((button,i)=>button.setAttribute('aria-pressed',String(i===selected)));
    strip.children[selected]?.scrollIntoView({block:'nearest',inline:'nearest'});
  }
  trigger.addEventListener('click',()=>{dialog.showModal();show(selected)});
  find('[data-close]').addEventListener('click',()=>dialog.close());
  find('[data-prev]').addEventListener('click',()=>show(selected-1));
  find('[data-next]').addEventListener('click',()=>show(selected+1));
  dialog.addEventListener('keydown',event=>{
    event.stopPropagation();
    if(event.key==='ArrowLeft'||event.key==='ArrowRight'){event.preventDefault();show(selected+(event.key==='ArrowLeft'?-1:1))}
  });
  dialog.addEventListener('click',event=>{if(event.target===dialog){const r=dialog.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)dialog.close()}});
  return {get isOpen(){return dialog.open},add(url,details){
    photos.push({url,details,id:++serial});if(photos.length>24)photos.shift();
    strip.replaceChildren();
    photos.forEach((item,index)=>{const button=document.createElement('button');button.type='button';button.setAttribute('aria-label',`檢視照片 ${item.id}：${item.details}`);const img=document.createElement('img');img.src=item.url;img.alt='';button.append(img);button.addEventListener('click',()=>show(index));strip.append(button)});
    trigger.hidden=false;trigger.querySelector('img').src=url;trigger.querySelector('span').textContent=`開啟相簿 · ${photos.length} 張`;
    if(!dialog.open)dialog.showModal();show(photos.length-1);
  }};
}
