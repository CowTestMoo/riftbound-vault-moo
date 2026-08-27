const CACHE='riftbound-vault-shell-v12';
const SHELL=['./','./index.html','./styles.css','./cosmic-effects.css','./polish.css','./cosmic-cleanup.css','./ux.css','./rune-sound.css','./vault-features.css','./cosmic.js','./polish.js','./ux.js','./rune-sound.js','./dashboard-toggles.js','./app.js','./app-bridge.js','./cloud-sync.js','./vault-features.js','./manifest.json','./icon.svg'];

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
  if(event.request.method!=='GET') return;
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