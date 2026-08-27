(() => {
  'use strict';

  const SUPABASE_URL='https://ivqtgclygiikagfuicjd.supabase.co';
  const SUPABASE_KEY='sb_publishable_Iweuvn4mcU02xrDyPSJWig_uRWzAsfd';
  const APP_KEY='riftbound-vault-v2';
  const UX_KEY='riftbound-vault-ux-v1';
  const AUTH_KEY='riftbound-vault-auth-v1';
  const META_KEY='riftbound-vault-sync-meta-v1';
  let session=readJSON(AUTH_KEY,null);
  let syncing=false;
  let syncTimer=0;
  let suppress=false;

  function readJSON(key,fallback){try{return JSON.parse(localStorage.getItem(key)||'')||fallback}catch{return fallback}}
  function writeJSON(key,value){localStorage.setItem(key,JSON.stringify(value))}
  function nowIso(){return new Date().toISOString()}
  function hash(value){let h=2166136261,s=JSON.stringify(value);for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619)}return (h>>>0).toString(36)}
  function snapshot(){return {schemaVersion:1,vault:readJSON(APP_KEY,{inventory:{},decks:[],loans:[],transactions:[]}),ux:readJSON(UX_KEY,{})}}
  function meaningful(s){const v=s?.vault||{};return Object.keys(v.inventory||{}).length>0||(v.decks||[]).length>0||(v.loans||[]).length>0||Object.keys(v.wishlist||{}).length>0||(v.trades||[]).length>0}
  function restore(s){suppress=true;try{if(s?.vault)writeJSON(APP_KEY,s.vault);if(s?.ux)writeJSON(UX_KEY,s.ux)}finally{suppress=false}window.RiftboundApp?.reloadState?.();window.dispatchEvent(new CustomEvent('riftbound-cloud-restored'))}
  function meta(){return readJSON(META_KEY,{})||{}}
  function setMeta(p){writeJSON(META_KEY,{...meta(),...p})}

  const nativeSet=Storage.prototype.setItem;
  Storage.prototype.setItem=function(k,v){
    nativeSet.call(this,k,v);
    if(this===localStorage&&!suppress&&(k===APP_KEY||k===UX_KEY)){
      setMeta({localChangedAt:nowIso(),localHash:hash(snapshot())});
      window.dispatchEvent(new CustomEvent('riftbound-local-change',{detail:{key:k}}));
      scheduleSync();
    }
  };

  async function request(path,{method='GET',body,token,headers={}}={}){
    const res=await fetch(SUPABASE_URL+path,{method,headers:{apikey:SUPABASE_KEY,'Content-Type':'application/json',...(token?{Authorization:`Bearer ${token}`}:{}) ,...headers},body:body===undefined?undefined:JSON.stringify(body)});
    let data=null;try{data=await res.json()}catch{}
    if(!res.ok)throw new Error(data?.msg||data?.message||data?.error_description||data?.error||`HTTP ${res.status}`);
    return data;
  }

  function normalizeSession(data){
    const expiresAt=Date.now()+Number(data.expires_in||3600)*1000;
    return {access_token:data.access_token,refresh_token:data.refresh_token,expiresAt,user:data.user||session?.user||null};
  }
  function saveSession(s){session=s;if(s)writeJSON(AUTH_KEY,s);else localStorage.removeItem(AUTH_KEY);renderCloudUI()}
  async function refreshSession(){
    if(!session?.refresh_token)return null;
    const data=await request('/auth/v1/token?grant_type=refresh_token',{method:'POST',body:{refresh_token:session.refresh_token}});
    saveSession(normalizeSession(data));return session;
  }
  async function freshSession(){
    if(!session)return null;
    if(Number(session.expiresAt||0)<Date.now()+90000){
      try{return await refreshSession()}catch{saveSession(null);return null}
    }
    return session;
  }
  async function signIn(email,password){
    const data=await request('/auth/v1/token?grant_type=password',{method:'POST',body:{email,password}});
    saveSession(normalizeSession(data));await reconcileAfterLogin();return session;
  }
  async function signOut(){
    const s=await freshSession();
    if(s){try{await request('/auth/v1/logout',{method:'POST',token:s.access_token})}catch{}}
    saveSession(null);setStatus('Local only','idle');
  }

  async function consumeInviteHash(){
    if(!location.hash||!location.hash.includes('access_token='))return false;
    const p=new URLSearchParams(location.hash.slice(1));
    const access=p.get('access_token'),refresh=p.get('refresh_token'),type=p.get('type')||'';
    if(!access||!refresh)return false;
    try{
      const user=await request('/auth/v1/user',{token:access});
      saveSession({access_token:access,refresh_token:refresh,expiresAt:Date.now()+Number(p.get('expires_in')||3600)*1000,user});
      history.replaceState(null,'',location.pathname+location.search);
      if(type==='invite'||type==='recovery'){showPasswordSetup(type);return true}
      await reconcileAfterLogin();
      return true;
    }catch(err){console.error('Invite link could not be accepted',err);return false}
  }

  function showPasswordSetup(type='invite'){
    let d=document.getElementById('cloudPasswordSetupDialog');
    if(!d){d=document.createElement('dialog');d.id='cloudPasswordSetupDialog';d.className='modal cloud-auth-dialog';document.body.appendChild(d)}
    const title=type==='recovery'?'Choose a new password':'Welcome to Riftbound Vault';
    d.innerHTML=`<div class="modal-inner cloud-auth-inner"><div class="modal-head"><h2>${title}</h2></div><p class="cloud-help">This vault is invite-only. Set a password to finish activating your account.</p><label>New password<input id="cloudNewPassword" type="password" autocomplete="new-password" minlength="8" placeholder="At least 8 characters"></label><label>Confirm password<input id="cloudConfirmPassword" type="password" autocomplete="new-password" minlength="8" placeholder="Repeat password"></label><div id="cloudPasswordMessage" class="cloud-auth-message"></div><div class="modal-actions"><button id="cloudSetPassword" class="primary-btn" type="button">Activate Account</button></div></div>`;
    d.showModal();
  }

  async function setInvitedPassword(password){
    const s=await freshSession();if(!s)throw new Error('Invite session expired. Ask for a new invitation.');
    await request('/auth/v1/user',{method:'PUT',token:s.access_token,body:{password}});
    const user=await request('/auth/v1/user',{token:s.access_token});session.user=user;saveSession(session);await reconcileAfterLogin();
  }

  async function fetchRemote(){
    const s=await freshSession();if(!s)return null;
    const rows=await request(`/rest/v1/vault_state?user_id=eq.${encodeURIComponent(s.user.id)}&select=state,updated_at`,{token:s.access_token});
    return Array.isArray(rows)&&rows[0]?rows[0]:null;
  }
  async function pushRemote(){
    const s=await freshSession();if(!s||syncing)return false;
    syncing=true;setStatus('Syncing…','syncing');
    try{
      const snap=snapshot();
      const rows=await request('/rest/v1/vault_state?on_conflict=user_id',{method:'POST',token:s.access_token,headers:{Prefer:'resolution=merge-duplicates,return=representation'},body:{user_id:s.user.id,state:snap,updated_at:nowIso()}});
      const updated=Array.isArray(rows)&&rows[0]?.updated_at||nowIso();
      setMeta({lastRemoteAt:updated,lastSyncedHash:hash(snap),lastSyncAt:nowIso()});
      setStatus('Synced','ok');return true;
    }catch(err){setStatus('Sync error','error');console.error('Cloud sync failed',err);return false}
    finally{syncing=false}
  }
  function scheduleSync(){clearTimeout(syncTimer);if(session)syncTimer=setTimeout(()=>pushRemote(),900)}

  async function reconcileAfterLogin(){
    setStatus('Checking cloud…','syncing');
    const remote=await fetchRemote();
    const local=snapshot();
    if(!remote){await pushRemote();return}
    const remoteState=remote.state||{};
    const localHash=hash(local),remoteHash=hash(remoteState),m=meta();
    if(localHash===remoteHash){setMeta({lastRemoteAt:remote.updated_at,lastSyncedHash:localHash,lastSyncAt:nowIso()});setStatus('Synced','ok');return}
    if(!meaningful(local)&&meaningful(remoteState)){restore(remoteState);setMeta({lastRemoteAt:remote.updated_at,lastSyncedHash:remoteHash,lastSyncAt:nowIso()});setStatus('Cloud loaded','ok');return}
    if(meaningful(local)&&!meaningful(remoteState)){await pushRemote();return}
    if(m.lastRemoteAt===remote.updated_at&&m.lastSyncedHash&&m.lastSyncedHash!==localHash){await pushRemote();return}
    if(m.lastSyncedHash===localHash&&m.lastRemoteAt!==remote.updated_at){restore(remoteState);setMeta({lastRemoteAt:remote.updated_at,lastSyncedHash:remoteHash,lastSyncAt:nowIso()});setStatus('Cloud updated','ok');return}
    showConflict(remoteState,remote.updated_at);
  }

  function ensureAuthDialog(){
    if(document.getElementById('cloudAuthDialog'))return;
    const d=document.createElement('dialog');d.id='cloudAuthDialog';d.className='modal cloud-auth-dialog';
    d.innerHTML=`<div class="modal-inner cloud-auth-inner"><div class="modal-head"><h2>Riftbound Cloud</h2><button class="close-btn" data-cloud-close>×</button></div><p class="cloud-help"><strong>Invite only.</strong> Sign in with an account that has been invited by the vault owner.</p><label>Email<input id="cloudEmail" type="email" autocomplete="email" placeholder="you@example.com"></label><label>Password<input id="cloudPassword" type="password" autocomplete="current-password" minlength="8" placeholder="Password"></label><div id="cloudAuthMessage" class="cloud-auth-message"></div><div class="modal-actions"><button id="cloudSignIn" class="primary-btn" type="button">Sign In</button></div><p class="cloud-invite-note">Need access? Ask the vault owner to send you an invitation.</p></div>`;
    document.body.appendChild(d);
  }
  function ensureCloudSettings(){
    const panel=document.getElementById('uxSettings');if(!panel||document.getElementById('cloudSettingRow'))return;
    const row=document.createElement('div');row.id='cloudSettingRow';row.className='setting-row cloud-setting-row';
    row.innerHTML=`<div class="setting-copy"><strong>Cloud sync</strong><small id="cloudSettingText">Invite-only • Local only</small></div><div class="cloud-setting-actions"><button id="cloudAccountBtn" class="sound-test" type="button">Sign In</button><button id="cloudSyncBtn" class="sound-test" type="button" hidden>Sync</button></div>`;
    panel.appendChild(row);renderCloudUI();
  }
  function renderCloudUI(){
    ensureAuthDialog();
    const signed=!!session?.user;
    const account=document.getElementById('cloudAccountBtn'),sync=document.getElementById('cloudSyncBtn'),text=document.getElementById('cloudSettingText');
    if(account)account.textContent=signed?'Account':'Sign In';
    if(sync)sync.hidden=!signed;
    if(text)text.textContent=signed?`${session.user.email||'Signed in'} • ${document.getElementById('cloudSyncStatus')?.textContent||'Ready'}`:'Invite-only • Local only';
  }
  function ensureStatus(){
    if(document.getElementById('cloudSyncStatus'))return;
    const p=document.getElementById('catalogStatus');if(!p)return;
    const s=document.createElement('span');s.id='cloudSyncStatus';s.className='cloud-sync-status';s.textContent=session?'Cloud ready':'Invite only';p.insertAdjacentElement('afterend',s);
  }
  function setStatus(text,state='idle'){ensureStatus();const e=document.getElementById('cloudSyncStatus');if(e){e.textContent=text;e.dataset.state=state}renderCloudUI()}
  function openAuth(){ensureAuthDialog();document.getElementById('cloudAuthMessage').textContent='';document.getElementById('cloudAuthDialog').showModal()}
  function showConflict(remoteState,remoteAt){
    let d=document.getElementById('cloudConflictDialog');
    if(!d){d=document.createElement('dialog');d.id='cloudConflictDialog';d.className='modal';document.body.appendChild(d)}
    d._remoteState=remoteState;d._remoteAt=remoteAt;
    d.innerHTML=`<div class="modal-inner"><div class="modal-head"><h2>Choose your vault</h2></div><p>This device and the cloud both have changes. Pick which copy should win.</p><div class="sync-choice-grid"><button class="primary-btn" data-sync-choice="cloud">Use Cloud Copy</button><button class="ghost-btn" data-sync-choice="local">Keep This Device</button></div></div>`;
    d.showModal();setStatus('Needs choice','warning');
  }

  document.addEventListener('click',async e=>{
    if(e.target.closest('[data-cloud-close]')){document.getElementById('cloudAuthDialog')?.close();return}
    if(e.target.closest('#cloudAccountBtn')){
      if(session){const yes=confirm(`Signed in as ${session.user?.email||'your account'}. Sign out?`);if(yes)await signOut()}else openAuth();return
    }
    if(e.target.closest('#cloudSyncBtn')){await pushRemote();return}
    if(e.target.closest('#cloudSignIn')){
      const email=document.getElementById('cloudEmail').value.trim(),password=document.getElementById('cloudPassword').value,msg=document.getElementById('cloudAuthMessage');
      msg.textContent='Signing in…';try{await signIn(email,password);msg.textContent='Signed in.';document.getElementById('cloudAuthDialog').close()}catch(err){msg.textContent=err.message}return
    }
    if(e.target.closest('#cloudSetPassword')){
      const password=document.getElementById('cloudNewPassword').value,confirmPassword=document.getElementById('cloudConfirmPassword').value,msg=document.getElementById('cloudPasswordMessage');
      if(password.length<8){msg.textContent='Use at least 8 characters.';return}
      if(password!==confirmPassword){msg.textContent='Passwords do not match.';return}
      msg.textContent='Activating account…';try{await setInvitedPassword(password);msg.textContent='Account activated.';document.getElementById('cloudPasswordSetupDialog').close();setStatus('Synced','ok')}catch(err){msg.textContent=err.message}return
    }
    const choice=e.target.closest('[data-sync-choice]');
    if(choice){
      const d=document.getElementById('cloudConflictDialog');
      if(choice.dataset.syncChoice==='cloud'){restore(d._remoteState);setMeta({lastRemoteAt:d._remoteAt,lastSyncedHash:hash(d._remoteState),lastSyncAt:nowIso()});setStatus('Cloud loaded','ok')}
      else await pushRemote();
      d.close();return
    }
  },true);

  async function init(){
    ensureStatus();ensureCloudSettings();
    const consumed=await consumeInviteHash();
    if(!consumed)setStatus(session?'Cloud ready':'Invite only',session?'idle':'idle');
    if(session&&!document.getElementById('cloudPasswordSetupDialog')?.open){try{await freshSession();if(session)await reconcileAfterLogin()}catch(err){console.error(err);setStatus('Sync error','error')}}
    const observer=new MutationObserver(()=>{ensureStatus();ensureCloudSettings()});observer.observe(document.body,{childList:true,subtree:true});
  }
  window.RiftboundCloud={syncNow:()=>pushRemote(),signIn,signOut,getSession:()=>session,reconcile:reconcileAfterLogin};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();