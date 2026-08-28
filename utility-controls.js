(() => {
  'use strict';

  const mobile=()=>window.matchMedia('(max-width:700px)').matches;
  function signedIn(){return !!window.RiftboundCloud?.getSession?.()?.user}

  function restoreOriginalHeader(topbar){
    const actions=document.getElementById('topbarActions');
    const exportBtn=document.getElementById('exportBtn');
    const account=document.getElementById('socialAccountArea');

    /* Restore the original header flow: brand -> Export -> username/account. */
    if(exportBtn&&exportBtn.parentElement!==topbar)topbar.insertBefore(exportBtn,account||null);
    else if(exportBtn&&account&&exportBtn.nextElementSibling!==account)topbar.insertBefore(exportBtn,account);

    if(actions){
      [...actions.children].forEach(child=>{
        if(child!==exportBtn&&child.id!=='uxSettingsBtn')topbar.insertBefore(child,account||null);
      });
      actions.remove();
    }
  }

  function ensureFeatureLoaders(){
    if(!window.RiftboundPremades&&!document.getElementById('premadeDeckScript')){
      const s=document.createElement('script');s.id='premadeDeckScript';s.src='./premade-decks.js?v=1';s.defer=true;document.body.appendChild(s);
    }
    if(!document.getElementById('runeFilterScript')){
      const r=document.createElement('script');r.id='runeFilterScript';r.src='./rune-filters.js?v=1';r.defer=true;document.body.appendChild(r);
    }
  }

  function placeDesktopUtilities(settings,browse,tabs){
    settings.textContent='Settings';
    settings.classList.remove('ghost-btn','ux-settings-btn','mobile-utility-btn','mobile-settings-utility');
    settings.classList.add('library-nav-btn');

    const tools=tabs.querySelector('[data-tab="tools"]');
    if(browse){
      browse.textContent='Browse Libraries';
      browse.classList.remove('mobile-utility-btn','mobile-library-utility');
      browse.classList.add('library-nav-btn');
      if(tools&&tools.nextElementSibling!==browse)tools.insertAdjacentElement('afterend',browse);
      else if(!tools&&browse.parentElement!==tabs)tabs.appendChild(browse);
      if(browse.nextElementSibling!==settings)browse.insertAdjacentElement('afterend',settings);
    }else if(tools){
      if(tools.nextElementSibling!==settings)tools.insertAdjacentElement('afterend',settings);
    }else if(settings.parentElement!==tabs){
      tabs.appendChild(settings);
    }
  }

  function ensureControls(){
    const settings=document.getElementById('uxSettingsBtn');
    const topbar=document.querySelector('.topbar');
    const tabs=document.querySelector('.tabs');
    if(!settings||!topbar||!tabs)return;

    restoreOriginalHeader(topbar);
    document.getElementById('globalUtilityBar')?.remove();

    let browse=document.getElementById('browseLibrariesUtilityBtn');
    if(!signedIn()){
      browse?.remove();
      browse=null;
    }else if(!browse){
      browse=document.createElement('button');
      browse.id='browseLibrariesUtilityBtn';
      browse.className='library-nav-btn';
      browse.type='button';
      browse.textContent='Browse Libraries';
      browse.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();window.RiftboundSocial?.openBrowser?.()});
    }

    /* Mobile owns these controls while under 700px. */
    if(!mobile())placeDesktopUtilities(settings,browse,tabs);
  }

  function init(){
    ensureFeatureLoaders();
    ensureControls();
    setTimeout(ensureControls,350);
    window.addEventListener('riftbound-cloud-restored',ensureControls);
    window.addEventListener('riftbound-auth-storage-change',()=>setTimeout(ensureControls,60));
    window.addEventListener('riftbound-social-ready',ensureControls);
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();