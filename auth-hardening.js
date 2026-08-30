(() => {
  'use strict';

  const PASSWORD_IDS=['cloudPassword','cloudNewPassword','cloudConfirmPassword'];

  function clearPasswords(){
    for(const id of PASSWORD_IDS){
      const input=document.getElementById(id);
      if(input)input.value='';
    }
  }

  document.addEventListener('click',event=>{
    if(event.target.closest?.('#cloudSignIn,#cloudSetPassword'))setTimeout(clearPasswords,0);
    if(event.target.closest?.('[data-cloud-close]'))clearPasswords();
  });

  document.addEventListener('close',event=>{
    if(event.target?.matches?.('#cloudAuthDialog,#cloudPasswordSetupDialog'))clearPasswords();
  },true);

  window.addEventListener('pagehide',clearPasswords);
  window.addEventListener('riftbound-auth-storage-change',clearPasswords);

  window.RiftboundAuthHardening={clearPasswords};
})();
