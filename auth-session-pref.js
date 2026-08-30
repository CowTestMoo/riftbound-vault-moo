(() => {
  'use strict';
  const AUTH_KEY='riftbound-vault-auth-v1';
  const PREF_KEY='riftbound-vault-stay-signed-in-v1';
  const originalGet=Storage.prototype.getItem;
  const originalSet=Storage.prototype.setItem;
  const originalRemove=Storage.prototype.removeItem;

  function wantsPersistent(){return originalGet.call(localStorage,PREF_KEY)==='1'}
  function effectiveAuth(){return originalGet.call(localStorage,AUTH_KEY)||originalGet.call(sessionStorage,AUTH_KEY)}
  function migrateAuth(){
    const value=effectiveAuth();
    if(!value)return;
    if(wantsPersistent()){
      originalSet.call(localStorage,AUTH_KEY,value);
      originalRemove.call(sessionStorage,AUTH_KEY);
    }else{
      originalSet.call(sessionStorage,AUTH_KEY,value);
      originalRemove.call(localStorage,AUTH_KEY);
    }
  }

  Storage.prototype.getItem=function(key){
    if(this===localStorage&&key===AUTH_KEY)return originalGet.call(localStorage,key)||originalGet.call(sessionStorage,key);
    return originalGet.call(this,key);
  };
  Storage.prototype.setItem=function(key,value){
    if(this===localStorage&&key===AUTH_KEY){
      if(wantsPersistent()){
        originalSet.call(localStorage,key,value);
        originalRemove.call(sessionStorage,key);
      }else{
        originalSet.call(sessionStorage,key,value);
        originalRemove.call(localStorage,key);
      }
      window.dispatchEvent(new CustomEvent('riftbound-auth-storage-change'));
      return;
    }
    return originalSet.call(this,key,value);
  };
  Storage.prototype.removeItem=function(key){
    if(this===localStorage&&key===AUTH_KEY){
      originalRemove.call(localStorage,key);
      originalRemove.call(sessionStorage,key);
      window.dispatchEvent(new CustomEvent('riftbound-auth-storage-change'));
      return;
    }
    return originalRemove.call(this,key);
  };

  migrateAuth();

  function ensureCheckbox(){
    const dialog=document.getElementById('cloudAuthDialog');
    if(!dialog||document.getElementById('cloudStaySignedIn'))return;
    const password=document.getElementById('cloudPassword');
    const passwordLabel=password?.closest('label');
    if(!passwordLabel)return;
    const row=document.createElement('label');
    row.className='cloud-remember-row';
    row.innerHTML=`<span class="cloud-remember-copy"><input id="cloudStaySignedIn" type="checkbox" ${wantsPersistent()?'checked':''}> <strong>Stay signed in</strong></span><small>Keep me signed in on this device after I close the browser.</small>`;
    passwordLabel.insertAdjacentElement('afterend',row);
  }

  document.addEventListener('change',e=>{
    if(e.target.id!=='cloudStaySignedIn')return;
    originalSet.call(localStorage,PREF_KEY,e.target.checked?'1':'0');
    migrateAuth();
    window.dispatchEvent(new CustomEvent('riftbound-auth-storage-change'));
  });
  window.addEventListener('riftbound-auth-storage-change',()=>{
    const box=document.getElementById('cloudStaySignedIn');
    if(box)box.checked=wantsPersistent();
  });

  function init(){
    ensureCheckbox();
    if(document.getElementById('cloudStaySignedIn'))return;
    const observer=new MutationObserver(()=>{
      ensureCheckbox();
      if(document.getElementById('cloudStaySignedIn'))observer.disconnect();
    });
    observer.observe(document.body,{childList:true,subtree:true});
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();