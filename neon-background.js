(() => {
  'use strict';

  const reducedMotion=window.matchMedia('(prefers-reduced-motion: reduce)');
  const DPR_CAP=1.75;
  let canvas=document.getElementById('neonSky');
  if(!canvas){canvas=document.createElement('canvas');canvas.id='neonSky';canvas.setAttribute('aria-hidden','true');document.body.prepend(canvas)}
  const ctx=canvas.getContext('2d',{alpha:true});
  if(!ctx)return;

  let width=1,height=1,dpr=1,raf=0,last=performance.now(),active=false,hidden=document.hidden;
  let particles=[],rain=[],beams=[],buildings=[],glitchUntil=0,nextGlitch=0;
  const random=(a,b)=>a+Math.random()*(b-a);
  const choose=a=>a[(Math.random()*a.length)|0];
  const neonColors=[[57,255,216],[255,60,247],[123,92,255],[70,157,255]];

  function isNeon(){return document.body?.dataset?.vaultTheme==='neon'}

  function makeParticle(){return{x:Math.random(),y:Math.random(),r:random(.55,2.4),vx:random(-.000012,.000012),vy:random(-.000034,-.000008),alpha:random(.22,.72),pulse:random(.0012,.0042),phase:random(0,Math.PI*2),color:choose(neonColors)}}
  function makeRain(){return{x:Math.random(),y:Math.random(),len:random(10,36),speed:random(.00016,.00052),alpha:random(.05,.24),color:Math.random()<.66?neonColors[0]:neonColors[1]}}
  function makeBeam(){return{x:random(-.3,1),y:random(.08,.82),len:random(.10,.28),speed:random(.000018,.000055),slope:random(-.20,-.08),alpha:random(.06,.20),width:random(.55,1.8),color:choose(neonColors)}}

  function rebuildBuildings(){
    buildings=[];
    let x=-.02;
    while(x<1.03){
      const w=random(.035,.09),h=random(.09,.31),roof=Math.random();
      const cols=Math.max(2,Math.floor(w*width/18)),rows=Math.max(2,Math.floor(h*height/18));
      const windows=[];
      for(let row=0;row<rows;row++)for(let col=0;col<cols;col++)if(Math.random()<.33)windows.push({row,col,color:Math.random()<.58?0:1,alpha:random(.14,.46)});
      buildings.push({x,w,h,roof,cols,rows,windows,antenna:Math.random()<.34?random(.025,.075):0});
      x+=w+random(.003,.014);
    }
  }

  function rebuild(){
    const area=width*height;
    const particleCount=Math.max(34,Math.min(115,Math.round(area/14000)));
    const rainCount=Math.max(38,Math.min(150,Math.round(area/10500)));
    particles=Array.from({length:particleCount},makeParticle);
    rain=Array.from({length:rainCount},makeRain);
    beams=Array.from({length:Math.max(8,Math.min(22,Math.round(width/90)))},makeBeam);
    rebuildBuildings();
    nextGlitch=performance.now()+random(3800,8200);
  }

  function resize(){
    dpr=Math.min(window.devicePixelRatio||1,DPR_CAP);width=Math.max(1,window.innerWidth);height=Math.max(1,window.innerHeight);
    canvas.width=Math.round(width*dpr);canvas.height=Math.round(height*dpr);canvas.style.width=`${width}px`;canvas.style.height=`${height}px`;ctx.setTransform(dpr,0,0,dpr,0,0);rebuild();
    if(active)draw(performance.now(),0);
  }

  function backdrop(time){
    const sky=ctx.createLinearGradient(0,0,0,height);sky.addColorStop(0,'#030108');sky.addColorStop(.42,'#0b0619');sky.addColorStop(.68,'#090814');sky.addColorStop(1,'#02050a');ctx.fillStyle=sky;ctx.fillRect(0,0,width,height);
    const horizonY=height*.63;
    const magenta=ctx.createRadialGradient(width*.22,height*.22,0,width*.22,height*.22,Math.max(width,height)*.48);magenta.addColorStop(0,'rgba(255,60,247,.16)');magenta.addColorStop(.38,'rgba(136,40,183,.055)');magenta.addColorStop(1,'rgba(255,60,247,0)');ctx.fillStyle=magenta;ctx.fillRect(0,0,width,height);
    const cyan=ctx.createRadialGradient(width*.82,height*.30,0,width*.82,height*.30,Math.max(width,height)*.42);cyan.addColorStop(0,'rgba(57,255,216,.13)');cyan.addColorStop(.4,'rgba(42,136,163,.045)');cyan.addColorStop(1,'rgba(57,255,216,0)');ctx.fillStyle=cyan;ctx.fillRect(0,0,width,height);
    const hg=ctx.createLinearGradient(0,horizonY-100,0,horizonY+80);hg.addColorStop(0,'rgba(57,255,216,0)');hg.addColorStop(.45,'rgba(57,255,216,.055)');hg.addColorStop(.55,'rgba(255,60,247,.045)');hg.addColorStop(1,'rgba(0,0,0,0)');ctx.fillStyle=hg;ctx.fillRect(0,horizonY-110,width,200);
  }

  function drawSkyline(time){
    const base=height*.66;
    ctx.save();
    for(let i=0;i<buildings.length;i++){
      const b=buildings[i],x=b.x*width,w=b.w*width,h=b.h*height,y=base-h;
      const bg=ctx.createLinearGradient(x,y,x+w,y);bg.addColorStop(0,'rgba(5,8,17,.98)');bg.addColorStop(.55,'rgba(10,8,23,.99)');bg.addColorStop(1,'rgba(3,12,17,.98)');ctx.fillStyle=bg;ctx.fillRect(x,y,w,h);
      ctx.strokeStyle=i%3===0?'rgba(57,255,216,.10)':'rgba(255,60,247,.075)';ctx.lineWidth=.7;ctx.strokeRect(x+.5,y+.5,Math.max(0,w-1),Math.max(0,h-1));
      if(b.roof>.66){ctx.fillStyle='rgba(7,10,20,.98)';ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+w*.5,y-random(0,0));ctx.lineTo(x+w,y);ctx.fill()}
      if(b.antenna){const ax=x+w*.5,ay=y-b.antenna*height;ctx.strokeStyle='rgba(57,255,216,.18)';ctx.beginPath();ctx.moveTo(ax,y);ctx.lineTo(ax,ay);ctx.stroke();ctx.fillStyle='rgba(255,60,247,.65)';ctx.shadowBlur=8;ctx.shadowColor='rgba(255,60,247,.7)';ctx.fillRect(ax-1,ay-1,2,2);ctx.shadowBlur=0}
      const padX=Math.max(4,w*.14),padY=Math.max(5,h*.10),cellW=(w-padX*2)/Math.max(1,b.cols),cellH=(h-padY*2)/Math.max(1,b.rows);
      for(const win of b.windows){const wx=x+padX+win.col*cellW+cellW*.24,wy=y+padY+win.row*cellH+cellH*.28,c=neonColors[win.color],flicker=reducedMotion.matches?1:.72+.28*Math.sin(time*.0011+i+win.row*.8+win.col*.5);ctx.fillStyle=`rgba(${c[0]},${c[1]},${c[2]},${win.alpha*flicker})`;ctx.fillRect(wx,wy,Math.max(1.2,cellW*.30),Math.max(1,cellH*.20))}
    }
    ctx.restore();
  }

  function drawGrid(time){
    const horizon=height*.64,bottom=height*1.03,center=width*.5;
    ctx.save();ctx.lineWidth=.75;ctx.shadowBlur=7;ctx.shadowColor='rgba(57,255,216,.16)';
    const shift=reducedMotion.matches?0:(time*.028)%32;
    for(let i=0;i<22;i++){
      const p=(i*32+shift)/704,curved=Math.pow(Math.min(1,p),1.78),y=horizon+(bottom-horizon)*curved;
      if(y<horizon||y>bottom)continue;
      ctx.strokeStyle=`rgba(57,255,216,${.035+curved*.10})`;ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(width,y);ctx.stroke();
    }
    for(let i=-16;i<=16;i++){
      const edge=center+i*(width/12);ctx.strokeStyle=`rgba(${i%2===0?'57,255,216':'255,60,247'},.075)`;ctx.beginPath();ctx.moveTo(center,horizon);ctx.lineTo(edge,bottom);ctx.stroke();
    }
    const horizonGlow=ctx.createLinearGradient(0,horizon-8,0,horizon+20);horizonGlow.addColorStop(0,'rgba(57,255,216,0)');horizonGlow.addColorStop(.5,'rgba(57,255,216,.22)');horizonGlow.addColorStop(1,'rgba(255,60,247,0)');ctx.fillStyle=horizonGlow;ctx.fillRect(0,horizon-10,width,30);ctx.shadowBlur=0;ctx.restore();
  }

  function drawParticles(time,dt){
    const step=Math.min(dt,34);
    for(const p of particles){if(!reducedMotion.matches){p.x+=p.vx*step;p.y+=p.vy*step;if(p.y<-.03){p.y=1.03;p.x=Math.random()}if(p.x<-.03)p.x=1.03;if(p.x>1.03)p.x=-.03}const a=p.alpha*(reducedMotion.matches?1:.65+.35*Math.sin(time*p.pulse+p.phase)),x=p.x*width,y=p.y*height,c=p.color;ctx.shadowBlur=9;ctx.shadowColor=`rgba(${c[0]},${c[1]},${c[2]},${a*.7})`;ctx.fillStyle=`rgba(${c[0]},${c[1]},${c[2]},${a})`;ctx.beginPath();ctx.arc(x,y,p.r,0,Math.PI*2);ctx.fill()}ctx.shadowBlur=0;
  }

  function drawRain(dt){
    const step=Math.min(dt,34);
    ctx.lineWidth=.65;
    for(const r of rain){if(!reducedMotion.matches){r.y+=r.speed*step;r.x-=r.speed*step*.16;if(r.y>1.08){r.y=-.08;r.x=Math.random()}if(r.x<-.05)r.x=1.03}const x=r.x*width,y=r.y*height,c=r.color;ctx.strokeStyle=`rgba(${c[0]},${c[1]},${c[2]},${r.alpha})`;ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x-r.len*.17,y+r.len);ctx.stroke()}
  }

  function drawBeams(dt){
    const step=Math.min(dt,34);ctx.save();ctx.globalCompositeOperation='lighter';
    for(const b of beams){if(!reducedMotion.matches){b.x+=b.speed*step;if(b.x>1.28){b.x=-.32;b.y=random(.08,.82)}}const x=b.x*width,y=b.y*height,l=b.len*width,c=b.color,g=ctx.createLinearGradient(x,y,x+l,y+l*b.slope);g.addColorStop(0,`rgba(${c[0]},${c[1]},${c[2]},0)`);g.addColorStop(.25,`rgba(${c[0]},${c[1]},${c[2]},${b.alpha})`);g.addColorStop(.8,`rgba(${c[0]},${c[1]},${c[2]},${b.alpha*.55})`);g.addColorStop(1,`rgba(${c[0]},${c[1]},${c[2]},0)`);ctx.strokeStyle=g;ctx.lineWidth=b.width;ctx.shadowBlur=14;ctx.shadowColor=`rgba(${c[0]},${c[1]},${c[2]},${b.alpha})`;ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+l,y+l*b.slope);ctx.stroke()}
    ctx.restore();ctx.shadowBlur=0;
  }

  function maybeGlitch(time){
    if(reducedMotion.matches)return;
    if(time>=nextGlitch){glitchUntil=time+random(80,170);nextGlitch=time+random(4200,9300)}
    if(time>glitchUntil)return;
    const strips=2+((Math.random()*4)|0);ctx.save();ctx.globalCompositeOperation='screen';
    for(let i=0;i<strips;i++){const y=random(0,height),h=random(2,15),offset=random(-22,22),cyan=Math.random()>.45;ctx.fillStyle=cyan?'rgba(57,255,216,.055)':'rgba(255,60,247,.055)';ctx.fillRect(offset,y,width,h)}
    ctx.restore();
  }

  function vignette(){const g=ctx.createRadialGradient(width*.5,height*.48,Math.min(width,height)*.15,width*.5,height*.48,Math.max(width,height)*.75);g.addColorStop(0,'rgba(0,0,0,0)');g.addColorStop(.68,'rgba(0,0,0,.06)');g.addColorStop(1,'rgba(0,0,0,.48)');ctx.fillStyle=g;ctx.fillRect(0,0,width,height)}

  function draw(time,dt){ctx.clearRect(0,0,width,height);backdrop(time);drawBeams(dt);drawParticles(time,dt);drawRain(dt);drawSkyline(time);drawGrid(time);maybeGlitch(time);vignette()}

  function frame(now){if(!active||hidden)return;const dt=now-last;last=now;draw(now,dt);raf=requestAnimationFrame(frame)}
  function syncTheme(){const next=isNeon();if(next===active)return;active=next;cancelAnimationFrame(raf);if(active){last=performance.now();draw(last,0);if(!hidden&&!reducedMotion.matches)raf=requestAnimationFrame(frame)}else ctx.clearRect(0,0,width,height)}
  function restart(){cancelAnimationFrame(raf);syncTheme();if(active){last=performance.now();draw(last,0);if(!hidden&&!reducedMotion.matches)raf=requestAnimationFrame(frame)}}

  const themeObserver=new MutationObserver(syncTheme);themeObserver.observe(document.body,{attributes:true,attributeFilter:['data-vault-theme']});
  window.addEventListener('resize',resize,{passive:true});
  document.addEventListener('visibilitychange',()=>{hidden=document.hidden;if(hidden)cancelAnimationFrame(raf);else restart()});
  if(typeof reducedMotion.addEventListener==='function')reducedMotion.addEventListener('change',restart);
  window.addEventListener('riftbound-cloud-restored',syncTheme);
  resize();syncTheme();
})();
