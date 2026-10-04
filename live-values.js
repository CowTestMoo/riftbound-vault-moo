(() => {
  'use strict';
  const APP_KEY='riftbound-vault-v2';
  const MAX_AGE_MS=6*60*60*1000;
  let live={cards:{},updatedAt:null,source:'TCGplayer via TCGCSV'};
  let requested=false,loadPromise=null;

  function readState(){try{return JSON.parse(localStorage.getItem(APP_KEY)||'{}')}catch{return {}}}
  function samePrice(a,b){return Number(a?.market||0)===Number(b?.market||0)&&Number(a?.low||0)===Number(b?.low||0)&&String(a?.source||'')===String(b?.source||'')&&String(a?.productId||'')===String(b?.productId||'')}
  function merge(){
    const s=readState();s.prices=s.prices&&typeof s.prices==='object'?s.prices:{};let changed=false;
    for(const [code,p] of Object.entries(live.cards||{})){
      const old=s.prices[code];if(old?.source==='Manual')continue;
      const next={market:Number(p.market||0),low:Number(p.low||0),mid:Number(p.mid||0),source:live.source||'TCGplayer via TCGCSV',updatedAt:live.updatedAt||new Date().toISOString(),productId:p.productId||null,printing:p.printing||'Normal',url:p.url||''};
      if(next.market>0&&!samePrice(old,next)){s.prices[code]=next;changed=true}
    }
    if(changed){
      localStorage.setItem(APP_KEY,JSON.stringify(s));
      if(window.RiftboundApp?.reloadState)window.RiftboundApp.reloadState();
      else window.RiftboundFeatures?.render?.();
    }
  }
  function updateCopy(){
    const panel=document.getElementById('toolPanel');if(!panel)return;
    const h=[...panel.querySelectorAll('.tool-head h3')].find(x=>x.textContent.trim()==='Collection Values');if(!h)return;
    const p=h.parentElement?.querySelector('p');if(p)p.textContent=live.updatedAt?`Daily TCGplayer market prices via TCGCSV. Updated ${new Date(live.updatedAt).toLocaleDateString()}. Edit any price to keep a manual override.`:'Daily TCGplayer market prices via TCGCSV. Live prices load when you open this screen; manual overrides are still supported.';
    const summary=panel.querySelector('.value-summary');if(summary&&!summary.querySelector('.live-price-source'))summary.insertAdjacentHTML('beforeend',' <span class="live-price-source">• Live daily feed</span>')
  }
  function fresh(){
    const stamp=Date.parse(live.updatedAt||'');
    return Number.isFinite(stamp)&&Date.now()-stamp<MAX_AGE_MS&&Object.keys(live.cards||{}).length>0;
  }
  async function load({force=false}={}){
    requested=true;
    if(!force&&fresh())return live;
    if(loadPromise)return loadPromise;
    loadPromise=(async()=>{
      try{
        const r=await fetch('./data/prices.json',{cache:'no-cache'});
        if(!r.ok)throw new Error(`HTTP ${r.status}`);
        const raw=await r.json();
        live={cards:raw.cards||raw.prices||{},updatedAt:raw.updatedAt||raw.generatedAt||null,source:raw.source||'TCGplayer via TCGCSV'};
        merge();
        updateCopy();
        window.dispatchEvent(new CustomEvent('riftbound-prices-loaded',{detail:{count:Object.keys(live.cards).length,updatedAt:live.updatedAt}}));
      }catch(err){
        console.info('Automatic prices are waiting for the first daily price sync.',err.message);
      }
      return live;
    })();
    try{return await loadPromise}finally{loadPromise=null}
  }
  function init(){
    window.addEventListener('riftbound-tool-render',e=>{
      if(e.detail?.tool!=='values')return;
      updateCopy();
      load().then(()=>requestAnimationFrame(updateCopy));
    });
    window.addEventListener('riftbound-ui-render',e=>{const scopes=e.detail?.scopes||[];if(scopes.includes('state'))requestAnimationFrame(updateCopy)});
    window.addEventListener('focus',()=>{if(requested&&!fresh())load()});
  }
  window.RiftboundPrices={reload:()=>load({force:true}),get:code=>live.cards?.[code]||null,isLoaded:()=>fresh()};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();