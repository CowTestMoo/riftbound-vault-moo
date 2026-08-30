(() => {
  'use strict';

  const PRIVACY_TEXT='Privacy: camera video is never recorded or saved. Only a single cropped card frame is used for recognition, then the app clears it from browser memory.';

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

  function ensurePrivacyNotice(){
    const footer=document.querySelector('.webcam-scanner-footer');
    if(footer&&!footer.querySelector('[data-scanner-privacy]')){
      const note=document.createElement('div');
      note.dataset.scannerPrivacy='';
      note.className='scanner-privacy-note';
      note.textContent=PRIVACY_TEXT;
      footer.insertAdjacentElement('afterend',note);
    }
    const scanner=document.querySelector('.scanner-grid');
    if(scanner&&!document.querySelector('[data-photo-scanner-privacy]')){
      const note=document.createElement('div');
      note.dataset.photoScannerPrivacy='';
      note.className='scanner-privacy-note';
      note.textContent='Selected card photos are not saved to your account, database, localStorage, or Supabase Storage. The temporary browser preview is released after recognition.';
      scanner.insertAdjacentElement('afterend',note);
    }
  }

  const observer=new MutationObserver(()=>{
    ensurePrivacyNotice();
    const review=document.getElementById('webcamScannerReview');
    if(review?.querySelector('.webcam-confirm,.webcam-no-match,.webcam-error,.webcam-quantity,.webcam-added'))clearWebcamFrame();
    const ai=document.getElementById('scannerAiPanel');
    if(ai?.querySelector('.scanner-ai-head,.scanner-ai-no-match,.scanner-ai-setup')){
      clearPhotoPreview();
      clearFileInput();
    }
  });

  function init(){
    ensurePrivacyNotice();
    observer.observe(document.body,{subtree:true,childList:true});
  }

  document.addEventListener('visibilitychange',()=>{
    if(document.hidden)clearTemporaryImages();
  });
  window.addEventListener('pagehide',clearTemporaryImages);
  window.addEventListener('beforeunload',clearTemporaryImages);
  window.addEventListener('riftbound-tool-render',event=>{
    if(event.detail?.tool!=='scanner')clearTemporaryImages();
    else requestAnimationFrame(ensurePrivacyNotice);
  });

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});
  else init();

  window.RiftboundScannerPrivacy={clear:clearTemporaryImages};
})();
