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
const germanyVerifiedWayIds=new Set([]); // Populate only with OSM ways matched against the Town brochure.
const parks={shattuck:{name:'Shattuck Park',center:[42.19283,-71.21099],bbox:[42.1917,-71.2132,42.1940,-71.2088]},germany:{name:'Germany Brook — Town brochure trace',center:[42.1988,-71.2175],bbox:[42.1915,-71.232,42.206,-71.199]}};
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
function clipTrailToTown(coords){
 // Preserve the complete mapped way whenever any portion intersects Norwood.
 if(coords.some(insideTown))return [coords];
 const polygons=townGeometry.type==='MultiPolygon'?townGeometry.coordinates:[townGeometry.coordinates];
 for(let i=1;i<coords.length;i++)for(const poly of polygons)for(const ring of poly)for(let j=0;j<ring.length;j++){
  if(segmentHits(coords[i-1],coords[i],ring[j],ring[(j+1)%ring.length])!==null)return [coords];
 }
 return [];
}
function clipToTown(coords){const polygons=townGeometry.type==='MultiPolygon'?townGeometry.coordinates:[townGeometry.coordinates],rings=polygons.flat();const parts=[];let active=[];for(let i=1;i<coords.length;i++){const a=coords[i-1],b=coords[i];const ts=[0,1];for(const ring of rings)for(let k=0;k<ring.length;k++){const t=segmentHits(a,b,ring[k],ring[(k+1)%ring.length]);if(t!==null)ts.push(t)}ts.sort((x,y)=>x-y);for(let j=1;j<ts.length;j++){const t0=ts[j-1],t1=ts[j],mid=(t0+t1)/2,point=t=>[a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t];if(insideTown(point(mid))){if(!active.length)active.push(point(t0));active.push(point(t1))}else if(active.length){if(active.length>1)parts.push(active);active=[]}}}if(active.length>1)parts.push(active);return parts;}
// Exclude entire OSM ways touching mapped cemetery grounds. This deliberately
// favors hiding a borderline trail over showing cemetery roads as hiking trails.
function cemeteryAreas(elements){
 return elements.filter(x=>x.type==='way'&&
  (x.tags?.landuse==='cemetery'||x.tags?.amenity==='grave_yard')&&
  x.geometry?.length>=4).map(x=>x.geometry.map(p=>[p.lon,p.lat]));
}
function touchesCemetery(coords,areas){
 return areas.some(ring=>{
  if(coords.some(p=>insideRing(p,ring)))return true;
  for(let i=1;i<coords.length;i++){
   const a=coords[i-1],b=coords[i];
   if(insideRing([(a[0]+b[0])/2,(a[1]+b[1])/2],ring))return true;
   for(let j=0;j<ring.length;j++)if(segmentHits(a,b,ring[j],ring[(j+1)%ring.length])!==null)return true;
  }
  return false;
 });
}
// Hand-digitized from the March 2023 Town Germany Brook brochure (image pixel coordinates).
// Georeferencing is preliminary; do not use for navigation. No OSM walking-way discovery.
const brochureLines=[
 {type:'Primary natural',pts:[[285,842],[316,823],[349,815],[379,834]]},
 {type:'Primary natural',pts:[[316,823],[347,780],[380,725],[415,665],[397,622],[386,577],[394,528],[422,477],[461,433],[494,398],[520,372],[548,381]]},
 {type:'Primary natural',pts:[[520,372],[555,320],[590,273],[621,235],[652,207],[697,196],[746,180],[790,166],[819,157],[856,174],[895,198],[935,205],[969,197],[999,217],[1027,251],[1054,272]]},
 {type:'Primary asphalt',pts:[[1054,272],[1087,273],[1110,296],[1118,326],[1137,354]]},
 {type:'Secondary natural',pts:[[1137,354],[1170,350],[1212,348],[1254,334],[1280,314]]},
 {type:'Secondary natural',pts:[[1054,272],[1066,239],[1067,217],[1045,202]]},
 {type:'Primary natural',pts:[[397,622],[383,571],[391,527],[414,483]]}
];
function brochureCoordinate([x,y]){
 // Approximate transform anchored at Willett School and Germany Brook Conservation Land.
 // The 2023 PDF is not a surveyed georeferenced GIS dataset.
 return [-71.22197+(x-420)*0.000012+(y-955)*0.00000217,
         42.19405-(y-955)*0.0000086+(x-420)*0.0000032];
}
function drawBrochure(){
 trails.clearLayers();ends.clearLayers();crossings.clearLayers();endpoints.clear();
 let count=0;
 for(const line of brochureLines){
  const coords=line.pts.map(brochureCoordinate);
  for(const part of clipToTown(coords)){
   const points=part.map(([lon,lat])=>[lat,lon]);
   L.polyline(points,{color:'#173c13',weight:10,opacity:.85,interactive:false}).addTo(trails);
   L.polyline(points,{color:line.type==='Primary asphalt'?'#fbbf24':'#b5ff16',weight:6,opacity:1})
    .bindPopup('<strong>Germany Brook Trail — '+line.type+'</strong><p>Approximate digitization of the March 2023 Town trail brochure. Alignment is not surveyed; do not use for navigation.</p>').addTo(trails);
   count++;
  }
 }
 loaded=true;
 setStatus('Germany Brook brochure trace ('+count+' clipped sections). Only the routes drawn on the Town brochure are highlighted. Alignment is approximate and not for navigation. The Winter Street crossing and trail branches require field/GIS verification.');
}
function endpoint(coordinates,kind,label){
 const c=kind==='start'?coordinates[0]:coordinates[coordinates.length-1];
 const key=c.map(v=>v.toFixed(5)).join(',');
 const record=endpoints.get(key)||{coord:c,kinds:new Set(),labels:new Set()};
 record.kinds.add(kind);record.labels.add(label);endpoints.set(key,record);
}
// Extend named Germany Brook OSM ways only along physically connected off-road footpaths.
// No synthetic straight-line connections: gaps without mapped path geometry stay unfilled.
function germanyConnectedWays(elements,cemeteries){
 const valid=elements.filter(w=>{
  if(w.type!=='way'||w.geometry?.length<2)return false;
  const t=w.tags||{},h=t.highway||'';
  if(!/^(path|footway)$/.test(h))return false;
  if(t.access==='private'||t.foot==='no'||t.footway==='sidewalk')return false;
  if(/^(yes|both|left|right|separate)$/.test(t.sidewalk||''))return false;
  // A short mapped pedestrian crossing is a legitimate link between trail halves.
  if((t.footway==='crossing'||t.crossing!=null)&&w.geometry.slice(1).reduce((sum,p,i)=>sum+meters([w.geometry[i].lon,w.geometry[i].lat],[p.lon,p.lat]),0)>45)return false;
  if(/cemetery|graveyard|burial/i.test([t.name,t.description,t.operator].filter(Boolean).join(' ')))return false;
  if(t.motor_vehicle==='yes'||t.vehicle==='yes')return false;
  return !touchesCemetery(w.geometry.map(p=>[p.lon,p.lat]),cemeteries);
 });
 const named=w=>/germany\s*brook/i.test([w.tags?.name,w.tags?.['name:en'],w.tags?.alt_name,w.tags?.official_name,w.tags?.ref].filter(Boolean).join(' '));
 const selected=new Set(valid.filter(named).map(w=>String(w.id)));
 const nodeKey=p=>p.lat.toFixed(6)+','+p.lon.toFixed(6);
 const connections=new Map();
 for(const w of valid)for(const p of [w.geometry[0],w.geometry[w.geometry.length-1]]){
  const key=nodeKey(p);if(!connections.has(key))connections.set(key,[]);connections.get(key).push(w);
 }
 // Only short, contiguous off-road links are automatically extended; this avoids
 // pulling in entire neighborhood footpath networks or speculative road crossings.
 let frontier=valid.filter(w=>selected.has(String(w.id)));
 for(let depth=0;depth<10;depth++){
  const next=[];
  for(const w of frontier)for(const p of [w.geometry[0],w.geometry[w.geometry.length-1]])
   for(const candidate of connections.get(nodeKey(p))||[]){
    const id=String(candidate.id);
    if(selected.has(id))continue;
    const coords=candidate.geometry.map(v=>[v.lon,v.lat]);
    const length=coords.slice(1).reduce((total,v,i)=>total+meters(coords[i],v),0);
    if(length>350)continue;
    selected.add(id);next.push(candidate);
   }
  frontier=next;
 }
 return selected;
}
function draw(data){
 if(!townGeometry){setStatus('Town boundary not loaded; trail lines withheld to avoid displaying out-of-town paths.');return;}
 trails.clearLayers();ends.clearLayers();crossings.clearLayers();endpoints.clear();
 let n=0;
 const excludedCemeteries=park===parks.germany?cemeteryAreas(data.elements||[]):[];
 const germanyWays=park===parks.germany?germanyConnectedWays(data.elements||[],excludedCemeteries):null;
 for(const element of data.elements||[]){
  if(element.type!=='way'||!Array.isArray(element.geometry)||element.geometry.length<2)continue;
  if(germanyWays&&!germanyWays.has(String(element.id)))continue;
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
    if(germanyWays?.has(String(element.id))){
     for(const part of clipTrailToTown(element.geometry.map(p=>[p.lon,p.lat])))L.polyline(part.map(([lon,lat])=>[lat,lon]),{color:'#f59e0b',weight:7,dashArray:'7 6'}).bindPopup('Mapped pedestrian crossing connecting Germany Brook trail segments — verify traffic conditions before crossing').addTo(crossings);
     n++;continue;
    }
    // Show only mapped Winter Street crossings as distinct connectors, never as ordinary trails.
    // This is a candidate until matched to the brochure's exact crossing location.
    const winter=(tags.name||'').toLowerCase().includes('winter')||(tags['addr:street']||'').toLowerCase().includes('winter');
    if(winter){for(const part of clipTrailToTown(element.geometry.map(p=>[p.lon,p.lat]))){L.polyline(part.map(([lon,lat])=>[lat,lon]),{color:'#f59e0b',weight:6,dashArray:'7 7'}).bindPopup('Candidate Winter Street crossing — confirm location against Town trail brochure').addTo(crossings);}}
    continue;
   }
   if(sidewalk||street||cemetery||roadlike||highway==='pedestrian'||highway==='steps')continue;
  }
  const coords=element.geometry.map(p=>[p.lon,p.lat]);
  if(excludedCemeteries.length&&touchesCemetery(coords,excludedCemeteries))continue;
  const clipped=clipTrailToTown(coords);
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
 if(n){loaded=true;setStatus(park===parks.germany?n+' named or directly connected off-road OpenStreetMap trail segments shown. Short mapped pedestrian crossings connected to the trail are displayed in amber. The longer connected-path search may include branches; verify the Winter Street–Hawthorne Street–Savage Center route against the Town brochure.':n+' mapped walking path segments loaded in '+park.name+'.');}
 else setStatus(park===parks.germany?'Germany Brook: broad candidate paths are hidden until their geometry is matched to the Town brochure. The background map remains available.':'No mapped footpaths returned in the '+park.name+' search area. No speculative trails have been drawn.');
}
async function load(){
 if(loading)return;
 loading=true;
 try{await loadTown()}catch(e){loading=false;setStatus('Could not load official Norwood town boundary. Trail overlay withheld rather than showing paths outside town: '+e.message);return;}
 // Germany Brook uses actual named OSM ways, never a transformed brochure sketch.
 setStatus('Loading mapped '+park.name+' footpaths…');
 const [s,w,n,e]=park.bbox;
 const query='[out:json][timeout:25];(way["highway"~"^(path|footway|steps|pedestrian|track)$"]('+[s,w,n,e].join(',')+');way["landuse"="cemetery"]('+[s,w,n,e].join(',')+');way["amenity"="grave_yard"]('+[s,w,n,e].join(',')+'););out geom;';
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