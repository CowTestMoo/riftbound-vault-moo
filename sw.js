const CACHE_PREFIX='riftbound-vault-';
const CACHE='riftbound-vault-shell-v79';
const CORE_SHELL=[
  './',
  './index.html',
  './login.html',
  './auth-boot.js',
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

function cacheResponse(request,response,event){
  if(!response?.ok)return;
  const copy=response.clone();
  event.waitUntil(caches.open(CACHE).then(cache=>cache.put(request,copy)));
}

async function networkFirst(request,event){
  try{
    const response=await fetch(request);
    cacheResponse(request,response,event);
    return response;
  }catch{
    const cached=await caches.match(request);
    if(cached)return cached;
    const url=new URL(request.url);
    if(request.mode==='navigate'||url.pathname.endsWith('/index.html'))return caches.match('./index.html');
    throw new Error('Offline and no cached response available.');
  }
}

async function staleWhileRevalidate(request,event){
  const cached=await caches.match(request);
  const network=fetch(request)
    .then(response=>{
      cacheResponse(request,response,event);
      return response;
    })
    .catch(()=>null);

  if(cached){
    event.waitUntil(network.then(()=>{}));
    return cached;
  }

  const response=await network;
  if(response)return response;
  throw new Error('Offline and no cached response available.');
}

self.addEventListener('fetch',event=>{
  if(event.request.method!=='GET')return;

  const url=new URL(event.request.url);
  if(url.origin!==self.location.origin)return;

  if(event.request.mode==='navigate'){
    event.respondWith(networkFirst(event.request,event));
    return;
  }

  const destination=event.request.destination;
  const isStatic=['script','style','image','font','manifest'].includes(destination);
  const isAppData=url.pathname.endsWith('/data/cards.json')||url.pathname.endsWith('/data/prices.json');

  if(isStatic||isAppData){
    event.respondWith(staleWhileRevalidate(event.request,event));
    return;
  }

  event.respondWith(networkFirst(event.request,event));
});
