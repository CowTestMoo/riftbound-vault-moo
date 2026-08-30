(() => {
  'use strict';

  const SUPABASE_URL='https://ivqtgclygiikagfuicjd.supabase.co';
  const SUPABASE_PUBLISHABLE_KEY='sb_publishable_Iweuvn4mcU02xrDyPSJWig_uRWzAsfd';
  const APP_KEY='riftbound-vault-v2';
  const CONFIRM_PHRASE='I ACKNOWLEDGE TO DELETE EVERYTHING';
  let deleting=false;

  function session(){return window.RiftboundCloud?.getSession?.()||null}
  function esc(v=''){return String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}

  function ensureDialog(){
    if(document.getElementById('deleteAllCardsDialog'))return;
    const d=document.createElement('dialog');
    d.id='deleteAllCardsDialog';
    d.className='modal danger-zone-dialog';
    d.innerHTML=`
      <div class="modal-inner danger-zone-inner">
        <div class="danger-zone-icon" aria-hidden="true">!</div>
        <div class="modal-head danger-zone-head">
          <div>
            <small>Danger Zone</small>
            <h2>Delete all card data?</h2>
          </div>
          <button class="close-btn" type="button" data-danger-close aria-label="Close">×</button>
        </div>
        <p class="danger-zone-warning"><strong>This resets your collection to zero.</strong> Your inventory, decks, loans, wishlist, trades, and collection history will be cleared. Your account, username, theme, and storage setup stay intact.</p>
        <p class="danger-zone-backup-note">A private cloud backup is saved before the reset.</p>
        <label class="danger-zone-confirm-label" for="deleteAllCardsConfirmation">To continue, type exactly:</label>
        <code class="danger-zone-phrase">${esc(CONFIRM_PHRASE)}</code>
        <input id="deleteAllCardsConfirmation" class="danger-zone-input" type="text" autocomplete="off" autocapitalize="characters" spellcheck="false" placeholder="Type the confirmation phrase">
        <div id="deleteAllCardsMessage" class="feature-message danger-zone-message" aria-live="polite"></div>
        <div class="modal-actions danger-zone-actions">
          <button type="button" class="ghost-btn" data-danger-close>Cancel</button>
          <button id="confirmDeleteAllCardsBtn" type="button" class="danger-zone-delete-btn" disabled>Delete All Card Data</button>
        </div>
      </div>`;
    document.body.appendChild(d);
  }

  function ensureSetting(){
    const panel=document.getElementById('uxSettings');
    if(!panel||document.getElementById('dangerZoneSetting'))return;
    const row=document.createElement('div');
    row.id='dangerZoneSetting';
    row.className='setting-row danger-zone-setting';
    row.innerHTML=`
      <div class="setting-copy">
        <strong>Delete all card data</strong>
        <small>Reset your collection to zero. Requires a typed confirmation and creates a private backup first.</small>
      </div>
      <button id="openDeleteAllCardsBtn" type="button" class="danger-zone-open-btn">Delete All Card Data</button>`;
    panel.appendChild(row);
  }

  function resetDialog(){
    const input=document.getElementById('deleteAllCardsConfirmation');
    const btn=document.getElementById('confirmDeleteAllCardsBtn');
    const msg=document.getElementById('deleteAllCardsMessage');
    if(input)input.value='';
    if(btn){btn.disabled=true;btn.textContent='Delete All Card Data'}
    if(msg)msg.textContent='';
    deleting=false;
  }

  function openDialog(){
    if(!session()?.user){alert('Sign in before deleting cloud card data.');return}
    ensureDialog();
    resetDialog();
    const d=document.getElementById('deleteAllCardsDialog');
    if(!d.open)d.showModal();
    setTimeout(()=>document.getElementById('deleteAllCardsConfirmation')?.focus(),40);
  }

  async function resetRemote(){
    const s=session();
    if(!s?.access_token)throw new Error('Your sign-in session expired. Sign in again and retry.');
    const res=await fetch(`${SUPABASE_URL}/rest/v1/rpc/reset_my_vault`,{
      method:'POST',
      headers:{
        apikey:SUPABASE_PUBLISHABLE_KEY,
        Authorization:`Bearer ${s.access_token}`,
        'Content-Type':'application/json'
      },
      body:JSON.stringify({confirmation:CONFIRM_PHRASE})
    });
    let data=null;try{data=await res.json()}catch{}
    if(!res.ok)throw new Error(data?.message||data?.error_description||data?.details||`Reset failed (HTTP ${res.status})`);
    return data;
  }

  async function deleteAllCardData(){
    if(deleting)return;
    const input=document.getElementById('deleteAllCardsConfirmation');
    const btn=document.getElementById('confirmDeleteAllCardsBtn');
    const msg=document.getElementById('deleteAllCardsMessage');
    if((input?.value||'')!==CONFIRM_PHRASE){msg.textContent='The confirmation phrase must match exactly.';return}
    deleting=true;btn.disabled=true;btn.textContent='Deleting…';msg.textContent='Saving backup and resetting collection…';
    try{
      const state=await resetRemote();
      if(!state?.vault)throw new Error('The server reset completed but returned an invalid vault state.');
      localStorage.setItem(APP_KEY,JSON.stringify(state.vault));
      window.RiftboundApp?.reloadState?.();
      await window.RiftboundCloud?.reconcile?.();
      window.dispatchEvent(new CustomEvent('riftbound-vault-reset'));
      msg.textContent='All card data was deleted. Your collection is now at zero.';
      btn.textContent='Deleted';
      setTimeout(()=>document.getElementById('deleteAllCardsDialog')?.close(),900);
    }catch(err){
      msg.textContent=`Could not delete card data: ${err.message}`;
      btn.disabled=false;btn.textContent='Delete All Card Data';deleting=false;
    }
  }

  document.addEventListener('input',event=>{
    if(event.target.id!=='deleteAllCardsConfirmation')return;
    const btn=document.getElementById('confirmDeleteAllCardsBtn');
    const msg=document.getElementById('deleteAllCardsMessage');
    if(btn)btn.disabled=event.target.value!==CONFIRM_PHRASE||deleting;
    if(msg)msg.textContent=event.target.value&&event.target.value!==CONFIRM_PHRASE?'Keep typing. The phrase must match exactly.':'';
  });

  document.addEventListener('click',event=>{
    if(event.target.closest('#openDeleteAllCardsBtn')){openDialog();return}
    if(event.target.closest('[data-danger-close]')){if(!deleting)document.getElementById('deleteAllCardsDialog')?.close();return}
    if(event.target.closest('#confirmDeleteAllCardsBtn')){deleteAllCardData();return}
  });

  window.addEventListener('riftbound-auth-storage-change',()=>setTimeout(ensureSetting,80));
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>{ensureDialog();setTimeout(ensureSetting,250)},{once:true});
  else{ensureDialog();setTimeout(ensureSetting,250)}

  window.RiftboundDangerZone={open:openDialog,confirmationPhrase:CONFIRM_PHRASE};
})();
