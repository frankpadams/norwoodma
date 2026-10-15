(()=>{
'use strict';
const map=window.norwoodTrailMap;
if(!map)return;
const root=document.getElementById('trailLayerStatus');
const checkbox=document.getElementById('trailLayerToggle');
const focus=document.getElementById('trailLayerFocus');
const trails=L.featureGroup(),ends=L.featureGroup();
const isShown=()=>Boolean(checkbox?.checked);
const sync=()=>{if(isShown()){trails.addTo(map);ends.addTo(map)}else{map.removeLayer(trails);map.removeLayer(ends)}};
sync();
const park={name:'Shattuck Park',center:[42.19283,-71.21099],bbox:[42.1917,-71.2132,42.1940,-71.2088]};
const setStatus=s=>{if(root)root.textContent=s};
const escapeHtml=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const meters=(a,b)=>L.latLng(a[1],a[0]).distanceTo(L.latLng(b[1],b[0]));
const endpoints=new Map();
let loading=false;
let requestErrors=[];
let loaded=false;
function endpoint(coordinates,kind,label){
 const c=kind==='start'?coordinates[0]:coordinates[coordinates.length-1];
 const key=c.map(v=>v.toFixed(5)).join(',');
 const record=endpoints.get(key)||{coord:c,kinds:new Set(),labels:new Set()};
 record.kinds.add(kind);record.labels.add(label);endpoints.set(key,record);
}
function draw(data){
 trails.clearLayers();ends.clearLayers();endpoints.clear();
 let n=0;
 for(const element of data.elements||[]){
  if(element.type!=='way'||!Array.isArray(element.geometry)||element.geometry.length<2)continue;
  const tags=element.tags||{};
  if(!/^(path|footway|steps|pedestrian)$/.test(tags.highway||''))continue;
  if(tags.access==='private'||tags.foot==='no')continue;
  const coords=element.geometry.map(p=>[p.lon,p.lat]);
  const length=coords.slice(1).reduce((sum,p,i)=>sum+meters(coords[i],p),0);
  const name=tags.name||'Mapped walking path';
  const popup='<strong>'+escapeHtml(name)+'</strong><p>Mapped segment: '+Math.round(length)+' m ('+(length/1609.344).toFixed(2)+' mi)</p><p>Source: OpenStreetMap way '+element.id+'. Segment length is not necessarily a complete trail.</p><a target="_blank" rel="noopener" href="https://www.openstreetmap.org/way/'+element.id+'">Inspect source geometry ↗</a>';
  L.polyline(coords.map(([lon,lat])=>[lat,lon]),{color:'#103a11',weight:13,opacity:.9,interactive:false}).addTo(trails);
  L.polyline(coords.map(([lon,lat])=>[lat,lon]),{color:'#b5ff16',weight:9,opacity:1}).bindPopup(popup).addTo(trails);
  endpoint(coords,'start',name);endpoint(coords,'end',name);n++;
 }
 // Shared segment endpoints are junctions, not independently verified trailheads.
 for(const e of endpoints.values()){
  const repeated=[...e.labels].length>1;
  const label=repeated?'Mapped path junction':e.kinds.size===2?'Start / finish':'Mapped segment endpoint';
  L.circleMarker([e.coord[1],e.coord[0]],{radius:repeated?5:7,color:'#fff',weight:2,fillColor:repeated?'#d69a17':'#003b71',fillOpacity:1})
    .bindPopup('<strong>'+label+'</strong><p>Not a verified public trail entrance. Confirm access against the Town brochure.</p>').addTo(ends);
 }
 if(n){loaded=true;setStatus(n+' highlighted path segments loaded. Toggle the checkbox to compare lime-green Norwood.ma overlays against the OSM background. Blue dots are segment endpoints; gold dots are junctions. Trailheads remain unverified.');}
 else setStatus('No mapped footpaths returned in the Shattuck Park search area. No speculative trails have been drawn.');
}
async function load(){
 if(loading)return;
 loading=true;
 setStatus('Loading mapped Shattuck Park footpaths…');
 const [s,w,n,e]=park.bbox;
 const query='[out:json][timeout:25];way["highway"~"^(path|footway|steps|pedestrian)$"]('+[s,w,n,e].join(',')+');out geom;';
 // First try the primary OSM API directly; unlike Overpass it does not require a query interpreter.
 try{
  const api='https://api.openstreetmap.org/api/0.6/map?bbox='+[w,s,e,n].join(',');
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),15000);
  let response;
  try{response=await fetch(api,{signal:controller.signal})}finally{clearTimeout(timer)}
  if(!response.ok)throw Error('HTTP '+response.status);
  const xml=new DOMParser().parseFromString(await response.text(),'application/xml');
  if(xml.querySelector('parsererror'))throw Error('Invalid OSM XML');
  const nodes=new Map([...xml.querySelectorAll('node[id]')].map(node=>[node.getAttribute('id'),{lat:Number(node.getAttribute('lat')),lon:Number(node.getAttribute('lon'))}]));
  const elements=[...xml.querySelectorAll('way')].map(way=>{
   const tags=Object.fromEntries([...way.querySelectorAll('tag')].map(t=>[t.getAttribute('k'),t.getAttribute('v')]));
   const geometry=[...way.querySelectorAll('nd')].map(nd=>nodes.get(nd.getAttribute('ref'))).filter(Boolean);
   return {type:'way',id:way.getAttribute('id'),tags,geometry};
  });
  if(elements.some(x=>/^(path|footway|steps|pedestrian)$/.test(x.tags.highway||''))){draw({elements});loading=false;return;}
  requestErrors.push('OSM API: no mapped footpaths in area');
 }catch(err){requestErrors.push('OSM API: '+String(err?.message||err));}
 const hosts=['https://overpass.private.coffee/api/interpreter','https://overpass.kumi.systems/api/interpreter','https://overpass-api.de/api/interpreter'];
 for(const host of hosts){
  try{
   const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),12000);
   let response;
   try{response=await fetch(host+'?data='+encodeURIComponent(query),{signal:controller.signal})}finally{clearTimeout(timer)}
   if(!response.ok)throw Error(response.status);
   const data=await response.json();draw(data);loading=false;return;
  }catch(err){requestErrors.push(host.split('/')[2]+': '+String(err?.message||err));}
 }
 loading=false;
 setStatus('Trail overlay FAILED to load. No green lines were added. OpenStreetMap paths in the background are not our overlay. Errors: '+requestErrors.join(' | '));
}
window.addEventListener('norwood:show-trails',()=>{if(checkbox)checkbox.checked=true;sync();if(!loaded)load();map.setView(park.center,17);});
checkbox?.addEventListener('change',()=>{
 sync();
 if(checkbox.checked){if(!loaded)load();else setStatus('Lime-green overlay ON — uncheck to compare with the background paths.');}
 else{setStatus('Lime-green overlay OFF — only background OpenStreetMap paths are visible.')}
});
focus?.addEventListener('click',()=>map.setView(park.center,17));
if(checkbox?.checked)load();
})();