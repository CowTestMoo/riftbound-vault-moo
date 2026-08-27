(() => {
  'use strict';

  function preferCloud(){
    const dialog=document.getElementById('cloudConflictDialog');
    const cloud=dialog?.querySelector('[data-sync-choice="cloud"]');
    if(dialog?.open&&cloud)cloud.click();
  }

  function hideManualSync(){
    document.getElementById('cloudSyncBtn')?.remove();
  }

  function sweep(){hideManualSync();preferCloud()}

  function init(){
    sweep();
    window.addEventListener('riftbound-cloud-restored',sweep);
    window.addEventListener('riftbound-auth-storage-change',()=>setTimeout(sweep,80));
    window.addEventListener('focus',sweep);
    window.addEventListener('online',sweep);
    setTimeout(sweep,300);
    setTimeout(sweep,1200);
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();