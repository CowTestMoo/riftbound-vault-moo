(() => {
  'use strict';
  const AUTH_KEY='riftbound-vault-auth-v1';
  function read(key,store){try{return JSON.parse(store.getItem(key)||'null')}catch{return null}}
  const session=read(AUTH_KEY,localStorage)||read(AUTH_KEY,sessionStorage);
  const valid=!!(session&&session.access_token&&session.refresh_token&&session.user);
  if(!valid&&!location.pathname.endsWith('/login.html')) location.replace('./login.html');
})();
