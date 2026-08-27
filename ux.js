(() => {
  'use strict';

  const SETTINGS_KEY='riftbound-vault-ux-v1';
  const STORAGE_KEY='riftbound-vault-v2';
  const DOMAIN_GLYPHS={Fury:'✹',Calm:'◌',Mind:'✧',Body:'◆',Chaos:'✦',Order:'✺'};
  const reduce=window.matchMedia('(prefers-reduced-motion: reduce)');
  let catalog=[];
  let catalogByCode=new Map();
  let settings=loadSettings();
  let hoverTimer=0;
  let currentHover='';
  let audioCtx=null;
  let lastSetCompletion=new Map();

  function loadSettings(){
    try{return {density:'normal',intensity:'cosmic',background:98,sound:false,...JSON.parse(localStorage.getItem(SETTINGS_KEY)||'{}')};}
    catch{return {density:'normal',intensity:'cosmic',background:98,sound:false};}
  }
  function saveSettings(){localStorage.setItem(SETTINGS_KEY,JSON.stringify(settings));}
  function readState(){
    try{return {inventory:{},decks:[],loans:[],transactions:[],...JSON.parse(localStorage.getItem(STORAGE_KEY)||'{}')};}
    catch{return {inventory:{},decks:[],loans:[],transactions:[]};}
  }
  const norm=v=>String(v||'').trim().toLowerCase().replace(/\s+/g,'-');
  const nameOf=c=>c?.fullName||c?.name||c?.cardCode||'Unknown card';
  function owned(code){return Number(readState().inventory?.[code]?.owned||0);}
  function decked(code){return readState().decks.reduce((s,d)=>s+Number(d.cards?.[code]||0),0);}
  function loaned(code){return readState().loans.filter(l=>!l.returnedAt&&l.cardCode===code).reduce((s,l)=>s+Number(l.qty||0),0);}
  function available(code){return Math.max(0,owned(code)-decked(code)-loaned(code));}
  function locationFor(card){
    const domains=['Fury','Calm','Mind','Body','Chaos','Order'];
    const domain=domains.find(d=>(card?.domains||[]).includes(d))||(domains.includes(card?.domain)?card.domain:'Unassigned');
    const i=domains.indexOf(domain);
    if(i<0)return{box:null,domain,bucket:'Unassigned',section:card?.cardType||'Other'};
    const labels=(card?.cardTypeLabels||[]).map(x=>String(x).toLowerCase());
    const isChampion=labels.includes('champion');
    const isUnit=String(card?.cardType||'').toLowerCase()==='unit'&&!isChampion;
    const box=i*2+(isUnit?1:2);
    const section=isUnit?`Energy ${Number(card?.energy)>=6?'6+':(card?.energy??'?')}`:(isChampion?'Champions':(card?.cardType||'Other'));
    return{box,domain,bucket:isUnit?'Units':'Other',section};
  }

  async function loadCatalog(){
    try{
      const r=await fetch('./data/cards.json',{cache:'force-cache'});
      if(!r.ok)return;
      const raw=await r.json();
      catalog=(Array.isArray(raw)?raw:(raw.cards||[])).map((c,i)=>({...c,cardCode:String(c.cardCode||c.code||c.id||`card-${i}`),cardSet:c.cardSet||c.setName||c.setCode||'Unknown',imageUrl:c.imageUrl||c.image_url||''}));
      catalogByCode=new Map(catalog.map(c=>[c.cardCode,c]));
      renderDashboard();
      decorateAll();
      updateFooter();
    }catch(err){console.debug('UX catalog layer skipped',err);}
  }

  function ensureStructure(){
    const cardsView=document.getElementById('cardsView');
    if(cardsView&&!document.getElementById('uxControls')){
      const controls=document.createElement('div');
      controls.id='uxControls';controls.className='ux-controls';
      controls.innerHTML=`<div class="ux-control-group"><span class="ux-control-label">Grid</span><button class="ux-segment" data-density="compact">Compact</button><button class="ux-segment" data-density="normal">Normal</button><button class="ux-segment" data-density="large">Large</button></div><button class="ghost-btn ux-settings-btn" id="uxSettingsBtn" type="button">Cosmic Settings</button>`;
      const toolbar=cardsView.querySelector('.toolbar');
      toolbar?.insertAdjacentElement('afterend',controls);
      const summary=document.createElement('div');summary.id='filterSummary';summary.className='filter-summary';summary.innerHTML='<div class="filter-summary-text">All cards</div><button class="clear-filters" id="clearFiltersBtn" type="button">Clear filters</button>';
      const ownedToggle=cardsView.querySelector('.owned-toggle');ownedToggle?.insertAdjacentElement('afterend',summary);
      const dash=document.createElement('div');dash.id='collectionDashboard';dash.className='collection-dashboard';summary.insertAdjacentElement('afterend',dash);
    }
    if(!document.getElementById('quickCard')){const q=document.createElement('aside');q.id='quickCard';q.className='quick-card';q.setAttribute('aria-hidden','true');document.body.appendChild(q);}
    if(!document.getElementById('uxSettings')){
      const p=document.createElement('aside');p.id='uxSettings';p.className='settings-popover';p.hidden=true;
      p.innerHTML=`<div class="settings-head"><h3>Cosmic Settings</h3><button class="settings-close" type="button" aria-label="Close">×</button></div><div class="setting-row"><div class="setting-copy"><strong>Theme intensity</strong><small>How energetic the interface effects feel.</small></div><select id="intensitySelect"><option value="calm">Calm</option><option value="cosmic">Cosmic</option><option value="supernova">Supernova</option></select></div><div class="setting-row"><div class="setting-copy"><strong>Background brightness</strong><small>Adjust stars, nebulae, and constellations.</small></div><input id="backgroundRange" type="range" min="25" max="100" step="1"></div><div class="setting-row"><div class="setting-copy"><strong>Cosmic sounds</strong><small>Optional quiet chimes. Off by default.</small></div><input id="soundToggle" class="sound-toggle" type="checkbox" aria-label="Cosmic sounds"></div>`;
      document.body.appendChild(p);
    }
    if(!document.getElementById('routeToast')){const t=document.createElement('div');t.id='routeToast';t.className='route-toast';document.body.appendChild(t);}
    if(!document.getElementById('mobileNav')){
      const n=document.createElement('nav');n.id='mobileNav';n.className='mobile-nav';n.setAttribute('aria-label','Mobile navigation');n.innerHTML='<button type="button" data-mobile-tab="cards"><b>▦</b>Cards</button><button type="button" data-mobile-tab="storage"><b>⌑</b>Storage</button><button type="button" data-mobile-tab="decks"><b>◇</b>Decks</button><button type="button" data-mobile-tab="loans"><b>↔</b>Loans</button>';document.body.appendChild(n);
    }
    if(!document.getElementById('siteFooter')){
      const f=document.createElement('footer');f.id='siteFooter';f.className='site-footer';f.innerHTML='<div><strong>Riftbound Vault</strong><br>Unofficial fan-made collection tool. Riftbound and related game assets belong to their respective rights holders.</div><div class="footer-meta"><span id="footerCards">Catalog loading…</span><span class="footer-dot" id="footerUpdated">Local collection</span></div>';
      document.querySelector('.app-shell')?.appendChild(f);
    }
  }

  function applySettings(){
    document.body.dataset.intensity=settings.intensity;
    document.documentElement.style.setProperty('--sky-opacity',String(Math.max(.25,Math.min(1,Number(settings.background)/100))));
    const grid=document.getElementById('cardGrid');if(grid)grid.dataset.density=settings.density;
    document.querySelectorAll('[data-density]').forEach(b=>b.classList.toggle('active',b.dataset.density===settings.density));
    const sel=document.getElementById('intensitySelect');if(sel)sel.value=settings.intensity;
    const range=document.getElementById('backgroundRange');if(range)range.value=String(settings.background);
    const sound=document.getElementById('soundToggle');if(sound)sound.checked=!!settings.sound;
  }

  function activeFilterText(){
    const active=[...document.querySelectorAll('.filter-row .filter-chip.active')].map(x=>x.dataset.value).filter(v=>v&&v!=='All');
    const ownedOnly=document.getElementById('ownedOnly')?.checked;
    if(ownedOnly)active.push('Owned only');
    const query=(document.getElementById('cardSearch')?.value||'').trim();
    if(query)active.push(`“${query}”`);
    const visible=document.querySelectorAll('#cardGrid .card-tile').length;
    return {label:active.length?active.join(' • '):'All cards',visible};
  }
  function updateFilterSummary(){const el=document.querySelector('#filterSummary .filter-summary-text');if(!el)return;const x=activeFilterText();el.innerHTML=`<strong>${x.label}</strong> <span>• ${x.visible.toLocaleString()} shown</span>`;}

  function clearFilters(){
    document.getElementById('cardSearch')?.focus();
    const search=document.getElementById('cardSearch');if(search){search.value='';search.dispatchEvent(new Event('input',{bubbles:true}));}
    const owned=document.getElementById('ownedOnly');if(owned&&owned.checked){owned.checked=false;owned.dispatchEvent(new Event('change',{bubbles:true}));}
    document.querySelectorAll('.filter-row').forEach(row=>{const all=[...row.querySelectorAll('.filter-chip')].find(x=>x.dataset.value==='All');if(all&&!all.classList.contains('active'))all.click();});
    setTimeout(updateFilterSummary,0);
  }

  function decorateDomains(){
    document.querySelectorAll('#domainFilters .filter-chip').forEach(chip=>{if(chip.dataset.value==='All'||chip.querySelector('.domain-glyph'))return;const g=DOMAIN_GLYPHS[chip.dataset.value];if(g)chip.insertAdjacentHTML('afterbegin',`<span class="domain-glyph" aria-hidden="true">${g}</span>`);});
    document.querySelectorAll('.storage-box').forEach(box=>{const h=box.querySelector('h3');if(!h||h.querySelector('.domain-glyph'))return;const d=h.textContent.trim().split(/\s+/)[0],g=DOMAIN_GLYPHS[d];if(g)h.insertAdjacentHTML('afterbegin',`<span class="domain-glyph" aria-hidden="true">${g}</span>`);});
  }

  function decorateRarity(){
    document.querySelectorAll('.card-tile[data-card]').forEach(tile=>{
      const card=catalogByCode.get(tile.dataset.card);if(!card)return;
      const rarity=String(card.rarity||'').trim();if(!rarity)return;
      if(!tile.dataset.rarity)tile.dataset.rarity=norm(rarity);
      const caption=tile.querySelector('.card-caption');if(caption&&!caption.querySelector('.rarity-mini'))caption.insertAdjacentHTML('beforeend',`<small class="rarity-mini">${rarity.replace(/</g,'&lt;')}</small>`);
    });
  }

  function decorateImages(){
    document.querySelectorAll('.card-image').forEach(img=>{
      if(img.complete&&img.naturalWidth>0)img.classList.add('loaded');
      if(img.dataset.uxWired)return;img.dataset.uxWired='1';
      img.addEventListener('load',()=>img.classList.add('loaded'),{once:true});
      img.addEventListener('error',()=>{const wrap=img.closest('.card-image-wrap');if(!wrap)return;img.style.display='none';if(!wrap.querySelector('.image-error-state'))wrap.insertAdjacentHTML('beforeend','<div class="image-error-state">Card image unavailable</div>');},{once:true});
    });
  }

  function recentTransactions(){return readState().transactions.filter(t=>Number(t.delta)>0).slice(0,8);}
  function setProgressData(){
    const grouped=new Map();
    for(const c of catalog){const set=c.cardSet||'Unknown';if(!grouped.has(set))grouped.set(set,{set,total:0,owned:0});const x=grouped.get(set);x.total++;if(owned(c.cardCode)>0)x.owned++;}
    return [...grouped.values()].sort((a,b)=>b.owned-a.owned||a.set.localeCompare(b.set));
  }
  function renderDashboard(){
    const root=document.getElementById('collectionDashboard');if(!root||!catalog.length)return;
    const recents=recentTransactions();const progress=setProgressData();
    const recentHtml=recents.length?recents.map(t=>{const c=catalogByCode.get(t.cardCode);return `<button class="recent-card" type="button" data-recent-card="${t.cardCode}">${c?.imageUrl?`<img src="${c.imageUrl}" alt="">`:''}<span><strong>${nameOf(c||{cardCode:t.cardCode})}</strong><small>+${t.delta} added</small></span></button>`;}).join(''):'<div class="recent-empty">Cards you add will appear here.</div>';
    const progressHtml=progress.slice(0,12).map(x=>{const pct=x.total?Math.round(x.owned/x.total*100):0;return `<button class="set-progress ${pct===100?'complete':''}" type="button" data-set-filter="${String(x.set).replace(/"/g,'&quot;')}"><div class="set-progress-top"><strong>${x.set}</strong><span>${x.owned}/${x.total}</span></div><div class="progress-track"><div class="progress-fill" style="width:${pct}%"></div></div></button>`;}).join('');
    root.innerHTML=`<section class="recent-panel"><div class="dashboard-head"><h3>Recently Added</h3><small>Your latest collection updates</small></div><div class="recent-strip">${recentHtml}</div></section><section class="set-progress-panel"><div class="dashboard-head"><h3>Set Completion</h3><small>Unique cards owned</small></div><div class="set-progress-grid">${progressHtml}</div></section>`;
    detectNewCompletions(progress);
  }

  function detectNewCompletions(progress){
    for(const x of progress){const complete=x.total>0&&x.owned===x.total;const prev=lastSetCompletion.get(x.set);if(prev===false&&complete)celebrateCompletion(x.set);lastSetCompletion.set(x.set,complete);}
  }
  function celebrateCompletion(setName){
    if(reduce.matches)return;
    const e=document.createElement('div');e.className='completion-burst';e.innerHTML=`<div class="completion-ring"></div><div class="completion-message"><strong>Set Complete ✦</strong><span>${setName}</span></div>`;document.body.appendChild(e);playTone('complete');setTimeout(()=>e.remove(),2400);
  }

  function quickCardHtml(code){
    const c=catalogByCode.get(code);if(!c)return'';const loc=locationFor(c);
    return `<div class="quick-card-head">${c.imageUrl?`<img src="${c.imageUrl}" alt="">`:''}<div><h4>${nameOf(c)}</h4><div class="q-meta">${c.cardSet||''} • ${c.rarity||'Unknown rarity'} • ${c.cardType||''}</div></div></div><div class="quick-grid"><div><strong>${owned(code)}</strong><small>Owned</small></div><div><strong>${available(code)}</strong><small>Available</small></div><div><strong>${decked(code)+loaned(code)}</strong><small>Allocated</small></div></div><div class="quick-route">Store in: <b>${loc.box?`Box ${loc.box} • ${loc.section}`:'Unassigned'}</b></div>`;
  }
  function showQuick(tile,event){
    if(!window.matchMedia('(hover:hover) and (pointer:fine)').matches)return;const q=document.getElementById('quickCard');if(!q)return;currentHover=tile.dataset.card;clearTimeout(hoverTimer);hoverTimer=setTimeout(()=>{q.innerHTML=quickCardHtml(currentHover);q.classList.add('show');q.setAttribute('aria-hidden','false');positionQuick(event);},180);
  }
  function positionQuick(event){const q=document.getElementById('quickCard');if(!q?.classList.contains('show'))return;const gap=16,w=290,h=q.offsetHeight||180;let x=event.clientX+gap,y=event.clientY+gap;if(x+w>window.innerWidth-8)x=event.clientX-w-gap;if(y+h>window.innerHeight-8)y=window.innerHeight-h-8;q.style.left=`${Math.max(8,x)}px`;q.style.top=`${Math.max(8,y)}px`;}
  function hideQuick(){clearTimeout(hoverTimer);currentHover='';const q=document.getElementById('quickCard');q?.classList.remove('show');q?.setAttribute('aria-hidden','true');}

  function improveQuantityDialog(){
    const dialog=document.getElementById('cardDialog');if(!dialog?.open)return;const actions=dialog.querySelector('.modal-actions');if(!actions||actions.dataset.uxDone)return;const code=actions.querySelector('[data-code]')?.dataset.code;if(!code)return;actions.dataset.uxDone='1';actions.classList.add('quantity-actions');actions.innerHTML=`<button class="ghost-btn quantity-minus" data-adjust="-1" data-code="${code}" type="button">−</button><div class="qty-main"><span>Owned</span><strong>${owned(code)}</strong></div><button class="primary-btn quantity-plus" data-adjust="1" data-code="${code}" type="button">+</button><div class="quantity-presets"><button class="ghost-btn" data-adjust="4" data-code="${code}" type="button">+4</button><button class="ghost-btn" data-adjust="10" data-code="${code}" type="button">+10</button></div>`;
  }

  function showRoute(code,delta){
    const c=catalogByCode.get(code);if(!c||delta<=0)return;const loc=locationFor(c),toast=document.getElementById('routeToast');if(!toast)return;toast.innerHTML=`<span class="route-trail">✦ →</span><strong>${nameOf(c)}</strong> → ${loc.box?`Box ${loc.box} • ${loc.domain} ${loc.bucket} • ${loc.section}`:'Unassigned storage'}`;toast.classList.add('show');playTone('add');clearTimeout(showRoute.timer);showRoute.timer=setTimeout(()=>toast.classList.remove('show'),2700);}

  function playTone(kind){
    if(!settings.sound)return;
    try{
      audioCtx=audioCtx||new (window.AudioContext||window.webkitAudioContext)();
      const now=audioCtx.currentTime,osc=audioCtx.createOscillator(),gain=audioCtx.createGain();
      osc.type='sine';osc.frequency.setValueAtTime(kind==='complete'?660:520,now);osc.frequency.exponentialRampToValueAtTime(kind==='complete'?990:720,now+.16);gain.gain.setValueAtTime(.0001,now);gain.gain.exponentialRampToValueAtTime(.035,now+.025);gain.gain.exponentialRampToValueAtTime(.0001,now+.22);osc.connect(gain).connect(audioCtx.destination);osc.start(now);osc.stop(now+.24);
    }catch{}
  }

  function switchTab(tab){document.querySelector(`.tab[data-tab="${tab}"]`)?.click();syncMobileNav();}
  function syncMobileNav(){const active=document.querySelector('.tab.active')?.dataset.tab;document.querySelectorAll('[data-mobile-tab]').forEach(b=>b.classList.toggle('active',b.dataset.mobileTab===active));}

  function updateFooter(){const f=document.getElementById('footerCards');if(f&&catalog.length)f.textContent=`${catalog.length.toLocaleString()} catalog cards`;const u=document.getElementById('footerUpdated');if(u)u.textContent='Daily catalog sync enabled';}

  function decorateAll(){decorateDomains();decorateRarity();decorateImages();updateFilterSummary();improveQuantityDialog();syncMobileNav();}

  document.addEventListener('click',event=>{
    const density=event.target.closest('[data-density]');if(density){settings.density=density.dataset.density;saveSettings();applySettings();return;}
    if(event.target.closest('#clearFiltersBtn')){clearFilters();return;}
    if(event.target.closest('#uxSettingsBtn')){document.getElementById('uxSettings').hidden=false;return;}
    if(event.target.closest('.settings-close')){document.getElementById('uxSettings').hidden=true;return;}
    const mt=event.target.closest('[data-mobile-tab]');if(mt){switchTab(mt.dataset.mobileTab);return;}
    const recent=event.target.closest('[data-recent-card]');if(recent){document.querySelector(`[data-card="${CSS.escape(recent.dataset.recentCard)}"]`)?.click();return;}
    const set=event.target.closest('[data-set-filter]');if(set){const wanted=set.dataset.setFilter;const chip=[...document.querySelectorAll('#setFilters .filter-chip')].find(x=>x.dataset.value===wanted);chip?.click();document.getElementById('cardsView')?.scrollIntoView({behavior:reduce.matches?'auto':'smooth',block:'start'});return;}
    const add=event.target.closest('[data-adjust],[data-bulk]');if(add){const delta=Number(add.dataset.adjust??add.dataset.bulk??0);if(delta>0)setTimeout(()=>{showRoute(add.dataset.code,delta);renderDashboard();},40);}
  },true);

  document.addEventListener('change',event=>{
    if(event.target.id==='intensitySelect'){settings.intensity=event.target.value;saveSettings();applySettings();}
    if(event.target.id==='soundToggle'){settings.sound=event.target.checked;saveSettings();if(settings.sound)playTone('add');}
  });
  document.addEventListener('input',event=>{if(event.target.id==='backgroundRange'){settings.background=Number(event.target.value);saveSettings();applySettings();}});

  document.addEventListener('mouseover',event=>{const tile=event.target.closest('.card-tile[data-card]');if(tile&&!tile.contains(event.relatedTarget))showQuick(tile,event);});
  document.addEventListener('mousemove',event=>{if(currentHover)positionQuick(event);},{passive:true});
  document.addEventListener('mouseout',event=>{const tile=event.target.closest('.card-tile[data-card]');if(tile&&!tile.contains(event.relatedTarget))hideQuick();});

  document.addEventListener('keydown',event=>{
    const editable=/input|textarea|select/i.test(event.target.tagName)||event.target.isContentEditable;
    if(event.key==='Escape'){document.getElementById('uxSettings').hidden=true;hideQuick();return;}
    if(!editable&&event.key==='/'){event.preventDefault();document.getElementById('cardSearch')?.focus();return;}
    if(editable)return;
    if(event.key==='ArrowRight'||event.key==='ArrowLeft'){
      const dialog=document.getElementById('cardDialog');if(dialog?.open)return;
      const cards=[...document.querySelectorAll('#cardGrid .card-tile')];if(!cards.length)return;
      const focused=document.activeElement;let i=cards.indexOf(focused);if(i<0)return;i+=event.key==='ArrowRight'?1:-1;i=Math.max(0,Math.min(cards.length-1,i));cards[i]?.focus();event.preventDefault();
    }
  });

  const observer=new MutationObserver(records=>{
    let cardsChanged=false,stateChanged=false;
    for(const r of records){if(r.target.closest?.('#cardGrid')||[...r.addedNodes].some(n=>n.nodeType===1&&(n.matches?.('.card-tile')||n.querySelector?.('.card-tile'))))cardsChanged=true;if(r.target.closest?.('.stats-strip')||r.target.id==='cardDialog')stateChanged=true;}
    if(cardsChanged){const grid=document.getElementById('cardGrid');if(grid){grid.classList.add('ux-filtering');setTimeout(()=>grid.classList.remove('ux-filtering'),120);}decorateAll();}
    else if(stateChanged){decorateAll();renderDashboard();}
  });

  function init(){
    ensureStructure();applySettings();decorateAll();
    observer.observe(document.body,{childList:true,subtree:true,characterData:true});
    loadCatalog();
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();