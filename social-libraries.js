(() => {
  'use strict';
  const SUPABASE_URL='https://ivqtgclygiikagfuicjd.supabase.co';
  const SUPABASE_KEY='sb_publishable_Iweuvn4mcU02xrDyPSJWig_uRWzAsfd';
  const APP_KEY='riftbound-vault-v2';
  let profile=null,publishing=false,publishTimer=0,browseProfiles=[],browseLibraries=new Map(),browseUserId='',browseQuery='';

  const esc=(v='')=>String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const cardName=c=>c?.fullName||c?.name||c?.cardCode||'Unknown card';
  const readState=()=>{try{return JSON.parse(localStorage.getItem(APP_KEY)||'{}')}catch{return {}}};
  const session=()=>window.RiftboundCloud?.getSession?.()||null;
  const catalog=()=>window.RiftboundApp?.getCatalog?.()||[];

  async function api(path,{method='GET',body,token,prefer}={}){
    const headers={apikey:SUPABASE_KEY,'Content-Type':'application/json',...(token?{Authorization:`Bearer ${token}`}:{}) ,...(prefer?{Prefer:prefer}:{})};
    const res=await fetch(SUPABASE_URL+path,{method,headers,body:body===undefined?undefined:JSON.stringify(body)});
    let data=null;try{data=await res.json()}catch{}
    if(!res.ok){const e=new Error(data?.message||data?.error_description||data?.details||data?.hint||`HTTP ${res.status}`);e.status=res.status;throw e}
    return data;
  }

  function renderAccountArea(){
    const top=document.querySelector('.topbar');if(!top)return;
    let area=document.getElementById('socialAccountArea');
    if(!area){area=document.createElement('div');area.id='socialAccountArea';area.className='social-account-area';top.appendChild(area)}
    const wanted=session()?.user&&profile?`<span id="usernameChip" class="username-chip" title="Public username">@${esc(profile.username)}</span>`:'';
    if(area.innerHTML!==wanted)area.innerHTML=wanted;
  }

  function setUsernameRequired(required){document.body.classList.toggle('username-required',!!required)}

  function ensureDialogs(){
    if(!document.getElementById('usernameSetupDialog')){
      const d=document.createElement('dialog');d.id='usernameSetupDialog';d.className='modal username-setup-dialog';
      d.innerHTML=`<div class="modal-inner username-setup-inner"><div class="username-mark">@</div><h2>Choose your username</h2><p>You need a unique username before entering the vault so friends can find your public card library. You will still sign in with email and password.</p><label>Username<div class="username-input-wrap"><span>@</span><input id="usernameInput" maxlength="24" autocomplete="off" placeholder="riftbound_friend"></div></label><small class="username-rules">3–24 characters. Letters, numbers, and underscores only.</small><div id="usernameMessage" class="feature-message"></div><button id="saveUsernameBtn" class="primary-btn" type="button">Continue</button></div>`;
      d.addEventListener('cancel',e=>{if(!profile)e.preventDefault()});
      d.addEventListener('close',()=>{if(session()?.user&&!profile)setTimeout(showUsernameSetup,0)});
      document.body.appendChild(d);
    }
    if(!document.getElementById('publicLibrariesDialog')){
      const d=document.createElement('dialog');d.id='publicLibrariesDialog';d.className='modal public-libraries-dialog';
      d.innerHTML=`<div class="modal-inner public-libraries-inner"><div class="modal-head"><div><h2>Browse Libraries</h2><p class="spreadsheet-subtitle">Read-only public Riftbound collections</p></div><button class="close-btn" data-close-public-libraries>×</button></div><div class="public-library-layout"><aside class="public-profile-panel"><div class="feature-search"><input id="publicProfileSearch" type="search" placeholder="Find a username"></div><div id="publicProfileList" class="public-profile-list"></div></aside><section class="public-library-panel"><div id="publicViewingBanner" class="public-viewing-banner" hidden></div><div class="feature-search public-card-search"><input id="publicCardSearch" type="search" placeholder="Search this library"></div><div id="publicLibraryStats" class="public-library-stats"></div><div id="publicLibraryGrid" class="public-library-grid"><div class="empty-state">Choose a username to browse their collection.</div></div></section></div></div>`;
      document.body.appendChild(d);
    }
  }

  function showUsernameSetup(){
    ensureDialogs();setUsernameRequired(true);renderAccountArea();
    const d=document.getElementById('usernameSetupDialog');if(!d.open)d.showModal();
    setTimeout(()=>document.getElementById('usernameInput')?.focus(),40);
  }

  async function loadOwnProfile(){
    const s=session();
    if(!s?.access_token||!s?.user){profile=null;setUsernameRequired(false);renderAccountArea();return null}
    const rows=await api(`/rest/v1/profiles?user_id=eq.${encodeURIComponent(s.user.id)}&select=user_id,username,created_at,updated_at`,{token:s.access_token});
    profile=Array.isArray(rows)&&rows[0]?rows[0]:null;
    renderAccountArea();
    if(!profile)showUsernameSetup();
    else{setUsernameRequired(false);document.getElementById('usernameSetupDialog')?.close();schedulePublish(20)}
    return profile;
  }

  async function saveUsername(){
    const s=session(),input=document.getElementById('usernameInput'),msg=document.getElementById('usernameMessage');
    if(!s?.access_token||!s?.user)return;
    const username=(input?.value||'').trim();
    if(!/^[A-Za-z0-9_]{3,24}$/.test(username)){msg.textContent='Use 3–24 letters, numbers, or underscores.';return}
    msg.textContent='Checking username…';
    try{
      const existing=await api(`/rest/v1/profiles?username=ilike.${encodeURIComponent(username)}&select=user_id,username`,{token:s.access_token});
      if(existing.some(x=>x.user_id!==s.user.id)){msg.textContent='That username is already taken.';return}
      const rows=await api('/rest/v1/profiles?on_conflict=user_id',{method:'POST',token:s.access_token,prefer:'resolution=merge-duplicates,return=representation',body:{user_id:s.user.id,username,updated_at:new Date().toISOString()}});
      profile=Array.isArray(rows)&&rows[0]?rows[0]:{user_id:s.user.id,username};
      setUsernameRequired(false);renderAccountArea();schedulePublish(20);msg.textContent='Username saved.';
      setTimeout(()=>document.getElementById('usernameSetupDialog')?.close(),180);
    }catch(err){msg.textContent=err.status===409?'That username is already taken.':`Could not save username: ${err.message}`}
  }

  function publicCards(){const inv=readState().inventory||{},out={};for(const [code,row] of Object.entries(inv)){const n=Math.max(0,Math.floor(Number(row?.owned||0)));if(n>0)out[code]=n}return out}
  async function publishLibrary(){const s=session();if(!s?.access_token||!s?.user||!profile||publishing)return;publishing=true;try{await api('/rest/v1/public_libraries?on_conflict=user_id',{method:'POST',token:s.access_token,prefer:'resolution=merge-duplicates,return=minimal',body:{user_id:s.user.id,cards:publicCards(),updated_at:new Date().toISOString()}})}catch(err){console.error('Public library publish failed',err)}finally{publishing=false}}
  function schedulePublish(delay=700){clearTimeout(publishTimer);publishTimer=setTimeout(publishLibrary,delay)}

  async function loadPublicData(){const [profiles,libraries]=await Promise.all([api('/rest/v1/profiles?select=user_id,username,updated_at&order=username.asc'),api('/rest/v1/public_libraries?select=user_id,cards,updated_at')]);browseProfiles=Array.isArray(profiles)?profiles:[];browseLibraries=new Map((Array.isArray(libraries)?libraries:[]).map(x=>[x.user_id,x]))}
  function renderProfileList(q=''){const root=document.getElementById('publicProfileList');if(!root)return;const needle=String(q||'').trim().toLowerCase(),list=browseProfiles.filter(p=>!needle||p.username.toLowerCase().includes(needle));root.innerHTML=list.length?list.map(p=>{const lib=browseLibraries.get(p.user_id),count=Object.keys(lib?.cards||{}).length;return `<button class="public-profile-row ${browseUserId===p.user_id?'active':''}" data-public-user="${esc(p.user_id)}"><span class="public-avatar">${esc(p.username.slice(0,1).toUpperCase())}</span><span><strong>@${esc(p.username)}</strong><small>${count} unique card${count===1?'':'s'}</small></span><b>›</b></button>`}).join(''):'<div class="recent-empty">No usernames found.</div>'}
  function renderPublicLibrary(){
    const grid=document.getElementById('publicLibraryGrid'),banner=document.getElementById('publicViewingBanner'),stats=document.getElementById('publicLibraryStats');if(!grid)return;
    const p=browseProfiles.find(x=>x.user_id===browseUserId),lib=browseLibraries.get(browseUserId),cards=lib?.cards||{};
    if(!p){banner.hidden=true;stats.innerHTML='';grid.innerHTML='<div class="empty-state">Choose a username to browse their collection.</div>';return}
    banner.hidden=false;banner.innerHTML=`<span class="readonly-dot"></span><div><strong>Viewing @${esc(p.username)}’s Library</strong><small>Read-only view • Your own vault is not being changed.</small></div>`;
    const byCode=new Map(catalog().map(c=>[c.cardCode,c])),needle=browseQuery.trim().toLowerCase();
    const entries=Object.entries(cards).map(([code,n])=>({code,n:Number(n||0),card:byCode.get(code)})).filter(x=>x.n>0&&(!needle||String(`${cardName(x.card)} ${x.card?.cardSet||''} ${x.card?.cardNumber||''} ${x.code}`).toLowerCase().includes(needle))).sort((a,b)=>String(a.card?.cardSet||'').localeCompare(String(b.card?.cardSet||''))||String(a.card?.cardNumber||'').localeCompare(String(b.card?.cardNumber||''),undefined,{numeric:true}));
    const total=Object.values(cards).reduce((n,v)=>n+Number(v||0),0),unique=Object.keys(cards).filter(c=>Number(cards[c])>0).length;
    stats.innerHTML=`<div><strong>${total}</strong><small>Cards</small></div><div><strong>${unique}</strong><small>Unique</small></div><div><strong>${lib?.updated_at?new Date(lib.updated_at).toLocaleDateString():'—'}</strong><small>Last updated</small></div>`;
    grid.innerHTML=entries.length?entries.map(x=>`<article class="public-card-tile">${x.card?.imageUrl?`<img loading="lazy" src="${esc(x.card.imageUrl)}" alt="${esc(cardName(x.card))}">`:'<div class="public-card-placeholder">No image</div>'}<span class="qty-badge">×${x.n}</span><div><strong>${esc(cardName(x.card||{cardCode:x.code}))}</strong><small>${esc(x.card?.cardSet||x.code)} ${esc(x.card?.cardNumber||'')}</small></div></article>`).join(''):'<div class="empty-state">No cards match this search.</div>'
  }
  async function openBrowser(){ensureDialogs();const d=document.getElementById('publicLibrariesDialog');d.showModal();document.getElementById('publicProfileList').innerHTML='<div class="recent-empty">Loading libraries…</div>';try{await loadPublicData();if(browseProfiles.length&&!browseUserId)browseUserId=browseProfiles[0].user_id;renderProfileList();renderPublicLibrary()}catch(err){document.getElementById('publicProfileList').innerHTML=`<div class="recent-empty">Could not load libraries: ${esc(err.message)}</div>`}}

  function bind(){
    document.addEventListener('click',e=>{
      if(e.target.closest('#browseLibrariesUtilityBtn,#vaultLockBrowse')){openBrowser();return}
      if(e.target.closest('[data-close-public-libraries]')){document.getElementById('publicLibrariesDialog')?.close();return}
      if(e.target.closest('#saveUsernameBtn')){saveUsername();return}
      const user=e.target.closest('[data-public-user]');if(user){browseUserId=user.dataset.publicUser;browseQuery='';const q=document.getElementById('publicCardSearch');if(q)q.value='';renderProfileList(document.getElementById('publicProfileSearch')?.value||'');renderPublicLibrary()}
    },true);
    document.addEventListener('input',e=>{if(e.target.id==='publicProfileSearch')renderProfileList(e.target.value);if(e.target.id==='publicCardSearch'){browseQuery=e.target.value;renderPublicLibrary()}});
    window.addEventListener('riftbound-local-change',e=>{if(e.detail?.key===APP_KEY)schedulePublish()});
    window.addEventListener('riftbound-cloud-restored',()=>{loadOwnProfile().catch(console.error);schedulePublish(1000)});
    window.addEventListener('riftbound-auth-storage-change',()=>setTimeout(()=>{loadOwnProfile().catch(console.error)},50));
  }

  async function init(){ensureDialogs();renderAccountArea();bind();if(session()?.user){try{await loadOwnProfile()}catch(err){console.error('Profile load failed',err)}}}
  window.RiftboundSocial={openBrowser,publish:publishLibrary,getProfile:()=>profile};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();