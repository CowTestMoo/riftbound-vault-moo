(() => {
  'use strict';

  const reduce=window.matchMedia('(prefers-reduced-motion: reduce)');
  const labels={
    tools:'VAULT NODE // TOOLS',scanner:'OPTIC TRACE // ACTIVE',values:'MARKET FEED // LINKED',wishlist:'TARGET LIST // OPEN',trades:'TRADE MATRIX // OPEN',activity:'AUDIT TRACE // OPEN',
    cards:'CATALOG NODE // LINKED',storage:'STORAGE MAP // LINKED',decks:'DECK MATRIX // LINKED',loans:'LOAN TRACE // LINKED',libraries:'REMOTE VAULT // HANDSHAKE',settings:'SYSTEM CONFIG // OPEN'
  };
  let timer=0,lastBurst=0;

  function isNeon(){return document.body?.dataset?.vaultTheme==='neon'}
  function ensureOverlay(){
    let root=document.getElementById('neonFxOverlay');if(root)return root;
    root=document.createElement('div');root.id='neonFxOverlay';root.setAttribute('aria-hidden','true');
    root.innerHTML='<i class="neon-fx-scan"></i><span class="neon-fx-label"></span><i class="neon-fx-tear"></i><i class="neon-fx-tear"></i><i class="neon-fx-tear"></i><i class="neon-fx-block"></i><i class="neon-fx-block"></i>';
    document.body.appendChild(root);return root;
  }

  function burst(label='DATA LINK // ACCEPTED',strength=1){
    if(!isNeon()||reduce.matches)return;
    const now=performance.now();if(now-lastBurst<180)return;lastBurst=now;
    const root=ensureOverlay(),tears=[...root.querySelectorAll('.neon-fx-tear')],blocks=[...root.querySelectorAll('.neon-fx-block')];
    root.querySelector('.neon-fx-label').textContent=label;
    tears.forEach((x,i)=>{x.style.top=`${18+Math.random()*68}%`;x.style.height=`${3+Math.random()*8}px`;x.style.animationDelay=`${i*22}ms`});
    blocks.forEach(x=>{x.style.left=`${6+Math.random()*80}%`;x.style.top=`${8+Math.random()*76}%`;x.style.width=`${40+Math.random()*130}px`;x.style.height=`${18+Math.random()*46}px`;x.style.opacity=String(.35+.35*Math.random())});
    root.style.setProperty('--neon-fx-strength',String(Math.max(.5,Math.min(1.3,strength))));
    root.classList.remove('neon-fx-active');void root.offsetWidth;root.classList.add('neon-fx-active');
    clearTimeout(timer);timer=setTimeout(()=>root.classList.remove('neon-fx-active'),620);
  }

  function cardHit(tile){
    if(!isNeon()||reduce.matches||!tile)return;tile.classList.remove('neon-data-hit');void tile.offsetWidth;tile.classList.add('neon-data-hit');setTimeout(()=>tile.classList.remove('neon-data-hit'),340)
  }

  function labelFor(el){
    const tool=el.closest?.('[data-tool]')?.dataset.tool;if(tool)return labels[tool]||'SUBSYSTEM // OPEN';
    const tab=el.closest?.('[data-tab]')?.dataset.tab||el.closest?.('[data-mobile-tab]')?.dataset.mobileTab;if(tab)return labels[tab]||'NODE // LINKED';
    if(el.closest?.('#mobileToolsCenterBtn'))return labels.tools;
    if(el.closest?.('#browseLibrariesUtilityBtn'))return labels.libraries;
    if(el.closest?.('#uxSettingsBtn'))return labels.settings;
    if(el.closest?.('#scannerFile'))return labels.scanner;
    if(el.closest?.('[data-scan-add]'))return 'SCAN MATCH // COMMITTED';
    if(el.closest?.('[data-adjust],[data-fast-bulk],[data-bulk]'))return 'INVENTORY // WRITE';
    if(el.closest?.('#compareVaultsBtn'))return 'VAULT DIFF // RUNNING';
    if(el.closest?.('#compareDraftBtn'))return 'TRADE ROUTE // COMPILED';
    return'';
  }

  document.addEventListener('click',e=>{
    if(!isNeon())return;
    const tile=e.target.closest?.('.card-tile[data-card]');if(tile){cardHit(tile);return}
    const label=labelFor(e.target);if(label)burst(label,label.includes('SCAN')||label.includes('TRADE')?1.15:.9);
  },true);

  window.addEventListener('riftbound-tool-render',e=>{const tool=e.detail?.tool;if(tool&&tool!=='wishlist')burst(labels[tool]||'SUBSYSTEM // OPEN',.72)});
  window.addEventListener('riftbound-friend-render',()=>burst('REMOTE VAULT // DECRYPTED',1.05));
  window.addEventListener('riftbound-cloud-restored',()=>{if(isNeon())setTimeout(()=>burst('CLOUD STATE // SYNCED',.62),120)});
  window.addEventListener('riftbound-prices-loaded',()=>{if(isNeon())setTimeout(()=>burst('MARKET FEED // REFRESHED',.58),80)});

  function syncTheme(){if(isNeon()&&!reduce.matches)setTimeout(()=>burst('NEURAL LINK // ONLINE',1.2),140)}
  const observer=new MutationObserver(syncTheme);observer.observe(document.body,{attributes:true,attributeFilter:['data-vault-theme']});

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',ensureOverlay,{once:true});else ensureOverlay();
  window.RiftboundNeonFx={burst};
})();
