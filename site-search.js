(()=>{
 const input=document.querySelector('#siteSearch'),box=document.querySelector('#siteSearchResults'),form=document.querySelector('#siteSearchForm');
 if(!input||!box||!form)return;
 const pages=[
  {name:'Things to Do',url:'things.html',type:'Things to Do',text:'activities entertainment explore parks recreation'},
  {name:'Fishing & boating',url:'fishing-boating.html',type:'Things to Do',text:'kayak canoe paddling launch fishing boat water Ellis Pond'},
  {name:'Swimming',url:'swimming.html',type:'Things to Do',text:'pool swim swimming lessons Hawes Father Mac beach'},
  {name:'Hiking & biking',url:'hiking-biking.html',type:'Things to Do',text:'hike hiking bike biking bicycle trails shops cycling clubs'},
  {name:'Sports & recreation',url:'sports-recreation.html',type:'Things to Do',text:'sports youth adult pickleball golf soccer baseball basketball hockey lacrosse'},
  {name:'Get involved',url:'get-involved.html',type:'Community',text:'volunteer civic poll worker election boards committees run office food pantry'},
  {name:'Transit',url:'transit.html',type:'Transit',text:'train commuter rail bus MBTA Windsor Gardens Norwood Central Norwood Depot 34E'},
  {name:'What’s Happening',url:'events.html',type:'Events',text:'events calendar music trivia community town common elections'}
 ];
 const aliases={doctor:'medical physician health',dentist:'dental orthodontics',train:'transit commuter rail mbta',volunteer:'get involved civic',kayak:'boating paddling',bike:'biking cycling',pool:'swimming',pizza:'restaurant food',food:'restaurant dining',vote:'election voting',voting:'election poll'};
 const norm=s=>String(s||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,' ').trim();
 const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 function items(){
  const out=pages.slice();
  (window.NORWOOD_RESTAURANTS||[]).forEach(r=>out.push({name:r.name,url:r.url||'restaurants.html',type:'Restaurant',text:[r.category,r.cuisine,r.address,r.tags].join(' ')}));
  (window.NORWOOD_RESOURCES||[]).forEach(r=>out.push({name:r.name,url:r.url||'resources.html',type:r.category||'Resource',text:[r.category,r.tags,r.coverage,r.description].join(' ')}));
  return out;
 }
 function search(raw){
  raw=norm(raw); if(!raw)return [];
  const expanded=norm(raw+' '+(aliases[raw]||''));
  const terms=[...new Set(expanded.split(/\s+/).filter(Boolean))];
  return items().map(x=>{
   const name=norm(x.name), hay=norm([x.name,x.type,x.text].join(' ')); let score=0;
   if(name===raw)score+=100;if(name.startsWith(raw))score+=40;if(name.includes(raw))score+=25;if(hay.includes(raw))score+=15;
   terms.forEach(t=>{if(name.includes(t))score+=8;else if(hay.includes(t))score+=3});
   return {x,score};
  }).filter(o=>o.score>0).sort((a,b)=>b.score-a.score||a.x.name.localeCompare(b.x.name)).slice(0,10);
 }
 function render(){
  const raw=input.value.trim(); if(!raw){box.hidden=true;box.innerHTML='';return []}
  const hits=search(raw);
  box.innerHTML=hits.length?hits.map(({x})=>`<a href="${esc(x.url)}"><b>${esc(x.name)}</b><small>${esc(x.type)}${x.text?' · '+esc(String(x.text).split(/\s+/).slice(0,7).join(' ')):''}</small></a>`).join(''):'<p>No matches. Try a shorter or different term.</p>';
  box.hidden=false; return hits;
 }
 input.addEventListener('input',render);
 input.addEventListener('focus',()=>{if(input.value.trim())render()});
 form.addEventListener('submit',e=>{e.preventDefault();const hits=render();if(hits.length===1)location.href=hits[0].x.url});
 input.addEventListener('keydown',e=>{if(e.key==='Escape'){box.hidden=true;input.blur()}if(e.key==='ArrowDown'){const a=box.querySelector('a');if(a){e.preventDefault();a.focus()}}});
 box.addEventListener('keydown',e=>{if(e.key==='Escape'){box.hidden=true;input.focus()}});
 document.addEventListener('click',e=>{if(!form.contains(e.target))box.hidden=true});
})();
