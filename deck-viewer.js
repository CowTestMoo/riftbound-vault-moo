(() => {
  'use strict';

  const DENSITY_KEY='riftbound-deck-grid-density-v1';
  const VALID_DENSITIES=['compact','normal','large'];
  let context=null;

  const esc=(value='')=>String(value).replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const nameOf=card=>card?.fullName||card?.name||card?.cardCode||'Unknown card';
  const catalog=()=>window.RiftboundApp?.getCatalog?.()||[];
  const byCode=()=>new Map(catalog().map(card=>[card.cardCode,card]));
  function density(){const value=localStorage.getItem(DENSITY_KEY);return VALID_DENSITIES.includes(value)?value:'normal'}

  function ensureDialogs(){
    if(!document.getElementById('deckViewerDialog')){
      const dialog=document.createElement('dialog');dialog.id='deckViewerDialog';dialog.className='modal deck-viewer-dialog';document.body.appendChild(dialog);
    }
    if(!document.getElementById('publicCardDialog')){
      const dialog=document.createElement('dialog');dialog.id='publicCardDialog';dialog.className='modal public-card-dialog';document.body.appendChild(dialog);
    }
  }
  function cardTile(code,quantity,map){
    const card=map.get(code),title=nameOf(card||{cardCode:code});
    return `<button class="card-tile deck-viewer-card" type="button" data-deck-view-card="${esc(code)}"><div class="card-image-wrap">${card?.imageUrl?`<img class="card-image" loading="lazy" decoding="async" src="${esc(card.imageUrl)}" alt="${esc(title)}">`:`<div class="card-placeholder">${esc(title)}</div>`}</div><span class="qty-badge">×${Number(quantity||0)}</span><div class="card-caption"><strong>${esc(title)}</strong><small>${esc(card?.cardSet||code)} ${esc(card?.cardNumber||'')}</small></div></button>`;
  }
  function render(){
    ensureDialogs();const dialog=document.getElementById('deckViewerDialog');if(!context)return;
    const deck=context.deck||{},entries=Object.entries(deck.cards||{}).filter(([,quantity])=>Number(quantity)>0),total=entries.reduce((sum,[,quantity])=>sum+Number(quantity||0),0),map=byCode(),currentDensity=density();
    dialog.innerHTML=`<div class="modal-inner deck-viewer-inner"><div class="modal-head deck-viewer-head"><div><small>${context.readOnly?`${esc(context.owner)}'s deck`:'Your deck'}</small><h2>${esc(deck.name||'Untitled Deck')}</h2><p>${total} cards${deck.champion?` · ${esc(deck.champion)}`:''}</p></div><button class="close-btn" type="button" data-deck-view-close aria-label="Close">×</button></div>${deck.notes?`<p class="deck-viewer-notes">${esc(deck.notes)}</p>`:''}<div class="deck-viewer-toolbar"><strong>Card gallery</strong><div class="deck-density-controls" role="group" aria-label="Deck card size">${VALID_DENSITIES.map(value=>`<button type="button" class="${value===currentDensity?'active':''}" data-deck-density="${value}">${value[0].toUpperCase()+value.slice(1)}</button>`).join('')}</div></div><div id="deckViewerGrid" class="card-grid deck-viewer-grid" data-density="${currentDensity}">${entries.length?entries.map(([code,quantity])=>cardTile(code,quantity,map)).join(''):'<div class="empty-state">This deck has no cards yet.</div>'}</div></div>`;
  }
  function open({deck,owner='',readOnly=false}={}){
    if(!deck)return;context={deck,owner,readOnly:!!readOnly};render();const dialog=document.getElementById('deckViewerDialog');if(!dialog.open)dialog.showModal();
  }
  function openCard(code,{owner='',quantity=1}={}){
    ensureDialogs();const card=byCode().get(code),dialog=document.getElementById('publicCardDialog'),title=nameOf(card||{cardCode:code});
    dialog.innerHTML=`<div class="modal-inner public-card-inner"><div class="modal-head"><div><small>${esc(owner||'Public library')}</small><h2>${esc(title)}</h2></div><button class="close-btn" type="button" data-public-card-close aria-label="Close">×</button></div><div class="public-card-layout">${card?.imageUrl?`<img class="detail-image" src="${esc(card.imageUrl)}" alt="${esc(title)}">`:'<div class="detail-image card-placeholder">No image</div>'}<div><p class="detail-meta">${esc(card?.cardSet||'Unknown set')} · ${esc(card?.cardType||'Unknown type')} · ${esc((card?.domains||[]).join(' / '))}</p><div class="info-grid"><div class="info-cell"><strong>${Number(quantity||1)}</strong><small>In this view</small></div><div class="info-cell"><strong>${esc(card?.rarity||'Unknown')}</strong><small>Rarity</small></div></div></div></div></div>`;
    if(!dialog.open)dialog.showModal();
  }

  document.addEventListener('click',event=>{
    let target;
    if(event.target.closest('[data-deck-view-close]')){document.getElementById('deckViewerDialog')?.close();return}
    if(event.target.closest('[data-public-card-close]')){document.getElementById('publicCardDialog')?.close();return}
    if(target=event.target.closest('[data-deck-density]')){localStorage.setItem(DENSITY_KEY,target.dataset.deckDensity);render();return}
    if(target=event.target.closest('[data-deck-view-card]')){
      const code=target.dataset.deckViewCard,quantity=Number(context?.deck?.cards?.[code]||1);
      if(context?.readOnly)openCard(code,{owner:context.owner,quantity});
      else window.RiftboundApp?.showCard?.(code);
    }
  },true);

  window.RiftboundDeckViewer={open,openCard};
})();
