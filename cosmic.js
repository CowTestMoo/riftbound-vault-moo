(() => {
  'use strict';

  const canvas = document.getElementById('cosmicSky');
  if (!canvas) return;

  const ctx = canvas.getContext('2d', { alpha: true });
  if (!ctx) return;

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const DPR_CAP = 2;
  const pointer = { x: 0, y: 0, tx: 0, ty: 0 };
  let width = 0;
  let height = 0;
  let dpr = 1;
  let stars = [];
  let shooters = [];
  let raf = 0;
  let last = performance.now();
  let nextShooter = last + 3500;
  let hidden = document.hidden;

  const constellations = [
    { color:[124,230,255], phase:.3, speed:.00011, points:[[.07,.18],[.13,.12],[.19,.20],[.25,.15],[.31,.24],[.37,.17],[.44,.23]], links:[[0,1],[1,2],[2,3],[3,4],[4,5],[5,6],[2,5]] },
    { color:[255,225,159], phase:1.7, speed:-.00008, points:[[.59,.16],[.66,.10],[.72,.17],[.80,.12],[.86,.21],[.92,.16]], links:[[0,1],[1,2],[2,3],[3,4],[4,5],[1,4]] },
    { color:[121,160,255], phase:2.8, speed:.000065, points:[[.12,.72],[.20,.66],[.27,.75],[.34,.69],[.42,.78],[.49,.70],[.56,.80]], links:[[0,1],[1,2],[2,3],[3,4],[4,5],[5,6],[1,3],[3,5]] },
    { color:[124,230,255], phase:4.1, speed:-.000055, points:[[.65,.62],[.72,.55],[.79,.63],[.86,.56],[.92,.67],[.83,.73],[.74,.70]], links:[[0,1],[1,2],[2,3],[3,4],[4,5],[5,6],[6,0],[2,6]] }
  ];

  const random = (min,max) => min + Math.random() * (max-min);

  function makeStar(){
    const depth=Math.pow(Math.random(),1.8);
    return {x:Math.random(),y:Math.random(),depth,radius:random(.45,1.65)+depth*.9,alpha:random(.28,.92),phase:random(0,Math.PI*2),twinkle:random(.0012,.0046),drift:random(.000003,.000018),tint:Math.random()};
  }

  function rebuildStars(){
    const count=Math.max(130,Math.min(420,Math.round((width*height)/6400)));
    stars=Array.from({length:count},makeStar);
  }

  function resize(){
    dpr=Math.min(window.devicePixelRatio||1,DPR_CAP);
    width=Math.max(1,window.innerWidth);
    height=Math.max(1,window.innerHeight);
    canvas.width=Math.round(width*dpr);
    canvas.height=Math.round(height*dpr);
    canvas.style.width=`${width}px`;
    canvas.style.height=`${height}px`;
    ctx.setTransform(dpr,0,0,dpr,0,0);
    rebuildStars();
    draw(performance.now(),0);
  }

  function drawNebula(time){
    const t=time*.00005;
    const blobs=[
      [.16+Math.sin(t)*.035,.16+Math.cos(t*.7)*.03,.42,[68,117,255],.11],
      [.78+Math.cos(t*.85)*.045,.24+Math.sin(t*.62)*.035,.36,[78,223,255],.09],
      [.53+Math.sin(t*.48)*.04,.82+Math.cos(t*.73)*.035,.48,[105,72,255],.10]
    ];
    for(const [nx,ny,scale,rgb,alpha] of blobs){
      const x=nx*width+pointer.x*16*scale;
      const y=ny*height+pointer.y*12*scale;
      const r=Math.max(width,height)*scale;
      const g=ctx.createRadialGradient(x,y,0,x,y,r);
      g.addColorStop(0,`rgba(${rgb[0]},${rgb[1]},${rgb[2]},${alpha})`);
      g.addColorStop(.45,`rgba(${rgb[0]},${rgb[1]},${rgb[2]},${alpha*.34})`);
      g.addColorStop(1,`rgba(${rgb[0]},${rgb[1]},${rgb[2]},0)`);
      ctx.fillStyle=g;
      ctx.fillRect(0,0,width,height);
    }
  }

  function drawStars(time){
    for(const s of stars){
      if(!reducedMotion.matches){
        s.y-=s.drift*(.45+s.depth);
        if(s.y<-.02){s.y=1.02;s.x=Math.random();}
      }
      const parallax=.25+s.depth*1.1;
      const x=s.x*width+pointer.x*18*parallax;
      const y=s.y*height+pointer.y*14*parallax;
      const twinkle=reducedMotion.matches?1:.72+.28*Math.sin(time*s.twinkle+s.phase);
      const a=s.alpha*twinkle;
      const r=s.radius*(.75+s.depth*.45);
      let rgb='220,235,255';
      if(s.tint>.84) rgb='124,230,255'; else if(s.tint<.08) rgb='255,225,159';
      if(r>1.5){
        const halo=ctx.createRadialGradient(x,y,0,x,y,r*5.5);
        halo.addColorStop(0,`rgba(${rgb},${a*.34})`); halo.addColorStop(1,`rgba(${rgb},0)`);
        ctx.fillStyle=halo; ctx.beginPath(); ctx.arc(x,y,r*5.5,0,Math.PI*2); ctx.fill();
      }
      ctx.fillStyle=`rgba(${rgb},${a})`; ctx.beginPath(); ctx.arc(x,y,r,0,Math.PI*2); ctx.fill();
    }
  }

  function rotatePoint(px,py,cx,cy,angle){
    const dx=px-cx,dy=py-cy,c=Math.cos(angle),s=Math.sin(angle);
    return [cx+dx*c-dy*s,cy+dx*s+dy*c];
  }

  function drawConstellations(time){
    const minSide=Math.min(width,height);
    for(const c of constellations){
      const angle=reducedMotion.matches?0:Math.sin(time*c.speed+c.phase)*.045;
      const pulse=reducedMotion.matches ? .52 : .42+.16*Math.sin(time*.001+c.phase);
      const pts=c.points.map(([x,y])=>{
        const [rx,ry]=rotatePoint(x,y,.5,.5,angle);
        return [rx*width+pointer.x*10,ry*height+pointer.y*8];
      });
      ctx.lineWidth=Math.max(.6,minSide/1300);
      ctx.strokeStyle=`rgba(${c.color[0]},${c.color[1]},${c.color[2]},${pulse*.38})`;
      ctx.shadowBlur=8; ctx.shadowColor=`rgba(${c.color[0]},${c.color[1]},${c.color[2]},.24)`;
      for(const [a,b] of c.links){ctx.beginPath();ctx.moveTo(pts[a][0],pts[a][1]);ctx.lineTo(pts[b][0],pts[b][1]);ctx.stroke();}
      ctx.shadowBlur=0;
      pts.forEach(([x,y],i)=>{
        const glow=3.2+(i%3)*1.2;
        const halo=ctx.createRadialGradient(x,y,0,x,y,glow*4.2);
        halo.addColorStop(0,`rgba(${c.color[0]},${c.color[1]},${c.color[2]},${.22+pulse*.25})`);
        halo.addColorStop(1,`rgba(${c.color[0]},${c.color[1]},${c.color[2]},0)`);
        ctx.fillStyle=halo;ctx.beginPath();ctx.arc(x,y,glow*4.2,0,Math.PI*2);ctx.fill();
        ctx.fillStyle=`rgba(${c.color[0]},${c.color[1]},${c.color[2]},${.72+pulse*.25})`;
        ctx.beginPath();ctx.arc(x,y,1.35+(i%2)*.55,0,Math.PI*2);ctx.fill();
      });
    }
  }

  function spawnShooter(){
    shooters.push({x:random(width*.3,width*1.05),y:random(-height*.05,height*.42),vx:random(-.75,-.48),vy:random(.34,.58),life:1,length:random(90,180),width:random(.8,1.7)});
  }

  function drawShooters(dt){
    const step=Math.min(dt,32);
    shooters=shooters.filter(s=>{
      s.x+=s.vx*step;s.y+=s.vy*step;s.life-=step*.0014;
      if(s.life<=0) return false;
      const mag=Math.hypot(s.vx,s.vy)||1;
      const tx=s.x-(s.vx/mag)*s.length,ty=s.y-(s.vy/mag)*s.length;
      const g=ctx.createLinearGradient(s.x,s.y,tx,ty);
      g.addColorStop(0,`rgba(230,247,255,${Math.min(1,s.life)})`);
      g.addColorStop(.22,`rgba(124,230,255,${.72*s.life})`);
      g.addColorStop(1,'rgba(121,160,255,0)');
      ctx.strokeStyle=g;ctx.lineWidth=s.width;ctx.beginPath();ctx.moveTo(s.x,s.y);ctx.lineTo(tx,ty);ctx.stroke();
      return true;
    });
  }

  function draw(time,dt){
    ctx.clearRect(0,0,width,height);
    pointer.x+=(pointer.tx-pointer.x)*.035;
    pointer.y+=(pointer.ty-pointer.y)*.035;
    drawNebula(time);drawConstellations(time);drawStars(time);drawShooters(dt);
  }

  function frame(now){
    if(hidden) return;
    const dt=now-last;last=now;
    if(!reducedMotion.matches&&now>=nextShooter){spawnShooter();nextShooter=now+random(4200,9800);}
    draw(now,dt);
    if(!reducedMotion.matches) raf=requestAnimationFrame(frame);
  }

  function restart(){
    cancelAnimationFrame(raf);last=performance.now();draw(last,0);
    if(!reducedMotion.matches&&!hidden) raf=requestAnimationFrame(frame);
  }

  window.addEventListener('resize',resize,{passive:true});
  window.addEventListener('pointermove',event=>{if(reducedMotion.matches)return;pointer.tx=(event.clientX/Math.max(width,1)-.5)*2;pointer.ty=(event.clientY/Math.max(height,1)-.5)*2;},{passive:true});
  window.addEventListener('pointerleave',()=>{pointer.tx=0;pointer.ty=0;},{passive:true});
  document.addEventListener('visibilitychange',()=>{hidden=document.hidden;if(hidden)cancelAnimationFrame(raf);else restart();});
  if(typeof reducedMotion.addEventListener==='function') reducedMotion.addEventListener('change',restart);
  resize();restart();
})();