(() => {
  'use strict';
  const APP_KEY='riftbound-vault-v2';
  let live={cards:{},updatedAt:null,source:'TCGplayer via TCGCSV'};

  function readState(){try{return JSON.parse(localStorage.getItem(APP_KEY)||'{}')}catch{return {}}}
  function samePrice(a,b){return Number(a?.market||0)===Number(b?.market||0)&&Number(a?.low||0)===Number(b?.low||0)&&String(a?.source||'')===String(b?.source||'')&&String(a?.productId||'')===String(b?.productId||'')}
  function merge(){
    const s=readState();s.prices=s.prices&&typeof s.prices==='object'?s.prices:{};let changed=false;
    for(const [code,p] of Object.entries(live.cards||{})){
      const old=s.prices[code];if(old?.source==='Manual')continue;
      const next={market:Number(p.market||0),low:Number(p.low||0),mid:Number(p.mid||0),source:live.source||'TCGplayer via TCGCSV',updatedAt:live.updatedAt||new Date().toISOString(),productId:p.productId||null,printing:p.printing||'Normal',url:p.url||''};
      if(next.market>0&&!samePrice(old,next)){s.prices[code]=next;changed=true}
    }
    if(changed){localStorage.setItem(APP_KEY,JSON.stringify(s));window.RiftboundApp?.reloadState?.();window.RiftboundFeatures?.render?.()}
  }
  function updateCopy(){
    const panel=document.getElementById('toolPanel');if(!panel)return;
    const h=[...panel.querySelectorAll('.tool-head h3')].find(x=>x.textContent.trim()==='Collection Values');if(!h)return;
    const p=h.parentElement?.querySelector('p');if(p)p.textContent=live.updatedAt?`Daily TCGplayer market prices via TCGCSV. Updated ${new Date(live.updatedAt).toLocaleDateString()}. Edit any price to keep a manual override.`:'Daily TCGplayer market prices via TCGCSV. Manual overrides are still supported.';
    const summary=panel.querySelector('.value-summary');if(summary&&!summary.querySelector('.live-price-source'))summary.insertAdjacentHTML('beforeend',' <span class="live-price-source">• Live daily feed</span>')
  }
  async function load(){
    try{const r=await fetch('./data/prices.json',{cache:'no-store'});if(!r.ok)throw new Error(`HTTP ${r.status}`);const raw=await r.json();live={cards:raw.cards||raw.prices||{},updatedAt:raw.updatedAt||raw.generatedAt||null,source:raw.source||'TCGplayer via TCGCSV'};merge();updateCopy();window.dispatchEvent(new CustomEvent('riftbound-prices-loaded',{detail:{count:Object.keys(live.cards).length,updatedAt:live.updatedAt}}))}catch(err){console.info('Automatic prices are waiting for the first daily price sync.',err.message)}
  }
  const observer=new MutationObserver(()=>updateCopy());
  function init(){load();observer.observe(document.body,{childList:true,subtree:true});window.addEventListener('focus',()=>{const age=live.updatedAt?Date.now()-Date.parse(live.updatedAt):Infinity;if(age>6*60*60*1000)load()})}
  window.RiftboundPrices={reload:load,get:code=>live.cards?.[code]||null};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();