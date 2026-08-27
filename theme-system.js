(() => {
  'use strict';

  const UX_KEY='riftbound-vault-ux-v1';
  const APP_KEY='riftbound-vault-v2';
  const DOMAINS=['Fury','Calm','Mind','Body','Chaos','Order'];
  const RUNE_ART={
    Fury:'https://cmsassets.rgpub.io/sanity/images/dsfx7636/game_data_live/f95ed6ba0c4d4d357c45bf5bdb1a8e540af1f85f-744x1039.png',
    Calm:'https://cmsassets.rgpub.io/sanity/images/dsfx7636/game_data_live/9b70aa1b334728a3e8beeea0c9154a2d0f79b1eb-744x1039.png',
    Mind:'https://cmsassets.rgpub.io/sanity/images/dsfx7636/game_data_live/33df1c56c6e76f9cb783c19161f16fcdbdc20f98-744x1039.png',
    Body:'https://cmsassets.rgpub.io/sanity/images/dsfx7636/game_data_live/3313c73c5b31daa482073bfefbf4d2255a89d7d0-744x1039.png',
    Chaos:'https://cmsassets.rgpub.io/sanity/images/dsfx7636/game_data_live/3861fc566891a70c21cf3d3075adec716deb7080-744x1039.png',
    Order:'https://cmsassets.rgpub.io/sanity/images/dsfx7636/game_data_live/71e7d71ebadb81ccad7ca4cb8b3fb85d2f5fd4bf-744x1039.png'
  };

  let ctx=null;
  let noiseBuffer=null;
  let lastHover=0;

  function readUX(){try{return {density:'normal',intensity:'supernova',background:98,sound:false,cosmicSound:false,neonSound:false,cosmicVolume:42,neonVolume:38,...JSON.parse(localStorage.getItem(UX_KEY)||'{}')}}catch{return {density:'normal',intensity:'supernova',background:98,sound:false,cosmicSound:false,neonSound:false,cosmicVolume:42,neonVolume:38}}}
  function writeUX(patch){const next={...readUX(),...patch,sound:false};localStorage.setItem(UX_KEY,JSON.stringify(next));return next}
  function theme(s=readUX()){return s.intensity==='neon'?'neon':'cosmic'}
  function enabled(t=theme(),s=readUX()){return t==='neon'?!!s.neonSound:!!s.cosmicSound}
  function volume(t=theme(),s=readUX()){return Math.max(0,Math.min(1,Number(t==='neon'?s.neonVolume:s.cosmicVolume)/100))}

  function migrate(){
    const s=readUX();
    const patch={sound:false};
    if(s.intensity!=='neon')patch.intensity='supernova';
    if(s.sound&&!s.cosmicSound&&!s.neonSound)patch.cosmicSound=true;
    writeUX(patch);
  }

  function cleanLegacyAudioRows(){
    const old=document.getElementById('soundToggle');
    const oldRow=old?.closest('.setting-row');
    const oldVolume=document.getElementById('soundVolume')?.closest('.setting-row');
    oldVolume?.remove();
    oldRow?.remove();
    document.querySelectorAll('.audio-pack-note').forEach(x=>x.remove());
  }

  function ensureThemeControls(){
    const panel=document.getElementById('uxSettings');
    const select=document.getElementById('intensitySelect');
    if(!panel||!select)return false;

    const themeRow=select.closest('.setting-row');
    const copy=themeRow?.querySelector('.setting-copy');
    if(copy)copy.innerHTML='<strong>Theme</strong><small>Switch the entire vault appearance and matching soundscape.</small>';
    select.innerHTML='<option value="supernova">Cosmic</option><option value="neon">Neon</option>';

    cleanLegacyAudioRows();

    if(!document.getElementById('themeAudioRow')){
      const row=document.createElement('div');row.id='themeAudioRow';row.className='setting-row';
      row.innerHTML='<div class="setting-copy"><strong id="themeAudioTitle">Cosmic audio</strong><small id="themeAudioHelp">Spatial chimes and crystalline interface tones.</small></div><input id="themeAudioToggle" class="sound-toggle" type="checkbox">';
      themeRow.insertAdjacentElement('afterend',row);
      const vol=document.createElement('div');vol.id='themeAudioVolumeRow';vol.className='setting-row';
      vol.innerHTML='<div class="setting-copy"><strong id="themeAudioVolumeTitle">Cosmic volume</strong><small>Only the active theme can play audio.</small></div><div class="theme-audio-controls"><input id="themeAudioVolume" class="theme-audio-volume" type="range" min="0" max="100" step="1"><span id="themeAudioLevel" class="theme-audio-level"></span><button id="themeAudioTest" class="theme-audio-test" type="button">Test</button></div>';
      row.insertAdjacentElement('afterend',vol);
    }
    return true;
  }

  function apply(){
    if(!ensureThemeControls())return;
    const s=readUX(),t=theme(s),isNeon=t==='neon';
    document.body.dataset.vaultTheme=t;
    document.body.dataset.intensity=isNeon?'neon':'supernova';
    const select=document.getElementById('intensitySelect');if(select)select.value=isNeon?'neon':'supernova';
    const settingsBtn=document.getElementById('uxSettingsBtn');if(settingsBtn)settingsBtn.textContent=isNeon?'Neon Settings':'Cosmic Settings';
    const head=document.querySelector('#uxSettings .settings-head h3');if(head)head.textContent=isNeon?'Neon Settings':'Cosmic Settings';
    const subtitle=document.querySelector('.vault-subtitle');if(subtitle)subtitle.textContent=isNeon?'A Neon Riftbound Archive':'A Cosmic Riftbound Archive';
    const title=document.getElementById('themeAudioTitle'),help=document.getElementById('themeAudioHelp'),volTitle=document.getElementById('themeAudioVolumeTitle'),toggle=document.getElementById('themeAudioToggle'),range=document.getElementById('themeAudioVolume'),level=document.getElementById('themeAudioLevel');
    if(title)title.textContent=isNeon?'Neon audio':'Cosmic audio';
    if(help)help.textContent=isNeon?'Cyberpunk data chirps, synth pulses, glitches, and terminal clicks.':'Spatial chimes and crystalline interface tones.';
    if(volTitle)volTitle.textContent=isNeon?'Neon volume':'Cosmic volume';
    if(toggle)toggle.checked=enabled(t,s);
    const v=Math.round(volume(t,s)*100);if(range)range.value=String(v);if(level)level.textContent=`${v}%`;
  }

  function switchTheme(value){
    if(value==='neon')writeUX({intensity:'neon',cosmicSound:false,sound:false});
    else writeUX({intensity:'supernova',neonSound:false,sound:false});
    apply();
    play('switch',true);
  }

  function audioContext(){ctx||=new (window.AudioContext||window.webkitAudioContext)();if(ctx.state==='suspended')ctx.resume();return ctx}
  function tone(c,freq,type,start,dur,gain,endFactor=1){const o=c.createOscillator(),g=c.createGain();o.type=type;o.frequency.setValueAtTime(freq,start);o.frequency.exponentialRampToValueAtTime(Math.max(20,freq*endFactor),start+dur);g.gain.setValueAtTime(.0001,start);g.gain.exponentialRampToValueAtTime(Math.max(.0002,gain),start+.007);g.gain.exponentialRampToValueAtTime(.0001,start+dur);o.connect(g);g.connect(c.destination);o.start(start);o.stop(start+dur+.01)}
  function noise(c,start,dur,gain,highpass=1000){if(!noiseBuffer||noiseBuffer.sampleRate!==c.sampleRate){const len=Math.floor(c.sampleRate*.12);noiseBuffer=c.createBuffer(1,len,c.sampleRate);const d=noiseBuffer.getChannelData(0);for(let i=0;i<len;i++)d[i]=Math.random()*2-1}const src=c.createBufferSource(),f=c.createBiquadFilter(),g=c.createGain();src.buffer=noiseBuffer;f.type='highpass';f.frequency.value=highpass;g.gain.setValueAtTime(Math.max(.0001,gain),start);g.gain.exponentialRampToValueAtTime(.0001,start+dur);src.connect(f);f.connect(g);g.connect(c.destination);src.start(start);src.stop(start+dur)}

  function cosmic(kind,v){const c=audioContext(),t=c.currentTime,notes=kind==='complete'?[392,523.25,659.25,783.99]:kind==='switch'?[440,659.25,880]:kind==='remove'?[392,293.66]:kind==='add'?[523.25,659.25,783.99]:[587.33,783.99];notes.forEach((f,i)=>tone(c,f,i%2?'sine':'triangle',t+i*.03,.16+i*.012,v*(.095/(1+i*.32)),1.035));if(kind==='complete')noise(c,t,.07,v*.012,2600)}
  function neon(kind,v){const c=audioContext(),t=c.currentTime,base=kind==='remove'?120:kind==='add'?220:kind==='switch'?165:kind==='hover'?360:280,seq=kind==='complete'?[1,1.5,2,3]:kind==='switch'?[1,2.04,1.5]:kind==='remove'?[1,.68]:[1,2.02];seq.forEach((m,i)=>tone(c,base*m,i%2?'square':'sawtooth',t+i*.022,.075+i*.012,v*(.06/(1+i*.35)),kind==='remove'?.78:1.07));if(kind!=='hover')noise(c,t+.004,.035,v*.022,1500)}
  function play(kind='click',force=false){const s=readUX(),t=theme(s);if(!force&&!enabled(t,s))return;const v=volume(t,s);try{t==='neon'?neon(kind,v):cosmic(kind,v)}catch{}}

  function storageBoxes(){try{const s=JSON.parse(localStorage.getItem(APP_KEY)||'{}');return Array.isArray(s.storageBoxes)?s.storageBoxes:[]}catch{return []}}
  function decorateStorage(){
    const boxes=storageBoxes();
    document.querySelectorAll('.storage-box[data-box]').forEach(el=>{
      const b=boxes.find(x=>String(x.id)===String(el.dataset.box));if(!b)return;
      const domains=(b.domains||[]).filter(d=>DOMAINS.includes(d));
      let r=el.querySelector('.storage-runes');if(!r){r=document.createElement('div');r.className='storage-runes';const h=el.querySelector('h3');h?.insertAdjacentElement('afterend',r)}
      const html=domains.length?domains.map(d=>`<span class="storage-rune-art" title="${d}" style="--rune-art:url('${RUNE_ART[d]}')"></span>`).join(''):'<span class="storage-rune-any" title="Any domain">✦</span>';
      if(r.innerHTML!==html)r.innerHTML=html;
    });
  }

  function refresh(){apply();decorateStorage()}

  document.addEventListener('change',e=>{
    if(e.target.id==='intensitySelect'){switchTheme(e.target.value);return}
    if(e.target.id==='themeAudioToggle'){
      const t=theme(),on=e.target.checked;
      writeUX(t==='neon'?{neonSound:on,cosmicSound:false,sound:false}:{cosmicSound:on,neonSound:false,sound:false});
      apply();if(on)play('switch');
    }
  },true);
  document.addEventListener('input',e=>{
    if(e.target.id==='themeAudioVolume'){const t=theme(),v=Math.max(0,Math.min(100,Number(e.target.value)));writeUX(t==='neon'?{neonVolume:v}:{cosmicVolume:v});const level=document.getElementById('themeAudioLevel');if(level)level.textContent=`${v}%`}
  },true);
  document.addEventListener('click',e=>{
    if(e.target.closest('#themeAudioTest')){const t=theme();writeUX(t==='neon'?{neonSound:true,cosmicSound:false}:{cosmicSound:true,neonSound:false});apply();play('complete');return}
    if(e.target.closest('[data-adjust],[data-bulk],[data-fast-bulk]')){const b=e.target.closest('[data-adjust],[data-bulk],[data-fast-bulk]'),n=Number(b?.dataset.adjust??b?.dataset.bulk??b?.dataset.delta??0);play(n<0?'remove':'add');return}
    if(e.target.closest('.tab,[data-mobile-tab],.filter-chip,.storage-box,button'))play('click');
    if(e.target.closest('[data-tab="storage"],#customizeStorageBtn,#saveStorageBoxes'))setTimeout(decorateStorage,60);
  },true);
  document.addEventListener('pointerover',e=>{if(!enabled()||!window.matchMedia('(hover:hover) and (pointer:fine)').matches)return;const hit=e.target.closest('button,.card-tile,.storage-box');if(!hit||hit.contains(e.relatedTarget))return;const now=performance.now();if(now-lastHover<115)return;lastHover=now;play('hover')},true);
  window.addEventListener('riftbound-cloud-restored',()=>setTimeout(refresh,50));
  window.addEventListener('riftbound-local-change',e=>{if(e.detail?.key===APP_KEY)setTimeout(decorateStorage,70)});

  function init(){migrate();setTimeout(refresh,0);setTimeout(decorateStorage,900)}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();