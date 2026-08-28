(() => {
  'use strict';
  const KEY='riftbound-vault-ux-v1';
  try{
    const old=JSON.parse(localStorage.getItem(KEY)||'{}');
    const next={...old,intensity:old.intensity==='neon'?'neon':'supernova',sound:false,background:100,cosmicVolume:100,neonVolume:100};
    localStorage.setItem(KEY,JSON.stringify(next));
    document.documentElement.style.setProperty('--sky-opacity','1');
    document.body.dataset.intensity=next.intensity;
    document.body.dataset.vaultTheme=next.intensity==='neon'?'neon':'cosmic';
  }catch{}
})();