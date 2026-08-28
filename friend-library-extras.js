(() => {
  'use strict';

  document.addEventListener('click',e=>{
    if(e.target.closest('[data-friend-user]')){
      const theme=window.RiftboundTheme?.getTheme?.();
      if(theme==='neon')window.RiftboundNeonAudio?.transition?.();
      else window.RiftboundCosmicAudio?.transition?.();
    }
  },true);
})();
