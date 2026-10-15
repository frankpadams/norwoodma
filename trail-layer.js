(()=>{
'use strict';
const map=window.norwoodTrailMap;
if(!map)return;
const root=document.getElementById('trailLayerStatus');
const checkbox=document.getElementById('trailLayerToggle');
const focus=document.getElementById('trailLayerFocus');
const trails=L.featureGroup(),ends=L.featureGroup(),crossings=L.featureGroup();
const isShown=()=>Boolean(checkbox?.checked);
const sync=()=>{if(isShown()){trails.addTo(map);ends.addTo(map);crossings.addTo(map)}else{map.removeLayer(trails);map.removeLayer(ends);map.removeLayer(crossings)}};
sync();
const parks={shattuck:{name:'Shattuck Park',center:[42.19283,-71.21099],bbox:[42.1917,-71.2132,42.1940,-71.2088]},germany:{name:'Germany Brook — extended corridor',center:[42.1988,-71.2175],bbox:[42.1915,-71.232,42.206,-71.199]}};
let park=parks.shattuck;
const trailArea=document.getElementById('trailAreaSelect');
function selectArea(key){park=parks[key]||parks.shattuck;trails.clearLayers();ends.clearLayers();crossings.clearLayers();endpoints.clear();loaded=false;sync();map.fitBounds([[park.bbox[0],park.bbox[1]],[park.bbox[2],park.bbox[3]]],{padding:[20,20]});load();}
const setStatus=s=>{if(root)root.textContent=s};
const escapeHtml=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const meters=(a,b)=>L.latLng(a[1],a[0]).distanceTo(L.latLng(b[1],b[0]));
const endpoints=new Map();
let loading=false;
let requestErrors=[];
let loaded=false;
let townGeometry=null;
let townPromise=null;
function loadTown(){
 if(!townPromise)townPromise=fetch('https://services1.arcgis.com/hGdibHYSPO59RG1h/ArcGIS/rest/services/Massachusetts_Municipalities_Hosted/FeatureServer/0/query?where='+encodeURIComponent("TOWN='NORWOOD'")+'&outFields=TOWN&returnGeometry=true&outSR=4326&f=geojson').then(r=>{if(!r.ok)throw Error('Town boundary HTTP '+r.status);return r.json()}).then(g=>{if(!g.features?.length)throw Error('No Norwood boundary returned');townGeometry=g.features[0].geometry;return townGeometry}).catch(e=>{townPromise=null;throw e});
 return townPromise;
}
function insideRing(p,ring){let inside=false;for(let i=0,j=ring.length-1;i<ring.length;j=i++){const a=ring[i],b=ring[j];if((a[1]>p[1])!==(b[1]>p[1])&&p[0]<(b[0]-a[0])*(p[1]-a[1])/(b[1]-a[1])+a[0])inside=!inside;}return inside;}
function insideTown(p){if(!townGeometry)return false;const polygons=townGeometry.type==='MultiPolygon'?townGeometry.coordinates:[townGeometry.coordinates];return polygons.some(poly=>insideRing(p,poly[0])&&!poly.slice(1).some(h=>insideRing(p,h)));}
function segmentHits(a,b,c,d){const rx=b[0]-a[0],ry=b[1]-a[1],sx=d[0]-c[0],sy=d[1]-c[1],den=rx*sy-ry*sx;if(Math.abs(den)<1e-14)return null;const qx=c[0]-a[0],qy=c[1]-a[1],t=(qx*sy-qy*sx)/den,u=(qx*ry-qy*rx)/den;return t>0&&t<1&&u>=0&&u<=1?t:null;}
function clipToTown(coords){const polygons=townGeometry.type==='MultiPolygon'?townGeometry.coordinates:[townGeometry.coordinates],rings=polygons.flat();const parts=[];let active=[];for(let i=1;i<coords.length;i++){const a=coords[i-1],b=coords[i];const ts=[0,1];for(const ring of rings)for(let k=0;k<ring.length;k++){const t=segmentHits(a,b,ring[k],ring[(k+1)%ring.length]);if(t!==null)ts.push(t)}ts.sort((x,y)=>x-y);for(let j=1;j<ts.length;j++){const t0=ts[j-1],t1=ts[j],mid=(t0+t1)/2,point=t=>[a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t];if(insideTown(point(mid))){if(!active.length)active.push(point(t0));active.push(point(t1))}else if(active.length){if(active.length>1)parts.push(active);active=[]}}}if(active.length>1)parts.push(active);return parts;}
function endpoint(coordinates,kind,label){
 const c=kind==='start'?coordinates[0]:coordinates[coordinates.length-1];
 const key=c.map(v=>v.toFixed(5)).join(',');
 const record=endpoints.get(key)||{coord:c,kinds:new Set(),labels:new Set()};
 record.kinds.add(kind);record.labels.add(label);endpoints.set(key,record);
}
function draw(data){
 if(!townGeometry){setStatus('Town boundary not loaded; trail lines withheld to avoid displaying out-of-town paths.');return;}
 trails.clearLayers();ends.clearLayers();crossings.clearLayers();endpoints.clear();
 let n=0;
 for(const element of data.elements||[]){
  if(element.type!=='way'||!Array.isArray(element.geometry)||element.geometry.length<2)continue;
  const tags=element.tags||{};
  const walkingTrack=park===parks.germany&&tags.highway==='track'&&/^(yes|designated|permissive)$/.test(tags.foot||'')&&/^(no|private)$/.test(tags.motor_vehicle||tags.vehicle||'no');
  if(!/^(path|footway|steps|pedestrian)$/.test(tags.highway||'')&&!walkingTrack)continue;
  if(tags.access==='private'||tags.foot==='no')continue;
  // The broad Germany Brook search includes neighborhood sidewalks. Only highlight
  // off-road candidate paths, not pedestrian street infrastructure.
  if(park===parks.germany){
   const highway=tags.highway||'';
   const sidewalk=/^(yes|both|left|right|separate)$/.test(tags.sidewalk||'')||tags.footway==='sidewalk';
   const cemetery=tags.landuse==='cemetery'||tags.amenity==='grave_yard'||/cemetery|graveyard|burial/i.test([tags.name,tags.description,tags.operator].filter(Boolean).join(' '));
   const roadlike=highway==='service'||(highway==='track'&&!walkingTrack)||tags.service==='driveway'||tags.service==='parking_aisle'||tags.motor_vehicle==='yes'||tags.vehicle==='yes';
   const crossing=tags.footway==='crossing'||tags.crossing!=null;
   const street=/^(residential|service|living_street|unclassified|tertiary|secondary|primary)$/.test(highway);
   // Paved footways can be legitimate trail connectors, including by the playing fields.
   // Do not discard them solely for being paved; explicit sidewalks remain excluded.
   if(crossing){
    // Show only mapped Winter Street crossings as distinct connectors, never as ordinary trails.
    // This is a candidate until matched to the brochure's exact crossing location.
    const winter=(tags.name||'').toLowerCase().includes('winter')||(tags['addr:street']||'').toLowerCase().includes('winter');
    if(winter){for(const part of clipToTown(element.geometry.map(p=>[p.lon,p.lat]))){L.polyline(part.map(([lon,lat])=>[lat,lon]),{color:'#f59e0b',weight:6,dashArray:'7 7'}).bindPopup('Candidate Winter Street crossing — confirm location against Town trail brochure').addTo(crossings);}}
    continue;
   }
   if(sidewalk||street||cemetery||roadlike||highway==='pedestrian'||highway==='steps')continue;
  }
  const coords=element.geometry.map(p=>[p.lon,p.lat]);
  const clipped=clipToTown(coords);
  if(!clipped.length)continue;
  const length=coords.slice(1).reduce((sum,p,i)=>sum+meters(coords[i],p),0);
  const name=tags.name||'Mapped walking path';
  const popup='<strong>'+escapeHtml(name)+'</strong><p>Mapped segment: '+Math.round(length)+' m ('+(length/1609.344).toFixed(2)+' mi)</p><p>Source: OpenStreetMap way '+element.id+'. Segment length is not necessarily a complete trail.</p><a target="_blank" rel="noopener" href="https://www.openstreetmap.org/way/'+element.id+'">Inspect source geometry ↗</a>';
  for(const part of clipped){
   L.polyline(part.map(([lon,lat])=>[lat,lon]),{color:'#103a11',weight:13,opacity:.9,interactive:false}).addTo(trails);
   L.polyline(part.map(([lon,lat])=>[lat,lon]),{color:'#b5ff16',weight:9,opacity:1}).bindPopup(popup).addTo(trails);
   endpoint(part,'start',name);endpoint(part,'end',name);n++;
  }
 }
 // Shared segment endpoints are junctions, not independently verified trailheads.
 for(const e of endpoints.values()){
  const repeated=[...e.labels].length>1;
  const label=repeated?'Mapped path junction':e.kinds.size===2?'Start / finish':'Mapped segment endpoint';
  L.circleMarker([e.coord[1],e.coord[0]],{radius:repeated?5:7,color:'#fff',weight:2,fillColor:repeated?'#d69a17':'#003b71',fillOpacity:1})
    .bindPopup('<strong>'+label+'</strong><p>Not a verified public trail entrance. Confirm access against the Town brochure.</p>').addTo(ends);
 }
 if(n){loaded=true;setStatus(n+' candidate mapped path segments loaded in '+park.name+'. Sidewalks and identifiable cemetery roads are excluded; any explicitly identified Winter Street crossing is shown as an amber dashed connector. This is not yet a verified continuous trail.  Toggle the checkbox to compare lime-green Norwood.ma overlays against the OSM background. Blue dots are segment endpoints; gold dots are junctions. Trailheads remain unverified.');}
 else setStatus('No mapped footpaths returned in the '+park.name+' search area. No speculative trails have been drawn.');
}
async function load(){
 if(loading)return;
 loading=true;
 try{await loadTown()}catch(e){loading=false;setStatus('Could not load official Norwood town boundary. Trail overlay withheld rather than showing paths outside town: '+e.message);return;}
 setStatus('Loading mapped '+park.name+' footpaths…');
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
window.addEventListener('norwood:show-trails',()=>{if(checkbox)checkbox.checked=true;sync();if(!loaded)load();map.fitBounds([[park.bbox[0],park.bbox[1]],[park.bbox[2],park.bbox[3]]],{padding:[20,20]});});
checkbox?.addEventListener('change',()=>{
 sync();
 if(checkbox.checked){if(!loaded)load();else setStatus('Lime-green overlay ON — uncheck to compare with the background paths.');}
 else{setStatus('Lime-green overlay OFF — only background OpenStreetMap paths are visible.')}
});
focus?.addEventListener('click',()=>map.fitBounds([[park.bbox[0],park.bbox[1]],[park.bbox[2],park.bbox[3]]],{padding:[20,20]}));
trailArea?.addEventListener('change',()=>selectArea(trailArea.value));
if(new URLSearchParams(location.search).get('trail')==='germany'&&trailArea){trailArea.value='germany';park=parks.germany;}
if(checkbox?.checked)load();
})();