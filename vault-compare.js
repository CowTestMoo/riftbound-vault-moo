(() => {
  'use strict';

  const APP_KEY='riftbound-vault-v2';
  let catalogRef=null,catalogMap=new Map();

  const esc=(v='')=>String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const uid=(p='id')=>`${p}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,9)}`;
  const readState=()=>{try{return JSON.parse(localStorage.getItem(APP_KEY)||'{}')}catch{return {}}};
  const catalog=()=>window.RiftboundApp?.getCatalog?.()||[];
  function cards(){const c=catalog();if(c!==catalogRef){catalogRef=c;catalogMap=new Map(c.map(x=>[x.cardCode,x]))}return catalogMap}
  const nameOf=c=>c?.fullName||c?.name||c?.cardCode||'Unknown card';
  const money=n=>Number(n||0).toLocaleString(undefined,{style:'currency',currency:'USD',maximumFractionDigits:2});

  function selected(){return window.RiftboundSocial?.getSelected?.()||null}
  function price(code,state){return Math.max(0,Number(state?.prices?.[code]?.market||0))}

  function comparison(){
    const sel=selected();if(!sel)return null;
    const own=readState(),lib=sel.library||{},map=cards();
    const give=[];
    for(const [code,w] of Object.entries(lib.wishlist||{})){
      const available=Math.max(0,Number(window.RiftboundApp?.available?.(code)||0));
      const wanted=Math.max(1,Number(w?.qty||1));
      const qty=Math.min(available,wanted);if(qty<=0)continue;
      const card=map.get(code);give.push({side:'give',code,qty,available,wanted,priority:String(w?.priority||'Normal'),card,value:price(code,own)*qty});
    }
    const receive=[];
    for(const [code,w] of Object.entries(own.wishlist||{})){
      const theirOwned=Math.max(0,Number(lib.cards?.[code]||0));
      const wanted=Math.max(1,Number(w?.qty||1));
      const qty=Math.min(theirOwned,wanted);if(qty<=0)continue;
      const card=map.get(code);receive.push({side:'receive',code,qty,theirOwned,wanted,priority:String(w?.priority||'Normal'),card,value:price(code,own)*qty});
    }
    const rank=v=>({high:0,urgent:0,normal:1,medium:1,low:2}[String(v||'').toLowerCase()]??1);
    const sort=(a,b)=>rank(a.priority)-rank(b.priority)||nameOf(a.card||{cardCode:a.code}).localeCompare(nameOf(b.card||{cardCode:b.code}));
    give.sort(sort);receive.sort(sort);
    return{sel,own,give,receive};
  }

  function ensureButton(){
    const screen=document.getElementById('friendLibraryScreen'),body=document.getElementById('friendLibraryBody');
    if(!screen||screen.hidden||!body||body.hidden||!selected())return;
    const header=screen.querySelector('.friend-header');if(!header)return;
    let actions=header.querySelector('.friend-header-actions');
    if(!actions){actions=document.createElement('div');actions.className='friend-header-actions';header.appendChild(actions)}
    let btn=document.getElementById('compareVaultsBtn');
    if(!btn){btn=document.createElement('button');btn.id='compareVaultsBtn';btn.type='button';btn.className='ghost-btn compare-vaults-btn';btn.innerHTML='<b>⇄</b> Compare Vaults';actions.prepend(btn)}
  }

  function ensureDialog(){
    let d=document.getElementById('vaultCompareDialog');if(d)return d;
    d=document.createElement('dialog');d.id='vaultCompareDialog';d.className='modal vault-compare-dialog';document.body.appendChild(d);return d;
  }

  function row(x){
    const c=x.card,name=nameOf(c||{cardCode:x.code}),meta=x.side==='give'?`${x.available} available • they want ${x.wanted}`:`they own ${x.theirOwned} • you want ${x.wanted}`;
    return `<label class="vault-match-row"><input type="checkbox" data-compare-pick="${x.side}" data-code="${esc(x.code)}" data-qty="${x.qty}" checked>${c?.imageUrl?`<img src="${esc(c.imageUrl)}" alt="">`:'<span class="vault-match-placeholder">✦</span>'}<span class="vault-match-copy"><strong>${esc(name)}</strong><small>${esc(c?.cardSet||x.code)} ${esc(c?.cardNumber||'')} • ${esc(meta)}</small><em>${esc(x.priority)} priority${x.value?` • ${money(x.value)}`:''}</em></span><b class="vault-match-qty">×${x.qty}</b></label>`;
  }

  function updateDraftButton(){
    const btn=document.getElementById('compareDraftBtn');if(!btn)return;
    const n=document.querySelectorAll('#vaultCompareDialog [data-compare-pick]:checked').length;
    btn.disabled=n===0;btn.textContent=n?`Draft Selected Trade (${n})`:'Select Matches';
  }

  function openCompare(){
    const data=comparison();if(!data)return;
    const d=ensureDialog(),username=data.sel.profile?.username||'friend';
    const giveCopies=data.give.reduce((n,x)=>n+x.qty,0),receiveCopies=data.receive.reduce((n,x)=>n+x.qty,0);
    d.innerHTML=`<div class="modal-inner vault-compare-inner"><div class="modal-head"><div><small class="vault-compare-kicker">TRADE MATCHER</small><h2>Compare with @${esc(username)}</h2><p class="vault-compare-sub">Matches use your available copies and both public wishlists.</p></div><button class="close-btn" type="button" data-compare-close>×</button></div><div class="vault-compare-summary"><div><strong>${data.give.length}</strong><span>matches you can offer</span><small>${giveCopies} possible copies</small></div><div><strong>${data.receive.length}</strong><span>matches they own for you</span><small>${receiveCopies} possible copies</small></div></div><div class="vault-compare-columns"><section><div class="vault-compare-section-head"><div><small>YOU → @${esc(username)}</small><h3>You Have, They Want</h3></div><span>${data.give.length}</span></div><div class="vault-match-list">${data.give.length?data.give.map(row).join(''):'<div class="vault-compare-empty">You do not currently have any available cards on their wishlist.</div>'}</div></section><section><div class="vault-compare-section-head"><div><small>@${esc(username)} → YOU</small><h3>They Have, You Want</h3></div><span>${data.receive.length}</span></div><div class="vault-match-list">${data.receive.length?data.receive.map(row).join(''):'<div class="vault-compare-empty">They do not currently own any cards on your wishlist.</div>'}</div></section></div><p class="vault-compare-note">Public libraries show owned totals and shared decks, but never loans or private account details. Confirm current availability before completing a trade.</p><div class="vault-compare-actions"><button class="ghost-btn" type="button" data-compare-close>Close</button><button class="primary-btn" id="compareDraftBtn" type="button">Draft Selected Trade (${data.give.length+data.receive.length})</button></div></div>`;
    d.showModal();updateDraftButton();
  }

  function buildDraft(){
    const data=comparison();if(!data)return;
    const picks=[...document.querySelectorAll('#vaultCompareDialog [data-compare-pick]:checked')];if(!picks.length)return;
    const give={},receive={};
    for(const x of picks){const target=x.dataset.comparePick==='give'?give:receive;target[x.dataset.code]=Math.max(1,Number(x.dataset.qty||1))}
    const s=readState();s.trades=Array.isArray(s.trades)?s.trades:[];s.transactions=Array.isArray(s.transactions)?s.transactions:[];
    const username=data.sel.profile?.username||'friend',id=uid('trade'),now=new Date().toISOString();
    s.trades.unshift({id,name:`Trade with @${username}`,partner:`@${username}`,notes:'Created from Compare Vaults. Confirm the other vault’s current availability before completing.',give,receive,status:'Draft',createdAt:now,updatedAt:now});
    s.transactions.unshift({id:uid('evt'),type:'activity',action:`Created matched trade draft with @${username}`,tradeId:id,at:now});
    localStorage.setItem(APP_KEY,JSON.stringify(s));window.RiftboundApp?.reloadState?.();window.RiftboundCloud?.syncNow?.();
    document.getElementById('vaultCompareDialog')?.close();
    window.RiftboundProfileSwitching?.returnToOwnVault?.();
    setTimeout(()=>{
      document.querySelector('.tab[data-tab="tools"]')?.click();
      setTimeout(()=>{
        document.querySelector('.tool-subtabs [data-tool="trades"]')?.click();
        setTimeout(()=>document.querySelector(`[data-edit-trade="${CSS.escape(id)}"]`)?.click(),40);
      },20);
    },430);
  }

  document.addEventListener('click',e=>{
    if(e.target.closest('#compareVaultsBtn'))return openCompare();
    if(e.target.closest('[data-compare-close]'))return document.getElementById('vaultCompareDialog')?.close();
    if(e.target.closest('#compareDraftBtn'))return buildDraft();
  });
  document.addEventListener('change',e=>{if(e.target.matches('#vaultCompareDialog [data-compare-pick]'))updateDraftButton()});
  window.addEventListener('riftbound-friend-render',()=>setTimeout(ensureButton,0));
  window.addEventListener('riftbound-social-ready',()=>setTimeout(ensureButton,40));
  window.addEventListener('riftbound-auth-storage-change',()=>setTimeout(ensureButton,80));

  function init(){setTimeout(ensureButton,150)}
  window.RiftboundCompare={open:openCompare,compare:comparison};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
