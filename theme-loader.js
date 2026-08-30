(() => {
  'use strict';

  const UX_KEY='riftbound-vault-ux-v1';
  const ASSETS={
    cosmic:{styles:['cosmic-effects.css?v=cosmic8'],scripts:['cosmic.js?v=cosmic8','cosmic-audio.js?v=5']},
    neon:{styles:['neon-background.css?v=3'],scripts:['neon-background-v2.js?v=2','neon-audio.js?v=5','neon-effects.js?v=3']}
  };
  let loadedTheme='';
  let loading=null;

  function selectedTheme(){
    try{return JSON.parse(localStorage.getItem(UX_KEY)||'{}').intensity==='neon'?'neon':'cosmic'}
    catch{return 'cosmic'}
  }
  function mobilePerformanceMode(){
    const coarse=window.matchMedia('(pointer: coarse)').matches;
    const narrow=window.matchMedia('(max-width: 900px)').matches;
    const connection=navigator.connection||navigator.mozConnection||navigator.webkitConnection;
    const constrained=!!connection?.saveData||/^(slow-2g|2g|3g)$/i.test(connection?.effectiveType||'');
    return coarse||narrow||constrained;
  }
  function addStyle(href,theme){
    if(document.querySelector(`link[data-theme-asset="${theme}"][href="${href}"]`))return;
    const link=document.createElement('link');link.rel='stylesheet';link.href=href;link.dataset.themeAsset=theme;document.head.appendChild(link);
  }
  function addScript(src,theme){
    return new Promise((resolve,reject)=>{
      const script=document.createElement('script');script.src=src;script.async=false;script.dataset.themeAsset=theme;script.onload=resolve;script.onerror=reject;document.body.appendChild(script);
    });
  }
  async function load(theme=selectedTheme()){
    if(loadedTheme===theme)return theme;
    if(loading)return loading;
    const assets=ASSETS[theme]||ASSETS.cosmic;
    loadedTheme=theme;
    loading=(async()=>{
      assets.styles.forEach(href=>addStyle(href,theme));
      const performanceMode=mobilePerformanceMode();
      if(!performanceMode){
        for(const src of assets.scripts)await addScript(src,theme);
      }else{
        document.documentElement.dataset.mobilePerformance='1';
        const canvas=document.getElementById('cosmicSky');
        if(canvas){canvas.hidden=true;canvas.setAttribute('aria-hidden','true')}
      }
      window.dispatchEvent(new CustomEvent('riftbound-theme-assets-ready',{detail:{theme,performanceMode}}));
      return theme;
    })().catch(err=>{console.error('Theme assets failed to load',err);return theme});
    return loading;
  }
  function switchTo(theme){
    if(theme===loadedTheme)return;
    document.body.classList.add('theme-reloading');
    location.reload();
  }

  window.RiftboundThemeAssets={load,switchTo,getLoadedTheme:()=>loadedTheme,isMobilePerformanceMode:mobilePerformanceMode};
  function bootTheme(){
    if(window.RiftboundCloud?.getSession?.())load();
  }
  bootTheme();
  window.addEventListener('riftbound-auth-storage-change',bootTheme);
})();