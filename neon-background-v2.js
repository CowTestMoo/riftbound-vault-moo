(() => {
  'use strict';

  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  const coarse = window.matchMedia('(pointer: coarse)');
  const DPR_CAP = coarse.matches ? 1.1 : 1.3;
  const MAX_RENDER_PIXELS = coarse.matches ? 2400000 : 4000000;
  const TARGET_FPS = coarse.matches ? 30 : 36;
  const FRAME_INTERVAL = 1000 / TARGET_FPS;
  const COLORS = [[57,255,216],[255,60,247],[123,92,255],[70,157,255]];
  const LABELS = ['ICE BYPASS','NODE LINKED','TRACE SPOOFED','BREACH READY','PACKET MIRROR','AUTH GHOST'];
  const GLYPHS = '01ABCDEF<>[]{}//\\#$%';
  const random = (a,b) => a + Math.random() * (b-a);
  const choose = a => a[(Math.random()*a.length)|0];

  let canvas = document.getElementById('neonSky');
  if (!canvas) {
    canvas = document.createElement('canvas');
    canvas.id = 'neonSky';
    canvas.setAttribute('aria-hidden','true');
    document.body.prepend(canvas);
  }
  const ctx = canvas.getContext('2d',{alpha:true,desynchronized:true});
  if (!ctx) return;

  const staticCanvas = document.createElement('canvas');
  const sctx = staticCanvas.getContext('2d',{alpha:false});
  if (!sctx) return;

  let w=1,h=1,dpr=1,raf=0,last=performance.now(),lastRender=0,hidden=document.hidden,active=false;
  let particles=[],rain=[],beams=[],drops=[],buildings=[];
  let glitchUntil=0,nextGlitch=0,hackUntil=0,nextHack=0,hackLabel='';
  let avg=FRAME_INTERVAL,quality=1,lastQuality=0,frameNo=0;

  const isNeon = () => document.body?.dataset?.vaultTheme === 'neon';
  const particle = () => ({x:Math.random(),y:Math.random(),r:random(.5,1.8),vx:random(-.000012,.000012),vy:random(-.00003,-.000007),a:random(.18,.6),pulse:random(.0012,.004),phase:random(0,Math.PI*2),c:choose(COLORS)});
  const rainDrop = () => ({x:Math.random(),y:Math.random(),len:random(8,27),speed:random(.00015,.00044),a:random(.04,.17),c:Math.random()<.7?COLORS[0]:COLORS[1]});
  const beam = () => ({x:random(-.3,1),y:random(.08,.82),len:random(.1,.25),speed:random(.000018,.000048),slope:random(-.2,-.08),a:random(.05,.14),width:random(.5,1.25),c:choose(COLORS)});
  const dataDrop = () => ({x:Math.random(),y:random(-.4,1),speed:random(.00004,.00011),a:random(.07,.19),size:random(8,11),chars:Array.from({length:3+((Math.random()*5)|0)},()=>choose(GLYPHS))});

  function buildBuildings(){
    buildings=[];
    let x=-.02;
    while(x<1.03){
      const bw=random(.035,.09),bh=random(.09,.31),cols=Math.max(2,Math.floor(bw*w/19)),rows=Math.max(2,Math.floor(bh*h/19)),windows=[];
      for(let r=0;r<rows;r++)for(let c=0;c<cols;c++)if(Math.random()<.31)windows.push({r,c,color:Math.random()<.58?0:1,a:random(.12,.42)});
      buildings.push({x,bw,bh,cols,rows,windows,roof:Math.random(),antenna:Math.random()<.31?random(.025,.075):0});
      x += bw + random(.003,.014);
    }
  }

  function rebuild(){
    const area=w*h;
    const scale = coarse.matches ? .82 : 1;
    particles=Array.from({length:Math.max(28,Math.min(88,Math.round(area/17000*scale)))},particle);
    rain=Array.from({length:Math.max(28,Math.min(105,Math.round(area/14500*scale)))},rainDrop);
    beams=Array.from({length:Math.max(6,Math.min(16,Math.round(w/120)))},beam);
    drops=Array.from({length:Math.max(5,Math.min(14,Math.round(w/120)))},dataDrop);
    buildBuildings();
    buildStatic();
    const now=performance.now();
    nextGlitch=now+random(3200,7200);
    nextHack=now+random(5200,10000);
  }

  function resize(){
    w=Math.max(1,innerWidth);h=Math.max(1,innerHeight);
    const pixelCap=Math.sqrt(MAX_RENDER_PIXELS/(w*h));
    dpr=Math.max(.75,Math.min(window.devicePixelRatio||1,DPR_CAP,pixelCap));
    canvas.width=Math.round(w*dpr);canvas.height=Math.round(h*dpr);canvas.style.width=`${w}px`;canvas.style.height=`${h}px`;
    staticCanvas.width=Math.round(w*dpr);staticCanvas.height=Math.round(h*dpr);
    ctx.setTransform(dpr,0,0,dpr,0,0);sctx.setTransform(dpr,0,0,dpr,0,0);
    rebuild();
    if(active) draw(performance.now(),0);
  }

  function buildStatic(){
    sctx.clearRect(0,0,w,h);
    const sky=sctx.createLinearGradient(0,0,0,h);sky.addColorStop(0,'#030108');sky.addColorStop(.42,'#0b0619');sky.addColorStop(.68,'#090814');sky.addColorStop(1,'#02050a');sctx.fillStyle=sky;sctx.fillRect(0,0,w,h);
    const mg=sctx.createRadialGradient(w*.22,h*.22,0,w*.22,h*.22,Math.max(w,h)*.48);mg.addColorStop(0,'rgba(255,60,247,.15)');mg.addColorStop(.38,'rgba(136,40,183,.05)');mg.addColorStop(1,'rgba(255,60,247,0)');sctx.fillStyle=mg;sctx.fillRect(0,0,w,h);
    const cg=sctx.createRadialGradient(w*.82,h*.30,0,w*.82,h*.30,Math.max(w,h)*.42);cg.addColorStop(0,'rgba(57,255,216,.12)');cg.addColorStop(.4,'rgba(42,136,163,.04)');cg.addColorStop(1,'rgba(57,255,216,0)');sctx.fillStyle=cg;sctx.fillRect(0,0,w,h);
    const base=h*.66;
    buildings.forEach((b,i)=>{
      const x=b.x*w,bw=b.bw*w,bh=b.bh*h,y=base-bh;
      sctx.fillStyle=i%2?'rgba(7,8,18,.98)':'rgba(4,11,17,.98)';sctx.fillRect(x,y,bw,bh);
      sctx.strokeStyle=i%3===0?'rgba(57,255,216,.10)':'rgba(255,60,247,.075)';sctx.lineWidth=.7;sctx.strokeRect(x+.5,y+.5,Math.max(0,bw-1),Math.max(0,bh-1));
      if(b.roof>.66){sctx.fillStyle='rgba(7,10,20,.98)';sctx.beginPath();sctx.moveTo(x,y);sctx.lineTo(x+bw*.5,y-random(6,18));sctx.lineTo(x+bw,y);sctx.fill()}
      if(b.antenna){const ax=x+bw*.5,ay=y-b.antenna*h;sctx.strokeStyle='rgba(57,255,216,.18)';sctx.beginPath();sctx.moveTo(ax,y);sctx.lineTo(ax,ay);sctx.stroke();sctx.fillStyle='rgba(255,60,247,.58)';sctx.fillRect(ax-1,ay-1,2,2)}
      const px=Math.max(4,bw*.14),py=Math.max(5,bh*.10),cw=(bw-px*2)/Math.max(1,b.cols),ch=(bh-py*2)/Math.max(1,b.rows);
      b.windows.forEach(win=>{const c=COLORS[win.color];sctx.fillStyle=`rgba(${c[0]},${c[1]},${c[2]},${win.a})`;sctx.fillRect(x+px+win.c*cw+cw*.24,y+py+win.r*ch+ch*.28,Math.max(1.2,cw*.3),Math.max(1,ch*.2))});
    });
    const vg=sctx.createRadialGradient(w*.5,h*.48,Math.min(w,h)*.15,w*.5,h*.48,Math.max(w,h)*.75);vg.addColorStop(0,'rgba(0,0,0,0)');vg.addColorStop(.68,'rgba(0,0,0,.05)');vg.addColorStop(1,'rgba(0,0,0,.46)');sctx.fillStyle=vg;sctx.fillRect(0,0,w,h);
  }

  function grid(time){
    const horizon=h*.64,bottom=h*1.03,center=w*.5,shift=reduced.matches?0:(time*.026)%32;
    ctx.save();ctx.lineWidth=.7;
    for(let i=0;i<20;i++){const p=(i*32+shift)/640,curve=Math.pow(Math.min(1,p),1.78),y=horizon+(bottom-horizon)*curve;if(y<horizon||y>bottom)continue;ctx.strokeStyle=`rgba(57,255,216,${.028+curve*.085})`;ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(w,y);ctx.stroke()}
    for(let i=-14;i<=14;i++){ctx.strokeStyle=`rgba(${i%2===0?'57,255,216':'255,60,247'},.06)`;ctx.beginPath();ctx.moveTo(center,horizon);ctx.lineTo(center+i*(w/11),bottom);ctx.stroke()}
    ctx.fillStyle='rgba(57,255,216,.13)';ctx.fillRect(0,horizon,w,1);ctx.restore();
  }

  function moveParticles(time,dt){
    const step=Math.min(dt,34),limit=Math.round(particles.length*quality);
    for(let i=0;i<limit;i++){const p=particles[i];if(!reduced.matches){p.x+=p.vx*step;p.y+=p.vy*step;if(p.y<-.03){p.y=1.03;p.x=Math.random()}if(p.x<-.03)p.x=1.03;if(p.x>1.03)p.x=-.03}const a=p.a*(reduced.matches?1:.66+.34*Math.sin(time*p.pulse+p.phase)),c=p.c;ctx.fillStyle=`rgba(${c[0]},${c[1]},${c[2]},${a})`;ctx.beginPath();ctx.arc(p.x*w,p.y*h,p.r,0,Math.PI*2);ctx.fill()}
  }

  function moveRain(dt){
    const step=Math.min(dt,34),limit=Math.round(rain.length*quality);ctx.lineWidth=.6;
    for(let i=0;i<limit;i++){const r=rain[i];if(!reduced.matches){r.y+=r.speed*step;r.x-=r.speed*step*.16;if(r.y>1.08){r.y=-.08;r.x=Math.random()}if(r.x<-.05)r.x=1.03}const c=r.c,x=r.x*w,y=r.y*h;ctx.strokeStyle=`rgba(${c[0]},${c[1]},${c[2]},${r.a})`;ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x-r.len*.17,y+r.len);ctx.stroke()}
  }

  function moveBeams(dt){
    if(quality<.72&&frameNo%2)return;
    const step=Math.min(dt,34),limit=Math.round(beams.length*Math.max(.6,quality));ctx.save();ctx.globalCompositeOperation='lighter';
    for(let i=0;i<limit;i++){const b=beams[i];if(!reduced.matches){b.x+=b.speed*step;if(b.x>1.28){b.x=-.32;b.y=random(.08,.82)}}const c=b.c,x=b.x*w,y=b.y*h,len=b.len*w;ctx.strokeStyle=`rgba(${c[0]},${c[1]},${c[2]},${b.a})`;ctx.lineWidth=b.width;ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+len,y+len*b.slope);ctx.stroke()}
    ctx.restore();
  }

  function dataRain(dt){
    if(quality<.78||(coarse.matches&&frameNo%2))return;
    const step=Math.min(dt,34);ctx.save();ctx.font='10px ui-monospace,SFMono-Regular,Menlo,monospace';ctx.textAlign='center';
    drops.forEach(d=>{if(!reduced.matches){d.y+=d.speed*step;if(d.y>1.15){d.y=random(-.35,-.05);d.x=Math.random();d.chars=d.chars.map(()=>choose(GLYPHS))}}ctx.fillStyle=`rgba(57,255,216,${d.a})`;d.chars.forEach((ch,i)=>ctx.fillText(ch,d.x*w,d.y*h+i*d.size))});ctx.restore();
  }

  function glitch(time){
    if(reduced.matches)return;
    if(time>=nextGlitch){glitchUntil=time+random(70,150);nextGlitch=time+random(3600,8200)}
    if(time>glitchUntil)return;
    ctx.save();ctx.globalCompositeOperation='screen';
    for(let i=0;i<2+((Math.random()*3)|0);i++){const y=random(0,h),hh=random(2,12),off=random(-18,18),cyan=Math.random()>.45;ctx.fillStyle=cyan?'rgba(57,255,216,.06)':'rgba(255,60,247,.06)';ctx.fillRect(off,y,w,hh);ctx.fillStyle=cyan?'rgba(255,60,247,.025)':'rgba(57,255,216,.025)';ctx.fillRect(-off*.45,y+1,w,hh*.55)}ctx.restore();
  }

  function hack(time){
    if(reduced.matches)return;
    if(time>=nextHack){hackUntil=time+random(700,1300);nextHack=time+random(6500,12000);hackLabel=choose(LABELS)}
    if(time>hackUntil)return;
    const alpha=Math.min(.34,Math.max(0,(hackUntil-time)/1200*.36));ctx.save();ctx.font=`600 ${coarse.matches?10:11}px ui-monospace,SFMono-Regular,Menlo,monospace`;ctx.fillStyle=`rgba(57,255,216,${alpha})`;ctx.fillText(`> ${hackLabel}`,18,30);ctx.fillStyle=`rgba(255,60,247,${alpha*.7})`;ctx.fillText(`0x${((time*31)|0).toString(16).slice(-6).padStart(6,'0').toUpperCase()} // ${((time/17)|0)%9999}`,18,47);ctx.strokeStyle=`rgba(57,255,216,${alpha*.45})`;ctx.strokeRect(12,14,Math.min(235,w*.5),43);ctx.restore();
  }

  function sweep(time){if(reduced.matches||quality<.7)return;const y=((time%5600)/5600)*h;ctx.fillStyle='rgba(57,255,216,.018)';ctx.fillRect(0,y-14,w,28);ctx.fillStyle='rgba(57,255,216,.055)';ctx.fillRect(0,y,w,1)}

  function adapt(dt,now){
    avg=avg*.94+Math.min(50,dt)*.06;
    if(now-lastQuality<1800)return;
    if(avg>FRAME_INTERVAL*1.35&&quality>.58){quality=Math.max(.58,quality-.12);lastQuality=now}
    else if(avg<FRAME_INTERVAL*1.12&&quality<1){quality=Math.min(1,quality+.08);lastQuality=now}
  }

  function draw(time,dt){
    frameNo++;
    ctx.clearRect(0,0,w,h);
    ctx.drawImage(staticCanvas,0,0,w,h);
    moveBeams(dt);moveParticles(time,dt);moveRain(dt);dataRain(dt);grid(time);sweep(time);glitch(time);hack(time);
  }

  function frame(now){if(!active||hidden){raf=0;return}raf=requestAnimationFrame(frame);if(now-lastRender<FRAME_INTERVAL)return;const dt=Math.min(50,now-last);last=now;lastRender=now;adapt(dt,now);draw(now,dt)}
  function restart(){cancelAnimationFrame(raf);raf=0;if(!active||hidden){ctx.clearRect(0,0,w,h);return}last=performance.now();lastRender=last;draw(last,0);if(!reduced.matches)raf=requestAnimationFrame(frame)}
  function syncTheme(){const next=isNeon();if(next===active)return;active=next;restart()}

  const observer=new MutationObserver(syncTheme);observer.observe(document.body,{attributes:true,attributeFilter:['data-vault-theme']});
  addEventListener('resize',resize,{passive:true});
  document.addEventListener('visibilitychange',()=>{hidden=document.hidden;if(hidden)cancelAnimationFrame(raf);else restart()});
  if(typeof reduced.addEventListener==='function')reduced.addEventListener('change',restart);
  addEventListener('riftbound-cloud-restored',syncTheme);

  resize();syncTheme();
})();
