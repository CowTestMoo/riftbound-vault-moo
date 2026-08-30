(() => {
  'use strict';

  let confirmedCode='';
  const esc=(v='')=>String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

  function storageFor(code){
    const card=window.RiftboundApp?.getCard?.(code);
    if(!card)return null;
    const loc=window.RiftboundApp?.locationFor?.(card);
    return loc?{card,loc}:null;
  }

  function hintHtml(code,{afterAdd=false}={}){
    const found=storageFor(code);
    if(!found)return '';
    const {loc}=found;
    if(!loc.boxId||loc.boxName==='Unassigned'){
      return `<div class="webcam-storage-hint unassigned" data-webcam-storage-hint><small>${afterAdd?'STORAGE NEEDED':'WHERE TO STORE IT'}</small><strong>Storage not assigned</strong><span>This card does not match any current storage box rule. Use Customize Storage when you are done scanning.</span></div>`;
    }
    const customName=String(loc.boxName||'').trim();
    const defaultName=`Box ${loc.box}`;
    const position=customName&&customName!==defaultName?` · Position ${loc.box}`:'';
    const details=[loc.domain,loc.section].filter(Boolean).join(' · ');
    return `<div class="webcam-storage-hint" data-webcam-storage-hint><small>${afterAdd?'PUT IT AWAY HERE':'WHERE TO STORE IT'}</small><strong>${esc(customName||defaultName)}</strong><span>${esc(details)}${esc(position)}</span></div>`;
  }

  function decorateQuantity(code){
    const root=document.querySelector('.webcam-quantity');
    if(!root||root.querySelector('[data-webcam-storage-hint]'))return;
    const card=root.querySelector('.webcam-confirm-card');
    if(card)card.insertAdjacentHTML('afterend',hintHtml(code));
    else root.insertAdjacentHTML('afterbegin',hintHtml(code));
  }

  function decorateAdded(code){
    const root=document.querySelector('.webcam-added');
    if(!root||root.querySelector('[data-webcam-storage-hint]'))return;
    root.insertAdjacentHTML('beforeend',hintHtml(code,{afterAdd:true}));
  }

  document.addEventListener('click',event=>{
    const confirm=event.target.closest('[data-webcam-confirm]');
    if(confirm){confirmedCode=confirm.dataset.webcamConfirm||'';decorateQuantity(confirmedCode);return}

    const choice=event.target.closest('[data-webcam-choice]');
    if(choice){confirmedCode=choice.dataset.webcamChoice||'';decorateQuantity(confirmedCode);return}

    if(event.target.closest('[data-webcam-add]')){
      if(confirmedCode)decorateAdded(confirmedCode);
      return;
    }

    if(event.target.closest('[data-webcam-retry]'))confirmedCode='';
  });

  window.addEventListener('riftbound-cloud-restored',()=>{
    if(confirmedCode)requestAnimationFrame(()=>decorateQuantity(confirmedCode));
  });
})();
