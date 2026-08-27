(() => {
  'use strict';
  const KEY='riftbound-vault-ux-v1';
  try{
    const old=JSON.parse(localStorage.getItem(KEY)||'{}');
    const next={...old,intensity:old.intensity==='neon'?'neon':'supernova',sound:false};
    localStorage.setItem(KEY,JSON.stringify(next));
    document.body.dataset.intensity=next.intensity;
    document.body.dataset.vaultTheme=next.intensity==='neon'?'neon':'cosmic';
  }catch{}
})();