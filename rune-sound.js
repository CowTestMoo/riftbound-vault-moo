(() => {
  'use strict';

  const SETTINGS_KEY='riftbound-vault-ux-v1';
  const RUNE_ART={
    Fury:'https://cmsassets.rgpub.io/sanity/images/dsfx7636/game_data_live/f95ed6ba0c4d4d357c45bf5bdb1a8e540af1f85f-744x1039.png',
    Calm:'https://cmsassets.rgpub.io/sanity/images/dsfx7636/game_data_live/9b70aa1b334728a3e8beeea0c9154a2d0f79b1eb-744x1039.png',
    Mind:'https://cmsassets.rgpub.io/sanity/images/dsfx7636/game_data_live/33df1c56c6e76f9cb783c19161f16fcdbdc20f98-744x1039.png',
    Body:'https://cmsassets.rgpub.io/sanity/images/dsfx7636/game_data_live/3313c73c5b31daa482073bfefbf4d2255a89d7d0-744x1039.png',
    Chaos:'https://cmsassets.rgpub.io/sanity/images/dsfx7636/game_data_live/3861fc566891a70c21cf3d3075adec716deb7080-744x1039.png',
    Order:'https://cmsassets.rgpub.io/sanity/images/dsfx7636/game_data_live/71e7d71ebadb81ccad7ca4cb8b3fb85d2f5fd4bf-744x1039.png'
  };

  const AUDIO_ROOT='https://raw.githubusercontent.com/Calinou/kenney-interface-sounds/master/addons/kenney_interface_sounds/';
  const SOUNDS={
    hover:['tick_002.wav','tick_004.wav'],
    click:['click_002.wav','click_003.wav','click_004.wav','click_005.wav'],
    filter:['select_001.wav','select_002.wav','select_007.wav'],
    tab:['select_003.wav','select_004.wav'],
    card:['open_001.wav','open_003.wav'],
    close:['close_001.wav','close_003.wav'],
    add:['confirmation_001.wav','confirmation_003.wav'],
    remove:['back_001.wav','back_003.wav'],
    storage:['glass_002.wav','glass_003.wav','glass_005.wav'],
    toggle:['toggle_001.wav','toggle_003.wav'],
    switch:['switch_003.wav','switch_004.wav'],
    settings:['open_002.wav'],
    clear:['back_002.wav'],
    load:['maximize_007.wav'],
    export:['confirmation_002.wav'],
    complete:['confirmation_004.wav'],
    progress:['pluck_001.wav','pluck_002.wav'],
    search:['tick_001.wav'],
    error:['error_004.wav'],
    bulk:['drop_001.wav','drop_003.wav']
  };

  let audioCtx=null;
  let hoverAt=0;
  let searchAt=0;
  const pools=new Map();

  function readSettings(){
    try{return {sound:false,volume:44,...JSON.parse(localStorage.getItem(SETTINGS_KEY)||'{}')};}
    catch{return {sound:false,volume:44};}
  }
  function writeSetting(key,value){
    const s=readSettings();s[key]=value;localStorage.setItem(SETTINGS_KEY,JSON.stringify(s));
  }
  function enabled(){return !!readSettings().sound;}
  function master(){const n=Number(readSettings().volume??44);return Math.max(0,Math.min(1,n/100));}
  const pick=a=>a[Math.floor(Math.random()*a.length)];

  function preload(){
    const names=new Set(Object.values(SOUNDS).flat());
    for(const name of names){
      const a=new Audio(AUDIO_ROOT+name);a.preload='auto';a.crossOrigin='anonymous';pools.set(name,a);
    }
  }

  function sample(kind,gain=.55,rate=1){
    if(!enabled())return;
    const list=SOUNDS[kind]||SOUNDS.click;const name=pick(list);const base=pools.get(name)||new Audio(AUDIO_ROOT+name);const a=base.cloneNode(true);
    a.volume=Math.max(0,Math.min(1,master()*gain));a.playbackRate=Math.max(.72,Math.min(1.35,rate*(.985+Math.random()*.03)));
    a.play().catch(()=>synth(kind));
  }

  function synth(kind='click'){
    if(!enabled())return;
    try{
      audioCtx ||= new (window.AudioContext||window.webkitAudioContext)();
      const ctx=audioCtx;if(ctx.state==='suspended')ctx.resume();
      const now=ctx.currentTime,vol=master();
      const masterGain=ctx.createGain();masterGain.gain.setValueAtTime(Math.max(.0001,vol*.12),now);masterGain.gain.exponentialRampToValueAtTime(.0001,now+.32);masterGain.connect(ctx.destination);
      const notes=kind==='complete'?[392,523.25,659.25,783.99]:kind==='add'?[523.25,659.25,783.99]:kind==='card'?[392,587.33]:kind==='remove'?[392,293.66]:[660];
      notes.forEach((f,i)=>{const o=ctx.createOscillator(),g=ctx.createGain(),delay=i*.035;o.type=i%2?'sine':'triangle';o.frequency.setValueAtTime(f,now+delay);o.frequency.exponentialRampToValueAtTime(f*1.045,now+delay+.18);g.gain.setValueAtTime(.0001,now+delay);g.gain.exponentialRampToValueAtTime(.18/(i+1),now+delay+.018);g.gain.exponentialRampToValueAtTime(.0001,now+delay+.27);o.connect(g);g.connect(masterGain);o.start(now+delay);o.stop(now+delay+.3);});
    }catch{}
  }

  function cosmic(kind,gain=.55){sample(kind,gain);if(['add','card','complete'].includes(kind))setTimeout(()=>synth(kind),18);}

  function decorateRunes(root=document){
    root.querySelectorAll?.('#domainFilters .filter-chip').forEach(chip=>{
      const domain=chip.dataset.value,art=RUNE_ART[domain];if(!art)return;let g=chip.querySelector('.domain-glyph');if(!g){g=document.createElement('span');g.className='domain-glyph';g.setAttribute('aria-hidden','true');chip.prepend(g);}g.textContent='';g.classList.add('rune-art-glyph');g.style.setProperty('--rune-art',`url("${art}")`);
    });
    root.querySelectorAll?.('.storage-box[data-domain]').forEach(box=>{
      const domain=Object.keys(RUNE_ART).find(d=>d.toLowerCase()===String(box.dataset.domain).toLowerCase());if(!domain)return;const h=box.querySelector('h3');if(!h)return;let g=h.querySelector('.domain-glyph');if(!g){g=document.createElement('span');g.className='domain-glyph';g.setAttribute('aria-hidden','true');h.prepend(g);}g.textContent='';g.classList.add('rune-art-glyph');g.style.setProperty('--rune-art',`url("${RUNE_ART[domain]}")`);
    });
  }

  function enhanceSettings(){
    const panel=document.getElementById('uxSettings');if(!panel||panel.dataset.soundEnhanced)return;panel.dataset.soundEnhanced='1';
    const sound=document.getElementById('soundToggle');if(!sound)return;
    const row=sound.closest('.setting-row');
    const volume=document.createElement('div');volume.className='setting-row';volume.innerHTML=`<div class="setting-copy"><strong>Sound volume</strong><small>Master level for the full cosmic soundscape.</small></div><div><input id="soundVolume" class="sound-volume" type="range" min="0" max="100" step="1"><span id="soundLevel" class="sound-level"></span> <button id="soundTest" class="sound-test" type="button">Test</button></div>`;
    row.insertAdjacentElement('afterend',volume);
    const note=document.createElement('p');note.className='audio-pack-note';note.innerHTML='<strong>Soundscape:</strong> CC0 Kenney interface samples layered with procedural cosmic tones.';volume.insertAdjacentElement('afterend',note);
    const slider=document.getElementById('soundVolume'),level=document.getElementById('soundLevel');const s=readSettings();slider.value=String(s.volume??44);level.textContent=`${slider.value}%`;
    slider.addEventListener('input',()=>{writeSetting('volume',Number(slider.value));level.textContent=`${slider.value}%`;if(enabled()&&performance.now()-searchAt>100){searchAt=performance.now();sample('search',.22,.92+Number(slider.value)/400);}});
    document.getElementById('soundTest')?.addEventListener('click',()=>{writeSetting('sound',true);sound.checked=true;document.body.classList.add('sound-active');cosmic('complete',.62);});
    sound.addEventListener('change',()=>{document.body.classList.toggle('sound-active',sound.checked);if(sound.checked){writeSetting('sound',true);setTimeout(()=>cosmic('toggle',.45),20);}else writeSetting('sound',false);});
    document.body.classList.toggle('sound-active',!!s.sound);
  }

  function classifyClick(target){
    if(target.closest('#soundTest'))return null;
    if(target.closest('.filter-chip'))return'filter';
    if(target.closest('.tab,[data-mobile-tab]'))return'tab';
    if(target.closest('.card-tile,[data-recent-card]'))return'card';
    if(target.closest('[data-close],.settings-close'))return'close';
    if(target.closest('[data-adjust]'))return Number(target.closest('[data-adjust]').dataset.adjust)>0?'add':'remove';
    if(target.closest('[data-bulk]'))return'bulk';
    if(target.closest('.storage-box,[data-box]'))return'storage';
    if(target.closest('#uxSettingsBtn'))return'settings';
    if(target.closest('#clearFiltersBtn'))return'clear';
    if(target.closest('#loadMoreBtn'))return'load';
    if(target.closest('#exportBtn'))return'export';
    if(target.closest('.set-progress,[data-set-filter]'))return'progress';
    if(target.closest('[data-density]'))return'switch';
    if(target.closest('select,input[type="checkbox"],input[type="range"]'))return'toggle';
    if(target.closest('button'))return'click';
    return null;
  }

  document.addEventListener('click',e=>{const kind=classifyClick(e.target);if(kind)cosmic(kind,kind==='hover'?.15:kind==='add'?.62:.46);},true);
  document.addEventListener('pointerover',e=>{
    if(!enabled()||!window.matchMedia('(hover:hover) and (pointer:fine)').matches)return;
    const hit=e.target.closest('button,.card-tile,.storage-box,input,select');if(!hit)return;if(hit.contains(e.relatedTarget))return;
    const now=performance.now();if(now-hoverAt<85)return;hoverAt=now;sample('hover',.10,.98+Math.random()*.08);
  },true);
  document.addEventListener('input',e=>{
    if(e.target.id!=='cardSearch'||!enabled())return;const now=performance.now();if(now-searchAt<115)return;searchAt=now;sample('search',.09,1.06+Math.random()*.12);
  },true);
  document.addEventListener('change',e=>{if(e.target.id==='ownedOnly')sample('toggle',.32);},true);
  document.addEventListener('keydown',e=>{if(!enabled())return;if(e.key==='Escape')sample('close',.28);else if(e.key==='ArrowLeft'||e.key==='ArrowRight')sample('hover',.08,e.key==='ArrowRight'?1.08:.94);},true);

  const observer=new MutationObserver(()=>{decorateRunes(document);enhanceSettings();});
  observer.observe(document.body,{childList:true,subtree:true});
  preload();decorateRunes(document);enhanceSettings();
})();