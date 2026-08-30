(() => {
  'use strict';

  const clamp=value=>Math.max(1,Math.min(9999,Math.floor(Number(value)||1)));

  function enhanceCardDialog(){
    const dialog=document.getElementById('cardDialog');
    if(!dialog?.open||dialog.querySelector('[data-custom-card-add]'))return;
    const anchor=dialog.querySelector('[data-adjust="1"][data-code]');
    if(!anchor)return;
    const code=anchor.dataset.code;
    const actions=anchor.closest('.modal-actions');
    if(!actions)return;
    const wrap=document.createElement('div');
    wrap.className='custom-qty-control';
    wrap.innerHTML=`<input type="number" min="1" max="9999" step="1" value="1" inputmode="numeric" aria-label="Custom quantity to add" data-custom-card-qty="${code}"><button class="primary-btn" type="button" data-custom-card-add="${code}">Add amount</button>`;
    actions.appendChild(wrap);
  }

  function enhanceBulkRows(){
    document.querySelectorAll('#bulkResults .bulk-row').forEach(row=>{
      if(row.querySelector('[data-custom-bulk-add]'))return;
      const sample=row.querySelector('[data-bulk][data-code]');
      if(!sample)return;
      const code=sample.dataset.code;
      const actions=row.querySelector('.bulk-buttons')||row;
      const wrap=document.createElement('div');
      wrap.className='custom-qty-control compact';
      wrap.innerHTML=`<input type="number" min="1" max="9999" step="1" value="1" inputmode="numeric" aria-label="Custom quantity to add" data-custom-bulk-qty="${code}"><button type="button" data-custom-bulk-add="${code}">Add</button>`;
      actions.appendChild(wrap);
    });
  }

  function refresh(){
    enhanceCardDialog();
    enhanceBulkRows();
  }

  function addCustomCard(code,input){
    window.RiftboundApp?.adjustOwned?.(code,clamp(input?.value),'Custom quantity');
    window.RiftboundApp?.showCard?.(code);
    setTimeout(refresh,0);
  }

  function addCustomBulk(code,input){
    window.RiftboundApp?.adjustOwned?.(code,clamp(input?.value),'Bulk custom quantity');
    setTimeout(refresh,0);
  }

  document.addEventListener('click',event=>{
    const card=event.target.closest?.('[data-custom-card-add]');
    if(card){
      const code=card.dataset.customCardAdd;
      addCustomCard(code,document.querySelector(`[data-custom-card-qty="${CSS.escape(code)}"]`));
      return;
    }
    const bulk=event.target.closest?.('[data-custom-bulk-add]');
    if(bulk){
      const code=bulk.dataset.customBulkAdd;
      addCustomBulk(code,document.querySelector(`[data-custom-bulk-qty="${CSS.escape(code)}"]`));
    }
  },true);

  document.addEventListener('keydown',event=>{
    if(event.key!=='Enter')return;
    if(event.target.matches?.('[data-custom-card-qty]')){
      event.preventDefault();
      addCustomCard(event.target.dataset.customCardQty,event.target);
    }else if(event.target.matches?.('[data-custom-bulk-qty]')){
      event.preventDefault();
      addCustomBulk(event.target.dataset.customBulkQty,event.target);
    }
  });

  window.addEventListener('riftbound-ui-render',()=>requestAnimationFrame(refresh));
  document.addEventListener('input',event=>{if(event.target.id==='bulkSearch')requestAnimationFrame(enhanceBulkRows)});
  document.addEventListener('click',event=>{if(event.target.closest?.('#bulkAddBtn'))setTimeout(refresh,20)});

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',refresh,{once:true});else refresh();
})();
