(() => {
  'use strict';

  const reducedMotion=window.matchMedia('(prefers-reduced-motion: reduce)');
  const coarse=window.matchMedia('(pointer: coarse)');
  const DPR_CAP=coarse.matches?1.35:1.6;
  let canvas=document.getElementById('neonSky');
  if(!canvas){canvas=document.createElement('canvas');canvas.id='neonSky';canvas.setAttribute('aria-hidden','true');document.body.prepend(canvas)}
  const ctx=canvas.getContext('2d',{alpha:true,desynchronized:true});
  if(!ctx)return;

  const staticCanvas=document.createElement('canvas');
  const staticCtx=staticCanvas.getContext('2d',{alpha:false});
  if(!staticCtx)return;

  let width=1,height=1,dpr=1,raf=0,last=performance.now(),active=false,hidden=document.hidden;
  let particles=[],rain=[],beams=[],buildings=[],dataDrops=[];
  let glitchUntil=0,nextGlitch=0,nextHackPulse=0,hackPulseUntil=0,hackLabel='';
  let frameAvg=16.7,quality=1,lastQualityChange=0,frameIndex=0;
  const random=(a,b)=>a+Math.random()*(b-a);
  const choose=a=>a[(Math.random()*a.length)|0];
  const neonColors=[[57,255,216],[255,60,247],[123,92,255],[70,157,255]];
  const hackLabels=['ICE BYPASS','NODE LINKED','TRACE SPOOFED','BREACH READY','PACKET MIRROR','AUTH GHOST'];
  const glyphs='01ABCDEF<>[]{}//\\#$%';

  function isNeon(){return document.body?.dataset?.vaultTheme==='neon'}
  function makeParticle(){return{x:Math.random(),y:Math.random(),r:random(.5,1.9),vx:random(-.000012,.000012),vy:random(-.000032,-.000007),alpha:random(.18,.62),pulse:random(.0012,.004),phase:random(0,Math.PI*2),color:choose(neonColors)}}
  function makeRain(){return{x:Math.random(),y:Math.random(),len:random(8,28),speed:random(.00015,.00046),alpha:random(.04,.18),color:Math.random()<.68?neonColors[0]:neonColors[1]}}
  function makeBeam(){return{x:random(-.3,1),y:random(.08,.82),len:random(.10,.26),speed:random(.000018,.00005),slope:random(-.20,-.08),alpha:random(.05,.15),width:random(.5,1.35),color:choose(neonColors)}}
  function makeDataDrop(){return{x:Math.random(),y:random(-.4,1),speed:random(.00004,.00012),alpha:random(.08,.22),size:random(8,12),chars:Array.from({length:3+((Math.random()*5)|0)},()=>choose(glyphs))}}

  function rebuildBuildings(){
    buildings=[];let x=-.02;
    while(x<1.03){
      const w=random(.035,.09),h=random(.09,.31),roof=Math.random();
      const cols=Math.max(2,Math.floor(w*width/19)),rows=Math.max(2,Math.floor(h*height/19)),windows=[];
      for(let row=0;row<rows;row++)for(let col=0;col<cols;col++)if(Math.random()<.31)windows.push({row,col,color:Math.random()<.58?0:1,alpha:random(.12,.42)});
      buildings.push({x,w,h,roof,cols,rows,windows,antenna:Math.random()<.31?random(.025,.075):0});
      x+=w+random(.003,.014);
    }
  }

  function rebuild(){
    const area=width*height,scale=coarse.matches?.82:1;
    particles=Array.from({length:Math.max(28,Math.min(88,Math.round(area/17000*scale)))},makeParticle);
    rain=Array.from({length:Math.max(28,Math.min(105,Math.round(area/14500*scale)))},makeRain);
    beams=Array.from({length:Math.max(6,Math.min(16,Math.round(width/120)))},makeBeam);
    dataDrops=Array.from({length:Math.max(5,Math.min(14,Math.round(width/120)))},makeDataDrop);
    rebuildBuildings();buildStaticLayer();
    nextGlitch=performance.now()+random(3200,7200);nextHackPulse=performance.now()+random(5200,10000);
  }

  function resize(){
    dpr=Math.min(window.devicePixelRatio||1,DPR_CAP);width=Math.max(1,window.innerWidth);height=Math.max(1,window.innerHeight);
    canvas.width=Math.round(width*dpr);canvas.height=Math.round(height*dpr);canvas.style.width=`${width}px`;canvas.style.height=`${height}px`;ctx.setTransform(dpr,0,0,dpr,0,0);
    staticCanvas.width=Math.round(width*dpr);staticCanvas.height=Math.round(height*dpr);staticCtx.setTransform(dpr,0,0,dpr,0,0);
    rebuild();if(active)draw(performance.now(),0);
  }

  function buildStaticLayer(){
    staticCtx.clearRect(0,0,width,height);
    const sky=staticCtx.createLinearGradient(0,0,0,height);sky.addColorStop(0,'#030108');sky.addColorStop(.42,'#0b0619');sky.addColorStop(.68,'#090814');sky.addColorStop(1,'#02050a');staticCtx.fillStyle=sky;staticCtx.fillRect(0,0,width,height);
    const magenta=staticCtx.createRadialGradient(width*.22,height*.22,0,width*.22,height*.22,Math.max(width,height)*.48);magenta.addColorStop(0,'rgba(255,60,247,.15)');magenta.addColorStop(.38,'rgba(136,40,183,.05)');magenta.addColorStop(1,'rgba(255,60,247,0)');staticCtx.fillStyle=magenta;staticCtx.fillRect(0,0,width,height);
    const cyan=staticCtx.createRadialGradient(width*.82,height*.30,0,width*.82,height*.30,Math.max(width,height)*.42);cyan.addColorStop(0,'rgba(57,255,216,.12)');cyan.addColorStop(.4,'rgba(42,136,163,.04)');cyan.addColorStop(1,'rgba(57,255,216,0)');staticCtx.fillStyle=cyan;staticCtx.fillRect(0,0,width,height);
    drawSkylineStatic();drawVignetteStatic();
  }

  function drawSkylineStatic(){
    const base=height*.66;staticCtx.save();
    for(let i=0;i<buildings.length;i++){
      const b=buildings[i],x=b.x*width,w=b.w*width,h=b.h*height,y=base-h;
      const bg=staticCtx.createLinearGradient(x,y,x+w,y);bg.addColorStop(0,'rgba(5,8,17,.98)');bg.addColorStop(.55,'rgba(10,8,23,.99)');bg.addColorStop(1,'rgba(3,12,17,.98)');staticCtx.fillStyle=bg;staticCtx.fillRect(x,y,w,h);
      staticCtx.strokeStyle=i%3===0?'rgba(57,255,216,.10)':'rgba(255,60,247,.075)';staticCtx.lineWidth=.7;staticCtx.strokeRect(x+.5,y+.5,Math.max(0,w-1),Math.max(0,h-1));
      if(b.roof>.66){staticCtx.fillStyle='rgba(7,10,20,.98)';staticCtx.beginPath();staticCtx.moveTo(x,y);staticCtx.lineTo(x+w*.5,y-random(6,18));staticCtx.lineTo(x+w,y);staticCtx.fill()}
      if(b.antenna){const ax=x+w*.5,ay=y-b.antenna*height;staticCtx.strokeStyle='rgba(57,255,216,.18)';staticCtx.beginPath();staticCtx.moveTo(ax,y);staticCtx.lineTo(ax,ay);staticCtx.stroke();staticCtx.fillStyle='rgba(255,60,247,.58)';staticCtx.fillRect(ax-1,ay-1,2,2)}
      const padX=Math.max(4,w*.14),padY=Math.max(5,h*.10),cellW=(w-padX*2)/Math.max(1,b.cols),cellH=(h-padY*2)/Math.max(1,b.rows);
      for(const win of b.windows){const wx=x+padX+win.col*cellW+cellW*.24,wy=y+padY+win.row*cellH+cellH*.28,c=neonColors[win.color];staticCtx.fillStyle=`rgba(${c[0]},${c[1]},${c[2]},${win.alpha})`;staticCtx.fillRect(wx,wy,Math.max(1.2,cellW*.30),Math.max(1,cellH*.20))}
    }
    staticCtx.restore();
  }

  function drawVignetteStatic(){const g=staticCtx.createRadialGradient(width*.5,height*.48,Math.min(width,height)*.15,width*.5,height*.48,Math.max(width,height)*.75);g.addColorStop(0,'rgba(0,0,0,0)');g.addColorStop(.68,'rgba(0,0,0,.05)');g.addColorStop(1,'rgba(0,0,0,.46)');staticCtx.fillStyle=g;staticCtx.fillRect(0,0,width,height)}

  function drawGrid(time){
    const horizon=height*.64,bottom=height*1.03,center=width*.5;ctx.save();ctx.lineWidth=.7;
    const shift=reducedMotion.matches?0:(time*.026)%32;
    for(let i=0;i<20;i++){const p=(i*32+shift)/640,curved=Math.pow(Math.min(1,p),1.78),y=horizon+(bottom-horizon)*curved;if(y<horizon||y>bottom)continue;ctx.strokeStyle=`rgba(57,255,216,${.028+curved*.085})`;ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(width,y);ctx.stroke()}
    for(let i=-14;i<=14;i++){const edge=center+i*(width/11);ctx.strokeStyle=`rgba(${i%2===0?'57,255,216':'255,60,247'},.06)`;ctx.beginPath();ctx.moveTo(center,horizon);ctx.lineTo(edge,bottom);ctx.stroke()}
    ctx.fillStyle='rgba(57,255,216,.13)';ctx.fillRect(0,horizon,width,1);ctx.restore();
  }

  function drawParticles(time,dt){
    const step=Math.min(dt,34),limit=Math.round(particles.length*quality);
    for(let i=0;i<limit;i++){const p=particles[i];if(!reducedMotion.matches){p.x+=p.vx*step;p.y+=p.vy*step;if(p.y<-.03){p.y=1.03;p.x=Math.random()}if(p.x<-.03)p.x=1.03;if(p.x>1.03)p.x=-.03}const a=p.alpha*(reducedMotion.matches?1:.66+.34*Math.sin(time*p.pulse+p.phase)),x=p.x*width,y=p.y*height,c=p.color;ctx.fillStyle=`rgba(${c[0]},${c[1]},${c[2]},${a})`;ctx.beginPath();ctx.arc(x,y,p.r,0,Math.PI*2);ctx.fill()}
  }

  function drawRain(dt){
    const step=Math.min(dt,34),limit=Math.round(rain.length*quality);ctx.lineWidth=.6;
    for(let i=0;i<limit;i++){const r=rain[i];if(!reducedMotion.matches){r.y+=r.speed*step;r.x-=r.speed*step*.16;if(r.y>1.08){r.y=-.08;r.x=Math.random()}if(r.x<-.05)r.x=1.03}const x=r.x*width,y=r.y*height,c=r.color;ctx.strokeStyle=`rgba(${c[0]},${c[1]},${c[2]},${r.alpha})`;ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x-r.len*.17,y+r.len);ctx.stroke()}
  }

  function drawBeams(dt){
    if(quality<.72&&frameIndex%2)return;const step=Math.min(dt,34),limit=Math.round(beams.length*Math.max(.6,quality));ctx.save();ctx.globalCompositeOperation='lighter';
    for(let i=0;i<limit;i++){const b=beams[i];if(!reducedMotion.matches){b.x+=b.speed*step;if(b.x>1.28){b.x=-.32;b.y=random(.08,.82)}}const x=b.x*width,y=b.y*height,l=b.len*width,c=b.color;ctx.strokeStyle=`rgba(${c[0]},${c[1]},${c[2]},${b.alpha})`;ctx.lineWidth=b.width;ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+l,y+l*b.slope);ctx.stroke()}
    ctx.restore();
  }

  function drawDataRain(dt){
    if(quality<.78||coarse.matches&&frameIndex%2)return;const step=Math.min(dt,34);ctx.save();ctx.font='10px ui-monospace,SFMono-Regular,Menlo,monospace';ctx.textAlign='center';
    for(const d of dataDrops){if(!reducedMotion.matches){d.y+=d.speed*step;if(d.y>1.15){d.y=random(-.35,-.05);d.x=Math.random();d.chars=Array.from({length:d.chars.length},()=>choose(glyphs))}}ctx.fillStyle=`rgba(57,255,216,${d.alpha})`;for(let i=0;i<d.chars.length;i++)ctx.fillText(d.chars[i],d.x*width,d.y*height+i*d.size)}
    ctx.restore();
  }

  function maybeGlitch(time){
    if(reducedMotion.matches)return;
    if(time>=nextGlitch){glitchUntil=time+random(70,150);nextGlitch=time+random(3600,8200)}
    if(time>glitchUntil)return;
    const strips=2+((Math.random()*3)|0);ctx.save();ctx.globalCompositeOperation='screen';
    for(let i=0;i<strips;i++){const y=random(0,height),h=random(2,12),offset=random(-18,18),cyan=Math.random()>.45;ctx.fillStyle=cyan?'rgba(57,255,216,.06)':'rgba(255,60,247,.06)';ctx.fillRect(offset,y,width,h);ctx.fillStyle=cyan?'rgba(255,60,247,.025)':'rgba(57,255,216,.025)';ctx.fillRect(-offset*.45,y+1,width,h*.55)}
    ctx.restore();
  }

  function maybeHackPulse(time){
    if(reducedMotion.matches)return;
    if(time>=nextHackPulse){hackPulseUntil=time+random(700,1300);nextHackPulse=time+random(6500,12000);hackLabel=choose(hackLabels)}
    if(time>hackPulseUntil)return;
    const remain=(hackPulseUntil-time)/1200,alpha=Math.min(.34,Math.max(0,remain*.36));ctx.save();ctx.font=`600 ${coarse.matches?10:11}px ui-monospace,SFMono-Regular,Menlo,monospace`;ctx.letterSpacing='1px';ctx.fillStyle=`rgba(57,255,216,${alpha})`;ctx.fillText(`> ${hackLabel}`,18,30);ctx.fillStyle=`rgba(255,60,247,${alpha*.7})`;ctx.fillText(`0x${((time*31)|0).toString(16).slice(-6).padStart(6,'0').toUpperCase()} // ${((time/17)|0)%9999}`,18,47);ctx.strokeStyle=`rgba(57,255,216,${alpha*.45})`;ctx.strokeRect(12,14,Math.min(235,width*.5),43);ctx.restore();
  }

  function scanSweep(time){
    if(reducedMotion.matches||quality<.7)return;const cycle=(time%5600)/5600,y=cycle*height;ctx.fillStyle='rgba(57,255,216,.018)';ctx.fillRect(0,y-14,width,28);ctx.fillStyle='rgba(57,255,216,.055)';ctx.fillRect(0,y,width,1);
  }

  function adapt(dt,now){
    frameAvg=frameAvg*.94+Math.min(50,dt)*.06;
    if(now-lastQualityChange<1800)return;
    if(frameAvg>22&&quality>.58){quality=Math.max(.58,quality-.12);lastQualityChange=now}
    else if(frameAvg<18&&quality<1){quality=Math.min(1,quality+.08);lastQualityChange=now}
    document.documentElement.style.setProperty('--neon-quality',quality.toFixed(2));
  }

  function draw(time,dt){
    frameIndex++;ctx.clearRect(0,0,width,height);ctx.drawImage(staticCanvas,0,0,width*dpr,height*dpr,0,0,width,height);drawBeams(dt);drawParticles(time,dt);drawRain(dt);drawDataRain(dt);drawGrid(time);scanSweep(time);maybeGlitch(time);maybeHackPulse(time)
  }

  function frame(now){if(!active||hidden)return;const dt=Math.min(50,now-last);last=now;adapt(dt,now);draw(now,dt);raf=requestAnimationFrame(frame)}
  function syncTheme(){const next=isNeon();if(next===active)return;active=next;cancelAnimationFrame(raf);if(active){last=performance.now();draw(last,0);if(!hidden&&!reducedMotion.matches)raf=requestAnimationFrame(frame)}else ctx.clearRect(0,0,width,height)}
  function restart(){cancelAnimationFrame(raf);if(!active||hidden){ctx.clearRect(0,0,width,height);return}last=performance.now();draw(last,0);if(!reducedMotion.matches)raf=requestAnimationFrame(frame)}

  const themeObserver=new MutationObserver(syncTheme);themeObserver.observe(document.body,{attributes:true,attributeFilter:['data-vault-theme']});
  window.addEventListener('resize',resize,{passive:true});
  document.addEventListener('visibilitychange',()=>{hidden=document.hidden;if(hidden)cancelAnimationFrame(raf);else restart()});
  if(typeof reducedMotion.addEventListener==='function')reducedMotion.addEventListener('change',restart);
  window.addEventListener('riftbound-cloud-restored',syncTheme);
  resize();syncTheme();
})();
