(() => {
  'use strict';

  const UX_KEY='riftbound-vault-ux-v1';
  const ASSETS={
    cosmic:{styles:['cosmic-effects.css?v=cosmic8'],scripts:['cosmic.js?v=cosmic8','cosmic-audio.js?v=5']},
    neon:{styles:['neon-background.css?v=3'],scripts:['neon-background-v2.js?v=2','neon-audio.js?v=5','neon-effects.js?v=3']}
  };
  let loadedTheme='';
  let loading=null;
  let effectsStarted=false;

  function selectedTheme(){
    try{return JSON.parse(localStorage.getItem(UX_KEY)||'{}').intensity==='neon'?'neon':'cosmic'}
    catch{return 'cosmic'}
  }
  function addStyle(href,theme){
    if(document.querySelector(`link[data-theme-asset="${theme}"][href="${href}"]`))return;
    const link=document.createElement('link');link.rel='stylesheet';link.href=href;link.dataset.themeAsset=theme;document.head.appendChild(link);
  }
  function addScript(src,theme){
    return new Promise((resolve,reject)=>{
      const script=document.createElement('script');script.src=src;script.async=true;script.dataset.themeAsset=theme;script.onload=resolve;script.onerror=reject;document.body.appendChild(script);
    });
  }
  function waitForCore(){
    if(window.RiftboundApp?.getCatalog?.().length)return Promise.resolve();
    return new Promise(resolve=>{
      let done=false;
      const finish=()=>{if(done)return;done=true;resolve()};
      window.addEventListener('riftbound-catalog-ready',finish,{once:true});
      setTimeout(finish,8000);
    });
  }
  function waitForIdle(){
    return new Promise(resolve=>{
      if('requestIdleCallback' in window)requestIdleCallback(()=>resolve(),{timeout:1800});
      else setTimeout(resolve,450);
    });
  }
  async function load(theme=selectedTheme()){
    if(loadedTheme===theme&&loading)return loading;
    if(loading)return loading;
    const assets=ASSETS[theme]||ASSETS.cosmic;
    loadedTheme=theme;
    assets.styles.forEach(href=>addStyle(href,theme));
    loading=(async()=>{
      await waitForCore();
      await waitForIdle();
      if(effectsStarted)return theme;
      effectsStarted=true;
      for(const src of assets.scripts)await addScript(src,theme);
      window.dispatchEvent(new CustomEvent('riftbound-theme-assets-ready',{detail:{theme,deferred:true}}));
      return theme;
    })().catch(err=>{console.error('Theme assets failed to load',err);return theme});
    return loading;
  }
  function switchTo(theme){
    if(theme===loadedTheme)return;
    document.body.classList.add('theme-reloading');
    location.reload();
  }

  window.RiftboundThemeAssets={load,switchTo,getLoadedTheme:()=>loadedTheme};
  load();
})();
