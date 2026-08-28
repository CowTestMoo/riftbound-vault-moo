(() => {
  'use strict';

  function signedIn(){return !!window.RiftboundCloud?.getSession?.()?.user}

  function ensureHeaderActions(topbar){
    let actions=document.getElementById('topbarActions');
    if(!actions){
      actions=document.createElement('div');
      actions.id='topbarActions';
      actions.className='topbar-actions';
      topbar.appendChild(actions);
    }
    const exportBtn=document.getElementById('exportBtn');
    if(exportBtn&&exportBtn.parentElement!==actions)actions.appendChild(exportBtn);
    return actions;
  }

  function ensurePremadeLoader(){
    if(window.RiftboundPremades||document.getElementById('premadeDeckScript'))return;
    const s=document.createElement('script');s.id='premadeDeckScript';s.src='./premade-decks.js?v=1';s.defer=true;document.body.appendChild(s);
  }

  function ensureControls(){
    const settings=document.getElementById('uxSettingsBtn');
    const topbar=document.querySelector('.topbar');
    const tabs=document.querySelector('.tabs');
    if(!settings||!topbar||!tabs)return;

    /* Desktop Settings belongs in the header, not in a separate row. */
    const actions=ensureHeaderActions(topbar);
    settings.textContent='Settings';
    if(!window.matchMedia('(max-width:700px)').matches&&settings.parentElement!==actions){
      actions.insertBefore(settings,document.getElementById('exportBtn')||null);
    }

    /* Remove the old standalone utility row so it cannot leave an empty gap. */
    document.getElementById('globalUtilityBar')?.remove();

    let browse=document.getElementById('browseLibrariesUtilityBtn');
    if(!signedIn()){
      browse?.remove();
      return;
    }
    if(!browse){
      browse=document.createElement('button');
      browse.id='browseLibrariesUtilityBtn';
      browse.className='library-nav-btn';
      browse.type='button';
      browse.textContent='Browse Libraries';
      browse.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();window.RiftboundSocial?.openBrowser?.()});
    }
    const tools=tabs.querySelector('[data-tab="tools"]');
    if(tools){if(tools.nextElementSibling!==browse)tools.insertAdjacentElement('afterend',browse)}
    else if(browse.parentElement!==tabs)tabs.appendChild(browse);
  }

  function init(){
    ensurePremadeLoader();
    ensureControls();
    setTimeout(ensureControls,350);
    window.addEventListener('riftbound-cloud-restored',ensureControls);
    window.addEventListener('riftbound-auth-storage-change',()=>setTimeout(ensureControls,60));
    window.addEventListener('riftbound-social-ready',ensureControls);
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();