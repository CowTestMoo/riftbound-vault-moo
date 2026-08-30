'use strict';

const STORAGE_KEY = 'riftbound-vault-v2';
const FILTER_STORAGE_KEY = 'riftbound-card-filters-v2';
const PAGE_SIZE = 60;
const DOMAINS = ['Fury','Calm','Mind','Body','Chaos','Order'];
const TYPES = ['All','Legend','Unit','Rune','Spell','Gear','Battlefield','Token'];
let catalog = [];
let byCode = new Map();
let catalogSets = [];
let visibleCount = PAGE_SIZE;
let filters = loadFilters();
let state = loadState();
let renderSignalFrame=0;
let cardSearchFrame=0;
const renderSignalScopes=new Set();
let cardPreloadStarted=false;
const cardPreloadImages=new Set();

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
function loadFilters(){
  const fallback={search:'',types:[],domains:[],sets:[],ownedOnly:false};
  try{
    const saved=JSON.parse(localStorage.getItem(FILTER_STORAGE_KEY)||'{}');
    const list=value=>[...new Set(Array.isArray(value)?value.filter(v=>typeof v==='string'&&v&&v!=='All'):[])];
    return {...fallback,search:String(saved.search||''),types:list(saved.types),domains:list(saved.domains),sets:list(saved.sets),ownedOnly:!!saved.ownedOnly};
  }catch{return fallback}
}
function saveFilters(){
  localStorage.setItem(FILTER_STORAGE_KEY,JSON.stringify(filters));
  window.dispatchEvent(new CustomEvent('riftbound-filter-preferences-change',{detail:{...filters}}));
}
function pruneFilterPreferences(){
  const before=JSON.stringify(filters);
  filters.types=filters.types.filter(value=>TYPES.includes(value)&&value!=='All');
  filters.domains=filters.domains.filter(value=>DOMAINS.includes(value));
  filters.sets=filters.sets.filter(value=>catalogSets.includes(value));
  if(JSON.stringify(filters)!==before)saveFilters();
}
function saveState(){
  if(Array.isArray(state.transactions)&&state.transactions.length>500)state.transactions=state.transactions.slice(0,500);
  localStorage.setItem(STORAGE_KEY,JSON.stringify(state)); signalUi('state'); renderStats();
}
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
  saveState(); renderCards(); renderStorage();
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
  if(type===='token') return 'Tokens';
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
function locationFor(card,boxes=normalizeStorageBoxes(state.storageBoxes)){
  const domain=cardDomain(card);
  const index=boxes.findIndex(box=>storageRuleMatches(box,card));
  if(index<0) return {box:null,boxId:null,boxName:'Unassigned',domain,bucket:'Unassigned',section:sectionFor(card)};
  const box=boxes[index];
  return {box:index+1,boxId:box.id,boxName:box.name,domain,bucket:box.rule,section:sectionFor(card)};
}

function allocationTotals(){
  const decks=new Map(),loans=new Map();
  for(const deck of state.decks){
    for(const [code,qty] of Object.entries(deck.cards||{}))decks.set(code,(decks.get(code)||0)+Number(qty||0));
  }
  for(const loan of state.loans){
    if(loan.returnedAt||!loan.cardCode)continue;
    loans.set(loan.cardCode,(loans.get(loan.cardCode)||0)+Number(loan.qty||0));
  }
  return {decks,loans};
}
function describeStorageBox(box){
  const domainText=box.domains?.length?box.domains.join(' + '):'Any domain';
  const ruleText=box.rule==='All'?'All cards':box.rule==='Other'?'Non-unit cards':box.rule;
  return `${domainText} • ${ruleText}`;
}

function preloadHalfCatalog(cards){
  if(cardPreloadStarted)return;
  cardPreloadStarted=true;
  const connection=navigator.connection||navigator.mozConnection||navigator.webkitConnection;
  const coarse=window.matchMedia('(pointer: coarse)').matches;
  const constrained=!!connection?.saveData||/^(slow-2g|2g|3g)$/i.test(connection?.effectiveType||'');
  if(coarse||constrained||window.innerWidth<=900){
    window.dispatchEvent(new CustomEvent('riftbound-card-preload-complete',{detail:{count:0,skipped:true}}));
    return;
  }
  const target=Math.min(24,Math.max(0,cards.length-PAGE_SIZE));
  const urls=[];
  const seen=new Set();
  for(let i=PAGE_SIZE;i<cards.length&&urls.length<target;i++){
    const card=cards[i];
    if(!card?.imageUrl||seen.has(card.imageUrl))continue;
    seen.add(card.imageUrl);urls.push(card.imageUrl);
  }
  if(!urls.length)return;
  let cursor=0,active=0,pumpScheduled=false;
  const concurrency=2;
  const pump=()=>{
    if(document.hidden)return;
    while(active<concurrency&&cursor<urls.length){
      const image=new Image();active++;cardPreloadImages.add(image);
      image.decoding='async';image.fetchPriority='low';
      image.onload=image.onerror=()=>{active--;cardPreloadImages.delete(image);schedulePump()};
      image.src=urls[cursor++];
    }
    if(cursor>=urls.length&&active===0){
      document.removeEventListener('visibilitychange',resume);
      window.dispatchEvent(new CustomEvent('riftbound-card-preload-complete',{detail:{count:urls.length}}));
    }
  };
  const schedulePump=()=>{
    if(pumpScheduled)return;
    pumpScheduled=true;
    const run=()=>{pumpScheduled=false;pump()};
    if('requestIdleCallback