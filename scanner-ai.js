(() => {
  'use strict';
  const SUPABASE_URL='https://ivqtgclygiikagfuicjd.supabase.co';
  const SUPABASE_KEY='sb_publishable_Iweuvn4mcU02xrDyPSJWig_uRWzAsfd';
  let busy=false,lastResult=null;

  const esc=(v='')=>String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const norm=v=>String(v||'').toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,'');
  const num=v=>String(v||'').toUpperCase().split('//')[0].split('/')[0].replace(/[^A-Z0-9]/g,'').replace(/^([A-Z]*)(0+)(\d+)$/,'$1$3');
  const catalog=()=>window.RiftboundApp?.getCatalog?.()||[];
  const nameOf=c=>c?.fullName||c?.name||c?.cardCode||'Unknown card';

  function ensurePanel(){
    const grid=document.querySelector('.scanner-grid');if(!grid)return null;
    let panel=document.getElementById('scannerAiPanel');
    if(!panel){panel=document.createElement('section');panel.id='scannerAiPanel';panel.className='scanner-ai-panel';const right=grid.children[1]||grid;right.insertAdjacentElement('afterbegin',panel)}
    return panel;
  }
  function show(html,state='idle'){const p=ensurePanel();if(!p)return;p.dataset.state=state;p.innerHTML=html}

  async function resizeFile(file){
    const url=URL.createObjectURL(file);
    try{
      const img=await new Promise((resolve,reject)=>{const i=new Image();i.onload=()=>resolve(i);i.onerror=reject;i.src=url});
      const max=1500,scale=Math.min(1,max/Math.max(img.naturalWidth,img.naturalHeight)),w=Math.max(1,Math.round(img.naturalWidth*scale)),h=Math.max(1,Math.round(img.naturalHeight*scale));
      const canvas=document.createElement('canvas');canvas.width=w;canvas.height=h;const ctx=canvas.getContext('2d',{alpha:false});ctx.drawImage(img,0,0,w,h);
      return canvas.toDataURL('image/jpeg',.84);
    }finally{URL.revokeObjectURL(url)}
  }

  function score(card,r){
    const cn=norm(nameOf(card)),rn=norm(`${r.name||''} ${r.subtitle||''}`),cnum=num(card.cardNumber),rnum=num(r.collector_number),cset=norm(`${card.cardSet||''} ${card.setCode||''}`),rset=norm(`${r.set_name||''} ${r.set_code||''}`);
    let s=0;
    if(cnum&&rnum&&cnum===rnum)s+=9;
    if(cn&&rn&&cn===rn)s+=10;else if(cn&&rn&&(cn.includes(rn)||rn.includes(cn)))s+=6;
    const baseName=norm(card.name);if(baseName&&rn&&(rn.includes(baseName)||baseName.includes(norm(r.name))))s+=4;
    if(cset&&rset&&(cset.includes(rset)||rset.includes(cset)))s+=5;
    if(norm(card.rarity)&&norm(r.rarity)&&norm(card.rarity)===norm(r.rarity))s+=1;
    return s;
  }
  function matches(r){return catalog().map(card=>({card,score:score(card,r)})).filter(x=>x.score>2).sort((a,b)=>b.score-a.score||String(a.card.cardSet||'').localeCompare(String(b.card.cardSet||''))).slice(0,6)}

  function renderResult(r){
    lastResult=r;const found=matches(r),confidence=Math.round(Math.max(0,Math.min(1,Number(r.confidence||0)))*100);
    const detected=`${r.name||'Unknown'}${r.collector_number?` • #${r.collector_number}`:''}${r.set_name||r.set_code?` • ${r.set_name||r.set_code}`:''}`;
    show(`<div class="scanner-ai-head"><div><strong>AI Recognition</strong><small>${r.is_card===false?'Image may not be a Riftbound card':`Vision confidence ${confidence}%`}</small></div><span>${confidence}%</span></div><div class="scanner-detected"><small>Detected</small><b>${esc(detected)}</b></div>${found.length?`<div class="scanner-ai-matches">${found.map((x,i)=>`<div class="scanner-ai-match ${i===0?'best':''}">${x.card.imageUrl?`<img src="${esc(x.card.imageUrl)}" alt="">`:''}<span><strong>${esc(nameOf(x.card))}</strong><small>${esc(x.card.cardSet||'')} ${esc(x.card.cardNumber||'')}${i===0?' • Best match':''}</small></span><button type="button" data-scan-add="${esc(x.card.cardCode)}">+1</button></div>`).join('')}</div>`:`<div class="scanner-ai-no-match">Recognition worked, but no confident catalog match was found. You can still use manual search below.</div>`}`,'ok');
  }

  async function scan(file){
    if(busy||!file)return;const s=window.RiftboundCloud?.getSession?.();if(!s?.access_token){show('<strong>Sign in to use AI scanning.</strong>','error');return}
    busy=true;show('<div class="scanner-ai-loading"><span></span><strong>Reading card…</strong><small>Identifying name, set, and card number</small></div>','loading');
    try{
      const image=await resizeFile(file);
      const res=await fetch(`${SUPABASE_URL}/functions/v1/scan-card`,{method:'POST',headers:{apikey:SUPABASE_KEY,Authorization:`Bearer ${s.access_token}`,'Content-Type':'application/json'},body:JSON.stringify({image})});
      let data={};try{data=await res.json()}catch{}
      if(!res.ok){
        if(data?.code==='OPENAI_API_KEY_MISSING')show('<div class="scanner-ai-setup"><strong>AI Scanner is installed, but its vision key is not activated yet.</strong><small>Add the OPENAI_API_KEY secret in Supabase to turn on automatic recognition. Manual card search still works below.</small></div>','setup');
        else show(`<div class="scanner-ai-setup"><strong>Automatic recognition is unavailable.</strong><small>${esc(data?.error||`Scanner error ${res.status}`)} Manual search still works below.</small></div>`,'error');
        return;
      }
      if(data?.result)renderResult(data.result);else show('<strong>No card result came back. Try a clearer photo.</strong>','error');
    }catch(err){show(`<div class="scanner-ai-setup"><strong>Could not scan this image.</strong><small>${esc(err?.message||String(err))}</small></div>`,'error')}finally{busy=false}
  }

  document.addEventListener('change',e=>{if(e.target.id==='scannerFile'&&e.target.files?.[0])setTimeout(()=>scan(e.target.files[0]),20)});
  document.addEventListener('click',e=>{if(e.target.closest('[data-tool="scanner"]'))setTimeout(()=>{const p=ensurePanel();if(p&&!p.innerHTML)show('<div class="scanner-ai-ready"><strong>Automatic card recognition</strong><small>Take a clear photo of the front of a Riftbound card. The scanner will identify it and match it against the vault catalog.</small></div>')},30)});
  const observer=new MutationObserver(()=>{if(document.getElementById('scannerFile')){const p=ensurePanel();if(p&&!p.innerHTML&&lastResult)renderResult(lastResult)}});
  function init(){observer.observe(document.body,{childList:true,subtree:true})}
  window.RiftboundScanner={scan};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();