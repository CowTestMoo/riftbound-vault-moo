(() => {
  'use strict';

  const SETTINGS_KEY='riftbound-vault-ux-v1';
  const DEFAULTS={
    showFilterSummary:false,
    showRecentlyAdded:false,
    showSetCompletion:false
  };

  function readSettings(){
    try{return {...DEFAULTS,...JSON.parse(localStorage.getItem(SETTINGS_KEY)||'{}')};}
    catch{return {...DEFAULTS};}
  }

  function writeSetting(key,value){
    const settings=readSettings();
    settings[key]=!!value;
    localStorage.setItem(SETTINGS_KEY,JSON.stringify(settings));
  }

  function makeToggle(id,key,title,description){
    const row=document.createElement('div');
    row.className='setting-row collection-panel-setting';
    row.innerHTML=`<div class="setting-copy"><strong>${title}</strong><small>${description}</small></div><input id="${id}" class="sound-toggle" type="checkbox" aria-label="${title}">`;
    row.querySelector('input').dataset.panelSetting=key;
    return row;
  }

  function ensureSettingsToggles(){
    const panel=document.getElementById('uxSettings');
    if(!panel)return false;

    if(!document.getElementById('showFilterSummaryToggle')){
      panel.appendChild(makeToggle('showFilterSummaryToggle','showFilterSummary','Filter summary','Show the current filters and visible-card count.'));
      panel.appendChild(makeToggle('showRecentlyAddedToggle','showRecentlyAdded','Recently Added','Show your latest collection additions.'));
      panel.appendChild(makeToggle('showSetCompletionToggle','showSetCompletion','Set Completion','Show unique-card progress for each set.'));
    }
    return true;
  }

  function ensureExportInSettings(){
    const panel=document.getElementById('uxSettings');
    const exportBtn=document.getElementById('exportBtn');
    if(!panel||!exportBtn)return false;

    let row=document.getElementById('backupExportSetting');
    if(!row){
      row=document.createElement('div');
      row.id='backupExportSetting';
      row.className='setting-row backup-export-setting';
      row.innerHTML='<div class="setting-copy"><strong>Export backup</strong><small>Download a JSON copy of your local collection data.</small></div>';
      panel.appendChild(row);
    }

    if(exportBtn.parentElement!==row){
      exportBtn.classList.add('settings-export-btn');
      exportBtn.textContent='Export';
      row.appendChild(exportBtn);
    }
    return true;
  }

  function setVisible(element,visible){
    if(!element)return;
    element.style.display=visible?'':'none';
    element.setAttribute('aria-hidden',visible?'false':'true');
  }

  function applyVisibility(){
    const settings=readSettings();
    const filterSummary=document.getElementById('filterSummary');
    const dashboard=document.getElementById('collectionDashboard');
    const recent=dashboard?.querySelector('.recent-panel');
    const completion=dashboard?.querySelector('.set-progress-panel');

    setVisible(filterSummary,settings.showFilterSummary);
    setVisible(recent,settings.showRecentlyAdded);
    setVisible(completion,settings.showSetCompletion);
    if(dashboard)setVisible(dashboard,settings.showRecentlyAdded||settings.showSetCompletion);

    document.querySelectorAll('.completion-burst').forEach(el=>setVisible(el,settings.showSetCompletion));

    const filterToggle=document.getElementById('showFilterSummaryToggle');
    const recentToggle=document.getElementById('showRecentlyAddedToggle');
    const completionToggle=document.getElementById('showSetCompletionToggle');
    if(filterToggle)filterToggle.checked=!!settings.showFilterSummary;
    if(recentToggle)recentToggle.checked=!!settings.showRecentlyAdded;
    if(completionToggle)completionToggle.checked=!!settings.showSetCompletion;
  }

  function ensureSettingsExtras(){
    ensureSettingsToggles();
    ensureExportInSettings();
  }

  function init(){
    ensureSettingsExtras();
    applyVisibility();

    document.addEventListener('change',event=>{
      const input=event.target.closest('[data-panel-setting]');
      if(!input)return;
      writeSetting(input.dataset.panelSetting,input.checked);
      applyVisibility();
    });

    const observer=new MutationObserver(()=>{
      ensureSettingsExtras();
      applyVisibility();
    });
    observer.observe(document.body,{childList:true,subtree:true});

    window.addEventListener('storage',event=>{
      if(event.key===SETTINGS_KEY)applyVisibility();
    });
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});
  else init();
})();