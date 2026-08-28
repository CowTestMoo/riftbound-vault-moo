(() => {
  'use strict';

  const mobile=()=>window.matchMedia('(max-width:700px)').matches;
  function signedIn(){return !!window.RiftboundCloud?.getSession?.()?.user}

  function ensureFeatureLoaders(){
    if(!window.RiftboundPremades&&!document.getElementById('premadeDeckScript')){
      const s=document.createElement('script');s.id='premadeDeckScript';s.src='./premade-decks.js?v=1';s.defer=true;document.body.appendChild(s);
    }
    if(!document.getElementById('runeFilterScript')){
      const r=document.createElement('script');r.id='runeFilterScript';r.src='./rune-filters.js?v=1';r.defer=true;document.body.appendChild(r);
    }
  }

  function cleanLegacyHeader(topbar){
    const actions=document.getElementById('topbarActions');
    if(actions){
      [...actions.children].forEach(child=>topbar.appendChild(child));
      actions.remove();
    }
    document.getElementById('globalUtilityBar')?.remove();
  }

  function placeBrowseLikeTab(browse,tabs){
    if(!browse||!tabs)return;
    browse.textContent='Browse Libraries';
    browse.classList.remove('library-nav-btn','ghost-btn','ux-settings-btn','mobile-utility-btn','mobile-library-utility','active');
    browse.classList.add('tab','browse-library-tab');
    browse.removeAttribute('aria-current');
    const tools=tabs.querySelector('[data-tab="tools"]');
    if(tools&&tools.nextElementSibling!==browse)tools.insertAdjacentElement('afterend',browse);
    else if(!tools&&browse.parentElement!==tabs)tabs.appendChild(browse);
  }

  function placeSettingsUnderUsername(settings,topbar,tabs){
    if(!settings||!topbar)return;
    const account=document.getElementById('socialAccountArea');
    let stack=document.getElementById('accountSettingsStack');

    settings.textContent='Settings';
    settings.classList.remove('library-nav-btn','tab','browse-library-tab','ghost-btn','ux-settings-btn','mobile-utility-btn','mobile-settings-utility');
    settings.classList.add('account-settings-btn');

    if(account){
      if(!stack){
        stack=document.createElement('div');
        stack.id='accountSettingsStack';
        stack.className='account-settings-stack';
        const anchor=account.parentElement===topbar?account:null;
        topbar.insertBefore(stack,anchor);
      }
      if(account.parentElement!==stack)stack.prepend(account);
      if(settings.parentElement!==stack)stack.appendChild(settings);
      return;
    }

    stack?.remove();
    settings.classList.remove('account-settings-btn');
    settings.classList.add('tab','settings-tab-fallback');
    const tools=tabs?.querySelector('[data-tab="tools"]');
    if(tools&&tools.nextElementSibling!==settings)tools.insertAdjacentElement('afterend',settings);
    else if(tabs&&settings.parentElement!==tabs)tabs.appendChild(settings);
  }

  function restoreHeaderOrder(topbar){
    const exportBtn=document.getElementById('exportBtn');
    const stack=document.getElementById('accountSettingsStack');
    const account=document.getElementById('socialAccountArea');
    const anchor=stack?.parentElement===topbar?stack:(account?.parentElement===topbar?account:null);
    if(exportBtn&&exportBtn.parentElement!==topbar)topbar.insertBefore(exportBtn,anchor);
    else if(exportBtn&&anchor&&exportBtn.nextElementSibling!==anchor)topbar.insertBefore(exportBtn,anchor);
  }

  function ensureBrowseButton(){
    let browse=document.getElementById('browseLibrariesUtilityBtn');
    if(!signedIn()){
      browse?.remove();
      return null;
    }
    if(!browse){
      browse=document.createElement('button');
      browse.id='browseLibrariesUtilityBtn';
      browse.type='button';
      browse.textContent='Browse Libraries';
      browse.addEventListener('click',event=>{
        event.preventDefault();
        event.stopPropagation();
        window.RiftboundSocial?.openBrowser?.();
      });
    }
    return browse;
  }

  function placeDesktopUtilities(){
    const settings=document.getElementById('uxSettingsBtn');
    const topbar=document.querySelector('.topbar');
    const tabs=document.querySelector('.tabs');
    if(!settings||!topbar||!tabs)return;

    cleanLegacyHeader(topbar);
    const browse=ensureBrowseButton();
    placeBrowseLikeTab(browse,tabs);
    placeSettingsUnderUsername(settings,topbar,tabs);
    restoreHeaderOrder(topbar);
  }

  function ensureControls(){
    ensureFeatureLoaders();
    if(!mobile())placeDesktopUtilities();
  }

  function init(){
    ensureControls();
    setTimeout(ensureControls,350);
    window.addEventListener('riftbound-cloud-restored',ensureControls);
    window.addEventListener('riftbound-auth-storage-change',()=>setTimeout(ensureControls,60));
    window.addEventListener('riftbound-social-ready',()=>setTimeout(ensureControls,0));
  }

  window.RiftboundUtilities={placeDesktopUtilities};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
