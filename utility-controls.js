(() => {
  'use strict';

  function signedIn(){return !!window.RiftboundCloud?.getSession?.()?.user}

  function ensureControls(){
    const settings=document.getElementById('uxSettingsBtn');
    const topbar=document.querySelector('.topbar');
    const tabs=document.querySelector('.tabs');
    if(!settings||!topbar||!tabs)return;

    let bar=document.getElementById('globalUtilityBar');
    if(!bar){bar=document.createElement('div');bar.id='globalUtilityBar';bar.className='global-utility-bar';topbar.insertAdjacentElement('afterend',bar)}
    let stack=document.getElementById('cosmicUtilityStack');
    if(!stack){stack=document.createElement('div');stack.id='cosmicUtilityStack';stack.className='cosmic-utility-stack';bar.appendChild(stack)}
    settings.textContent='Settings';
    if(settings.parentElement!==stack)stack.appendChild(settings);

    let browse=document.getElementById('browseLibrariesUtilityBtn');
    if(!signedIn()){
      browse?.remove();
      return;
    }
    if(!browse){
      browse=document.createElement('button');browse.id='browseLibrariesUtilityBtn';browse.className='library-nav-btn';browse.type='button';browse.textContent='Browse Libraries';browse.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();window.RiftboundSocial?.openBrowser?.()});
    }
    const tools=tabs.querySelector('[data-tab="tools"]');
    if(tools){if(tools.nextElementSibling!==browse)tools.insertAdjacentElement('afterend',browse)}
    else if(browse.parentElement!==tabs)tabs.appendChild(browse);
  }

  function init(){
    ensureControls();
    setTimeout(ensureControls,350);
    window.addEventListener('riftbound-cloud-restored',ensureControls);
    window.addEventListener('riftbound-auth-storage-change',()=>setTimeout(ensureControls,60));
    window.addEventListener('riftbound-social-ready',ensureControls);
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();