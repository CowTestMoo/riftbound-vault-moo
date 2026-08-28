(() => {
  'use strict';

  const APP_KEY='riftbound-vault-v2';
  const esc=(v='')=>String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const uid=()=>`premade-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,8)}`;

  const TEMPLATES=[
    {id:'pg-annie',set:'Origins: Proving Grounds',name:'Annie',champion:'Annie',hero:'OGS-017',cards:'1xOGS-017 1xOGN-296 3xOGN-169 3xOGN-170 3xOGN-171 3xOGN-185 3xOGS-003 2xOGN-013 2xOGS-011 3xOGN-176 3xOGN-005 2xOGS-010 3xOGN-191 2xOGS-001 3xOGN-174 3xOGS-002 2xOGS-018 6xOGN-007 6xOGN-166'},
    {id:'pg-garen',set:'Origins: Proving Grounds',name:'Garen',champion:'Garen',hero:'OGS-023',cards:'1xOGS-023 1xOGN-294 3xOGN-210 3xOGN-129 3xOGN-130 3xOGN-132 3xOGN-211 3xOGN-222 3xOGN-206 3xOGN-219 2xOGN-131 2xOGN-215 2xOGS-024 2xOGS-007 2xOGS-013 3xOGS-016 3xOGS-015 6xOGN-126 6xOGN-214'},
    {id:'pg-lux',set:'Origins: Proving Grounds',name:'Lux',champion:'Lux',hero:'OGS-021',cards:'1xOGS-021 1xOGN-288 3xOGN-095 3xOGN-103 3xOGN-210 2xOGN-084 3xOGN-087 3xOGN-206 2xOGS-014 3xOGN-219 3xOGN-085 2xOGS-006 3xOGS-016 3xOGN-105 3xOGS-012 2xOGN-088 2xOGS-022 6xOGN-089 6xOGN-214'},
    {id:'pg-master-yi',set:'Origins: Proving Grounds',name:'Master Yi',champion:'Master Yi',hero:'OGS-019',cards:'1xOGS-019 1xOGN-279 3xOGN-046 3xOGN-048 3xOGN-052 3xOGN-127 3xOGN-134 2xOGN-129 3xOGN-055 2xOGS-020 3xOGN-049 2xOGS-004 3xOGS-005 3xOGS-008 3xOGN-137 2xOGS-009 2xOGN-142 6xOGN-042 6xOGN-126'},
    {id:'ogn-jinx',set:'Origins',name:'Jinx Champion Deck',champion:'Jinx',hero:'OGN-251',cards:'2xOGN-001 3xOGN-002 3xOGN-003 3xOGN-006 6xOGN-007 2xOGN-008 1xOGN-011 3xOGN-019 2xOGN-024 1xOGN-030 1xOGN-036 2xOGN-165 6xOGN-166 3xOGN-168 3xOGN-169 2xOGN-178 2xOGN-180 3xOGN-182 3xOGN-185 1xOGN-195 1xOGN-251 1xOGN-285 1xOGN-289 1xOGN-298'},
    {id:'ogn-lee-sin',set:'Origins',name:'Lee Sin Champion Deck',champion:'Lee Sin',hero:'OGN-257',cards:'6xOGN-042 2xOGN-043 3xOGN-052 2xOGN-053 3xOGN-055 3xOGN-058 1xOGN-060 3xOGN-065 2xOGN-125 6xOGN-126 3xOGN-128 3xOGN-132 2xOGN-135 3xOGN-136 2xOGN-137 2xOGN-142 3xOGN-147 1xOGN-151 1xOGN-152 1xOGN-157 1xOGN-257 1xOGN-280 1xOGN-282 1xOGN-289'},
    {id:'ogn-viktor',set:'Origins',name:'Viktor Champion Deck',champion:'Viktor',hero:'OGN-265',cards:'2xOGN-083 3xOGN-084 2xOGN-086 6xOGN-089 2xOGN-090 2xOGN-093 2xOGN-094 2xOGN-095 2xOGN-101 3xOGN-103 1xOGN-111 1xOGN-117 1xOGN-118 2xOGN-206 3xOGN-208 3xOGN-209 2xOGN-213 6xOGN-214 3xOGN-216 3xOGN-222 1xOGN-233 1xOGN-265 1xOGN-275 1xOGN-293 1xOGN-294'},
    {id:'sfd-fiora',set:'Spiritforged',name:'Fiora Champion Deck',champion:'Fiora',hero:'SFD-205',cards:'6xOGN-126 2xOGN-136 6xOGN-214 2xOGN-229 2xSFD-093 3xSFD-095 2xSFD-097 2xSFD-099 2xSFD-103 2xSFD-106 3xSFD-107 3xSFD-108 2xSFD-110 2xSFD-113 1xSFD-116 2xSFD-156 2xSFD-157 3xSFD-161 2xSFD-167 1xSFD-172 1xSFD-180 1xSFD-205 1xSFD-206 1xSFD-213 1xSFD-218 1xSFD-221'},
    {id:'sfd-rumble',set:'Spiritforged',name:'Rumble Champion Deck',champion:'Rumble',hero:'SFD-181',cards:'6xOGN-007 3xOGN-016 3xOGN-024 2xOGN-083 6xOGN-089 2xOGN-095 1xOGN-105 3xSFD-007 1xSFD-019 2xSFD-021 1xSFD-022 2xSFD-026 3xSFD-062 3xSFD-065 2xSFD-066 3xSFD-069 2xSFD-070 2xSFD-071 3xSFD-076 1xSFD-089 1xSFD-181 1xSFD-182 1xSFD-212 1xSFD-215 1xSFD-220'},
    {id:'unl-vex',set:'Unleashed',name:'Vex Champion Deck',champion:'Vex',hero:'UNL-193',cards:'1xSFD-146 6xSFD-R02 6xSFD-R05 2xUNL-031 2xUNL-034 1xUNL-035 2xUNL-036 2xUNL-038 2xUNL-039 3xUNL-040 2xUNL-041 3xUNL-042 1xUNL-043 2xUNL-047 2xUNL-048 1xUNL-050 1xUNL-052 2xUNL-055 1xUNL-126 2xUNL-127 2xUNL-133 2xUNL-134 1xUNL-136 1xUNL-141 1xUNL-150 1xUNL-193 1xUNL-194 1xUNL-207 1xUNL-213 1xUNL-214'},
    {id:'unl-vi',set:'Unleashed',name:'Vi Champion Deck',champion:'Vi',hero:'UNL-187',cards:'1xOGN-036 2xSFD-009 6xSFD-R01 6xSFD-R06 1xUNL-001 3xUNL-002 2xUNL-006 2xUNL-008 1xUNL-009 2xUNL-010 2xUNL-012 2xUNL-015 2xUNL-017 2xUNL-018 1xUNL-024 1xUNL-026 1xUNL-030 2xUNL-153 2xUNL-154 2xUNL-156 1xUNL-159 2xUNL-161 2xUNL-163 1xUNL-175 2xUNL-176 1xUNL-187 1xUNL-188 1xUNL-215 1xUNL-217 1xUNL-218'},
    {id:'ven-shen',set:'Vendetta: Showdown',name:'Shen Showdown Deck',champion:'Shen',hero:'VEN-147',cards:'6xOGN-042 2xOGN-043 2xOGN-058 6xOGN-214 1xOGN-241 1xOGN-280 2xUNL-156 2xVEN-026 2xVEN-027 3xVEN-028 2xVEN-030 1xVEN-031 2xVEN-033 1xVEN-034 2xVEN-042 1xVEN-043 1xVEN-116 3xVEN-117 2xVEN-119 2xVEN-123 1xVEN-126 1xVEN-127 2xVEN-128 2xVEN-129 1xVEN-135 1xVEN-138 1xVEN-147 1xVEN-148 1xVEN-159 1xVEN-166'},
    {id:'ven-zed',set:'Vendetta: Showdown',name:'Zed Showdown Deck',champion:'Zed',hero:'VEN-143',cards:'6xOGN-007 6xOGN-166 2xOGN-185 1xOGN-298 3xVEN-002 3xVEN-007 3xVEN-008 2xVEN-012 3xVEN-013 2xVEN-014 1xVEN-017 1xVEN-020 1xVEN-023 3xVEN-093 3xVEN-095 3xVEN-096 2xVEN-101 1xVEN-102 2xVEN-105 1xVEN-106 1xVEN-110 2xVEN-112 1xVEN-143 1xVEN-144 1xVEN-165 1xVEN-166'}
  ];

  for(const t of TEMPLATES){
    t.entries=t.cards.trim().split(/\s+/).map(x=>{const m=x.match(/^(\d+)x(.+)$/);return{qty:Number(m?.[1]||0),locator:m?.[2]||''}}).filter(x=>x.qty&&x.locator);
    t.total=t.entries.reduce((n,x)=>n+x.qty,0);
  }

  function readState(){try{return {inventory:{},decks:[],loans:[],transactions:[],...JSON.parse(localStorage.getItem(APP_KEY)||'{}')}}catch{return {inventory:{},decks:[],loans:[],transactions:[]}}}
  function saveState(s){
    localStorage.setItem(APP_KEY,JSON.stringify(s));
    window.RiftboundApp?.reloadState?.();
    window.RiftboundFeatures?.render?.();
    window.RiftboundCloud?.syncNow?.();
    window.dispatchEvent(new CustomEvent('riftbound-local-change',{detail:{key:APP_KEY}}));
    setTimeout(decorateDecks,60);
  }
  function catalog(){return window.RiftboundApp?.getCatalog?.()||[]}
  function codeOf(c){return String(c?.cardCode||'').toLowerCase()}
  function locate(locator){
    const needle=String(locator).toLowerCase();
    const candidates=catalog().filter(c=>{
      const code=codeOf(c);
      if(code===needle||code.startsWith(`${needle}-`))return true;
      const number=String(c.cardNumber||c.collectorNumber||'').toLowerCase().split('/')[0].replace(/^0+(?=\d)/,'');
      const [set,num]=needle.split('-',2);const cleanNum=String(num||'').replace(/^0+(?=\d)/,'');
      return String(c.setCode||'').toLowerCase()===set&&number===cleanNum;
    });
    const exact=candidates.sort((a,b)=>{
      const ac=codeOf(a),bc=codeOf(b);const av=/star|alt|showcase|signature|over|foil|a-/.test(ac)?1:0,bv=/star|alt|showcase|signature|over|foil|a-/.test(bc)?1:0;return av-bv||ac.length-bc.length;
    })[0];
    if(exact)return exact;
    const runeMatch=needle.match(/^[a-z]+-r0?([1-6])$/),runeNames=['','Fury Rune','Calm Rune','Mind Rune','Body Rune','Chaos Rune','Order Rune'];
    if(runeMatch){
      const runeName=runeNames[Number(runeMatch[1])];
      return catalog().filter(c=>String(c.fullName||c.name||'').toLowerCase()===runeName.toLowerCase()).sort((a,b)=>Number(String(a.setCode||'').toLowerCase()!=='ogn')-Number(String(b.setCode||'').toLowerCase()!=='ogn')||codeOf(a).length-codeOf(b).length)[0]||null;
    }
    return null;
  }
  function resolveTemplate(t){
    const cards={},missing=[];
    for(const e of t.entries){const c=locate(e.locator);if(!c){missing.push(e.locator);continue}cards[c.cardCode]=(cards[c.cardCode]||0)+e.qty}
    return {cards,missing};
  }
  function templateById(id){return TEMPLATES.find(t=>t.id===id)}
  function premadeInstances(s=readState(),templateId=''){return (s.decks||[]).filter(d=>d.premade?.templateId&&(!templateId||d.premade.templateId===templateId))}

  function ensureDialog(){
    let d=document.getElementById('premadeDeckDialog');if(d)return d;
    d=document.createElement('dialog');d.id='premadeDeckDialog';d.className='modal premade-deck-dialog';document.body.appendChild(d);return d;
  }
  function ensureButton(){
    const newBtn=document.getElementById('newDeckBtn');if(!newBtn)return;
    let btn=document.getElementById('premadeDeckBtn');if(!btn){btn=document.createElement('button');btn.id='premadeDeckBtn';btn.type='button';btn.className='primary-btn deck-action-btn';btn.textContent='Premade Decks';newBtn.insertAdjacentElement('beforebegin',btn)}
    btn.classList.remove('ghost-btn');btn.classList.add('primary-btn','deck-action-btn');
  }
  function heroFor(t){const c=locate(t.hero);return c?.imageUrl||''}
  function renderManager(selected=''){
    const d=ensureDialog(),s=readState();
    const groups=[...new Set(TEMPLATES.map(t=>t.set))];
    const list=groups.map(group=>`<section class="premade-group"><h3>${esc(group)}</h3><div class="premade-grid">${TEMPLATES.filter(t=>t.set===group).map(t=>{const count=premadeInstances(s,t.id).length,img=heroFor(t);return `<article class="premade-tile ${selected===t.id?'selected':''}" data-premade-template="${esc(t.id)}">${img?`<img src="${esc(img)}" alt="">`:''}<div><small>${esc(t.set)}</small><strong>${esc(t.name)}</strong><span>${t.total} cards${count?` • Owned ×${count}`:''}</span></div><button type="button" class="${count?'ghost-btn':'primary-btn'}" data-premade-preview="${esc(t.id)}">${count?'View / Add Another':'View Deck'}</button></article>`}).join('')}</div></section>`).join('');
    const t=templateById(selected)||TEMPLATES[0],resolved=resolveTemplate(t),count=premadeInstances(s,t.id).length;
    const lines=Object.entries(resolved.cards).map(([code,q])=>{const c=window.RiftboundApp?.getCard?.(code)||catalog().find(x=>x.cardCode===code);return `<div class="premade-card-line"><span>${esc(c?.fullName||c?.name||code)}</span><b>×${q}</b></div>`}).join('');
    const missing=resolved.missing.length?`<div class="premade-warning">This template cannot be added yet because ${resolved.missing.length} card${resolved.missing.length===1?' is':'s are'} missing from the current catalog: ${esc(resolved.missing.join(', '))}.</div>`:'';
    d.innerHTML=`<div class="modal-inner premade-manager"><div class="modal-head"><div><h2>Premade Decks</h2><p>Official ready-to-play deck templates. Adding one adds its physical cards to your vault and reserves them in that deck.</p></div><button class="close-btn" type="button" data-premade-close aria-label="Close premade decks">×</button></div><div class="premade-layout"><div class="premade-list">${list}</div><aside class="premade-preview"><div class="premade-preview-head">${heroFor(t)?`<img src="${esc(heroFor(t))}" alt="">`:''}<div><small>${esc(t.set)}</small><h3>${esc(t.name)}</h3><p>${t.total} physical cards • ${count} added to this vault</p></div></div>${missing}<div class="premade-card-list">${lines||'<div class="empty-state">No cards resolved.</div>'}</div><button class="primary-btn premade-add-btn" type="button" data-premade-add="${esc(t.id)}" ${resolved.missing.length?'disabled':''}>${count?'Add Another Copy':'Add This Premade'}</button></aside></div></div>`;
    return d;
  }
  function openManager(id=''){const d=renderManager(id||TEMPLATES[0].id);if(!d.open)d.showModal()}

  function addTemplate(id){
    const t=templateById(id);if(!t)return;const r=resolveTemplate(t);if(r.missing.length){alert('Some cards in this premade are not in the current catalog yet.');return}
    const s=readState();s.inventory=s.inventory||{};s.decks=s.decks||[];s.transactions=s.transactions||[];
    const contributed={};
    for(const [code,q] of Object.entries(r.cards)){
      const before=Number(s.inventory[code]?.owned||0),after=before+q;s.inventory[code]={...(s.inventory[code]||{}),owned:after};contributed[code]=q;
      s.transactions.unshift({id:uid(),cardCode:code,delta:q,reason:`Premade deck: ${t.name}`,at:new Date().toISOString()});
    }
    const deck={id:uid(),name:t.name,champion:t.champion,notes:`Official ${t.set} premade template.`,cards:{...r.cards},createdAt:new Date().toISOString(),updatedAt:new Date().toISOString(),premade:{templateId:t.id,set:t.set,contributed,addedAt:new Date().toISOString()}};
    s.decks.push(deck);s.transactions.unshift({id:uid(),type:'activity',action:`Added premade deck “${t.name}”`,deckId:deck.id,at:new Date().toISOString()});
    saveState(s);window.RiftboundTheme?.play?.('success');window.RiftboundNeonFX?.trigger?.('inventory');renderManager(id);
  }

  function otherDecked(code,s,excludeId){return (s.decks||[]).filter(d=>d.id!==excludeId).reduce((n,d)=>n+Number(d.cards?.[code]||0),0)}
  function activeLoaned(code,s){return (s.loans||[]).filter(l=>!l.returnedAt&&l.cardCode===code).reduce((n,l)=>n+Number(l.qty||0),0)}
  function removePremade(deckId){
    const s=readState(),deck=(s.decks||[]).find(d=>d.id===deckId);if(!deck?.premade)return false;
    const t=templateById(deck.premade.templateId),contributed=deck.premade.contributed||deck.cards||{};let protectedCopies=0;
    s.decks=s.decks.filter(d=>d.id!==deckId);
    for(const [code,q] of Object.entries(contributed)){
      const before=Number(s.inventory?.[code]?.owned||0),minimum=otherDecked(code,s,'')+activeLoaned(code,s),wanted=Math.max(0,before-Number(q||0)),after=Math.max(minimum,wanted),removed=Math.max(0,before-after);
      if(after>0)s.inventory[code]={...(s.inventory[code]||{}),owned:after};else delete s.inventory[code];
      if(removed)s.transactions.unshift({id:uid(),cardCode:code,delta:-removed,reason:`Removed premade deck: ${t?.name||deck.name}`,at:new Date().toISOString()});
      protectedCopies+=Math.max(0,Number(q||0)-removed);
    }
    s.transactions.unshift({id:uid(),type:'activity',action:`Removed premade deck “${t?.name||deck.name}”`,deckId,at:new Date().toISOString()});
    saveState(s);window.RiftboundTheme?.play?.('remove');
    if(protectedCopies)alert(`${protectedCopies} card ${protectedCopies===1?'copy was':'copies were'} left in your collection because they are currently allocated to another deck or active loan.`);
    return true;
  }

  function previewOwnedDeck(deckId){const s=readState(),deck=(s.decks||[]).find(d=>d.id===deckId);if(deck?.premade?.templateId)openManager(deck.premade.templateId)}
  function decorateDecks(){
    ensureButton();const s=readState();
    document.querySelectorAll('#deckList [data-edit-deck]').forEach(btn=>{const d=(s.decks||[]).find(x=>x.id===btn.dataset.editDeck);if(!d?.premade)return;btn.textContent='View';btn.dataset.premadeOwnedView=d.id});
    document.querySelectorAll('#deckList [data-delete-deck]').forEach(btn=>{const d=(s.decks||[]).find(x=>x.id===btn.dataset.deleteDeck);if(d?.premade)btn.textContent='Remove Premade'});
    document.querySelectorAll('#deckList .feature-list-card').forEach(card=>{const id=card.querySelector('[data-delete-deck]')?.dataset.deleteDeck,d=(s.decks||[]).find(x=>x.id===id);if(d?.premade&&!card.querySelector('.premade-badge'))card.querySelector('h3')?.insertAdjacentHTML('afterend',`<span class="premade-badge">PREMADE • ${esc(d.premade.set||'Official')}</span>`)});
  }

  document.addEventListener('click',e=>{
    const ownedView=e.target.closest('[data-premade-owned-view]');if(ownedView){e.preventDefault();e.stopImmediatePropagation();previewOwnedDeck(ownedView.dataset.premadeOwnedView);return}
    const del=e.target.closest('[data-delete-deck]');if(del){const d=(readState().decks||[]).find(x=>x.id===del.dataset.deleteDeck);if(d?.premade){e.preventDefault();e.stopImmediatePropagation();if(confirm(`Remove “${d.name}” and subtract the physical cards that came with this premade from your collection?`))removePremade(d.id);return}}
    if(e.target.closest('#premadeDeckBtn')){openManager();return}
    if(e.target.closest('[data-premade-close]')){document.getElementById('premadeDeckDialog')?.close();return}
    const preview=e.target.closest('[data-premade-preview]');if(preview){renderManager(preview.dataset.premadePreview);return}
    const tile=e.target.closest('[data-premade-template]');if(tile&&!e.target.closest('button')){renderManager(tile.dataset.premadeTemplate);return}
    const add=e.target.closest('[data-premade-add]');if(add){addTemplate(add.dataset.premadeAdd);return}
  },true);

  window.addEventListener('riftbound-ui-render',e=>{if((e.detail?.scopes||[]).includes('decks'))setTimeout(decorateDecks,0)});
  window.addEventListener('riftbound-cloud-restored',()=>setTimeout(decorateDecks,80));
  function init(){setTimeout(decorateDecks,350);setTimeout(decorateDecks,1100)}
  window.RiftboundPremades={templates:TEMPLATES,open:openManager,resolveTemplate,locate};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
