(() => {
  'use strict';

  function ensureUtilityStack(){
    const settings=document.getElementById('uxSettingsBtn');
    const shell=document.querySelector('.app-shell');
    const topbar=document.querySelector('.topbar');
    if(!settings||!shell||!topbar)return;

    let bar=document.getElementById('globalUtilityBar');
    if(!bar){
      bar=document.createElement('div');
      bar.id='globalUtilityBar';
      bar.className='global-utility-bar';
      topbar.insertAdjacentElement('afterend',bar);
    }

    let stack=document.getElementById('cosmicUtilityStack');
    if(!stack){
      stack=document.createElement('div');
      stack.id='cosmicUtilityStack';
      stack.className='cosmic-utility-stack';
      bar.appendChild(stack);
    }

    if(settings.parentElement!==stack)stack.appendChild(settings);

    let browse=document.getElementById('browseLibrariesUtilityBtn');
    if(!browse){
      browse=document.createElement('button');
      browse.id='browseLibrariesUtilityBtn';
      browse.className='ghost-btn';
      browse.type='button';
      browse.textContent='Browse Libraries';
      browse.addEventListener('click',()=>window.RiftboundSocial?.openBrowser?.());
      stack.appendChild(browse);
    }else if(browse.parentElement!==stack){
      stack.appendChild(browse);
    }
  }

  function init(){
    ensureUtilityStack();
    window.addEventListener('riftbound-cloud-restored',ensureUtilityStack);
    window.addEventListener('riftbound-auth-storage-change',()=>setTimeout(ensureUtilityStack,60));
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();