(() => {
  'use strict';

  function signedIn(){return !!window.RiftboundCloud?.getSession?.()?.user}

  function ensureMobileUtilities(){
    let bar=document.getElementById('mobileUtilityBar');
    if(!bar){
      bar=document.createElement('nav');
      bar.id='mobileUtilityBar';
      bar.className='mobile-utility-bar';
      bar.setAttribute('aria-label','Mobile vault utilities');
      bar.innerHTML=`
        <button id="mobileToolsBtn" type="button"><span aria-hidden="true">✦</span>Tools</button>
        <button id="mobileLibrariesBtn" type="button"><span aria-hidden="true">◎</span>Libraries</button>
        <button id="mobileSettingsBtn" type="button"><span aria-hidden="true">⚙</span>Settings</button>`;
      const stats=document.querySelector('.stats-strip');
      if(stats)stats.insertAdjacentElement('afterend',bar);
      else document.querySelector('.topbar')?.insertAdjacentElement('afterend',bar);
    }
    const libraries=document.getElementById('mobileLibrariesBtn');
    if(libraries)libraries.hidden=!signedIn();
    syncState();
  }

  function syncState(){
    const active=document.querySelector('.tab.active')?.dataset.tab||'';
    document.getElementById('mobileToolsBtn')?.classList.toggle('active',active==='tools');
    document.querySelectorAll('#mobileNav [data-mobile-tab]').forEach(btn=>{
      btn.classList.toggle('active',btn.dataset.mobileTab===active);
    });
  }

  function openSettings(){
    const panel=document.getElementById('uxSettings');
    if(!panel)return;
    panel.hidden=false;
    panel.style.zIndex='7200';
  }

  function openLibraries(){
    if(!signedIn())return;
    window.RiftboundSocial?.openBrowser?.();
  }

  function openTools(){
    const tab=document.querySelector('.tab[data-tab="tools"]');
    if(tab){tab.click();setTimeout(syncState,0)}
  }

  document.addEventListener('click',e=>{
    if(e.target.closest('#mobileSettingsBtn')){e.preventDefault();openSettings();return}
    if(e.target.closest('#mobileLibrariesBtn')){e.preventDefault();openLibraries();return}
    if(e.target.closest('#mobileToolsBtn')){e.preventDefault();openTools();return}
    if(e.target.closest('.tab,[data-mobile-tab]'))setTimeout(syncState,0);
  },true);

  function refresh(){ensureMobileUtilities();setTimeout(syncState,0)}
  window.addEventListener('riftbound-social-ready',refresh);
  window.addEventListener('riftbound-auth-storage-change',()=>setTimeout(refresh,70));
  window.addEventListener('riftbound-cloud-restored',refresh);
  window.addEventListener('resize',syncState,{passive:true});

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>{refresh();setTimeout(refresh,500)},{once:true});
  else{refresh();setTimeout(refresh,500)}
})();
