(() => {
  'use strict';

  const touchLike = window.matchMedia('(pointer: coarse)').matches || navigator.maxTouchPoints > 1 || /iPad|iPhone|iPod|Android/i.test(navigator.userAgent || '');
  if(!touchLike) return;

  let syncFrame = 0;
  let syncing = false;

  function hasOpenMobileSheet(){
    return [...document.querySelectorAll('.mobile-sheet-layer')].some(layer=>!layer.hidden);
  }

  function setStyle(el,prop,value){
    if(el && el.style[prop] !== value) el.style[prop] = value;
  }

  function syncScrollState(){
    if(syncing) return;
    syncing = true;
    try{
      const libraryOpen=document.body.classList.contains('friend-library-open');
      document.documentElement.classList.toggle('friend-library-open-root',libraryOpen);

      if(!hasOpenMobileSheet() && document.body.classList.contains('mobile-sheet-open')){
        document.body.classList.remove('mobile-sheet-open');
      }

      const screen=document.getElementById('friendLibraryScreen');
      if(screen&&!screen.hidden){
        setStyle(screen,'webkitOverflowScrolling','touch');
        setStyle(screen,'touchAction','pan-y');
        setStyle(screen,'overflowY','auto');
        setStyle(screen,'overflowX','hidden');
      }

      if(!libraryOpen){
        setStyle(document.documentElement,'overflow','');
        setStyle(document.documentElement,'height','');
        setStyle(document.body,'overflowY','');
        setStyle(document.body,'touchAction','');
      }
    } finally {
      syncing = false;
    }
  }

  function scheduleSync(){
    if(syncFrame) return;
    syncFrame=requestAnimationFrame(()=>{
      syncFrame=0;
      syncScrollState();
    });
  }

  function init(){
    syncScrollState();
    new MutationObserver(scheduleSync).observe(document.body,{attributes:true,attributeFilter:['class']});
    document.addEventListener('click',event=>{
      if(event.target.closest('#friendBackBtn,#browseLibrariesUtilityBtn,[data-friend-user]'))setTimeout(scheduleSync,0);
    },true);
    window.addEventListener('pageshow',scheduleSync);
    window.addEventListener('orientationchange',()=>setTimeout(scheduleSync,80));
    document.addEventListener('visibilitychange',()=>{if(!document.hidden)scheduleSync()});
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
