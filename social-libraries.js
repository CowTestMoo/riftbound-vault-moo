(() => {
  'use strict';

  const SUPABASE_URL='https://ivqtgclygiikagfuicjd.supabase.co';
  const SUPABASE_PUBLISHABLE_KEY='sb_publishable_Iweuvn4mcU02xrDyPSJWig_uRWzAsfd';
  const APP_KEY='riftbound-vault-v2';
  const BROWSE_CACHE_MS=2*60*1000;
  const USERNAME_COLORS=['cyan','blue','purple','pink','red','orange','gold','green','white'];
  let profile=null,publishing=false,publishTimer=0,profiles=[],libraries=new Map(),selectedId='',friendTab='collection',query='';
  let typeFilters=[],domainFilters=[],setFilters=[];
  let catalogRef=null,catalogMap=new Map(),profileLoadPromise=null,lastPublishedHash='',lastBrowseLoadedAt=0;

  const esc=(v='')=>String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const session=()=>window.RiftboundCloud?.getSession?.()||null;
  const catalog=()=>window.RiftboundApp?.getCatalog?.()||[];
  const readState=()=>{try{return JSON.parse(localStorage.getItem(APP_KEY)||'{}')}catch{return {}}};
  const nameOf=c=>c?.fullName||c?.name||c?.cardCode||'Unknown card';
  const safeColor=value=>USERNAME_COLORS.includes(value)?value:'cyan';
  function byCode(){const c=catalog();if(c!==catalogRef){catalogRef=c;catalogMap=new Map(c.map(x=>[x.cardCode,x]))}return catalogMap}
  function hash(value){let h=2166136261,s=JSON.stringify(value);for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619)}return(h>>>0).toString(36)}

  async function api(path,{method='GET',body,prefer}={}){
    const s=session();if(!s?.access_token)throw new Error('Sign in to browse libraries.');
    const headers={apikey:SUPABASE_PUBLISHABLE_KEY,Authorization:`Bearer ${s.access_token}`,'Content-Type':'application/json',...(prefer?{Prefer:prefer}:{})};
    const res=await fetch(SUPABASE_URL+path,{method,headers,body:body===undefined?undefined:JSON.stringify(body)});
    let data=null;try{data=await res.json()}catch{}
    if(!res.ok){const e=new Error(data?.message||data?.error_description||data?.details||`HTTP ${res.status}`);e.status=res.status;throw e}return data;
  }

  function usernameHtml(username,color,{id='',className=''}={}){
    return `<span${id?` id="${id}"`:''} class="username-styled animated-username ${className}" data-username-color="${safeColor(color)}">@${esc(username)}</span>`;
  }
  function renderAccount(){
    const top=document.querySelector('.topbar');if(!top)return;let area=document.getElementById('socialAccountArea');
    if(!area){area=document.createElement('div');area.id='socialAccountArea';area.className='social-account-area';top.appendChild(area)}
    const wanted=session()?.user&&profile?usernameHtml(profile.username,profile.username_color,{id:'usernameChip',className:'username-chip'}):'';
    if(area.innerHTML!==wanted)area.innerHTML=wanted;
    ensureUsernameColorSetting();
  }
  function setUsernameRequired(value){document.body.classList.toggle('username-required',!!value)}

  function ensureUsernameDialog(){
    if(document.getElementById('usernameSetupDialog'))return;
    const d=document.createElement('dialog');d.id='usernameSetupDialog';d.className='modal username-setup-dialog';
    d.innerHTML=`<div class="modal-inner username-setup-inner"><div class="username-mark">@</div><h2>Choose your username</h2><p>Create a unique username so friends can find your library. You will still sign in with email and password.</p><label>Username<div class="username-input-wrap"><span>@</span><input id="usernameInput" maxlength="24" autocomplete="off" placeholder="riftbound_friend"></div></label><small class="username-rules">3 to 24 characters. Letters, numbers, and underscores only.</small><div id="usernameMessage" class="feature-message"></div><button id="saveUsernameBtn" class="primary-btn" type="button">Continue</button></div>`;
    d.addEventListener('cancel',event=>{if(!profile)event.preventDefault()});
    d.addEventListener('close',()=>{if(session()?.user&&!profile)setTimeout(showUsername,0)});
    document.body.appendChild(d);
  }
  function showUsername(){ensureUsernameDialog();setUsernameRequired(true);const d=document.getElementById('usernameSetupDialog');if(!d.open)d.showModal();setTimeout(()=>document.getElementById('usernameInput')?.focus(),30)}
  function ensureUsernameColorSetting(){
    const panel=document.getElementById('uxSettings');
    if(!panel||!session()?.user||!profile)return;
    let row=document.getElementById('usernameColorSetting');
    if(!row){
      row=document.createElement('div');row.id='usernameColorSetting';row.className='setting-row username-color-setting';
      row.innerHTML=`<div class="setting-copy"><strong>Username color</strong><small>Choose how your animated username appears to other users.</small></div><select id="usernameColorSelect" aria-label="Username color">${USERNAME_COLORS.map(color=>`<option value="${color}">${color[0].toUpperCase()+color.slice(1)}</option>`).join('')}</select>`;
      panel.appendChild(row);
    }
    document.getElementById('usernameColorSelect').value=safeColor(profile.username_color);
  }
  async function loadOwnProfile(force=false){
    const s=session();
    if(!s?.user){profile=null;profileLoadPromise=null;lastPublishedHash='';setUsernameRequired(false);renderAccount();window.dispatchEvent(new CustomEvent('riftbound-social-ready'));return}
    if(!force&&profile?.user_id===s.user.id){renderAccount();window.dispatchEvent(new CustomEvent('riftbound-social-ready'));return profile}
    if(profileLoadPromise)return profileLoadPromise;
    profileLoadPromise=(async()=>{
      const rows=await api(`/rest/v1/profiles?user_id=eq.${encodeURIComponent(s.user.id)}&select=user_id,username,username_color`);
      profile=rows?.[0]||null;renderAccount();
      if(!profile)showUsername();else{setUsernameRequired(false);document.getElementById('usernameSetupDialog')?.close();schedulePublish(120)}
      window.dispatchEvent(new CustomEvent('riftbound-social-ready'));return profile;
    })().finally(()=>{profileLoadPromise=null});
    return profileLoadPromise;
  }
  async function saveUsername(){
    const s=session(),input=document.getElementById('usernameInput'),msg=document.getElementById('usernameMessage');if(!s?.user)return;
    const username=(input?.value||'').trim();
    if(!/^[A-Za-z0-9_]{3,24}$/.test(username)){msg.textContent='Use 3 to 24 letters, numbers, or underscores.';return}
    msg.textContent='Checking username...';
    try{
      const existing=await api(`/rest/v1/profiles?username=ilike.${encodeURIComponent(username)}&select=user_id`);
      if(existing.some(x=>x.user_id!==s.user.id)){msg.textContent='That username is already taken.';return}
      const color=safeColor(profile?.username_color);
      const rows=await api('/rest/v1/profiles?on_conflict=user_id',{method:'POST',prefer:'resolution=merge-duplicates,return=representation',body:{user_id:s.user.id,username,username_color:color,updated_at:new Date().toISOString()}});
      profile=rows?.[0]||{user_id:s.user.id,username,username_color:color};setUsernameRequired(false);renderAccount();lastPublishedHash='';schedulePublish(120);setTimeout(()=>document.getElementById('usernameSetupDialog')?.close(),120);
    }catch(err){msg.textContent=err.status===409?'That username is already taken.':`Could not save username: ${err.message}`}
  }
  async function saveUsernameColor(color){
    const s=session();if(!s?.user||!profile)return;
    const next=safeColor(color),previous=safeColor(profile.username_color);profile.username_color=next;renderAccount();
    try{
      const rows=await api(`/rest/v1/profiles?user_id=eq.${encodeURIComponent(s.user.id)}`,{method:'PATCH',prefer:'return=representation',body:{username_color:next,updated_at:new Date().toISOString()}});
      profile=rows?.[0]||profile;lastBrowseLoadedAt=0;renderAccount();
    }catch(err){profile.username_color=previous;renderAccount();console.error('Username color save failed',err)}
  }

  function sanitizedDecks(source){
    return (Array.isArray(source)?source:[]).slice(0,100).map((deck,index)=>{
      const cards={};
      for(const [code,value] of Object.entries(deck?.cards||{})){
        const qty=Math.max(0,Math.min(99,Math.floor(Number(value||0))));
        if(qty&&String(code).length<=120)cards[String(code)]=qty;
      }
      return {id:String(deck?.id||`deck-${index}`).slice(0,80),name:String(deck?.name||'Untitled Deck').slice(0,80),champion:String(deck?.champion||'').slice(0,100),notes:String(deck?.notes||'').slice(0,500),cards};
    });
  }
  function publicPayload(){
    const state=readState(),cards={},wishlist={};
    for(const [code,row] of Object.entries(state.inventory||{})){const qty=Math.max(0,Math.floor(Number(row?.owned||0)));if(qty)cards[code]=qty}
    for(const [code,wish] of Object.entries(state.wishlist||{})){const qty=Math.max(1,Math.floor(Number(wish?.qty||1)));wishlist[code]={qty,priority:String(wish?.priority||'Normal').slice(0,20)}}
    return {cards,wishlist,decks:sanitizedDecks(state.decks)};
  }
  async function publish(){
    const s=session();if(!s?.user||!profile||publishing)return;
    const payload=publicPayload(),fingerprint=hash(payload);if(fingerprint===lastPublishedHash)return;publishing=true;
    try{await api('/rest/v1/public_libraries?on_conflict=user_id',{method:'POST',prefer:'resolution=merge-duplicates,return=minimal',body:{user_id:s.user.id,...payload,updated_at:new Date().toISOString()}});lastPublishedHash=fingerprint}
    catch(err){console.error('Library publish failed',err)}finally{publishing=false}
  }
  function schedulePublish(ms=650){clearTimeout(publishTimer);publishTimer=setTimeout(publish,ms)}

  function ensureFriendScreen(){
    if(document.getElementById('friendLibraryScreen'))return;
    const screen=document.createElement('section');screen.id='friendLibraryScreen';screen.className='friend-library-screen';screen.hidden=true;
    screen.innerHTML=`<header class="friend-header"><button id="friendBackBtn" class="ghost-btn" type="button">← My Vault</button><div><h1 id="friendName">Browse Libraries</h1></div></header><div id="friendChooser" class="friend-chooser"><div class="friend-chooser-card"><h2>Browse Libraries</h2><p>Choose another Riftbound Vault username.</p><input id="friendUserSearch" type="search" name="riftbound-library-username-search" autocomplete="off" data-form-type="other" data-1p-ignore="true" data-lpignore="true" placeholder="Search username"><div id="friendUserList" class="friend-user-list"></div></div></div><div id="friendLibraryBody" class="friend-library-body" hidden><nav class="friend-subtabs"><button class="active" data-friend-tab="collection">Collection</button><button data-friend-tab="wishlist">Wishlist</button><button data-friend-tab="decks">Decks</button></nav><div id="friendStats" class="friend-stats"></div><div id="friendFilters" class="friend-filters"><input id="friendCardSearch" type="search" name="riftbound-public-card-search" autocomplete="off" data-form-type="other" data-1p-ignore="true" data-lpignore="true" placeholder="Search this library"><div id="friendTypeFilters" class="filter-row"></div><div id="friendDomainFilters" class="filter-row domain-row"></div><div id="friendSetFilters" class="filter-row"></div></div><div id="friendGrid" class="friend-grid"></div><div id="friendDeckList" class="friend-deck-list" hidden></div></div>`;
    document.body.appendChild(screen);
  }
  function animateEntry(){const theme=document.body.dataset.vaultTheme==='neon'?'neon':'cosmic',overlay=document.createElement('div');overlay.className=`library-transition ${theme}`;overlay.innerHTML=theme==='neon'?'<div class="neon-gate"><span>ACCESSING LIBRARY</span><b>/// DATA LINK ///</b></div>':'<div class="cosmic-gate"><i></i><span>ENTERING LIBRARY</span><b>✦</b></div>';document.body.appendChild(overlay);requestAnimationFrame(()=>overlay.classList.add('go'));setTimeout(()=>overlay.remove(),1450)}

  async function loadBrowseData(force=false){
    if(!force&&profiles.length&&Date.now()-lastBrowseLoadedAt<BROWSE_CACHE_MS)return;
    const [profileRows,libraryRows]=await Promise.all([
      api('/rest/v1/profiles?select=user_id,username,username_color&order=username.asc'),
      api('/rest/v1/public_libraries?select=user_id,cards,wishlist,decks,updated_at')
    ]);
    profiles=Array.isArray(profileRows)?profileRows:[];libraries=new Map((Array.isArray(libraryRows)?libraryRows:[]).map(row=>[row.user_id,row]));lastBrowseLoadedAt=Date.now();
  }
  function renderUsers(value=''){
    const root=document.getElementById('friendUserList');if(!root)return;
    const needle=String(value).toLowerCase().trim(),me=session()?.user?.id||'';
    const list=profiles.filter(row=>row.user_id!==me&&(!needle||row.username.toLowerCase().includes(needle)));
    root.innerHTML=list.length?list.map(row=>{const lib=libraries.get(row.user_id),count=Object.keys(lib?.cards||{}).length,decks=Array.isArray(lib?.decks)?lib.decks.length:0;return `<button class="friend-user-row" data-friend-user="${esc(row.user_id)}"><span>${esc(row.username[0]?.toUpperCase()||'?')}</span><div>${usernameHtml(row.username,row.username_color,{className:'friend-list-username'})}<small>${count} unique cards · ${decks} decks</small></div><b>›</b></button>`}).join(''):'<div class="empty-state">No other usernames found.</div>';
  }
  function cardMeta(code){return byCode().get(code)}
  function activeFriendFilters(key){return key==='type'?typeFilters:key==='domain'?domainFilters:setFilters}
  function buildFilters(entries){
    const cards=entries.map(x=>x.card).filter(Boolean),types=['All',...new Set(cards.map(c=>c.cardType).filter(Boolean))],domains=['All',...new Set(cards.flatMap(c=>c.domains?.length?c.domains:[c.domain]).filter(Boolean))],sets=['All',...new Set(cards.map(c=>c.cardSet).filter(Boolean))];
    const row=(id,values,key)=>{const element=document.getElementById(id),active=activeFriendFilters(key);if(element)element.innerHTML=values.map(value=>`<button class="filter-chip ${(value==='All'?!active.length:active.includes(value))?'active':''}" data-friend-filter="${key}" data-value="${esc(value)}">${esc(value)}</button>`).join('')};
    row('friendTypeFilters',types,'type');row('friendDomainFilters',domains,'domain');row('friendSetFilters',sets,'set');
  }
  function visibleCollection(lib){
    const map=friendTab==='wishlist'?lib?.wishlist||{}:lib?.cards||{};
    return Object.entries(map).map(([code,value])=>({code,card:cardMeta(code),qty:friendTab==='collection'?Number(value||0):Number(value?.qty||1),val:value})).filter(x=>x.qty>0);
  }
  function selectedLibrary(){const selectedProfile=profiles.find(x=>x.user_id===selectedId),library=libraries.get(selectedId);return selectedProfile&&library?{profile:selectedProfile,library}:null}
  function renderPublicDecks(profileRow,lib){
    const root=document.getElementById('friendDeckList'),decks=Array.isArray(lib.decks)?lib.decks:[];
    root.innerHTML=decks.length?decks.map((deck,index)=>{const total=Object.values(deck.cards||{}).reduce((sum,qty)=>sum+Number(qty||0),0);return `<article class="public-deck-row"><div><button type="button" class="public-deck-name" data-public-deck-index="${index}">${esc(deck.name||'Untitled Deck')}</button><p>${total} cards${deck.champion?` · ${esc(deck.champion)}`:''}</p></div><button class="ghost-btn" type="button" data-public-deck-index="${index}">View Deck</button></article>`}).join(''):`<div class="empty-state">@${esc(profileRow.username)} has not shared any decks yet.</div>`;
  }
  function renderFriend(){
    const profileRow=profiles.find(x=>x.user_id===selectedId),lib=libraries.get(selectedId),body=document.getElementById('friendLibraryBody'),chooser=document.getElementById('friendChooser'),grid=document.getElementById('friendGrid'),deckList=document.getElementById('friendDeckList'),filterPanel=document.getElementById('friendFilters');
    if(!profileRow||!lib){body.hidden=true;chooser.hidden=false;return}
    chooser.hidden=true;body.hidden=false;
    const name=document.getElementById('friendName');name.innerHTML=usernameHtml(profileRow.username,profileRow.username_color,{className:'friend-header-username'});
    const cardsTotal=Object.values(lib.cards||{}).reduce((sum,qty)=>sum+Number(qty||0),0),wishTotal=Object.values(lib.wishlist||{}).reduce((sum,wish)=>sum+Number(wish?.qty||1),0),deckTotal=Array.isArray(lib.decks)?lib.decks.length:0;
    document.getElementById('friendStats').innerHTML=`<div><strong>${cardsTotal}</strong><small>Owned</small></div><div><strong>${Object.keys(lib.cards||{}).length}</strong><small>Unique</small></div><div><strong>${wishTotal}</strong><small>Wishlist</small></div><div><strong>${deckTotal}</strong><small>Decks</small></div>`;
    document.querySelectorAll('[data-friend-tab]').forEach(button=>button.classList.toggle('active',button.dataset.friendTab===friendTab));
    const showDecks=friendTab==='decks';filterPanel.hidden=showDecks;grid.hidden=showDecks;deckList.hidden=!showDecks;
    if(showDecks){renderPublicDecks(profileRow,lib)}else{
      let entries=visibleCollection(lib);buildFilters(entries);const needle=query.toLowerCase().trim();
      entries=entries.filter(entry=>{const card=entry.card;if(needle&&!String(`${nameOf(card||{cardCode:entry.code})} ${card?.cardSet||''} ${card?.cardNumber||''}`).toLowerCase().includes(needle))return false;if(typeFilters.length&&!typeFilters.some(type=>card?.cardType===type||(card?.cardTypeLabels||[]).includes(type)))return false;if(domainFilters.length&&!domainFilters.some(domain=>(card?.domains||[card?.domain]).includes(domain)))return false;if(setFilters.length&&!setFilters.includes(card?.cardSet))return false;return true});
      grid.innerHTML=entries.length?entries.map(entry=>`<button class="friend-card" type="button" data-public-card="${esc(entry.code)}">${entry.card?.imageUrl?`<img loading="lazy" decoding="async" fetchpriority="low" src="${esc(entry.card.imageUrl)}" alt="${esc(nameOf(entry.card))}">`:'<div class="friend-placeholder">No image</div>'}<span class="qty-badge">×${entry.qty}</span><div><strong>${esc(nameOf(entry.card||{cardCode:entry.code}))}</strong><small>${esc(entry.card?.cardSet||entry.code)} ${esc(entry.card?.cardNumber||'')}</small>${friendTab==='wishlist'?`<em>${esc(entry.val?.priority||'Normal')} priority</em>`:''}</div></button>`).join(''):'<div class="empty-state">No cards match these filters.</div>';
    }
    window.dispatchEvent(new CustomEvent('riftbound-friend-render',{detail:{userId:selectedId,username:profileRow.username}}));
  }
  function resetFriendFilters(){query='';typeFilters=[];domainFilters=[];setFilters=[];const search=document.getElementById('friendCardSearch');if(search)search.value=''}
  function chooseUser(id){if(!id||id===session()?.user?.id)return;selectedId=id;friendTab='collection';resetFriendFilters();animateEntry();setTimeout(renderFriend,380)}
  async function openBrowser(){
    if(!session()?.user)return;ensureFriendScreen();
    const settings=document.getElementById('uxSettings');if(settings)settings.hidden=true;
    document.querySelectorAll('.mobile-sheet-layer').forEach(layer=>layer.hidden=true);
    const screen=document.getElementById('friendLibraryScreen');screen.hidden=false;document.body.classList.add('friend-library-open');document.getElementById('friendName').textContent='Browse Libraries';document.getElementById('friendChooser').hidden=false;document.getElementById('friendLibraryBody').hidden=true;document.getElementById('friendUserList').innerHTML='<div class="empty-state">Loading libraries...</div>';
    try{await loadBrowseData();renderUsers()}catch(err){document.getElementById('friendUserList').innerHTML=`<div class="empty-state">Could not load libraries: ${esc(err.message)}</div>`}
  }
  function closeBrowser(){const screen=document.getElementById('friendLibraryScreen');if(screen)screen.hidden=true;document.body.classList.remove('friend-library-open');selectedId=''}
  function toggleFriendFilter(key,value){
    const current=activeFriendFilters(key),next=value==='All'?[]:current.includes(value)?current.filter(item=>item!==value):[...current,value];
    if(key==='type')typeFilters=next;else if(key==='domain')domainFilters=next;else setFilters=next;renderFriend();
  }

  function bind(){
    document.addEventListener('click',event=>{
      let target;
      if(event.target.closest('#saveUsernameBtn'))return saveUsername();
      if(event.target.closest('#browseLibrariesUtilityBtn'))return openBrowser();
      if(event.target.closest('#friendBackBtn'))return closeBrowser();
      if(target=event.target.closest('[data-friend-user]'))return chooseUser(target.dataset.friendUser);
      if(target=event.target.closest('[data-friend-tab]')){friendTab=target.dataset.friendTab;resetFriendFilters();return renderFriend()}
      if(target=event.target.closest('[data-friend-filter]'))return toggleFriendFilter(target.dataset.friendFilter,target.dataset.value);
      if(target=event.target.closest('[data-public-deck-index]')){const selected=selectedLibrary(),deck=selected?.library?.decks?.[Number(target.dataset.publicDeckIndex)];if(deck)window.RiftboundDeckViewer?.open?.({deck,owner:`@${selected.profile.username}`,readOnly:true});return}
      if(target=event.target.closest('[data-public-card]')){const selected=selectedLibrary();window.RiftboundDeckViewer?.openCard?.(target.dataset.publicCard,{owner:`@${selected?.profile?.username||''}`,quantity:Number(selected?.library?.cards?.[target.dataset.publicCard]||1)});return}
    },true);
    document.addEventListener('input',event=>{if(event.target.id==='friendUserSearch')renderUsers(event.target.value);if(event.target.id==='friendCardSearch'){query=event.target.value;renderFriend()}});
    document.addEventListener('change',event=>{if(event.target.id==='usernameColorSelect')saveUsernameColor(event.target.value)});
    window.addEventListener('riftbound-local-change',event=>{if(event.detail?.key===APP_KEY)schedulePublish()});
    window.addEventListener('riftbound-cloud-restored',()=>schedulePublish(900));
    window.addEventListener('riftbound-auth-storage-change',()=>{profile=null;lastPublishedHash='';lastBrowseLoadedAt=0;setTimeout(()=>loadOwnProfile(true).catch(console.error),80)});
  }

  async function init(){ensureUsernameDialog();ensureFriendScreen();bind();renderAccount();if(session()?.user)try{await loadOwnProfile()}catch(err){console.error('Profile load failed',err)}}
  window.RiftboundSocial={openBrowser,closeBrowser,publish,getProfile:()=>profile,getSelected:selectedLibrary};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
