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
    const raw=rawUX();
    return {
      ...raw,
      intensity:'supernova',
      background:100,
      sound:false,
      cosmicSound:typeof raw.cosmicSound==='boolean'?raw.cosmicSound:true,
      cosmicVolume:100
    };
  }
  function writeUX(patch){
    const raw={...rawUX(),...patch};
    const next={...raw,intensity:'supernova',background:100,sound:false,cosmicVolume:100};
    localStorage.setItem(UX_KEY,JSON.stringify(next));
    return next;
  }
  function enabled(s=readUX()){return !!s.cosmicSound}
  function volume(){return 1}

  function migrate(){
    const raw=rawUX();
    writeUX({
      cosmicSound:typeof raw.cosmicSound==='boolean'?raw.cosmicSound:true,
      cosmicOnlyV1:true
    });
  }

  function ensurePlanet(){
    const line=document.querySelector('.vault-title-line');
    if(!line||line.querySelector('.vault-planet'))return;
    const p=document.createElement('span');
    p.className='vault-planet';
    p.setAttribute('aria-hidden','true');
    line.prepend(p);
  }

  function cleanLegacyThemeControls(){
    document.getElementById('soundToggle')?.closest('.setting-row')?.remove();
    document.getElementById('soundVolume')?.closest('.setting-row')?.remove();
    document.getElementById('themeAudioVolumeRow')?.remove();
    document.getElementById('backgroundRange')?.closest('.setting-row')?.remove();
    document.getElementById('appearanceSettingsTitle')?.remove();
    document.querySelectorAll('.audio-pack-note').forEach(x=>x.remove());
  }

  function ensureCosmicControls(){
    const panel=document.getElementById('uxSettings');
    if(!panel)return false;
    cleanLegacyThemeControls();

    if(!document.getElementById('themeAudioRow')){
      const row=document.createElement('div');
      row.id='themeAudioRow';
      row.className='setting-row';
      row.innerHTML='<div class="setting-copy"><strong id="themeAudioTitle">Cosmic audio</strong><small id="themeAudioHelp">Celestial chimes, constellation chords, starfield sweeps, comet accents, and deep-space transitions. Audio output is fixed at full.</small></div><div class="settings-inline-actions"><input id="themeAudioToggle" class="sound-toggle" type="checkbox" aria-label="Cosmic audio"><button id="themeAudioTest" class="theme-audio-test" type="button">Test</button></div>';
      const anchor=document.getElementById('cloudSettingRow')||document.getElementById('dataToolsSetting');
      if(anchor)anchor.insertAdjacentElement('beforebegin',row);
      else panel.appendChild(row);
    }
    return true;
  }

  function ensureSection(id,label,before){
    if(!before)return;
    let el=document.getElementById(id);
    if(!el){
      el=document.createElement('div');
      el.id=id;
      el.className='settings-section-title';
      el.textContent=label;
    }
    if(el.nextElementSibling!==before)before.insertAdjacentElement('beforebegin',el);
  }

  function organizeSettings(){
    const panel=document.getElementById('uxSettings');
    if(!panel)return;
    panel.classList.add('organized-settings');
    cleanLegacyThemeControls();
    const head=panel.querySelector('.settings-head h3');
    if(head)head.textContent='Settings';

    const soundRow=document.getElementById('themeAudioRow');
    const cloud=document.getElementById('cloudSettingRow');
    const data=document.getElementById('dataToolsSetting');
    ensureSection('soundSettingsTitle','Sound',soundRow);
    if(cloud||data)ensureSection('dataSettingsTitle','Cloud & data',cloud||data);
    soundRow?.classList.add('sound-setting');
    cloud?.classList.add('data-setting');
    data?.classList.add('data-setting');
  }

  function apply(){
    if(!ensureCosmicControls())return;
    organizeSettings();
    document.body.dataset.vaultTheme='cosmic';
    document.body.dataset.intensity='supernova';
    document.documentElement.style.setProperty('--sky-opacity','1');
    ensurePlanet();

    const settingsBtn=document.getElementById('uxSettingsBtn');
    if(settingsBtn)settingsBtn.textContent='Settings';
    const subtitle=document.querySelector('.vault-subtitle');
    if(subtitle)subtitle.textContent='A Cosmic Riftbound Archive';
    const toggle=document.getElementById('themeAudioToggle');
    if(toggle)toggle.checked=enabled();
  }

  function play(kind='click',force=false){
    if(!force&&!enabled())return;
    window.RiftboundCosmicAudio?.play?.(kind);
  }

  function storageBoxes(){
    try{
      const s=JSON.parse(localStorage.getItem(APP_KEY)||'{}');
      return Array.isArray(s.storageBoxes)?s.storageBoxes:[];
    }catch{return []}
  }

  function decorateStorage(){
    const boxes=storageBoxes();
    document.querySelectorAll('.storage-box[data-box]').forEach(el=>{
      const b=boxes.find(x=>String(x.id)===String(el.dataset.box));
      if(!b)return;
      const domains=(b.domains||[]).filter(d=>DOMAINS.includes(d));
      let r=el.querySelector('.storage-runes');
      if(!r){
        r=document.createElement('div');
        r.className='storage-runes';
        el.querySelector('h3')?.insertAdjacentElement('afterend',r);
      }
      const html=domains.length
        ?domains.map(d=>`<span class="storage-rune-art" title="${d}" style="--rune-art:url('${RUNE_ART[d]}')"><i>${d}</i></span>`).join('')
        :'<span class="storage-rune-any" title="Any domain">✦</span>';
      if(r.innerHTML!==html)r.innerHTML=html;
    });
  }

  function refresh(){
    apply();
    decorateStorage();
    setTimeout(organizeSettings,60);
  }

  document.addEventListener('change',e=>{
    if(e.target.id!=='themeAudioToggle')return;
    const on=e.target.checked;
    writeUX({cosmicSound:on});
    apply();
    if(on)setTimeout(()=>play('switch'),25);
  },true);

  document.addEventListener('click',e=>{
    if(e.target.closest('#themeAudioTest')){
      writeUX({cosmicSound:true});
      apply();
      setTimeout(()=>play('success'),25);
      return;
    }
    if(e.target.closest('[data-tab="storage"],#customizeStorageBtn,#saveStorageBoxes'))setTimeout(decorateStorage,60);
  },true);

  window.addEventListener('riftbound-cloud-restored',()=>setTimeout(refresh,50));
  window.addEventListener('riftbound-local-change',e=>{if(e.detail?.key===APP_KEY)setTimeout(decorateStorage,70)});
  window.addEventListener('riftbound-social-ready',()=>setTimeout(refresh,20));

  function init(){
    migrate();
    setTimeout(refresh,0);
    setTimeout(refresh,500);
    setTimeout(decorateStorage,1100);
  }

  window.RiftboundTheme={
    play,
    refresh,
    getTheme:()=> 'cosmic',
    getVolume:volume
  };

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});
  else init();
})();
