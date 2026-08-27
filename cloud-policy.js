(() => {
  'use strict';
  let resolving=false;

  function resolveCloudConflict(){
    if(resolving)return;
    const dialog=document.getElementById('cloudConflictDialog');
    const cloud=dialog?.querySelector('[data-sync-choice="cloud"]');
    if(!dialog?.open||!cloud)return;
    resolving=true;
    try{cloud.click()}finally{setTimeout(()=>{resolving=false},0)}
  }

  function hideManualSync(){
    const sync=document.getElementById('cloudSyncBtn');
    if(sync)sync.remove();
    const text=document.getElementById('cloudSettingText');
    if(text&&window.RiftboundCloud?.getSession?.()){
      const status=document.getElementById('cloudSyncStatus')?.textContent||'Automatic';
      const email=window.RiftboundCloud.getSession()?.user?.email||'Signed in';
      text.textContent=`${email} • Auto sync • ${status}`;
    }
  }

  function sweep(){resolveCloudConflict();hideManualSync()}

  function init(){
    sweep();
    const observer=new MutationObserver(sweep);
    observer.observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['open']});
    window.addEventListener('focus',sweep);
    window.addEventListener('online',sweep);
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();