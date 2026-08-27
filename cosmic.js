(() => {
  'use strict';

  const canvas = document.getElementById('cosmicSky');
  if (!canvas) return;

  const ctx = canvas.getContext('2d', { alpha: true });
  if (!ctx) return;

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const DPR_CAP = 2;
  let width = 0;
  let height = 0;
  let dpr = 1;
  let stars = [];
  let shooters = [];
  let raf = 0;
  let last = performance.now();
  let nextShooter = last + 1800;
  let hidden = document.hidden;

  const constellations = [
    { color:[124,230,255], phase:.3, speed:.00011, points:[[.05,.16],[.11,.10],[.17,.18],[.23,.13],[.29,.22],[.35,.15],[.41,.21]], links:[[0,1],[1,2],[2,3],[3,4],[4,5],[5,6],[2,5]] },
    { color:[255,225,159], phase:1.7, speed:-.00008, points:[[.56,.14],[.63,.08],[.69,.15],[.77,.10],[.83,.19],[.90,.14]], links:[[0,1],[1,2],[2,3],[3,4],[4,5],[1,4]] },
    { color:[121,160,255], phase:2.8, speed:.000065, points:[[.10,.68],[.18,.62],[.25,.71],[.32,.65],[.40,.74],[.47,.66],[.54,.76]], links:[[0,1],[1,2],[2,3],[3,4],[4,5],[5,6],[1,3],[3,5]] },
    { color:[124,230,255], phase:4.1, speed:-.000055, points:[[.63,.59],[.70,.52],[.77,.60],[.84,.53],[.91,.64],[.82,.70],[.73,.67]], links:[[0,1],[1,2],[2,3],[3,4],[4,5],[5,6],[6,0],[2,6]] },
    { color:[255,225,159], phase:5.0, speed:.000075, points:[[.20,.39],[.25,.34],[.31,.41],[.37,.36],[.43,.44]], links:[[0,1],[1,2],[2,3],[3,4],[0,2]] },
    { color:[121,160,255], phase:.95, speed:-.00007, points:[[.69,.34],[.75,.29],[.81,.35],[.87,.31],[.93,.38]], links:[[0,1],[1,2],[2,3],[3,4],[1,3]] },
    { color:[124,230,255], phase:3.6, speed:.00005, points:[[.38,.50],[.44,.46],[.50,.51],[.56,.47],[.62,.53]], links:[[0,1],[1,2],[2,3],[3,4],[0,2],[2,4]] },
    { color:[255,225,159], phase:2.2, speed:-.000045, points:[[.29,.86],[.35,.81],[.42,.87],[.49,.82],[.56,.88]], links:[[0,1],[1,2],[2,3],[3,4],[1,3]] }
  ];

  const random = (min,max) => min + Math.random() * (max-min);

  function makeStar(){
    const depth = Math.pow(Math.random(),1.7);
    return {x:Math.random(),y:Math.random(),depth,radius:random(.4,1.75)+depth,alpha:random(.24,.96),phase:random(0,Math.PI*2),twinkle:random(.001,.0052),drift:random(.000004,.000022),tint:Math.random()};
  }

  function rebuildStars(){
    const count=Math.max(220,Math.min(680,Math.round((width*height)/4100)));
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

  function sceneDrift(time, scale=1){
    if(reducedMotion.matches) return [0,0];
    return [Math.sin(time*.00009)*16*scale + Math.cos(time*.000037)*8*scale,Math.cos(time*.000073)*12*scale + Math.sin(time*.000041)*7*scale];
  }

  function drawNebula(time){
    const t=time*.00005;
    const [dx,dy]=sceneDrift(time,1.25);
    const blobs=[
      [.15+Math.sin(t)*.045,.15+Math.cos(t*.7)*.035,.46,[68,117,255],.13],
      [.78+Math.cos(t*.85)*.055,.23+Math.sin(t*.62)*.04,.40,[78,223,255],.11],
      [.53+Math.sin(t*.48)*.05,.82+Math.cos(t*.73)*.04,.52,[105,72,255],.12],
      [.36+Math.cos(t*.38)*.035,.47+Math.sin(t*.52)*.03,.34,[255,199,111],.055]
    ];
    for(const [nx,ny,scale,rgb,alpha] of blobs){
      const x=nx*width+dx*scale;
      const y=ny*height+dy*scale;
      const r=Math.max(width,height)*scale;
      const g=ctx.createRadialGradient(x,y,0,x,y,r);
      g.addColorStop(0,`rgba(${rgb[0]},${rgb[1]},${rgb[2]},${alpha})`);
      g.addColorStop(.45,`rgba(${rgb[0]},${rgb[1]},${rgb[2]},${alpha*.36})`);
      g.addColorStop(1,`rgba(${rgb[0]},${rgb[1]},${rgb[2]},0)`);
      ctx.fillStyle=g;
      ctx.fillRect(0,0,width,height);
    }
  }

  function drawStars(time){
    const [baseX,baseY]=sceneDrift(time,.7);
    for(const s of stars){
      if(!reducedMotion.matches){
        s.y-=s.drift*(.45+s.depth);
        s.x+=Math.sin(time*.00008+s.phase)*s.drift*.08;
        if(s.y<-.02){s.y=1.02;s.x=Math.random();}
        if(s.x<-.02)s.x=1.02;
        if(s.x>1.02)s.x=-.02;
      }
      const parallax=.25+s.depth*1.15;
      const x=s.x*width+baseX*parallax;
      const y=s.y*height+baseY*parallax;
      const twinkle=reducedMotion.matches?1:.68+.32*Math.sin(time*s.twinkle+s.phase);
      const a=s.alpha*twinkle;
      const r=s.radius*(.72+s.depth*.48);
      let rgb='220,235,255';
      if(s.tint>.82) rgb='124,230,255'; else if(s.tint<.10) rgb='255,225,159';
      if(r>1.35){
        const halo=ctx.createRadialGradient(x,y,0,x,y,r*5.8);
        halo.addColorStop(0,`rgba(${rgb},${a*.38})`);
        halo.addColorStop(1,`rgba(${rgb},0)`);
        ctx.fillStyle=halo;
        ctx.beginPath();
        ctx.arc(x,y,r*5.8,0,Math.PI*2);
        ctx.fill();
      }
      ctx.fillStyle=`rgba(${rgb},${a})`;
      ctx.beginPath();
      ctx.arc(x,y,r,0,Math.PI*2);
      ctx.fill();
    }
  }

  function rotatePoint(px,py,cx,cy,angle){
    const dx=px-cx,dy=py-cy,c=Math.cos(angle),s=Math.sin(angle);
    return [cx+dx*c-dy*s,cy+dx*s+dy*c];
  }

  function drawConstellations(time){
    const minSide=Math.min(width,height);
    const [driftX,driftY]=sceneDrift(time,.45);
    for(const c of constellations){
      const angle=reducedMotion.matches?0:Math.sin(time*c.speed+c.phase)*.052;
      const pulse=reducedMotion.matches ? .52 : .43+.18*Math.sin(time*.001+c.phase);
      const localX=reducedMotion.matches?0:Math.sin(time*.00012+c.phase)*10;
      const localY=reducedMotion.matches?0:Math.cos(time*.00010+c.phase)*7;
      const pts=c.points.map(([x,y])=>{
        const [rx,ry]=rotatePoint(x,y,.5,.5,angle);
        return [rx*width+driftX+localX,ry*height+driftY+localY];
      });
      ctx.lineWidth=Math.max(.65,minSide/1250);
      ctx.strokeStyle=`rgba(${c.color[0]},${c.color[1]},${c.color[2]},${pulse*.43})`;
      ctx.shadowBlur=9;
      ctx.shadowColor=`rgba(${c.color[0]},${c.color[1]},${c.color[2]},.26)`;
      for(const [a,b] of c.links){
        ctx.beginPath();
        ctx.moveTo(pts[a][0],pts[a][1]);
        ctx.lineTo(pts[b][0],pts[b][1]);
        ctx.stroke();
      }
      ctx.shadowBlur=0;
      pts.forEach(([x,y],i)=>{
        const glow=3.4+(i%3)*1.25;
        const halo=ctx.createRadialGradient(x,y,0,x,y,glow*4.5);
        halo.addColorStop(0,`rgba(${c.color[0]},${c.color[1]},${c.color[2]},${.24+pulse*.27})`);
        halo.addColorStop(1,`rgba(${c.color[0]},${c.color[1]},${c.color[2]},0)`);
        ctx.fillStyle=halo;
        ctx.beginPath();
        ctx.arc(x,y,glow*4.5,0,Math.PI*2);
        ctx.fill();
        ctx.fillStyle=`rgba(${c.color[0]},${c.color[1]},${c.color[2]},${.76+pulse*.22})`;
        ctx.beginPath();
        ctx.arc(x,y,1.4+(i%2)*.6,0,Math.PI*2);
        ctx.fill();
      });
    }
  }

  function spawnShooter(){
    const direction=Math.random()<.84?-1:1;
    const startX=direction<0?random(width*.45,width*1.08):random(-width*.08,width*.3);
    shooters.push({x:startX,y:random(-height*.04,height*.48),vx:direction<0?random(-.92,-.55):random(.5,.78),vy:random(.30,.62),life:1,length:random(110,220),width:random(.9,1.9)});
  }

  function spawnShooterBurst(){
    const count=Math.random()<.24?3:(Math.random()<.48?2:1);
    for(let i=0;i<count;i++){
      setTimeout(()=>{ if(!hidden&&!reducedMotion.matches) spawnShooter(); },i*random(120,260));
    }
  }

  function drawShooters(dt){
    const step=Math.min(dt,32);
    shooters=shooters.filter(s=>{
      s.x+=s.vx*step;
      s.y+=s.vy*step;
      s.life-=step*.00125;
      if(s.life<=0) return false;
      const mag=Math.hypot(s.vx,s.vy)||1;
      const tx=s.x-(s.vx/mag)*s.length;
      const ty=s.y-(s.vy/mag)*s.length;
      const g=ctx.createLinearGradient(s.x,s.y,tx,ty);
      g.addColorStop(0,`rgba(242,251,255,${Math.min(1,s.life)})`);
      g.addColorStop(.18,`rgba(124,230,255,${.78*s.life})`);
      g.addColorStop(.5,`rgba(121,160,255,${.34*s.life})`);
      g.addColorStop(1,'rgba(121,160,255,0)');
      ctx.strokeStyle=g;
      ctx.lineWidth=s.width;
      ctx.shadowBlur=8;
      ctx.shadowColor='rgba(124,230,255,.35)';
      ctx.beginPath();
      ctx.moveTo(s.x,s.y);
      ctx.lineTo(tx,ty);
      ctx.stroke();
      ctx.shadowBlur=0;
      return true;
    });
  }

  function draw(time,dt){
    ctx.clearRect(0,0,width,height);
    drawNebula(time);
    drawConstellations(time);
    drawStars(time);
    drawShooters(dt);
  }

  function frame(now){
    if(hidden) return;
    const dt=now-last;
    last=now;
    if(!reducedMotion.matches&&now>=nextShooter){
      spawnShooterBurst();
      nextShooter=now+random(1800,4200);
    }
    draw(now,dt);
    if(!reducedMotion.matches) raf=requestAnimationFrame(frame);
  }

  function restart(){
    cancelAnimationFrame(raf);
    last=performance.now();
    draw(last,0);
    if(!reducedMotion.matches&&!hidden) raf=requestAnimationFrame(frame);
  }

  window.addEventListener('resize',resize,{passive:true});
  document.addEventListener('visibilitychange',()=>{
    hidden=document.hidden;
    if(hidden) cancelAnimationFrame(raf);
    else restart();
  });
  if(typeof reducedMotion.addEventListener==='function') reducedMotion.addEventListener('change',restart);
  resize();
  restart();
})();