(() => {
  'use strict';

  const APP_KEY='riftbound-vault-v2';
  const OPTION_LIMIT=6;
  const esc=(v='')=>String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const norm=(v='')=>String(v).toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g,'');
  const uid=()=>`recommended-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,8)}`;

  function readState(){
    try{return {inventory:{},decks:[],loans:[],transactions:[],...JSON.parse(localStorage.getItem(APP_KEY)||'{}')}}
    catch{return {inventory:{},decks:[],loans:[],transactions:[]}}
  }
  function saveState(s){
    localStorage.setItem(APP_KEY,JSON.stringify(s));
    window.RiftboundApp?.reloadState?.();
    window.RiftboundFeatures?.render?.();
    window.RiftboundCloud?.syncNow?.();
    window.dispatchEvent(new CustomEvent('riftbound-local-change',{detail:{key:APP_KEY}}));
  }
  function templates(){return window.RiftboundPremades?.templates||[]}
  function catalog(){return window.RiftboundApp?.getCatalog?.()||[]}
  function card(code){return window.RiftboundApp?.getCard?.(code)||catalog().find(c=>c.cardCode===code)}
  function nameOf(code){const c=card(code);return c?.fullName||c?.name||code}
  function available(code,s){
    const owned=Number(s.inventory?.[code]?.owned||0);
    const decked=(s.decks||[]).reduce((n,d)=>n+Number(d.cards?.[code]||0),0);
    const loaned=(s.loans||[]).filter(l=>!l.returnedAt&&l.cardCode===code).reduce((n,l)=>n+Number(l.qty||0),0);
    return Math.max(0,owned-decked-loaned);
  }
  function heroFor(t){return window.RiftboundPremades?.locate?.(t.hero)?.imageUrl||''}
  function analyze(t,s=readState()){
    const resolved=window.RiftboundPremades?.resolveTemplate?.(t)||{cards:{},missing:t.entries?.map(e=>e.locator)||[]};
    const remaining=new Map(catalog().map(c=>[c.cardCode,available(c.cardCode,s)]));
    const rows=Object.entries(resolved.cards).map(([code,needed])=>{
      const target=card(code),targetName=norm(target?.fullName||target?.name||code),targetType=norm(target?.cardType||'');
      const equivalents=catalog().filter(c=>norm(c.fullName||c.name||c.cardCode)===targetName&&norm(c.cardType||'')===targetType).map(c=>c.cardCode);
      const candidates=[code,...equivalents.filter(candidate=>candidate!==code)];
      const allocations={};let have=0;
      for(const candidate of candidates){
        const take=Math.min(Math.max(0,Number(remaining.get(candidate)||0)),Number(needed||0)-have);
        if(take>0){allocations[candidate]=take;remaining.set(candidate,Number(remaining.get(candidate)||0)-take);have+=take}
        if(have>=Number(needed||0))break;
      }
      return {code,needed:Number(needed||0),have,missing:Math.max(0,Number(needed||0)-have),allocations};
    });
    const total=rows.reduce((n,r)=>n+r.needed,0);
    const matched=rows.reduce((n,r)=>n+r.have,0);
    const missingCopies=rows.reduce((n,r)=>n+r.missing,0);
    return {template:t,resolved,rows,total,matched,missingCopies,percent:total?Math.round(matched/total*100):0,complete:total>0&&missingCopies===0&&!resolved.missing.length};
  }
  function ranked(s=readState()){
    return templates().map(t=>analyze(t,s)).sort((a,b)=>Number(b.complete)-Number(a.complete)||b.percent-a.percent||a.missingCopies-b.missingCopies||a.template.name.localeCompare(b.template.name));
  }
  function ensureButtons(){
    const newBtn=document.getElementById('newDeckBtn');if(!newBtn)return;
    let actions=newBtn.closest('.deck-heading-actions');
    if(!actions){actions=document.createElement('div');actions.className='deck-heading-actions';newBtn.parentNode.insertBefore(actions,newBtn);actions.appendChild(newBtn)}
    let premade=document.getElementById('premadeDeckBtn');
    if(!premade){premade=document.createElement('button');premade.id='premadeDeckBtn';premade.type='button';premade.textContent='Premade Decks';actions.insertBefore(premade,newBtn)}
    let recommended=document.getElementById('recommendedDeckBtn');
    if(!recommended){recommended=document.createElement('button');recommended.id='recommendedDeckBtn';recommended.type='button';recommended.textContent='Recommended Decks';actions.insertBefore(recommended,premade)}
    [newBtn,premade,recommended].forEach(btn=>{btn.classList.remove('ghost-btn');btn.classList.add('primary-btn','deck-action-btn')});
  }
  function ensureDialog(){
    let d=document.getElementById('recommendedDeckDialog');
    if(!d){d=document.createElement('dialog');d.id='recommendedDeckDialog';d.className='modal recommended-deck-dialog';document.body.appendChild(d)}
    return d;
  }
  function decorateDecks(){
    ensureButtons();const s=readState();
    document.querySelectorAll('#deckList .feature-list-card').forEach(deckCard=>{
      const id=deckCard.querySelector('[data-edit-deck]')?.dataset.editDeck,deck=(s.decks||[]).find(d=>d.id===id);
      if(deck?.recommended&&!deckCard.querySelector('.recommended-badge'))deckCard.querySelector('h3')?.insertAdjacentHTML('afterend',`<span class="recommended-badge">RECOMMENDED • ${deck.recommended.complete?'COMPLETE':'IN PROGRESS'}</span>`);
    });
  }
  function statusText(a){
    if(a.resolved.missing.length)return 'Catalog update needed';
    if(a.complete)return 'Ready to build';
    if(!a.matched)return 'No matching copies yet';
    return `${a.missingCopies} cards needed`;
  }
  function renderManager(selectedId='',message=''){
    const d=ensureDialog(),s=readState(),all=ranked(s),options=all.slice(0,OPTION_LIMIT);
    const selected=all.find(a=>a.template.id===selectedId)||options[0]||null;
    const availableTotal=Object.keys(s.inventory||{}).reduce((n,code)=>n+available(code,s),0);
    const optionHtml=options.map((a,index)=>{
      const t=a.template,img=heroFor(t);
      return `<button type="button" class="recommended-option ${selected?.template.id===t.id?'selected':''}" data-recommended-select="${esc(t.id)}"><span class="recommended-rank">${index+1}</span>${img?`<img src="${esc(img)}" alt="${esc(t.champion)}">`:''}<span class="recommended-option-copy"><small>${esc(t.set)}</small><strong>${esc(t.name)}</strong><span>${a.matched}/${a.total} cards available</span><span class="recommended-progress" role="progressbar" aria-label="${esc(t.name)} collection match" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${a.percent}"><i style="width:${a.percent}%"></i></span></span><b class="recommended-score ${a.complete?'complete':''}">${a.percent}%</b></button>`;
    }).join('');
    if(!selected){d.innerHTML='<div class="modal-inner"><div class="empty-state">Premade deck data is not available yet.</div></div>';return d}
    const t=selected.template,img=heroFor(t);
    const rows=selected.rows.map(r=>`<div class="recommended-card-line ${r.missing?'missing':'owned'}"><span>${esc(nameOf(r.code))}<small>${r.have} available of ${r.needed}</small></span><b>${r.missing?`Need ${r.missing}`:'Ready'}</b></div>`).join('');
    const catalogWarning=selected.resolved.missing.length?`<div class="recommended-warning">${selected.resolved.missing.length} cards from this list are not in the current catalog yet.</div>`:'';
    const emptyNotice=!availableTotal?'<div class="recommended-warning">Add cards to your vault first so recommendations can match your collection.</div>':'';
    const canStart=selected.matched>0&&!selected.resolved.missing.length;
    const actionLabel=selected.complete?'Build Complete Deck':`Start With ${selected.matched} Owned Cards`;
    d.innerHTML=`<div class="modal-inner recommended-manager"><div class="modal-head"><div><h2>Recommended Decks</h2><p>Best matches from your available collection. Cards already in decks or active loans are excluded.</p></div><button class="close-btn" type="button" data-recommended-close aria-label="Close recommended decks">×</button></div>${message?`<div class="recommended-success">${esc(message)}</div>`:''}${emptyNotice}<div class="recommended-layout"><section><div class="recommended-list-head"><span>Top ${options.length} matches</span><small>Ranked from ${all.length} official lists</small></div><div class="recommended-options">${optionHtml}</div></section><aside class="recommended-preview"><div class="recommended-preview-head">${img?`<img src="${esc(img)}" alt="${esc(t.champion)}">`:''}<div><small>${esc(t.set)}</small><h3>${esc(t.name)}</h3><p>${selected.matched} of ${selected.total} cards available</p></div><strong>${selected.percent}% match</strong></div><div class="recommended-summary"><span class="${selected.complete?'complete':''}">${esc(statusText(selected))}</span><small>${selected.complete?'Creates a complete deck and reserves the cards.':'Creates an editable in-progress deck using only copies you currently have.'}</small></div>${catalogWarning}<div class="recommended-card-list">${rows||'<div class="empty-state">No cards resolved.</div>'}</div><button class="primary-btn recommended-build-btn" type="button" data-recommended-build="${esc(t.id)}" ${canStart?'':'disabled'}>${esc(actionLabel)}</button></aside></div></div>`;
    return d;
  }
  function openManager(id=''){
    const d=renderManager(id);
    if(!d.open)d.showModal();
  }
  function buildRecommendation(id){
    const t=templates().find(x=>x.id===id);if(!t)return;
    const s=readState(),a=analyze(t,s);
    if(a.resolved.missing.length){renderManager(id,'This list needs a catalog update before it can be created.');return}
    const cards={};
    for(const r of a.rows){for(const [code,qty] of Object.entries(r.allocations||{}))cards[code]=(cards[code]||0)+qty}
    const total=Object.values(cards).reduce((n,q)=>n+Number(q||0),0);
    if(!total){renderManager(id,'No available copies from this list are in your vault yet.');return}
    const now=new Date().toISOString(),deck={
      id:uid(),
      name:`${t.champion} Recommended${a.complete?'':' (In Progress)'}`,
      champion:t.champion,
      notes:a.complete?`Recommended from your collection using the official ${t.set} list.`:`Recommended from your collection using the official ${t.set} list. Started with ${total}/${a.total} cards; edit this deck as you collect the rest.`,
      cards,
      createdAt:now,
      updatedAt:now,
      recommended:{templateId:t.id,set:t.set,complete:a.complete,matchedAtBuild:total,total:a.total,createdAt:now}
    };
    s.decks=s.decks||[];s.transactions=s.transactions||[];s.decks.push(deck);
    s.transactions.unshift({id:uid(),type:'activity',action:`Created recommended deck “${deck.name}”`,deckId:deck.id,at:now});
    saveState(s);
    window.RiftboundTheme?.play?.('success');
    renderManager('',`${deck.name} was added to your Decks tab.`);
  }

  document.addEventListener('click',e=>{
    if(e.target.closest('#recommendedDeckBtn')){openManager();return}
    if(e.target.closest('[data-recommended-close]')){document.getElementById('recommendedDeckDialog')?.close();return}
    const select=e.target.closest('[data-recommended-select]');if(select){renderManager(select.dataset.recommendedSelect);return}
    const build=e.target.closest('[data-recommended-build]');if(build){buildRecommendation(build.dataset.recommendedBuild);return}
  },true);

  window.addEventListener('riftbound-ui-render',e=>{if((e.detail?.scopes||[]).includes('decks'))setTimeout(decorateDecks,0)});
  window.addEventListener('riftbound-cloud-restored',()=>setTimeout(decorateDecks,80));
  function init(){decorateDecks();setTimeout(decorateDecks,400)}
  window.RiftboundRecommendations={open:openManager,ranked};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
