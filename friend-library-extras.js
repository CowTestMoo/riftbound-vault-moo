(() => {
  'use strict';

  const SUPABASE_URL='https://ivqtgclygiikagfuicjd.supabase.co';
  const SUPABASE_PUBLISHABLE_KEY='sb_publishable_Iweuvn4mcU02xrDyPSJWig_uRWzAsfd';
  const APP_KEY='riftbound-vault-v2';
  const EXTRA_USERNAME_COLORS=['teal','mint','lime','yellow','amber','coral','rose','magenta','violet','indigo','sky','aqua','emerald','lavender','silver'];
  const ALL_USERNAME_COLORS=['cyan','blue','purple','pink','red','orange','gold','green','white',...EXTRA_USERNAME_COLORS];
  const COLOR_LABELS={teal:'Teal',mint:'Mint',lime:'Lime',yellow:'Yellow',amber:'Amber',coral:'Coral',rose:'Rose',magenta:'Magenta',violet:'Violet',indigo:'Indigo',sky:'Sky Blue',aqua:'Aqua',emerald:'Emerald',lavender:'Lavender',silver:'Silver'};
  const LEGACY_DECK_PRIVACY_SELECTORS='[data-deck-share],[data-deck-public],[data-deck-private],[data-deck-visibility],#deckShareToggle,#deckPublicToggle,#deckPrivateToggle,#deckVisibilitySelect,#deckVisibility,.deck-share-setting,.deck-public-setting,.deck-private-setting,.deck-privacy-setting,.deck-visibility-setting';
  const profileColors=new Map();
  let colorRefreshTimer=0;

  const session=()=>window.RiftboundCloud?.getSession?.()||null;
  const ownProfile=()=>window.RiftboundSocial?.getProfile?.()||null;

  function syncScrollLock(){
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
    if(profile?.username&&ALL_USERNAME_COLORS.includes(profile.username_color))profileColors.set(profile.username.toLowerCase(),profile.username_color);
  }

  function applyKnownUsernameColors(){
    ensureExtraColorOptions();
    rememberOwnColor();
    document.querySelectorAll('.username-styled').forEach(element=>{
      const username=String(element.textContent||'').trim().replace(/^@/,'').toLowerCase();
      const color=profileColors.get(username);
      if(color&&ALL_USERNAME_COLORS.includes(color)&&element.dataset.usernameColor!==color)element.dataset.usernameColor=color;
    });
    const profile=ownProfile(),select=document.getElementById('usernameColorSelect');
    if(profile&&select&&ALL_USERNAME_COLORS.includes(profile.username_color)&&select.value!==profile.username_color)select.value=profile.username_color;
  }

  async function refreshProfileColors(){
    clearTimeout(colorRefreshTimer);
    const s=session();
    if(!s?.access_token)return;
    try{
      const response=await fetch(`${SUPABASE_URL}/rest/v1/profiles?select=username,username_color`,{headers:{apikey:SUPABASE_PUBLISHABLE_KEY,Authorization:`Bearer ${s.access_token}`}});
      if(!response.ok)throw new Error(`HTTP ${response.status}`);
      const rows=await response.json();
      profileColors.clear();
      for(const row of Array.isArray(rows)?rows:[]){
        const color=String(row?.username_color||'');
        if(row?.username&&ALL_USERNAME_COLORS.includes(color))profileColors.set(String(row.username).toLowerCase(),color);
      }
      applyKnownUsernameColors();
    }catch(err){console.error('Username color refresh failed',err)}
  }

  function scheduleProfileColorRefresh(ms=180){
    clearTimeout(colorRefreshTimer);
    colorRefreshTimer=setTimeout(refreshProfileColors,ms);
  }

  async function saveExtraUsernameColor(color){
    const s=session(),profile=ownProfile();
    if(!s?.access_token||!s?.user||!profile||!EXTRA_USERNAME_COLORS.includes(color))return;
    const previous=profile.username_color;
    profile.username_color=color;
    if(profile.username)profileColors.set(profile.username.toLowerCase(),color);
    applyKnownUsernameColors();
    try{
      const response=await fetch(`${SUPABASE_URL}/rest/v1/profiles?user_id=eq.${encodeURIComponent(s.user.id)}`,{
        method:'PATCH',
        headers:{apikey:SUPABASE_PUBLISHABLE_KEY,Authorization:`Bearer ${s.access_token}`,'Content-Type':'application/json',Prefer:'return=minimal'},
        body:JSON.stringify({username_color:color,updated_at:new Date().toISOString()})
      });
      if(!response.ok)throw new Error(`HTTP ${response.status}`);
      scheduleProfileColorRefresh(80);
    }catch(err){
      profile.username_color=previous;
      if(profile.username&&ALL_USERNAME_COLORS.includes(previous))profileColors.set(profile.username.toLowerCase(),previous);
      applyKnownUsernameColors();
      console.error('Username color save failed',err);
    }
  }

  function stripLegacyDeckPrivacyControls(root=document){
    root.querySelectorAll?.(LEGACY_DECK_PRIVACY_SELECTORS).forEach(element=>{
      const wrapper=element.closest('.setting-row,.feature-form-grid>label,.feature-editor>label,label')||element;
      wrapper.remove();
    });
  }

  function normalizeDeckSharingCopy(root=document){
    root.querySelectorAll?.('.friend-deck-list .empty-state').forEach(element=>{
      if(/has not shared any decks yet/i.test(element.textContent||''))element.textContent=(element.textContent||'').replace(/has not shared any decks yet\.?/i,'does not have any decks yet.');
    });
  }

  function enforceAlwaysSharedDecks(){
    stripLegacyDeckPrivacyControls();
    normalizeDeckSharingCopy();
    window.RiftboundSocial?.publish?.();
  }

  document.addEventListener('click',e=>{
    if(e.target.closest('[data-friend-user]')){
      const theme=window.RiftboundTheme?.getTheme?.();
      if(theme==='neon')window.RiftboundNeonAudio?.transition?.();
      else window.RiftboundCosmicAudio?.transition?.();
      scheduleProfileColorRefresh(120);
    }
    if(e.target.closest('#browseLibrariesUtilityBtn'))scheduleProfileColorRefresh(180);
  },true);

  window.addEventListener('change',event=>{
    if(event.target?.id!=='usernameColorSelect'||!EXTRA_USERNAME_COLORS.includes(event.target.value))return;
    event.stopPropagation();
    saveExtraUsernameColor(event.target.value);
  },true);

  window.addEventListener('riftbound-social-ready',()=>{
    ensureExtraColorOptions();
    scheduleProfileColorRefresh(40);
    setTimeout(enforceAlwaysSharedDecks,100);
  });
  window.addEventListener('riftbound-local-change',event=>{
    if(event.detail?.key===APP_KEY)setTimeout(enforceAlwaysSharedDecks,60);
  });
  window.addEventListener('riftbound-friend-render',()=>{
    applyKnownUsernameColors();
    normalizeDeckSharingCopy();
  });
  window.addEventListener('riftbound-auth-storage-change',()=>scheduleProfileColorRefresh(120));

  const observer=new MutationObserver(()=>{
    syncScrollLock();
    ensureExtraColorOptions();
    applyKnownUsernameColors();
    stripLegacyDeckPrivacyControls();
    normalizeDeckSharingCopy();
  });

  function init(){
    syncScrollLock();
    ensureExtraColorOptions();
    stripLegacyDeckPrivacyControls();
    normalizeDeckSharingCopy();
    rememberOwnColor();
    if(session()?.user)scheduleProfileColorRefresh(120);
    observer.observe(document.body,{subtree:true,childList:true,attributes:true,attributeFilter:['class','hidden','data-username-color']});
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
