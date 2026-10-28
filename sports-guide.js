(()=>{
 'use strict';
 const root=document.getElementById('norwood-sports-concept');
 if(!root)return;
 const tablist=root.querySelector('[data-sports-tabs]');
 const tabs=[...root.querySelectorAll('[data-panel]')];
 const panels=[...root.querySelectorAll('[data-sports-panel]')];
 function selectPanel(id){
  if(!panels.some(panel=>panel.id===id))id='youth';
  panels.forEach(panel=>panel.hidden=panel.id!==id);
  tabs.forEach(tab=>{const active=tab.dataset.panel===id;tab.setAttribute('aria-selected',String(active));tab.tabIndex=active?0:-1;});
 }
 function openHash(scroll=false){
  let hash='';try{hash=decodeURIComponent(location.hash.slice(1));}catch(e){}
  const aliases={'adult-sports':'adult','places-to-play':'places','sports-announcements':'youth'};
  hash=aliases[hash]||hash;
  const target=hash?document.getElementById(hash):null;
  const panel=target&&root.contains(target)?target.closest('[data-sports-panel]'):null;
  selectPanel(panel?panel.id:'youth');
  if(target&&root.contains(target)){
   const details=target.closest('details');if(details)details.open=true;
   if(scroll)requestAnimationFrame(()=>target.scrollIntoView({block:'start'}));
  }
 }
 tablist.hidden=false;tablist.setAttribute('role','tablist');tablist.setAttribute('aria-label','Sports and recreation');
 tabs.forEach(tab=>{
  tab.setAttribute('role','tab');tab.setAttribute('aria-controls',tab.dataset.panel);
  const activate=()=>{selectPanel(tab.dataset.panel);history.replaceState(null,'','#'+tab.dataset.panel);};
  tab.addEventListener('click',activate);
  tab.addEventListener('keydown',event=>{
   const i=tabs.indexOf(tab);let next;
   if(event.key==='ArrowRight')next=(i+1)%tabs.length;
   else if(event.key==='ArrowLeft')next=(i+tabs.length-1)%tabs.length;
   else if(event.key==='Home')next=0;
   else if(event.key==='End')next=tabs.length-1;
   else return;
   event.preventDefault();tabs[next].click();tabs[next].focus();
  });
 });
 panels.forEach(panel=>{panel.setAttribute('role','tabpanel');panel.setAttribute('aria-labelledby','tab-'+panel.id);});
 root.querySelectorAll('.ns-panel-heading').forEach(heading=>heading.hidden=true);
 function localDay(date=new Date()){
  const parts=new Intl.DateTimeFormat('en-US',{timeZone:'America/New_York',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(date);
  const part=type=>parts.find(p=>p.type===type).value;
  return part('year')+'-'+part('month')+'-'+part('day');
 }
 function refreshNotices(){
  const today=localDay();
  root.querySelectorAll('.ns-notice[data-expires]').forEach(notice=>notice.hidden=notice.dataset.expires<today);
  panels.forEach(panel=>{
   const empty=panel.querySelector('.ns-empty');
   if(empty)empty.hidden=!!panel.querySelector('.ns-notice:not([hidden])');
  });
  root.querySelectorAll('details[data-sport]').forEach(group=>{
   const notice=[...root.querySelectorAll('.ns-notice:not([hidden])')].find(n=>n.dataset.sport===group.dataset.sport&&n.dataset.status);
   const badge=group.querySelector('.ns-league-status');
   if(badge){badge.hidden=!notice;badge.textContent=notice?notice.dataset.status:'';}
  });
 }
 root.querySelectorAll('details[id]').forEach(details=>details.addEventListener('toggle',()=>{
  if(details.open&&!details.closest('[data-sports-panel]').hidden&&location.hash!=='#'+details.id)history.replaceState(null,'','#'+details.id);
 }));
 refreshNotices();setInterval(refreshNotices,60000);
 document.addEventListener('visibilitychange',()=>{if(!document.hidden)refreshNotices();});
 openHash(!!location.hash);window.addEventListener('hashchange',()=>openHash(true));
})();
