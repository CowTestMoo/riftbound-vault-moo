(() => {
  'use strict';

  function ensureUtilityStack(){
    const settings=document.getElementById('uxSettingsBtn');
    if(!settings)return;
    let stack=document.getElementById('cosmicUtilityStack');
    if(!stack){
      stack=document.createElement('div');
      stack.id='cosmicUtilityStack';
      stack.className='cosmic-utility-stack';
      settings.parentElement?.insertBefore(stack,settings);
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
    }
    if(browse.parentElement!==stack)stack.appendChild(browse);
    const headerBrowse=document.querySelector('#socialAccountArea #browseLibrariesBtn');
    if(headerBrowse)headerBrowse.hidden=true;
  }

  function init(){
    ensureUtilityStack();
    let queued=false;
    const observer=new MutationObserver(()=>{
      if(queued)return;
      queued=true;
      requestAnimationFrame(()=>{queued=false;ensureUtilityStack()});
    });
    observer.observe(document.body,{childList:true,subtree:true});
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();