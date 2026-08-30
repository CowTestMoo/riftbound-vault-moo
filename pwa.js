(() => {
  'use strict';

  if(!('serviceWorker' in navigator) || !window.isSecureContext)return;

  navigator.serviceWorker
    .register('./sw.js',{scope:'./',updateViaCache:'none'})
    .then(registration=>registration.update().catch(()=>{}))
    .catch(()=>{});
})();
