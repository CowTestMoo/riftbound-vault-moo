(() => {
  'use strict';

  const APP_KEY='riftbound-vault-v2';
  const UX_KEY='riftbound-vault-ux-v1';
  const PROFILE_CACHE_MS=2*60*1000;
  const PUBLIC_SUPABASE_URL='https://ivqtgclygiikagfuicjd.supabase.co';
  const PUBLIC_SUPABASE_KEY='sb_publishable_Iweuvn4mcU02xrDyPSJWig_uRWzAsfd';
  const EXTRA_USERNAME_COLORS=['teal','mint','lime','yellow','amber','coral','rose','magenta','violet','indigo','sky','aqua','emerald','lavender','silver'];
  const ALL_USERNAME_COLORS=['cyan','blue','purple','pink','red','orange','gold','green','white',...EXTRA_USERNAME_COLORS];
  const COLOR_LABELS={teal:'Teal',mint:'Mint',lime:'Lime',yellow:'Yellow',amber:'Amber',coral:'Coral',rose:'Rose',magenta:'Magenta',violet:'Violet',indigo:'Indigo',sky:'Sky Blue',aqua:'Aqua',emerald:'Emerald',lavender:'Lavender',silver:'Silver'};
  const LEGACY_DECK_PRIVACY_SELECTORS='[data-deck-share],[data-deck-public],[data-deck-private],[data-deck-visibility],#deckShareToggle,#deckPublicToggle,#deckPrivateToggle,#deckVisibilitySelect,#deckVisibility,.deck-share-setting,.deck-public-setting,.deck-private-setting,.deck-privacy-setting,.deck-visibility-setting';

  const profileColors=new Map();
  let lastProfileColorLoad=0;
  let profileColorPromise=null;
  let screenRefreshFrame=0;
  let recentRefreshFrame=0;
  let recentObserver=null;
  let libraryObserver=null;
  let accountObserver=null;
  let catalogRef=null;
  let catalogMap=new Map();

  const session=()=>window.RiftboundCloud?.getSession?.()||null;
  const ownProfile=()=>window.RiftboundSocial?.getProfile?.()||null;
  const esc=(value='')=>String(value).replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const readJson=(key,fallback={})=>{try{return JSON.parse(localStorage.getItem(key)||'')||fallback}catch{return fallback}};

  function catalogByCode(){
    const catalog=window.RiftboundApp?.getCatalog?.()||[];
    if(catalog!==catalogRef){catalogRef=catalog;catalogMap=new Map(catalog.map(card=>[card.cardCode,card]))}
    return catalogMap;
  }

  function syncLibraryScrollLock(){
    const open=document.body.classList.contains('friend-library-open');
    document.documentElement.classList.toggle('friend-library-open-root',open);
  }

  function ensureExtraColorOptions(){
    const select=document.getElementById('usernameColorSelect');
    if(!select)return;
    for(const color of EXTRA_USERNAME_COLORS){
      if(select.querySelector(`option[value="${color}"]`))continue;
      const option=document.createElement('option');
      option.value=color;
      option.textContent=COLOR_LABELS[color]||color;
      select.appendChild(option);
    }
    const profile=ownProfile();
    if(profile&&ALL_USERNAME_COLORS.includes(profile.username_color)&&select.value!==profile.username_color)select.value=profile.username_color;
  }

  function rememberOwnColor(){
    const profile=ownProfile();
    if(profile?.username&&ALL_USERNAME_COLORS.includes(profile.username_color))profileColors.set(String(profile.username).toLowerCase(),profile.username_color);
  }

  function applyUsernamePresentation(root=document){
    ensureExtraColorOptions();
    rememberOwnColor();
    root.querySelectorAll?.('.username-styled').forEach(element=>{
      const username=String(element.textContent||'').trim().replace(/^@+/,'');
      if(element.textContent!==username)element.textContent=username;
      const color=profileColors.get(username.toLowerCase());
      if(color&&ALL_USERNAME_COLORS.includes(color)&&element.dataset.usernameColor!==color)element.dataset.usernameColor=color;
    });
    const profile=ownProfile(),select=document.getElementById('usernameColorSelect');
    if(profile&&select&&ALL_USERNAME_COLORS.includes(profile.username_color)&&select.value!==profile.username_color)select.value=profile.username_color;
  }

  async function loadProfileColors(force=false){
    const s=session();
    if(!s?.access_token)return;
    if(!force&&profileColors.size&&Date.now()-lastProfileColorLoad<PROFILE_CACHE_MS){applyUsernamePresentation();return}
    if(profileColorPromise)return profileColorPromise;
    profileColorPromise=(async()=>{
      const response=await fetch(`${PUBLIC_SUPABASE_URL}/rest/v1/profiles?select=username,username_color`,{headers:{apikey:PUBLIC_SUPABASE_KEY,Authorization:`Bearer ${s.access_token}`}});
      if(!response.ok)throw new Error(`HTTP ${response.status}`);
      const rows=await response.json();
      profileColors.clear();
      for(const row of Array.isArray(rows)?rows:[]){
        const color=String(row?.username_color||'');
        if(row?.username&&ALL_USERNAME_COLORS.includes(color))profileColors.set(String(row.username).toLowerCase(),color);
      }
      lastProfileColorLoad=Date.now();
      applyUsernamePresentation();
    })().catch(err=>console.error('Username color load failed',err)).finally(()=>{profileColorPromise=null});
    return profileColorPromise;
  }

  async function saveExtraUsernameColor(color){
    const s=session(),profile=ownProfile();
    if(!s?.access_token||!s?.user||!profile||!EXTRA_USERNAME_COLORS.includes(color))return;
    const previous=profile.username_color;
    profile.username_color=color;
    if(profile.username)profileColors.set(String(profile.username).toLowerCase(),color);
    applyUsernamePresentation();
    try{
      const response=await fetch(`${PUBLIC_SUPABASE_URL}/rest/v1/profiles?user_id=eq.${encodeURIComponent(s.user.id)}`,{
        method:'PATCH',
        headers:{apikey:PUBLIC_SUPABASE_KEY,Authorization:`Bearer ${s.access_token}`,'Content-Type':'application/json',Prefer:'return=minimal'},
        body:JSON.stringify({username_color:color,updated_at:new Date().toISOString()})
      });
      if(!response.ok)throw new Error(`HTTP ${response.status}`);
      lastProfileColorLoad=0;
      await loadProfileColors(true);
    }catch(err){
      profile.username_color=previous;
      if(profile.username&&ALL_USERNAME_COLORS.includes(previous))profileColors.set(String(profile.username).toLowerCase(),previous);
      applyUsernamePresentation();
      console.error('Username color save failed',err);
    }
  }

  function stripLegacyDeckPrivacyControls(root=document){
    root.querySelectorAll?.(LEGACY_DECK_PRIVACY_SELECTORS).forEach(element=>{
      const wrapper=element.closest('.setting-row,.feature-form-grid>label,.feature-editor>label,label')||element;
      wrapper.remove();
    });
  }

  function normalizeFriendCopy(root=document){
    root.querySelectorAll?.('.friend-deck-list .empty-state').forEach(element=>{
      let text=String(element.textContent||'').replace(/^@/,'');
      text=text.replace(/has not shared any decks yet\.?/i,'does not have any decks yet.');
      if(element.textContent!==text)element.textContent=text;
    });
  }

  function removeTradingUi(){
    document.querySelectorAll('[data-tool="trades"]').forEach(button=>button.remove());
    const heading=document.querySelector('#toolsView .section-heading p');
    if(heading&&heading.textContent!=='Wishlist, history, camera assist, and collection values.')heading.textContent='Wishlist, history, camera assist, and collection values.';
    const tradeDialog=document.getElementById('tradeDialog');
    if(tradeDialog){if(tradeDialog.open)tradeDialog.close();tradeDialog.remove()}
    if(document.querySelector('#newTradeBtn,.trade-list,.trade-editor-columns'))document.querySelector('[data-tool="wishlist"]')?.click();
  }

  function recentCutoff(){return Number(readJson(UX_KEY,{}).recentClearedAt||0)}
  function positiveRecentTransactions(){
    const cutoff=recentCutoff(),state=readJson(APP_KEY,{transactions:[]});
    return (Array.isArray(state.transactions)?state.transactions:[]).filter(transaction=>Number(transaction?.delta)>0&&Date.parse(transaction?.at||0)>cutoff).slice(0,8);
  }

  function renderRecentPanel(){
    const panel=document.querySelector('#collectionDashboard .recent-panel');
    if(!panel)return;
    const head=panel.querySelector('.dashboard-head'),strip=panel.querySelector('.recent-strip');
    if(!head||!strip)return;
    let button=head.querySelector('#clearRecentBtn');
    if(!button){
      button=document.createElement('button');button.id='clearRecentBtn';button.type='button';button.className='clear-recent-btn';button.textContent='Clear';head.appendChild(button);
    }
    const transactions=positiveRecentTransactions(),map=catalogByCode();
    const html=transactions.length?transactions.map(transaction=>{
      const card=map.get(transaction.cardCode),title=card?.fullName||card?.name||transaction.cardCode||'Unknown card';
      return `<button class="recent-card" type="button" data-recent-card="${esc(transaction.cardCode||'')}">${card?.imageUrl?`<img src="${esc(card.imageUrl)}" alt="">`:''}<span><strong>${esc(title)}</strong><small>+${Number(transaction.delta)||0} added</small></span></button>`;
    }).join(''):'<div class="recent-empty">Cards you add will appear here.</div>';
    if(strip.innerHTML!==html)strip.innerHTML=html;
    button.disabled=!transactions.length;
  }

  function clearRecentlyAdded(){
    const ux=readJson(UX_KEY,{});
    ux.recentClearedAt=Date.now();
    localStorage.setItem(UX_KEY,JSON.stringify(ux));
    renderRecentPanel();
  }

  function queueScreenRefresh(){
    if(screenRefreshFrame)return;
    screenRefreshFrame=requestAnimationFrame(()=>{
      screenRefreshFrame=0;
      syncLibraryScrollLock();
      stripLegacyDeckPrivacyControls();
      normalizeFriendCopy();
      applyUsernamePresentation(document.getElementById('friendLibraryScreen')||document);
    });
  }

  function queueRecentRefresh(){
    if(recentRefreshFrame)return;
    recentRefreshFrame=requestAnimationFrame(()=>{recentRefreshFrame=0;renderRecentPanel()});
  }

  function wireTargetedObservers(){
    const screen=document.getElementById('friendLibraryScreen');
    if(screen&&!libraryObserver){libraryObserver=new MutationObserver(queueScreenRefresh);libraryObserver.observe(screen,{childList:true,subtree:true})}
    const account=document.getElementById('socialAccountArea');
    if(account&&!accountObserver){accountObserver=new MutationObserver(()=>requestAnimationFrame(()=>applyUsernamePresentation(account)));accountObserver.observe(account,{childList:true})}
    const dashboard=document.getElementById('collectionDashboard');
    if(dashboard&&!recentObserver){recentObserver=new MutationObserver(queueRecentRefresh);recentObserver.observe(dashboard,{childList:true,subtree:true})}
  }

  document.addEventListener('click',event=>{
    if(event.target.closest('#clearRecentBtn')){clearRecentlyAdded();return}
    if(event.target.closest('[data-friend-user]')){
      const theme=window.RiftboundTheme?.getTheme?.();
      if(theme==='neon')window.RiftboundNeonAudio?.transition?.();
      else window.RiftboundCosmicAudio?.transition?.();
      queueScreenRefresh();
    }
    if(event.target.closest('#browseLibrariesUtilityBtn')){loadProfileColors(false);setTimeout(queueScreenRefresh,0)}
  },true);

  window.addEventListener('change',event=>{
    if(event.target?.id!=='usernameColorSelect')return;
    if(EXTRA_USERNAME_COLORS.includes(event.target.value)){
      event.stopPropagation();
      saveExtraUsernameColor(event.target.value);
      return;
    }
    requestAnimationFrame(()=>applyUsernamePresentation());
    setTimeout(()=>applyUsernamePresentation(),450);
  },true);

  window.addEventListener('riftbound-social-ready',()=>{
    wireTargetedObservers();
    ensureExtraColorOptions();
    loadProfileColors(false);
    stripLegacyDeckPrivacyControls();
    applyUsernamePresentation();
  });
  window.addEventListener('riftbound-friend-render',()=>{queueScreenRefresh();loadProfileColors(false)});
  window.addEventListener('riftbound-auth-storage-change',()=>{profileColors.clear();lastProfileColorLoad=0;setTimeout(()=>loadProfileColors(true),120)});
  window.addEventListener('riftbound-tool-render',removeTradingUi);
  window.addEventListener('riftbound-ui-render',queueRecentRefresh);
  window.addEventListener('riftbound-local-change',event=>{
    if(event.detail?.key===APP_KEY){queueRecentRefresh();stripLegacyDeckPrivacyControls()}
  });

  function init(){
    syncLibraryScrollLock();
    wireTargetedObservers();
    ensureExtraColorOptions();
    stripLegacyDeckPrivacyControls();
    normalizeFriendCopy();
    removeTradingUi();
    renderRecentPanel();
    applyUsernamePresentation();
    if(session()?.user)loadProfileColors(false);
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
