(()=>{
'use strict';
const map=L.map('prototypeMap',{scrollWheelZoom:false}).setView([42.190,-71.204],13);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'&copy; OpenStreetMap contributors'}).addTo(map);
const cluster=L.markerClusterGroup({showCoverageOnHover:false,maxClusterRadius:48,spiderfyOnMaxZoom:true});
map.addLayer(cluster);
const list=document.querySelector('#placeList'),count=document.querySelector('#placeCount'),status=document.querySelector('#mapStatus'),search=document.querySelector('#mapSearch'),category=document.querySelector('#mapCategory');
let filter=category?.value||'all',userMarker=null,renderToken=0;
const geocodeCache=JSON.parse(localStorage.getItem('norwood-map-geocode-v2')||'{}');
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const norm=s=>String(s??'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,' ').trim();
const today=new Date().toISOString().slice(0,10);
const venueAddresses={
 'morrill memorial library':'33 Walpole St, Norwood, MA 02062',
 'norwood civic center':'165 Nahatan St, Norwood, MA 02062',
 'norwood town common':'Washington St at Nahatan St, Norwood, MA 02062',
 'town common':'Washington St at Nahatan St, Norwood, MA 02062',
 'norwood high school':'245 Nichols St, Norwood, MA 02062',
 'coakley middle school':'1315 Washington St, Norwood, MA 02062',
 'norwood food pantry':'150 Chapel St, Norwood, MA 02062',
 'norwood theatre':'109 Central St, Norwood, MA 02062'
};
const staticPlaces=[
 {name:'Norwood Town Common',category:'civic',address:'Washington St at Nahatan St, Norwood, MA 02062',lat:42.19455,lng:-71.19955,details:'Town green · gazebo · community events',url:'parks-trails.html'},
 {name:'Old Parish Cemetery',category:'historic',address:'Washington St near Town Hall, Norwood, MA 02062',details:'Established 1741 · early South Dedham/Norwood burial ground · historic gravestones',url:'https://norwoodhistoricalsociety.org/happy-birthday-norwood-massachusetts/'},
 {name:'F. Holland Day House / Norwood Historical Society',category:'historic',address:'93 Day St, Norwood, MA 02062',details:'1859 house · remodeled 1890–1893 · home of photographer and publisher F. Holland Day · National Register site',url:'https://norwoodhistoricalsociety.org/93-day-street-f-holland-day-house/'},
 {name:'Oakview Mansion',category:'historic',address:'289 Walpole St, Norwood, MA 02062',details:'1868 Second Empire mansion · F.O. Winslow and Governor Frank Allen associations',url:'https://norwoodhistoricalsociety.org/oakview-mansion/'},
 {name:'Little Red Brick Schoolhouse',category:'historic',address:'93 Day St, Norwood, MA 02062',details:'Former Schoolhouse No. 7 · moved and reconstructed on the historical society grounds',url:'https://norwoodhistoricalsociety.org/a-brief-history-of-norwood-massachusetts/'},
 {name:'St. Gabriel the Archangel Chapel',category:'historic',address:'320 Winter St, Norwood, MA 02062',details:'Historic 1903 mortuary chapel in Highland Cemetery',url:'https://norwoodhistoricalsociety.org/this-day-in-norwood-history-may-29-1903-highst-gabriels-chapel/'},
 {name:'Historic Day Street',category:'historic',address:'Day St, Norwood, MA 02062',details:'Historic residential corridor with architecturally significant 19th- and early-20th-century homes',url:'https://norwoodhistoricalsociety.org/day-street/'},
 {name:'Norwood Memorial Municipal Building / Town Hall',category:'civic',also:['historic'],address:'566 Washington St, Norwood, MA 02062',details:'Historic municipal building · carillon tower · Town Hall offices',url:'https://www.norwoodma.gov/'},
 {name:'Norwood Public Safety Building',category:'civic',address:'135–137 Nahatan St, Norwood, MA 02062',details:'Police Department · Fire Department · public safety services',url:'https://www.norwoodma.gov/'},
 {name:'Norwood Civic Center',category:'civic',address:'165 Nahatan St, Norwood, MA 02062',lat:42.19443,lng:-71.19893,details:'Recreation Department · gym · programs · community activities',url:'sports-recreation.html'},
 {name:'Norwood Senior Center',category:'civic',address:'275 Prospect St, Norwood, MA 02062',details:'Council on Aging · senior programs · transportation and support services',url:'resources.html'},
 {name:'Norwood Public Schools Administration',category:'civic',address:'275 Prospect St, Norwood, MA 02062',details:'School district administration offices',url:'https://www.norwood.k12.ma.us/'},
 {name:'Norwood Department of Public Works / Engineering',category:'civic',address:'1 Lyman Pl, Norwood, MA 02062',details:'Public Works · engineering · roads · water · sewer · trash and recycling',url:'https://www.norwoodma.gov/departments/public_works/index.php'},
 {name:'Norwood Light & Broadband',category:'civic',address:'136 Access Rd, Norwood, MA 02062',details:'Municipal electric utility · broadband · billing and customer service',url:'https://norwoodlight.com/'},
 {name:'Norwood Housing Authority — Administration',category:'civic',address:'40 William Shyne Cir, Norwood, MA 02062',details:'Municipal housing authority administrative offices',url:'https://www.norwoodha.org/'},
 {name:'Highland Cemetery / Cemetery Department',category:'civic',also:['historic'],address:'320 Winter St, Norwood, MA 02062',details:'Historic town cemetery · cemetery office · St. Gabriel’s Chapel',url:'https://www.norwoodma.gov/'},
 {name:'Norwood High School',category:'school',also:['civic'],address:'245 Nichols St, Norwood, MA 02062',lat:42.19917,lng:-71.20972,details:'Athletic fields · tennis courts · track',url:'parks-trails.html#tennis-courts'},
 {name:'Coakley Middle School / Ivatts',category:'school',also:['civic'],address:'1315 Washington St, Norwood, MA 02062',lat:42.17445,lng:-71.20085,details:'Tennis · baseball · softball · rectangular fields · school recreation facilities',url:'parks-trails.html#tennis-courts'},
 {name:'Balch Elementary School',category:'school',also:['civic'],address:'1170 Washington St, Norwood, MA 02062',details:'Playground · outdoor play areas · adjoining athletic fields',url:'https://www.norwood.k12.ma.us/balch'},
 {name:'Callahan Elementary School',category:'school',also:['civic'],address:'116 Garfield Ave, Norwood, MA 02062',details:'Playground · outdoor recreation · athletic field',url:'https://www.norwood.k12.ma.us/callahan'},
 {name:'Cleveland Elementary School',category:'school',also:['civic'],address:'33 George Willett Pkwy, Norwood, MA 02062',details:'Playground · outdoor recreation · Jean Brown Field and back field',url:'https://www.norwood.k12.ma.us/cleveland'},
 {name:'Oldham Elementary School',category:'school',also:['civic'],address:'165 Prospect St, Norwood, MA 02062',details:'Playground · outdoor recreation · Little League and rectangular fields',url:'https://www.norwood.k12.ma.us/oldham/'},
 {name:'Prescott Elementary School',category:'school',also:['civic'],address:'66 Richland Rd, Norwood, MA 02062',details:'Playground · basketball · Little League baseball · softball field',url:'https://www.norwood.k12.ma.us/prescott'},
 {name:'Willett Elementary School',category:'school',also:['civic'],address:'100 Westover Pkwy, Norwood, MA 02062',details:'Playground · baseball field · outdoor recreation area',url:'https://www.norwood.k12.ma.us/willett/index'},
 {name:'Hawes Recreation Area',category:'park',address:'1305 Washington St, Norwood, MA 02062',lat:42.17515,lng:-71.20165,details:'Pool · spray park · playground · tennis · fishing · trails',url:'parks-trails.html'},
 {name:'Father Mac’s / Father McAleer',category:'park',address:'295 Vernon St, Norwood, MA 02062',lat:42.18785,lng:-71.21375,details:'Pool · playground · Little League · soccer',url:'parks-trails.html'},
 {name:'Doherty Park / Doherty Field',category:'park',address:'Brewster Dr, Norwood, MA 02062',details:'Playground · Little League baseball',url:'parks-trails.html'},
 {name:'Ellis Playground & Fields',category:'park',address:'Codman St at Cameron Rd, Norwood, MA 02062',details:'Playground · baseball · softball · soccer · pond access',url:'parks-trails.html'},
 {name:'Murphy Park & Playground',category:'park',address:'Pleasant St at Lenox St, Norwood, MA 02062',details:'Playground · Little League · basketball · walking connection',url:'parks-trails.html'},
 {name:'Prescott Playground & Fields',category:'park',address:'66 Richmond Rd, Norwood, MA 02062',details:'Playground · basketball · baseball · softball',url:'parks-trails.html'},
 {name:'Morrill Memorial Library',category:'culture',also:['civic','historic'],address:'33 Walpole St, Norwood, MA 02062',lat:42.19107,lng:-71.20408,details:'Library · events · museum passes · Library of Things · study spaces',url:'resources.html'},
 {name:'The Norwood Theatre',category:'culture',also:['historic'],address:'109 Central St, Norwood, MA 02062',lat:42.19386,lng:-71.19976,details:'Restored 1927 theatre · live music · theatre · comedy · films',url:'things.html'},
 {name:'Norwood Food Pantry',category:'resource',address:'150 Chapel St, Norwood, MA 02062',lat:42.18262,lng:-71.21230,details:'Food assistance · Saturday pantry hours',url:'resources.html'},
 {name:'Norwood Central',category:'transit',address:'164 Broadway, Norwood, MA 02062',lat:42.18873,lng:-71.19991,details:'MBTA Franklin/Foxboro Line',url:'transit.html'},
 {name:'Norwood Depot',category:'transit',address:'Railroad Ave, Norwood, MA 02062',lat:42.19675,lng:-71.19665,details:'MBTA Franklin/Foxboro Line',url:'transit.html'},
 {name:'Windsor Gardens',category:'transit',address:'Engamore Ln at Buckminster Dr, Norwood, MA 02062',lat:42.17189,lng:-71.21973,details:'MBTA Franklin/Foxboro Line',url:'transit.html'},
 {name:'Norwood Memorial Airport',category:'landmark',also:['civic','historic'],address:'111 Access Rd, Norwood, MA 02062',lat:42.19052,lng:-71.17293,details:'Public-use municipal airport · playground · aviation businesses',url:'things.html'},
 {name:'Town Hall Public Parking',category:'parking',address:'566 Washington St, Norwood, MA 02062',details:'Public municipal parking serving Town Hall and the town-center area',url:'https://www.norwoodma.gov/'},
 {name:'Senior Center Public Parking',category:'parking',address:'275 Prospect St, Norwood, MA 02062',details:'Public municipal parking at the Senior Center / municipal complex',url:'https://www.norwoodma.gov/'},
 {name:'Talbot / Babel’s Municipal Lot',category:'parking',address:'Talbot Ave, Norwood, MA 02062',details:'Downtown municipal public parking lot',url:'https://www.norwoodma.gov/'},
 {name:'Central Street / Day Street Municipal Lot',category:'parking',address:'Central St at Day St, Norwood, MA 02062',details:'Downtown municipal public parking lot',url:'https://www.norwoodma.gov/'},
 {name:'Nahatan Street / Broadway Municipal Lot',category:'parking',address:'Nahatan St at Broadway, Norwood, MA 02062',details:'Downtown municipal public parking lot',url:'https://www.norwoodma.gov/'},
 {name:'Post Office Municipal Lot',category:'parking',address:'Washington St near Norwood Post Office, Norwood, MA 02062',details:'Municipal public parking in the Norwood Center area',url:'https://www.norwoodma.gov/'}
];
function resourceCategory(r){
 const t=norm([r.category,r.tags,(r.topics||[]).join(' ')].join(' '));
 if(/health|medical|mental health|physical therapy|disability|senior|older/.test(t))return'health';
 if(/town government|town services|town &|police|fire|veteran|board|commission|clerk|assessor|building department/.test(t))return'civic';
 if(/library|history|museum|arts|music|theatre/.test(t))return'culture';
 if(/school|youth sports|education/.test(t))return'school';
 return'resource';
}
function cleanAddress(a){
 a=String(a||'').trim();
 if(!a||/^norwood,? ma( 02062)?$/i.test(a))return'';
 if(!/(,\s*(?:norwood|westwood|walpole|dedham|canton|sharon|foxborough|boston|needham|medfield|dover|millis|medway|massachusetts|ma)\b)/i.test(a))a+=', Norwood, MA 02062';
 return a;
}
const dynamic=[];
(window.NORWOOD_RESTAURANTS||[]).forEach(r=>{const a=cleanAddress(r.address);if(a)dynamic.push({name:r.name,category:'food',address:a,details:r.cuisine||r.category||'Restaurant',url:r.url||'restaurants.html'});});
(window.NORWOOD_BUSINESSES||[]).forEach(b=>{const a=cleanAddress(b.address);if(a)dynamic.push({name:b.name,category:'business',address:a,details:b.category||'Local business',url:b.website||'businesses.html'});});
(window.NORWOOD_RESOURCES||[]).forEach(r=>{const a=cleanAddress(r.address);if(a)dynamic.push({name:r.name,category:resourceCategory(r),address:a,details:r.description||r.category||'Community resource',url:r.url||'resources.html'});});
(window.NORWOOD_EVENTS||[]).forEach(e=>{
 if(e.publish_candidate===false)return;
 const end=e.end?.date||e.start?.date||''; if(end&&end<today)return;
 let a=cleanAddress(e.address);
 if(!a&&e.venue)a=venueAddresses[norm(e.venue)]||'';
 if(a)dynamic.push({name:e.title,category:'event',address:a,details:[e.start?.date,e.start?.time,e.venue,e.cost].filter(Boolean).join(' · '),url:e.registration_url||e.source_url||'events.html'});
});
const seen=new Set(),places=[...staticPlaces,...dynamic].filter(p=>{const k=norm(p.name)+'|'+norm(p.address);if(seen.has(k))return false;seen.add(k);return true});
function popup(p){return '<div class="map-popup"><h3>'+esc(p.name)+'</h3><p>'+esc(p.address)+'</p><p>'+esc(p.details||'')+'</p><p><a href="'+esc(p.url||'#')+'"'+(/^https?:/i.test(p.url||'')?' target="_blank" rel="noopener"':'')+'>Open details →</a></p></div>'}
function searchMatch(p,q){return !q||norm([p.name,p.details,p.address,p.category].join(' ')).includes(q)}
function currentPlaces(){const q=norm(search.value);return places.filter(p=>(filter==='all'||p.category===filter||(Array.isArray(p.also)&&p.also.includes(filter)))&&searchMatch(p,q));}
async function geocode(p){
 if(Number.isFinite(p.lat)&&Number.isFinite(p.lng))return [p.lat,p.lng];
 const key=norm(p.address);
 if(geocodeCache[key])return geocodeCache[key];
 const u='https://geocode.arcgis.com/arcgis/rest/services/World/GeocodeServer/findAddressCandidates?f=json&maxLocations=1&outFields=Match_addr,Addr_type&countryCode=USA&searchExtent=-71.27,42.14,-71.12,42.25&singleLine='+encodeURIComponent(p.address);
 try{
   const r=await fetch(u); if(!r.ok)throw Error(r.status);
   const j=await r.json(),c=j.candidates&&j.candidates[0];
   if(c&&c.location){const v=[c.location.y,c.location.x];geocodeCache[key]=v;localStorage.setItem('norwood-map-geocode-v2',JSON.stringify(geocodeCache));return v}
 }catch(e){}
 return null;
}
async function pooled(items,worker,limit=5){
 let i=0;const runners=Array.from({length:Math.min(limit,items.length)},async()=>{while(i<items.length){const idx=i++;await worker(items[idx],idx)}});await Promise.all(runners);
}
async function render(){
 const token=++renderToken,shown=currentPlaces();
 cluster.clearLayers();list.innerHTML='';
 count.textContent=shown.length+' place'+(shown.length===1?'':'s')+' in this view';
 status.innerHTML='Plotting locations… <span class="map-progress" id="mapProgress">0 of '+shown.length+' mapped</span>';
 const cards=new Map(),markers=[],progress=document.querySelector('#mapProgress');
 shown.forEach((p,i)=>{
  const b=document.createElement('button');b.className='place-card';b.innerHTML='<b>'+esc(p.name)+'</b><span>'+esc(p.address)+'</span><small>'+esc(p.details||p.category)+'</small>';list.appendChild(b);cards.set(p,b);
 });
 let done=0,mapped=0;
 await pooled(shown,async p=>{
   const ll=await geocode(p);done++;if(token!==renderToken)return;
   if(ll){
     mapped++;const m=L.marker(ll).bindPopup(popup(p));cluster.addLayer(m);markers.push(m);
     cards.get(p)?.addEventListener('click',()=>{map.setView(ll,16);m.openPopup()});
   }else cards.get(p)?.classList.add('unmapped');
   if(progress)progress.textContent=done+' of '+shown.length+' checked · '+mapped+' mapped';
 },6);
 if(token!==renderToken)return;
 status.textContent=mapped+' mapped'+(shown.length-mapped?' · '+(shown.length-mapped)+' could not be located automatically':'')+' · click a place to center the map.';
 if(markers.length>1){const g=L.featureGroup(markers);map.fitBounds(g.getBounds().pad(.08),{maxZoom:14})}
 else if(markers.length===1)map.setView(markers[0].getLatLng(),16);
}
category?.addEventListener('change',()=>{filter=category.value||'all';render();});
let searchTimer;search.addEventListener('input',()=>{clearTimeout(searchTimer);searchTimer=setTimeout(render,180)});
document.querySelector('#locateMe').addEventListener('click',()=>{
 if(!navigator.geolocation){alert('Location is not available in this browser.');return}
 navigator.geolocation.getCurrentPosition(pos=>{
  const ll=[pos.coords.latitude,pos.coords.longitude];
  if(userMarker)map.removeLayer(userMarker);
  userMarker=L.circleMarker(ll,{radius:9,weight:3,color:'#003B71',fillColor:'#F2C100',fillOpacity:1}).addTo(map).bindPopup('<b>Your approximate location</b>').openPopup();map.setView(ll,15);
 },()=>alert('Your location was not shared. You can still browse the map normally.'),{enableHighAccuracy:false,timeout:8000});
});
render();
})();