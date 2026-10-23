(() => {
  'use strict';

  const COLORS={
    cyan:'#83edff',blue:'#79a8ff',purple:'#c28cff',pink:'#ff8fe8',red:'#ff8291',orange:'#ffad70',gold:'#ffd77b',green:'#7ff0b3',white:'#f4f8ff',
    teal:'#61e8d6',mint:'#9af7cf',lime:'#c7f56b',yellow:'#fff278',amber:'#ffc65f',coral:'#ff977c',rose:'#ff7fa7',magenta:'#ff78f1',violet:'#a98bff',indigo:'#8398ff',sky:'#8fd7ff',aqua:'#72f7ff',emerald:'#65e5a1',lavender:'#d4b5ff',silver:'#c9d3e6'
  };
  const cache=new Map();
  const profile=()=>window.RiftboundSocial?.getProfile?.()||null;
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

  document.addEventListener('change',event=>{
    if(event.target?.id!=='usernameColorSelect')return;
    const color=event.target.value;
    if(valid(color))paintUsername(profile()?.username,color);
  },true);

  window.addEventListener('riftbound-social-ready',()=>requestAnimationFrame(()=>paintKnown()));
  window.addEventListener('riftbound-friend-render',()=>{
    requestAnimationFrame(()=>paintKnown(document.getElementById('friendLibraryScreen')||document));
  });
  window.addEventListener('riftbound-auth-storage-change',()=>cache.clear());

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
