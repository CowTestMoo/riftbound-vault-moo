(() => {
  'use strict';

  const APP_KEY='riftbound-vault-v2';
  const UX_KEY='riftbound-vault-ux-v1';
  const LEGACY_DECK_PRIVACY_SELECTORS='[data-deck-share],[data-deck-public],[data-deck-private],[data-deck-visibility],#deckShareToggle,#deckPublicToggle,#deckPrivateToggle,#deckVisibilitySelect,#deckVisibility,.deck-share-setting,.deck-public-setting,.deck-private-setting,.deck-privacy-setting,.deck-visibility-setting';
  let screenRefreshFrame=0,recentRefreshFrame=0,recentObserver=null,libraryObserver=null,catalogRef=null,catalogMap=new Map();

  const esc=(value='')=>String(value).replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const readJson=(key,fallback={})=>{try{return JSON.parse(localStorage.getItem(key)||'')||fallback}catch{return fallback}};
  function catalogByCode(){const catalog=window.RiftboundApp?.getCatalog?.()||[];if(catalog!==catalogRef){catalogRef=catalog;catalogMap=new Map(catalog.map(card=>[card.cardCode,card]))}return catalogMap}
  function syncLibraryScrollLock(){document.documentElement.classList.toggle('friend-library-open-root',document.body.classList.contains('friend-library-open'))}
  function stripLegacyDeckPrivacyControls(root=document){root.querySelectorAll?.(LEGACY_DECK_PRIVACY_SELECTORS).forEach(element=>(element.closest('.setting-row,.feature-form-grid>label,.feature-editor>label,label')||element).remove())}
  function removeTradingUi(){
    document.querySelectorAll('[data-tool="trades"]').forEach(button=>button.remove());
    const heading=document.querySelector('#toolsView .section-heading p');if(heading)heading.textContent='Wishlist, history, camera assist, and collection values.';
    const dialog=document.getElementById('tradeDialog');if(dialog){if(dialog.open)dialog.close();dialog.remove()}
    if(document.querySelector('#newTradeBtn,.trade-list,.trade-editor-columns'))document.querySelector('[data-tool="wishlist"]')?.click();
  }
  function recentCutoff(){return Number(readJson(UX_KEY,{}).recentClearedAt||0)}
  function positiveRecentTransactions(){const cutoff=recentCutoff(),state=readJson(APP_KEY,{transactions:[]});return (Array.isArray(state.transactions)?state.transactions:[]).filter(t=>Number(t?.delta)>0&&Date.parse(t?.at||0)>cutoff).slice(0,8)}
  function renderRecentPanel(){
    const panel=document.querySelector('#collectionDashboard .recent-panel'),head=panel?.querySelector('.dashboard-head'),strip=panel?.querySelector('.recent-strip');if(!head||!strip)return;
    let button=head.querySelector('#clearRecentBtn');if(!button){button=document.createElement('button');button.id='clearRecentBtn';button.type='button';button.className='clear-recent-btn';button.textContent='Clear';head.appendChild(button)}
    const tx=positiveRecentTransactions(),map=catalogByCode();
    const html=tx.length?tx.map(t=>{const card=map.get(t.cardCode),title=card?.fullName||card?.name||t.cardCode||'Unknown card';return `<button class="recent-card" type="button" data-recent-card="${esc(t.cardCode||'')}">${card?.imageUrl?`<img src="${esc(card.imageUrl)}" alt="">`:''}<span><strong>${esc(title)}</strong><small>+${Number(t.delta)||0} added</small></span></button>`}).join(''):'<div class="recent-empty">Cards you add will appear here.</div>';
    if(strip.innerHTML!==html)strip.innerHTML=html;button.disabled=!tx.length;
  }
  function clearRecentlyAdded(){const ux=readJson(UX_KEY,{});ux.recentClearedAt=Date.now();localStorage.setItem(UX_KEY,JSON.stringify(ux));renderRecentPanel()}
  function queueScreenRefresh(){if(screenRefreshFrame)return;screenRefreshFrame=requestAnimationFrame(()=>{screenRefreshFrame=0;syncLibraryScrollLock();stripLegacyDeckPrivacyControls()})}
  function queueRecentRefresh(){if(recentRefreshFrame)return;recentRefreshFrame=requestAnimationFrame(()=>{recentRefreshFrame=0;renderRecentPanel()})}
  function wireObservers(){
    const screen=document.getElementById('friendLibraryScreen');if(screen&&!libraryObserver){libraryObserver=new MutationObserver(queueScreenRefresh);libraryObserver.observe(screen,{childList:true,subtree:true})}
    const dashboard=document.getElementById('collectionDashboard');if(dashboard&&!recentObserver){recentObserver=new MutationObserver(queueRecentRefresh);recentObserver.observe(dashboard,{childList:true,subtree:true})}
  }

  document.addEventListener('click',event=>{
    if(event.target.closest('#clearRecentBtn')){clearRecentlyAdded();return}
    if(event.target.closest('[data-friend-user]')){const theme=window.RiftboundTheme?.getTheme?.();if(theme==='neon')window.RiftboundNeonAudio?.transition?.();else window.RiftboundCosmicAudio?.transition?.()}
    if(event.target.closest('#browseLibrariesUtilityBtn'))setTimeout(queueScreenRefresh,0);
  },true);
  window.addEventListener('riftbound-social-ready',()=>{wireObservers();stripLegacyDeckPrivacyControls();queueScreenRefresh()});
  window.addEventListener('riftbound-friend-render',queueScreenRefresh);
  window.addEventListener('riftbound-tool-render',removeTradingUi);
  window.addEventListener('riftbound-ui-render',queueRecentRefresh);
  window.addEventListener('riftbound-local-change',event=>{if(event.detail?.key===APP_KEY){queueRecentRefresh();stripLegacyDeckPrivacyControls()}});

  function init(){syncLibraryScrollLock();wireObservers();stripLegacyDeckPrivacyControls();removeTradingUi();renderRecentPanel()}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
