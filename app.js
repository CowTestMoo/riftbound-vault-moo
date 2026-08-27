'use strict';

const STORAGE_KEY = 'riftbound-vault-v2';
const PAGE_SIZE = 120;
const DOMAINS = ['Fury','Calm','Mind','Body','Chaos','Order'];
const TYPES = ['All','Legend','Unit','Rune','Spell','Gear','Battlefield','Token'];
let catalog = [];
let byCode = new Map();
let visibleCount = PAGE_SIZE;
let filters = {search:'',type:'All',domain:'All',set:'All',ownedOnly:false};
let state = loadState();

const $ = id => document.getElementById(id);
const qsa = (s,r=document) => [...r.querySelectorAll(s)];

function loadState(){
  try { return {inventory:{},decks:[],loans:[],transactions:[],...JSON.parse(localStorage.getItem(STORAGE_KEY)||'{}')}; }
  catch { return {inventory:{},decks:[],loans:[],transactions:[]}; }
}
function saveState(){ localStorage.setItem(STORAGE_KEY,JSON.stringify(state)); renderStats(); }
function esc(v=''){ return String(v).replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c])); }
function norm(v=''){ return String(v).toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g,''); }
function nameOf(c){ return c?.fullName || c?.name || c?.cardCode || 'Unknown card'; }
function owned(code){ return Number(state.inventory[code]?.owned||0); }
function decked(code){ return state.decks.reduce((s,d)=>s+Number(d.cards?.[code]||0),0); }
function loaned(code){ return state.loans.filter(l=>!l.returnedAt&&l.cardCode===code).reduce((s,l)=>s+Number(l.qty||0),0); }
function available(code){ return Math.max(0,owned(code)-decked(code)-loaned(code)); }
function uid(prefix='id'){ return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,8)}`; }

function adjustOwned(code,delta,reason='Manual adjustment'){
  const current=owned(code), minimum=decked(code)+loaned(code), next=Math.max(minimum,current+Number(delta||0));
  if(next===current) return;
  state.inventory[code]={...(state.inventory[code]||{}),owned:next};
  state.transactions.unshift({id:uid('txn'),cardCode:code,delta:next-current,reason,at:new Date().toISOString()});
  saveState(); renderAll();
}

function locationFor(card){
  const domain=DOMAINS.find(d=>(card.domains||[]).includes(d)) || (DOMAINS.includes(card.domain)?card.domain:'Unassigned');
  const i=DOMAINS.indexOf(domain);
  if(i<0) return {box:null,domain,bucket:'Unassigned',section:card.cardType||'Other'};
  const labels=(card.cardTypeLabels||[]).map(norm);
  const isChampion=labels.includes('champion');
  const isUnit=norm(card.cardType)==='unit'&&!isChampion;
  const box=i*2+(isUnit?1:2);
  const section=isUnit?`Energy ${Number(card.energy)>=6?'6+':(card.energy??'?')}`:(isChampion?'Champions':(card.cardType||'Other'));
  return {box,domain,bucket:isUnit?'Units':'Other',section};
}

async function loadCatalog(){
  try{
    $('catalogStatus').textContent='Loading Riftbound catalog...';
    const r=await fetch('./data/cards.json',{cache:'no-store'});
    if(!r.ok) throw new Error(`HTTP ${r.status}`);
    const data=await r.json();
    catalog=Array.isArray(data)?data:(data.cards||[]);
    if(catalog.length<100) throw new Error(`Only ${catalog.length} cards found`);
    catalog=catalog.map((c,i)=>({...c,cardCode:String(c.cardCode||c.code||c.id||`card-${i}`),fullName:c.fullName||c.name||c.cardCode||`Card ${i}`,cardSet:c.cardSet||c.setName||c.setCode||'Unknown',cardNumber:c.cardNumber||c.collectorNumber||'',cardType:c.cardType||c.type||'Unknown',domains:Array.isArray(c.domains)?c.domains:(c.domain?[c.domain]:[]),domain:c.domain||(Array.isArray(c.domains)?c.domains[0]:'Unassigned'),imageUrl:c.imageUrl||c.image_url||''}));
    byCode=new Map(catalog.map(c=>[c.cardCode,c]));
    $('catalogStatus').textContent=`${catalog.length.toLocaleString()} cards loaded`;
    renderAll();
  }catch(err){
    console.error(err);
    $('catalogStatus').textContent=`Catalog error: ${err.message}`;
    $('cardGrid').innerHTML='<div class="empty-state">The card catalog failed to load. The page itself is working, but the data request failed.</div>';
  }
}

function chip(v,active,kind){ return `<button class="filter-chip ${active?'active':''}" data-kind="${kind}" data-value="${esc(v)}">${esc(v)}</button>`; }
function renderFilters(){
  $('typeFilters').innerHTML=TYPES.map(v=>chip(v,filters.type===v,'type')).join('');
  $('domainFilters').innerHTML=['All',...DOMAINS].map(v=>chip(v,filters.domain===v,'domain')).join('');
  const sets=[...new Set(catalog.map(c=>c.cardSet).filter(Boolean))].sort((a,b)=>a.localeCompare(b));
  $('setFilters').innerHTML=['All',...sets].map(v=>chip(v,filters.set===v,'set')).join('');
}
function filteredCards(){
  const search=norm(filters.search);
  return catalog.filter(c=>{
    if(filters.ownedOnly&&owned(c.cardCode)<=0) return false;
    if(filters.type!=='All'&&norm(c.cardType)!==norm(filters.type)&&!(c.cardTypeLabels||[]).map(norm).includes(norm(filters.type))) return false;
    if(filters.domain!=='All'&&c.domain!==filters.domain&&!(c.domains||[]).includes(filters.domain)) return false;
    if(filters.set!=='All'&&c.cardSet!==filters.set) return false;
    if(search&&!norm([nameOf(c),c.cardSet,c.cardNumber,c.cardCode,c.cardType].join(' ')).includes(search)) return false;
    return true;
  });
}
function cardTile(c){
  const q=owned(c.cardCode);
  return `<button class="card-tile" data-card="${esc(c.cardCode)}"><div class="card-image-wrap">${c.imageUrl?`<img class="card-image" loading="lazy" src="${esc(c.imageUrl)}" alt="${esc(nameOf(c))}">`:`<div class="card-placeholder">${esc(nameOf(c))}</div>`}</div>${q?`<span class="qty-badge">×${q}</span>`:''}<div class="card-caption"><strong>${esc(nameOf(c))}</strong><small>${esc(c.cardSet)} ${esc(c.cardNumber)}</small></div></button>`;
}
function renderCards(){
  const cards=filteredCards(), shown=cards.slice(0,visibleCount);
  $('cardGrid').innerHTML=shown.length?shown.map(cardTile).join(''):'<div class="empty-state">No cards match these filters.</div>';
  $('loadMoreBtn').hidden=cards.length<=visibleCount;
}
function renderStats(){
  const codes=Object.keys(state.inventory);
  const total=codes.reduce((s,c)=>s+owned(c),0);
  const unique=codes.filter(c=>owned(c)>0).length;
  const d=state.decks.reduce((s,x)=>s+Object.values(x.cards||{}).reduce((a,b)=>a+Number(b||0),0),0);
  const l=state.loans.filter(x=>!x.returnedAt).reduce((s,x)=>s+Number(x.qty||0),0);
  $('statOwned').textContent=total; $('statUnique').textContent=unique; $('statDecks').textContent=d; $('statLoans').textContent=l; $('statAvailable').textContent=Math.max(0,total-d-l);
}
function renderStorage(){
  let html='';
  DOMAINS.forEach((domain,i)=>['Units','Other'].forEach((bucket,j)=>{
    const box=i*2+j+1;
    const cards=catalog.filter(c=>locationFor(c).box===box&&available(c.cardCode)>0);
    const count=cards.reduce((s,c)=>s+available(c.cardCode),0);
    html+=`<button class="storage-box" data-box="${box}"><div class="storage-top"><span class="storage-number">BOX ${String(box).padStart(2,'0')}</span><span class="storage-count">${count} cards</span></div><h3>${domain} ${bucket}</h3><p>${cards.length} unique cards</p></button>`;
  }));
  $('storageGrid').innerHTML=html;
}
function renderDecks(){ $('deckList').innerHTML=state.decks.length?state.decks.map(d=>`<div class="list-card"><h3>${esc(d.name)}</h3></div>`).join(''):'<div class="empty-state">No decks yet.</div>'; }
function renderLoans(){ $('loanList').innerHTML=state.loans.filter(l=>!l.returnedAt).length?state.loans.filter(l=>!l.returnedAt).map(l=>`<div class="list-card"><h3>${esc(l.borrower)}</h3><p>${esc(nameOf(byCode.get(l.cardCode)||{cardCode:l.cardCode}))} ×${l.qty}</p></div>`).join(''):'<div class="empty-state">Nothing is currently loaned out.</div>'; }
function renderAll(){ renderFilters(); renderCards(); renderStats(); renderStorage(); renderDecks(); renderLoans(); }

function showCard(code){
  const c=byCode.get(code); if(!c) return;
  const loc=locationFor(c);
  $('cardDialog').innerHTML=`<div class="modal-inner"><div class="modal-head"><h2>${esc(nameOf(c))}</h2><button class="close-btn" data-close="cardDialog">×</button></div><div class="detail-layout"><div>${c.imageUrl?`<img class="detail-image" src="${esc(c.imageUrl)}" alt="${esc(nameOf(c))}">`:'<div class="detail-image card-placeholder">No image</div>'}</div><div><div class="detail-meta">${esc(c.cardSet)} • ${esc(c.cardType)} • ${esc((c.domains||[]).join(' / '))}</div><div class="info-grid"><div class="info-cell"><strong>${owned(code)}</strong><small>Total owned</small></div><div class="info-cell"><strong>${available(code)}</strong><small>Available</small></div><div class="info-cell"><strong>${decked(code)}</strong><small>In decks</small></div><div class="info-cell"><strong>${loaned(code)}</strong><small>Loaned</small></div></div><div class="location-callout"><strong>Store in:</strong><br>${loc.box?`Box ${loc.box} • ${esc(loc.domain)} ${esc(loc.bucket)} • ${esc(loc.section)}`:'Unassigned'}</div><div class="modal-actions"><button class="primary-btn" data-adjust="1" data-code="${esc(code)}">+1</button><button class="primary-btn" data-adjust="4" data-code="${esc(code)}">+4</button><button class="primary-btn" data-adjust="10" data-code="${esc(code)}">+10</button><button class="ghost-btn" data-adjust="-1" data-code="${esc(code)}">−1</button></div></div></div></div>`;
  $('cardDialog').showModal();
}
function showBox(box){
  const cards=catalog.filter(c=>locationFor(c).box===box&&available(c.cardCode)>0);
  $('storageDialog').innerHTML=`<div class="modal-inner"><div class="modal-head"><h2>Box ${box}</h2><button class="close-btn" data-close="storageDialog">×</button></div>${cards.length?`<div class="card-lines">${cards.map(c=>`<div class="card-line"><span>${esc(locationFor(c).section)} • ${esc(nameOf(c))}</span><strong>×${available(c.cardCode)}</strong></div>`).join('')}</div>`:'<div class="empty-state">No cards here yet.</div>'}</div>`;
  $('storageDialog').showModal();
}
function openBulk(){
  $('bulkDialog').innerHTML=`<div class="modal-inner"><div class="modal-head"><h2>Bulk Add</h2><button class="close-btn" data-close="bulkDialog">×</button></div><div class="search-wrap"><input id="bulkSearch" placeholder="Search card"></div><div id="bulkResults" class="bulk-results"></div></div>`;
  $('bulkDialog').showModal(); renderBulk('');
}
function renderBulk(text){
  if(!$('bulkResults')) return;
  const matches=catalog.filter(c=>norm(nameOf(c)).includes(norm(text))).slice(0,60);
  $('bulkResults').innerHTML=matches.map(c=>`<div class="bulk-row"><div>${c.imageUrl?`<img src="${esc(c.imageUrl)}" alt="">`:''}</div><div><strong>${esc(nameOf(c))}</strong><br><small>Owned ${owned(c.cardCode)}</small></div><div class="bulk-buttons"><button data-bulk="1" data-code="${esc(c.cardCode)}">+1</button><button data-bulk="4" data-code="${esc(c.cardCode)}">+4</button><button data-bulk="10" data-code="${esc(c.cardCode)}">+10</button></div></div>`).join('');
}
function switchTab(tab){ qsa('.tab').forEach(b=>b.classList.toggle('active',b.dataset.tab===tab)); qsa('.view').forEach(v=>v.classList.remove('active')); $(`${tab}View`)?.classList.add('active'); }
function exportBackup(){ const b=new Blob([JSON.stringify({version:2,exportedAt:new Date().toISOString(),state},null,2)],{type:'application/json'}); const a=document.createElement('a'); a.href=URL.createObjectURL(b); a.download=`riftbound-vault-backup-${new Date().toISOString().slice(0,10)}.json`; a.click(); }

function wireEvents(){
  document.addEventListener('click',e=>{
    let x;
    if(x=e.target.closest('.tab')) return switchTab(x.dataset.tab);
    if(x=e.target.closest('.filter-chip')){ filters[x.dataset.kind]=x.dataset.value; visibleCount=PAGE_SIZE; renderFilters(); return renderCards(); }
    if(x=e.target.closest('[data-card]')) return showCard(x.dataset.card);
    if(x=e.target.closest('[data-close]')) return $(x.dataset.close)?.close();
    if(x=e.target.closest('[data-adjust]')){ const code=x.dataset.code; adjustOwned(code,Number(x.dataset.adjust)); return showCard(code); }
    if(x=e.target.closest('[data-box]')) return showBox(Number(x.dataset.box));
    if(x=e.target.closest('[data-bulk]')){ adjustOwned(x.dataset.code,Number(x.dataset.bulk),'Bulk entry'); return renderBulk($('bulkSearch')?.value||''); }
  });
  $('cardSearch').addEventListener('input',e=>{ filters.search=e.target.value; visibleCount=PAGE_SIZE; renderCards(); });
  $('ownedOnly').addEventListener('change',e=>{ filters.ownedOnly=e.target.checked; renderCards(); });
  $('bulkAddBtn').addEventListener('click',openBulk);
  $('newDeckBtn').addEventListener('click',()=>alert('Deck editor is the next build step after the gallery is stable.'));
  $('newLoanBtn').addEventListener('click',()=>alert('Loan tracking is the next build step after the gallery is stable.'));
  $('loadMoreBtn').addEventListener('click',()=>{ visibleCount+=PAGE_SIZE; renderCards(); });
  $('exportBtn').addEventListener('click',exportBackup);
  document.addEventListener('input',e=>{ if(e.target.id==='bulkSearch') renderBulk(e.target.value); });
}

document.addEventListener('DOMContentLoaded',()=>{
  try{
    wireEvents();
    renderFilters(); renderStats(); renderStorage(); renderDecks(); renderLoans();
    loadCatalog();
  }catch(err){
    console.error(err);
    $('catalogStatus').textContent=`App error: ${err.message}`;
  }
});
