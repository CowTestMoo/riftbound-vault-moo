(() => {
  'use strict';

  const canvas = document.getElementById('cosmicSky');
  if (!canvas) return;
  const ctx = canvas.getContext('2d', { alpha: true });
  if (!ctx) return;

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const coarsePointer = window.matchMedia('(pointer: coarse)');
  const DPR_CAP = coarsePointer.matches ? 1.15 : 1.35;
  const MAX_RENDER_PIXELS = coarsePointer.matches ? 2600000 : 4200000;
  const TARGET_FPS = coarsePointer.matches ? 30 : 36;
  const FRAME_INTERVAL = 1000 / TARGET_FPS;
  let width = 0;
  let height = 0;
  let dpr = 1;
  let stars = [];
  let shooters = [];
  let raf = 0;
  let last = performance.now();
  let lastRender = 0;
  let nextShooter = last + 1800;
  let hidden = document.hidden;
  let active = document.body?.dataset?.vaultTheme !== 'neon';

  const realConstellations = [
    {name:'Orion',color:[124,230,255],phase:.3,speed:.000032,box:{x:.06,y:.12,w:.31,h:.34},stars:[{ra:88.8,dec:7.4,mag:.42},{ra:81.3,dec:6.3,mag:1.64},{ra:83.0,dec:.3,mag:2.23},{ra:84.1,dec:-1.2,mag:1.69},{ra:85.2,dec:-1.9,mag:1.77},{ra:78.6,dec:-8.2,mag:.13},{ra:86.9,dec:-9.7,mag:2.09}],links:[[0,1],[0,4],[1,2],[2,3],[3,4],[2,5],[4,6],[5,6]]},
    {name:'Cassiopeia',color:[255,225,159],phase:1.4,speed:-.000025,box:{x:.66,y:.08,w:.26,h:.16},stars:[{ra:2.295,dec:59.15,mag:2.27},{ra:10.125,dec:56.54,mag:2.23},{ra:14.175,dec:60.72,mag:2.47},{ra:21.45,dec:60.24,mag:2.68},{ra:28.605,dec:63.67,mag:3.37}],links:[[0,1],[1,2],[2,3],[3,4]]},
    {name:'Cygnus',color:[121,160,255],phase:2.7,speed:.000022,box:{x:.68,y:.43,w:.27,h:.34},stars:[{ra:310.365,dec:45.28,mag:1.25},{ra:305.55,dec:40.26,mag:2.23},{ra:311.55,dec:33.97,mag:2.48},{ra:296.25,dec:45.13,mag:2.87},{ra:292.68,dec:27.96,mag:3.08}],links:[[0,1],[1,4],[3,1],[1,2]]},
    {name:'Scorpius',color:[124,230,255],phase:4.0,speed:-.000019,box:{x:.04,y:.57,w:.35,h:.29},stars:[{ra:247.35,dec:-26.43,mag:.96},{ra:263.4,dec:-37.10,mag:1.63},{ra:240.09,dec:-22.62,mag:2.32},{ra:241.365,dec:-19.81,mag:2.62},{ra:252.54,dec:-34.29,mag:2.29}],links:[[3,2],[2,0],[0,4],[4,1]]},
    {name:'Crux',color:[255,225,159],phase:5.2,speed:.000017,box:{x:.49,y:.72,w:.11,h:.18},stars:[{ra:186.6496,dec:-63.0991,mag:.76},{ra:191.930,dec:-59.6886,mag:1.25},{ra:187.791,dec:-57.1132,mag:1.63},{ra:183.786,dec:-58.7489,mag:2.80}],links:[[0,2],[3,1]]},
    {name:'Lyra',color:[121,160,255],phase:.9,speed:-.000021,box:{x:.43,y:.11,w:.14,h:.20},stars:[{ra:279.2347,dec:38.7837,mag:.03},{ra:282.5200,dec:33.3627,mag:3.42},{ra:284.7359,dec:32.6896,mag:3.25},{ra:283.6262,dec:36.8986,mag:4.30},{ra:281.2008,dec:37.5946,mag:5.59}],links:[[0,4],[4,3],[3,2],[2,1],[1,4]]},
    {name:'Andromeda',color:[124,230,255],phase:3.5,speed:.000015,box:{x:.34,y:.37,w:.29,h:.15},stars:[{ra:2.10,dec:29.09,mag:2.06},{ra:9.825,dec:30.86,mag:3.27},{ra:17.43,dec:35.62,mag:2.05},{ra:30.975,dec:42.33,mag:2.10},{ra:14.205,dec:38.50,mag:3.86}],links:[[0,1],[1,2],[2,3],[2,4]]}
  ];

  const random=(min,max)=>min+Math.random()*(max-min);
  function isCosmic(){return document.body?.dataset?.vaultTheme!=='neon'}
  function makeStar(){const depth=Math.pow(Math.random(),1.7);return{x:Math.random(),y:Math.random(),depth,radius:random(.4,1.75)+depth,alpha:random(.24,.96),phase:random(0,Math.PI*2),twinkle:random(.001,.0052),drift:random(.000004,.000022),tint:Math.random()};}
  function rebuildStars(){const count=Math.max(220,Math.min(coarsePointer.matches?560:660,Math.round((width*height)/4300)));stars=Array.from({length:count},makeStar);}
  function resize(){width=Math.max(1,window.innerWidth);height=Math.max(1,window.innerHeight);const pixelCap=Math.sqrt(MAX_RENDER_PIXELS/(width*height));dpr=Math.max(.75,Math.min(window.devicePixelRatio||1,DPR_CAP,pixelCap));canvas.width=Math.round(width*dpr);canvas.height=Math.round(height*dpr);canvas.style.width=`${width}px`;canvas.style.height=`${height}px`;ctx.setTransform(dpr,0,0,dpr,0,0);rebuildStars();if(active)draw(performance.now(),0);}
  function sceneDrift(time,scale=1){if(reducedMotion.matches)return[0,0];return[Math.sin(time*.00009)*16*scale+Math.cos(time*.000037)*8*scale,Math.cos(time*.000073)*12*scale+Math.sin(time*.000041)*7*scale];}

  function drawNebula(time){
    const t=time*.00005,[dx,dy]=sceneDrift(time,1.25);
    const blobs=[ [.15+Math.sin(t)*.045,.15+Math.cos(t*.7)*.035,.46,[68,117,255],.13], [.78+Math.cos(t*.85)*.055,.23+Math.sin(t*.62)*.04,.40,[78,223,255],.11], [.53+Math.sin(t*.48)*.05,.82+Math.cos(t*.73)*.04,.52,[105,72,255],.12], [.36+Math.cos(t*.38)*.035,.47+Math.sin(t*.52)*.03,.34,[255,199,111],.055] ];
    for(const [nx,ny,scale,rgb,alpha] of blobs){const x=nx*width+dx*scale,y=ny*height+dy*scale,r=Math.max(width,height)*scale,g=ctx.createRadialGradient(x,y,0,x,y,r);g.addColorStop(0,`rgba(${rgb[0]},${rgb[1]},${rgb[2]},${alpha})`);g.addColorStop(.45,`rgba(${rgb[0]},${rgb[1]},${rgb[2]},${alpha*.36})`);g.addColorStop(1,`rgba(${rgb[0]},${rgb[1]},${rgb[2]},0)`);ctx.fillStyle=g;ctx.fillRect(0,0,width,height);}
  }

  function drawStars(time){
    const [baseX,baseY]=sceneDrift(time,.7);
    for(const s of stars){if(!reducedMotion.matches){s.y-=s.drift*(.45+s.depth);s.x+=Math.sin(time*.00008+s.phase)*s.drift*.08;if(s.y<-.02){s.y=1.02;s.x=Math.random();}if(s.x<-.02)s.x=1.02;if(s.x>1.02)s.x=-.02;}const parallax=.25+s.depth*1.15,x=s.x*width+baseX*parallax,y=s.y*height+baseY*parallax,twinkle=reducedMotion.matches?1:.68+.32*Math.sin(time*s.twinkle+s.phase),a=s.alpha*twinkle,r=s.radius*(.72+s.depth*.48);let rgb='220,235,255';if(s.tint>.82)rgb='124,230,255';else if(s.tint<.10)rgb='255,225,159';if(r>1.35){const halo=ctx.createRadialGradient(x,y,0,x,y,r*5.8);halo.addColorStop(0,`rgba(${rgb},${a*.38})`);halo.addColorStop(1,`rgba(${rgb},0)`);ctx.fillStyle=halo;ctx.beginPath();ctx.arc(x,y,r*5.8,0,Math.PI*2);ctx.fill();}ctx.fillStyle=`rgba(${rgb},${a})`;ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fill();}
  }

  function projectedConstellation(c,time){
    const meanDec=c.stars.reduce((sum,s)=>sum+s.dec,0)/c.stars.length,cosDec=Math.cos(meanDec*Math.PI/180),raw=c.stars.map(s=>({x:s.ra*cosDec,y:-s.dec,mag:s.mag})),minX=Math.min(...raw.map(p=>p.x)),maxX=Math.max(...raw.map(p=>p.x)),minY=Math.min(...raw.map(p=>p.y)),maxY=Math.max(...raw.map(p=>p.y)),rawW=Math.max(.001,maxX-minX),rawH=Math.max(.001,maxY-minY),targetW=c.box.w*width,targetH=c.box.h*height,scale=Math.min(targetW/rawW,targetH/rawH),usedW=rawW*scale,usedH=rawH*scale,originX=c.box.x*width+(targetW-usedW)/2,originY=c.box.y*height+(targetH-usedH)/2,[globalX,globalY]=sceneDrift(time,.38),localX=reducedMotion.matches?0:Math.sin(time*.000095+c.phase)*7,localY=reducedMotion.matches?0:Math.cos(time*.000081+c.phase)*5,angle=reducedMotion.matches?0:Math.sin(time*c.speed+c.phase)*.018,cx=originX+usedW/2,cy=originY+usedH/2,ca=Math.cos(angle),sa=Math.sin(angle);
    return raw.map(p=>{const px=originX+(p.x-minX)*scale,py=originY+(p.y-minY)*scale,dx=px-cx,dy=py-cy;return{x:cx+dx*ca-dy*sa+globalX+localX,y:cy+dx*sa+dy*ca+globalY+localY,mag:p.mag};});
  }

  function drawConstellations(time){
    const minSide=Math.min(width,height);
    for(const c of realConstellations){
      const pulse=reducedMotion.matches ? .52 : .43+.16*Math.sin(time*.001+c.phase),pts=projectedConstellation(c,time);
      ctx.lineWidth=Math.max(.65,minSide/1250);ctx.strokeStyle=`rgba(${c.color[0]},${c.color[1]},${c.color[2]},${pulse*.42})`;ctx.shadowBlur=8;ctx.shadowColor=`rgba(${c.color[0]},${c.color[1]},${c.color[2]},.22)`;
      for(const [a,b] of c.links){ctx.beginPath();ctx.moveTo(pts[a].x,pts[a].y);ctx.lineTo(pts[b].x,pts[b].y);ctx.stroke();}
      ctx.shadowBlur=0;
      pts.forEach((p,i)=>{const magFactor=Math.max(.72,Math.min(1.7,1.65-(p.mag||2)*.18)),glow=(3.2+(i%3)*.8)*magFactor,halo=ctx.createRadialGradient(p.x,p.y,0,p.x,p.y,glow*4.4);halo.addColorStop(0,`rgba(${c.color[0]},${c.color[1]},${c.color[2]},${.24+pulse*.26})`);halo.addColorStop(1,`rgba(${c.color[0]},${c.color[1]},${c.color[2]},0)`);ctx.fillStyle=halo;ctx.beginPath();ctx.arc(p.x,p.y,glow*4.4,0,Math.PI*2);ctx.fill();ctx.fillStyle=`rgba(${c.color[0]},${c.color[1]},${c.color[2]},${.78+pulse*.18})`;ctx.beginPath();ctx.arc(p.x,p.y,(1.25+(i%2)*.45)*magFactor,0,Math.PI*2);ctx.fill();});
    }
  }

  function spawnShooter(){const direction=Math.random()<.84?-1:1,startX=direction<0?random(width*.45,width*1.08):random(-width*.08,width*.3);shooters.push({x:startX,y:random(-height*.04,height*.48),vx:direction<0?random(-.92,-.55):random(.5,.78),vy:random(.30,.62),life:1,length:random(110,220),width:random(.9,1.9)});}
  function spawnShooterBurst(){const count=Math.random()<.24?3:(Math.random()<.48?2:1);for(let i=0;i<count;i++)setTimeout(()=>{if(active&&!hidden&&!reducedMotion.matches)spawnShooter();},i*random(120,260));}
  function drawShooters(dt){const step=Math.min(dt,32);shooters=shooters.filter(s=>{s.x+=s.vx*step;s.y+=s.vy*step;s.life-=step*.00125;if(s.life<=0)return false;const mag=Math.hypot(s.vx,s.vy)||1,tx=s.x-(s.vx/mag)*s.length,ty=s.y-(s.vy/mag)*s.length,g=ctx.createLinearGradient(s.x,s.y,tx,ty);g.addColorStop(0,`rgba(242,251,255,${Math.min(1,s.life)})`);g.addColorStop(.18,`rgba(124,230,255,${.78*s.life})`);g.addColorStop(.5,`rgba(121,160,255,${.34*s.life})`);g.addColorStop(1,'rgba(121,160,255,0)');ctx.strokeStyle=g;ctx.lineWidth=s.width;ctx.shadowBlur=8;ctx.shadowColor='rgba(124,230,255,.35)';ctx.beginPath();ctx.moveTo(s.x,s.y);ctx.lineTo(tx,ty);ctx.stroke();ctx.shadowBlur=0;return true;});}
  function draw(time,dt){ctx.clearRect(0,0,width,height);drawNebula(time);drawConstellations(time);drawStars(time);drawShooters(dt);}
  function frame(now){if(!active||hidden){raf=0;return}raf=requestAnimationFrame(frame);if(now-lastRender<FRAME_INTERVAL)return;const dt=now-last;last=now;lastRender=now;if(!reducedMotion.matches&&now>=nextShooter){spawnShooterBurst();nextShooter=now+random(1800,4200);}draw(now,dt);}
  function restart(){cancelAnimationFrame(raf);raf=0;if(!active||hidden){ctx.clearRect(0,0,width,height);return}last=performance.now();lastRender=last;draw(last,0);if(!reducedMotion.matches)raf=requestAnimationFrame(frame);}
  function syncTheme(){const next=isCosmic();if(next===active)return;active=next;shooters=[];restart()}

  const themeObserver=new MutationObserver(syncTheme);themeObserver.observe(document.body,{attributes:true,attributeFilter:['data-vault-theme']});
  window.addEventListener('resize',resize,{passive:true});
  document.addEventListener('visibilitychange',()=>{hidden=document.hidden;if(hidden)cancelAnimationFrame(raf);else restart();});
  if(typeof reducedMotion.addEventListener==='function')reducedMotion.addEventListener('change',restart);
  resize();syncTheme();restart();
})();