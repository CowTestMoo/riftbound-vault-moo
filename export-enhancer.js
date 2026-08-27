(() => {
  'use strict';
  const APP_KEY='riftbound-vault-v2';

  function readState(){try{return JSON.parse(localStorage.getItem(APP_KEY)||'{}')}catch{return {}}}
  function cardName(c){return c?.fullName||c?.name||c?.cardCode||'Unknown card'}
  function decked(code,s){return (s.decks||[]).reduce((n,d)=>n+Number(d.cards?.[code]||0),0)}
  function loaned(code,s){return (s.loans||[]).filter(l=>!l.returnedAt&&l.cardCode===code).reduce((n,l)=>n+Number(l.qty||0),0)}
  function referencedCodes(s){
    const codes=new Set(Object.keys(s.inventory||{}));
    (s.decks||[]).forEach(d=>Object.keys(d.cards||{}).forEach(c=>codes.add(c)));
    (s.loans||[]).forEach(l=>l.cardCode&&codes.add(l.cardCode));
    Object.keys(s.wishlist||{}).forEach(c=>codes.add(c));
    Object.keys(s.prices||{}).forEach(c=>codes.add(c));
    (s.trades||[]).forEach(t=>{
      for(const side of ['give','receive'])Object.keys(t?.[side]||{}).forEach(c=>codes.add(c));
    });
    return [...codes].filter(Boolean);
  }
  function cleanMeta(c){
    if(!c)return null;
    return {
      cardCode:c.cardCode,
      name:c.name||null,
      fullName:c.fullName||c.name||null,
      setCode:c.setCode||null,
      cardSet:c.cardSet||c.setName||null,
      cardNumber:c.cardNumber||c.collectorNumber||null,
      rarity:c.rarity||null,
      domain:c.domain||null,
      domains:Array.isArray(c.domains)?c.domains:[],
      cardType:c.cardType||c.type||null,
      cardTypeLabels:Array.isArray(c.cardTypeLabels)?c.cardTypeLabels:[],
      tags:Array.isArray(c.tags)?c.tags:[],
      energy:c.energy??null,
      power:c.power??null,
      might:c.might??null,
      ability:c.abilityEffective||c.abilityCorrected||c.abilityOriginal||null,
      artist:c.artist||null,
      imageUrl:c.imageUrl||c.image_url||null,
      sourceUrl:c.sourceUrl||null,
      hasErrata:!!c.hasErrata
    };
  }
  function buildBackup(){
    const s=readState(),catalog=window.RiftboundApp?.getCatalog?.()||[],byCode=new Map(catalog.map(c=>[c.cardCode,c])),codes=referencedCodes(s);
    const cardMetadata={},cards=[];
    for(const code of codes){
      const c=byCode.get(code),meta=cleanMeta(c)||{cardCode:code,fullName:'Unknown / catalog entry unavailable'};
      cardMetadata[code]=meta;
      const owned=Number(s.inventory?.[code]?.owned||0),inDecks=decked(code,s),onLoan=loaned(code,s);
      cards.push({
        cardCode:code,
        name:cardName(c||{cardCode:code}),
        set:meta.cardSet||null,
        setCode:meta.setCode||null,
        cardNumber:meta.cardNumber||null,
        rarity:meta.rarity||null,
        domains:meta.domains||[],
        cardType:meta.cardType||null,
        owned,
        inDecks,
        loaned:onLoan,
        available:Math.max(0,owned-inDecks-onLoan),
        wishlist:Number(s.wishlist?.[code]?.qty||s.wishlist?.[code]||0),
        manualPrice:Number(s.prices?.[code]?.market||0)
      });
    }
    cards.sort((a,b)=>String(a.set||'').localeCompare(String(b.set||''))||String(a.cardNumber||'').localeCompare(String(b.cardNumber||''),undefined,{numeric:true})||a.name.localeCompare(b.name));
    return {
      format:'Riftbound Vault Backup',
      version:3,
      exportedAt:new Date().toISOString(),
      description:'Self-describing Riftbound Vault backup. The `state` object is the restorable app data. `cardMetadata` explains card codes. `collectionReadable` is a human/AI-friendly collection summary.',
      schema:{
        restoreFrom:'state',
        cardMetadata:'Object keyed by cardCode containing catalog metadata for cards referenced by this vault.',
        collectionReadable:'Array summarizing each referenced card with owned, decked, loaned, available, wishlist and manual value information.',
        note:'cardCode identifies a specific catalog printing/variant when the catalog provides separate records.'
      },
      summary:{
        referencedCards:cards.length,
        totalOwned:cards.reduce((n,c)=>n+c.owned,0),
        uniqueOwned:cards.filter(c=>c.owned>0).length,
        totalInDecks:cards.reduce((n,c)=>n+c.inDecks,0),
        totalLoaned:cards.reduce((n,c)=>n+c.loaned,0),
        totalAvailable:cards.reduce((n,c)=>n+c.available,0),
        storageBoxes:Array.isArray(s.storageBoxes)?s.storageBoxes.length:0,
        decks:(s.decks||[]).length,
        activeLoans:(s.loans||[]).filter(l=>!l.returnedAt).length
      },
      state:s,
      cardMetadata,
      collectionReadable:cards
    };
  }
  function exportEnhanced(event){
    event.preventDefault();event.stopImmediatePropagation();
    const backup=buildBackup(),blob=new Blob([JSON.stringify(backup,null,2)],{type:'application/json'}),a=document.createElement('a'),url=URL.createObjectURL(blob);
    a.href=url;a.download=`riftbound-vault-backup-${new Date().toISOString().slice(0,10)}.json`;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1500);
  }
  function bind(){const btn=document.getElementById('exportBtn');if(!btn||btn.dataset.enhancedExport)return;btn.dataset.enhancedExport='1';btn.addEventListener('click',exportEnhanced,true)}
  function init(){bind();new MutationObserver(bind).observe(document.body,{childList:true,subtree:true})}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();