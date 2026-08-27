(() => {
  'use strict';

  const mq=window.matchMedia('(max-width:700px)');
  const PREF_KEY='riftbound-mobile-ui-v1';
  const SCROLL_KEY='riftbound-mobile-scroll-v1';
  const APP_KEY='riftbound-vault-v2';
  let restoring=false;

  const esc=(v='')=>String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const readPrefs=()=>{try{return {lastTab:'cards',lastTool:'scanner',search:'',type:'All',domain:'All',set:'All',ownedOnly:false,...JSON.parse(localStorage.getItem(PREF_KEY)||'{}')}}catch{return {lastTab:'cards',lastTool:'scanner',search:'',type:'All',domain:'All',set:'All',ownedOnly:false}}};
  const writePrefs=patch=>{const p={...readPrefs(),...patch};localStorage.setItem(PREF_KEY,JSON.stringify(p));return p};
  const currentTab=()=>document.querySelector('.tab.active')?.dataset.tab||'cards';

  function play(kind='click'){
    if(document.body.dataset.vaultTheme==='neon')window.RiftboundNeonAudio?.play?.(kind);
    else window.RiftboundCosmicAudio?.play?.(kind);
  }

  function ensureSheet(id,title){
    let root=document.getElementById(id);
    if(root)return root;
    root=document.createElement('div');
    root.id=id;
    root.className='mobile-sheet-layer';
    root.hidden=true;
    root.innerHTML=`<button class="mobile-sheet-backdrop" type="button" aria-label="Close ${esc(title)}" data-mobile-sheet-close="${id}"></button><section class="mobile-sheet" role="dialog" aria-modal="true" aria-labelledby="${id}Title"><div class="mobile-sheet-head"><div><small>RIFTBOUND VAULT</small><h2 id="${id}Title">${esc(title)}</h2></div><button class="mobile-sheet-close" type="button" aria-label="Close" data-mobile-sheet-close="${id}">×</button></div><div class="mobile-sheet-body"></div></section>`;
    document.body.appendChild(root);
    return root;
  }

  function openSheet(root){
    if(!mq.matches||!root)return;
    document.querySelectorAll('.mobile-sheet-layer').forEach(x=>{if(x!==root)x.hidden=true});
    root.hidden=false;
    document.body.classList.add('mobile-sheet-open');
    play('settings');
  }
  function closeSheet(root){
    if(!root)return;
    root.hidden=true;
    if(![...document.querySelectorAll('.mobile-sheet-layer')].some(x=>!x.hidden))document.body.classList.remove('mobile-sheet-open');
    play('close');
  }

  function ensureToolsSheet(){
    const root=ensureSheet('mobileToolsSheet','Vault Tools');
    const body=root.querySelector('.mobile-sheet-body');
    body.innerHTML=`<div class="mobile-tools-grid"><button class="mobile-tool-action mobile-tool-primary" data-mobile-tool="scanner"><b>⌾</b><span><strong>Scan Card</strong><small>Open the camera scanner</small></span></button><button class="mobile-tool-action" data-mobile-tool="wishlist"><b>☆</b><span><strong>Wishlist</strong><small>Cards you are hunting</small></span></button><button class="mobile-tool-action" data-mobile-tool="trades"><b>⇄</b><span><strong>Trades</strong><small>Plan and track trades</small></span></button><button class="mobile-tool-action" data-mobile-tool="values"><b>$</b><span><strong>Values</strong><small>Collection pricing</small></span></button><button class="mobile-tool-action" data-mobile-tool="activity"><b>↻</b><span><strong>Activity</strong><small>Recent vault changes</small></span></button></div><button class="mobile-all-tools" type="button" data-mobile-tool="all">Open full Tools page</button>`;
    return root;
  }

  function openTool(tool){
    const tab=document.querySelector('.tab[data-tab="tools"]');
    if(!tab)return;
    saveScroll();
    tab.click();
    if(tool&&tool!=='all'){
      setTimeout(()=>document.querySelector(`.tool-subtabs [data-tool="${CSS.escape(tool)}"]`)?.click(),0);
      writePrefs({lastTool:tool});
    }
    writePrefs({lastTab:'tools'});
    closeSheet(document.getElementById('mobileToolsSheet'));
    restoreScroll('tools');
  }

  function filterValue(kind){
    const row=document.getElementById(kind==='type'?'typeFilters':kind==='domain'?'domainFilters':'setFilters');
    return row?.querySelector('.filter-chip.active')?.dataset.value||'All';
  }
  function filterCount(){
    let n=0;
    if(filterValue('type')!=='All')n++;
    if(filterValue('domain')!=='All')n++;
    if(filterValue('set')!=='All')n++;
    if(document.getElementById('ownedOnly')?.checked)n++;
    return n;
  }

  function ensureFilterButton(){
    const toolbar=document.querySelector('#cardsView .toolbar');
    if(!toolbar)return;
    let btn=document.getElementById('mobileFilterBtn');
    if(!btn){
      btn=document.createElement('button');
      btn.id='mobileFilterBtn';
      btn.type='button';
      btn.className='mobile-filter-btn';
      toolbar.appendChild(btn);
    }
    const count=filterCount();
    btn.innerHTML=`<b>≡</b><span>Filters${count?` <i>${count}</i>`:''}</span>`;
  }

  function choicesFor(kind){
    const row=document.getElementById(kind==='type'?'typeFilters':kind==='domain'?'domainFilters':'setFilters');
    return [...(row?.querySelectorAll('.filter-chip')||[])].map(x=>({value:x.dataset.value||x.textContent.trim(),label:x.textContent.trim(),active:x.classList.contains('active')}));
  }

  function renderFilterSheet(){
    const root=ensureSheet('mobileFilterSheet','Filters');
    const body=root.querySelector('.mobile-sheet-body');
    const section=(title,kind)=>`<div class="mobile-filter-section"><h3>${title}</h3><div class="mobile-filter-choices">${choicesFor(kind).map(x=>`<button type="button" class="mobile-filter-choice ${x.active?'active':''}" data-mobile-filter-kind="${kind}" data-mobile-filter-value="${esc(x.value)}">${esc(x.label)}</button>`).join('')}</div></div>`;
    body.innerHTML=`${section('Card Type','type')}${section('Domain','domain')}${section('Set','set')}<label class="mobile-owned-choice"><span><strong>Owned only</strong><small>Only show cards in your vault</small></span><input id="mobileOwnedOnly" type="checkbox" ${document.getElementById('ownedOnly')?.checked?'checked':''}></label><div class="mobile-filter-footer"><button class="ghost-btn" id="mobileClearFilters" type="button">Clear</button><button class="primary-btn" data-mobile-sheet-close="mobileFilterSheet" type="button">Show Cards</button></div>`;
    ensureFilterButton();
    return root;
  }

  function chooseFilter(kind,value){
    const row=document.getElementById(kind==='type'?'typeFilters':kind==='domain'?'domainFilters':'setFilters');
    const chip=[...(row?.querySelectorAll('.filter-chip')||[])].find(x=>x.dataset.value===value);
    chip?.click();
    setTimeout(()=>{renderFilterSheet();saveFilters()},0);
  }

  function saveFilters(){
    if(restoring)return;
    writePrefs({
      search:document.getElementById('cardSearch')?.value||'',
      type:filterValue('type'),domain:filterValue('domain'),set:filterValue('set'),
      ownedOnly:!!document.getElementById('ownedOnly')?.checked
    });
    ensureFilterButton();
  }

  function clearMobileFilters(){
    const search=document.getElementById('cardSearch');
    if(search){search.value='';search.dispatchEvent(new Event('input',{bubbles:true}))}
    const owned=document.getElementById('ownedOnly');
    if(owned?.checked){owned.checked=false;owned.dispatchEvent(new Event('change',{bubbles:true}))}
    ['type','domain','set'].forEach(kind=>{
      const row=document.getElementById(kind==='type'?'typeFilters':kind==='domain'?'domainFilters':'setFilters');
      const all=[...(row?.querySelectorAll('.filter-chip')||[])].find(x=>x.dataset.value==='All');
      if(all&&!all.classList.contains('active'))all.click();
    });
    writePrefs({search:'',type:'All',domain:'All',set:'All',ownedOnly:false});
    setTimeout(()=>renderFilterSheet(),0);
  }

  function cardWishlist(code){
    try{return JSON.parse(localStorage.getItem(APP_KEY)||'{}').wishlist?.[code]||null}catch{return null}
  }
  function toggleWishlist(code){
    let s={};try{s=JSON.parse(localStorage.getItem(APP_KEY)||'{}')}catch{}
    s.wishlist=s.wishlist||{};
    if(s.wishlist[code])delete s.wishlist[code];
    else s.wishlist[code]={qty:1,priority:'Normal',addedAt:new Date().toISOString()};
    localStorage.setItem(APP_KEY,JSON.stringify(s));
    window.RiftboundApp?.reloadState?.();
    window.RiftboundFeatures?.render?.();
    window.RiftboundCloud?.syncNow?.();
    play(s.wishlist[code]?'add':'remove');
    renderCardSheet(code);
  }

  function renderCardSheet(code){
    const app=window.RiftboundApp,c=app?.getCard?.(code);if(!c)return null;
    const root=ensureSheet('mobileCardSheet','Card');
    const body=root.querySelector('.mobile-sheet-body');
    const owned=app.owned?.(code)||0,available=app.available?.(code)||0,loc=app.locationFor?.(c)||{};
    const wish=!!cardWishlist(code);
    body.innerHTML=`<div class="mobile-card-hero">${c.imageUrl?`<img src="${esc(c.imageUrl)}" alt="${esc(c.fullName||c.name||code)}">`:''}<div><h3>${esc(c.fullName||c.name||code)}</h3><p>${esc(c.cardSet||'')} ${esc(c.cardNumber||'')}</p><div class="mobile-card-counts"><span><b>${owned}</b> owned</span><span><b>${available}</b> available</span></div></div></div><div class="mobile-card-primary-actions"><button type="button" class="ghost-btn" data-mobile-card-adjust="-1" data-code="${esc(code)}">−1</button><button type="button" class="primary-btn" data-mobile-card-adjust="1" data-code="${esc(code)}">+1</button></div><div class="mobile-card-secondary-actions"><button type="button" data-mobile-wishlist="${esc(code)}">${wish?'★ Wishlist':'☆ Wishlist'}</button><button type="button" data-mobile-loan="${esc(code)}">↔ Loan</button><button type="button" data-mobile-storage="1">⌑ Storage</button></div><div class="mobile-card-location"><small>STORAGE LOCATION</small><strong>${loc.box?`${esc(loc.boxName||`Box ${loc.box}`)} · ${esc(loc.section||'')}`:'Unassigned'}</strong></div><button type="button" class="mobile-card-details" data-mobile-full-card="${esc(code)}">Full card details</button>`;
    root.querySelector(`#${root.id}Title`).textContent=c.fullName||c.name||'Card';
    return root;
  }

  function openLoanFor(code){
    const c=window.RiftboundApp?.getCard?.(code);
    saveScroll();
    document.querySelector('.tab[data-tab="loans"]')?.click();
    writePrefs({lastTab:'loans'});
    setTimeout(()=>{
      document.getElementById('newLoanBtn')?.click();
      setTimeout(()=>{
        const search=document.getElementById('loanCardSearch');
        if(search){search.value=c?.fullName||c?.name||code;search.dispatchEvent(new Event('input',{bubbles:true}))}
        setTimeout(()=>document.querySelector(`[data-loan-select="${CSS.escape(code)}"]`)?.click(),40);
      },40);
    },0);
    closeSheet(document.getElementById('mobileCardSheet'));
  }

  function openFullCard(code){
    closeSheet(document.getElementById('mobileCardSheet'));
    setTimeout(()=>window.RiftboundApp?.showCard?.(code),0);
  }

  function saveScroll(){
    if(!mq.matches)return;
    let map={};try{map=JSON.parse(sessionStorage.getItem(SCROLL_KEY)||'{}')}catch{}
    map[currentTab()]=Math.max(0,window.scrollY||0);
    sessionStorage.setItem(SCROLL_KEY,JSON.stringify(map));
  }
  function restoreScroll(tab){
    if(!mq.matches)return;
    let map={};try{map=JSON.parse(sessionStorage.getItem(SCROLL_KEY)||'{}')}catch{}
    const y=Number(map[tab]||0);
    requestAnimationFrame(()=>requestAnimationFrame(()=>window.scrollTo({top:y,behavior:'auto'})));
  }

  function restorePrefs(){
    if(!mq.matches)return;
    const p=readPrefs();
    restoring=true;
    const search=document.getElementById('cardSearch');
    if(search&&search.value!==p.search){search.value=p.search;search.dispatchEvent(new Event('input',{bubbles:true}))}
    const owned=document.getElementById('ownedOnly');
    if(owned&&owned.checked!==!!p.ownedOnly){owned.checked=!!p.ownedOnly;owned.dispatchEvent(new Event('change',{bubbles:true}))}
    ['type','domain','set'].forEach(kind=>{
      const wanted=p[kind]||'All';
      const row=document.getElementById(kind==='type'?'typeFilters':kind==='domain'?'domainFilters':'setFilters');
      const chip=[...(row?.querySelectorAll('.filter-chip')||[])].find(x=>x.dataset.value===wanted);
      if(chip&&!chip.classList.contains('active'))chip.click();
    });
    restoring=false;
    ensureFilterButton();

    const wantedTab=['cards','storage','decks','loans','tools'].includes(p.lastTab)?p.lastTab:'cards';
    document.querySelector(`.tab[data-tab="${wantedTab}"]`)?.click();
    if(wantedTab==='tools'&&p.lastTool)setTimeout(()=>document.querySelector(`.tool-subtabs [data-tool="${CSS.escape(p.lastTool)}"]`)?.click(),0);
    restoreScroll(wantedTab);
  }

  function ensureFriendProfileShortcut(){
    if(!mq.matches)return;
    const header=document.querySelector('#friendLibraryScreen .friend-header');
    const name=document.getElementById('friendName');
    const body=document.getElementById('friendLibraryBody');
    if(!header||!name||body?.hidden)return;
    let btn=document.getElementById('mobileFriendProfileBtn');
    if(!btn){
      btn=document.createElement('button');btn.id='mobileFriendProfileBtn';btn.type='button';btn.className='mobile-friend-profile-btn';
      name.insertAdjacentElement('afterend',btn);
    }
    btn.textContent=`Switch ${name.textContent} ▾`;
  }

  function bind(){
    document.addEventListener('click',e=>{
      if(!mq.matches)return;
      const tools=e.target.closest('#mobileToolsCenterBtn');
      if(tools){e.preventDefault();e.stopImmediatePropagation();openSheet(ensureToolsSheet());return}

      const close=e.target.closest('[data-mobile-sheet-close]');
      if(close){closeSheet(document.getElementById(close.dataset.mobileSheetClose));return}

      const tool=e.target.closest('[data-mobile-tool]');
      if(tool){openTool(tool.dataset.mobileTool);return}

      if(e.target.closest('#mobileFilterBtn')){openSheet(renderFilterSheet());return}
      const choice=e.target.closest('[data-mobile-filter-kind]');
      if(choice){chooseFilter(choice.dataset.mobileFilterKind,choice.dataset.mobileFilterValue);return}
      if(e.target.closest('#mobileClearFilters')){clearMobileFilters();return}

      const tile=e.target.closest('#cardGrid .card-tile[data-card]');
      if(tile){e.preventDefault();e.stopImmediatePropagation();openSheet(renderCardSheet(tile.dataset.card));play('card');return}

      const adjust=e.target.closest('[data-mobile-card-adjust]');
      if(adjust){window.RiftboundApp?.adjustOwned?.(adjust.dataset.code,Number(adjust.dataset.mobileCardAdjust),'Mobile quick action');renderCardSheet(adjust.dataset.code);return}
      const wish=e.target.closest('[data-mobile-wishlist]');if(wish){toggleWishlist(wish.dataset.mobileWishlist);return}
      const loan=e.target.closest('[data-mobile-loan]');if(loan){openLoanFor(loan.dataset.mobileLoan);return}
      if(e.target.closest('[data-mobile-storage]')){saveScroll();document.querySelector('.tab[data-tab="storage"]')?.click();writePrefs({lastTab:'storage'});closeSheet(document.getElementById('mobileCardSheet'));restoreScroll('storage');return}
      const full=e.target.closest('[data-mobile-full-card]');if(full){openFullCard(full.dataset.mobileFullCard);return}

      if(e.target.closest('#mobileFriendProfileBtn')){document.getElementById('friendBrowseAnother')?.click();return}

      const tab=e.target.closest('[data-mobile-tab]:not([data-mobile-tab="tools"]),.tab');
      if(tab){const next=tab.dataset.mobileTab||tab.dataset.tab;if(next){saveScroll();writePrefs({lastTab:next});setTimeout(()=>restoreScroll(next),0)}}
      const sub=e.target.closest('.tool-subtabs [data-tool]');if(sub)writePrefs({lastTool:sub.dataset.tool});
      if(e.target.closest('.filter-chip'))setTimeout(saveFilters,0);
      if(e.target.closest('[data-friend-user]'))setTimeout(ensureFriendProfileShortcut,460);
    },true);

    document.addEventListener('change',e=>{
      if(!mq.matches)return;
      if(e.target.id==='mobileOwnedOnly'){
        const owned=document.getElementById('ownedOnly');if(owned){owned.checked=e.target.checked;owned.dispatchEvent(new Event('change',{bubbles:true}))}
        setTimeout(()=>{saveFilters();renderFilterSheet()},0);
      }
      if(e.target.id==='ownedOnly')setTimeout(saveFilters,0);
    });
    document.addEventListener('input',e=>{if(mq.matches&&e.target.id==='cardSearch')saveFilters()});

    window.addEventListener('riftbound-social-ready',()=>setTimeout(ensureFriendProfileShortcut,80));
    window.addEventListener('riftbound-cloud-restored',()=>setTimeout(()=>{ensureFilterButton();ensureFriendProfileShortcut()},80));
    window.addEventListener('pagehide',saveScroll);
  }

  function apply(){
    ensureFilterButton();
    if(mq.matches)ensureFriendProfileShortcut();
    else document.querySelectorAll('.mobile-sheet-layer').forEach(x=>x.hidden=true);
  }

  function init(){
    bind();apply();
    setTimeout(apply,350);
    setTimeout(()=>{apply();restorePrefs()},1250);
  }
  if(typeof mq.addEventListener==='function')mq.addEventListener('change',apply);else mq.addListener(apply);
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
