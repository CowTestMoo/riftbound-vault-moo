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

  function rawUX(){try{return JSON.parse(localStorage.getItem(UX_KEY)||'{}')}catch{return {}}}
  function readUX(){
    try{
      const s={density:'normal',intensity:'supernova',background:100,sound:false,cosmicSound:true,neonSound:true,cosmicVolume:100,neonVolume:100,...JSON.parse(localStorage.getItem(UX_KEY)||'{}')};
      return {...s,background:100,cosmicVolume:100,neonVolume:100};
    }catch{return {density:'normal',intensity:'supernova',background:100,sound:false,cosmicSound:true,neonSound:true,cosmicVolume:100,neonVolume:100}}
  }
  function writeUX(patch){const next={...readUX(),...patch,sound:false,background:100,cosmicVolume:100,neonVolume:100};localStorage.setItem(UX_KEY,JSON.stringify(next));return next}
  function theme(s=readUX()){return s.intensity==='neon'?'neon':'cosmic'}
  function enabled(t=theme(),s=readUX()){return t==='neon'?!!s.neonSound:!!s.cosmicSound}
  function volume(){return 1}

  function migrate(){
    const raw=rawUX(),s=readUX(),patch={sound:false,background:100,cosmicVolume:100,neonVolume:100};
    if(s.intensity!=='neon')patch.intensity='supernova';
    /* One-time v3 migration fixes older installs where Cosmic audio could remain disabled. */
    if(raw.audioDefaultsV3!==true){patch.cosmicSound=true;patch.neonSound=true;patch.audioDefaultsV3=true}
    writeUX(patch);
  }

  function ensurePlanet(){const line=document.querySelector('.vault-title-line');if(!line||line.querySelector('.vault-planet'))return;const p=document.createElement('span');p.className='vault-planet';p.setAttribute('aria-hidden','true');line.prepend(p)}
  function syncPlanet(t){if(t==='neon')document.querySelectorAll('.vault-planet').forEach(x=>x.remove());else ensurePlanet()}
  function cleanFixedControls(){
    document.getElementById('soundToggle')?.closest('.setting-row')?.remove();
    document.getElementById('soundVolume')?.closest('.setting-row')?.remove();
    document.getElementById('themeAudioVolumeRow')?.remove();
    document.getElementById('backgroundRange')?.closest('.setting-row')?.remove();
    document.querySelectorAll('.audio-pack-note').forEach(x=>x.remove());
  }

  function ensureThemeControls(){
    const panel=document.getElementById('uxSettings'),select=document.getElementById('intensitySelect');if(!panel||!select)return false;
    const themeRow=select.closest('.setting-row'),copy=themeRow?.querySelector('.setting-copy');
    if(copy)copy.innerHTML='<strong>Theme</strong><small>Choose the visual system for your entire vault. Visual intensity is fixed at maximum.</small>';
    if(select.dataset.twoThemes!=='1'){select.innerHTML='<option value="supernova">Cosmic</option><option value="neon">Neon</option>';select.dataset.twoThemes='1'}
    cleanFixedControls();
    if(!document.getElementById('themeAudioRow')){
      const row=document.createElement('div');row.id='themeAudioRow';row.className='setting-row';row.innerHTML='<div class="setting-copy"><strong id="themeAudioTitle">Cosmic audio</strong><small id="themeAudioHelp">Celestial chimes, starfield sweeps, and deep-space interface tones. Audio output is fixed at full.</small></div><div class="settings-inline-actions"><input id="themeAudioToggle" class="sound-toggle" type="checkbox" aria-label="Theme audio"><button id="themeAudioTest" class="theme-audio-test" type="button">Test</button></div>';themeRow.insertAdjacentElement('afterend',row);
    }
    return true;
  }

  function ensureSection(id,label,before){let el=document.getElementById(id);if(!before)return;if(!el){el=document.createElement('div');el.id=id;el.className='settings-section-title';el.textContent=label}if(el.nextElementSibling!==before)before.insertAdjacentElement('beforebegin',el)}
  function organizeSettings(){
    const panel=document.getElementById('uxSettings');if(!panel)return;panel.classList.add('organized-settings');cleanFixedControls();
    const head=panel.querySelector('.settings-head h3');if(head)head.textContent='Settings';
    const themeRow=document.getElementById('intensitySelect')?.closest('.setting-row'),soundRow=document.getElementById('themeAudioRow');
    const cloud=document.getElementById('cloudSettingRow'),data=document.getElementById('dataToolsSetting'),firstData=cloud||data;
    ensureSection('appearanceSettingsTitle','Appearance',themeRow);ensureSection('soundSettingsTitle','Sound',soundRow);if(firstData)ensureSection('dataSettingsTitle','Cloud & data',firstData);
    themeRow?.classList.add('appearance-setting');soundRow?.classList.add('sound-setting');cloud?.classList.add('data-setting');data?.classList.add('data-setting')
  }

  function apply(){
    if(!ensureThemeControls())return;organizeSettings();
    const s=readUX(),t=theme(s),isNeon=t==='neon';document.body.dataset.vaultTheme=t;document.body.dataset.intensity=isNeon?'neon':'supernova';syncPlanet(t);
    document.documentElement.style.setProperty('--sky-opacity','1');
    const select=document.getElementById('intensitySelect');if(select)select.value=isNeon?'neon':'supernova';
    const settingsBtn=document.getElementById('uxSettingsBtn');if(settingsBtn)settingsBtn.textContent='Settings';
    const head=document.querySelector('#uxSettings .settings-head h3');if(head)head.textContent='Settings';
    const subtitle=document.querySelector('.vault-subtitle');if(subtitle)subtitle.textContent=isNeon?'A Neon Riftbound Archive':'A Cosmic Riftbound Archive';
    const title=document.getElementById('themeAudioTitle'),help=document.getElementById('themeAudioHelp'),toggle=document.getElementById('themeAudioToggle');
    if(title)title.textContent=isNeon?'Neon audio':'Cosmic audio';
    if(help)help.textContent=isNeon?'Original cyberpunk data chirps, synth pulses, glitches, terminal clicks, and network transitions. Audio output is fixed at full.':'Celestial chimes, constellation chords, starfield sweeps, comet accents, and deep-space transitions. Audio output is fixed at full.';
    if(toggle)toggle.checked=enabled(t,s);
  }

  function play(kind='click',force=false){
    const s=readUX(),t=theme(s);if(!force&&!enabled(t,s))return;
    if(t==='neon'){window.RiftboundNeonAudio?.play?.(kind);return}
    window.RiftboundCosmicAudio?.play?.(kind);
  }

  function switchTheme(value){
    if(value==='neon')writeUX({intensity:'neon',sound:false});
    else writeUX({intensity:'supernova',sound:false});
    const next=value==='neon'?'neon':'cosmic';
    if(window.RiftboundThemeAssets?.getLoadedTheme?.()!==next){window.RiftboundThemeAssets?.switchTo?.(next);return}
    apply();setTimeout(()=>play('switch'),25);
  }

  function storageBoxes(){try{const s=JSON.parse(localStorage.getItem(APP_KEY)||'{}');return Array.isArray(s.storageBoxes)?s.storageBoxes:[]}catch{return []}}
  function decorateStorage(){const boxes=storageBoxes();document.querySelectorAll('.storage-box[data-box]').forEach(el=>{const b=boxes.find(x=>String(x.id)===String(el.dataset.box));if(!b)return;const domains=(b.domains||[]).filter(d=>DOMAINS.includes(d));let r=el.querySelector('.storage-runes');if(!r){r=document.createElement('div');r.className='storage-runes';const h=el.querySelector('h3');h?.insertAdjacentElement('afterend',r)}const html=domains.length?domains.map(d=>`<span class="storage-rune-art" title="${d}" style="--rune-art:url('${RUNE_ART[d]}')"><i>${d}</i></span>`).join(''):'<span class="storage-rune-any" title="Any domain">✦</span>';if(r.innerHTML!==html)r.innerHTML=html})}
  function refresh(){apply();decorateStorage();setTimeout(organizeSettings,60)}

  document.addEventListener('change',e=>{
    if(e.target.id==='intensitySelect'){switchTheme(e.target.value);return}
    if(e.target.id==='themeAudioToggle'){
      const t=theme(),on=e.target.checked;writeUX(t==='neon'?{neonSound:on,sound:false}:{cosmicSound:on,sound:false});apply();
      if(on)setTimeout(()=>play('switch'),25);
    }
  },true);

  document.addEventListener('click',e=>{
    if(e.target.closest('#themeAudioTest')){
      const t=theme();writeUX(t==='neon'?{neonSound:true,sound:false}:{cosmicSound:true,sound:false});apply();setTimeout(()=>play('success'),25);return;
    }
    if(e.target.closest('[data-tab="storage"],#customizeStorageBtn,#saveStorageBoxes'))setTimeout(decorateStorage,60);
  },true);

  window.addEventListener('riftbound-cloud-restored',()=>setTimeout(refresh,50));
  window.addEventListener('riftbound-local-change',e=>{if(e.detail?.key===APP_KEY)setTimeout(decorateStorage,70)});
  window.addEventListener('riftbound-social-ready',()=>setTimeout(refresh,20));

  function init(){migrate();setTimeout(refresh,0);setTimeout(refresh,500);setTimeout(decorateStorage,1100)}
  window.RiftboundTheme={play,refresh,getTheme:()=>theme(),getVolume:volume};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
