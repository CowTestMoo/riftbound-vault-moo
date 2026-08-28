'use strict';

const STORAGE_KEY = 'riftbound-vault-v2';
const PAGE_SIZE = 60;
const DOMAINS = ['Fury','Calm','Mind','Body','Chaos','Order'];
const TYPES = ['All','Legend','Unit','Rune','Spell','Gear','Battlefield','Token'];
let catalog = [];
let byCode = new Map();
let visibleCount = PAGE_SIZE;
let filters = {search:'',type:'All',domain:'All',set:'All',ownedOnly:false};
let state = loadState();
let renderSignalFrame=0;
const renderSignalScopes=new Set();

const $ = id => document.getElementById(id);
const qsa = (s,r=document) => [...r.querySelectorAll(s)];

function signalUi(scope){
  if(scope)renderSignalScopes.add(scope);
  if(renderSignalFrame)return;
  renderSignalFrame=requestAnimationFrame(()=>{
    renderSignalFrame=0;
    const scopes=[...renderSignalScopes];renderSignalScopes.clear();
    window.dispatchEvent(new CustomEvent('riftbound-ui-render',{detail:{scopes}}));
  });
}

function defaultStorageBoxes(){
  return DOMAINS.flatMap((domain,i)=>[
    {id:`box-${i*2+1}`,name:`Box ${i*2+1}`,domains:[domain],rule:'Units'},
    {id:`box-${i*2+2}`,name:`Box ${i*2+2}`,domains:[domain],rule:'Other'}
  ]);
}
function normalizeStorageBoxes(value){
  if(!Array.isArray(value)) return defaultStorageBoxes();
  return value.map((box,i)=>({
    id:String(box?.id||`box-${i+1}-${Math.random().toString(36).slice(2,6)}`),
    name:String(box?.name||`Box ${i+1}`),
    domains:Array.isArray(box?.domains)?box.domains.filter(d=>DOMAINS.includes(d)):[],
    rule:['All','Units','Other','Champions','Spells','Gear','Runes','Battlefields','Tokens'].includes(box?.rule)?box.rule:'All'
  }));
}
function loadState(){
  try {
    const parsed=JSON.parse(localStorage.getItem(STORAGE_KEY)||'{}');
    return {inventory:{},decks:[],loans:[],transactions:[],...parsed,storageBoxes:normalizeStorageBoxes(parsed.storageBoxes)};
  }
  catch { return {inventory:{},decks:[],loans:[],transactions:[],storageBoxes:defaultStorageBoxes()}; }
}
function saveState(){ localStorage.setItem(STORAGE_KEY,JSON.stringify(state)); signalUi('state'); renderStats(); }
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

function cardDomain(card){
  return DOMAINS.find(d=>(card.domains||[]).includes(d)) || (DOMAINS.includes(card.domain)?card.domain:'Unassigned');
}
function cardStorageClass(card){
  const labels=(card.cardTypeLabels||[]).map(norm);
  const isChampion=labels.includes('champion');
  const type=norm(card.cardType);
  const isUnit=type==='unit'&&!isChampion;
  if(isUnit) return 'Units';
  if(isChampion) return 'Champions';
  if(type==='spell') return 'Spells';
  if(type==='gear') return 'Gear';
  if(type==='rune') return 'Runes';
  if(type==='battlefield') return 'Battlefields';
  if(type==='token') return 'Tokens';
  return 'Other';
}
function storageRuleMatches(box,card){
  const domain=cardDomain(card);
  const domainMatch=!box.domains?.length||box.domains.includes(domain);
  if(!domainMatch) return false;
  const cls=cardStorageClass(card);
  if(box.rule==='All') return true;
  if(box.rule==='Other') return cls!=='Units';
  return box.rule===cls;
}
function sectionFor(card){
  const cls=cardStorageClass(card);
  if(cls==='Units') return `Energy ${Number(card.energy)>=6?'6+':(card.energy??'?')}`;
  return cls;
}
function locationFor(card){
  const domain=cardDomain(card);
  const boxes=normalizeStorageBoxes(state.storageBoxes);
  const index=boxes.findIndex(box=>storageRuleMatches(box,card));
  if(index<0) return {box:null,boxId:null,boxName:'Unassigned',domain,bucket:'Unassigned',section:sectionFor(card)};
  const box=boxes[index];
  return {box:index+1,boxId:box.id,boxName:box.name,domain,bucket:box.rule,section:sectionFor(card)};
}
function describeStorageBox(box){
  const domainText=box.domains?.length?box.domains.join(' + '):'Any domain';
  const ruleText=box.rule==='All'?'All cards':box.rule==='Other'?'Non-unit cards':box.rule;
  return `${domainText} • ${ruleText}`;
}

