(() => {
  'use strict';
  let queued=false;

  function assignmentTextWithoutBadge(assignment){
    return [...assignment.childNodes]
      .filter(node=>!(node.nodeType===1&&node.classList?.contains('smart-badge')))
      .map(node=>node.textContent||'')
      .join('');
  }

  function syncBadge(assignment,kind,text=''){
    const badges=[...assignment.querySelectorAll(':scope > .smart-badge')];
    const badge=badges.shift()||null;
    badges.forEach(node=>node.remove());
    if(!kind){
      badge?.remove();
      return;
    }
    const className=`smart-badge ${kind}`;
    if(badge){
      if(badge.className!==className)badge.className=className;
      if(badge.textContent!==text)badge.textContent=text;
      return;
    }
    const node=document.createElement('span');
    node.className=className;
    node.textContent=text;
    assignment.appendChild(node);
  }

  function enhance(){
    const preview=document.getElementById('sheetPreview');
    if(!preview)return;
    const mode=document.getElementById('sheetMode')?.value;
    preview.querySelectorAll('.spreadsheet-tr:not(.spreadsheet-th)').forEach(row=>{
      const assignment=row.children?.[2];
      if(!assignment)return;
      if(mode!=='smart'||!row.classList.contains('matched')){
        syncBadge(assignment,null);
        return;
      }
      const text=assignmentTextWithoutBadge(assignment);
      const matches=[...text.matchAll(/\+\s*(\d+)\s+new/gi)];
      if(matches.length){
        const total=matches.reduce((n,m)=>n+Number(m[1]||0),0);
        syncBadge(assignment,'new',`+${total} new`);
      }else{
        syncBadge(assignment,'owned','Already owned');
      }
    });
  }

  function schedule(){
    if(queued)return;
    queued=true;
    requestAnimationFrame(()=>{queued=false;enhance()});
  }

  function isPreviewNode(node){
    return node?.nodeType===1&&(node.id==='sheetPreview'||node.matches?.('#sheetPreview *')||node.querySelector?.('#sheetPreview'));
  }

  function relevantMutation(records){
    return records.some(record=>{
      if(isPreviewNode(record.target))return true;
      return [...record.addedNodes,...record.removedNodes].some(isPreviewNode);
    });
  }

  document.addEventListener('change',e=>{if(e.target.id==='sheetMode'||e.target.matches?.('[data-map]'))setTimeout(schedule,0)});
  document.addEventListener('click',e=>{if(e.target.closest?.('#openSpreadsheetImport,#reviewSheet,[data-save-row],[data-ignore-row],#sheetProblems'))setTimeout(schedule,30)});

  const observer=new MutationObserver(records=>{if(relevantMutation(records))schedule()});
  function init(){observer.observe(document.body,{childList:true,subtree:true,characterData:true});schedule()}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();