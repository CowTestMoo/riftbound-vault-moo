(() => {
  'use strict';
  function clean(){
    document.querySelectorAll('#domainFilters .domain-glyph,.friend-filters .domain-glyph').forEach(x=>x.remove());
  }
  window.addEventListener('riftbound-ui-render',e=>{if((e.detail?.scopes||[]).includes('filters'))requestAnimationFrame(clean)});
  window.addEventListener('riftbound-friend-render',()=>requestAnimationFrame(clean));
  document.addEventListener('click',e=>{if(e.target.closest('#mobileFilterBtn'))clean()},true);
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>{clean();setTimeout(clean,700)},{once:true});else{clean();setTimeout(clean,700)}
})();