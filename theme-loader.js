(() => {
  'use strict';

  const UX_KEY='riftbound-vault-ux-v1';
  const ASSETS={
    cosmic:{styles:['cosmic-effects.css?v=cosmic8'],scripts:['cosmic.js?v=cosmic9','cosmic-audio.js?v=5']},
    neon:{styles:['neon-background.css?v=3'],scripts:['neon-background-v2.js?v=3','neon-audio.js?v=5','neon-effects.js?v=3']}
  };
  let loadedTheme='';
  let loading=null;
  let effectsStarted=false;
  let reloadRequested=false;

  function normalizeTheme(theme){return theme==='neon'?'neon':'cosmic'}
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
      const existing=document.querySelector(`script[data-theme-asset="${theme}"][src="${src}"]`);
      if(existing){resolve();return}
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
  function removeOtherThemeAssets(theme){
    document.querySelectorAll('[data-theme-asset]').forEach(node=>{
      if(node.dataset.themeAsset&&node.dataset.themeAsset!==theme)node.remove();
    });
  }
  async function load(theme=selectedTheme()){
    theme=normalizeTheme(theme);
    if(loadedTheme===theme&&loading)return loading;
    if(loading&&loadedTheme!==theme){switchTo(theme);return Promise.resolve(theme)}
    if(loading)return loading;
    const assets=ASSETS[theme]||ASSETS.cosmic;
    removeOtherThemeAssets(theme);
    loadedTheme=theme;
    assets.styles.forEach(href=>addStyle(href,theme));
    loading=(async()=>{
      await waitForCore();
      await waitForIdle();
      if(reloadRequested)return theme;
      if(effectsStarted)return theme;
      effectsStarted=true;
      for(const src of assets.scripts){
        if(reloadRequested)break;
        await addScript(src,theme);
      }
      if(!reloadRequested)window.dispatchEvent(new CustomEvent('riftbound-theme-assets-ready',{detail:{theme,deferred:true}}));
      return theme;
    })().catch(err=>{console.error('Theme assets failed to load',err);return theme});
    return loading;
  }
  function switchTo(theme){
    theme=normalizeTheme(theme);
    if(theme===loadedTheme||reloadRequested)return;
    reloadRequested=true;
    removeOtherThemeAssets(theme);
    if(document.body){
      document.body.dataset.vaultTheme=theme;
      document.body.dataset.intensity=theme==='neon'?'neon':'supernova';
      document.body.classList.add('theme-reloading');
    }
    location.reload();
  }
  function syncSelectedTheme(){
    const next=selectedTheme();
    if(!loadedTheme){load(next);return}
    if(next!==loadedTheme)switchTo(next);
  }

  window.RiftboundThemeAssets={load,switchTo,getLoadedTheme:()=>loadedTheme};
  window.addEventListener('riftbound-cloud-restored',()=>setTimeout(syncSelectedTheme,0));
  window.addEventListener('storage',event=>{if(event.key===UX_KEY)setTimeout(syncSelectedTheme,0)});
  load();
})();
