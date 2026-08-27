(() => {
  'use strict';

  function ensureFriendSettings(){
    const header=document.querySelector('#friendLibraryScreen .friend-header');
    const browse=document.getElementById('friendBrowseAnother');
    if(!header||!browse)return;
    let actions=header.querySelector('.friend-header-actions');
    if(!actions){
      actions=document.createElement('div');
      actions.className='friend-header-actions';
      header.appendChild(actions);
      actions.appendChild(browse);
    }
    let settings=document.getElementById('friendSettingsBtn');
    if(!settings){
      settings=document.createElement('button');
      settings.id='friendSettingsBtn';
      settings.className='ghost-btn';
      settings.type='button';
      settings.textContent='Settings';
      actions.prepend(settings);
    }
  }

  document.addEventListener('click',e=>{
    if(e.target.closest('[data-friend-user]')){
      const theme=window.RiftboundTheme?.getTheme?.();
      if(theme==='neon')window.RiftboundNeonAudio?.transition?.();
      else window.RiftboundTheme?.play?.('transition');
    }
    if(!e.target.closest('#friendSettingsBtn'))return;
    const panel=document.getElementById('uxSettings');
    if(!panel)return;
    panel.hidden=!panel.hidden;
    if(!panel.hidden){panel.style.zIndex='7200';panel.style.position='fixed';panel.style.right='clamp(10px,3vw,36px)';panel.style.top='90px'}
  },true);

  window.addEventListener('riftbound-social-ready',()=>setTimeout(ensureFriendSettings,0));
  function init(){setTimeout(ensureFriendSettings,50)}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
