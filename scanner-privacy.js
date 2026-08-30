(() => {
  'use strict';

  const PRIVACY_TEXT='Privacy: camera video is never recorded or saved. Only a single cropped card frame is used for recognition, then the app clears it from browser memory.';
  let scheduled=false;

  function clearWebcamFrame(){
    const canvas=document.getElementById('webcamScannerCanvas');
    if(!canvas)return;
    try{
      const ctx=canvas.getContext('2d');
      ctx?.clearRect(0,0,canvas.width||1,canvas.height||1);
    }catch{}
    canvas.width=1;
    canvas.height=1;
  }

  function clearPhotoPreview(){
    const preview=document.querySelector('.scanner-capture img[src^="blob:"]');
    if(!preview)return;
    const src=preview.src;
    try{URL.revokeObjectURL(src)}catch{}
    preview.removeAttribute('src');
    preview.alt='Scan image cleared after recognition';
    preview.hidden=true;
  }

  function clearFileInput(){
    const input=document.getElementById('scannerFile');
    if(input)input.value='';
  }

  function clearTemporaryImages(){
    clearWebcamFrame();
    clearPhotoPreview();
    clearFileInput();
  }

  function removeDuplicateNotices(){
    document.querySelectorAll('[data-scanner-privacy]').forEach((el,index)=>{if(index>0)el.remove()});
    document.querySelectorAll('[data-photo-scanner-privacy]').forEach((el,index)=>{if(index>0)el.remove()});
  }

  function ensurePrivacyNotice(){
    removeDuplicateNotices();

    const footer=document.querySelector('.webcam-scanner-footer');
    let webcamNotice=document.querySelector('[data-scanner-privacy]');
    if(footer&&!webcamNotice){
      webcamNotice=document.createElement('div');
      webcamNotice.dataset.scannerPrivacy='';
      webcamNotice.className='scanner-privacy-note';
      webcamNotice.textContent=PRIVACY_TEXT;
      footer.insertAdjacentElement('afterend',webcamNotice);
    }

    const scanner=document.querySelector('.scanner-grid');
    let photoNotice=document.querySelector('[data-photo-scanner-privacy]');
    if(scanner&&!photoNotice){
      photoNotice=document.createElement('div');
      photoNotice.dataset.photoScannerPrivacy='';
      photoNotice.className='scanner-privacy-note';
      photoNotice.textContent='Selected card photos are not saved to your account, database, localStorage, or Supabase Storage. The temporary browser preview is released after recognition.';
      scanner.insertAdjacentElement('afterend',photoNotice);
    }
  }

  function inspectScannerState(){
    ensurePrivacyNotice();

    const review=document.getElementById('webcamScannerReview');
    if(review?.querySelector('.webcam-confirm,.webcam-no-match,.webcam-error,.webcam-quantity,.webcam-added'))clearWebcamFrame();

    const ai=document.getElementById('scannerAiPanel');
    if(ai?.querySelector('.scanner-ai-head,.scanner-ai-no-match,.scanner-ai-setup')){
      clearPhotoPreview();
      clearFileInput();
    }
  }

  function scheduleInspect(){
    if(scheduled)return;
    scheduled=true;
    requestAnimationFrame(()=>{
      scheduled=false;
      inspectScannerState();
    });
  }

  const observer=new MutationObserver(mutations=>{
    const relevant=mutations.some(m=>{
      const target=m.target instanceof Element?m.target:m.target?.parentElement;
      return !!target?.closest?.('#toolsView,#webcamScannerPanel,#scannerAiPanel');
    });
    if(relevant)scheduleInspect();
  });

  function init(){
    inspectScannerState();
    observer.observe(document.body,{subtree:true,childList:true});
  }

  document.addEventListener('visibilitychange',()=>{
    if(document.hidden)clearTemporaryImages();
  });
  window.addEventListener('pagehide',clearTemporaryImages);
  window.addEventListener('beforeunload',clearTemporaryImages);
  window.addEventListener('riftbound-tool-render',event=>{
    if(event.detail?.tool!=='scanner')clearTemporaryImages();
    else scheduleInspect();
  });

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});
  else init();

  window.RiftboundScannerPrivacy={clear:clearTemporaryImages};
})();
