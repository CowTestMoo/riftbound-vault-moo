(() => {
  'use strict';

  const SUPABASE_URL='https://ivqtgclygiikagfuicjd.supabase.co';
  const SUPABASE_PUBLISHABLE_KEY='sb_publishable_Iweuvn4mcU02xrDyPSJWig_uRWzAsfd';
  const COLORS={
    cyan:'#83edff',blue:'#79a8ff',purple:'#c28cff',pink:'#ff8fe8',red:'#ff8291',orange:'#ffad70',gold:'#ffd77b',green:'#7ff0b3',white:'#f4f8ff',
    teal:'#61e8d6',mint:'#9af7cf',lime:'#c7f56b',yellow:'#fff278',amber:'#ffc65f',coral:'#ff977c',rose:'#ff7fa7',magenta:'#ff78f1',violet:'#a98bff',indigo:'#8398ff',sky:'#8fd7ff',aqua:'#72f7ff',emerald:'#65e5a1',lavender:'#d4b5ff',silver:'#c9d3e6'
  };
  const cache=new Map();
  let selectedRequest=0;

  const session=()=>window.RiftboundCloud?.getSession?.()||null;
  const profile=()=>window.RiftboundSocial?.getProfile?.()||null;
  const selected=()=>window.RiftboundSocial?.getSelected?.()||null;
  const valid=color=>Object.prototype.hasOwnProperty.call(COLORS,String(color||''));

  function paint(element,color){
    if(!element||!valid(color))return;
    element.dataset.usernameColor=color;
    element.style.setProperty('color',COLORS[color],'important');
    element.style.setProperty('--username-color',COLORS[color]);
    element.style.removeProperty('text-shadow');
  }

  function paintUsername(username,color,root=document){
    if(!username||!valid(color))return;
    cache.set(String(username).toLowerCase(),color);
    root.querySelectorAll?.('.username-styled').forEach(element=>{
      if(String(element.textContent||'').trim().replace(/^@+/,'').toLowerCase()===String(username).toLowerCase())paint(element,color);
    });
  }

  function paintKnown(root=document){
    const own=profile();
    if(own?.username&&valid(own.username_color))paintUsername(own.username,own.username_color,root);
    root.querySelectorAll?.('.username-styled').forEach(element=>{
      const username=String(element.textContent||'').trim().replace(/^@+/,'').toLowerCase();
      const color=cache.get(username)||element.dataset.usernameColor;
      if(valid(color))paint(element,color);
    });
  }

  async function api(path,{method='GET',body,prefer=''}={}){
    const s=session();
    if(!s?.access_token)throw new Error('Not signed in');
    const response=await fetch(SUPABASE_URL+path,{
      method,
      headers:{apikey:SUPABASE_PUBLISHABLE_KEY,Authorization:`Bearer ${s.access_token}`,'Content-Type':'application/json',...(prefer?{Prefer:prefer}:{})},
      body:body===undefined?undefined:JSON.stringify(body)
    });
    let data=null;try{data=await response.json()}catch{}
    if(!response.ok)throw new Error(data?.message||data?.details||`HTTP ${response.status}`);
    return data;
  }

  async function refreshSelectedColor(){
    const current=selected(),userId=current?.profile?.user_id;
    if(!userId)return;
    const request=++selectedRequest;
    try{
      const rows=await api(`/rest/v1/profiles?user_id=eq.${encodeURIComponent(userId)}&select=username,username_color&limit=1`);
      if(request!==selectedRequest)return;
      const row=rows?.[0];
      if(!row?.username||!valid(row.username_color))return;
      current.profile.username_color=row.username_color;
      paintUsername(row.username,row.username_color,document.getElementById('friendLibraryScreen')||document);
    }catch(err){console.error('Friend username color refresh failed',err)}
  }

  async function saveColor(color){
    const s=session(),own=profile();
    if(!s?.user||!own||!valid(color))return;
    const previous=own.username_color;
    own.username_color=color;
    paintUsername(own.username,color);
    try{
      const rows=await api(`/rest/v1/profiles?user_id=eq.${encodeURIComponent(s.user.id)}`,{
        method:'PATCH',prefer:'return=representation',body:{username_color:color,updated_at:new Date().toISOString()}
      });
      const saved=rows?.[0]?.username_color;
      if(valid(saved))own.username_color=saved;
      paintUsername(own.username,own.username_color);
    }catch(err){
      own.username_color=previous;
      paintUsername(own.username,previous);
      console.error('Username color save failed',err);
    }
  }

  document.addEventListener('change',event=>{
    if(event.target?.id!=='usernameColorSelect')return;
    const color=event.target.value;
    if(!valid(color))return;
    paintUsername(profile()?.username,color);
    saveColor(color);
  },true);

  window.addEventListener('riftbound-social-ready',()=>requestAnimationFrame(()=>paintKnown()));
  window.addEventListener('riftbound-friend-render',()=>{
    requestAnimationFrame(()=>paintKnown(document.getElementById('friendLibraryScreen')||document));
    refreshSelectedColor();
  });
  window.addEventListener('riftbound-auth-storage-change',()=>{cache.clear();selectedRequest++;});

  const observer=new MutationObserver(records=>{
    let relevant=false;
    for(const record of records){
      for(const node of record.addedNodes){
        if(node.nodeType===1&&(node.matches?.('.username-styled')||node.querySelector?.('.username-styled'))){relevant=true;break}
      }
      if(relevant)break;
    }
    if(relevant)requestAnimationFrame(()=>paintKnown());
  });

  function init(){
    paintKnown();
    observer.observe(document.body,{childList:true,subtree:true});
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
