(() => {
  'use strict';

  const APP_KEY='riftbound-vault-v2';
  const OPTION_LIMIT=8;
  const SOURCE_UPDATED='2026-08-28';
  const RIOT_SOURCE='https://playriftbound.com/en-us/news/organizedplay/barcelonas-top-decks/';
  const META_SOURCE='https://riftbound.gg/riftbound-meta-tier-list-best-decks-for-vendetta-post-barcelona-rq/';
  const esc=(v='')=>String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const norm=(v='')=>String(v).toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g,'').replace(/[’]/g,"'").trim();
  const uid=()=>`recommended-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,8)}`;
  const req=(qty,name,section='main',cardType='')=>({qty,name,section,cardType});

  const META_DECKS=[
    {
      id:'barcelona-kennen-order',name:'Kennen Order Control',champion:'Kennen',hero:'Kennen, Storm of Shuriken',tier:'Tier 1',metaRank:1,metaScore:100,result:'Barcelona 2nd, 3 Top 8',popularity:'12.7% of the Barcelona field',player:'CTCG Koko Lopez',legendTitle:'Heart of the Tempest',
      entries:[
        req(1,'Heart of the Tempest','legend','Legend'),req(1,'Kennen, Storm of Shuriken','champion','Unit'),
        req(1,'Baron Nashor'),req(2,'Fizz, Trickster'),req(1,'Flash'),req(1,'Hard Bargain'),req(2,'Last Rites'),req(3,'Lightning Rush'),req(3,'Nocturne, Horrifying'),req(3,'Rhasa the Sunderer'),req(3,'Ride the Wind'),req(3,'Seal of Discord'),req(1,'Shadow Order Disciple'),req(3,'Stacked Deck'),req(1,'Star-Crossed'),req(2,'Switcheroo'),req(1,'The Harrowing'),req(1,'Tideturner'),req(3,'Traveling Merchant'),req(3,'Treasure Hunter'),req(2,'Up from the Deep'),
        req(1,'Minefield','battlefield','Battlefield'),req(1,'Sandswept Tomb','battlefield','Battlefield'),req(1,'Zaun Warrens','battlefield','Battlefield'),req(9,'Chaos Rune','rune','Rune'),req(3,'Order Rune','rune','Rune')
      ]
    },
    {
      id:'barcelona-master-yi-body-calm',name:'Master Yi Body Calm',champion:'Master Yi',hero:'Master Yi, Tempered',tier:'Tier 1',metaRank:2,metaScore:97,result:'Barcelona Top 8, 2 copies',popularity:'9.3% of the Barcelona field',player:'Shaßßat Shalom',legendTitle:'Wuju Bladesman',
      entries:[
        req(1,'Wuju Master','legend','Legend'),req(1,'Master Yi, Tempered','champion','Unit'),
        req(1,'Alpha Strike'),req(1,'Back Off'),req(3,'Charm'),req(3,'Defy'),req(3,'Discipline'),req(3,'En Garde'),req(2,'First Mate'),req(1,'Grim Resolve'),req(2,'Irelia, Fervent'),req(3,'Lonely Poro'),req(1,'Not So Fast'),req(2,'Pit Rookie'),req(3,'Punch First'),req(1,'Rampage'),req(3,'Rengar, Trophy Hunter'),req(1,'Ruin Runner'),req(1,'Sabotage'),req(3,'Scuttle Crab'),req(1,'Steel Paws'),req(1,"Zhonya's Hourglass"),
        req(1,'Abandoned Hall','battlefield','Battlefield'),req(1,"Emperor's Dais",'battlefield','Battlefield'),req(1,'Grove of the God-Willow','battlefield','Battlefield'),req(7,'Body Rune','rune','Rune'),req(5,'Calm Rune','rune','Rune')
      ]
    },
    {
      id:'barcelona-rengar-body-fury',name:'Rengar Body Fury',champion:'Rengar',hero:'Rengar, Trophy Hunter',tier:'Tier 1',metaRank:3,metaScore:94,result:'Barcelona Top 8',popularity:'4.5% of the Barcelona field',player:'DSG Prismaticism',legendTitle:'Pridestalker',
      entries:[
        req(1,'Pridestalker','legend','Legend'),req(1,'Rengar, Trophy Hunter','champion','Unit'),
        req(1,'Darius, Trifarian'),req(1,'Ferrous Forerunner'),req(2,'First Mate'),req(3,'Grim Apothecary'),req(3,'Inferna'),req(3,'Irresistible Faefolk'),req(3,"Kai'Sa, Survivor"),req(3,'Kinkou Initiate'),req(2,'Nidalee, Cat Form'),req(3,'Noxus Hopeful'),req(1,'Pakaa Cub'),req(3,'Pit Rookie'),req(3,'Punch First'),req(1,'Pyke, Dockside Butcher'),req(2,'Rampage'),req(2,'Sabotage'),req(3,'Thrill of the Hunt'),
        req(1,"Emperor's Dais",'battlefield','Battlefield'),req(1,'Seat of Power','battlefield','Battlefield'),req(1,'Star Spring','battlefield','Battlefield'),req(8,'Body Rune','rune','Rune'),req(4,'Fury Rune','rune','Rune')
      ]
    },
    {
      id:'barcelona-ornn-calm-mind',name:'Ornn Calm Mind',champion:'Ornn',hero:'Ornn, Blacksmith',tier:'Tier 2',metaRank:7,metaScore:89,result:'Barcelona champion',popularity:'2.0% of the Barcelona field',player:'MICE TheManland',legendTitle:'Fire Below the Mountain',
      entries:[
        req(1,'Fire Below the Mountain','legend','Legend'),req(1,'Ornn, Blacksmith','champion','Unit'),
        req(2,'Aspiring Engineer'),req(3,'Brutalizer'),req(2,'Charm'),req(3,'Clockwork Keeper'),req(1,'Cloth Armor'),req(3,'Defy'),req(1,'Guardian Angel'),req(1,'Helm of Suppression'),req(1,'Lecturing Yordle'),req(1,'Mask of Foresight'),req(3,'Patched Porobot'),req(3,'Pit Crew'),req(3,'Poro Snax'),req(3,'Scuttle Crab'),req(3,'Seal of Focus'),req(3,'Sprite Fountain'),req(3,"Sterak's Gage"),
        req(1,"Ornn's Forge",'battlefield','Battlefield'),req(1,'Seat of Power','battlefield','Battlefield'),req(1,'Veiled Temple','battlefield','Battlefield'),req(8,'Calm Rune','rune','Rune'),req(4,'Mind Rune','rune','Rune')
      ]
    },
    {
      id:'barcelona-irelia-calm-chaos',name:'Irelia Calm Chaos',champion:'Irelia',hero:'Irelia, Fervent',tier:'Tier 2',metaRank:4,metaScore:86,result:'Barcelona best Irelia, 11th',popularity:'7.7% of the Barcelona field',player:'asiptofu',legendTitle:'Blade Dancer',
      entries:[
        req(1,'Blade Dancer','legend','Legend'),req(1,'Irelia, Fervent','champion','Unit'),
        req(2,'Akali, Silent'),req(3,'Boots of Swiftness'),req(2,'Charm'),req(3,'Defiant Dance'),req(3,'Defy'),req(3,'Discipline'),req(2,'En Garde'),req(1,'Flash'),req(2,'Guardian Angel'),req(1,'Gust'),req(1,'Gust Monk'),req(3,'Lonely Poro'),req(1,'Not So Fast'),req(1,'Rebuke'),req(2,'Ride the Wind'),req(3,'Stacked Deck'),req(3,'Stellacorn Herder'),req(3,'Tideturner'),
        req(1,'Abandoned Hall','battlefield','Battlefield'),req(1,'Sunken Temple','battlefield','Battlefield'),req(1,"Targon's Peak",'battlefield','Battlefield'),req(6,'Calm Rune','rune','Rune'),req(6,'Chaos Rune','rune','Rune')
      ]
    },
    {
      id:'barcelona-azir-calm-order',name:'Azir Calm Order',champion:'Azir',hero:'Azir, Sovereign',tier:'Tier 2',metaRank:5,metaScore:85,result:'Barcelona Top 8, 3rd',popularity:'3.7% of the Barcelona field',player:'MICE Squirtle',legendTitle:'Emperor of the Sands',
      entries:[
        req(1,'Emperor of the Sands','legend','Legend'),req(1,'Azir, Sovereign','champion','Unit'),
        req(3,'Arise!'),req(3,'B.F. Sword'),req(3,'Back Off'),req(3,'Brutalizer'),req(2,'Deathgrip'),req(3,'Defy'),req(3,'Discipline'),req(3,"Doran's Shield"),req(2,'En Garde'),req(3,'Eye of the Herald'),req(3,'Guards!'),req(1,'Hand Hammer'),req(3,'Hidden Blade'),req(1,'Kennen, Keeper of Balance'),req(3,'Soul Sword'),
        req(1,'Hall of Legends','battlefield','Battlefield'),req(1,'Seat of Power','battlefield','Battlefield'),req(1,'Trifarian War Camp','battlefield','Battlefield'),req(7,'Calm Rune','rune','Rune'),req(5,'Order Rune','rune','Rune')
      ]
    },
    {
      id:'barcelona-fiora-body-order',name:'Fiora Body Order',champion:'Fiora',hero:'Fiora, Worthy',tier:'Tier 2',metaRank:10,metaScore:78,result:'Barcelona best Fiora, 12th',popularity:'2.1% of the Barcelona field',player:'Ricemaster',legendTitle:'Grand Duelist',
      entries:[
        req(1,'Grand Duelist','legend','Legend'),req(1,'Fiora, Worthy','champion','Unit'),
        req(1,'Ambessa, The Wolf'),req(2,'B.F. Sword'),req(2,'Baited Hook'),req(2,'Call to Glory'),req(1,'Deathgrip'),req(2,'Divining Shells'),req(3,'First Mate'),req(2,'Harnessed Dragon'),req(2,'Hidden Blade'),req(3,'Kinkou Initiate'),req(3,'Pit Rookie'),req(3,'Punch First'),req(2,'Rampage'),req(2,'Riposte'),req(3,'Sett, Brawler'),req(3,'Spectral Matron'),req(3,'Unsung Hero'),
        req(1,'Monastery of Hirana','battlefield','Battlefield'),req(1,'Sunken Temple','battlefield','Battlefield'),req(1,'Trifarian War Camp','battlefield','Battlefield'),req(5,'Body Rune','rune','Rune'),req(7,'Order Rune','rune','Rune')
      ]
    },
    {
      id:'barcelona-akali-calm-fury',name:'Akali Calm Fury',champion:'Akali',hero:'Akali, Deadly Weapon',tier:'Tier 3',metaRank:12,metaScore:74,result:'Barcelona best Akali, 10th',popularity:'3.1% of the Barcelona field',player:'ASC HaruKaze',legendTitle:'Rogue Assassin',
      entries:[
        req(1,'Rogue Assassin','legend','Legend'),req(1,'Akali, Deadly Weapon','champion','Unit'),
        req(3,'Astral Heron'),req(2,'Back Off'),req(3,'Defy'),req(3,'Discipline'),req(2,'En Garde'),req(3,'Falling Star'),req(3,'Irelia, Fervent'),req(3,'Lonely Poro'),req(3,'Long Sword'),req(3,'Scuttle Crab'),req(3,'Shuriken Flip'),req(2,'Sky Splitter'),req(3,'Stellacorn Herder'),req(3,"Zhonya's Hourglass"),
        req(1,'Back-Alley Bar','battlefield','Battlefield'),req(1,"Targon's Peak",'battlefield','Battlefield'),req(1,'Void Gate','battlefield','Battlefield'),req(5,'Calm Rune','rune','Rune'),req(7,'Fury Rune','rune','Rune')
      ]
    }
  ];

  let sortMode='fit';

  function readState(){
    try{return {inventory:{},decks:[],loans:[],transactions:[],...JSON.parse(localStorage.getItem(APP_KEY)||'{}')}}
    catch{return {inventory:{},decks:[],loans:[],transactions:[]}}
  }
  function saveState(s){
    localStorage.setItem(APP_KEY,JSON.stringify(s));
    window.RiftboundApp?.reloadState?.();window.RiftboundFeatures?.render?.();window.RiftboundCloud?.syncNow?.();
    window.dispatchEvent(new CustomEvent('riftbound-local-change',{detail:{key:APP_KEY}}));
  }
  function catalog(){return window.RiftboundApp?.getCatalog?.()||[]}
  function cardCandidates(entry){
    const targetName=norm(entry.name),targetType=norm(entry.cardType);
    return catalog().filter(c=>norm(c.fullName||c.name||c.cardCode)===targetName&&(!targetType||norm(c.cardType)===targetType));
  }
  function available(code,s){
    const owned=Number(s.inventory?.[code]?.owned||0);
    const decked=(s.decks||[]).reduce((n,d)=>n+Number(d.cards?.[code]||0),0);
    const loaned=(s.loans||[]).filter(l=>!l.returnedAt&&l.cardCode===code).reduce((n,l)=>n+Number(l.qty||0),0);
    return Math.max(0,owned-decked-loaned);
  }
  function analyze(t,s=readState()){
    const remaining=new Map(catalog().map(c=>[c.cardCode,available(c.cardCode,s)])),unresolved=[];
    const rows=t.entries.map(entry=>{
      const candidates=cardCandidates(entry);if(!candidates.length)unresolved.push(entry.name);
      const allocations={};let have=0;
      for(const candidate of candidates){
        const take=Math.min(Math.max(0,Number(remaining.get(candidate.cardCode)||0)),entry.qty-have);
        if(take>0){allocations[candidate.cardCode]=take;remaining.set(candidate.cardCode,Number(remaining.get(candidate.cardCode)||0)-take);have+=take}
        if(have>=entry.qty)break;
      }
      return {...entry,candidates,have,missing:Math.max(0,entry.qty-have),allocations};
    });
    const total=rows.reduce((n,r)=>n+r.qty,0),matched=rows.reduce((n,r)=>n+r.have,0),missingCopies=rows.reduce((n,r)=>n+r.missing,0),percent=total?Math.round(matched/total*100):0;
    return {template:t,rows,total,matched,missingCopies,percent,fitScore:Math.round(percent*.72+t.metaScore*.28),unresolved:[...new Set(unresolved)],complete:total>0&&missingCopies===0&&!unresolved.length};
  }
  function ranked(s=readState(),mode=sortMode){
    const all=META_DECKS.map(t=>analyze(t,s));
    if(mode==='meta')return all.sort((a,b)=>b.template.metaScore-a.template.metaScore||b.percent-a.percent);
    if(mode==='ready')return all.sort((a,b)=>Number(b.complete)-Number(a.complete)||a.missingCopies-b.missingCopies||b.template.metaScore-a.template.metaScore);
    return all.sort((a,b)=>Number(b.complete)-Number(a.complete)||b.fitScore-a.fitScore||b.percent-a.percent||b.template.metaScore-a.template.metaScore);
  }
  function heroFor(t){return cardCandidates(req(1,t.hero,'champion','Unit')).find(c=>c.imageUrl)?.imageUrl||''}
  function ensureButtons(){
    const newBtn=document.getElementById('newDeckBtn');if(!newBtn)return;
    let actions=newBtn.closest('.deck-heading-actions');if(!actions){actions=document.createElement('div');actions.className='deck-heading-actions';newBtn.parentNode.insertBefore(actions,newBtn);actions.appendChild(newBtn)}
    let recommended=document.getElementById('recommendedDeckBtn');if(!recommended){recommended=document.createElement('button');recommended.id='recommendedDeckBtn';recommended.type='button';recommended.textContent='Recommended Decks';newBtn.insertAdjacentElement('afterend',recommended)}
    [newBtn,recommended].forEach(btn=>{btn.className='primary-btn deck-action-btn';btn.type='button'});
  }
  function ensureDialog(){let d=document.getElementById('recommendedDeckDialog');if(!d){d=document.createElement('dialog');d.id='recommendedDeckDialog';d.className='modal recommended-deck-dialog';document.body.appendChild(d)}return d}
  function decorateDecks(){
    ensureButtons();const s=readState();
    document.querySelectorAll('#deckList .feature-list-card').forEach(deckCard=>{
      const id=deckCard.querySelector('[data-edit-deck]')?.dataset.editDeck,deck=(s.decks||[]).find(d=>d.id===id);
      if(deck?.recommended&&!deckCard.querySelector('.recommended-badge'))deckCard.querySelector('h3')?.insertAdjacentHTML('afterend',`<span class="recommended-badge">META RECOMMENDATION • ${deck.recommended.complete?'COMPLETE':'IN PROGRESS'}</span>`);
    });
  }
  function statusText(a){if(a.unresolved.length)return 'Catalog update needed';if(a.complete)return 'Ready to build';if(!a.matched)return 'No matching copies yet';return `${a.missingCopies} cards needed`}
  function modeButton(mode,label){return `<button type="button" class="recommended-mode ${sortMode===mode?'active':''}" data-recommended-mode="${mode}">${label}</button>`}
  function sectionLabel(section){return ({legend:'Legend',champion:'Chosen champion',main:'Main deck',battlefield:'Battlefield',rune:'Rune pool'})[section]||'Main deck'}
  function renderManager(selectedId='',message=''){
    const d=ensureDialog(),s=readState(),all=ranked(s),options=all.slice(0,OPTION_LIMIT),selected=all.find(a=>a.template.id===selectedId)||options[0]||null;
    const availableTotal=Object.keys(s.inventory||{}).reduce((n,code)=>n+available(code,s),0);
    const optionHtml=options.map((a,index)=>{
      const t=a.template,img=heroFor(t),score=sortMode==='meta'?t.metaScore:sortMode==='ready'?a.percent:a.fitScore;
      return `<button type="button" class="recommended-option ${selected?.template.id===t.id?'selected':''}" data-recommended-select="${esc(t.id)}"><span class="recommended-rank">${index+1}</span>${img?`<img src="${esc(img)}" alt="${esc(t.champion)}">`:''}<span class="recommended-option-copy"><small>${esc(t.tier)} • META #${t.metaRank}</small><strong>${esc(t.name)}</strong><span>${a.matched}/${a.total} owned • ${esc(t.result)}</span><span class="recommended-progress" role="progressbar" aria-label="${esc(t.name)} collection match" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${a.percent}"><i style="width:${a.percent}%"></i></span></span><b class="recommended-score ${a.complete?'complete':''}">${score}<small>${sortMode==='meta'?'META':sortMode==='ready'?'OWNED':'FIT'}</small></b></button>`;
    }).join('');
    if(!selected){d.innerHTML='<div class="modal-inner"><div class="empty-state">Current meta deck data is not available.</div></div>';return d}
    const t=selected.template,img=heroFor(t);let previousSection='';
    const rows=selected.rows.map(r=>{const heading=r.section!==previousSection?`<div class="recommended-card-section">${sectionLabel(r.section)}</div>`:'';previousSection=r.section;return `${heading}<div class="recommended-card-line ${r.missing?'missing':'owned'}"><span>${esc(r.name)}<small>${r.have} available of ${r.qty}</small></span><b>${r.missing?`Need ${r.missing}`:'Ready'}</b></div>`}).join('');
    const catalogWarning=selected.unresolved.length?`<div class="recommended-warning">${selected.unresolved.length} card name${selected.unresolved.length===1?' is':'s are'} missing from this catalog: ${esc(selected.unresolved.join(', '))}.</div>`:'';
    const emptyNotice=!availableTotal?'<div class="recommended-warning">Add cards to your vault so the assistant can measure each current meta deck against what you own.</div>':'';
    const canStart=selected.matched>0&&!selected.unresolved.length,actionLabel=selected.complete?'Build Complete Meta Deck':`Start With ${selected.matched} Owned Cards`;
    d.innerHTML=`<div class="modal-inner recommended-manager"><div class="modal-head"><div><h2>Recommended Decks</h2><p>Competitive builds ranked by current meta strength and cards you have available. Cards in decks or active loans are excluded.</p></div><button class="close-btn" type="button" data-recommended-close aria-label="Close recommended decks">×</button></div><div class="recommended-source-bar"><span>Meta snapshot updated Aug 28, 2026</span><span><a href="${RIOT_SOURCE}" target="_blank" rel="noopener">Official Barcelona lists</a><a href="${META_SOURCE}" target="_blank" rel="noopener">Current meta report</a></span></div>${message?`<div class="recommended-success">${esc(message)}</div>`:''}${emptyNotice}<div class="recommended-modes">${modeButton('fit','Best for My Cards')}${modeButton('meta','Strongest Meta')}${modeButton('ready','Closest to Complete')}</div><div class="recommended-layout"><section><div class="recommended-list-head"><span>${options.length} competitive options</span><small>Collection match plus current results</small></div><div class="recommended-options">${optionHtml}</div></section><aside class="recommended-preview"><div class="recommended-preview-head">${img?`<img src="${esc(img)}" alt="${esc(t.champion)}">`:''}<div><small>${esc(t.tier)} • META #${t.metaRank}</small><h3>${esc(t.name)}</h3><p>${selected.matched} of ${selected.total} cards available</p></div><strong>${selected.percent}% match</strong></div><div class="recommended-meta-facts"><span><b>${esc(t.result)}</b><small>Event result</small></span><span><b>${esc(t.popularity)}</b><small>Popularity</small></span><span><b>${esc(t.player)}</b><small>Source player</small></span></div><div class="recommended-summary"><span class="${selected.complete?'complete':''}">${esc(statusText(selected))}</span><small>${selected.complete?'Creates a complete deck and reserves the cards.':'Creates an editable in-progress deck using only copies you currently have.'}</small></div>${catalogWarning}<div class="recommended-card-list">${rows||'<div class="empty-state">No cards resolved.</div>'}</div><button class="primary-btn recommended-build-btn" type="button" data-recommended-build="${esc(t.id)}" ${canStart?'':'disabled'}>${esc(actionLabel)}</button></aside></div></div>`;
    return d;
  }
  function openManager(id=''){const d=renderManager(id);if(!d.open)d.showModal()}
  function buildRecommendation(id){
    const t=META_DECKS.find(x=>x.id===id);if(!t)return;const s=readState(),a=analyze(t,s);
    if(a.unresolved.length){renderManager(id,'This competitive list needs a catalog update before it can be created.');return}
    const cards={};for(const r of a.rows)for(const [code,qty] of Object.entries(r.allocations||{}))cards[code]=(cards[code]||0)+qty;
    const total=Object.values(cards).reduce((n,q)=>n+Number(q||0),0);if(!total){renderManager(id,'No available copies from this competitive list are in your vault yet.');return}
    const now=new Date().toISOString(),deck={id:uid(),name:`${t.name}${a.complete?'':' (In Progress)'}`,champion:t.champion,notes:`Collection-built recommendation from the ${SOURCE_UPDATED} competitive meta snapshot. Source list: ${RIOT_SOURCE}`,cards,createdAt:now,updatedAt:now,recommended:{metaDeckId:t.id,tier:t.tier,metaRank:t.metaRank,sourceUrl:RIOT_SOURCE,metaSourceUrl:META_SOURCE,sourceUpdated:SOURCE_UPDATED,complete:a.complete,matchedAtBuild:total,total:a.total,createdAt:now}};
    s.decks=s.decks||[];s.transactions=s.transactions||[];s.decks.push(deck);s.transactions.unshift({id:uid(),type:'activity',action:`Created meta recommendation “${deck.name}”`,deckId:deck.id,at:now});
    saveState(s);window.RiftboundTheme?.play?.('success');renderManager('',`${deck.name} was added to your Decks tab.`);
  }

  document.addEventListener('click',e=>{
    if(e.target.closest('#recommendedDeckBtn')){openManager();return}
    if(e.target.closest('[data-recommended-close]')){document.getElementById('recommendedDeckDialog')?.close();return}
    const mode=e.target.closest('[data-recommended-mode]');if(mode){sortMode=mode.dataset.recommendedMode;renderManager();return}
    const select=e.target.closest('[data-recommended-select]');if(select){renderManager(select.dataset.recommendedSelect);return}
    const build=e.target.closest('[data-recommended-build]');if(build){buildRecommendation(build.dataset.recommendedBuild);return}
  },true);

  window.addEventListener('riftbound-ui-render',e=>{if((e.detail?.scopes||[]).includes('decks'))setTimeout(decorateDecks,0)});
  window.addEventListener('riftbound-cloud-restored',()=>setTimeout(decorateDecks,80));
  function init(){decorateDecks();setTimeout(decorateDecks,400)}
  window.RiftboundRecommendations={open:openManager,ranked,metaDecks:META_DECKS};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
