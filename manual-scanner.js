(() => {
  'use strict';

  const LIMIT=40;
  let query='';

  const esc=(v='')=>String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const norm=v=>String(v||'').toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g,'');
  const nameOf=card=>card?.fullName||card?.name||card?.cardCode||'Unknown card';
  const catalog=()=>window.RiftboundApp?.getCatalog?.()||[];
  const owned=code=>Number(window.RiftboundApp?.owned?.(code)||0);

  function toolIsScanner(){
    return document.querySelector('[data-tool="scanner"].active')!==null;
  }

  function updateToolsCopy(){
    const heading=document.querySelector('#toolsView .section-heading p');
    if(heading)heading.textContent='Wishlist, history, card search, and collection values.';
  }

  function searchCards(value){
    const needle=norm(value).trim();
    if(!needle)return [];
    return catalog()
      .map(card=>{
        const name=norm(nameOf(card));
        const haystack=norm(`${nameOf(card)} ${card.cardSet||''} ${card.cardNumber||''} ${card.cardCode||''} ${card.cardType||''}`);
        if(!haystack.includes(needle))return null;
        let score=0;
        if(name===needle)score+=100;
        else if(name.startsWith(needle))score+=60;
        else if(name.includes(needle))score+=30;
        if(norm(card.cardNumber)===needle)score+=50;
        return {card,score};
      })
      .filter(Boolean)
      .sort((a,b)=>b.score-a.score||nameOf(a.card).localeCompare(nameOf(b.card),undefined,{sensitivity:'base'}))
      .slice(0,LIMIT)
      .map(row=>row.card);
  }

  function resultRow(card){
    const code=card.cardCode;
    const location=window.RiftboundApp?.locationFor?.(card);
    return `<div class="manual-scanner-row" data-manual-card="${esc(code)}">
      ${card.imageUrl?`<img src="${esc(card.imageUrl)}" alt="${esc(nameOf(card))}" loading="lazy" decoding="async">`:''}
      <div class="manual-scanner-copy">
        <strong>${esc(nameOf(card))}</strong>
        <small>${esc(card.cardSet||'')} ${esc(card.cardNumber||'')} • Owned ${owned(code)}</small>
        ${location?.boxName?`<small>Store: ${esc(location.boxName)} • ${esc(location.section||'')}</small>`:''}
      </div>
      <div class="manual-scanner-add">
        <input type="number" min="1" max="9999" step="1" value="1" inputmode="numeric" aria-label="Quantity to add for ${esc(nameOf(card))}" data-manual-qty="${esc(code)}">
        <button class="primary-btn" type="button" data-manual-add="${esc(code)}">Add</button>
      </div>
    </div>`;
  }

  function renderResults(){
    const root=document.getElementById('manualScannerResults');
    if(!root)return;
    const cards=searchCards(query);
    if(!query.trim()){
      root.innerHTML='<div class="empty-state">Start typing a card name, set, or card number.</div>';
      return;
    }
    root.innerHTML=cards.length?cards.map(resultRow).join(''):'<div class="empty-state">No cards matched that search.</div>';
  }

  function renderScanner(){
    updateToolsCopy();
    if(!toolIsScanner())return;
    const panel=document.getElementById('toolPanel');
    if(!panel)return;
    panel.innerHTML=`<section class="manual-scanner">
      <div class="manual-scanner-head">
        <div><h3>Card Search</h3><p>Search the catalog, enter how many copies you have, and add them directly to your collection.</p></div>
      </div>
      <div class="manual-scanner-search">
        <input id="manualScannerSearch" type="search" autocomplete="off" autocapitalize="none" autocorrect="off" spellcheck="false" placeholder="Search card name, set, or number" value="${esc(query)}">
      </div>
      <div id="manualScannerStatus" class="feature-message" aria-live="polite"></div>
      <div id="manualScannerResults" class="manual-scanner-results"></div>
    </section>`;
    renderResults();
    requestAnimationFrame(()=>document.getElementById('manualScannerSearch')?.focus());
  }

  function addCopies(code){
    const input=document.querySelector(`[data-manual-qty="${CSS.escape(code)}"]`);
    const qty=Math.max(1,Math.min(9999,Math.floor(Number(input?.value)||1)));
    const card=window.RiftboundApp?.getCard?.(code);
    if(!card)return;
    const before=owned(code);
    window.RiftboundApp?.adjustOwned?.(code,qty,'Card search custom quantity');
    const changed=Math.max(0,owned(code)-before);
    const status=document.getElementById('manualScannerStatus');
    if(status)status.textContent=changed?`Added ${changed}× ${nameOf(card)}.`:'No copies were added.';
    if(changed){window.RiftboundTheme?.play?.('add');window.RiftboundNeonFX?.trigger?.('inventory')}
    renderResults();
  }

  document.addEventListener('input',event=>{
    if(event.target.id==='manualScannerSearch'){
      query=event.target.value;
      renderResults();
    }
  });

  document.addEventListener('keydown',event=>{
    if(!event.target.matches?.('[data-manual-qty]')||event.key!=='Enter')return;
    event.preventDefault();
    addCopies(event.target.dataset.manualQty);
  });

  document.addEventListener('click',event=>{
    const add=event.target.closest?.('[data-manual-add]');
    if(add){addCopies(add.dataset.manualAdd);return}
    if(event.target.closest?.('[data-tool="scanner"]'))setTimeout(renderScanner,0);
  });

  window.addEventListener('riftbound-tool-render',event=>{
    if(event.detail?.tool==='scanner')requestAnimationFrame(renderScanner);
  });
  window.addEventListener('riftbound-catalog-ready',()=>{if(toolIsScanner())requestAnimationFrame(renderScanner)});
  window.addEventListener('riftbound-cloud-restored',()=>{if(toolIsScanner())setTimeout(renderScanner,40)});

  updateToolsCopy();
  window.RiftboundManualScanner={render:renderScanner};
})();
