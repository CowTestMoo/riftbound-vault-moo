(() => {
  'use strict';

  let transitionLock=false;
  let friendListObserver=null;

  function theme(){return document.body?.dataset?.vaultTheme==='neon'?'neon':'cosmic'}

  function playTransitionAudio(){
    if(theme()==='neon')window.RiftboundNeonAudio?.transition?.();
    else window.RiftboundCosmicAudio?.transition?.();
  }

  function transitionOverlay(label='RETURNING TO YOUR VAULT'){
    const t=theme(),x=document.createElement('div');
    x.className=`library-transition ${t}`;
    x.innerHTML=t==='neon'
      ? `<div class="neon-gate"><span>${label}</span><b>/// DATA LINK ///</b></div>`
      : `<div class="cosmic-gate"><i></i><span>${label}</span><b>✦</b></div>`;
    document.body.appendChild(x);
    requestAnimationFrame(()=>x.classList.add('go'));
    setTimeout(()=>x.remove(),1450);
  }

  function returnToOwnVault(){
    if(transitionLock)return;
    const screen=document.getElementById('friendLibraryScreen');
    if(!screen||screen.hidden)return;
    transitionLock=true;
    playTransitionAudio();
    transitionOverlay();
    setTimeout(()=>{
      screen.hidden=true;
      document.body.classList.remove('friend-library-open');
      const panel=document.getElementById('uxSettings');if(panel)panel.hidden=true;
    },390);
    setTimeout(()=>{transitionLock=false},1450);
  }

  function ownUserId(){return window.RiftboundCloud?.getSession?.()?.user?.id||''}

  function removeOwnProfileFromBrowser(){
    const me=ownUserId();
    if(!me)return;
    document.querySelectorAll(`[data-friend-user="${CSS.escape(me)}"]`).forEach(row=>row.remove());
  }

  function watchFriendList(){
    const list=document.getElementById('friendUserList');
    if(!list||list.dataset.selfHideWatch==='1')return;
    list.dataset.selfHideWatch='1';
    friendListObserver?.disconnect();
    friendListObserver=new MutationObserver(removeOwnProfileFromBrowser);
    friendListObserver.observe(list,{childList:true});
    removeOwnProfileFromBrowser();
  }

  /* Window capture runs before the library's document handlers. The self-row guard is defensive only. */
  window.addEventListener('click',e=>{
    const back=e.target.closest?.('#friendBackBtn');
    if(back){e.preventDefault();e.stopImmediatePropagation();returnToOwnVault();return}

    const row=e.target.closest?.('[data-friend-user]');
    if(row&&row.dataset.friendUser===ownUserId()){
      e.preventDefault();e.stopImmediatePropagation();row.remove();
    }
  },true);

  function polishProfileControls(){
    const back=document.getElementById('friendBackBtn');
    const another=document.getElementById('friendBrowseAnother');
    if(back)back.textContent='← My Vault';
    if(another)another.textContent='Switch Profile';
    watchFriendList();
    removeOwnProfileFromBrowser();
  }

  document.addEventListener('click',e=>{
    if(e.target.closest('#friendBrowseAnother,#browseLibrariesUtilityBtn,#mobileFriendProfileBtn')){
      setTimeout(polishProfileControls,0);
      setTimeout(polishProfileControls,250);
      setTimeout(polishProfileControls,700);
    }
  });
  document.addEventListener('input',e=>{if(e.target.id==='friendUserSearch')setTimeout(removeOwnProfileFromBrowser,0)});
  window.addEventListener('riftbound-social-ready',()=>setTimeout(polishProfileControls,20));
  window.addEventListener('riftbound-auth-storage-change',()=>setTimeout(polishProfileControls,80));
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(polishProfileControls,250),{once:true});
  else setTimeout(polishProfileControls,250);

  window.RiftboundProfileSwitching={returnToOwnVault};
})();
