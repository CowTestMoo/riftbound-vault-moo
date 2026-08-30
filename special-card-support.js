(() => {
  'use strict';

  const KNOWN_DOMAINS=['Fury','Calm','Mind','Body','Chaos','Order'];
  const ALLOWED_RULES=['All','Units','Other','Champions','Legends','Spells','Gear','Runes','Battlefields','Tokens'];
  const originalShowCard=window.showCard;

  const escapeHtml=(v='')=>String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const cardName=c=>c?.fullName||c?.name||c?.cardCode||'Unknown card';
  const lower=v=>String(v||'').toLowerCase();

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
    if(box.rule==='All')return true;
    if(box.rule==='Other')return !['Units','Legends','Battlefields'].includes(cls);
    return box.rule===cls;
  }

  function normalizeBoxes(value){
    const source=Array.isArray(value)
      ? value
      : (typeof defaultStorageBoxes==='function'?defaultStorageBoxes():[]);
    return source.map((box,i)=>({
      id:String(box?.id||`box-${i+1}-${Math.random().toString(36).slice(2,6)}`),
      name:String(box?.name||`Box ${i+1}`),
      domains:Array.isArray(box?.domains)?box.domains.filter(d=>KNOWN_DOMAINS.includes(d)):[],
      rule:ALLOWED_RULES.includes(box?.rule)?box.rule:'All'
    }));
  }

  function specialFirstLocation(card,boxes){
    const cls=storageClass(card);
    if(['Legends','Battlefields'].includes(cls)){
      const exact=boxes.findIndex(box=>box.rule===cls&&boxDomainMatches(box,card));
      if(exact>=0)return exact;
    }
    return boxes.findIndex(box=>ruleMatches(box,card));
  }

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
    if(cls==='Units')return `Energy ${Number(card?.energy)>=6?'6+':(card?.energy??'?')}`;
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
    const labels={All:'All cards',Other:'Other standard cards',Legends:'Legends',Battlefields:'Battlefields / Maps'};
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

  window.RiftboundSpecialCards={storageClass,isLandscape:card=>storageClass(card)==='Battlefields'};
})();
