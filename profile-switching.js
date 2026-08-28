(() => {
  'use strict';

  let transitionLock=false;
  let viewedOtherLibrary=false;

  function theme(){return document.body?.dataset?.vaultTheme==='neon'?'neon':'cosmic'}
  function ownUserId(){return window.RiftboundCloud?.getSession?.()?.user?.id||''}

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

  function closeWithoutTransition(){
    window.RiftboundSocial?.closeBrowser?.();
    const panel=document.getElementById('uxSettings');
    if(panel)panel.hidden=true;
    viewedOtherLibrary=false;
  }

  function returnToOwnVault(){
    if(transitionLock)return;
    const screen=document.getElementById('friendLibraryScreen');
    if(!screen||screen.hidden)return;

    if(!viewedOtherLibrary){
      closeWithoutTransition();
      return;
    }

    transitionLock=true;
    playTransitionAudio();
    transitionOverlay();
    setTimeout(()=>{
      closeWithoutTransition();
    },390);
    setTimeout(()=>{transitionLock=false},1450);
  }

  /* Window capture runs before the library's document handlers. */
  window.addEventListener('click',event=>{
    const back=event.target.closest?.('#friendBackBtn');
    if(back){
      event.preventDefault();
      event.stopImmediatePropagation();
      returnToOwnVault();
      return;
    }

    const row=event.target.closest?.('[data-friend-user]');
    if(!row)return;
    if(row.dataset.friendUser===ownUserId()){
      event.preventDefault();
      event.stopImmediatePropagation();
      return;
    }
    viewedOtherLibrary=true;
  },true);

  function polishProfileControls(){
    const back=document.getElementById('friendBackBtn');
    if(back)back.textContent='← My Vault';
  }

  document.addEventListener('click',event=>{
    if(event.target.closest('#browseLibrariesUtilityBtn')){
      viewedOtherLibrary=false;
      setTimeout(polishProfileControls,0);
    }
  });

  window.addEventListener('riftbound-friend-render',event=>{
    const userId=event.detail?.userId||'';
    if(userId&&userId!==ownUserId())viewedOtherLibrary=true;
  });
  window.addEventListener('riftbound-social-ready',()=>setTimeout(polishProfileControls,20));
  window.addEventListener('riftbound-auth-storage-change',()=>{viewedOtherLibrary=false;setTimeout(polishProfileControls,80)});

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(polishProfileControls,250),{once:true});
  else setTimeout(polishProfileControls,250);

  window.RiftboundProfileSwitching={returnToOwnVault};
})();
