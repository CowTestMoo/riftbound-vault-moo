const CACHE='riftbound-vault-shell-v59';
const SHELL=[
  './','./index.html','./styles.css','./polish.css','./cosmic-cleanup.css','./ux.css','./vault-features.css','./invite-lock.css','./spreadsheet-import.css','./bulk-entry.css','./storage-customizer.css','./social-libraries.css','./deck-viewer.css','./ui-refinements.css','./theme-system.css','./friend-library-extras.css','./mobile-ui.css','./mobile-experience.css','./vault-compare.css','./scanner-v2.css','./theme-fixes.css','./header-actions.css','./rune-filters.css','./premade-decks.css',
  './polish.js','./theme-bootstrap.js','./theme-loader.js','./ux.js','./dashboard-toggles.js','./app.js','./app-bridge.js','./deck-viewer.js','./storage-customizer.js','./auth-session-pref.js','./cloud-sync.js','./invite-lock.js','./vault-features.js','./spreadsheet-import.js','./bulk-entry.js','./smart-import-badges.js','./export-enhancer.js','./social-libraries.js','./username-colors.js','./utility-controls.js','./theme-system-v3.js','./profile-switching.js','./friend-library-extras.js','./mobile-ui.js','./mobile-experience.js','./live-values.js','./scanner-ai.js','./vault-compare.js','./rune-filters.js','./premade-decks.js','./manifest.json','./icon.svg'
];

self.addEventListener('install',event=>{
  self.skipWaiting();
  event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(SHELL)));
});

self.addEventListener('activate',event=>{
  event.waitUntil(
    caches.keys()
      .then(keys=>Promise.all(keys.filter(key=>key!==CACHE).map(key=>caches.delete(key))))
      .then(()=>self.clients.claim())
  );
});

self.addEventListener('fetch',event=>{
  if(event.request.method!=='GET')return;
  const url=new URL(event.request.url);
  if(url.origin===self.location.origin){
    event.respondWith(
      fetch(event.request)
        .then(response=>{
          const copy=response.clone();
          caches.open(CACHE).then(cache=>cache.put(event.request,copy));
          return response;
        })
        .catch(()=>caches.match(event.request))
    );
    return;
  }
  event.respondWith(caches.match(event.request).then(hit=>hit||fetch(event.request)));
});