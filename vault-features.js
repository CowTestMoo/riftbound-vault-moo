(() => {
  'use strict';

  const APP_KEY='riftbound-vault-v2';
  let catalog=[];
  let byCode=new Map();
  let activeTool='wishlist';
  let deckDraft=null;
  let loanDraft=null;
  let tradeDraft=null;
  let scanImageUrl='';

  const esc=(v='')=>String(v).replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
  const uid=(p='id')=>`${p}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,9)}`;
  const norm=v=>String(v||'').toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g,'');
  const nameOf=c=>c?.fullName||c?.name||c?.cardCode||'Unknown card';

  function baseState(){return {inventory:{},decks:[],loans:[],transactions:[],wishlist:{},trades:[],prices:{}}}
  function readState(){try{return {...baseState(),...JSON.parse(localStorage.getItem(APP_KEY)||'{}')}}catch{return baseState()}}
  function saveState(s,{render=true}={}){
    localStorage.setItem(APP_KEY,JSON.stringify(s));
    if(!render)return;
    if(window.RiftboundApp?.reloadState)window.RiftboundApp.reloadState();
    else renderFeatures();
  }
  function logAction(s,action,extra={}){s.transactions=[{id:uid('evt'),type:'activity',action,at:new Date().toISOString(),...extra},...(s.transactions||[])].slice(0,500)}
  function owned(code,s=readState()){return Number(s.inventory?.[code]?.owned||0)}
  function decked(code,s=readState(),excludeId=''){return (s.decks||[]).filter(d=>d.id!==excludeId).reduce((n,d)=>n+Number(d.cards?.[code]||0),0)}
  function loaned(code,s=readState()){return (s.loans||[]).filter(l=>!l.returnedAt&&l.cardCode===code).reduce((n,l)=>n+Number(l.qty||0),0)}
  function available(code,s=readState(),excludeDeck=''){return Math.max(0,owned(code,s)-decked(code,s,excludeDeck)-loaned(code,s))}
  function price(code,s=readState()){return Math.max(0,Number(s.prices?.[code]?.market||0))}
  function money(n){return Number(n||0).toLocaleString(undefined,{style:'currency',currency:'USD',maximumFractionDigits:2})}

  async function ensureCatalog(){
    if(window.RiftboundApp?.getCatalog){const c=window.RiftboundApp.getCatalog();if(c?.length){catalog=c;byCode=new Map(c.map(x=>[x.cardCode,x]));return}}
    try{const r=await fetch('./data/cards.json',{cache:'force-cache'}),raw=await r.json();catalog=(Array.isArray(raw)?raw:(raw.cards||[])).map((c,i)=>({...c,cardCode:String(c.cardCode||c.code||c.id||`card-${i}`),cardSet:c.cardSet||c.setName||c.setCode||'Unknown',imageUrl:c.imageUrl||c.image_url||''}));byCode=new Map(catalog.map(c=>[c.cardCode,c]))}catch{}
  }
  function searchCards(q,{ownedOnly=false,limit=30}={}){
    const s=readState(),needle=norm(q).trim();
    return catalog.filter(c=>(!ownedOnly||owned(c.cardCode,s)>0)&&(!needle||norm(`${nameOf(c)} ${c.cardSet} ${c.cardNumber||''} ${c.cardCode}`).includes(needle))).slice(0,limit);
  }

  function ensureTools(){
    const tabs=document.querySelector('.tabs'),main=document.querySelector('main');if(!tabs||!main)return;
    if(!tabs.querySelector('[data-tab="tools"]'))tabs.insertAdjacentHTML('beforeend','<button class="tab" data-tab="tools">Tools</button>');
    if(!document.getElementById('toolsView')){
      const v=document.createElement('section');v.id='toolsView';v.className='view';
      v.innerHTML=`<div class="section-heading"><h2>Vault Tools</h2><p>Wishlist, trades, history, camera assist, and collection values.</p></div><div class="tool-subtabs"><button class="active" data-tool="wishlist">Wishlist</button><button data-tool="trades">Trades</button><button data-tool="activity">Activity</button><button data-tool="scanner">Scanner</button><button data-tool="values">Values</button></div><div id="toolPanel" class="tool-panel"></div>`;
      main.appendChild(v);
    }
    const mobile=document.getElementById('mobileNav');
    if(mobile&&!mobile.querySelector('[data-mobile-tab="tools"]'))mobile.insertAdjacentHTML('beforeend','<button type="button" data-mobile-tab="tools"><b>✦</b>Tools</button>');
  }

  function ensureSettingsTools(){
    const panel=document.getElementById('uxSettings');if(!panel||document.getElementById('dataToolsSetting'))return;
    const row=document.createElement('div');row.id='dataToolsSetting';row.className='setting-row data-tools-setting';
    row.innerHTML=`<div class="setting-copy"><strong>Vault data</strong><small>Restore a backup or undo your latest inventory change.</small></div><div class="settings-inline-actions"><button id="importBackupBtn" class="sound-test" type="button">Import</button><button id="undoInventoryBtn" class="sound-test" type="button">Undo</button><input id="importBackupFile" type="file" accept="application/json,.json" hidden></div>`;
    panel.appendChild(row);
  }

  function renderDecks(){
    const root=document.getElementById('deckList');if(!root)return;
    const s=readState(),decks=s.decks||[];
    root.innerHTML=`<div data-feature-deck-list>${decks.length?decks.map(d=>{
      const total=Object.values(d.cards||{}).reduce((a,b)=>a+Number(b||0),0);
      return `<article class="list-card feature-list-card"><div><h3>${esc(d.name||'Untitled Deck')}</h3><p>${total} cards${d.champion?` • ${esc(d.champion)}`:''}</p></div><div class="feature-card-actions"><button class="ghost-btn" data-edit-deck="${esc(d.id)}">Edit</button><button class="danger-btn" data-delete-deck="${esc(d.id)}">Delete</button></div></article>`;
    }).join(''):'<div class="empty-state">No decks yet. Create one and the vault will reserve those copies automatically.</div>'}</div>`;
  }

  function openDeckEditor(id=''){
    const s=readState(),existing=(s.decks||[]).find(d=>d.id===id);
    deckDraft=existing?JSON.parse(JSON.stringify(existing)):{id:uid('deck'),name:'',champion:'',notes:'',cards:{},createdAt:new Date().toISOString()};
    const d=document.getElementById('deckDialog');
    d.innerHTML=`<div class="modal-inner feature-editor"><div class="modal-head"><h2>${existing?'Edit Deck':'New Deck'}</h2><button class="close-btn" data-close="deckDialog">×</button></div><div class="feature-form-grid"><label>Deck name<input id="deckNameInput" value="${esc(deckDraft.name)}" placeholder="My deck"></label><label>Champion / Legend<input id="deckChampionInput" value="${esc(deckDraft.champion||'')}" placeholder="Optional"></label></div><label>Notes<textarea id="deckNotesInput" rows="2" placeholder="Optional notes">${esc(deckDraft.notes||'')}</textarea></label><div class="feature-search"><input id="deckCardSearch" type="search" placeholder="Search cards to add"></div><div class="deck-editor-layout"><div><h3>Search</h3><div id="deckSearchResults" class="feature-search-results"></div></div><div><h3>Deck list</h3><div id="deckSelectedCards" class="feature-selected-list"></div></div></div><div id="deckEditorMessage" class="feature-message"></div><div class="modal-actions"><button class="primary-btn" id="saveDeckBtn" type="button">Save Deck</button></div></div>`;
    d.showModal();renderDeckSearch('');renderDeckSelected();
  }
  function renderDeckSearch(q){
    const root=document.getElementById('deckSearchResults');if(!root||!deckDraft)return;
    const s=readState(),cards=searchCards(q,{ownedOnly:true,limit:35});
    root.innerHTML=cards.length?cards.map(c=>{
      const max=available(c.cardCode,s,deckDraft.id),qty=Number(deckDraft.cards?.[c.cardCode]||0);
      return `<div class="feature-search-row">${c.imageUrl?`<img src="${esc(c.imageUrl)}" alt="">`:''}<span><strong>${esc(nameOf(c))}</strong><small>${esc(c.cardSet)} • Available ${max}</small></span><button type="button" data-deck-add="${esc(c.cardCode)}" ${qty>=max?'disabled':''}>+</button></div>`;
    }).join(''):'<div class="recent-empty">No owned cards match.</div>';
  }
  function renderDeckSelected(){
    const root=document.getElementById('deckSelectedCards');if(!root||!deckDraft)return;
    const entries=Object.entries(deckDraft.cards||{}).filter(([,q])=>Number(q)>0);
    root.innerHTML=entries.length?entries.map(([code,q])=>{const c=byCode.get(code);return `<div class="selected-card-row"><span><strong>${esc(nameOf(c||{cardCode:code}))}</strong><small>${esc(c?.cardSet||code)}</small></span><div><button data-deck-minus="${esc(code)}">−</button><b>${q}</b><button data-deck-plus="${esc(code)}">+</button></div></div>`}).join(''):'<div class="recent-empty">Add cards from the search results.</div>';
  }
  function adjustDeckDraft(code,delta){
    if(!deckDraft)return;const s=readState(),current=Number(deckDraft.cards?.[code]||0),max=available(code,s,deckDraft.id),next=Math.max(0,Math.min(max,current+delta));if(next)deckDraft.cards[code]=next;else delete deckDraft.cards[code];renderDeckSelected();renderDeckSearch(document.getElementById('deckCardSearch')?.value||'');
  }
  function saveDeck(){
    if(!deckDraft)return;
    deckDraft.name=(document.getElementById('deckNameInput')?.value||'').trim();
    deckDraft.champion=(document.getElementById('deckChampionInput')?.value||'').trim();
    deckDraft.notes=(document.getElementById('deckNotesInput')?.value||'').trim();
    if(!deckDraft.name){document.getElementById('deckEditorMessage').textContent='Give the deck a name.';return}
    const s=readState();
    for(const [code,q] of Object.entries(deckDraft.cards||{})){if(Number(q)>available(code,s,deckDraft.id)){document.getElementById('deckEditorMessage').textContent=`Not enough available copies of ${nameOf(byCode.get(code)||{cardCode:code})}.`;return}}
    deckDraft.updatedAt=new Date().toISOString();
    const i=(s.decks||[]).findIndex(d=>d.id===deckDraft.id);
    if(i>=0)s.decks[i]=deckDraft;else s.decks.push(deckDraft);
    logAction(s,`${i>=0?'Updated':'Created'} deck “${deckDraft.name}”`,{deckId:deckDraft.id});
    saveState(s);document.getElementById('deckDialog').close();
  }

  function renderLoans(){
    const root=document.getElementById('loanList');if(!root)return;
    const s=readState(),active=(s.loans||[]).filter(l=>!l.returnedAt),returned=(s.loans||[]).filter(l=>l.returnedAt).slice(0,8);
    const cardLine=l=>{const c=byCode.get(l.cardCode);return `<article class="list-card feature-list-card"><div><h3>${esc(l.borrower||'Unknown')}</h3><p>${esc(nameOf(c||{cardCode:l.cardCode}))} ×${Number(l.qty||0)} • ${new Date(l.borrowedAt||Date.now()).toLocaleDateString()}</p></div><div class="feature-card-actions">${l.returnedAt?'<span class="status-pill">Returned</span>':`<button class="primary-btn" data-return-loan="${esc(l.id)}">Return</button>`}<button class="danger-btn" data-delete-loan="${esc(l.id)}">Delete</button></div></article>`};
    root.innerHTML=`<div data-feature-loan-list>${active.length?active.map(cardLine).join(''):'<div class="empty-state">Nothing is currently loaned out.</div>'}${returned.length?`<div class="history-divider">Recent returns</div>${returned.map(cardLine).join('')}`:''}</div>`;
  }
  function openLoanEditor(){
    loanDraft={id:uid('loan'),borrower:'',cardCode:'',qty:1,notes:'',borrowedAt:new Date().toISOString(),returnedAt:null};
    const d=document.getElementById('loanDialog');
    d.innerHTML=`<div class="modal-inner feature-editor"><div class="modal-head"><h2>Loan Cards</h2><button class="close-btn" data-close="loanDialog">×</button></div><label>Borrower<input id="loanBorrower" placeholder="Name"></label><label>Notes<textarea id="loanNotes" rows="2" placeholder="Optional"></textarea></label><div class="feature-search"><input id="loanCardSearch" type="search" placeholder="Search an available card"></div><div id="loanSearchResults" class="feature-search-results"></div><div id="loanSelection" class="loan-selection"></div><div id="loanMessage" class="feature-message"></div><div class="modal-actions"><button class="primary-btn" id="saveLoanBtn" type="button">Create Loan</button></div></div>`;
    d.showModal();renderLoanSearch('');
  }
  function renderLoanSearch(q){
    const root=document.getElementById('loanSearchResults');if(!root)return;const s=readState();
    const cards=searchCards(q,{ownedOnly:true,limit:30}).filter(c=>available(c.cardCode,s)>0);
    root.innerHTML=cards.map(c=>`<button class="feature-search-row selectable" data-loan-select="${esc(c.cardCode)}">${c.imageUrl?`<img src="${esc(c.imageUrl)}" alt="">`:''}<span><strong>${esc(nameOf(c))}</strong><small>${esc(c.cardSet)} • ${available(c.cardCode,s)} available</small></span></button>`).join('')||'<div class="recent-empty">No available cards match.</div>';
  }
  function renderLoanSelection(){
    const root=document.getElementById('loanSelection');if(!root||!loanDraft?.cardCode)return;const c=byCode.get(loanDraft.cardCode),max=available(loanDraft.cardCode);
    root.innerHTML=`<div class="selected-card-row"><span><strong>${esc(nameOf(c||{cardCode:loanDraft.cardCode}))}</strong><small>${max} available</small></span><div><button data-loan-qty="-1">−</button><b>${loanDraft.qty}</b><button data-loan-qty="1" ${loanDraft.qty>=max?'disabled':''}>+</button></div></div>`;
  }
  function saveLoan(){
    if(!loanDraft?.cardCode)return;loanDraft.borrower=(document.getElementById('loanBorrower')?.value||'').trim();loanDraft.notes=(document.getElementById('loanNotes')?.value||'').trim();
    const msg=document.getElementById('loanMessage');if(!loanDraft.borrower){msg.textContent='Enter who is borrowing the card.';return}if(loanDraft.qty>available(loanDraft.cardCode)){msg.textContent='Not enough available copies.';return}
    const s=readState();s.loans.push(loanDraft);logAction(s,`Loaned ${loanDraft.qty}× ${nameOf(byCode.get(loanDraft.cardCode)||{cardCode:loanDraft.cardCode})} to ${loanDraft.borrower}`,{loanId:loanDraft.id});saveState(s);document.getElementById('loanDialog').close();
  }

  function renderWishlist(){
    const panel=document.getElementById('toolPanel');if(!panel||activeTool!=='wishlist')return;const s=readState(),entries=Object.entries(s.wishlist||{});
    panel.innerHTML=`<div class="tool-head"><div><h3>Wishlist</h3><p>Track cards you want and how many copies you still need.</p></div></div><div class="feature-search"><input id="wishlistSearch" type="search" placeholder="Search any card to add"></div><div id="wishlistSearchResults" class="feature-search-results compact-results"></div><div class="wishlist-list">${entries.length?entries.map(([code,w])=>{const c=byCode.get(code);return `<article class="list-card feature-list-card"><div class="wishlist-card-info">${c?.imageUrl?`<img src="${esc(c.imageUrl)}" alt="">`:''}<span><h3>${esc(nameOf(c||{cardCode:code}))}</h3><p>${esc(c?.cardSet||'')} • Want ${Number(w.qty||1)} • ${esc(w.priority||'Normal')}</p></span></div><div class="feature-card-actions"><button data-wish-qty="${esc(code)}" data-delta="-1">−</button><button data-wish-qty="${esc(code)}" data-delta="1">+</button><button class="danger-btn" data-wish-remove="${esc(code)}">Remove</button></div></article>`}).join(''):'<div class="empty-state">Your wishlist is empty.</div>'}</div>`;
    renderWishlistSearch('');
  }
  function renderWishlistSearch(q){
    const root=document.getElementById('wishlistSearchResults');if(!root)return;const s=readState(),cards=searchCards(q,{limit:q?20:0}).filter(c=>!s.wishlist?.[c.cardCode]);
    root.innerHTML=cards.map(c=>`<button class="feature-search-row selectable" data-wish-add="${esc(c.cardCode)}">${c.imageUrl?`<img src="${esc(c.imageUrl)}" alt="">`:''}<span><strong>${esc(nameOf(c))}</strong><small>${esc(c.cardSet)} ${esc(c.cardNumber||'')}</small></span><b>+</b></button>`).join('');
  }

  function tradeValue(map,s){return Object.entries(map||{}).reduce((n,[c,q])=>n+price(c,s)*Number(q||0),0)}
  function renderTrades(){
    const panel=document.getElementById('toolPanel');if(!panel||activeTool!=='trades')return;const s=readState(),trades=s.trades||[];
    panel.innerHTML=`<div class="tool-head"><div><h3>Trades</h3><p>Plan what you give and receive. Manual prices feed the comparison.</p></div><button id="newTradeBtn" class="primary-btn">New Trade</button></div><div class="trade-list">${trades.length?trades.map(t=>`<article class="list-card feature-list-card"><div><h3>${esc(t.name||'Untitled Trade')}</h3><p>${esc(t.partner||'No partner')} • Give ${money(tradeValue(t.give,s))} • Receive ${money(tradeValue(t.receive,s))} • ${esc(t.status||'Draft')}</p></div><div class="feature-card-actions"><button class="ghost-btn" data-edit-trade="${esc(t.id)}">Edit</button><button class="danger-btn" data-delete-trade="${esc(t.id)}">Delete</button></div></article>`).join(''):'<div class="empty-state">No trade drafts yet.</div>'}</div>`;
  }
  function openTradeEditor(id=''){
    const s=readState(),existing=(s.trades||[]).find(t=>t.id===id);
    tradeDraft=existing?JSON.parse(JSON.stringify(existing)):{id:uid('trade'),name:'',partner:'',notes:'',give:{},receive:{},status:'Draft',createdAt:new Date().toISOString()};
    let d=document.getElementById('tradeDialog');if(!d){d=document.createElement('dialog');d.id='tradeDialog';d.className='modal';document.body.appendChild(d)}
    d.innerHTML=`<div class="modal-inner feature-editor wide-editor"><div class="modal-head"><h2>${existing?'Edit Trade':'New Trade'}</h2><button class="close-btn" data-feature-close="tradeDialog">×</button></div><div class="feature-form-grid"><label>Trade name<input id="tradeName" value="${esc(tradeDraft.name)}" placeholder="Convention trade"></label><label>Trading with<input id="tradePartner" value="${esc(tradeDraft.partner||'')}" placeholder="Name"></label></div><label>Notes<textarea id="tradeNotes" rows="2">${esc(tradeDraft.notes||'')}</textarea></label><div class="trade-editor-columns"><div><h3>You Give</h3><input id="tradeGiveSearch" type="search" placeholder="Search your cards"><div id="tradeGiveResults" class="feature-search-results compact-results"></div><div id="tradeGiveSelected" class="feature-selected-list"></div></div><div><h3>You Receive</h3><input id="tradeReceiveSearch" type="search" placeholder="Search cards"><div id="tradeReceiveResults" class="feature-search-results compact-results"></div><div id="tradeReceiveSelected" class="feature-selected-list"></div></div></div><div id="tradeTotals" class="trade-totals"></div><div class="modal-actions"><button class="primary-btn" id="saveTradeBtn">Save Trade</button><button class="ghost-btn" id="completeTradeBtn">Mark Completed</button></div></div>`;
    d.showModal();renderTradeSearch('give','');renderTradeSearch('receive','');renderTradeSelected();
  }
  function renderTradeSearch(side,q){
    const root=document.getElementById(side==='give'?'tradeGiveResults':'tradeReceiveResults');if(!root||!tradeDraft)return;const s=readState();
    const cards=searchCards(q,{ownedOnly:side==='give',limit:q?18:0}).filter(c=>side!=='give'||available(c.cardCode,s)>0);
    root.innerHTML=cards.map(c=>`<button class="feature-search-row selectable" data-trade-add="${side}" data-code="${esc(c.cardCode)}">${c.imageUrl?`<img src="${esc(c.imageUrl)}" alt="">`:''}<span><strong>${esc(nameOf(c))}</strong><small>${esc(c.cardSet)}${side==='give'?` • ${available(c.cardCode,s)} available`:''}${price(c.cardCode,s)?` • ${money(price(c.cardCode,s))}`:''}</small></span><b>+</b></button>`).join('');
  }
  function renderTradeSelected(){
    if(!tradeDraft)return;const s=readState();
    for(const side of ['give','receive']){const root=document.getElementById(side==='give'?'tradeGiveSelected':'tradeReceiveSelected');if(!root)continue;const map=tradeDraft[side]||{};root.innerHTML=Object.entries(map).filter(([,q])=>q>0).map(([code,q])=>`<div class="selected-card-row"><span><strong>${esc(nameOf(byCode.get(code)||{cardCode:code}))}</strong><small>${price(code,s)?money(price(code,s)):'No price'}</small></span><div><button data-trade-qty="${side}" data-code="${esc(code)}" data-delta="-1">−</button><b>${q}</b><button data-trade-qty="${side}" data-code="${esc(code)}" data-delta="1">+</button></div></div>`).join('')||'<div class="recent-empty">No cards selected.</div>'}
    const totals=document.getElementById('tradeTotals');if(totals){const give=tradeValue(tradeDraft.give,s),receive=tradeValue(tradeDraft.receive,s);totals.innerHTML=`<span>Give <b>${money(give)}</b></span><span>Receive <b>${money(receive)}</b></span><span>Difference <b>${money(receive-give)}</b></span>`}
  }
  function adjustTrade(side,code,delta){
    const s=readState(),map=tradeDraft[side],cur=Number(map[code]||0),max=side==='give'?available(code,s):99,next=Math.max(0,Math.min(max,cur+delta));if(next)map[code]=next;else delete map[code];renderTradeSelected();
  }
  function saveTrade(status){
    tradeDraft.name=(document.getElementById('tradeName')?.value||'').trim()||'Untitled Trade';tradeDraft.partner=(document.getElementById('tradePartner')?.value||'').trim();tradeDraft.notes=(document.getElementById('tradeNotes')?.value||'').trim();if(status)tradeDraft.status=status;tradeDraft.updatedAt=new Date().toISOString();
    const s=readState(),i=(s.trades||[]).findIndex(t=>t.id===tradeDraft.id);if(i>=0)s.trades[i]=tradeDraft;else s.trades.push(tradeDraft);logAction(s,`${i>=0?'Updated':'Created'} trade “${tradeDraft.name}”`,{tradeId:tradeDraft.id});saveState(s);document.getElementById('tradeDialog').close();
  }

  function renderActivity(){
    const panel=document.getElementById('toolPanel');if(!panel||activeTool!=='activity')return;const s=readState(),tx=s.transactions||[];
    panel.innerHTML=`<div class="tool-head"><div><h3>Activity</h3><p>Your latest vault changes.</p></div><button id="activityUndoBtn" class="ghost-btn">Undo Last Inventory Change</button></div><div class="activity-list">${tx.length?tx.slice(0,100).map(t=>{const c=byCode.get(t.cardCode),label=t.action||(Number.isFinite(Number(t.delta))?`${Number(t.delta)>0?'+':''}${t.delta} ${nameOf(c||{cardCode:t.cardCode})}`:(t.reason||t.type||'Vault update'));return `<div class="activity-row"><span><strong>${esc(label)}</strong><small>${new Date(t.at||Date.now()).toLocaleString()}${t.reason?` • ${esc(t.reason)}`:''}</small></span></div>`}).join(''):'<div class="empty-state">No activity yet.</div>'}</div>`;
  }
  function undoLastInventory(){
    const s=readState(),i=(s.transactions||[]).findIndex(t=>t.cardCode&&Number.isFinite(Number(t.delta))&&Number(t.delta)!==0&&t.type!=='activity');
    if(i<0){alert('There is no inventory change to undo yet.');return}
    const t=s.transactions[i],code=t.cardCode,current=owned(code,s),allocated=decked(code,s)+loaned(code,s),next=Math.max(allocated,current-Number(t.delta));
    s.inventory[code]={...(s.inventory[code]||{}),owned:next};s.transactions.splice(i,1);logAction(s,`Undid inventory change for ${nameOf(byCode.get(code)||{cardCode:code})}`);saveState(s);
  }

  function renderScanner(){
    const panel=document.getElementById('toolPanel');if(!panel||activeTool!=='scanner')return;
    panel.innerHTML=`<div class="tool-head"><div><h3>Camera Assist</h3><p>Take a clear card photo for automatic recognition, or use manual catalog search below.</p></div><span class="status-pill">Beta</span></div><div class="scanner-grid"><div class="scanner-capture">${scanImageUrl?`<img src="${esc(scanImageUrl)}" alt="Captured card">`:'<div class="scanner-placeholder">✦<br>Card photo preview</div>'}<label class="primary-btn scanner-file-label">Take / Choose Photo<input id="scannerFile" type="file" accept="image/*" capture="environment" hidden></label></div><div><div class="feature-search"><input id="scannerSearch" type="search" placeholder="Search the captured card by name"></div><div id="scannerResults" class="feature-search-results"></div></div></div>`;
    renderScannerSearch('');
  }
  function renderScannerSearch(q){const root=document.getElementById('scannerResults');if(!root)return;const cards=searchCards(q,{limit:q?30:0});root.innerHTML=cards.map(c=>`<div class="feature-search-row">${c.imageUrl?`<img src="${esc(c.imageUrl)}" alt="">`:''}<span><strong>${esc(nameOf(c))}</strong><small>${esc(c.cardSet)} ${esc(c.cardNumber||'')}</small></span><button data-scan-add="${esc(c.cardCode)}">+1</button></div>`).join('')}

  function renderValues(){
    const panel=document.getElementById('toolPanel');if(!panel||activeTool!=='values')return;const s=readState(),ownedCards=catalog.filter(c=>owned(c.cardCode,s)>0);
    const total=ownedCards.reduce((n,c)=>n+owned(c.cardCode,s)*price(c.cardCode,s),0),valued=ownedCards.filter(c=>price(c.cardCode,s)>0).length;
    panel.innerHTML=`<div class="tool-head"><div><h3>Collection Values</h3><p>Daily market prices are synced automatically when available. You can still set a manual override.</p></div><div class="value-total"><small>Estimated value</small><strong>${money(total)}</strong></div></div><div class="value-summary">${valued}/${ownedCards.length} owned cards have a price</div><div class="feature-search"><input id="valueSearch" type="search" placeholder="Search owned cards"></div><div id="valueRows" class="value-rows"></div>`;
    renderValueRows('');
  }
  function renderValueRows(q){
    const root=document.getElementById('valueRows');if(!root)return;const s=readState(),needle=norm(q);
    const cards=catalog.filter(c=>owned(c.cardCode,s)>0&&(!needle||norm(`${nameOf(c)} ${c.cardSet}`).includes(needle))).slice(0,150);
    root.innerHTML=cards.map(c=>`<div class="value-row">${c.imageUrl?`<img src="${esc(c.imageUrl)}" alt="">`:''}<span><strong>${esc(nameOf(c))}</strong><small>${owned(c.cardCode,s)} owned • ${esc(c.cardSet)}</small></span><label>$ <input type="number" min="0" step=".01" data-price-code="${esc(c.cardCode)}" value="${price(c.cardCode,s)||''}" placeholder="0.00"></label><b>${money(owned(c.cardCode,s)*price(c.cardCode,s))}</b></div>`).join('')||'<div class="empty-state">No owned cards match.</div>';
  }

  function renderTool(){
    document.querySelectorAll('.tool-subtabs [data-tool]').forEach(b=>b.classList.toggle('active',b.dataset.tool===activeTool));
    if(activeTool==='wishlist')renderWishlist();else if(activeTool==='trades')renderTrades();else if(activeTool==='activity')renderActivity();else if(activeTool==='scanner')renderScanner();else renderValues();
    window.dispatchEvent(new CustomEvent('riftbound-tool-render',{detail:{tool:activeTool}}));
  }
  function renderFeatures(){ensureTools();ensureSettingsTools();renderDecks();renderLoans();renderTool()}

  function openFastBulk(){
    const d=document.getElementById('bulkDialog'),sets=[...new Set(catalog.map(c=>c.cardSet).filter(Boolean))].sort();
    d.innerHTML=`<div class="modal-inner feature-editor wide-editor"><div class="modal-head"><h2>Fast Bulk Add</h2><button class="close-btn" data-close="bulkDialog">×</button></div><div class="bulk-fast-controls"><input id="fastBulkSearch" type="search" placeholder="Search cards"><select id="fastBulkSet"><option value="">All sets</option>${sets.map(x=>`<option>${esc(x)}</option>`).join('')}</select></div><p class="bulk-hint">Keyboard: Enter adds +1 to the first result. Shift+Enter adds +4. The window stays open while you enter your collection.</p><div id="fastBulkResults" class="bulk-fast-results"></div></div>`;
    d.showModal();renderFastBulk();setTimeout(()=>document.getElementById('fastBulkSearch')?.focus(),20);
  }
  function renderFastBulk(){
    const root=document.getElementById('fastBulkResults');if(!root)return;const q=document.getElementById('fastBulkSearch')?.value||'',set=document.getElementById('fastBulkSet')?.value||'',s=readState();
    const cards=searchCards(q,{limit:80}).filter(c=>!set||c.cardSet===set);
    root.innerHTML=cards.map((c,i)=>`<div class="bulk-fast-row" ${i===0?'data-first-bulk="1"':''}>${c.imageUrl?`<img src="${esc(c.imageUrl)}" alt="">`:''}<span><strong>${esc(nameOf(c))}</strong><small>${esc(c.cardSet)} ${esc(c.cardNumber||'')} • Owned ${owned(c.cardCode,s)}</small></span><div><button data-fast-bulk="${esc(c.cardCode)}" data-delta="1">+1</button><button data-fast-bulk="${esc(c.cardCode)}" data-delta="4">+4</button><button data-fast-bulk="${esc(c.cardCode)}" data-delta="10">+10</button></div></div>`).join('');
  }
  function fastAdjust(code,delta,reason='Fast bulk entry'){
    const s=readState(),cur=owned(code,s);s.inventory[code]={...(s.inventory[code]||{}),owned:cur+delta};s.transactions.unshift({id:uid('txn'),cardCode:code,delta,reason,at:new Date().toISOString()});saveState(s);renderFastBulk();
  }

  function importBackup(file){
    const reader=new FileReader();reader.onload=()=>{try{const raw=JSON.parse(reader.result),incoming=raw.state||raw.vault||raw;if(!incoming||typeof incoming!=='object'||!incoming.inventory)throw new Error('This file does not contain a Riftbound Vault state.');if(!confirm('Replace this device’s current vault with the imported backup?'))return;localStorage.setItem(APP_KEY,JSON.stringify({...baseState(),...incoming}));window.RiftboundApp?.reloadState?.();window.RiftboundCloud?.syncNow?.();alert('Backup imported.')}catch(err){alert(`Import failed: ${err.message}`)}};reader.readAsText(file);
  }

  document.addEventListener('click',e=>{
    if(e.target.closest('#newDeckBtn')){e.preventDefault();e.stopImmediatePropagation();openDeckEditor();return}
    if(e.target.closest('#newLoanBtn')){e.preventDefault();e.stopImmediatePropagation();openLoanEditor();return}
    if(e.target.closest('#bulkAddBtn')){e.preventDefault();e.stopImmediatePropagation();openFastBulk();return}
  },true);

  document.addEventListener('click',e=>{
    let x;
    if(x=e.target.closest('[data-tool]')){activeTool=x.dataset.tool;renderTool();return}
    if(x=e.target.closest('[data-edit-deck]')){openDeckEditor(x.dataset.editDeck);return}
    if(x=e.target.closest('[data-delete-deck]')){if(confirm('Delete this deck?')){const s=readState(),d=s.decks.find(d=>d.id===x.dataset.deleteDeck);s.decks=s.decks.filter(d=>d.id!==x.dataset.deleteDeck);logAction(s,`Deleted deck “${d?.name||'Deck'}”`);saveState(s)}return}
    if(x=e.target.closest('[data-deck-add]')){adjustDeckDraft(x.dataset.deckAdd,1);return}
    if(x=e.target.closest('[data-deck-plus]')){adjustDeckDraft(x.dataset.deckPlus,1);return}
    if(x=e.target.closest('[data-deck-minus]')){adjustDeckDraft(x.dataset.deckMinus,-1);return}
    if(e.target.closest('#saveDeckBtn')){saveDeck();return}
    if(x=e.target.closest('[data-loan-select]')){loanDraft.cardCode=x.dataset.loanSelect;loanDraft.qty=1;renderLoanSelection();return}
    if(x=e.target.closest('[data-loan-qty]')){const max=available(loanDraft.cardCode);loanDraft.qty=Math.max(1,Math.min(max,loanDraft.qty+Number(x.dataset.loanQty)));renderLoanSelection();return}
    if(e.target.closest('#saveLoanBtn')){saveLoan();return}
    if(x=e.target.closest('[data-return-loan]')){const s=readState(),l=s.loans.find(l=>l.id===x.dataset.returnLoan);if(l){l.returnedAt=new Date().toISOString();logAction(s,`Returned ${l.qty}× ${nameOf(byCode.get(l.cardCode)||{cardCode:l.cardCode})} from ${l.borrower}`,{loanId:l.id});saveState(s)}return}
    if(x=e.target.closest('[data-delete-loan]')){if(confirm('Delete this loan record?')){const s=readState();s.loans=s.loans.filter(l=>l.id!==x.dataset.deleteLoan);saveState(s)}return}
    if(x=e.target.closest('[data-wish-add]')){const s=readState();s.wishlist[x.dataset.wishAdd]={qty:1,priority:'Normal',addedAt:new Date().toISOString()};logAction(s,`Added ${nameOf(byCode.get(x.dataset.wishAdd)||{cardCode:x.dataset.wishAdd})} to wishlist`);saveState(s);return}
    if(x=e.target.closest('[data-wish-qty]')){const s=readState(),w=s.wishlist[x.dataset.wishQty];if(w){w.qty=Math.max(1,Number(w.qty||1)+Number(x.dataset.delta));saveState(s)}return}
    if(x=e.target.closest('[data-wish-remove]')){const s=readState();delete s.wishlist[x.dataset.wishRemove];saveState(s);return}
    if(e.target.closest('#newTradeBtn')){openTradeEditor();return}
    if(x=e.target.closest('[data-edit-trade]')){openTradeEditor(x.dataset.editTrade);return}
    if(x=e.target.closest('[data-delete-trade]')){if(confirm('Delete this trade?')){const s=readState();s.trades=s.trades.filter(t=>t.id!==x.dataset.deleteTrade);saveState(s)}return}
    if(x=e.target.closest('[data-trade-add]')){adjustTrade(x.dataset.tradeAdd,x.dataset.code,1);return}
    if(x=e.target.closest('[data-trade-qty]')){adjustTrade(x.dataset.tradeQty,x.dataset.code,Number(x.dataset.delta));return}
    if(e.target.closest('#saveTradeBtn')){saveTrade();return}
    if(e.target.closest('#completeTradeBtn')){saveTrade('Completed');return}
    if(x=e.target.closest('[data-feature-close]')){document.getElementById(x.dataset.featureClose)?.close();return}
    if(e.target.closest('#activityUndoBtn')||e.target.closest('#undoInventoryBtn')){undoLastInventory();return}
    if(e.target.closest('#importBackupBtn')){document.getElementById('importBackupFile')?.click();return}
    if(x=e.target.closest('[data-scan-add]')){fastAdjust(x.dataset.scanAdd,1,'Camera assist');return}
    if(x=e.target.closest('[data-fast-bulk]')){fastAdjust(x.dataset.fastBulk,Number(x.dataset.delta));return}
  },false);

  document.addEventListener('input',e=>{
    if(e.target.id==='deckCardSearch')renderDeckSearch(e.target.value);
    if(e.target.id==='loanCardSearch')renderLoanSearch(e.target.value);
    if(e.target.id==='wishlistSearch')renderWishlistSearch(e.target.value);
    if(e.target.id==='tradeGiveSearch')renderTradeSearch('give',e.target.value);
    if(e.target.id==='tradeReceiveSearch')renderTradeSearch('receive',e.target.value);
    if(e.target.id==='scannerSearch')renderScannerSearch(e.target.value);
    if(e.target.id==='valueSearch')renderValueRows(e.target.value);
    if(e.target.id==='fastBulkSearch')renderFastBulk();
    if(e.target.matches('[data-price-code]')){const s=readState(),code=e.target.dataset.priceCode,val=Math.max(0,Number(e.target.value||0));s.prices[code]={market:val,source:'Manual',updatedAt:new Date().toISOString()};localStorage.setItem(APP_KEY,JSON.stringify(s))}
  });
  document.addEventListener('change',e=>{
    if(e.target.id==='fastBulkSet')renderFastBulk();
    if(e.target.id==='importBackupFile'&&e.target.files?.[0])importBackup(e.target.files[0]);
    if(e.target.id==='scannerFile'&&e.target.files?.[0]){if(scanImageUrl)URL.revokeObjectURL(scanImageUrl);scanImageUrl=URL.createObjectURL(e.target.files[0]);renderScanner()}
    if(e.target.matches('[data-price-code]')){renderValues();window.RiftboundCloud?.syncNow?.()}
  });
  document.addEventListener('keydown',e=>{
    if(e.target.id==='fastBulkSearch'&&e.key==='Enter'){e.preventDefault();const first=document.querySelector('[data-first-bulk] [data-fast-bulk]');if(first)fastAdjust(first.dataset.fastBulk,e.shiftKey?4:1)}
  });

  async function init(){
    await ensureCatalog();ensureTools();ensureSettingsTools();renderFeatures();
    window.addEventListener('riftbound-cloud-restored',()=>{ensureCatalog().then(renderFeatures)});
    window.addEventListener('riftbound-ui-render',e=>{
      const scopes=e.detail?.scopes||[],dl=document.getElementById('deckList'),ll=document.getElementById('loanList');
      const needsDeck=scopes.includes('decks')&&dl&&!dl.querySelector('[data-feature-deck-list]');
      const needsLoan=scopes.includes('loans')&&ll&&!ll.querySelector('[data-feature-loan-list]');
      if(needsDeck||needsLoan)renderFeatures();
    });
  }
  window.RiftboundFeatures={render:renderFeatures,undo:undoLastInventory};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();