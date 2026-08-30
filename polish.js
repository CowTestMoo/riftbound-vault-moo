(() => {
  'use strict';

  const rarityMap = new Map();
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  let lastStats = new Map();

  const norm = v => String(v || '').trim().toLowerCase().replace(/\s+/g,'-');

  function rarityClass(value){
    const r = norm(value);
    if (!r) return '';
    if (r.includes('overnumber')) return 'overnumbered';
    if (r.includes('showcase')) return 'showcase';
    if (r.includes('mythic')) return 'mythic';
    if (r.includes('legend')) return 'legendary';
    if (r.includes('epic')) return 'epic';
    if (r.includes('rare')) return 'rare';
    if (r.includes('special')) return 'special';
    return r;
  }

  function useCatalog(cards){
    if(!Array.isArray(cards)||!cards.length)return;
    for(const card of cards){
      const code=String(card.cardCode||card.code||card.id||'');
      if(code)rarityMap.set(code,rarityClass(card.rarity));
    }
    decorateCards(document);
  }

  function connectCatalog(){
    const shared=window.RiftboundApp?.getCatalog?.()||[];
    if(shared.length){useCatalog(shared);return;}
    window.addEventListener('riftbound-catalog-ready',event=>useCatalog(event.detail?.catalog||[]),{once:true});
  }

  function decorateCards(root=document){
    const tiles=[];
    if(root.matches?.('.card-tile[data-card]'))tiles.push(root);
    root.querySelectorAll?.('.card-tile[data-card]').forEach(tile=>tiles.push(tile));
    tiles.forEach(tile=>{
      const rarity = rarityMap.get(tile.dataset.card);
      if(rarity) tile.dataset.rarity = rarity;
    });
  }

  function decorateStorage(root=document){
    const boxes=[];
    if(root.matches?.('.storage-box'))boxes.push(root);
    root.querySelectorAll?.('.storage-box').forEach(box=>boxes.push(box));
    boxes.forEach(box=>{
      const heading = box.querySelector('h3')?.textContent || '';
      const domain = heading.trim().split(/\s+/)[0];
      if(domain) box.dataset.domain = norm(domain);
    });
  }

  function celestialEmptyStates(root=document){
    const states=[];
    if(root.matches?.('.empty-state'))states.push(root);
    root.querySelectorAll?.('.empty-state').forEach(el=>states.push(el));
    states.forEach(el=>{
      const text=(el.textContent||'').trim();
      if(text==='No cards match these filters.') el.textContent='No cards found in this corner of the cosmos.';
      else if(text==='No decks yet.') el.textContent='No decks are charting the stars yet.';
      else if(text==='Nothing is currently loaned out.') el.textContent='All borrowed relics have returned to your orbit.';
      else if(text==='No cards here yet.') el.textContent='This celestial vault is still waiting for its first card.';
    });
  }

  function updateLoadingState(){
    const status=document.getElementById('catalogStatus');
    if(!status) return;
    const loading=/loading/i.test(status.textContent||'');
    document.body.classList.toggle('catalog-loading',loading);
  }

  function animateStatChanges(){
    document.querySelectorAll('.stats-strip > div').forEach(cell=>{
      const span=cell.querySelector('span');
      if(!span) return;
      const prev=lastStats.get(span.id);
      const now=span.textContent;
      if(prev!==undefined && prev!==now && !reduce.matches){
        cell.classList.remove('stat-changed');
        void cell.offsetWidth;
        cell.classList.add('stat-changed');
        setTimeout(()=>cell.classList.remove('stat-changed'),760);
      }
      lastStats.set(span.id,now);
    });
  }

  function burstAt(x,y,rarity=''){
    if(reduce.matches) return;
    const special=['epic','legendary','mythic'].includes(rarity)?'gold':['showcase','special','overnumbered'].includes(rarity)?'violet':'';
    const count=special?18:13;
    for(let i=0;i<count;i++){
      const spark=document.createElement('i');
      spark.className=`collection-burst ${special}`.trim();
      spark.style.left=`${x}px`;
      spark.style.top=`${y}px`;
      spark.style.setProperty('--angle',`${(360/count)*i + Math.random()*18}deg`);
      spark.style.setProperty('--distance',`${32+Math.random()*58}px`);
      spark.style.animationDelay=`${Math.random()*70}ms`;
      document.body.appendChild(spark);
      setTimeout(()=>spark.remove(),950);
    }
  }

  document.addEventListener('click',event=>{
    const add=event.target.closest('[data-adjust],[data-bulk]');
    if(!add) return;
    const delta=Number(add.dataset.adjust ?? add.dataset.bulk ?? 0);
    if(delta<=0) return;
    const rect=add.getBoundingClientRect();
    const code=add.dataset.code || '';
    burstAt(rect.left+rect.width/2,rect.top+rect.height/2,rarityMap.get(code)||'');
  },true);

  const observer=new MutationObserver(records=>{
    let statTouched=false;
    let loadingTouched=false;
    for(const record of records){
      if(record.type==='characterData'){
        if(record.target.parentElement?.closest('.stats-strip'))statTouched=true;
        if(record.target.parentElement?.closest('#catalogStatus'))loadingTouched=true;
        continue;
      }
      if(record.target.closest?.('.stats-strip'))statTouched=true;
      if(record.target.closest?.('#catalogStatus'))loadingTouched=true;
      for(const node of record.addedNodes){
        if(node.nodeType!==1)continue;
        decorateCards(node);
        decorateStorage(node);
        celestialEmptyStates(node);
        if(node.matches?.('.stats-strip,#catalogStatus')||node.querySelector?.('.stats-strip,#catalogStatus')){
          statTouched ||= !!(node.matches?.('.stats-strip')||node.querySelector?.('.stats-strip'));
          loadingTouched ||= !!(node.matches?.('#catalogStatus')||node.querySelector?.('#catalogStatus'));
        }
      }
    }
    if(loadingTouched)updateLoadingState();
    if(statTouched)animateStatChanges();
  });

  observer.observe(document.body,{childList:true,subtree:true,characterData:true});
  decorateCards(document);
  decorateStorage(document);
  celestialEmptyStates(document);
  updateLoadingState();
  animateStatChanges();
  connectCatalog();
})();
