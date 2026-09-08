(() => {
  'use strict';

  const STYLE='cosmic-effects.css?v=cosmic9';
  const SCRIPTS=['cosmic.js?v=cosmic10','cosmic-audio.js?v=6'];
  let loading=null;

  function addStyle(){
    if(document.querySelector('link[data-cosmic-asset="effects"]'))return;
    const link=document.createElement('link');
    link.rel='stylesheet';
    link.href=STYLE;
    link.dataset.cosmicAsset='effects';
    document.head.appendChild(link);
  }

  function addScript(src){
    return new Promise((resolve,reject)=>{
      const existing=document.querySelector(`script[data-cosmic-asset][src="${src}"]`);
      if(existing){resolve();return}
      const script=document.createElement('script');
      script.src=src;
      script.async=true;
      script.dataset.cosmicAsset='1';
      script.onload=resolve;
      script.onerror=reject;
      document.body.appendChild(script);
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

  function load(){
    if(loading)return loading;
    if(document.body){
      document.body.dataset.vaultTheme='cosmic';
      document.body.dataset.intensity='supernova';
    }
    addStyle();
    loading=(async()=>{
      await waitForCore();
      await waitForIdle();
      for(const src of SCRIPTS)await addScript(src);
      window.dispatchEvent(new CustomEvent('riftbound-theme-assets-ready',{detail:{theme:'cosmic',deferred:true}}));
      return 'cosmic';
    })().catch(err=>{
      console.error('Cosmic assets failed to load',err);
      return 'cosmic';
    });
    return loading;
  }

  window.RiftboundThemeAssets={
    load,
    switchTo:()=>load(),
    getLoadedTheme:()=> 'cosmic'
  };
  load();
})();
