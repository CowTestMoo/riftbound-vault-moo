(() => {
  'use strict';

  let imageMap=new Map();
  let catalogRef=null;
  let queued=false;

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
    const wrap=img.closest('.card-image-wrap');
    if(wrap)wrap.classList.add('landscape-card-image-wrap');
    const tile=img.closest('.card-tile,.friend-card,.deck-viewer-card,.recent-card');
    if(tile)tile.classList.add('landscape-card');
    const detail=img.closest('.detail-layout,.public-card-layout');
    if(detail)detail.classList.add('landscape-detail-layout');
    const hero=img.closest('.mobile-card-hero');
    if(hero)hero.classList.add('battlefield-mobile-card');
    if(img.id==='cardImageInspectorImage')document.getElementById('cardImageInspector')?.classList.add('battlefield-inspector');
  }

  function decorate(root=document){
    catalog();
    root.querySelectorAll?.('img').forEach(decorateImage);
    if(root instanceof HTMLImageElement)decorateImage(root);
  }

  function queueDecorate(){
    if(queued)return;
    queued=true;
    requestAnimationFrame(()=>{queued=false;decorate(document)});
  }

  const observer=new MutationObserver(queueDecorate);

  function init(){
    decorate(document);
    observer.observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['src']});
    window.addEventListener('riftbound-ui-render',queueDecorate);
    window.addEventListener('riftbound-friend-render',queueDecorate);
    window.addEventListener('riftbound-cloud-restored',queueDecorate);
    document.addEventListener('click',()=>setTimeout(queueDecorate,0),true);
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
