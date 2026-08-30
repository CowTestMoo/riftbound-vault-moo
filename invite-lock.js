(() => {
  'use strict';
  const AUTH_KEY='riftbound-vault-auth-v1';
  let screen=null;

  function hasSession(){
    try{const s=JSON.parse(localStorage.getItem(AUTH_KEY)||'null');return !!(s&&s.access_token&&s.user)}catch{return false}
  }
  function ensureScreen(){
    if(screen?.isConnected)return screen;
    screen=document.getElementById('vaultLockScreen');
    if(screen)return screen;
    screen=document.createElement('section');
    screen.id='vaultLockScreen';screen.className='vault-lock-screen';
    screen.innerHTML=`<div class="vault-lock-card"><div class="vault-lock-mark" aria-hidden="true">✦</div><h1>Riftbound Vault</h1><div class="lock-subtitle">Private cosmic archive</div><p>This vault is invite-only. Sign in with an invited account to manage your collection.</p><div class="vault-lock-actions"><button id="vaultLockSignIn" class="primary-btn" type="button">Sign In</button></div><p class="lock-note">Need access? Ask the vault owner for an invitation.</p></div>`;
    document.body.appendChild(screen);return screen;
  }
  function syncGate(){const loggedIn=hasSession(),s=ensureScreen();document.body.classList.toggle('vault-locked',!loggedIn);s.hidden=loggedIn}

  document.addEventListener('click',e=>{
    if(!e.target.closest('#vaultLockSignIn'))return;
    const cloudBtn=document.getElementById('cloudAccountBtn');
    if(cloudBtn){cloudBtn.click();return}
    const dialog=document.getElementById('cloudAuthDialog');if(dialog&&!dialog.open)dialog.showModal();
  });
  window.addEventListener('storage',e=>{if(e.key===AUTH_KEY)syncGate()});
  window.addEventListener('riftbound-auth-storage-change',syncGate);
  window.addEventListener('riftbound-cloud-restored',syncGate);

  function init(){ensureScreen();syncGate()}
  init();
})();