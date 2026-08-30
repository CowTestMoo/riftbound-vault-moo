(() => {
  'use strict';

  const SUPABASE_URL='https://ivqtgclygiikagfuicjd.supabase.co';
  const SUPABASE_PUBLISHABLE_KEY='sb_publishable_Iweuvn4mcU02xrDyPSJWig_uRWzAsfd';
  const SAMPLE_MS=360;
  let stream=null,timer=0,busy=false,armed=false,stableFrames=0,lastSample=null,capturedSample=null,waitingForChange=false;
  let currentResult=null,currentMatches=[],selectedCard=null;

  const esc=(v='')=>String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const norm=v=>String(v||'').toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,'');
  const num=v=>String(v||'').toUpperCase().split('//')[0].split('/')[0].replace(/[^A-Z0-9]/g,'').replace(/^([A-Z]*)(0+)(\d+)$/,'$1$3');
  const catalog=()=>window.RiftboundApp?.getCatalog?.()||[];
  const nameOf=c=>c?.fullName||c?.name||c?.cardCode||'Unknown card';
  const owned=code=>Number(window.RiftboundApp?.owned?.(code)||window.RiftboundApp?.getState?.()?.inventory?.[code]?.owned||0);

  function scannerActive(){return !!document.querySelector('[data-tool="scanner"].active')||!!document.querySelector('#toolsView.active [data-tool="scanner"].active')}

  function host(){
    const panel=document.getElementById('toolPanel');
    if(!panel||!scannerActive())return null;
    let root=document.getElementById('webcamScannerPanel');
    if(!root){root=document.createElement('section');root.id='webcamScannerPanel';root.className='webcam-scanner-panel';panel.prepend(root)}
    return root;
  }

  function status(text,state='idle'){
    const el=document.getElementById('webcamScannerStatus');
    if(el){el.textContent=text;el.dataset.state=state}
  }

  function renderShell(){
    const root=host();if(!root)return;
    root.innerHTML=`
      <div class="webcam-scanner-head">
        <div><small>LIVE CARD STATION</small><h3>Webcam Scanner</h3><p>Hold one card inside the frame. The scanner waits for a clear, steady image before reading it.</p></div>
        <div class="webcam-scanner-actions"><button id="startWebcamScanner" class="primary-btn" type="button">Turn On Camera</button><button id="stopWebcamScanner" class="ghost-btn" type="button" hidden>Stop Camera</button></div>
      </div>
      <div class="webcam-scanner-layout">
        <div class="webcam-stage">
          <video id="webcamScannerVideo" playsinline muted></video>
          <canvas id="webcamScannerCanvas" hidden></canvas>
          <div class="webcam-card-guide"><span></span><span></span><span></span><span></span><b>Place one card here</b></div>
          <div id="webcamScannerStatus" class="webcam-scanner-status" data-state="idle">Camera is off</div>
        </div>
        <div id="webcamScannerReview" class="webcam-review">
          <div class="webcam-empty-review"><strong>Ready when you are</strong><small>Turn on your webcam, then hold a card steady in the frame.</small></div>
        </div>
      </div>
      <div class="webcam-scanner-footer">
        <button id="forceWebcamRead" class="ghost-btn" type="button" disabled>Read Card Now</button>
        <span>Nothing is added until you confirm the card and quantity.</span>
      </div>`;
  }

  function score(card,r){
    const cn=norm(nameOf(card)),rn=norm(`${r.name||''} ${r.subtitle||''}`),cnum=num(card.cardNumber),rnum=num(r.collector_number),cset=norm(`${card.cardSet||''} ${card.setCode||''}`),rset=norm(`${r.set_name||''} ${r.set_code||''}`);
    let s=0;
    if(cnum&&rnum&&cnum===rnum)s+=9;
    if(cn&&rn&&cn===rn)s+=10;else if(cn&&rn&&(cn.includes(rn)||rn.includes(cn)))s+=6;
    const baseName=norm(card.name);if(baseName&&rn&&(rn.includes(baseName)||baseName.includes(norm(r.name))))s+=4;
    if(cset&&rset&&(cset.includes(rset)||rset.includes(cset)))s+=5;
    if(norm(card.rarity)&&norm(r.rarity)&&norm(card.rarity)===norm(r.rarity))s+=1;
    return s;
  }
  function matches(r){return catalog().map(card=>({card,score:score(card,r)})).filter(x=>x.score>=4).sort((a,b)=>b.score-a.score||String(a.card.cardSet||'').localeCompare(String(b.card.cardSet||''))).slice(0,6)}

  function currentVideo(){return document.getElementById('webcamScannerVideo')}
  function currentCanvas(){return document.getElementById('webcamScannerCanvas')}

  function frameSample(){
    const video=currentVideo();if(!video||video.readyState<2||!video.videoWidth)return null;
    const c=document.createElement('canvas'),w=144,h=Math.max(80,Math.round(144*video.videoHeight/video.videoWidth));c.width=w;c.height=h;
    const ctx=c.getContext('2d',{willReadFrequently:true});ctx.drawImage(video,0,0,w,h);
    const d=ctx.getImageData(0,0,w,h).data,gray=new Uint8Array(w*h);let sum=0;
    for(let i=0,j=0;i<d.length;i+=4,j++){const g=Math.round(d[i]*.299+d[i+1]*.587+d[i+2]*.114);gray[j]=g;sum+=g}
    let edge=0,count=0;
    for(let y=1;y<h-1;y+=2){for(let x=1;x<w-1;x+=2){const i=y*w+x;edge+=Math.abs(gray[i+1]-gray[i-1])+Math.abs(gray[i+w]-gray[i-w]);count+=2}}
    return {gray,w,h,brightness:sum/gray.length,sharpness:count?edge/count:0};
  }

  function difference(a,b){
    if(!a||!b||a.gray.length!==b.gray.length)return 999;
    let sum=0,n=0;for(let i=0;i<a.gray.length;i+=8){sum+=Math.abs(a.gray[i]-b.gray[i]);n++}return n?sum/n:999;
  }

  function qualityTick(){
    clearTimeout(timer);timer=0;
    if(!stream||busy||!scannerActive())return;
    const sample=frameSample();
    if(!sample){timer=setTimeout(qualityTick,SAMPLE_MS);return}

    if(waitingForChange){
      const changed=difference(sample,capturedSample);
      if(changed>22){waitingForChange=false;armed=true;stableFrames=0;lastSample=null;status('New card detected. Hold steady…','watching')}
      else status('Remove this card and show the next one','waiting');
      timer=setTimeout(qualityTick,SAMPLE_MS);return;
    }

    if(!armed){timer=setTimeout(qualityTick,SAMPLE_MS);return}
    const motion=difference(sample,lastSample),bright=sample.brightness>=38&&sample.brightness<=225,sharp=sample.sharpness>=12,steady=motion<12;
    if(!bright){stableFrames=0;status(sample.brightness<38?'Too dark. Add more light.':'Too bright. Reduce glare.','warning')}
    else if(!sharp){stableFrames=0;status('Move the card closer or improve focus','warning')}
    else if(!steady){stableFrames=0;status('Hold the card steady…','watching')}
    else{
      stableFrames++;
      status(stableFrames>=2?'Clear image found. Reading card…':'Looks clear. Keep holding…','ready');
      if(stableFrames>=3){capturedSample=sample;captureAndRead();return}
    }
    lastSample=sample;
    timer=setTimeout(qualityTick,SAMPLE_MS);
  }

  async function startCamera(){
    if(stream)return;
    if(!navigator.mediaDevices?.getUserMedia){status('This browser does not support webcam access.','error');return}
    try{
      stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:{ideal:'environment'},width:{ideal:1280},height:{ideal:720}},audio:false});
      const video=currentVideo();if(!video){stopCamera();return}video.srcObject=stream;await video.play();
      document.getElementById('startWebcamScanner')?.setAttribute('hidden','');document.getElementById('stopWebcamScanner')?.removeAttribute('hidden');
      const force=document.getElementById('forceWebcamRead');if(force)force.disabled=false;
      armed=true;waitingForChange=false;stableFrames=0;lastSample=null;capturedSample=null;
      status('Camera on. Show one card in the frame.','watching');qualityTick();
    }catch(err){stream=null;status(err?.name==='NotAllowedError'?'Camera permission was denied. Allow camera access and try again.':`Could not start camera: ${err?.message||err}`,'error')}
  }

  function stopCamera(){
    clearTimeout(timer);timer=0;stream?.getTracks?.().forEach(t=>t.stop());stream=null;armed=false;busy=false;waitingForChange=false;stableFrames=0;lastSample=null;capturedSample=null;
    const video=currentVideo();if(video)video.srcObject=null;
    document.getElementById('startWebcamScanner')?.removeAttribute('hidden');document.getElementById('stopWebcamScanner')?.setAttribute('hidden','');
    const force=document.getElementById('forceWebcamRead');if(force)force.disabled=true;
    status('Camera is off','idle');
  }

  function captureDataUrl(){
    const video=currentVideo(),canvas=currentCanvas();if(!video||!canvas||video.readyState<2)throw new Error('Camera is not ready.');
    const max=1300,scale=Math.min(1,max/Math.max(video.videoWidth,video.videoHeight)),w=Math.max(1,Math.round(video.videoWidth*scale)),h=Math.max(1,Math.round(video.videoHeight*scale));
    canvas.width=w;canvas.height=h;const ctx=canvas.getContext('2d',{alpha:false});ctx.drawImage(video,0,0,w,h);return canvas.toDataURL('image/jpeg',.86);
  }

  async function requestRecognition(image){
    const s=window.RiftboundCloud?.getSession?.();if(!s?.access_token)throw new Error('Sign in to use AI card recognition.');
    const res=await fetch(`${SUPABASE_URL}/functions/v1/scan-card`,{method:'POST',headers:{apikey:SUPABASE_PUBLISHABLE_KEY,Authorization:`Bearer ${s.access_token}`,'Content-Type':'application/json'},body:JSON.stringify({image})});
    let data={};try{data=await res.json()}catch{}
    if(!res.ok)throw new Error(data?.error||data?.message||`Scanner error ${res.status}`);
    if(!data?.result)throw new Error('No card result came back.');
    return data.result;
  }

  async function captureAndRead(){
    if(!stream||busy)return;busy=true;armed=false;clearTimeout(timer);timer=0;status('Reading card…','reading');
    const review=document.getElementById('webcamScannerReview');if(review)review.innerHTML='<div class="webcam-reading"><span></span><strong>Identifying card…</strong><small>Checking name, set, and collector number</small></div>';
    try{
      const result=await requestRecognition(captureDataUrl());currentResult=result;currentMatches=result.is_card===false?[]:matches(result);selectedCard=null;
      renderRecognition();status(currentMatches.length?'Card read. Confirm the match.':'Could not confidently match this card.','review');
    }catch(err){
      if(review)review.innerHTML=`<div class="webcam-error"><strong>Could not read card</strong><small>${esc(err?.message||String(err))}</small><button class="ghost-btn" type="button" data-webcam-retry>Try Again</button></div>`;
      status('Read failed. Try again.','error');armed=true;stableFrames=0;lastSample=null;timer=setTimeout(qualityTick,SAMPLE_MS);
    }finally{busy=false}
  }

  function cardChoice(x,index){const c=x.card;return `<button class="webcam-match-choice ${index===0?'best':''}" type="button" data-webcam-choice="${esc(c.cardCode)}">${c.imageUrl?`<img src="${esc(c.imageUrl)}" alt="${esc(nameOf(c))}">`:''}<span><strong>${esc(nameOf(c))}</strong><small>${esc(c.cardSet||'')} ${esc(c.cardNumber||'')} · ${esc(c.cardCode||'')}</small></span>${index===0?'<b>Best match</b>':''}</button>`}

  function renderRecognition(){
    const review=document.getElementById('webcamScannerReview');if(!review)return;
    if(!currentMatches.length){review.innerHTML=`<div class="webcam-no-match"><strong>No confident match</strong><small>Reposition the card and try again, or use the photo/manual scanner below.</small><button class="ghost-btn" type="button" data-webcam-retry>Scan Again</button></div>`;return}
    const best=currentMatches[0].card,confidence=Math.round(Math.max(0,Math.min(1,Number(currentResult?.confidence||0)))*100);
    review.innerHTML=`<div class="webcam-confirm"><small>IS THIS THE CARD?</small><div class="webcam-confirm-card">${best.imageUrl?`<img src="${esc(best.imageUrl)}" alt="${esc(nameOf(best))}">`:''}<div><h4>${esc(nameOf(best))}</h4><p>${esc(best.cardSet||'')} ${esc(best.cardNumber||'')} · ${esc(best.cardCode||'')}</p><span>Recognition confidence ${confidence}% · You currently own ${owned(best.cardCode)}</span></div></div><div class="webcam-confirm-actions"><button class="primary-btn" type="button" data-webcam-confirm="${esc(best.cardCode)}">Yes, This Card</button><button class="ghost-btn" type="button" data-webcam-alternatives>Pick Different Match</button><button class="ghost-btn" type="button" data-webcam-retry>Scan Again</button></div><div id="webcamAlternativeMatches" class="webcam-alternatives" hidden>${currentMatches.map(cardChoice).join('')}</div></div>`;
  }

  function renderQuantity(card){
    selectedCard=card;const review=document.getElementById('webcamScannerReview');if(!review)return;
    review.innerHTML=`<div class="webcam-quantity"><small>CARD CONFIRMED</small><div class="webcam-confirm-card compact">${card.imageUrl?`<img src="${esc(card.imageUrl)}" alt="${esc(nameOf(card))}">`:''}<div><h4>${esc(nameOf(card))}</h4><p>${esc(card.cardSet||'')} ${esc(card.cardNumber||'')}</p><span>Currently owned: ${owned(card.cardCode)}</span></div></div><h4>How many copies of this card do you have?</h4><div class="webcam-quick-qty">${[1,2,3,4].map(q=>`<button type="button" data-webcam-qty="${q}">${q}</button>`).join('')}</div><label class="webcam-custom-qty">Other quantity<input id="webcamQuantity" type="number" min="1" max="99" value="1" inputmode="numeric"></label><button class="primary-btn webcam-add-next" type="button" data-webcam-add>Add Copies & Scan Next</button><button class="ghost-btn" type="button" data-webcam-back>Back</button></div>`;
    chooseQty(1);
  }

  function chooseQty(q){q=Math.max(1,Math.min(99,Math.floor(Number(q)||1)));const input=document.getElementById('webcamQuantity');if(input)input.value=String(q);document.querySelectorAll('[data-webcam-qty]').forEach(b=>b.classList.toggle('active',Number(b.dataset.webcamQty)===q))}

  function addAndNext(){
    if(!selectedCard)return;const input=document.getElementById('webcamQuantity'),qty=Math.max(1,Math.min(99,Math.floor(Number(input?.value)||1)));
    window.RiftboundApp?.adjustOwned?.(selectedCard.cardCode,qty,'Webcam scan');window.RiftboundTheme?.play?.('add');window.RiftboundNeonFX?.trigger?.('inventory');
    const review=document.getElementById('webcamScannerReview');if(review)review.innerHTML=`<div class="webcam-added"><strong>Added ${qty}× ${esc(nameOf(selectedCard))}</strong><small>You now own ${owned(selectedCard.cardCode)}. Remove this card and show the next one.</small></div>`;
    status('Added. Remove this card and show the next one.','waiting');currentResult=null;currentMatches=[];selectedCard=null;waitingForChange=true;armed=false;stableFrames=0;lastSample=null;timer=setTimeout(qualityTick,SAMPLE_MS);
  }

  function retry(){currentResult=null;currentMatches=[];selectedCard=null;armed=true;waitingForChange=false;stableFrames=0;lastSample=null;const review=document.getElementById('webcamScannerReview');if(review)review.innerHTML='<div class="webcam-empty-review"><strong>Ready to read again</strong><small>Hold the card steady inside the frame.</small></div>';status('Hold the card steady…','watching');qualityTick()}

  function ensure(){if(!scannerActive())return;const existing=document.getElementById('webcamScannerPanel');if(!existing)renderShell();if(stream){const video=currentVideo();if(video&&video.srcObject!==stream){video.srcObject=stream;video.play().catch(()=>{})}qualityTick()}}

  document.addEventListener('click',e=>{
    if(e.target.closest('#startWebcamScanner')){startCamera();return}
    if(e.target.closest('#stopWebcamScanner')){stopCamera();return}
    if(e.target.closest('#forceWebcamRead')){if(stream&&!busy){capturedSample=frameSample();captureAndRead()}return}
    const confirm=e.target.closest('[data-webcam-confirm]');if(confirm){const card=catalog().find(c=>c.cardCode===confirm.dataset.webcamConfirm);if(card)renderQuantity(card);return}
    if(e.target.closest('[data-webcam-alternatives]')){const x=document.getElementById('webcamAlternativeMatches');if(x)x.hidden=!x.hidden;return}
    const choice=e.target.closest('[data-webcam-choice]');if(choice){const card=catalog().find(c=>c.cardCode===choice.dataset.webcamChoice);if(card)renderQuantity(card);return}
    const q=e.target.closest('[data-webcam-qty]');if(q){chooseQty(q.dataset.webcamQty);return}
    if(e.target.closest('[data-webcam-add]')){addAndNext();return}
    if(e.target.closest('[data-webcam-back]')){renderRecognition();return}
    if(e.target.closest('[data-webcam-retry]')){retry();return}
    const tool=e.target.closest('[data-tool]');if(tool){if(tool.dataset.tool==='scanner')setTimeout(ensure,0);else if(stream)stopCamera()}
  });
  document.addEventListener('input',e=>{if(e.target.id==='webcamQuantity')chooseQty(e.target.value)});
  window.addEventListener('riftbound-tool-render',e=>{if(e.detail?.tool==='scanner')requestAnimationFrame(ensure)});
  document.addEventListener('visibilitychange',()=>{if(document.hidden&&stream)stopCamera()});
  window.addEventListener('beforeunload',stopCamera);

  window.RiftboundWebcamScanner={start:startCamera,stop:stopCamera,scanNow:captureAndRead};
})();