async function loadCatalog(){
  try{
    $('catalogStatus').textContent='Loading Riftbound catalog...';
    const r=await fetch('./data/cards.json',{cache:'default'});
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
    signalUi('cards');
  }
}

function chip(v,active,kind){ return `<button class="filter-chip ${active?'active':''}" data-kind="${kind}" data-value="${esc(v)}">${esc(v)}</button>`; }
function renderFilters(){
  $('typeFilters').innerHTML=TYPES.map(v=>chip(v,filters.type===v,'type')).join('');
  $('domainFilters').innerHTML=['All',...DOMAINS].map(v=>chip(v,filters.domain===v,'domain')).join('');
  const sets=[...new Set(catalog.map(c=>c.cardSet).filter(Boolean))].sort((a,b)=>a.localeCompare(b));
  $('setFilters').innerHTML=['All',...sets].map(v=>chip(v,filters.set===v,'set')).join('');
  signalUi('filters');
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
  return `<button class="card-tile" data-card="${esc(c.cardCode)}"><div class="card-image-wrap">${c.imageUrl?`<img class="card-image" loading="lazy" decoding="async" fetchpriority="low" src="${esc(c.imageUrl)}" alt="${esc(nameOf(c))}">`:`<div class="card-placeholder">${esc(nameOf(c))}</div>`}</div>${q?`<span class="qty-badge">×${q}</span>`:''}<div class="card-caption"><strong>${esc(nameOf(c))}</strong><small>${esc(c.cardSet)} ${esc(c.cardNumber)}</small></div></button>`;
}
function renderCards(){
  const cards=filteredCards(), shown=cards.slice(0,visibleCount);
  $('cardGrid').innerHTML=shown.length?shown.map(cardTile).join(''):'<div class="empty-state">No cards match these filters.</div>';
  $('loadMoreBtn').hidden=cards.length<=visibleCount;
  signalUi('cards');
}
function renderStats(){
  const codes=Object.keys(state.inventory);
  const total=codes.reduce((s,c)=>s+owned(c),0);
  const unique=codes.filter(c=>owned(c)>0).length;
  const d=state.decks.reduce((s,x)=>s+Object.values(x.cards||{}).reduce((a,b)=>a+Number(b||0),0),0);
  const l=state.loans.filter(x=>!x.returnedAt).reduce((s,x)=>s+Number(x.qty||0),0);
  $('statOwned').textContent=total; $('statUnique').textContent=unique; $('statDecks').textContent=d; $('statLoans').textContent=l; $('statAvailable').textContent=Math.max(0,total-d-l);
  signalUi('stats');
}
function renderStorage(){
  const boxes=normalizeStorageBoxes(state.storageBoxes);
  let html='';
  boxes.forEach((box,i)=>{
    const cards=catalog.filter(c=>locationFor(c).boxId===box.id&&available(c.cardCode)>0);
    const count=cards.reduce((s,c)=>s+available(c.cardCode),0);
    html+=`<button class="storage-box" data-box="${esc(box.id)}"><div class="storage-top"><span class="storage-number">POSITION ${String(i+1).padStart(2,'0')}</span><span class="storage-count">${count} cards</span></div><h3>${esc(box.name)}</h3><p>${esc(describeStorageBox(box))}</p><small>${cards.length} unique cards</small></button>`;
  });
  $('storageGrid').innerHTML=html||'<div class="empty-state">No storage boxes configured yet. Use Customize Storage to add one.</div>';
  signalUi('storage');
}
function renderDecks(){ $('deckList').innerHTML=state.decks.length?state.decks.map(d=>`<div class="list-card"><h3>${esc(d.name)}</h3></div>`).join(''):'<div class="empty-state">No decks yet.</div>'; signalUi('decks'); }
function renderLoans(){ $('loanList').innerHTML=state.loans.filter(l=>!l.returnedAt).length?state.loans.filter(l=>!l.returnedAt).map(l=>`<div class="list-card"><h3>${esc(l.borrower)}</h3><p>${esc(nameOf(byCode.get(l.cardCode)||{cardCode:l.cardCode}))} ×${l.qty}</p></div>`).join(''):'<div class="empty-state">Nothing is currently loaned out.</div>'; signalUi('loans'); }
function renderAll(){ renderFilters(); renderCards(); renderStats(); renderStorage(); renderDecks(); renderLoans(); }

