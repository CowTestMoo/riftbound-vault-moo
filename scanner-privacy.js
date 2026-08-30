(() => {
  'use strict';

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
    clearPhotoPreview();
    clearFileInput();
  }

  function ensurePrivacyNotice(){
    const scanner=document.querySelector('.scanner-grid');
    if(!scanner||document.querySelector('[data-photo-scanner-privacy]'))return;
    const note=document.createElement('div');
    note.dataset.photoScannerPrivacy='';
    note.className='scanner-privacy-note';
    note.textContent='Selected card photos are not saved to your account, database, localStorage, or Supabase Storage. Temporary browser previews are cleared when you leave the scanner.';
    scanner.insertAdjacentElement('afterend',note);
  }

  window.addEventListener('riftbound-tool-render',event=>{
    if(event.detail?.tool==='scanner')requestAnimationFrame(ensurePrivacyNotice);
    else clearTemporaryImages();
  });

  document.addEventListener('visibilitychange',()=>{
    if(document.hidden)clearTemporaryImages();
  });
  window.addEventListener('pagehide',clearTemporaryImages);
  window.addEventListener('beforeunload',clearTemporaryImages);

  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded',ensurePrivacyNotice,{once:true});
  }else{
    ensurePrivacyNotice();
  }

  window.RiftboundScannerPrivacy={clear:clearTemporaryImages};
})();
