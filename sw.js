const CACHE_PREFIX='riftbound-vault-';
const CACHE='riftbound-vault-shell-v76';
const CORE_SHELL=[
  './',
  './index.html',
  './styles.css',
  './manifest.json',
  './icon.svg',
  './icon-192.png',
  './icon-512.png'
];

self.addEventListener('install',event=>{
  self.skipWaiting();
  event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(CORE_SHELL)));
});

self.addEventListener('activate',event=>{
  event.waitUntil(
    caches.keys()
      .then(keys=>Promise.all(
        keys
          .filter(key=>key.startsWith(CACHE_PREFIX)&&key!==CACHE)
          .map(key=>caches.delete(key))
      ))
      .then(()=>self.clients.claim())
  );
});

self.addEventListener('fetch',event=>{
  if(event.request.method!=='GET')return;

  const url=new URL(event.request.url);
  if(url.origin!==self.location.origin)return;

  event.respondWith(
    fetch(event.request)
      .then(response=>{
        if(response.ok){
          const copy=response.clone();
          event.waitUntil(caches.open(CACHE).then(cache=>cache.put(event.request,copy)));
        }
        return response;
      })
      .catch(async()=>{
        const cached=await caches.match(event.request);
        if(cached)return cached;

        if(event.request.mode==='navigate'){
          return caches.match('./index.html');
        }

        throw new Error('Offline and no cached response available.');
      })
  );
});
