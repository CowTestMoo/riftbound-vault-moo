(() => {
  'use strict';

  const UX_KEY='riftbound-vault-ux-v1';
  let ctx=null,noiseBuffer=null,lastHover=0,lastClick=0,lastInput=0,lastStarfield=0,transitionLock=0;

  function readUX(){try{return {intensity:'supernova',cosmicSound:false,cosmicVolume:42,...JSON.parse(localStorage.getItem(UX_KEY)||'{}')}}catch{return {intensity:'supernova',cosmicSound:false,cosmicVolume:42}}}
  function active(){const s=readUX();return document.body?.dataset?.vaultTheme==='cosmic'&&s.intensity!=='neon'&&!!s.cosmicSound}
  function volume(){return Math.max(0,Math.min(1,Number(readUX().cosmicVolume??42)/100))}
  function audio(){ctx||=new (window.AudioContext||window.webkitAudioContext)();if(ctx.state==='suspended')ctx.resume();return ctx}

  function output(c,scale=1){const g=c.createGain();g.gain.value=Math.max(.0001,volume()*scale);g.connect(c.destination);return g}
  function panner(c,value=0){if(!c.createStereoPanner)return null;const p=c.createStereoPanner();p.pan.value=Math.max(-1,Math.min(1,value));return p}

  function tone({c,start=0,f=440,to=null,dur=.12,type='sine',gain=.025,pan=0,attack=.008,filter=0,q=.7,echo=0}){
    const o=c.createOscillator(),g=c.createGain(),master=output(c,1),p=panner(c,pan);o.type=type;o.frequency.setValueAtTime(Math.max(20,f),start);if(to)o.frequency.exponentialRampToValueAtTime(Math.max(20,to),start+dur);
    g.gain.setValueAtTime(.0001,start);g.gain.exponentialRampToValueAtTime(Math.max(.0002,gain),start+attack);g.gain.exponentialRampToValueAtTime(.0001,start+dur);
    let head=o;
    if(filter){const bi=c.createBiquadFilter();bi.type='lowpass';bi.frequency.value=filter;bi.Q.value=q;o.connect(bi);head=bi}
    head.connect(g);
    const tail=p||master;if(p){g.connect(p);p.connect(master)}else g.connect(master);
    if(echo>0){const d=c.createDelay(.7),eg=c.createGain(),ep=panner(c,-pan*.65);d.delayTime.value=echo;eg.gain.value=.22;g.connect(d);d.connect(eg);if(ep){eg.connect(ep);ep.connect(master)}else eg.connect(master)}
    o.start(start);o.stop(start+dur+.03);
  }

  function getNoise(c){if(noiseBuffer&&noiseBuffer.sampleRate===c.sampleRate)return noiseBuffer;const len=Math.floor(c.sampleRate*.72);noiseBuffer=c.createBuffer(1,len,c.sampleRate);const data=noiseBuffer.getChannelData(0);for(let i=0;i<len;i++){const white=Math.random()*2-1;data[i]=white*(.64+.18*Math.sin(i*.017)+.12*Math.sin(i*.0031))}return noiseBuffer}

  function noise({c,start=0,dur=.1,gain=.012,pan=0,high=600,low=0,band=0,q=.8,fadeIn=.01}){
    const src=c.createBufferSource(),g=c.createGain(),master=output(c,1),p=panner(c,pan);src.buffer=getNoise(c);let head=src;
    if(high){const hp=c.createBiquadFilter();hp.type='highpass';hp.frequency.value=high;head.connect(hp);head=hp}
    if(low){const lp=c.createBiquadFilter();lp.type='lowpass';lp.frequency.value=low;head.connect(lp);head=lp}
    if(band){const bp=c.createBiquadFilter();bp.type='bandpass';bp.frequency.value=band;bp.Q.value=q;head.connect(bp);head=bp}
    head.connect(g);g.gain.setValueAtTime(.0001,start);g.gain.exponentialRampToValueAtTime(Math.max(.0002,gain),start+fadeIn);g.gain.exponentialRampToValueAtTime(.0001,start+dur);
    if(p){g.connect(p);p.connect(master)}else g.connect(master);src.start(start);src.stop(start+dur+.02)
  }

  function sweepNoise({c,start=0,dur=.35,gain=.016,from=500,to=5200,pan=0}){
    const src=c.createBufferSource(),bp=c.createBiquadFilter(),g=c.createGain(),master=output(c,1),p=panner(c,pan);src.buffer=getNoise(c);bp.type='bandpass';bp.Q.value=.65;bp.frequency.setValueAtTime(from,start);bp.frequency.exponentialRampToValueAtTime(to,start+dur);g.gain.setValueAtTime(.0001,start);g.gain.exponentialRampToValueAtTime(gain,start+.05);g.gain.exponentialRampToValueAtTime(.0001,start+dur);src.connect(bp);bp.connect(g);if(p){g.connect(p);p.connect(master)}else g.connect(master);src.start(start);src.stop(start+dur+.02)
  }

  function click(){const c=audio(),t=c.currentTime;tone({c,start:t,f:790,to:1040,dur:.055,type:'sine',gain:.010,filter:3100,echo:.10});tone({c,start:t+.014,f:1560,to:1420,dur:.048,type:'triangle',gain:.006,pan:.18,filter:3800});}
  function hover(){const c=audio(),t=c.currentTime;tone({c,start:t,f:1760,to:1880,dur:.035,type:'sine',gain:.0038,pan:.12,filter:4200});}
  function search(){const c=audio(),t=c.currentTime;tone({c,start:t,f:1320,to:1510,dur:.025,type:'sine',gain:.0048,pan:.22,filter:4000,echo:.07});}
  function filter(){const c=audio(),t=c.currentTime;tone({c,start:t,f:660,to:880,dur:.07,type:'triangle',gain:.009,pan:-.12,filter:2600,echo:.11});tone({c,start:t+.026,f:1320,to:1760,dur:.065,type:'sine',gain:.0055,pan:.18,filter:4100});}
  function tab(){const c=audio(),t=c.currentTime;[392,587.33,783.99].forEach((f,i)=>tone({c,start:t+i*.036,f,to:f*1.035,dur:.13,type:i===0?'triangle':'sine',gain:.011/(1+i*.16),pan:(i-1)*.18,filter:2800,echo:.14}));}
  function card(){const c=audio(),t=c.currentTime;tone({c,start:t,f:82,to:104,dur:.18,type:'sine',gain:.025,filter:420});tone({c,start:t+.025,f:392,to:523.25,dur:.17,type:'triangle',gain:.010,filter:1600,echo:.16});tone({c,start:t+.07,f:1046.5,to:1174.66,dur:.13,type:'sine',gain:.0048,pan:.22,filter:3600,echo:.20});}
  function storage(){const c=audio(),t=c.currentTime;tone({c,start:t,f:55,to:68,dur:.23,type:'sine',gain:.031,filter:280});noise({c,start:t+.015,dur:.10,gain:.007,high:220,low:1400,pan:-.15});tone({c,start:t+.075,f:261.63,to:329.63,dur:.14,type:'triangle',gain:.008,pan:.12,filter:1200,echo:.17});}
  function add(){const c=audio(),t=c.currentTime;[329.63,493.88,659.25,987.77].forEach((f,i)=>tone({c,start:t+i*.043,f,to:f*1.065,dur:.15,type:i%2?'sine':'triangle',gain:.0105/(1+i*.13),pan:(i-1.5)*.16,filter:3100,echo:.13}));sweepNoise({c,start:t+.02,dur:.20,gain:.0055,from:1250,to:5200,pan:.15});}
  function remove(){const c=audio(),t=c.currentTime;[659.25,493.88,329.63,220].forEach((f,i)=>tone({c,start:t+i*.038,f,to:f*.82,dur:.13,type:i%2?'triangle':'sine',gain:.009/(1+i*.12),pan:(1.5-i)*.14,filter:2200,echo:.10}));noise({c,start:t+.04,dur:.09,gain:.005,high:700,low:2500,pan:-.2});}
  function settings(){const c=audio(),t=c.currentTime;tone({c,start:t,f:174.61,to:220,dur:.10,type:'triangle',gain:.011,filter:1000});tone({c,start:t+.035,f:698.46,to:880,dur:.10,type:'sine',gain:.0065,pan:.2,filter:3000,echo:.14});}
  function close(){const c=audio(),t=c.currentTime;tone({c,start:t,f:880,to:440,dur:.11,type:'sine',gain:.008,filter:2300,echo:.08});tone({c,start:t+.02,f:329.63,to:246.94,dur:.10,type:'triangle',gain:.006,pan:-.18,filter:1300});}
  function success(){const c=audio(),t=c.currentTime;[392,523.25,659.25,783.99,1046.5].forEach((f,i)=>tone({c,start:t+i*.042,f,to:f*1.025,dur:.19,type:i===0?'triangle':'sine',gain:.0115/(1+i*.12),pan:(i-2)*.12,filter:3500,echo:.18}));sweepNoise({c,start:t+.03,dur:.27,gain:.005,from:1500,to:6200});}
  function switchSound(){const c=audio(),t=c.currentTime;tone({c,start:t,f:98,to:147,dur:.24,type:'sine',gain:.025,filter:420});[440,659.25,880].forEach((f,i)=>tone({c,start:t+.06+i*.045,f,to:f*1.045,dur:.18,type:'sine',gain:.0085/(1+i*.12),pan:(i-1)*.2,filter:3200,echo:.16}));sweepNoise({c,start:t+.02,dur:.26,gain:.0045,from:700,to:4400});}

  function starfield(){
    if(!active())return;const now=performance.now();if(now-lastStarfield<9000)return;lastStarfield=now;
    const c=audio(),t=c.currentTime,pan=Math.random()>.5?.42:-.42;tone({c,start:t,f:1180,to:2210,dur:.22,type:'sine',gain:.0038,pan,filter:4200,echo:.19});sweepNoise({c,start:t,dur:.20,gain:.0028,from:1800,to:7200,pan});
  }

  function transition(){
    if(!active())return;const now=performance.now();if(now<transitionLock)return;transitionLock=now+1250;
    const c=audio(),t=c.currentTime;

    /* 0.00s: the vault drops away into deep space */
    tone({c,start:t,f:42,to:58,dur:.50,type:'sine',gain:.045,filter:220});
    tone({c,start:t+.015,f:84,to:116,dur:.46,type:'sine',gain:.018,pan:-.1,filter:380});
    noise({c,start:t,dur:.30,gain:.008,high:120,low:1200,pan:-.2,fadeIn:.06});

    /* 0.08s: stars begin streaking across the field */
    sweepNoise({c,start:t+.07,dur:.46,gain:.014,from:420,to:7600,pan:-.45});
    sweepNoise({c,start:t+.12,dur:.42,gain:.011,from:650,to:9200,pan:.48});
    [523.25,783.99,1174.66,1567.98].forEach((f,i)=>tone({c,start:t+.10+i*.055,f:f*.78,to:f*1.34,dur:.22,type:'sine',gain:.0068/(1+i*.12),pan:-.45+i*.3,filter:4700,echo:.17}));

    /* 0.34s: constellation rings open */
    [261.63,392,523.25,783.99].forEach((f,i)=>tone({c,start:t+.34+i*.045,f,to:f*1.055,dur:.28,type:i===0?'triangle':'sine',gain:.011/(1+i*.1),pan:(i-1.5)*.18,filter:3300,echo:.21}));
    noise({c,start:t+.38,dur:.18,gain:.006,high:1800,low:6800,pan:.18});

    /* 0.61s: warp crest, matched to the portal's largest expansion */
    tone({c,start:t+.58,f:54,to:96,dur:.25,type:'sine',gain:.055,filter:300});
    sweepNoise({c,start:t+.55,dur:.25,gain:.020,from:900,to:9800,pan:0});
    tone({c,start:t+.62,f:1760,to:3520,dur:.16,type:'sine',gain:.008,pan:.32,filter:5600,echo:.12});
    tone({c,start:t+.65,f:1320,to:2640,dur:.15,type:'triangle',gain:.007,pan:-.34,filter:4800,echo:.12});

    /* 0.80s: arriving in the other library, bright celestial confirmation */
    [392,587.33,783.99,1174.66,1567.98].forEach((f,i)=>tone({c,start:t+.78+i*.052,f,to:f*1.018,dur:.26,type:i===0?'triangle':'sine',gain:.013/(1+i*.14),pan:(i-2)*.14,filter:4200,echo:.22}));
    tone({c,start:t+.82,f:65,to:82,dur:.32,type:'sine',gain:.036,filter:260});
    noise({c,start:t+.86,dur:.14,gain:.0048,high:2800,low:9200});
  }

  function classify(target){
    if(target.closest('[data-friend-user]'))return null;
    if(target.closest('#friendBackBtn,#friendBrowseAnother,#browseLibrariesUtilityBtn'))return 'tab';
    if(target.closest('#friendSettingsBtn,#uxSettingsBtn'))return 'settings';
    if(target.closest('[data-close],.settings-close'))return 'close';
    if(target.closest('[data-adjust]'))return Number(target.closest('[data-adjust]').dataset.adjust)>0?'add':'remove';
    if(target.closest('[data-bulk],[data-fast-bulk],#bulkAddBtn'))return 'add';
    if(target.closest('.filter-chip,[data-friend-filter],[data-friend-tab]'))return 'filter';
    if(target.closest('.tab,[data-mobile-tab]'))return 'tab';
    if(target.closest('.storage-box,[data-box],#customizeStorageBtn'))return 'storage';
    if(target.closest('.card-tile,.friend-card,[data-recent-card]'))return 'card';
    return target.closest('button')?'click':null;
  }

  const sounds={click,hover,search,filter,tab,card,storage,add,remove,settings,close,success,complete:success,switch:switchSound,transition,starfield};
  function play(kind='click'){if(!active())return;try{(sounds[kind]||click)()}catch{}}

  document.addEventListener('click',e=>{
    if(!active())return;
    if(e.target.closest('[data-friend-user]')){transition();return}
    const now=performance.now();if(now-lastClick<28)return;lastClick=now;const kind=classify(e.target);if(kind)play(kind);
  },true);

  document.addEventListener('pointerover',e=>{
    if(!active()||!window.matchMedia('(hover:hover) and (pointer:fine)').matches)return;
    const hit=e.target.closest('button,.card-tile,.storage-box,.friend-card');if(!hit||hit.contains(e.relatedTarget))return;
    const now=performance.now();if(now-lastHover<125)return;lastHover=now;hover();
  },true);

  document.addEventListener('input',e=>{
    if(!active()||!e.target.matches('input[type="search"],#cardSearch,#friendCardSearch,#friendUserSearch'))return;
    const now=performance.now();if(now-lastInput<145)return;lastInput=now;search();
  },true);

  window.addEventListener('riftbound-cosmic-shooter',starfield);
  window.RiftboundCosmicAudio={play,transition,starfield,isEnabled:active};
})();
