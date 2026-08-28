(() => {
  'use strict';
  const SUPABASE_URL='https://ivqtgclygiikagfuicjd.supabase.co';
  const SUPABASE_KEY='sb_publishable_Iweuvn4mcU02xrDyPSJWig_uRWzAsfd';
  const PREF_KEY='riftbound-scanner-v2';
  let busy=false,lastResult=null,lastMatches=[];
  let prefs=readPrefs();
  const session={scans:0,copies:0,history:[],seen:{}};

  const esc=(v='')=>String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const norm=v=>String(v||'').toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,'');
  const num=v=>String(v||'').toUpperCase().split('//')[0].split('/')[0].replace(/[^A-Z0-9]/g,'').replace(/^([A-Z]*)(0+)(\d+)$/,'$1$3');
  const catalog=()=>window.RiftboundApp?.getCatalog?.()||[];
  const nameOf=c=>c?.fullName||c?.name||c?.cardCode||'Unknown card';
  function readPrefs(){try{return {rapid:true,autoAdd:false,...JSON.parse(localStorage.getItem(PREF_KEY)||'{}')}}catch{return {rapid:true,autoAdd:false}}}
  function savePrefs(){localStorage.setItem(PREF_KEY,JSON.stringify(prefs))}
  function owned(code){return Number(window.RiftboundApp?.owned?.(code)||window.RiftboundApp?.getState?.()?.inventory?.[code]?.owned||0)}

  function ensurePanel(){
    const grid=document.querySelector('.scanner-grid');if(!grid)return null;
    let panel=document.getElementById('scannerAiPanel');
    if(!panel){panel=document.createElement('section');panel.id='scannerAiPanel';panel.className='scanner-ai-panel';const right=grid.children[1]||grid;right.insertAdjacentElement('afterbegin',panel)}
    return panel;
  }
  function show(html,state='idle'){const p=ensurePanel();if(!p)return;p.dataset.state=state;p.innerHTML=html}

  function sessionBar(){
    const undo=session.history.length;
    return `<div class="rapid-session-bar"><div><small>RAPID SESSION</small><strong>${session.scans}</strong><span>scanned</span></div><div><strong>${session.copies}</strong><span>copies added</span></div><div class="rapid-session-actions"><button type="button" data-rapid-undo ${undo?'':'disabled'}>Undo</button><button type="button" data-rapid-reset>Reset</button></div></div>`;
  }
  function modeControls(){
    return `<div class="rapid-mode-controls"><label><input type="checkbox" id="rapidModeToggle" ${prefs.rapid?'checked':''}> Rapid Scan</label><label><input type="checkbox" id="rapidAutoAddToggle" ${prefs.autoAdd?'checked':''} ${prefs.rapid?'':'disabled'}> Auto-add +1 on very high confidence</label></div>`;
  }
  function showReady(){
    show(`${sessionBar()}${modeControls()}<div class="scanner-ai-ready"><strong>${prefs.rapid?'Rapid Scan ready':'Automatic card recognition'}</strong><small>${prefs.rapid?'Photograph one card, confirm it, then jump straight to the next. Session totals and undo stay available until you reset them.':'Take a clear photo of the front of a Riftbound card. The scanner will identify it and match it against the vault catalog.'}</small>${prefs.rapid?'<button class="primary-btn rapid-next-ready" type="button" data-rapid-next>Scan First Card</button>':''}</div>`)
  }

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
  function matches(r){return catalog().map(card=>({card,score:score(card,r)})).filter(x=>x.score>=4).sort((a,b)=>b.score-a.score||String(a.card.cardSet||'').localeCompare(String(b.card.cardSet||''))).slice(0,6)}
  function isVeryHighConfidence(r,found){const first=found[0],second=found[1],vision=Number(r.confidence||0),gap=first?first.score-(second?.score||0):0;return !!first&&r.is_card!==false&&vision>=.92&&first.score>=18&&gap>=3}

  function rapidActions(found,r){
    if(!prefs.rapid||!found.length||r.is_card===false)return'';
    const best=found[0].card,code=best.cardCode,seen=session.seen[code]||0,high=isVeryHighConfidence(r,found);
    return `<div class="rapid-confirm-card"><div class="rapid-confirm-copy"><small>${high?'VERY HIGH CONFIDENCE':'CONFIRM BEST MATCH'}</small><strong>${esc(nameOf(best))}</strong><span>${esc(best.cardSet||'')} ${esc(best.cardNumber||'')}${seen>1?` • scanned ${seen}× this session`:''}</span></div><div class="rapid-qty-actions"><button class="primary-btn" type="button" data-rapid-add="1" data-code="${esc(code)}">+1</button><button class="ghost-btn" type="button" data-rapid-add="4" data-code="${esc(code)}">+4</button><div class="rapid-custom"><input id="rapidCustomQty" type="number" min="1" max="99" value="2" inputmode="numeric"><button class="ghost-btn" type="button" data-rapid-custom data-code="${esc(code)}">Add</button></div><button class="primary-btn rapid-next-btn" type="button" data-rapid-next>Next Scan →</button></div>${high&&!prefs.autoAdd?'<small class="rapid-auto-hint">This result qualifies for optional high-confidence auto-add. Enable it above if you want future matches this strong to add +1 automatically.</small>':''}</div>`;
  }

  function renderResult(r,{statusText=''}={}){
    lastResult=r;const isCard=r.is_card!==false,found=isCard?lastMatches:[],confidence=Math.round(Math.max(0,Math.min(1,Number(r.confidence||0)))*100);
    const detected=`${r.name||'Unknown'}${r.collector_number?` • #${r.collector_number}`:''}${r.set_name||r.set_code?` • ${r.set_name||r.set_code}`:''}`;
    const resultBlock=!isCard
      ? '<div class="scanner-ai-no-match">This image does not appear to be a Riftbound card, so no inventory matches are being offered.</div>'
      : found.length
        ? `<div class="scanner-ai-matches">${found.map((x,i)=>`<div class="scanner-ai-match ${i===0?'best':''}">${x.card.imageUrl?`<img src="${esc(x.card.imageUrl)}" alt="">`:''}<span><strong>${esc(nameOf(x.card))}</strong><small>${esc(x.card.cardSet||'')} ${esc(x.card.cardNumber||'')}${i===0?` • ${x.score>=18?'Strong match':x.score>=9?'Best match':'Possible match'}`:''}</small></span><button type="button" data-scan-add="${esc(x.card.cardCode)}">+1</button></div>`).join('')}</div>`
        : '<div class="scanner-ai-no-match">Recognition worked, but no strong catalog match was found. You can still use manual search below.</div>';
    show(`${sessionBar()}${modeControls()}${statusText?`<div class="rapid-status">${esc(statusText)}</div>`:''}<div class="scanner-ai-head"><div><strong>AI Recognition</strong><small>${!isCard?'Not identified as Riftbound':`Vision confidence ${confidence}%`}</small></div><span>${confidence}%</span></div><div class="scanner-detected"><small>Detected</small><b>${esc(detected)}</b></div>${rapidActions(found,r)}${resultBlock}`,'ok');
  }

  function addCopies(code,qty,{auto=false}={}){
    qty=Math.max(1,Math.min(99,Math.floor(Number(qty)||1)));const card=catalog().find(c=>c.cardCode===code);if(!card)return 0;
    const before=owned(code);window.RiftboundApp?.adjustOwned?.(code,qty,auto?'Rapid scan auto-add':'Rapid scan');const after=owned(code),changed=Math.max(0,after-before);if(!changed)return 0;
    session.copies+=changed;session.history.unshift({code,qty:changed,name:nameOf(card),auto,at:Date.now()});session.history=session.history.slice(0,60);
    window.RiftboundTheme?.play?.('add');window.RiftboundNeonFX?.trigger?.('inventory');return changed;
  }
  function undoLast(){
    const h=session.history.shift();if(!h)return;
    const before=owned(h.code);window.RiftboundApp?.adjustOwned?.(h.code,-h.qty,'Rapid scan undo');const removed=Math.max(0,before-owned(h.code));session.copies=Math.max(0,session.copies-removed);window.RiftboundTheme?.play?.('remove');
    if(lastResult)renderResult(lastResult,{statusText:removed?`Undid ${removed}× ${h.name}.`:'That add could not be fully undone because copies are allocated.'});else showReady();
  }
  function resetSession(){session.scans=0;session.copies=0;session.history=[];session.seen={};lastResult=null;lastMatches=[];showReady()}
  function nextScan(){const input=document.getElementById('scannerFile');if(!input)return;input.value='';input.click()}

  function processResult(r){
    lastResult=r;lastMatches=r.is_card===false?[]:matches(r);session.scans++;
    const best=lastMatches[0]?.card;if(best)session.seen[best.cardCode]=(session.seen[best.cardCode]||0)+1;
    let status='';if(prefs.rapid&&prefs.autoAdd&&isVeryHighConfidence(r,lastMatches)&&best){const n=addCopies(best.cardCode,1,{auto:true});if(n)status=`Auto-added 1× ${nameOf(best)}. Ready for the next card.`}
    renderResult(r,{statusText:status});
  }

  function restorePanel(){
    if(!document.getElementById('scannerFile'))return;
    const p=ensurePanel();if(!p)return;
    if(lastResult)renderResult(lastResult);else showReady();
  }

  async function scan(file){
    if(busy||!file)return;const s=window.RiftboundCloud?.getSession?.();if(!s?.access_token){show(`${sessionBar()}${modeControls()}<strong>Sign in to use AI scanning.</strong>`,'error');return}
    busy=true;show(`${sessionBar()}${modeControls()}<div class="scanner-ai-loading"><span></span><strong>Reading card…</strong><small>Identifying name, set, and card number</small></div>`,'loading');
    try{
      const image=await resizeFile(file);
      const res=await fetch(`${SUPABASE_URL}/functions/v1/scan-card`,{method:'POST',headers:{apikey:SUPABASE_KEY,Authorization:`Bearer ${s.access_token}`,'Content-Type':'application/json'},body:JSON.stringify({image})});
      let data={};try{data=await res.json()}catch{}
      if(!res.ok){
        if(data?.code==='OPENAI_API_KEY_MISSING')show(`${sessionBar()}${modeControls()}<div class="scanner-ai-setup"><strong>AI Scanner is installed, but its vision key is not activated yet.</strong><small>Add the OPENAI_API_KEY secret in Supabase to turn on automatic recognition. Manual card search still works below.</small></div>`,'setup');
        else show(`${sessionBar()}${modeControls()}<div class="scanner-ai-setup"><strong>Automatic recognition is unavailable.</strong><small>${esc(data?.error||`Scanner error ${res.status}`)} Manual search still works below.</small></div>`,'error');
        return;
      }
      if(data?.result)processResult(data.result);else show(`${sessionBar()}${modeControls()}<strong>No card result came back. Try a clearer photo.</strong>`,'error');
    }catch(err){show(`${sessionBar()}${modeControls()}<div class="scanner-ai-setup"><strong>Could not scan this image.</strong><small>${esc(err?.message||String(err))}</small></div>`,'error')}finally{busy=false}
  }

  document.addEventListener('change',e=>{
    if(e.target.id==='scannerFile'&&e.target.files?.[0])setTimeout(()=>scan(e.target.files[0]),20);
    if(e.target.id==='rapidModeToggle'){prefs.rapid=e.target.checked;if(!prefs.rapid)prefs.autoAdd=false;savePrefs();restorePanel()}
    if(e.target.id==='rapidAutoAddToggle'){prefs.autoAdd=e.target.checked;savePrefs();restorePanel()}
  });
  document.addEventListener('click',e=>{
    const add=e.target.closest('[data-rapid-add]');if(add){const n=addCopies(add.dataset.code,Number(add.dataset.rapidAdd));if(lastResult)renderResult(lastResult,{statusText:n?`Added ${n}× ${nameOf(catalog().find(c=>c.cardCode===add.dataset.code))}.`:''});return}
    const custom=e.target.closest('[data-rapid-custom]');if(custom){const q=document.getElementById('rapidCustomQty')?.value||1,n=addCopies(custom.dataset.code,q);if(lastResult)renderResult(lastResult,{statusText:n?`Added ${n}× ${nameOf(catalog().find(c=>c.cardCode===custom.dataset.code))}.`:''});return}
    if(e.target.closest('[data-rapid-next]')){nextScan();return}
    if(e.target.closest('[data-rapid-undo]')){undoLast();return}
    if(e.target.closest('[data-rapid-reset]')){if(session.scans||session.copies){if(!confirm('Reset this Rapid Scan session counter and history?'))return}resetSession();return}
    if(e.target.closest('[data-tool="scanner"]'))setTimeout(restorePanel,0);
  });
  window.addEventListener('riftbound-tool-render',e=>{if(e.detail?.tool==='scanner')requestAnimationFrame(restorePanel)});
  window.addEventListener('riftbound-cloud-restored',()=>setTimeout(restorePanel,40));

  function init(){setTimeout(restorePanel,0)}
  window.RiftboundScanner={scan,resetSession,getSession:()=>({...session,prefs:{...prefs}})};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();