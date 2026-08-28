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

  function ensureCenterTools(){
    const nav=document.getElementById('mobileNav');
    if(!nav)return null;
    document.getElementById('mobileToolsUtilityBtn')?.remove();

    let legacy=nav.querySelector('[data-mobile-tab="tools"]');
    if(!legacy){
      legacy=document.createElement('button');
      legacy.type='button';
      legacy.dataset.mobileTab='tools';
      legacy.innerHTML='<b>✦</b>Tools';
      nav.appendChild(legacy);
    }
    legacy.classList.add('mobile-tools-legacy');
    legacy.setAttribute('aria-hidden','true');
    legacy.tabIndex=-1;

    let tools=document.getElementById('mobileToolsCenterBtn');
    if(!tools){
      tools=document.createElement('button');
      tools.id='mobileToolsCenterBtn';
      tools.type='button';
      tools.dataset.mobileTools='1';
      tools.className='mobile-tools-center';
      tools.setAttribute('aria-label','Open Vault Tools');
      tools.innerHTML='<b>✦</b><span>Tools</span>';
    }

    const cards=nav.querySelector('[data-mobile-tab="cards"]');
    const storage=nav.querySelector('[data-mobile-tab="storage"]');
    const decks=nav.querySelector('[data-mobile-tab="decks"]');
    const loans=nav.querySelector('[data-mobile-tab="loans"]');
    [cards,storage,tools,decks,loans,legacy].filter(Boolean).forEach(x=>nav.appendChild(x));
    return tools;
  }

  function prepareBrowseButton(bar){
    const browse=document.getElementById('browseLibrariesUtilityBtn');
    if(!browse)return;
    browse.textContent='Libraries';
    browse.classList.add('mobile-utility-btn','mobile-library-utility');
    const settings=document.getElementById('uxSettingsBtn');
    if(settings?.parentElement===bar)bar.insertBefore(browse,settings);
    else if(browse.parentElement!==bar)bar.prepend(browse);
  }

  function prepareSettingsButton(bar){
    const settings=document.getElementById('uxSettingsBtn');
    if(!settings)return;
    settings.textContent='Settings';
    settings.classList.remove('library-nav-btn');
    settings.classList.add('mobile-utility-btn','mobile-settings-utility');
    if(settings.parentElement!==bar)bar.appendChild(settings);
  }

  function restoreDesktopControls(){
    const settings=document.getElementById('uxSettingsBtn');
    const browse=document.getElementById('browseLibrariesUtilityBtn');
    const tabs=document.querySelector('.tabs');

    if(browse&&tabs){
      browse.textContent='Browse Libraries';
      browse.classList.remove('mobile-utility-btn','mobile-library-utility');
      browse.classList.add('library-nav-btn');
      const tools=tabs.querySelector('[data-tab="tools"]');
      if(tools&&tools.nextElementSibling!==browse)tools.insertAdjacentElement('afterend',browse);
      else if(!tools&&browse.parentElement!==tabs)tabs.appendChild(browse);
    }

    if(settings&&tabs){
      settings.textContent='Settings';
      settings.classList.remove('mobile-utility-btn','mobile-settings-utility','ghost-btn','ux-settings-btn');
      settings.classList.add('library-nav-btn');
      if(browse&&browse.nextElementSibling!==settings)browse.insertAdjacentElement('afterend',settings);
      else if(!browse&&settings.parentElement!==tabs)tabs.appendChild(settings);
    }
  }

  function syncActive(){
    const active=document.querySelector('.tab.active')?.dataset.tab||'';
    document.querySelectorAll('#mobileNav [data-mobile-tab]').forEach(b=>{
      const on=b.dataset.mobileTab===active;
      b.classList.toggle('active',on);
      if(on)b.setAttribute('aria-current','page');else b.removeAttribute('aria-current');
    });
    const tools=document.getElementById('mobileToolsCenterBtn');
    if(tools){
      const on=active==='tools';
      tools.classList.toggle('active',on);
      if(on)tools.setAttribute('aria-current','page');else tools.removeAttribute('aria-current');
    }
  }

  function apply(){
    const bar=ensureMobileUtilityBar();
    if(!bar)return;
    ensureCenterTools();
    if(!mq.matches){restoreDesktopControls();syncActive();return}

    prepareSettingsButton(bar);
    if(signedIn())prepareBrowseButton(bar);
    else document.getElementById('browseLibrariesUtilityBtn')?.remove();
    syncActive();
  }

  document.addEventListener('click',e=>{
    if(e.target.closest('.tab,[data-mobile-tab],#mobileToolsCenterBtn'))setTimeout(syncActive,0);
  },true);
  window.addEventListener('riftbound-social-ready',()=>setTimeout(apply,0));
  window.addEventListener('riftbound-auth-storage-change',()=>setTimeout(apply,80));
  window.addEventListener('riftbound-cloud-restored',()=>setTimeout(apply,40));
  if(typeof mq.addEventListener==='function')mq.addEventListener('change',apply);else mq.addListener(apply);

  function init(){setTimeout(apply,0);setTimeout(apply,450);setTimeout(apply,1100)}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();