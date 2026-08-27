(() => {
  'use strict';

  const APP_KEY='riftbound-vault-v2';
  const XLSX_SRC='https://cdn.sheetjs.com/xlsx-0.20.3/package/dist/xlsx.full.min.js';
  const ALIASES={
    code:['card code','cardcode','card id','cardid','code','id'],
    number:['card number','cardnumber','collector number','collector no','collectornumber','number','no','#'],
    set:['set code','setcode','card set','cardset','set','expansion','series'],
    name:['card name','cardname','full name','fullname','name'],
    qty:['quantity owned','quantity','qty','owned','copies','copy','count','amount']
  };

  let book=null,rows=[],fileName='',analysis=null,resolverIndex=0;
  let mapping={code:'',number:'',set:'',name:'',qty:''};
  let manualChoices=new Map();
  let catalog=[],byCode=new Map(),indexes=null;

  const esc=(v='')=>String(v).replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
  const norm=v=>String(v??'').trim().toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g,'').replace(/[’‘`´]/g,"'").replace(/[_-]+/g,' ').replace(/\s+/g,' ');
  const compact=v=>norm(v).replace(/[^a-z0-9]/g,'');
  const nameKey=v=>norm(v).replace(/[^a-z0-9]+/g,'');
  const cardName=c=>c?.fullName||c?.name||c?.cardCode||'Unknown card';
  const uid=(p='id')=>`${p}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,9)}`;
  const readState=()=>{try{return JSON.parse(localStorage.getItem(APP_KEY)||'{}')}catch{return {}}};

  function ensureCatalog(){
    catalog=window.RiftboundApp?.getCatalog?.()||catalog;
    byCode=new Map(catalog.map(c=>[c.cardCode,c]));
    indexes=buildIndexes(catalog);
  }

  function ensureSettingsRow(){
    const panel=document.getElementById('uxSettings');
    if(!panel||document.getElementById('spreadsheetImportSetting'))return !!panel;
    const row=document.createElement('div');
    row.id='spreadsheetImportSetting';row.className='setting-row spreadsheet-import-setting';
    row.innerHTML='<div class="setting-copy"><strong>Import spreadsheet</strong><small>Excel/CSV import with automatic matching and picture-assisted review.</small></div><button id="openSpreadsheetImport" class="sound-test" type="button">Import</button>';
    panel.appendChild(row);return true;
  }

  function ensureDialogs(){
    if(!document.getElementById('spreadsheetImportDialog')){
      const d=document.createElement('dialog');d.id='spreadsheetImportDialog';d.className='modal spreadsheet-import-dialog';
      d.innerHTML=`<div class="modal-inner spreadsheet-import-inner">
        <div class="modal-head"><div><h2>Import Spreadsheet</h2><p class="spreadsheet-subtitle">Excel / CSV → Riftbound Vault</p></div><button class="close-btn" data-close-spreadsheet>×</button></div>
        <div class="spreadsheet-drop" id="spreadsheetDrop"><input id="spreadsheetFile" type="file" accept=".xlsx,.xls,.csv,.xlsb,.ods" hidden><div class="spreadsheet-drop-icon">✦</div><strong>Choose an Excel or CSV file</strong><span>or drag and drop it here</span><button id="chooseSpreadsheetFile" class="primary-btn" type="button">Choose File</button></div>
        <div id="spreadsheetWorkspace" hidden>
          <div class="spreadsheet-filebar"><div><strong id="spreadsheetFileName"></strong><small id="spreadsheetRowCount"></small></div><button id="changeSpreadsheetFile" class="ghost-btn" type="button">Change File</button></div>
          <div class="spreadsheet-grid-two"><label>Sheet<select id="spreadsheetSheet"></select></label><label>Import mode<select id="spreadsheetMode"><option value="add">Add quantities to collection</option><option value="set">Set owned quantities for matched cards</option></select></label></div>
          <div class="spreadsheet-mapping-wrap"><div class="spreadsheet-section-head"><div><h3>Column Mapping</h3><p>Auto-detected where possible. Correct anything that looks wrong.</p></div></div><div id="spreadsheetMapping" class="spreadsheet-mapping"></div></div>
          <div id="spreadsheetSummary" class="spreadsheet-summary"></div>
          <div class="spreadsheet-review-actions"><button id="autoAssignSpreadsheet" class="ghost-btn" type="button">Auto Assign Safe Suggestions</button><button id="reviewSpreadsheetMatches" class="primary-btn" type="button">Review Problem Cards</button></div>
          <div class="spreadsheet-preview-wrap"><div class="spreadsheet-section-head"><div><h3>Preview</h3><p>Punctuation like Kha Zix → Kha'Zix is normalized automatically. Multiple printings are never guessed blindly.</p></div><button id="showProblemOnly" class="ghost-btn" type="button">Show Problems</button></div><div id="spreadsheetPreview" class="spreadsheet-preview"></div></div>
          <div id="spreadsheetMessage" class="feature-message"></div>
          <div class="modal-actions spreadsheet-actions"><button id="confirmSpreadsheetImport" class="primary-btn" type="button" disabled>Import Matched Cards</button></div>
        </div>
      </div>`;
      document.body.appendChild(d);
    }
    if(!document.getElementById('spreadsheetResolverDialog')){
      const d=document.createElement('dialog');d.id='spreadsheetResolverDialog';d.className='modal spreadsheet-resolver-dialog';
      d.innerHTML=`<div class="modal-inner spreadsheet-resolver-inner"><div class="modal-head"><div><h2>Choose the Correct Card</h2><p id="resolverProgress" class="spreadsheet-subtitle"></p></div><button class="close-btn" data-close-resolver>×</button></div><div id="resolverSource" class="resolver-source"></div><div class="resolver-search-wrap"><input id="resolverSearch" type="search" placeholder="Search the full card catalog if none of these are right"></div><div id="resolverCandidates" class="resolver-candidates"></div><div class="resolver-footer"><button id="resolverSkip" class="ghost-btn" type="button">Skip for Now</button><button id="resolverClearChoice" class="ghost-btn" type="button">Clear Choice</button></div></div>`;
      document.body.appendChild(d);
    }
  }

  function loadXLSX(){
    if(window.XLSX)return Promise.resolve(window.XLSX);
    return new Promise((resolve,reject)=>{
      const s=document.createElement('script');s.src=XLSX_SRC;s.async=true;s.crossOrigin='anonymous';
      s.onload=()=>window.XLSX?resolve(window.XLSX):reject(new Error('Spreadsheet reader failed to initialize.'));
      s.onerror=()=>reject(new Error('Could not load the spreadsheet reader. Check your connection and try again.'));
      document.head.appendChild(s);
    });
  }

  function detectMapping(headers){
    const out={code:'',number:'',set:'',name:'',qty:''};
    const normalized=headers.map(h=>({raw:h,n:norm(h),c:compact(h)}));
    for(const [key,aliases] of Object.entries(ALIASES)){
      const a=aliases.map(x=>({n:norm(x),c:compact(x)}));
      const hit=normalized.find(h=>a.some(x=>h.n===x.n||h.c===x.c));if(hit)out[key]=hit.raw;
    }
    return out;
  }
  function columnOptions(headers,value){return `<option value="">Not provided</option>${headers.map(h=>`<option value="${esc(h)}" ${h===value?'selected':''}>${esc(h)}</option>`).join('')}`}
  function renderMapping(){
    const root=document.getElementById('spreadsheetMapping');if(!root)return;
    const headers=rows.length?Object.keys(rows[0]):[];
    const defs=[['code','Card code','Best exact identifier'],['number','Card number','Collector/card number'],['set','Set','Disambiguates printings'],['name','Card name','Punctuation-insensitive'],['qty','Quantity','Defaults to 1']];
    root.innerHTML=defs.map(([key,title,help])=>`<label><span><strong>${title}</strong><small>${help}</small></span><select data-sheet-map="${key}">${columnOptions(headers,mapping[key])}</select></label>`).join('');
  }

  function numericQty(v){if(v===''||v==null)return 1;const n=Number(String(v).replace(/,/g,'').trim());return Number.isFinite(n)?Math.max(0,Math.floor(n)):0}
  function numberKeys(v){const raw=String(v??'').trim();if(!raw)return[];const out=new Set([compact(raw)]);const m=raw.match(/^(?:[^0-9]*)(\d+)(.*)$/);if(m){out.add(`${Number(m[1])}${compact(m[2])}`);out.add(String(Number(m[1])))}return[...out].filter(Boolean)}
  function setKeys(c){return [c.setCode,c.cardSet,c.setName].filter(Boolean).map(compact)}
  function push(map,key,c){if(!key)return;const a=map.get(key)||[];a.push(c);map.set(key,a)}
  function buildIndexes(cards){
    const out={codes:new Map(),numbers:new Map(),setNumbers:new Map(),names:new Map(),setNames:new Map(),nameGroups:new Map()};
    cards.forEach(c=>{
      out.codes.set(compact(c.cardCode),c);
      numberKeys(c.cardNumber).forEach(n=>push(out.numbers,n,c));
      setKeys(c).forEach(s=>numberKeys(c.cardNumber).forEach(n=>push(out.setNumbers,`${s}|${n}`,c)));
      const nk=nameKey(cardName(c));push(out.names,nk,c);push(out.nameGroups,nk,c);
      setKeys(c).forEach(s=>push(out.setNames,`${s}|${nk}`,c));
    });
    return out;
  }

  function dice(a,b){
    a=nameKey(a);b=nameKey(b);if(!a||!b)return 0;if(a===b)return 1;if(a.length<2||b.length<2)return a===b?1:0;
    const pairs=new Map();for(let i=0;i<a.length-1;i++){const p=a.slice(i,i+2);pairs.set(p,(pairs.get(p)||0)+1)}
    let overlap=0;for(let i=0;i<b.length-1;i++){const p=b.slice(i,i+2),n=pairs.get(p)||0;if(n){overlap++;pairs.set(p,n-1)}}
    return (2*overlap)/((a.length-1)+(b.length-1));
  }
  function uniqCards(arr){const seen=new Set();return (arr||[]).filter(c=>c?.cardCode&&!seen.has(c.cardCode)&&seen.add(c.cardCode))}
  function candidateObj(card,score,reason){return {card,score,reason}}

  function fuzzyCandidates(name,set){
    const nk=nameKey(name);if(!nk)return[];const setKey=compact(set);const scored=[];
    for(const [key,cards] of indexes.nameGroups){
      let score=dice(nk,key);if(score<.48)continue;
      const matchingSet=setKey?cards.filter(c=>setKeys(c).includes(setKey)):[];
      if(matchingSet.length)score=Math.min(1,score+.09);
      const use=matchingSet.length?matchingSet:cards;
      use.forEach(c=>scored.push(candidateObj(c,score,'Name suggestion')));
    }
    return scored.sort((a,b)=>b.score-a.score).filter((x,i,a)=>i===a.findIndex(y=>y.card.cardCode===x.card.cardCode)).slice(0,8);
  }

  function resultFromCards(cards,method,score=1){
    const u=uniqCards(cards);
    if(u.length===1)return {status:'matched',card:u[0],method,score,candidates:[candidateObj(u[0],score,method)]};
    if(u.length>1)return {status:'review',card:null,method:`${method} • multiple printings`,score,candidates:u.slice(0,12).map(c=>candidateObj(c,score,method))};
    return null;
  }

  function matchRow(row,rowIndex){
    const manual=manualChoices.get(rowIndex);if(manual&&byCode.has(manual))return {status:'matched',card:byCode.get(manual),method:'Your choice',score:1,candidates:[candidateObj(byCode.get(manual),1,'Your choice')]};
    const code=mapping.code?row[mapping.code]:'';
    if(code){const c=indexes.codes.get(compact(code));if(c)return {status:'matched',card:c,method:'Card code',score:1,candidates:[candidateObj(c,1,'Card code')]}}
    const number=mapping.number?row[mapping.number]:'';
    const set=mapping.set?row[mapping.set]:'';
    const name=mapping.name?row[mapping.name]:'';
    const sk=compact(set),nk=nameKey(name);

    if(number&&sk){for(const n of numberKeys(number)){const r=resultFromCards(indexes.setNumbers.get(`${sk}|${n}`),'Set + number');if(r)return r}}
    if(number){for(const n of numberKeys(number)){const r=resultFromCards(indexes.numbers.get(n),'Card number');if(r)return r}}
    if(name&&sk){const r=resultFromCards(indexes.setNames.get(`${sk}|${nk}`),'Set + name');if(r)return r}
    if(name){const r=resultFromCards(indexes.names.get(nk),'Name (punctuation normalized)');if(r)return r}

    const fuzzy=fuzzyCandidates(name,set);
    if(fuzzy.length)return {status:'review',card:null,method:'Suggested match',score:fuzzy[0].score,candidates:fuzzy};
    return {status:'unmatched',card:null,method:'No likely match',score:0,candidates:[]};
  }

  function analyze(){
    ensureCatalog();
    const items=[],aggregate=new Map();let matched=0,review=0,unmatched=0,totalQty=0;
    rows.forEach((row,i)=>{
      const qty=numericQty(mapping.qty?row[mapping.qty]:'');const r=matchRow(row,i);const item={row:i+2,rowIndex:i,rowData:row,qty,...r};items.push(item);
      if(r.status==='matched'&&r.card){matched++;totalQty+=qty;const a=aggregate.get(r.card.cardCode)||{card:r.card,qty:0,rows:[]};a.qty+=qty;a.rows.push(item);aggregate.set(r.card.cardCode,a)}
      else if(r.status==='review')review++;else unmatched++;
    });
    analysis={items,aggregate,matched,review,unmatched,totalQty,uniqueMatched:aggregate.size};renderAnalysis(document.getElementById('showProblemOnly')?.dataset.on==='1');
  }

  function rawLabel(item){
    const vals=[mapping.name&&item.rowData[mapping.name],mapping.set&&item.rowData[mapping.set],mapping.number&&item.rowData[mapping.number],mapping.code&&item.rowData[mapping.code]].filter(v=>String(v??'').trim());return vals.join(' • ')||'(blank row)';
  }
  function renderAnalysis(problemOnly=false){
    const a=analysis||{items:[],matched:0,review:0,unmatched:0,totalQty:0,uniqueMatched:0};
    const summary=document.getElementById('spreadsheetSummary');if(summary)summary.innerHTML=`<div><strong>${rows.length}</strong><small>Rows</small></div><div class="good"><strong>${a.matched}</strong><small>Matched</small></div><div class="review"><strong>${a.review}</strong><small>Needs review</small></div><div class="${a.unmatched?'warn':''}"><strong>${a.unmatched}</strong><small>Unmatched</small></div><div><strong>${a.uniqueMatched}</strong><small>Unique cards</small></div>`;
    const reviewBtn=document.getElementById('reviewSpreadsheetMatches');if(reviewBtn){reviewBtn.disabled=!(a.review+a.unmatched);reviewBtn.textContent=(a.review+a.unmatched)?`Review ${a.review+a.unmatched} Problem Card${a.review+a.unmatched===1?'':'s'}`:'All Cards Resolved ✓'}
    const auto=document.getElementById('autoAssignSpreadsheet');if(auto)auto.disabled=!a.review;
    const root=document.getElementById('spreadsheetPreview');if(root){
      const list=a.items.filter(x=>!problemOnly||x.status!=='matched').slice(0,100);
      root.innerHTML=list.length?`<div class="spreadsheet-table spreadsheet-table-v2"><div class="spreadsheet-tr spreadsheet-th"><span>Row</span><span>Spreadsheet</span><span>Matched card</span><span>Qty</span><span>Status</span></div>${list.map(x=>{
        const cls=x.status==='matched'?'matched':x.status==='review'?'needs-review':'unmatched';
        const card=x.card?`${esc(cardName(x.card))}<small>${esc(x.card.cardSet||x.card.setCode||'')} • #${esc(x.card.cardNumber||'')}</small>`:x.candidates?.length?`<em>${x.candidates.length} possible match${x.candidates.length===1?'':'es'}</em>`:'<em>No likely match</em>';
        const status=x.status==='matched'?`<b>✓</b> ${esc(x.method)}`:`<button class="resolve-row-btn" data-resolve-row="${x.rowIndex}">${x.status==='review'?'Choose Card':'Find Card'}</button>`;
        return `<div class="spreadsheet-tr ${cls}"><span>${x.row}</span><span title="${esc(rawLabel(x))}">${esc(rawLabel(x))}</span><span>${card}</span><span>${x.qty}</span><span>${status}</span></div>`;
      }).join('')}</div>`:'<div class="recent-empty">No rows to show.</div>';
    }
    const btn=document.getElementById('confirmSpreadsheetImport');if(btn){btn.disabled=!a.matched;btn.textContent=`Import ${a.matched} Matched Row${a.matched===1?'':'s'}`}
    const msg=document.getElementById('spreadsheetMessage');if(msg){
      if(!mapping.code&&!mapping.number&&!mapping.name)msg.textContent='Map at least Card code, Card number, or Card name.';
      else if(a.review||a.unmatched)msg.textContent=`${a.review} need review and ${a.unmatched} have no strong match. You can resolve them with card pictures before importing.`;
      else msg.textContent='Everything is resolved and ready to import.';
    }
  }

  function autoAssign(){
    if(!analysis)return;let assigned=0;
    analysis.items.filter(x=>x.status==='review'&&x.candidates?.length).forEach(x=>{
      const sorted=[...x.candidates].sort((a,b)=>b.score-a.score),top=sorted[0],next=sorted[1];
      const uniqueName=sorted.filter(c=>nameKey(cardName(c.card))===nameKey(cardName(top.card))).length===1;
      if(top.score>=.91&&(!next||top.score-next.score>=.12)&&uniqueName){manualChoices.set(x.rowIndex,top.card.cardCode);assigned++}
    });
    analyze();const msg=document.getElementById('spreadsheetMessage');if(msg)msg.textContent=assigned?`Auto-assigned ${assigned} high-confidence suggestion${assigned===1?'':'s'}. Anything ambiguous is still waiting for you.`:'No ambiguous rows were safe enough to auto-assign. Use Review Problem Cards.';
  }

  function problemItems(){return (analysis?.items||[]).filter(x=>x.status!=='matched')}
  function openResolver(rowIndex=null){
    const probs=problemItems();if(!probs.length)return;
    if(rowIndex!=null){const pos=probs.findIndex(x=>x.rowIndex===Number(rowIndex));resolverIndex=pos>=0?pos:0}else resolverIndex=Math.min(resolverIndex,probs.length-1);
    document.getElementById('spreadsheetResolverDialog').showModal();renderResolver();
  }
  function renderResolver(search=''){
    const probs=problemItems();if(!probs.length){document.getElementById('spreadsheetResolverDialog')?.close();return}
    resolverIndex=(resolverIndex+probs.length)%probs.length;const item=probs[resolverIndex];
    document.getElementById('resolverProgress').textContent=`Problem card ${resolverIndex+1} of ${probs.length} • Spreadsheet row ${item.row}`;
    document.getElementById('resolverSource').innerHTML=`<strong>${esc(rawLabel(item))}</strong><span>Quantity ${item.qty}</span><small>${item.status==='review'?'We found possible matches. Pick the exact printing/art you own.':'No strong automatic match. Search the catalog or choose a suggestion.'}</small>`;
    let candidates=item.candidates||[];
    if(search.trim()){
      const q=norm(search),qk=nameKey(search);
      candidates=catalog.map(c=>candidateObj(c,Math.max(dice(qk,nameKey(cardName(c))),norm(`${cardName(c)} ${c.cardSet} ${c.cardNumber} ${c.cardCode}`).includes(q)?.95:0),'Catalog search')).filter(x=>x.score>.4).sort((a,b)=>b.score-a.score).slice(0,24);
    }
    const root=document.getElementById('resolverCandidates');
    root.innerHTML=candidates.length?candidates.map(x=>`<button class="resolver-card" data-resolver-card="${esc(x.card.cardCode)}" type="button">${x.card.imageUrl?`<img src="${esc(x.card.imageUrl)}" alt="${esc(cardName(x.card))}" loading="lazy">`:'<div class="resolver-no-image">No image</div>'}<span><strong>${esc(cardName(x.card))}</strong><small>${esc(x.card.cardSet||x.card.setCode||'')} • #${esc(x.card.cardNumber||'')} • ${esc(x.card.rarity||'')}</small></span></button>`).join(''):'<div class="recent-empty">No catalog matches. Try another search.</div>';
    document.getElementById('resolverSearch').value=search;
  }
  function chooseResolverCard(code){
    const probs=problemItems(),item=probs[resolverIndex];if(!item||!byCode.has(code))return;
    manualChoices.set(item.rowIndex,code);analyze();
    const remaining=problemItems();if(!remaining.length){document.getElementById('spreadsheetResolverDialog').close();return}
    resolverIndex=Math.min(resolverIndex,remaining.length-1);renderResolver();
  }

  function loadSheet(name){
    if(!book||!window.XLSX)return;rows=window.XLSX.utils.sheet_to_json(book.Sheets[name],{defval:'',raw:false,blankrows:false});manualChoices.clear();mapping=detectMapping(rows.length?Object.keys(rows[0]):[]);document.getElementById('spreadsheetRowCount').textContent=`${rows.length.toLocaleString()} data rows`;renderMapping();analyze();
  }
  async function openFile(file){
    try{
      if(!file)return;fileName=file.name;document.getElementById('spreadsheetDrop').classList.add('loading');const XLSX=await loadXLSX();book=XLSX.read(await file.arrayBuffer(),{type:'array',cellDates:true});if(!book.SheetNames?.length)throw new Error('No worksheets found.');const select=document.getElementById('spreadsheetSheet');select.innerHTML=book.SheetNames.map(n=>`<option value="${esc(n)}">${esc(n)}</option>`).join('');document.getElementById('spreadsheetFileName').textContent=fileName;document.getElementById('spreadsheetDrop').hidden=true;document.getElementById('spreadsheetWorkspace').hidden=false;loadSheet(book.SheetNames[0]);
    }catch(err){console.error(err);alert(`Could not read spreadsheet: ${err.message}`)}finally{document.getElementById('spreadsheetDrop').classList.remove('loading')}
  }

  function allocated(code,s){const decked=(s.decks||[]).reduce((n,d)=>n+Number(d.cards?.[code]||0),0),loaned=(s.loans||[]).filter(l=>!l.returnedAt&&l.cardCode===code).reduce((n,l)=>n+Number(l.qty||0),0);return decked+loaned}
  function applyImport(){
    if(!analysis?.aggregate?.size)return;const mode=document.getElementById('spreadsheetMode')?.value||'add';const s={inventory:{},decks:[],loans:[],transactions:[],...readState()};s.inventory=s.inventory||{};s.transactions=s.transactions||[];let changed=0,clamped=0;
    for(const [code,item] of analysis.aggregate){const current=Number(s.inventory[code]?.owned||0),min=allocated(code,s);let next=mode==='set'?item.qty:current+item.qty;if(next<min){next=min;clamped++}next=Math.max(0,Math.floor(next));if(next===current)continue;s.inventory[code]={...(s.inventory[code]||{}),owned:next};changed++}
    s.transactions=[{id:uid('evt'),type:'activity',action:`Imported spreadsheet “${fileName}” • ${changed} cards updated`,at:new Date().toISOString(),source:'spreadsheet',matchedRows:analysis.matched,reviewRemaining:analysis.review,unmatchedRows:analysis.unmatched},...s.transactions].slice(0,500);localStorage.setItem(APP_KEY,JSON.stringify(s));window.RiftboundApp?.reloadState?.();window.RiftboundCloud?.syncNow?.();const msg=document.getElementById('spreadsheetMessage');if(msg)msg.textContent=`Import complete: ${changed} unique cards updated${clamped?`. ${clamped} stayed high enough for deck/loan allocations.`:'.'}`;const btn=document.getElementById('confirmSpreadsheetImport');if(btn){btn.disabled=true;btn.textContent='Imported ✓'}setTimeout(()=>document.getElementById('spreadsheetImportDialog')?.close(),1300);
  }

  function resetDialog(){book=null;rows=[];analysis=null;fileName='';manualChoices.clear();mapping={code:'',number:'',set:'',name:'',qty:''};const drop=document.getElementById('spreadsheetDrop'),work=document.getElementById('spreadsheetWorkspace'),file=document.getElementById('spreadsheetFile');if(drop)drop.hidden=false;if(work)work.hidden=true;if(file)file.value='';const btn=document.getElementById('confirmSpreadsheetImport');if(btn){btn.disabled=true;btn.textContent='Import Matched Cards'}}
  function openDialog(){ensureCatalog();ensureDialogs();resetDialog();document.getElementById('spreadsheetImportDialog').showModal()}

  function bind(){
    document.addEventListener('click',e=>{
      if(e.target.closest('#openSpreadsheetImport'))return openDialog();
      if(e.target.closest('[data-close-spreadsheet]'))return document.getElementById('spreadsheetImportDialog')?.close();
      if(e.target.closest('[data-close-resolver]'))return document.getElementById('spreadsheetResolverDialog')?.close();
      if(e.target.closest('#chooseSpreadsheetFile')||e.target.closest('#changeSpreadsheetFile'))return document.getElementById('spreadsheetFile')?.click();
      if(e.target.closest('#confirmSpreadsheetImport'))return applyImport();
      if(e.target.closest('#autoAssignSpreadsheet'))return autoAssign();
      if(e.target.closest('#reviewSpreadsheetMatches'))return openResolver();
      const rr=e.target.closest('[data-resolve-row]');if(rr)return openResolver(rr.dataset.resolveRow);
      const rc=e.target.closest('[data-resolver-card]');if(rc)return chooseResolverCard(rc.dataset.resolverCard);
      if(e.target.closest('#resolverSkip')){resolverIndex++;renderResolver(document.getElementById('resolverSearch')?.value||'');return}
      if(e.target.closest('#resolverClearChoice')){const item=problemItems()[resolverIndex];if(item)manualChoices.delete(item.rowIndex);analyze();renderResolver();return}
      const problem=e.target.closest('#showProblemOnly');if(problem){const on=problem.dataset.on!=='1';problem.dataset.on=on?'1':'0';problem.textContent=on?'Show All':'Show Problems';renderAnalysis(on);return}
    });
    document.addEventListener('change',e=>{
      if(e.target.id==='spreadsheetFile')return openFile(e.target.files?.[0]);
      if(e.target.id==='spreadsheetSheet')return loadSheet(e.target.value);
      if(e.target.matches('[data-sheet-map]')){mapping[e.target.dataset.sheetMap]=e.target.value;manualChoices.clear();analyze()}
    });
    document.addEventListener('input',e=>{if(e.target.id==='resolverSearch')renderResolver(e.target.value)});
    document.addEventListener('dragover',e=>{const d=e.target.closest?.('#spreadsheetDrop');if(d){e.preventDefault();d.classList.add('dragover')}});
    document.addEventListener('dragleave',e=>{const d=e.target.closest?.('#spreadsheetDrop');if(d)d.classList.remove('dragover')});
    document.addEventListener('drop',e=>{const d=e.target.closest?.('#spreadsheetDrop');if(!d)return;e.preventDefault();d.classList.remove('dragover');openFile(e.dataTransfer?.files?.[0])});
  }

  function init(){ensureCatalog();ensureDialogs();ensureSettingsRow();bind();const observer=new MutationObserver(()=>ensureSettingsRow());observer.observe(document.body,{childList:true,subtree:true})}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();