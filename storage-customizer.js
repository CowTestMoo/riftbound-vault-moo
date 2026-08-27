(() => {
  'use strict';

  const APP_KEY='riftbound-vault-v2';
  const DOMAINS=['Fury','Calm','Mind','Body','Chaos','Order'];
  const RULES=[
    ['All','All cards'],
    ['Units','Units'],
    ['Other','Non-unit cards'],
    ['Champions','Champions'],
    ['Spells','Spells'],
    ['Gear','Gear'],
    ['Runes','Runes'],
    ['Battlefields','Battlefields'],
    ['Tokens','Tokens']
  ];
  let draft=[];
  let dragId='';

  const esc=(v='')=>String(v).replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
  const uid=()=>`box-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,8)}`;
  const readState=()=>{try{return JSON.parse(localStorage.getItem(APP_KEY)||'{}')}catch{return {}}};

  function defaultBoxes(){
    return DOMAINS.flatMap((domain,i)=>[
      {id:`box-${i*2+1}`,name:`Box ${i*2+1}`,domains:[domain],rule:'Units'},
      {id:`box-${i*2+2}`,name:`Box ${i*2+2}`,domains:[domain],rule:'Other'}
    ]);
  }
  function normalizeBoxes(boxes){
    if(!Array.isArray(boxes))return defaultBoxes();
    return boxes.map((b,i)=>({id:String(b?.id||uid()),name:String(b?.name||`Box ${i+1}`),domains:Array.isArray(b?.domains)?b.domains.filter(d=>DOMAINS.includes(d)):[],rule:RULES.some(([v])=>v===b?.rule)?b.rule:'All'}));
  }
  function nextDefaultName(){
    const used=new Set(draft.map(b=>b.name));let n=draft.length+1;
    while(used.has(`Box ${n}`))n++;
    return `Box ${n}`;
  }
  function ruleLabel(value){return RULES.find(([v])=>v===value)?.[1]||value}
  function domainSummary(box){return box.domains.length?box.domains.join(' + '):'Any domain'}

  function currentBoxes(){return normalizeBoxes(readState().storageBoxes)}
  function cardDomain(card){
    const cardDomains=Array.isArray(card?.domains)?card.domains:(card?.domain?[card.domain]:[]);
    return DOMAINS.find(d=>cardDomains.includes(d))||(DOMAINS.includes(card?.domain)?card.domain:'Unassigned');
  }
  function cardClass(card){
    const labels=(card?.cardTypeLabels||[]).map(x=>String(x).toLowerCase());
    const champion=labels.includes('champion');
    const type=String(card?.cardType||'').toLowerCase();
    if(type==='unit'&&!champion)return 'Units';
    if(champion)return 'Champions';
    if(type==='spell')return 'Spells';
    if(type==='gear')return 'Gear';
    if(type==='rune')return 'Runes';
    if(type==='battlefield')return 'Battlefields';
    if(type==='token')return 'Tokens';
    return 'Other';
  }
  function sectionFor(card){const cls=cardClass(card);return cls==='Units'?`Energy ${Number(card?.energy)>=6?'6+':(card?.energy??'?')}`:cls}
  function matches(box,card){
    const domain=cardDomain(card);if(box.domains.length&&!box.domains.includes(domain))return false;
    const cls=cardClass(card);if(box.rule==='All')return true;if(box.rule==='Other')return cls!=='Units';return box.rule===cls;
  }
  function customLocationFor(card){
    const boxes=currentBoxes(),domain=cardDomain(card),index=boxes.findIndex(b=>matches(b,card));
    if(index<0)return {box:null,boxId:null,boxName:'Unassigned',domain,bucket:'Unassigned',section:sectionFor(card)};
    const box=boxes[index];return {box:index+1,boxId:box.id,boxName:box.name,domain,bucket:box.rule,section:sectionFor(card)};
  }
  function customRenderStorage(){
    const root=document.getElementById('storageGrid');if(!root)return;
    const boxes=currentBoxes(),catalog=window.RiftboundApp?.getCatalog?.()||[];
    root.innerHTML=boxes.length?boxes.map((box,i)=>{
      const cards=catalog.filter(c=>customLocationFor(c).boxId===box.id&&Number(window.RiftboundApp?.available?.(c.cardCode)||0)>0);
      const count=cards.reduce((n,c)=>n+Number(window.RiftboundApp?.available?.(c.cardCode)||0),0);
      return `<button class="storage-box" data-box="${i+1}"><div class="storage-top"><span class="storage-number">POSITION ${String(i+1).padStart(2,'0')}</span><span class="storage-count">${count} cards</span></div><h3>${esc(box.name)}</h3><p>${esc(domainSummary(box))} • ${esc(ruleLabel(box.rule))}</p><small>${cards.length} unique cards</small></button>`;
    }).join(''):'<div class="empty-state">No storage boxes configured yet. Use Customize Storage to add one.</div>';
  }
  function customShowBox(position){
    const boxes=currentBoxes(),box=boxes[Number(position)-1];if(!box)return;
    const catalog=window.RiftboundApp?.getCatalog?.()||[],cards=catalog.filter(c=>customLocationFor(c).boxId===box.id&&Number(window.RiftboundApp?.available?.(c.cardCode)||0)>0);
    const d=document.getElementById('storageDialog');if(!d)return;
    d.innerHTML=`<div class="modal-inner"><div class="modal-head"><div><h2>${esc(box.name)}</h2><p class="detail-meta">Position ${Number(position)} • ${esc(domainSummary(box))} • ${esc(ruleLabel(box.rule))}</p></div><button class="close-btn" data-close="storageDialog">×</button></div>${cards.length?`<div class="card-lines">${cards.map(c=>`<div class="card-line"><span>${esc(sectionFor(c))} • ${esc(c.fullName||c.name||c.cardCode)}</span><strong>×${Number(window.RiftboundApp?.available?.(c.cardCode)||0)}</strong></div>`).join('')}</div>`:'<div class="empty-state">No cards route here yet.</div>'}</div>`;
    d.showModal();
  }
  function customShowCard(code){
    const c=window.RiftboundApp?.getCard?.(code);if(!c)return;
    const loc=customLocationFor(c),owned=Number(window.RiftboundApp?.owned?.(code)||0),avail=Number(window.RiftboundApp?.available?.(code)||0),decked=Number(window.RiftboundApp?.decked?.(code)||0),loaned=Number(window.RiftboundApp?.loaned?.(code)||0);
    const d=document.getElementById('cardDialog');if(!d)return;
    d.innerHTML=`<div class="modal-inner"><div class="modal-head"><h2>${esc(c.fullName||c.name||c.cardCode)}</h2><button class="close-btn" data-close="cardDialog">×</button></div><div class="detail-layout"><div>${c.imageUrl?`<img class="detail-image" src="${esc(c.imageUrl)}" alt="${esc(c.fullName||c.name||c.cardCode)}">`:'<div class="detail-image card-placeholder">No image</div>'}</div><div><div class="detail-meta">${esc(c.cardSet||'')} • ${esc(c.cardType||'')} • ${esc((c.domains||[]).join(' / '))}</div><div class="info-grid"><div class="info-cell"><strong>${owned}</strong><small>Total owned</small></div><div class="info-cell"><strong>${avail}</strong><small>Available</small></div><div class="info-cell"><strong>${decked}</strong><small>In decks</small></div><div class="info-cell"><strong>${loaned}</strong><small>Loaned</small></div></div><div class="location-callout"><strong>Store in:</strong><br>${loc.box?`${esc(loc.boxName)} • Position ${loc.box} • ${esc(loc.section)}`:'Unassigned • Customize Storage to choose a destination'}</div><div class="modal-actions"><button class="primary-btn" data-adjust="1" data-code="${esc(code)}">+1</button><button class="primary-btn" data-adjust="4" data-code="${esc(code)}">+4</button><button class="primary-btn" data-adjust="10" data-code="${esc(code)}">+10</button><button class="ghost-btn" data-adjust="-1" data-code="${esc(code)}">−1</button></div></div></div></div>`;
    d.showModal();
  }
  function installRoutingOverrides(){window.locationFor=customLocationFor;window.renderStorage=customRenderStorage;window.showBox=customShowBox;window.showCard=customShowCard}

  function ensureButton(){
    const view=document.getElementById('storageView');if(!view)return false;
    let heading=view.querySelector('.section-heading');if(!heading)return false;
    if(document.getElementById('customizeStorageBtn'))return true;
    heading.classList.add('inline-heading','storage-heading-customizable');
    let copy=heading.querySelector(':scope > div');
    if(!copy){const h=heading.querySelector('h2'),p=heading.querySelector('p');copy=document.createElement('div');if(h)copy.appendChild(h);if(p)copy.appendChild(p);heading.prepend(copy)}
    copy.querySelector('h2').textContent='Your Storage';copy.querySelector('p').textContent='Mirror your real storage boxes and choose where each kind of card belongs.';
    const btn=document.createElement('button');btn.id='customizeStorageBtn';btn.className='primary-btn';btn.type='button';btn.textContent='Customize Storage';heading.appendChild(btn);return true;
  }
  function ensureDialog(){
    if(document.getElementById('storageSetupDialog'))return;
    const d=document.createElement('dialog');d.id='storageSetupDialog';d.className='modal storage-setup-dialog';
    d.innerHTML=`<div class="modal-inner storage-setup-inner"><div class="modal-head"><div><h2>Customize Storage</h2><p class="storage-setup-subtitle">Build the website in the same order as your real boxes.</p></div><button class="close-btn" data-close-storage-setup>×</button></div><div class="storage-setup-help"><strong>Order matters.</strong> A card goes to the first box whose domain and card-type rules match it. Drag boxes or use the arrows to reorder them.</div><div id="storageSetupSummary" class="storage-setup-summary"></div><div id="storageSetupList" class="storage-setup-list"></div><div class="storage-setup-footer"><div><button id="addStorageBox" class="ghost-btn" type="button">+ Add Box</button><button id="resetStorageBoxes" class="ghost-btn" type="button">Reset to 12-Box Default</button></div><button id="saveStorageBoxes" class="primary-btn" type="button">Save Storage Layout</button></div></div>`;
    document.body.appendChild(d);
  }
  function previewCounts(){
    const catalog=window.RiftboundApp?.getCatalog?.()||[],state=readState(),counts=new Map(draft.map(b=>[b.id,{copies:0,unique:0}]));let unassignedCopies=0,unassignedUnique=0;
    for(const card of catalog){const owned=Number(state.inventory?.[card.cardCode]?.owned||0);if(owned<=0)continue;const idx=draft.findIndex(b=>matches(b,card));if(idx<0){unassignedCopies+=owned;unassignedUnique++;continue}const c=counts.get(draft[idx].id);c.copies+=owned;c.unique++}
    return {counts,unassignedCopies,unassignedUnique};
  }
  function domainChips(box){return DOMAINS.map(d=>`<label class="storage-domain-chip ${box.domains.includes(d)?'active':''}"><input type="checkbox" data-storage-domain="${esc(d)}" ${box.domains.includes(d)?'checked':''}><span>${esc(d)}</span></label>`).join('')}
  function render(){
    const root=document.getElementById('storageSetupList');if(!root)return;const preview=previewCounts(),summary=document.getElementById('storageSetupSummary');
    if(summary)summary.innerHTML=`<div><strong>${draft.length}</strong><small>Boxes</small></div><div class="${preview.unassignedCopies?'warn':'good'}"><strong>${preview.unassignedCopies}</strong><small>Unassigned copies</small></div><div class="${preview.unassignedUnique?'warn':'good'}"><strong>${preview.unassignedUnique}</strong><small>Unassigned cards</small></div>`;
    root.innerHTML=draft.length?draft.map((box,i)=>{const count=preview.counts.get(box.id)||{copies:0,unique:0};return `<article class="storage-rule-card" draggable="true" data-storage-box-id="${esc(box.id)}"><div class="storage-rule-order"><span class="storage-drag-handle" title="Drag to reorder">⋮⋮</span><strong>${String(i+1).padStart(2,'0')}</strong><div><button type="button" data-storage-up="${esc(box.id)}" ${i===0?'disabled':''}>↑</button><button type="button" data-storage-down="${esc(box.id)}" ${i===draft.length-1?'disabled':''}>↓</button></div></div><div class="storage-rule-main"><label class="storage-name-label"><span>Box name</span><input data-storage-name="${esc(box.id)}" value="${esc(box.name)}" placeholder="Box ${i+1}"></label><div class="storage-rule-meta"><span>${count.copies} copies</span><span>${count.unique} unique</span></div><div class="storage-rule-fields"><div><span class="field-label">Domains <small>none = any</small></span><div class="storage-domain-chips">${domainChips(box)}</div></div><label><span class="field-label">What goes here</span><select data-storage-rule="${esc(box.id)}">${RULES.map(([v,l])=>`<option value="${v}" ${box.rule===v?'selected':''}>${l}</option>`).join('')}</select></label></div><div class="storage-rule-preview">${esc(domainSummary(box))} • ${esc(ruleLabel(box.rule))}</div></div><button class="storage-remove-btn" type="button" data-storage-remove="${esc(box.id)}" title="Remove box">×</button></article>`}).join(''):'<div class="empty-state">You have no storage boxes configured. Add one below.</div>';
  }
  function openEditor(){ensureDialog();draft=normalizeBoxes(readState().storageBoxes).map(x=>({...x,domains:[...x.domains]}));render();document.getElementById('storageSetupDialog').showModal()}
  function move(id,delta){const i=draft.findIndex(b=>b.id===id),j=i+delta;if(i<0||j<0||j>=draft.length)return;[draft[i],draft[j]]=[draft[j],draft[i]];render()}
  function save(){
    const s=readState();s.storageBoxes=normalizeBoxes(draft);s.transactions=Array.isArray(s.transactions)?s.transactions:[];s.transactions.unshift({id:`evt-${Date.now().toString(36)}`,type:'activity',action:`Updated storage layout • ${s.storageBoxes.length} box${s.storageBoxes.length===1?'':'es'}`,at:new Date().toISOString()});s.transactions=s.transactions.slice(0,500);localStorage.setItem(APP_KEY,JSON.stringify(s));window.RiftboundApp?.reloadState?.();window.RiftboundCloud?.syncNow?.();document.getElementById('storageSetupDialog').close();
  }
  function bind(){
    document.addEventListener('click',e=>{let x;if(e.target.closest('#customizeStorageBtn'))return openEditor();if(e.target.closest('[data-close-storage-setup]'))return document.getElementById('storageSetupDialog')?.close();if(e.target.closest('#addStorageBox')){draft.push({id:uid(),name:nextDefaultName(),domains:['Fury'],rule:'All'});return render()}if(e.target.closest('#resetStorageBoxes')){if(confirm('Reset your storage layout to the original 12-box Fury/Calm/Mind/Body/Chaos/Order setup?')){draft=defaultBoxes();render()}return}if(e.target.closest('#saveStorageBoxes'))return save();if(x=e.target.closest('[data-storage-remove]')){draft=draft.filter(b=>b.id!==x.dataset.storageRemove);return render()}if(x=e.target.closest('[data-storage-up]'))return move(x.dataset.storageUp,-1);if(x=e.target.closest('[data-storage-down]'))return move(x.dataset.storageDown,1)});
    document.addEventListener('input',e=>{if(e.target.matches('[data-storage-name]')){const b=draft.find(x=>x.id===e.target.dataset.storageName);if(b)b.name=e.target.value}});
    document.addEventListener('change',e=>{if(e.target.matches('[data-storage-rule]')){const b=draft.find(x=>x.id===e.target.dataset.storageRule);if(b)b.rule=e.target.value;return render()}if(e.target.matches('[data-storage-domain]')){const card=e.target.closest('[data-storage-box-id]'),b=draft.find(x=>x.id===card?.dataset.storageBoxId);if(!b)return;const d=e.target.dataset.storageDomain;b.domains=e.target.checked?[...new Set([...b.domains,d])]:b.domains.filter(x=>x!==d);return render()}});
    document.addEventListener('dragstart',e=>{const card=e.target.closest('[data-storage-box-id]');if(!card)return;dragId=card.dataset.storageBoxId;card.classList.add('dragging');e.dataTransfer.effectAllowed='move'});document.addEventListener('dragend',e=>{e.target.closest?.('[data-storage-box-id]')?.classList.remove('dragging');dragId=''});document.addEventListener('dragover',e=>{const target=e.target.closest?.('[data-storage-box-id]');if(!target||!dragId||target.dataset.storageBoxId===dragId)return;e.preventDefault();e.dataTransfer.dropEffect='move'});document.addEventListener('drop',e=>{const target=e.target.closest?.('[data-storage-box-id]');if(!target||!dragId||target.dataset.storageBoxId===dragId)return;e.preventDefault();const from=draft.findIndex(b=>b.id===dragId),to=draft.findIndex(b=>b.id===target.dataset.storageBoxId);if(from<0||to<0)return;const [moved]=draft.splice(from,1);draft.splice(to,0,moved);dragId='';render()});
  }
  function init(){installRoutingOverrides();const s=readState();if(!Array.isArray(s.storageBoxes)){s.storageBoxes=defaultBoxes();localStorage.setItem(APP_KEY,JSON.stringify(s));window.RiftboundApp?.reloadState?.()}ensureButton();ensureDialog();bind();customRenderStorage();const observer=new MutationObserver(ensureButton);observer.observe(document.body,{childList:true,subtree:true})}
  installRoutingOverrides();
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();