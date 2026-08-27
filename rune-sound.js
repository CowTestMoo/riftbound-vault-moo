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
  const SOUNDS={hover:['tick_002.wav','tick_004.wav'],click:['click_002.wav','click_003.wav'],filter:['select_001.wav','select_002.wav'],tab:['select_003.wav','select_004.wav'],card:['open_001.wav','open_003.wav'],close:['close_001.wav','close_003.wav'],add:['confirmation_001.wav','confirmation_003.wav'],remove:['back_001.wav','back_003.wav'],storage:['glass_002.wav','glass_003.wav'],toggle:['toggle_001.wav','toggle_003.wav'],switch:['switch_003.wav','switch_004.wav'],settings:['open_002.wav'],clear:['back_002.wav'],load:['maximize_007.wav'],export:['confirmation_002.wav'],complete:['confirmation_004.wav'],progress:['pluck_001.wav','pluck_002.wav'],search:['tick_001.wav'],error:['error_004.wav'],bulk:['drop_001.wav','drop_003.wav']};

  let audioCtx=null,hoverAt=0,searchAt=0;
  const pools=new Map();
  function readSettings(){try{return {sound:false,volume:44,...JSON.parse(localStorage.getItem(SETTINGS_KEY)||'{}')}}catch{return {sound:false,volume:44}}}
  function writeSetting(k,v){const s=readSettings();s[k]=v;localStorage.setItem(SETTINGS_KEY,JSON.stringify(s))}
  function enabled(){return !!readSettings().sound}
  function master(){return Math.max(0,Math.min(1,Number(readSettings().volume??44)/100))}
  const pick=a=>a[Math.floor(Math.random()*a.length)];
  function audio(name){let a=pools.get(name);if(!a){a=new Audio(AUDIO_ROOT+name);a.preload='none';a.crossOrigin='anonymous';pools.set(name,a)}return a}
  function sample(kind,gain=.55,rate=1){if(!enabled())return;const name=pick(SOUNDS[kind]||SOUNDS.click),a=audio(name).cloneNode(true);a.volume=Math.max(0,Math.min(1,master()*gain));a.playbackRate=Math.max(.72,Math.min(1.35,rate));a.play().catch(()=>synth(kind))}
  function synth(kind='click'){if(!enabled())return;try{audioCtx||=new (window.AudioContext||window.webkitAudioContext)();const ctx=audioCtx;if(ctx.state==='suspended')ctx.resume();const now=ctx.currentTime,vol=master(),mg=ctx.createGain();mg.gain.setValueAtTime(Math.max(.0001,vol*.1),now);mg.gain.exponentialRampToValueAtTime(.0001,now+.28);mg.connect(ctx.destination);const notes=kind==='complete'?[392,523.25,659.25]:kind==='add'?[523.25,659.25]:kind==='remove'?[392,293.66]:[660];notes.forEach((f,i)=>{const o=ctx.createOscillator(),g=ctx.createGain(),d=i*.03;o.type=i%2?'sine':'triangle';o.frequency.value=f;g.gain.setValueAtTime(.0001,now+d);g.gain.exponentialRampToValueAtTime(.14/(i+1),now+d+.015);g.gain.exponentialRampToValueAtTime(.0001,now+d+.22);o.connect(g);g.connect(mg);o.start(now+d);o.stop(now+d+.24)})}catch{}}
  function cosmic(kind,gain=.55){sample(kind,gain)}

  function decorateRunes(root=document){
    root.querySelectorAll?.('#domainFilters .filter-chip').forEach(chip=>{const domain=chip.dataset.value,art=RUNE_ART[domain];if(!art||chip.querySelector('.domain-glyph'))return;const g=document.createElement('span');g.className='domain-glyph rune-art-glyph';g.setAttribute('aria-hidden','true');g.style.setProperty('--rune-art',`url("${art}")`);chip.prepend(g)});
  }
  function enhanceSettings(){
    const panel=document.getElementById('uxSettings');if(!panel||panel.dataset.soundEnhanced)return;const sound=document.getElementById('soundToggle');if(!sound)return;panel.dataset.soundEnhanced='1';const row=sound.closest('.setting-row'),volume=document.createElement('div');volume.className='setting-row';volume.innerHTML=`<div class="setting-copy"><strong>Sound volume</strong><small>Master level for the cosmic soundscape.</small></div><div><input id="soundVolume" class="sound-volume" type="range" min="0" max="100" step="1"><span id="soundLevel" class="sound-level"></span> <button id="soundTest" class="sound-test" type="button">Test</button></div>`;row.insertAdjacentElement('afterend',volume);const slider=document.getElementById('soundVolume'),level=document.getElementById('soundLevel'),s=readSettings();slider.value=String(s.volume??44);level.textContent=`${slider.value}%`;slider.addEventListener('input',()=>{writeSetting('volume',Number(slider.value));level.textContent=`${slider.value}%`});document.getElementById('soundTest')?.addEventListener('click',()=>{writeSetting('sound',true);sound.checked=true;cosmic('complete',.62)});sound.addEventListener('change',()=>{writeSetting('sound',sound.checked);if(sound.checked)cosmic('toggle',.45)})
  }
  function classify(target){if(target.closest('#soundTest'))return null;if(target.closest('.filter-chip'))return'filter';if(target.closest('.tab,[data-mobile-tab]'))return'tab';if(target.closest('.card-tile,[data-recent-card]'))return'card';if(target.closest('[data-close],.settings-close'))return'close';if(target.closest('[data-adjust]'))return Number(target.closest('[data-adjust]').dataset.adjust)>0?'add':'remove';if(target.closest('[data-bulk]'))return'bulk';if(target.closest('.storage-box,[data-box]'))return'storage';if(target.closest('#uxSettingsBtn'))return'settings';if(target.closest('#clearFiltersBtn'))return'clear';if(target.closest('#loadMoreBtn'))return'load';if(target.closest('#exportBtn'))return'export';if(target.closest('button'))return'click';return null}

  document.addEventListener('click',e=>{const kind=classify(e.target);if(kind)cosmic(kind,kind==='add'?.62:.46)},true);
  document.addEventListener('pointerover',e=>{if(!enabled()||!window.matchMedia('(hover:hover) and (pointer:fine)').matches)return;const hit=e.target.closest('button,.card-tile,.storage-box,input,select');if(!hit||hit.contains(e.relatedTarget))return;const now=performance.now();if(now-hoverAt<95)return;hoverAt=now;sample('hover',.1)},true);
  document.addEventListener('input',e=>{if(e.target.id!=='cardSearch'||!enabled())return;const now=performance.now();if(now-searchAt<120)return;searchAt=now;sample('search',.09)},true);

  function refreshDecorations(){decorateRunes(document);enhanceSettings()}
  document.addEventListener('DOMContentLoaded',()=>setTimeout(refreshDecorations,0),{once:true});
  window.addEventListener('riftbound-cloud-restored',()=>setTimeout(refreshDecorations,0));
  document.addEventListener('click',e=>{if(e.target.closest('[data-tab],#customizeStorageBtn'))setTimeout(refreshDecorations,0)},true);
  if(document.readyState!=='loading')setTimeout(refreshDecorations,0);
})();