(() => {
  'use strict';

  const desktopMq=window.matchMedia('(min-width:701px)');
  let restoreFrame=0;

  function signedIn(){return !!window.RiftboundCloud?.getSession?.()?.user}

  function ensureFeatureLoaders(){
    if(!window.RiftboundPremades&&!document.getElementById('premadeDeckScript')){
      const s=document.createElement('script');s.id='premadeDeckScript';s.src='./premade-decks.js?v=1';s.defer=true;document.body.appendChild(s);
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
    if(!desktopMq.matches)return;
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

  function scheduleDesktopRestore(){
    if(!desktopMq.matches)return;
    if(restoreFrame)return;
    restoreFrame=requestAnimationFrame(()=>{
      restoreFrame=0;
      placeDesktopUtilities();
      setTimeout(placeDesktopUtilities,80);
    });
  }

  function ensureControls(){
    ensureFeatureLoaders();
    scheduleDesktopRestore();
  }

  function init(){
    ensureControls();
    setTimeout(ensureControls,350);
    window.addEventListener('riftbound-cloud-restored',ensureControls);
    window.addEventListener('riftbound-auth-storage-change',()=>setTimeout(ensureControls,60));
    window.addEventListener('riftbound-social-ready',()=>setTimeout(ensureControls,0));
    window.addEventListener('resize',scheduleDesktopRestore,{passive:true});
    window.addEventListener('orientationchange',()=>setTimeout(scheduleDesktopRestore,80));
    if(typeof desktopMq.addEventListener==='function')desktopMq.addEventListener('change',scheduleDesktopRestore);else desktopMq.addListener(scheduleDesktopRestore);
  }

  window.RiftboundUtilities={placeDesktopUtilities,scheduleDesktopRestore};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
