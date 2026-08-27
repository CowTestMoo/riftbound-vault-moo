(() => {
  'use strict';

  const UX_KEY='riftbound-vault-ux-v1';
  let ctx=null,noiseBuffer=null,lastHover=0,lastClick=0,lastInput=0,transitionLock=0;

  function readUX(){try{return {intensity:'supernova',neonSound:false,neonVolume:38,...JSON.parse(localStorage.getItem(UX_KEY)||'{}')}}catch{return {intensity:'supernova',neonSound:false,neonVolume:38}}}
  function active(){const s=readUX();return document.body?.dataset?.vaultTheme==='neon'&&s.intensity==='neon'&&!!s.neonSound}
  function volume(){return Math.max(0,Math.min(1,Number(readUX().neonVolume??38)/100))}
  function audio(){ctx||=new (window.AudioContext||window.webkitAudioContext)();if(ctx.state==='suspended')ctx.resume();return ctx}

  function getNoise(c){
    if(noiseBuffer&&noiseBuffer.sampleRate===c.sampleRate)return noiseBuffer;
    const len=Math.floor(c.sampleRate*.45);noiseBuffer=c.createBuffer(1,len,c.sampleRate);const d=noiseBuffer.getChannelData(0);
    for(let i=0;i<len;i++)d[i]=(Math.random()*2-1)*(.72+Math.sin(i*.071)*.18);
    return noiseBuffer;
  }

  function out(c,v=1){const g=c.createGain();g.gain.value=Math.max(.0001,volume()*v);g.connect(c.destination);return g}
  function panNode(c,p=0){if(!c.createStereoPanner)return null;const n=c.createStereoPanner();n.pan.value=Math.max(-1,Math.min(1,p));return n}

  function osc({c,start=0,f=220,to=null,dur=.08,type='square',gain=.04,pan=0,attack=.004,filter=0,q=.8}){
    const o=c.createOscillator(),g=c.createGain(),master=out(c,1),p=panNode(c,pan);let tail=g;
    o.type=type;o.frequency.setValueAtTime(Math.max(20,f),start);if(to)o.frequency.exponentialRampToValueAtTime(Math.max(20,to),start+dur);
    g.gain.setValueAtTime(.0001,start);g.gain.exponentialRampToValueAtTime(Math.max(.0002,gain),start+attack);g.gain.exponentialRampToValueAtTime(.0001,start+dur);
    if(filter){const bi=c.createBiquadFilter();bi.type='lowpass';bi.frequency.value=filter;bi.Q.value=q;o.connect(bi);bi.connect(g)}else o.connect(g);
    if(p){g.connect(p);p.connect(master)}else g.connect(master);
    o.start(start);o.stop(start+dur+.02);
  }

  function noise({c,start=0,dur=.05,gain=.025,pan=0,high=1200,low=0}){
    const src=c.createBufferSource(),g=c.createGain(),hp=c.createBiquadFilter(),master=out(c,1),p=panNode(c,pan);src.buffer=getNoise(c);hp.type='highpass';hp.frequency.value=high;let tail=hp;src.connect(hp);
    if(low){const lp=c.createBiquadFilter();lp.type='lowpass';lp.frequency.value=low;hp.connect(lp);tail=lp}
    tail.connect(g);g.gain.setValueAtTime(Math.max(.0001,gain),start);g.gain.exponentialRampToValueAtTime(.0001,start+dur);
    if(p){g.connect(p);p.connect(master)}else g.connect(master);src.start(start);src.stop(start+dur+.01)
  }

  function click(){const c=audio(),t=c.currentTime;osc({c,start:t,f:410,to:620,dur:.038,type:'square',gain:.018,filter:1900});noise({c,start:t+.004,dur:.025,gain:.009,high:2600});}
  function tab(){const c=audio(),t=c.currentTime;osc({c,start:t,f:155,to:245,dur:.065,type:'sawtooth',gain:.024,filter:1300,pan:-.15});osc({c,start:t+.026,f:520,to:690,dur:.055,type:'square',gain:.014,filter:2300,pan:.18});}
  function filter(){const c=audio(),t=c.currentTime;osc({c,start:t,f:680,to:900,dur:.035,type:'square',gain:.012,filter:2800,pan:.1});noise({c,start:t,dur:.019,gain:.006,high:3500});}
  function card(){const c=audio(),t=c.currentTime;osc({c,start:t,f:98,to:130,dur:.11,type:'sine',gain:.026,filter:620});osc({c,start:t+.025,f:430,to:760,dur:.085,type:'triangle',gain:.014,filter:1800});}
  function add(){const c=audio(),t=c.currentTime;osc({c,start:t,f:180,to:255,dur:.08,type:'sawtooth',gain:.022,filter:1200});osc({c,start:t+.04,f:510,to:810,dur:.085,type:'square',gain:.014,filter:2600,pan:.2});osc({c,start:t+.085,f:760,to:980,dur:.07,type:'triangle',gain:.012,pan:-.1});}
  function remove(){const c=audio(),t=c.currentTime;osc({c,start:t,f:410,to:190,dur:.105,type:'sawtooth',gain:.02,filter:1100});noise({c,start:t+.018,dur:.045,gain:.009,high:1800});}
  function settings(){const c=audio(),t=c.currentTime;osc({c,start:t,f:130,to:195,dur:.08,type:'triangle',gain:.02,filter:900});osc({c,start:t+.036,f:860,to:720,dur:.065,type:'square',gain:.011,filter:2600});}
  function close(){const c=audio(),t=c.currentTime;osc({c,start:t,f:520,to:215,dur:.075,type:'square',gain:.016,filter:1500});noise({c,start:t+.012,dur:.03,gain:.006,high:2200});}
  function storage(){const c=audio(),t=c.currentTime;osc({c,start:t,f:76,to:92,dur:.12,type:'sine',gain:.032,filter:420});noise({c,start:t+.015,dur:.055,gain:.009,high:700,low:2400});osc({c,start:t+.055,f:330,to:440,dur:.07,type:'triangle',gain:.011,filter:1300});}
  function search(){const c=audio(),t=c.currentTime;osc({c,start:t,f:1180,to:1340,dur:.018,type:'square',gain:.006,filter:3600,pan:.15});}
  function hover(){const c=audio(),t=c.currentTime;osc({c,start:t,f:980,to:1120,dur:.018,type:'square',gain:.0045,filter:3200});}
  function success(){const c=audio(),t=c.currentTime;[330,495,660,990].forEach((f,i)=>osc({c,start:t+i*.034,f,to:f*1.08,dur:.11,type:i%2?'square':'triangle',gain:.014/(1+i*.16),filter:2500,pan:(i-1.5)*.13}));noise({c,start:t+.012,dur:.045,gain:.006,high:3000});}

  function transition(){
    if(!active())return;const now=performance.now();if(now<transitionLock)return;transitionLock=now+1200;
    const c=audio(),t=c.currentTime;
    /* Stage 1: encrypted link handshake */
    noise({c,start:t,dur:.09,gain:.018,high:2100,low:6200,pan:-.35});
    [220,294,392,523].forEach((f,i)=>osc({c,start:t+i*.052,f:f*.82,to:f*1.42,dur:.09,type:'square',gain:.012,filter:2200,pan:-.45+i*.3}));
    /* Stage 2: rising network sweep */
    osc({c,start:t+.18,f:58,to:168,dur:.48,type:'sawtooth',gain:.034,filter:760,pan:0});
    osc({c,start:t+.21,f:310,to:1680,dur:.43,type:'triangle',gain:.017,filter:2600,pan:-.24});
    osc({c,start:t+.25,f:420,to:2100,dur:.39,type:'square',gain:.010,filter:3300,pan:.28});
    for(let i=0;i<7;i++){noise({c,start:t+.27+i*.047,dur:.018,gain:.0065+(i*.0006),high:2700,pan:(i%2?1:-1)*.42});}
    /* Stage 3: visual glitch burst */
    noise({c,start:t+.63,dur:.11,gain:.028,high:1050,low:7200});
    osc({c,start:t+.64,f:1900,to:190,dur:.10,type:'sawtooth',gain:.022,filter:3100,pan:-.22});
    osc({c,start:t+.68,f:1540,to:260,dur:.08,type:'square',gain:.018,filter:2600,pan:.25});
    /* Stage 4: destination handoff / access granted */
    osc({c,start:t+.77,f:54,to:72,dur:.23,type:'sine',gain:.052,filter:300});
    [440,660,880,1320].forEach((f,i)=>osc({c,start:t+.79+i*.045,f,to:f*1.025,dur:.16,type:i===3?'square':'triangle',gain:.017/(1+i*.12),filter:2800,pan:(i-1.5)*.16}));
    noise({c,start:t+.82,dur:.035,gain:.005,high:3900});
  }

  function classify(target){
    if(target.closest('#friendBackBtn,#friendBrowseAnother'))return 'tab';
    if(target.closest('[data-friend-user]'))return null;
    if(target.closest('#friendSettingsBtn,#uxSettingsBtn'))return 'settings';
    if(target.closest('[data-close],.settings-close'))return 'close';
    if(target.closest('[data-adjust]'))return Number(target.closest('[data-adjust]').dataset.adjust)>0?'add':'remove';
    if(target.closest('[data-bulk],[data-fast-bulk],#bulkAddBtn'))return 'add';
    if(target.closest('.filter-chip,[data-friend-filter],[data-friend-tab]'))return 'filter';
    if(target.closest('.tab,[data-mobile-tab],#browseLibrariesUtilityBtn'))return 'tab';
    if(target.closest('.storage-box,[data-box],#customizeStorageBtn'))return 'storage';
    if(target.closest('.card-tile,.friend-card,[data-recent-card]'))return 'card';
    return target.closest('button')?'click':null;
  }

  const sounds={click,tab,filter,card,add,remove,settings,close,storage,search,hover,success,complete:success,transition};
  function play(kind='click'){if(!active())return;try{(sounds[kind]||click)()}catch{}}

  document.addEventListener('click',e=>{
    if(!active())return;
    if(e.target.closest('[data-friend-user]')){transition();return}
    const now=performance.now();if(now-lastClick<28)return;lastClick=now;const kind=classify(e.target);if(kind)play(kind);
  },true);

  document.addEventListener('pointerover',e=>{
    if(!active()||!window.matchMedia('(hover:hover) and (pointer:fine)').matches)return;
    const hit=e.target.closest('button,.card-tile,.storage-box,.friend-card');if(!hit||hit.contains(e.relatedTarget))return;
    const now=performance.now();if(now-lastHover<115)return;lastHover=now;hover();
  },true);

  document.addEventListener('input',e=>{
    if(!active()||!e.target.matches('input[type="search"],#cardSearch,#friendCardSearch,#friendUserSearch'))return;
    const now=performance.now();if(now-lastInput<125)return;lastInput=now;search();
  },true);

  /* Public hook used by the friend-library transition and future Neon animations. */
  window.RiftboundNeonAudio={play,transition,isEnabled:active};
})();
