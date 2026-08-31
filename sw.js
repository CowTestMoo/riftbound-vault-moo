/* One-time retirement worker for the abandoned PWA experiment.
   It removes only Riftbound Vault caches and unregisters itself. */
self.addEventListener('install',event=>{
  self.skipWaiting();
});

self.addEventListener('activate',event=>{
  event.waitUntil((async()=>{
    try{
      const keys=await caches.keys();
      await Promise.all(keys
        .filter(key=>key.startsWith('riftbound-vault'))
        .map(key=>caches.delete(key)));
    }catch{}

    try{await self.registration.unregister()}catch{}

    try{
      const windows=await self.clients.matchAll({type:'window',includeUncontrolled:true});
      await Promise.all(windows.map(client=>client.navigate(client.url).catch(()=>null)));
    }catch{}
  })());
});
