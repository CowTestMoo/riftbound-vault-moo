(() => {
  'use strict';

  const APP_KEY='riftbound-vault-v2';
  const KNOWN_DOMAINS=['Fury','Calm','Mind','Body','Chaos','Order'];
  const ALLOWED_RULES=['All','Units','Other','Champions','Legends','Spells','Gear','Runes','Battlefields','Tokens','TokensMaps'];
  const originalShowCard=window.showCard;
  let migrationTimer=0;

  const escapeHtml=(v='')=>String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const cardName=c=>c?.fullName||c?.name||c?.cardCode||'Unknown card';
  const lower=v=>String(v||'').toLowerCase();

  function recommendedStorageBoxes(){
    return [
      {id:'box-legends',name:'Legends',domains:[],rule:'Legends'},
      {id:'box-tokens-maps',name:'Tokens + Battlefields / Maps',domains:[],rule:'TokensMaps'},
      ...KNOWN_DOMAINS.map(domain=>({id:`box-${domain.toLowerCase()}`,name:`${domain} Cards`,domains:[domain],rule:'All'}))
    ];
  }

  function domainsOf(card){
    const list=Array.isArray(card?.domains)?card.domains:(card?.domain?[card.domain]:[]);
    return [...new Set(list.filter(d=>KNOWN_DOMAINS.includes(d)))];
  }

  function storageClass(card){
    const labels=(card?.cardTypeLabels||[]).map(lower);
    const type=lower(card?.cardType);
    if(type==='legend')return 'Legends';
    if(type==='unit'&&!labels.includes('champion'))return 'Units';
    if(labels.includes('champion'))return 'Champions';
    if(type==='spell')return 'Spells';
    if(type==='gear')return 'Gear';
    if(type==='rune')return 'Runes';
    if(type==='battlefield')return 'Battlefields';
    if(type==='token')return 'Tokens';
    return 'Other';
  }

  function boxDomainMatches(box,card){
    if(!box?.domains?.length)return true;
    const cardDomains=domainsOf(card);
    return box.domains.some(domain=>cardDomains.includes(domain));
  }

  function ruleMatches(box,card){
    if(!boxDomainMatches(box,card))return false;
    const cls=storageClass(card);
    if(box.rule==='All')return !['Legends','Battlefields','Tokens'].includes(cls);
    if(box.rule==='Other')return !['Units','Legends','Battlefields','Tokens'].includes(cls);
    if(box.rule==='TokensMaps')return cls==='Tokens'||cls==='Battlefields';
    return box.rule===cls;
  }

  function normalizeBoxes(value){
    const source=Array.isArray(value)?value:recommendedStorageBoxes();
    return source.map((box,i)=>({
      id:String(box?.id||`box-${i+1}-${Math.random().toString(36).slice(2,6)}`),
      name:String(box?.name||`Box ${i+1}`),
      domains:Array.isArray(box?.domains)?box.domains.filter(d=>KNOWN_DOMAINS.includes(d)):[],
      rule:ALLOWED_RULES.includes(box?.rule)?box.rule:'All'
    }));
  }

  function specialFirstLocation(card,boxes){
    const cls=storageClass(card);
    if(cls==='Legends'){
      const exact=boxes.findIndex(box=>box.rule==='Legends'&&boxDomainMatches(box,card));
      if(exact>=0)return exact;
    }
    if(cls==='Battlefields'||cls==='Tokens'){
      const combined=boxes.findIndex(box=>box.rule==='TokensMaps'&&boxDomainMatches(box,card));
      if(combined>=0)return combined;
      const exact=boxes.findIndex(box=>box.rule===cls&&boxDomainMatches(box,card));
      if(exact>=0)return exact;
    }
    return boxes.findIndex(box=>ruleMatches(box,card));
  }

  function isLegacyPair(box,domain,rule){
    return !!box&&box.rule===rule&&Array.isArray(box.domains)&&box.domains.length===1&&box.domains[0]===domain;
  }

  function isLegacyTwelve(boxes){
    if(!Array.isArray(boxes)||boxes.length!==12)return false;
    return KNOWN_DOMAINS.every((domain,i)=>isLegacyPair(boxes[i*2],domain,'Units')&&isLegacyPair(boxes[i*2+1],domain,'Other'));
  }

  function isNineSectionRecommended(boxes){
    if(!Array.isArray(boxes)||boxes.length!==9)return false;
    const hasLegend=boxes.some(box=>box?.rule==='Legends'&&!box?.domains?.length);
    const hasBattlefield=boxes.some(box=>box?.rule==='Battlefields'&&!box?.domains?.length);
    const hasToken=boxes.some(box=>box?.rule==='Tokens'&&!box?.domains?.length);
    const domainsOkay=KNOWN_DOMAINS.every(domain=>boxes.some(box=>box?.rule==='All'&&box?.domains?.length===1&&box.domains[0]===domain));
    return hasLegend&&hasBattlefield&&hasToken&&domainsOkay;
  }

  function isPreviousRecommended(boxes){
    if(!Array.isArray(boxes))return false;
    const specialRules=new Set(['Legends','Battlefields','Tokens']);
    const regular=boxes.filter(box=>!specialRules.has(box?.rule));
    const hasLegend=boxes.some(box=>box?.rule==='Legends'&&!box?.domains?.length);
    const hasBattlefield=boxes.some(box=>box?.rule==='Battlefields'&&!box?.domains?.length);
    return hasLegend&&hasBattlefield&&isLegacyTwelve(regular);
  }

  function shouldUpgrade(boxes){
    return !Array.isArray(boxes)||!boxes.length||isLegacyTwelve(boxes)||isPreviousRecommended(boxes)||isNineSectionRecommended(boxes);
  }

  function migrateRecommendedLayout(){
    let saved;
    try{saved=JSON.parse(localStorage.getItem(APP_KEY)||'{}')}catch{saved={}}
    if(!shouldUpgrade(saved.storageBoxes))return false;
    saved.storageBoxes=recommendedStorageBoxes();
    saved.storageLayoutVersion=4;
    localStorage.setItem(APP_KEY,JSON.stringify(saved));
    window.RiftboundApp?.reloadState?.();
    return true;
  }

  function scheduleMigration(){
    clearTimeout(migrationTimer);
    migrationTimer=setTimeout(()=>migrateRecommendedLayout(),0);
  }

  window.defaultStorageBoxes=recommendedStorageBoxes;
  window.cardStorageClass=storageClass;
  window.cardDomain=card=>{
    const domains=domainsOf(card);
    if(storageClass(card)==='Legends'&&domains.length>1)return domains.join(' + ');
    return domains[0]||'Unassigned';
  };
  window.normalizeStorageBoxes=normalizeBoxes;
  window.storageRuleMatches=ruleMatches;
  window.sectionFor=card=>{
    const cls=storageClass(card);
    if(cls==='Units')return `Units • Energy ${Number(card?.energy)>=6?'6+':(card?.energy??'?')}`;
    if(cls==='Battlefields')return 'Battlefields / Maps';
    return cls;
  };
  window.locationFor=(card,boxes=normalizeBoxes(window.RiftboundApp?.getState?.()?.storageBoxes))=>{
    const domain=window.cardDomain(card);
    const index=specialFirstLocation(card,boxes);
    if(index<0)return {box:null,boxId:null,boxName:'Unassigned',domain,bucket:'Unassigned',section:window.sectionFor(card)};
    const box=boxes[index];
    return {box:index+1,boxId:box.id,boxName:box.name,domain,bucket:box.rule,section:window.sectionFor(card)};
  };
  window.describeStorageBox=box=>{
    const domainText=box?.domains?.length?box.domains.join(' + '):'Any domain';
    const labels={All:'All regular cards',Other:'Other standard cards',Legends:'Legends',Battlefields:'Battlefields / Maps',Tokens:'Tokens',TokensMaps:'Tokens + Battlefields / Maps'};
    return `${domainText} • ${labels[box?.rule]||box?.rule||'All cards'}`;
  };

  window.cardTile=c=>{
    const qty=window.RiftboundApp?.owned?.(c.cardCode)||0;
    const landscape=storageClass(c)==='Battlefields';
    return `<button class="card-tile ${landscape?'landscape-card':''}" data-card="${escapeHtml(c.cardCode)}"><div class="card-image-wrap ${landscape?'landscape-card-image-wrap':''}">${c.imageUrl?`<img class="card-image ${landscape?'landscape-card-image':''}" loading="lazy" decoding="async" fetchpriority="low" src="${escapeHtml(c.imageUrl)}" alt="${escapeHtml(cardName(c))}">`:`<div class="card-placeholder">${escapeHtml(cardName(c))}</div>`}</div>${qty?`<span class="qty-badge">×${qty}</span>`:''}<div class="card-caption"><strong>${escapeHtml(cardName(c))}</strong><small>${escapeHtml(c.cardSet)} ${escapeHtml(c.cardNumber)}</small></div></button>`;
  };

  function decorateCardDialog(code){
    const card=window.RiftboundApp?.getCard?.(code);
    if(!card||storageClass(card)!=='Battlefields')return;
    const dialog=document.getElementById('cardDialog');
    dialog?.querySelector('.detail-layout')?.classList.add('landscape-detail-layout');
    dialog?.querySelector('.detail-image')?.classList.add('landscape-card-image');
  }

  if(typeof originalShowCard==='function'){
    window.showCard=code=>{
      originalShowCard(code);
      requestAnimationFrame(()=>decorateCardDialog(code));
    };
  }

  window.RiftboundSpecialCards={
    storageClass,
    isLandscape:card=>storageClass(card)==='Battlefields',
    recommendedStorageBoxes,
    migrateRecommendedLayout
  };

  migrateRecommendedLayout();
  window.addEventListener('riftbound-cloud-restored',scheduleMigration);
})();
