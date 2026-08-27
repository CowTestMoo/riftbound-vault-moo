(() => {
  'use strict';

  const mq=window.matchMedia('(max-width:700px)');

  function signedIn(){return !!window.RiftboundCloud?.getSession?.()?.user}

  function ensureMobileUtilityBar(){
    let bar=document.getElementById('mobileUtilityBar');
    if(bar)return bar;
    const stats=document.querySelector('.stats-strip');
    if(!stats)return null;
    bar=document.createElement('nav');
    bar.id='mobileUtilityBar';
    bar.className='mobile-utility-bar';
    bar.setAttribute('aria-label','Mobile utilities');
    stats.insertAdjacentElement('afterend',bar);
    return bar;
  }

  function ensureToolsButton(bar){
    let btn=document.getElementById('mobileToolsUtilityBtn');
    if(!btn){
      btn=document.createElement('button');
      btn.id='mobileToolsUtilityBtn';
      btn.type='button';
      btn.className='mobile-utility-btn';
      btn.innerHTML='<b>✦</b><span>Tools</span>';
      btn.addEventListener('click',e=>{
        e.preventDefault();
        document.querySelector('.tab[data-tab="tools"]')?.click();
        syncActive();
        window.scrollTo({top:0,behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'});
      });
    }
    if(btn.parentElement!==bar)bar.prepend(btn);
    return btn;
  }

  function prepareBrowseButton(bar){
    const browse=document.getElementById('browseLibrariesUtilityBtn');
    if(!browse)return;
    browse.textContent='Libraries';
    browse.classList.add('mobile-utility-btn','mobile-library-utility');
    const settings=document.getElementById('uxSettingsBtn');
    if(settings?.parentElement===bar)bar.insertBefore(browse,settings);
    else if(browse.parentElement!==bar)bar.appendChild(browse);
  }

  function prepareSettingsButton(bar){
    const settings=document.getElementById('uxSettingsBtn');
    if(!settings)return;
    settings.textContent='Settings';
    settings.classList.add('mobile-utility-btn','mobile-settings-utility');
    if(settings.parentElement!==bar)bar.appendChild(settings);
  }

  function restoreDesktopControls(){
    const settings=document.getElementById('uxSettingsBtn');
    const stack=document.getElementById('cosmicUtilityStack');
    if(settings&&stack&&settings.parentElement!==stack)stack.appendChild(settings);
    settings?.classList.remove('mobile-utility-btn','mobile-settings-utility');

    const browse=document.getElementById('browseLibrariesUtilityBtn');
    const tabs=document.querySelector('.tabs');
    if(browse&&tabs){
      browse.textContent='Browse Libraries';
      browse.classList.remove('mobile-utility-btn','mobile-library-utility');
      const tools=tabs.querySelector('[data-tab="tools"]');
      if(tools&&tools.nextElementSibling!==browse)tools.insertAdjacentElement('afterend',browse);
      else if(!tools&&browse.parentElement!==tabs)tabs.appendChild(browse);
    }
  }

  function removeRedundantMobileTools(){document.querySelectorAll('#mobileNav [data-mobile-tab="tools"]').forEach(x=>x.remove())}

  function syncActive(){
    const tools=document.querySelector('.tab[data-tab="tools"]')?.classList.contains('active');
    document.getElementById('mobileToolsUtilityBtn')?.classList.toggle('active',!!tools);
  }

  function apply(){
    removeRedundantMobileTools();
    const bar=ensureMobileUtilityBar();
    if(!bar)return;
    if(!mq.matches){restoreDesktopControls();syncActive();return}

    ensureToolsButton(bar);
    prepareSettingsButton(bar);
    if(signedIn())prepareBrowseButton(bar);
    else document.getElementById('browseLibrariesUtilityBtn')?.remove();
    syncActive();
  }

  document.addEventListener('click',e=>{if(e.target.closest('.tab,[data-mobile-tab],#mobileToolsUtilityBtn'))setTimeout(syncActive,0)},true);
  window.addEventListener('riftbound-social-ready',()=>setTimeout(apply,0));
  window.addEventListener('riftbound-auth-storage-change',()=>setTimeout(apply,80));
  window.addEventListener('riftbound-cloud-restored',()=>setTimeout(apply,40));
  if(typeof mq.addEventListener==='function')mq.addEventListener('change',apply);else mq.addListener(apply);

  function init(){setTimeout(apply,0);setTimeout(apply,450);setTimeout(apply,1100)}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
