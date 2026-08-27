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
  let book=null;
  let rows=[];
  let fileName='';
  let mapping={code:'',number:'',set:'',name:'',qty:''};
  let analysis=null;

  const esc=(v='')=>String(v).replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
  const norm=v=>String(v??'').trim().toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g,'').replace(/[_-]+/g,' ').replace(/\s+/g,' ');
  const compact=v=>norm(v).replace(/[^a-z0-9]/g,'');
  const cardName=c=>c?.fullName||c?.name||c?.cardCode||'Unknown card';
  const state=()=>{try{return JSON.parse(localStorage.getItem(APP_KEY)||'{}')}catch{return {}}};
  const uid=(p='id')=>`${p}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,9)}`;

  function ensureSettingsRow(){
    const panel=document.getElementById('uxSettings');
    if(!panel||document.getElementById('spreadsheetImportSetting'))return !!panel;
    const row=document.createElement('div');
    row.id='spreadsheetImportSetting';
    row.className='setting-row spreadsheet-import-setting';
    row.innerHTML='<div class="setting-copy"><strong>Import spreadsheet</strong><small>Import cards from Excel or CSV using card numbers, codes, names, sets, and quantities.</small></div><button id="openSpreadsheetImport" class="sound-test" type="button">Import</button>';
    panel.appendChild(row);
    return true;
  }

  function ensureDialog(){
    if(document.getElementById('spreadsheetImportDialog'))return;
    const d=document.createElement('dialog');
    d.id='spreadsheetImportDialog';
    d.className='modal spreadsheet-import-dialog';
    d.innerHTML=`<div class="modal-inner spreadsheet-import-inner">
      <div class="modal-head"><div><h2>Import Spreadsheet</h2><p class="spreadsheet-subtitle">Excel / CSV → Riftbound Vault</p></div><button class="close-btn" data-close-spreadsheet>×</button></div>
      <div class="spreadsheet-drop" id="spreadsheetDrop">
        <input id="spreadsheetFile" type="file" accept=".xlsx,.xls,.csv,.xlsb,.ods" hidden>
        <div class="spreadsheet-drop-icon">✦</div><strong>Choose an Excel or CSV file</strong><span>or drag and drop it here</span>
        <button id="chooseSpreadsheetFile" class="primary-btn" type="button">Choose File</button>
      </div>
      <div id="spreadsheetWorkspace" hidden>
        <div class="spreadsheet-filebar"><div><strong id="spreadsheetFileName"></strong><small id="spreadsheetRowCount"></small></div><button id="changeSpreadsheetFile" class="ghost-btn" type="button">Change File</button></div>
        <div class="spreadsheet-grid-two">
          <label>Sheet<select id="spreadsheetSheet"></select></label>
          <label>Import mode<select id="spreadsheetMode"><option value="add">Add quantities to collection</option><option value="set">Set owned quantities for matched cards</option></select></label>
        </div>
        <div class="spreadsheet-mapping-wrap"><div class="spreadsheet-section-head"><div><h3>Column Mapping</h3><p>We auto-detected these. Change anything that looks wrong.</p></div></div><div id="spreadsheetMapping" class="spreadsheet-mapping"></div></div>
        <div id="spreadsheetSummary" class="spreadsheet-summary"></div>
        <div class="spreadsheet-preview-wrap"><div class="spreadsheet-section-head"><div><h3>Preview</h3><p>Nothing changes until you confirm the import.</p></div><button id="showUnmatchedOnly" class="ghost-btn" type="button">Show Unmatched</button></div><div id="spreadsheetPreview" class="spreadsheet-preview"></div></div>
        <div id="spreadsheetMessage" class="feature-message"></div>
        <div class="modal-actions spreadsheet-actions"><button id="confirmSpreadsheetImport" class="primary-btn" type="button" disabled>Import Matched Cards</button></div>
      </div>
    </div>`;
    document.body.appendChild(d);
  }

  function loadXLSX(){
    if(window.XLSX)return Promise.resolve(window.XLSX);
    return new Promise((resolve,reject)=>{
      const existing=document.querySelector(`script[src="${XLSX_SRC}"]`);
      if(existing){existing.addEventListener('load',()=>resolve(window.XLSX),{once:true});existing.addEventListener('error',()=>reject(new Error('Spreadsheet reader failed to load.')),{once:true});return}
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
      const candidates=aliases.map(a=>({n:norm(a),c:compact(a)}));
      const exact=normalized.find(h=>candidates.some(a=>h.n===a.n||h.c===a.c));
      if(exact)out[key]=exact.raw;
    }
    return out;
  }

  function columnOptions(headers,value){
    return `<option value="">Not provided</option>${headers.map(h=>`<option value="${esc(h)}" ${h===value?'selected':''}>${esc(h)}</option>`).join('')}`;
  }

  function renderMapping(){
    const root=document.getElementById('spreadsheetMapping');if(!root)return;
    const headers=rows.length?Object.keys(rows[0]):[];
    const defs=[['code','Card code','Best match when available'],['number','Card number','Collector/card number'],['set','Set','Helps disambiguate card numbers'],['name','Card name','Fallback matching'],['qty','Quantity','Defaults to 1 if omitted']];
    root.innerHTML=defs.map(([key,title,help])=>`<label><span><strong>${title}</strong><small>${help}</small></span><select data-sheet-map="${key}">${columnOptions(headers,mapping[key])}</select></label>`).join('');
  }

  function numericQty(v){
    if(v===''||v===null||v===undefined)return 1;
    const n=Number(String(v).replace(/,/g,'').trim());
    return Number.isFinite(n)?Math.max(0,Math.floor(n)):0;
  }
  function numberKeys(v){
    const raw=String(v??'').trim();if(!raw)return [];
    const keys=new Set([compact(raw)]);
    const m=raw.match(/^(?:[^0-9]*)(\d+)(.*)$/);
    if(m){keys.add(`${Number(m[1])}${compact(m[2])}`);keys.add(String(Number(m[1])))}
    return [...keys].filter(Boolean);
  }
  function setKeys(card){return [card.setCode,card.cardSet,card.setName].filter(Boolean).map(compact)}

  function buildIndexes(catalog){
    const codes=new Map(),numbers=new Map(),setNumbers=new Map(),names=new Map(),setNames=new Map();
    const push=(map,key,card)=>{if(!key)return;const a=map.get(key)||[];a.push(card);map.set(key,a)};
    catalog.forEach(c=>{
      codes.set(compact(c.cardCode),c);
      numberKeys(c.cardNumber).forEach(n=>push(numbers,n,c));
      setKeys(c).forEach(s=>numberKeys(c.cardNumber).forEach(n=>push(setNumbers,`${s}|${n}`,c)));
      push(names,norm(cardName(c)),c);
      setKeys(c).forEach(s=>push(setNames,`${s}|${norm(cardName(c))}`,c));
    });
    return {codes,numbers,setNumbers,names,setNames};
  }

  function unique(arr){return Array.isArray(arr)&&arr.length===1?arr[0]:null}
  function matchRow(row,idx){
    const code=mapping.code?row[mapping.code]:'';
    if(code){const c=idx.codes.get(compact(code));if(c)return {card:c,method:'Card code'}}
    const number=mapping.number?row[mapping.number]:'';
    const set=mapping.set?row[mapping.set]:'';
    const name=mapping.name?row[mapping.name]:'';
    const setVariants=set?[compact(set)]:[];
    if(number&&setVariants.length){
      for(const s of setVariants)for(const n of numberKeys(number)){const c=unique(idx.setNumbers.get(`${s}|${n}`));if(c)return {card:c,method:'Set + number'}}
    }
    if(number){
      for(const n of numberKeys(number)){const c=unique(idx.numbers.get(n));if(c)return {card:c,method:'Card number'}}
    }
    if(name&&setVariants.length){
      for(const s of setVariants){const c=unique(idx.setNames.get(`${s}|${norm(name)}`));if(c)return {card:c,method:'Set + name'}}
    }
    if(name){const c=unique(idx.names.get(norm(name)));if(c)return {card:c,method:'Card name'}}
    return {card:null,method:'Unmatched'};
  }

  function analyze(){
    const catalog=window.RiftboundApp?.getCatalog?.()||[];
    if(!catalog.length){analysis={items:[],matched:0,unmatched:rows.length,totalQty:0,duplicateRows:0};renderAnalysis();return}
    const idx=buildIndexes(catalog),items=[],aggregate=new Map();let unmatched=0,totalQty=0,duplicateRows=0;
    rows.forEach((row,i)=>{
      const qty=numericQty(mapping.qty?row[mapping.qty]:'');
      const result=matchRow(row,idx);
      const item={row:i+2,rowData:row,qty,...result};items.push(item);
      if(!result.card){unmatched++;return}
      totalQty+=qty;
      if(aggregate.has(result.card.cardCode))duplicateRows++;
      const existing=aggregate.get(result.card.cardCode)||{card:result.card,qty:0,rows:[]};existing.qty+=qty;existing.rows.push(item);aggregate.set(result.card.cardCode,existing);
    });
    analysis={items,aggregate,matched:items.length-unmatched,unmatched,totalQty,duplicateRows,uniqueMatched:aggregate.size};
    renderAnalysis();
  }

  function renderAnalysis(unmatchedOnly=false){
    const a=analysis||{items:[],matched:0,unmatched:0,totalQty:0,duplicateRows:0,uniqueMatched:0};
    const summary=document.getElementById('spreadsheetSummary');
    if(summary)summary.innerHTML=`<div><strong>${rows.length}</strong><small>Rows</small></div><div class="good"><strong>${a.matched}</strong><small>Matched</small></div><div class="${a.unmatched?'warn':''}"><strong>${a.unmatched}</strong><small>Unmatched</small></div><div><strong>${a.uniqueMatched||0}</strong><small>Unique cards</small></div><div><strong>${a.totalQty}</strong><small>Copies</small></div>`;
    const root=document.getElementById('spreadsheetPreview');if(root){
      let shown=(a.items||[]).filter(x=>!unmatchedOnly||!x.card).slice(0,80);
      root.innerHTML=shown.length?`<div class="spreadsheet-table"><div class="spreadsheet-tr spreadsheet-th"><span>Row</span><span>Spreadsheet</span><span>Matched card</span><span>Qty</span><span>Status</span></div>${shown.map(x=>{
        const rawName=mapping.name?x.rowData[mapping.name]:'';const rawNumber=mapping.number?x.rowData[mapping.number]:'';const rawSet=mapping.set?x.rowData[mapping.set]:'';const label=[rawName,rawSet,rawNumber].filter(v=>String(v??'').trim()).join(' • ')||'(blank row)';
        return `<div class="spreadsheet-tr ${x.card?'matched':'unmatched'}"><span>${x.row}</span><span title="${esc(label)}">${esc(label)}</span><span>${x.card?`${esc(cardName(x.card))}<small>${esc(x.card.cardSet||x.card.setCode||'')} ${esc(x.card.cardNumber||'')}</small>`:'<em>No safe match</em>'}</span><span>${x.qty}</span><span>${x.card?`<b>✓</b> ${esc(x.method)}`:'<b>!</b> Unmatched'}</span></div>`;
      }).join('')}</div>${(a.items||[]).filter(x=>!unmatchedOnly||!x.card).length>80?'<p class="spreadsheet-more">Showing the first 80 preview rows.</p>':''}`:'<div class="recent-empty">No rows to preview.</div>';
    }
    const btn=document.getElementById('confirmSpreadsheetImport');if(btn)btn.disabled=!(a.matched>0);
    const msg=document.getElementById('spreadsheetMessage');if(msg){
      if(!mapping.code&&!mapping.number&&!mapping.name)msg.textContent='Map at least a card code, card number, or card name column.';
      else if(a.unmatched)msg.textContent=`${a.unmatched} row${a.unmatched===1?'':'s'} could not be matched safely and will be skipped.`;
      else msg.textContent='All rows matched. Review the preview, then import when ready.';
    }
  }

  function loadSheet(name){
    if(!book||!window.XLSX)return;
    const ws=book.Sheets[name];
    rows=window.XLSX.utils.sheet_to_json(ws,{defval:'',raw:false,blankrows:false});
    const headers=rows.length?Object.keys(rows[0]):[];
    mapping=detectMapping(headers);
    document.getElementById('spreadsheetRowCount').textContent=`${rows.length.toLocaleString()} data rows`;
    renderMapping();analyze();
  }

  async function openFile(file){
    try{
      if(!file)return;
      fileName=file.name;
      document.getElementById('spreadsheetDrop').classList.add('loading');
      const XLSX=await loadXLSX();
      const data=await file.arrayBuffer();
      book=XLSX.read(data,{type:'array',cellDates:true});
      if(!book.SheetNames?.length)throw new Error('No worksheets were found in that file.');
      const select=document.getElementById('spreadsheetSheet');select.innerHTML=book.SheetNames.map(n=>`<option value="${esc(n)}">${esc(n)}</option>`).join('');
      document.getElementById('spreadsheetFileName').textContent=fileName;
      document.getElementById('spreadsheetDrop').hidden=true;
      document.getElementById('spreadsheetWorkspace').hidden=false;
      loadSheet(book.SheetNames[0]);
    }catch(err){console.error(err);alert(`Could not read spreadsheet: ${err.message}`)}
    finally{document.getElementById('spreadsheetDrop').classList.remove('loading')}
  }

  function allocated(code,s){
    const decked=(s.decks||[]).reduce((n,d)=>n+Number(d.cards?.[code]||0),0);
    const loaned=(s.loans||[]).filter(l=>!l.returnedAt&&l.cardCode===code).reduce((n,l)=>n+Number(l.qty||0),0);
    return decked+loaned;
  }

  function applyImport(){
    if(!analysis?.aggregate?.size)return;
    const mode=document.getElementById('spreadsheetMode')?.value||'add';
    const s={inventory:{},decks:[],loans:[],transactions:[],...state()};
    s.inventory=s.inventory||{};s.transactions=s.transactions||[];
    let changed=0,allocationClamps=0;
    for(const [code,item] of analysis.aggregate){
      const current=Number(s.inventory[code]?.owned||0),minimum=allocated(code,s);
      let next=mode==='set'?item.qty:current+item.qty;
      if(next<minimum){next=minimum;allocationClamps++}
      next=Math.max(0,Math.floor(next));
      if(next===current)continue;
      s.inventory[code]={...(s.inventory[code]||{}),owned:next};
      changed++;
    }
    s.transactions=[{id:uid('evt'),type:'activity',action:`Imported spreadsheet “${fileName}” • ${changed} cards ${mode==='set'?'set':'updated'}`,at:new Date().toISOString(),source:'spreadsheet',matchedRows:analysis.matched,unmatchedRows:analysis.unmatched},...s.transactions].slice(0,500);
    localStorage.setItem(APP_KEY,JSON.stringify(s));
    window.RiftboundApp?.reloadState?.();
    window.RiftboundCloud?.syncNow?.();
    const msg=document.getElementById('spreadsheetMessage');
    if(msg)msg.textContent=`Import complete: ${changed} unique cards updated${allocationClamps?`. ${allocationClamps} quantities were kept high enough for cards already in decks/loans.`:'.'}`;
    const btn=document.getElementById('confirmSpreadsheetImport');if(btn){btn.disabled=true;btn.textContent='Imported ✓'}
    setTimeout(()=>{document.getElementById('spreadsheetImportDialog')?.close()},1500);
  }

  function resetDialog(){
    book=null;rows=[];analysis=null;fileName='';mapping={code:'',number:'',set:'',name:'',qty:''};
    const drop=document.getElementById('spreadsheetDrop'),work=document.getElementById('spreadsheetWorkspace'),file=document.getElementById('spreadsheetFile');
    if(drop)drop.hidden=false;if(work)work.hidden=true;if(file)file.value='';
    const btn=document.getElementById('confirmSpreadsheetImport');if(btn){btn.disabled=true;btn.textContent='Import Matched Cards'}
  }

  function openDialog(){
    ensureDialog();resetDialog();document.getElementById('spreadsheetImportDialog').showModal();
  }

  function bind(){
    document.addEventListener('click',e=>{
      if(e.target.closest('#openSpreadsheetImport'))return openDialog();
      if(e.target.closest('[data-close-spreadsheet]'))return document.getElementById('spreadsheetImportDialog')?.close();
      if(e.target.closest('#chooseSpreadsheetFile')||e.target.closest('#changeSpreadsheetFile'))return document.getElementById('spreadsheetFile')?.click();
      if(e.target.closest('#confirmSpreadsheetImport'))return applyImport();
      const unmatched=e.target.closest('#showUnmatchedOnly');if(unmatched){const on=unmatched.dataset.on!=='1';unmatched.dataset.on=on?'1':'0';unmatched.textContent=on?'Show All':'Show Unmatched';renderAnalysis(on);return}
    });
    document.addEventListener('change',e=>{
      if(e.target.id==='spreadsheetFile'){openFile(e.target.files?.[0]);return}
      if(e.target.id==='spreadsheetSheet'){loadSheet(e.target.value);return}
      if(e.target.matches('[data-sheet-map]')){mapping[e.target.dataset.sheetMap]=e.target.value;analyze();return}
    });
    document.addEventListener('dragover',e=>{if(e.target.closest('#spreadsheetDrop')){e.preventDefault();e.target.closest('#spreadsheetDrop').classList.add('dragover')}});
    document.addEventListener('dragleave',e=>{const d=e.target.closest?.('#spreadsheetDrop');if(d)d.classList.remove('dragover')});
    document.addEventListener('drop',e=>{const d=e.target.closest?.('#spreadsheetDrop');if(!d)return;e.preventDefault();d.classList.remove('dragover');openFile(e.dataTransfer?.files?.[0])});
  }

  function init(){
    ensureDialog();ensureSettingsRow();bind();
    const observer=new MutationObserver(()=>ensureSettingsRow());observer.observe(document.body,{childList:true,subtree:true});
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();