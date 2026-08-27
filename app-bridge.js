(() => {
  'use strict';
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
})();