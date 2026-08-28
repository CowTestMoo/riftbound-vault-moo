(() => {
  'use strict';

  function ensureInspector(){
    let dialog=document.getElementById('cardImageInspector');
    if(dialog)return dialog;

    dialog=document.createElement('dialog');
    dialog.id='cardImageInspector';
    dialog.className='card-image-inspector';
    dialog.innerHTML=`<div class="card-image-inspector-shell"><div class="card-image-inspector-head"><strong id="cardImageInspectorTitle">Card image</strong><div><button id="cardImageInspectorZoom" type="button" class="ghost-btn" aria-pressed="false">Zoom</button><button id="cardImageInspectorClose" type="button" class="close-btn" aria-label="Close full size card">×</button></div></div><div id="cardImageInspectorStage" class="card-image-inspector-stage"><img id="cardImageInspectorImage" alt=""></div><small class="card-image-inspector-hint">Tap the card to zoom. Tap again to fit.</small></div>`;
    document.body.appendChild(dialog);

    const stage=dialog.querySelector('#cardImageInspectorStage');
    const image=dialog.querySelector('#cardImageInspectorImage');
    const zoom=dialog.querySelector('#cardImageInspectorZoom');

    const setZoomed=value=>{
      stage.classList.toggle('zoomed',value);
      zoom.textContent=value?'Fit':'Zoom';
      zoom.setAttribute('aria-pressed',String(value));
      if(!value){stage.scrollTop=0;stage.scrollLeft=0}
    };

    const toggleZoom=()=>setZoomed(!stage.classList.contains('zoomed'));
    image.addEventListener('click',toggleZoom);
    zoom.addEventListener('click',toggleZoom);
    dialog.querySelector('#cardImageInspectorClose').addEventListener('click',()=>dialog.close());
    dialog.addEventListener('click',event=>{if(event.target===dialog)dialog.close()});
    dialog.addEventListener('close',()=>setZoomed(false));
    return dialog;
  }

  function openInspector(image){
    if(!(image instanceof HTMLImageElement)||!image.src)return;
    const dialog=ensureInspector();
    const target=dialog.querySelector('#cardImageInspectorImage');
    const title=image.alt||'Card image';
    target.src=image.currentSrc||image.src;
    target.alt=title;
    dialog.querySelector('#cardImageInspectorTitle').textContent=title;
    if(!dialog.open)dialog.showModal();
  }

  document.addEventListener('click',event=>{
    const image=event.target.closest('#cardDialog img.detail-image, #publicCardDialog img.detail-image, #mobileCardSheet .mobile-card-hero img');
    if(!image)return;
    event.preventDefault();
    event.stopPropagation();
    openInspector(image);
  },true);

  window.RiftboundCardInspector={open:openInspector};
})();
