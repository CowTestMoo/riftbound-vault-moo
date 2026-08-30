(() => {
  'use strict';
  let queued=false;
  function enhance(){
    const mode=document.getElementById('sheetMode')?.value;
    document.querySelectorAll('#sheetPreview .spreadsheet-tr:not(.spreadsheet-th)').forEach(row=>{
      row.querySelectorAll('.smart-badge').forEach(x=>x.remove());
      if(mode!=='smart'||!row.classList.contains('matched'))return;
      const assignment=row.children?.[2];if(!assignment)return;
      const text=assignment.textContent||'';
      const matches=[...text.matchAll(/\+\s*(\d+)\s+new/gi)];
      if(matches.length){
        const total=matches.reduce((n,m)=>n+Number(m[1]||0),0);
        assignment.insertAdjacentHTML('beforeend',`<span class="smart-badge new">+${total} new</span>`);
      }else{
        assignment.insertAdjacentHTML('beforeend','<span class="smart-badge owned">Already owned</span>');
      }
    });
  }
  function schedule(){if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;enhance()})}
  document.addEventListener('change',e=>{if(e.target.id==='sheetMode'||e.target.matches('[data-map]'))setTimeout(schedule,0)});
  document.addEventListener('click',e=>{if(e.target.closest('#openSpreadsheetImport,#reviewSheet,[data-save-row],[data-ignore-row],#sheetProblems'))setTimeout(schedule,30)});
  const observer=new MutationObserver(schedule);
  function init(){const dialog=document.getElementById('spreadsheetImportDialog');if(dialog)observer.observe(dialog,{childList:true,subtree:true});schedule()}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();