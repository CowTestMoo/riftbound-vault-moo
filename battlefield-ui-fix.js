(() => {
  'use strict';

  let imageMap=new Map();
  let catalogRef=null;

  function catalog(){
    const cards=window.RiftboundApp?.getCatalog?.()||[];
    if(cards!==catalogRef){
      catalogRef=cards;
      imageMap=new Map();
      for(const card of cards){
        const isBattlefield=window.RiftboundSpecialCards?.isLandscape?.(card)||String(card?.cardType||'').toLowerCase()==='battlefield';
        if(isBattlefield&&card?.imageUrl){
          try{imageMap.set(new URL(card.imageUrl,location.href).href,card)}catch{imageMap.set(card.imageUrl,card)}
        }
      }
    }
    return cards;
  }

  function isBattlefieldImage(img){
    if(!(img instanceof HTMLImageElement))return false;
    catalog();
    const src=img.currentSrc||img.src||'';
    if(!src)return false;
    try{return imageMap.has(new URL(src,location.href).href)}catch{return imageMap.has(src)}
  }

  function decorateImage(img){
    if(!isBattlefieldImage(img))return;
    img.classList.add('landscape-card-image');
    img.closest('.card-image-wrap')?.classList.add('landscape-card-image-wrap');
    img.closest('.card-tile,.friend-card,.deck-viewer-card,.recent-card')?.classList.add('landscape-card');
    img.closest('.detail-layout,.public-card-layout')?.classList.add('landscape-detail-layout');
    img.closest('.mobile-card-hero')?.classList.add('battlefield-mobile-card');
    if(img.id==='cardImageInspectorImage')document.getElementById('cardImageInspector')?.classList.add('battlefield-inspector');
  }

  function decorate(root){
    if(root instanceof HTMLImageElement){decorateImage(root);return}
    root?.querySelectorAll?.('img').forEach(decorateImage);
  }

  function refreshVisible(){decorate(document)}

  function init(){
    refreshVisible();
    new MutationObserver(records=>{
      for(const record of records){
        if(record.type==='attributes'){decorate(record.target);continue}
        record.addedNodes.forEach(node=>{if(node.nodeType===1)decorate(node)});
      }
    }).observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['src']});
    window.addEventListener('riftbound-ui-render',event=>{
      if(['cards','card-dialog'].includes(event.detail?.area))requestAnimationFrame(refreshVisible);
    });
    window.addEventListener('riftbound-friend-render',()=>requestAnimationFrame(refreshVisible));
    window.addEventListener('riftbound-cloud-restored',()=>{catalogRef=null;requestAnimationFrame(refreshVisible)});
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
