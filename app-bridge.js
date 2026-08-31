(() => {
  'use strict';

  const originalWireEvents=window.wireEvents;
  const originalLoadCatalog=window.loadCatalog;
  let wired=false;
  let catalogStarted=false;

  if(typeof originalWireEvents==='function'){
    window.wireEvents=()=>{
      if(wired)return;
      wired=true;
      return originalWireEvents();
    };
  }

  if(typeof originalLoadCatalog==='function'){
    window.loadCatalog=()=>{
      if(catalogStarted)return;
      catalogStarted=true;
      return originalLoadCatalog();
    };
  }

  window.RiftboundApp={
    getCatalog:()=>catalog,
    getState:()=>state,
    getCard:code=>byCode.get(code),
    owned:code=>owned(code),
    available:code=>available(code),
    decked:code=>decked(code),
    loaned:code=>loaned(code),
    locationFor:card=>locationFor(card),
    adjustOwned:(code,delta,reason)=>adjustOwned(code,delta,reason),
    showCard:code=>showCard(code),
    renderAll:()=>renderAll(),
    reloadState:()=>{state=loadState();renderAll();window.RiftboundFeatures?.render?.();}
  };

  function bootstrapCore(){
    try{
      const search=document.getElementById('cardSearch');
      const ownedOnly=document.getElementById('ownedOnly');
      if(search)search.value=filters.search;
      if(ownedOnly)ownedOnly.checked=filters.ownedOnly;
      window.wireEvents?.();
      renderFilters();
      renderStats();
      renderStorage();
      renderDecks();
      renderLoans();
      window.loadCatalog?.();
    }catch(err){
      console.error('Early app bootstrap failed',err);
    }
  }

  bootstrapCore();
})();