function showCard(code){
  const c=byCode.get(code); if(!c) return;
  const loc=locationFor(c);
  $('cardDialog').innerHTML=`<div class="modal-inner"><div class="modal-head"><h2>${esc(nameOf(c))}</h2><button class="close-btn" data-close="cardDialog">×</button></div><div class="detail-layout"><div>${c.imageUrl?`<img class="detail-image" decoding="async" src="${esc(c.imageUrl)}" alt="${esc(nameOf(c))}">`:'<div class="detail-image card-placeholder">No image</div>'}</div><div><div class="detail-meta">${esc(c.cardSet)} • ${esc(c.cardType)} • ${esc((c.domains||[]).join(' / '))}</div><div class="info-grid"><div class="info-cell"><strong>${owned(code)}</strong><small>Total owned</small></div><div class="info-cell"><strong>${available(code)}</strong><small>Available</small></div><div class="info-cell"><strong>${decked(code)}</strong><small>In decks</small></div><div class="info-cell"><strong>${loaned(code)}</strong><small>Loaned</small></div></div><div class="location-callout"><strong>Store in:</strong><br>${loc.box?`${esc(loc.boxName)} • Position ${loc.box} • ${esc(loc.section)}`:'Unassigned • customize Storage to choose a destination'}</div><div class="modal-actions"><button class="primary-btn" data-adjust="1" data-code="${esc(code)}">+1</button><button class="primary-btn" data-adjust="4" data-code="${esc(code)}">+4</button><button class="primary-btn" data-adjust="10" data-code="${esc(code)}">+10</button><button class="ghost-btn" data-adjust="-1" data-code="${esc(code)}">−1</button></div></div></div></div>`;
  $('cardDialog').showModal();
  signalUi('card-dialog');
}
function showBox(boxId){
  const boxes=normalizeStorageBoxes(state.storageBoxes),box=boxes.find(b=>b.id===boxId);if(!box)return;
  const cards=catalog.filter(c=>locationFor(c).boxId===box.id&&available(c.cardCode)>0);
  $('storageDialog').innerHTML=`<div class="modal-inner"><div class="modal-head"><div><h2>${esc(box.name)}</h2><p class="detail-meta">Position ${boxes.indexOf(box)+1} • ${esc(describeStorageBox(box))}</p></div><button class="close-btn" data-close="storageDialog">×</button></div>${cards.length?`<div class="card-lines">${cards.map(c=>`<div class="card-line"><span>${esc(locationFor(c).section)} • ${esc(nameOf(c))}</span><strong>×${available(c.cardCode)}</strong></div>`).join('')}</div>`:'<div class="empty-state">No cards route here yet.</div>'}</div>`;
  $('storageDialog').showModal();
  signalUi('storage-dialog');
}
function openBulk(){
  $('bulkDialog').innerHTML=`<div class="modal-inner"><div class="modal-head"><h2>Bulk Add</h2><button class="close-btn" data-close="bulkDialog">×</button></div><div class="search-wrap"><input id="bulkSearch" placeholder="Search card"></div><div id="bulkResults" class="bulk-results"></div></div>`;
  $('bulkDialog').showModal(); renderBulk('');
}
function renderBulk(text){
  if(!$('bulkResults')) return;
  const matches=catalog.filter(c=>norm(nameOf(c)).includes(norm(text))).slice(0,40);
  $('bulkResults').innerHTML=matches.map(c=>`<div class="bulk-row"><div>${c.imageUrl?`<img loading="lazy" decoding="async" fetchpriority="low" src="${esc(c.imageUrl)}" alt="">`:''}</div><div><strong>${esc(nameOf(c))}</strong><br><small>Owned ${owned(c.cardCode)}</small></div><div class="bulk-buttons"><button data-bulk="1" data-code="${esc(c.cardCode)}">+1</button><button data-bulk="4" data-code="${esc(c.cardCode)}">+4</button><button data-bulk="10" data-code="${esc(c.cardCode)}">+10</button></div></div>`).join('');
}
function switchTab(tab){ qsa('.tab').forEach(b=>b.classList.toggle('active',b.dataset.tab===tab)); qsa('.view').forEach(v=>v.classList.remove('active')); $(`${tab}View`)?.classList.add('active'); signalUi('tab'); }
function exportBackup(){ const b=new Blob([JSON.stringify({version:2,exportedAt:new Date().toISOString(),state},null,2)],{type:'application/json'}); const a=document.createElement('a'); a.href=URL.createObjectURL(b); a.download=`riftbound-vault-backup-${new Date().toISOString().slice(0,10)}.json`; a.click(); }

function wireEvents(){
  document.addEventListener('click',e=>{
    let x;
    if(x=e.target.closest('.tab')) return switchTab(x.dataset.tab);
    if(x=e.target.closest('.filter-chip')){ filters[x.dataset.kind]=x.dataset.value; visibleCount=PAGE_SIZE; renderFilters(); return renderCards(); }
    if(x=e.target.closest('[data-card]')) return showCard(x.dataset.card);
    if(x=e.target.closest('[data-close]')) return $(x.dataset.close)?.close();
    if(x=e.target.closest('[data-adjust]')){ const code=x.dataset.code; adjustOwned(code,Number(x.dataset.adjust)); return showCard(code); }
    if(x=e.target.closest('[data-box]')) return showBox(x.dataset.box);
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
