(() => {
  'use strict';

  const ORDER=['Units','Spells','Gear','Runes'];
  const LABELS={Units:'Units',Spells:'Spells',Gear:'Gear / Items',Runes:'Runes'};
  const esc=(v='')=>String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const nameOf=card=>card?.fullName||card?.name||card?.cardCode||'Unknown card';

  function cardClass(card){
    return window.RiftboundSpecialCards?.storageClass?.(card)||'Other';
  }

  function rank(card){
    const i=ORDER.indexOf(cardClass(card));
    return i<0?ORDER.length:i;
  }

  function domainDescription(box){
    if(box?.rule==='All'&&box.domains?.length===1){
      return `${box.domains[0]} • Units → Spells → Gear / Items → Runes`;
    }
    return window.describeStorageBox?.(box)||'';
  }

  function showOrderedBox(boxId){
    const app=window.RiftboundApp;
    if(!app)return false;
    const state=app.getState?.();
    const catalog=app.getCatalog?.()||[];
    const boxes=window.normalizeStorageBoxes?.(state?.storageBoxes)||state?.storageBoxes||[];
    const box=boxes.find(b=>b.id===boxId);
    if(!box)return false;

    const cards=catalog
      .filter(card=>window.locationFor?.(card,boxes)?.boxId===box.id&&Number(app.available?.(card.cardCode)||0)>0)
      .sort((a,b)=>rank(a)-rank(b)||nameOf(a).localeCompare(nameOf(b),undefined,{sensitivity:'base'}));

    const isDomainBox=box.rule==='All'&&box.domains?.length===1;
    let content='';
    if(cards.length&&isDomainBox){
      for(const cls of ORDER){
        const group=cards.filter(card=>cardClass(card)===cls);
        if(!group.length)continue;
        content+=`<section class="storage-divider-group"><h3 class="storage-divider-title">${esc(LABELS[cls])}</h3><div class="card-lines">${group.map(card=>`<div class="card-line"><span>${esc(nameOf(card))}</span><strong>×${Number(app.available(card.cardCode)||0)}</strong></div>`).join('')}</div></section>`;
      }
      const unmatched=cards.filter(card=>!ORDER.includes(cardClass(card)));
      if(unmatched.length){
        content+=`<section class="storage-divider-group"><h3 class="storage-divider-title">Other</h3><div class="card-lines">${unmatched.map(card=>`<div class="card-line"><span>${esc(nameOf(card))}</span><strong>×${Number(app.available(card.cardCode)||0)}</strong></div>`).join('')}</div></section>`;
      }
    }else if(cards.length){
      content=`<div class="card-lines">${cards.map(card=>`<div class="card-line"><span>${esc(window.sectionFor?.(card)||cardClass(card))} • ${esc(nameOf(card))}</span><strong>×${Number(app.available(card.cardCode)||0)}</strong></div>`).join('')}</div>`;
    }else{
      content='<div class="empty-state">No cards route here yet.</div>';
    }

    const dialog=document.getElementById('storageDialog');
    if(!dialog)return false;
    const position=boxes.indexOf(box)+1;
    dialog.innerHTML=`<div class="modal-inner"><div class="modal-head"><div><h2>${esc(box.name)}</h2><p class="detail-meta">Position ${position} • ${esc(domainDescription(box))}</p></div><button class="close-btn" data-close="storageDialog">×</button></div>${content}</div>`;
    dialog.showModal();
    return true;
  }

  function updateStorageHelp(){
    const help=document.querySelector('.storage-setup-help');
    if(help)help.innerHTML='<strong>Recommended layout:</strong> combine Legends + Champion Units, combine Tokens + Battlefields / Maps, then use one box for each domain. Inside EVERY domain box, use dividers in this exact order: <strong>Units → Spells → Gear / Items → Runes</strong>. Sort alphabetically inside each divider.';
  }

  document.addEventListener('click',event=>{
    const target=event.target.closest?.('[data-box]');
    if(target&&showOrderedBox(target.dataset.box)){
      event.preventDefault();
      event.stopImmediatePropagation();
      return;
    }
    if(event.target.closest?.('#customizeStorageBtn'))setTimeout(updateStorageHelp,0);
  },true);

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',updateStorageHelp,{once:true});
  else updateStorageHelp();

  window.RiftboundStorageOrder={order:[...ORDER],showOrderedBox};
})();
