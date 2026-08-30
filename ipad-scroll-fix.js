(() => {
  'use strict';

  function hasOpenMobileSheet(){
    return [...document.querySelectorAll('.mobile-sheet-layer')].some(layer=>!layer.hidden);
  }

  function syncScrollState(){
    const libraryOpen=document.body.classList.contains('friend-library-open');
    document.documentElement.classList.toggle('friend-library-open-root',libraryOpen);
    if(!hasOpenMobileSheet())document.body.classList.remove('mobile-sheet-open');

    const screen=document.getElementById('friendLibraryScreen');
    if(screen&&!screen.hidden){
      screen.style.webkitOverflowScrolling='touch';
      screen.style.touchAction='pan-y';
      screen.style.overflowY='auto';
      screen.style.overflowX='hidden';
    }

    if(!libraryOpen){
      document.documentElement.style.overflow='';
      document.documentElement.style.height='';
      document.body.style.overflowY='';
      document.body.style.touchAction='';
    }
  }

  function init(){
    syncScrollState();
    new MutationObserver(syncScrollState).observe(document.body,{attributes:true,attributeFilter:['class']});
    document.addEventListener('click',event=>{
      if(event.target.closest('#friendBackBtn,#browseLibrariesUtilityBtn,[data-friend-user]'))setTimeout(syncScrollState,0);
    },true);
    window.addEventListener('pageshow',syncScrollState);
    window.addEventListener('orientationchange',()=>setTimeout(syncScrollState,80));
    document.addEventListener('visibilitychange',()=>{if(!document.hidden)syncScrollState()});
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
